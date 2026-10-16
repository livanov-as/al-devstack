import mongoose, { Schema, Document } from 'mongoose'

// Strict TypeScript interface matching your real Atlas collection layout
export interface IProgress extends Document {
  username: string
  task_name: string
  category: string   // Field used for selective regional aggregation mapping
  date: Date         // Exact ISO execution date
  url: string        // Unique task verification URL
}

const progressSchema: Schema = new Schema({
  username: { type: String, required: true },
  task_name: { type: String, required: true },
  category: { type: String, required: true }, 
  date: { type: Date, required: true }, 
  url: { type: String, required: true },
})

// 1. Core write index: Ensures O(1) upsert speed and blocks duplicates at the database level
progressSchema.index({ url: 1, username: 1 }, { unique: true })

// 2. High-speed partial read index (FinOps): Optimizes timeline feeds and cuts RAM usage
progressSchema.index(
  { category: 1, date: -1 },
  { partialFilterExpression: { category: { $exists: true } } }
)

// The third argument 'progress' strictly binds the model to your collection in Atlas
export const Progress = mongoose.model<IProgress>('Progress', progressSchema, 'progress')
