import { reviseProject } from "./ai.js";
import { applyOperations } from "./diff.js";
import { filterUnsafeOperations } from "./guardrails.js";

// applyOperations reports failures as strings like "update /App.js: search string not found"
const ERROR_PATTERN = /^(create|update|delete) (\/\S*): (.+)$/;

// Each file's content is capped so the retry prompt stays small
const MAX_FILE_CHARS = 12000;

export function parseOperationErrors(errors) {
  return errors.map((raw) => {
    const match = ERROR_PATTERN.exec(raw);
    return match
      ? { raw, op: match[1], path: match[2], reason: match[3] }
      : { raw };
  });
}

// Builds a focused retry request: the exact errors, what already worked,
// and the FULL current content of the files that failed.
export function buildRetryRequest({ prompt, parsedErrors, applied, files }) {
  const failedPaths = [
    ...new Set(parsedErrors.filter((e) => e.path).map((e) => e.path)),
  ];

  const failingFiles = {};
  for (const path of failedPaths) {
    if (files[path]) {
      failingFiles[path] = files[path].content.slice(0, MAX_FILE_CHARS);
    }
  }

  const retryPrompt = [
    prompt,
    "",
    "IMPORTANT: your previous answer was only partly applied.",
    "These operations FAILED:",
    ...parsedErrors.map((e) => `- ${e.raw}`),
    "",
    applied.length > 0
      ? `These operations already SUCCEEDED, do NOT repeat them: ${applied.join(", ")}.`
      : "No operations were applied yet.",
    "",
    "Return operations ONLY for the failed ones.",
    "For an update, copy the search text exactly from the file contents shown below.",
    'If a file does not exist or cannot be updated safely, use op "create" with the complete file content.',
  ].join("\n");

  return { retryPrompt, failingFiles };
}

// One extra attempt for operations that could not be applied.
// Returns { files, applied, errors } from the retry pass, or null if no retry was possible.
export async function retryFailedOperations({
  prompt,
  errors,
  applied,
  files,
  recentMessages,
}) {
  const parsedErrors = parseOperationErrors(errors);
  if (!parsedErrors.some((e) => e.path)) return null;

  const { retryPrompt, failingFiles } = buildRetryRequest({
    prompt,
    parsedErrors,
    applied,
    files,
  });

  const manifest = Object.entries(files).map(([path, entry]) => ({
    path,
    size: entry.content.length,
    hash: entry.hash,
  }));

  try {
    const result = await reviseProject(
      retryPrompt,
      manifest,
      failingFiles,
      recentMessages,
    );
    const { safeOperations, blockedErrors } = filterUnsafeOperations(
      result.operations,
    );
    const outcome = applyOperations(files, safeOperations);
    outcome.errors = [...outcome.errors, ...blockedErrors];
    console.log(
      `[Retry] applied ${outcome.applied.length}, ${outcome.errors.length} errors remaining`,
    );
    return outcome;
  } catch (err) {
    console.error(`[Retry] failed: ${err.message}`);
    return null;
  }
}
