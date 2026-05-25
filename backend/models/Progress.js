import mongoose from "mongoose";

const progressSchema = new mongoose.Schema({
  username: { type: String, required: true },
  task_name: { type: String, required: true },
  category: { type: String, required: true }, // Block slugs like 'javascript-v9' are stored here
  date: { type: Date, required: true }, // Exact ISO execution date
});

// The third argument 'progress' strictly binds the model to your collection in Atlas
export const Progress = mongoose.model("Progress", progressSchema, "progress");
