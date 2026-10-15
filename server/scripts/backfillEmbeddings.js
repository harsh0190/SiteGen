import "dotenv/config";
import mongoose from "mongoose";
import Project from "../model/Project.js";
import { embedText, EMBEDDING_MODEL } from "../services/embeddings.js";

// One-time (and re-runnable) script: gives every project a vector made by the
// current EMBEDDING_MODEL. Projects that already have one are skipped.

const DELAY_MS = 1500; // stay under free-tier rate limits
const MAX_CONSECUTIVE_FAILURES = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await mongoose.connect(process.env.MONGODB_URI);

const projects = await Project.find({
  embeddingModel: { $ne: EMBEDDING_MODEL },
}).select("description");

console.log(`Model: ${EMBEDDING_MODEL}`);
console.log(`Projects to embed: ${projects.length}`);

let done = 0;
let failures = 0;

for (const project of projects) {
  const vector = await embedText(project.description);

  if (!vector) {
    failures++;
    console.log(`  skipped ${project._id} (embedding failed)`);
    if (failures >= MAX_CONSECUTIVE_FAILURES) {
      console.log("Too many failures in a row, stopping. Run the script again later.");
      break;
    }
  } else {
    failures = 0;
    await Project.updateOne(
      { _id: project._id },
      { embedding: vector, embeddingModel: EMBEDDING_MODEL },
    );
    done++;
    console.log(`  embedded ${project._id} (${done}/${projects.length})`);
  }

  await sleep(DELAY_MS);
}

console.log(`Finished. Embedded ${done} of ${projects.length}.`);
await mongoose.disconnect();