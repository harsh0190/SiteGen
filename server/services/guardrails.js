// Guardrails: simple, explainable checks on what goes into the model (user prompts)
// and what comes out of it (generated code). Rule-based on purpose: fast, free, predictable.

// ---------- Input guardrails ----------

export const PROMPT_LIMITS = { generate: 1500, chat: 1000 };

// Attempts to override the system instructions or leak them
const INJECTION_PATTERNS = [
  /\b(ignore|disregard|forget)\b.{0,20}\b(previous|prior|above|earlier|system)\b.{0,20}\b(instructions?|prompts?|rules)\b/i,
  /\b(reveal|show|print|repeat|output|leak)\b.{0,20}\b(your|the)\b.{0,15}\b(system|hidden|initial)\b.{0,10}\b(prompt|instructions?)\b/i,
  /\byou are now\b.{0,30}\b(developer mode|dan|jailbroken)\b/i,
  /\bjailbreak\b/i,
];

// Requests for sites whose main purpose is harm
// Kept narrow on purpose: a blog about phishing or a store that takes card payments is fine
const MISUSE_PATTERNS = [
  /\bphishing\s+(page|site|website|kit|clone|form|template)\b/i,
  /\bfake\b.{0,15}\b(login|sign[- ]?in)\b.{0,15}\b(page|form|site)\b/i,
  /\b(keylogger|ransomware)\b/i,
  /\b(steal|steals|stealing|harvest|harvests|harvesting)\b.{0,20}\b(passwords?|credentials|credit cards?)\b/i,
];

// Cleans and validates a user prompt. kind is "generate" or "chat".
export function checkPrompt(input, kind = "generate") {
  if (typeof input !== "string") {
    return { ok: false, error: "Invalid prompt" };
  }

  // Strip control characters (keeps newlines and tabs)
  const prompt = input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();

  if (!prompt) {
    return { ok: false, error: "Please enter a prompt" };
  }

  const max = PROMPT_LIMITS[kind] ?? PROMPT_LIMITS.generate;
  if (prompt.length > max) {
    return {
      ok: false,
      error: `Prompt is too long (${prompt.length} characters). The limit is ${max}.`,
    };
  }

  if (INJECTION_PATTERNS.some((pattern) => pattern.test(prompt))) {
    return {
      ok: false,
      error:
        "That prompt tries to change how the assistant works. Describe the website you want instead.",
    };
  }

  if (MISUSE_PATTERNS.some((pattern) => pattern.test(prompt))) {
    return {
      ok: false,
      error:
        "This request looks like it could be used to deceive or harm people, so it can't be generated.",
    };
  }

  return { ok: true, prompt };
}

// ---------- Output guardrails ----------

// Code like this has no place in a generated website: any match blocks the file
const BLOCK_RULES = [
  { rule: "eval()", regex: /\beval\s*\(/ },
  { rule: "new Function()", regex: /\bnew\s+Function\s*\(/ },
  { rule: "document.cookie", regex: /\bdocument\.cookie\b/ },
  { rule: "document.write()", regex: /\bdocument\.write(ln)?\s*\(/ },
  { rule: "javascript: URL", regex: /(?:href|src|action)\s*=\s*["'`{]*\s*javascript\s*:/i },
  { rule: "external <script>", regex: /<script[^>]+src\s*=\s*["']?https?:/i },
  { rule: "navigator.sendBeacon", regex: /\bnavigator\.sendBeacon\b/ },
  { rule: "importScripts()", regex: /\bimportScripts\s*\(/ },
];

// Allowed but worth a log line (a weather app legitimately calls fetch)
const WARN_RULES = [
  { rule: "fetch()", regex: /\bfetch\s*\(/ },
  { rule: "XMLHttpRequest", regex: /\bXMLHttpRequest\b/ },
  { rule: "WebSocket", regex: /\bnew\s+WebSocket\s*\(/ },
  { rule: "dangerouslySetInnerHTML", regex: /\bdangerouslySetInnerHTML\b/ },
  { rule: "window.open()", regex: /\bwindow\.open\s*\(/ },
];

const SCANNED_FILE = /\.(js|jsx|html)$/i;

export function scanGeneratedCode(path, code) {
  if (!SCANNED_FILE.test(path)) return { blocked: [], warnings: [] };

  const names = (rules) =>
    rules.filter(({ regex }) => regex.test(code)).map(({ rule }) => rule);

  return { blocked: names(BLOCK_RULES), warnings: names(WARN_RULES) };
}

// Removes unsafe AI-proposed operations. Blocked ones are reported in the same error format
// applyOperations uses, so the smart retry can ask the model to redo them safely.
export function filterUnsafeOperations(operations) {
  const safeOperations = [];
  const blockedErrors = [];

  for (const op of operations) {
    const content =
      op.op === "create" ? op.content : op.op === "update" ? op.replace : null;
    const scan = content ? scanGeneratedCode(op.path, content) : null;

    if (scan && scan.blocked.length > 0) {
      blockedErrors.push(
        `${op.op} ${op.path}: blocked by guardrail (${scan.blocked.join(", ")})`,
      );
    } else {
      safeOperations.push(op);
    }
  }

  return { safeOperations, blockedErrors };
}