import express from "express";
import {
  createProject,
  getPublicProject,
  listProjects,
  getProject,
  searchProjects,
  deleteProject,
  updateProjectFiles,
  publishProject,
} from "../controllers/projectController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { aiRateLimit } from "../middleware/rateLimit.js";
import { chat } from "../controllers/chatController.js";

const projectRouter = express.Router();

//Public route to get a project by ID
projectRouter.get("/public/:id", getPublicProject);

projectRouter.use(authMiddleware); // Apply authentication middleware to all routes below

//Private routes for authenticated users
projectRouter.post("/", createProject);
projectRouter.get("/", listProjects);
projectRouter.get("/search", searchProjects);
projectRouter.get("/:id", getProject);
projectRouter.delete("/:id", deleteProject);
projectRouter.put("/:id/files", updateProjectFiles);
projectRouter.post("/:id/publish", publishProject);

//Chat route for project revisions
projectRouter.post("/", aiRateLimit, createProject);
projectRouter.post("/:id/chat", aiRateLimit, chat);

export default projectRouter;
