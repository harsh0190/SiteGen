import mongoose, { Schema } from "mongoose";

const MessageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const FilesPlannedSchema = new Schema(
  {
    path: { type: String, required: true },
    description: { type: String, required: true, default: "" },
  },
  { _id: false },
);

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true, default: "Untitled Project" },
    description: { type: String, required: true, default: "" },
    files: {
      type: Schema.Types.Mixed,
      default: {},
    },
    messages: {
      type: [MessageSchema],
      default: [],
    },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    published: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "generating", "revising", "completed", "failed", "error"],
      default: "pending",
    },
    filesPlanned: { type: [FilesPlannedSchema], default: [] },
    filesGenerated: { type: [String], default: [] },
    currentFile: { type: String, default: null },
    error: { type: String, default: null },
    embedding: { type: [Number], default: undefined, select: false },
    embeddingModel: { type: String, default: null, select: false },
  },
  { timestamps: true },
);

const Project = mongoose.model("Project", ProjectSchema);
export default Project;