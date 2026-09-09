import mongoose from 'mongoose'

const progressSchema = new mongoose.Schema({
  username: { type: String, required: true },
  task_name: { type: String, required: true },
  // Added selective index for high-speed regional aggregation mapping
  category: { type: String, required: true, index: true }, 
  date: { type: Date, required: true }, // Exact ISO execution date
})

// Enforce compound or single descending index on date for timeline feeds
progressSchema.index({ date: -1 })

// The third argument 'progress' strictly binds the model to your collection in Atlas
export const Progress = mongoose.model('Progress', progressSchema, 'progress')
