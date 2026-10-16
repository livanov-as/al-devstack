import mongoose, { Schema, Document } from 'mongoose'

// Strict layout definition for the freeCodeCamp v9 earned credentials collection
export interface ICertificate {
  _id: string      // Enforced custom string ID: f"{TARGET_USERNAME}-{slug}"
  slug: string     // Program curriculum slug (e.g., 'responsive-web-design-v9')
  title: string    // Display title of the certificate
  url: string      // Verification URL linking back to freecodecamp.org
}

const certificateSchema: Schema = new Schema({
  _id: { type: String, required: true }, // Explicitly override MongoDB default ObjectId
  slug: { type: String, required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
}, { _id: false }) // Strictly disable automatic internal ObjectId generation layout

// Bind and export the model directly mapping to the 'certificates' collection architecture
export const Certificate = mongoose.model<ICertificate & Document>(
  'Certificate',
  certificateSchema,
  'certificates',
)
