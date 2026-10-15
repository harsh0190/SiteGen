import Project from "../model/Project.js";
import { reviseProject } from "../services/ai.js";
import { applyOperations } from "../services/diff.js";
import { retryFailedOperations } from "../services/retry.js";
import { checkPrompt, filterUnsafeOperations } from "../services/guardrails.js";
import {
  ensureFileEmbeddings,
  selectRelevantFiles,
} from "../services/retrieval.js";

export function buildManifest(files) {
  const manifest = [];
  for (const [path, entry] of Object.entries(files)) {
    manifest.push({
      path,
      size: entry.content.length,
      hash: entry.hash,
    });
  }
  return manifest;
}

export async function chat(req, res) {
  const check = checkPrompt(req.body.prompt, "chat");
  if (!check.ok) {
    return res.status(400).json({ error: check.error });
  }
  const prompt = check.prompt;
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const project = await Project.findOneAndUpdate(
    {
      _id: req.params.id,
      owner: req.user.userId,
    },
    { status: "revising" },
    { returnDocument: "after" },
  );
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  project.status = "revising";
  project.messages.push({
    role: "user",
    content: prompt,
    timestamp: new Date(),
  });
  await project.save();

  try {
    const embedded = await ensureFileEmbeddings(project.files);
    if (embedded.changed) {
      project.files = embedded.files;
      project.markModified("files");
    }
    const manifest = buildManifest(project.files);
    const { selected: relevantFiles, stats: retrieval } =
      await selectRelevantFiles(prompt, project.files);
    console.log(
      `[RAG] ${retrieval.method}: sent ${retrieval.used}/${retrieval.total} files ` +
        `(${retrieval.charsSent} of ${retrieval.charsTotal} chars)`,
    );

    const recentMessages = project.messages
      .slice(-4)
      .map((msg) => ({ role: msg.role, content: msg.content }));

    console.log(
      `[AI] revising project ${project._id}: ${prompt.slice(0, 80)}...` +
        `(${manifest.length} files, manifest ~${JSON.stringify(manifest).length} chars)`,
    );

    const result = await reviseProject(
      prompt,
      manifest,
      relevantFiles,
      recentMessages,
    );
    console.log(
      `[AI] Got ${result.operations.length} operations, ${result.description}`,
    );

    const { safeOperations, blockedErrors } = filterUnsafeOperations(
      result.operations,
    );

    let {
      files: updatedFiles,
      applied,
      errors,
    } = applyOperations(project.files, safeOperations);
    errors = [...errors, ...blockedErrors];

    // Smart retry: one more attempt for the failed operations, using the exact
    // errors and the full current content of the failing files
    let retried = false;
    if (errors.length > 0) {
      console.error(`[AI] Errors applying operations: ${errors.join(", ")}`);

      retried = true;
      const retry = await retryFailedOperations({
        prompt,
        errors,
        applied,
        files: updatedFiles,
        recentMessages,
      });
      if (retry) {
        updatedFiles = retry.files;
        applied = [...applied, ...retry.applied];
        errors = retry.errors;
      }
    }

    project.files = updatedFiles;
    project.markModified("files");
    project.status = "completed";
    project.messages.push({
      role: "assistant",
      content: result.description,
    });
    await project.save();

    //Return the updated project and the result description
    const filesObj = {};
    for (const [path, entry] of Object.entries(project.files)) {
      filesObj[path] = entry.content;
    }
    res.status(200).json({
      _id: project._id,
      name: project.name,
      owner: project.owner,
      status: project.status,
      description: project.description,
      aiDescription: result.description,
      messages: project.messages,
      applied,
      errors,
      retried,
      retrieval,
      files: filesObj,
    });
  } catch (err) {
    console.error(`[AI] Error occurred while revising project: ${err.message}`);
    project.status = "failed";
    await project.save();
    res
      .status(500)
      .json({ error: "An error occurred while processing your request." });
  }
}
