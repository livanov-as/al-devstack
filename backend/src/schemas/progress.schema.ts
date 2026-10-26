import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProgressDocument = Progress & Document;

@Schema({ collection: 'progress' })
export class Progress {
  @Prop({ type: String, required: true })
  username!: string;

  @Prop({ type: String, required: true })
  task_name!: string;

  @Prop({ type: String, required: true })
  category!: string; // Field used for selective regional aggregation mapping

  @Prop({ type: Date, required: true })
  date!: Date; // Exact ISO execution date

  @Prop({ type: String, required: true })
  url!: string; // Unique task verification URL
}

export const ProgressSchema = SchemaFactory.createForClass(Progress);

// 1. Core write index: Ensures O(1) upsert speed and blocks duplicates at the database level
ProgressSchema.index({ url: 1, username: 1 }, { unique: true });

// 2. High-speed partial read index (FinOps): Optimizes timeline feeds and cuts RAM usage
ProgressSchema.index(
  { category: 1, date: -1 },
  { partialFilterExpression: { category: { $exists: true } } }
);
