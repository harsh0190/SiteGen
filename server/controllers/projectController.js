import Project from "../model/Project.js";
import crypto from "crypto";
import { generateProject } from "../services/ai.js";
import { checkPrompt } from "../services/guardrails.js";
import {
  embedText,
  topMatches,
  EMBEDDING_MODEL,
} from "../services/embeddings.js";

const SEARCH_MIN_SCORE = Number(process.env.SEARCH_MIN_SCORE) || 0.15;

function hashContent(content) {
  return crypto.createHash("md5").update(content).digest("hex").slice(0, 12);
}

async function storeProjectEmbedding(projectId, text) {
  const vector = await embedText(text);
  if (!vector) return;
  await Project.findByIdAndUpdate(projectId, {
    embedding: vector,
    embeddingModel: EMBEDDING_MODEL,
  });
}

export async function createProject(req, res) {
  const check = checkPrompt(req.body.prompt, "generate");
  if (!check.ok) {
    return res.status(400).json({ error: check.error });
  }
  const prompt = check.prompt;
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: "Invalid user" });
  }
  const project = await Project.create({
    name: "New Project",
    description: prompt,
    files: {},
    messages: [{ role: "user", content: prompt }],
    owner: req.user.userId,
    published: false,
    status: "pending",
    filesPlanned: [],
    filesGenerated: [],
    currentFile: null,
    error: null,
  });
  storeProjectEmbedding(project._id.toString(), prompt).catch((err) => {
    console.warn(
      "[Embeddings] Could not store project embedding:",
      err.message,
    );
  });
  runBackgroundGeneration(project._id.toString(), prompt).catch((err) => {
    console.error("Error in background generation:", err);
  });
  res.status(201).json({
    _id: project._id,
    name: project.name,
    description: project.description,
    files: project.files,
    messages: project.messages,
    owner: project.owner,
    status: project.status,
    filesPlanned: project.filesPlanned,
    filesGenerated: project.filesGenerated,
    currentFile: project.currentFile,
    error: project.error,
    createdAt: project.createdAt,
  });
}

export async function runBackgroundGeneration(projectId, prompt) {
  try {
    console.log(`[Background AI] Starting generation for project ${projectId}`);
    const result = await generateProject(prompt, {
      onPlan: async (plan) => {
        console.log(
          `[Background AI] Plan created for project ${projectId}. Planned${plan.files.length} files.`,
        );
        await Project.findByIdAndUpdate(projectId, {
          name: plan.projectName || "New Project",
          filesPlanned: plan.files,
          status: "generating",
          $push: {
            messages: {
              role: "assistant",
              content: `Planned ${plan.files.length} file${plan.files.length === 1 ? "" : "s"} — generating now.`,
              timestamp: new Date(),
            },
          },
        });
      },
      onFileStart: async (filePath) => {
        console.log(
          `[Background AI] Starting file ${filePath} for project ${projectId}`,
        );
        await Project.findByIdAndUpdate(projectId, {
          currentFile: filePath,
        });
      },
      onFileComplete: async (filePath, code) => {
        console.log(
          `[Background AI] Completed file ${filePath} for project ${projectId}`,
        );
        const project = await Project.findByIdAndUpdate(projectId);
        if (project) {
          project.files = project.files || {};
          project.files[filePath] = { content: code, hash: hashContent(code) };
          project.filesGenerated = [...project.filesGenerated, filePath];
          project.messages.push({
            role: "assistant",
            content: `Generated file \`${filePath}\``,
            timestamp: new Date(),
          });
          project.currentFile = null;
          project.markModified("files");
          await project.save();
        }
      },
    });
    console.log(`[Background AI] Successfully generated project ${projectId}`);
    const project = await Project.findById(projectId);
    if (project) {
      project.status = "completed";
      if (result.description) {
        project.name = result.description;
      }
      project.messages.push({
        role: "assistant",
        content: `Project generation completed successfully.`,
        timestamp: new Date(),
      });
      await project.save();
    }
  } catch (err) {
    console.error(
      `[Background AI] Error during generation for project ${projectId}:`,
      err,
    );
    await Project.findByIdAndUpdate(projectId, {
      status: "error",
      error: err.message,
      $push: {
        messages: {
          role: "assistant",
          content: `❌ Generation failed: ${err.message}`,
          timestamp: new Date(),
        },
      },
    });
  }
}

export async function listProjects(req, res) {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const projects = await Project.find(
    { owner: req.user.userId },
    {
      name: 1,
      description: 1,
      status: 1,
      createdAt: 1,
    },
  ).sort({ createdAt: -1 });
  res.status(200).json(projects);
}

export async function searchProjects(req, res) {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const q = String(req.query.q || "").trim();
  if (!q) {
    return res.status(400).json({ error: "Search query is required" });
  }
  if (q.length > 300) {
    return res.status(400).json({ error: "Search query is too long" });
  }

  const queryVector = await embedText(q);
  if (!queryVector) {
    return res
      .status(503)
      .json({ error: "Search is temporarily unavailable. Try again shortly." });
  }

  // Only compare against vectors made by the current model
  const projects = await Project.find({
    owner: req.user.userId,
    embeddingModel: EMBEDDING_MODEL,
  }).select("name description status createdAt +embedding");

  const matches = topMatches(
    queryVector,
    projects,
    (p) => p.embedding,
    8,
    SEARCH_MIN_SCORE,
  );

  res.status(200).json(
    matches.map(({ item, score }) => ({
      _id: item._id,
      name: item.name,
      description: item.description,
      status: item.status,
      createdAt: item.createdAt,
      score: Number(score.toFixed(3)),
    })),
  );
}

export async function getProject(req, res) {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const project = await Project.findOne({
    _id: req.params.id,
    owner: req.user.userId,
  });

  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const filesObj = {};
  for (const [path, entry] of Object.entries(project.files)) {
    filesObj[path] = entry.content;
  }
  res.status(200).json({
    _id: project._id,
    name: project.name,
    description: project.description,
    files: filesObj,
    messages: project.messages,
    owner: project.owner,
    status: project.status,
    filesPlanned: project.filesPlanned,
    filesGenerated: project.filesGenerated,
    currentFile: project.currentFile,
    error: project.error,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  });
}

export async function deleteProject(req, res) {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const result = await Project.findOneAndDelete({
    _id: req.params.id,
    owner: req.user.userId,
  });

  if (!result) {
    return res.status(404).json({ error: "Project not found" });
  }

  res.status(200).json({ message: "Project deleted successfully" });
}

export async function updateProjectFiles(req, res) {
  const { files } = req.body;
  if (!files || typeof files !== "object") {
    return res.status(400).json({ error: "Invalid files object" });
  }
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const project = await Project.findOne({
    _id: req.params.id,
    owner: req.user.userId,
  });
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const newFiles = {};
  for (const [path, content] of Object.entries(files)) {
    if (typeof path !== "string" || typeof content !== "string") {
      return res.status(400).json({ error: "Invalid file path or content" });
    }
    newFiles[path] = { content, hash: hashContent(content) };
  }

  project.files = newFiles;
  await project.save();

  const filesObj = {};
  for (const [path, entry] of Object.entries(project.files)) {
    filesObj[path] = entry.content;
  }
  res.status(200).json({
    _id: project._id,
    name: project.name,
    description: project.description,
    files: filesObj,
    messages: project.messages,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  });
}

export async function publishProject(req, res) {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const project = await Project.findOneAndUpdate(
    {
      _id: req.params.id,
      owner: req.user.userId,
    },
    { published: true },
    { returnDocument: "after" },
  );

  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }
  res.status(200).json({ success: true, published: project.published });
}

export async function getPublicProject(req, res) {
  const project = await Project.findOne({
    _id: req.params.id,
    published: true,
  });

  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  if (!project.published) {
    return res.status(403).json({ error: "Project is not published yet" });
  }

  const filesObj = {};
  for (const [path, entry] of Object.entries(project.files)) {
    filesObj[path] = entry.content;
  }
  res.status(200).json({
    _id: project._id,
    name: project.name,
    description: project.description,
    files: filesObj,
  });
}
