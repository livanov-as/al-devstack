import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  DEMO_USER = 'DEMO_USER',
}

@Schema({
  collection: 'users',
  timestamps: { createdAt: 'createdAt', updatedAt: 'lastActiveAt' },
})
export class User {
  @Prop({ type: String, required: true, unique: true, trim: true })
  username!: string;

  @Prop({ type: String, required: true })
  passwordHash!: string;

  @Prop({ 
    type: String, 
    required: true, 
    enum: UserRole, 
    default: UserRole.USER 
  })
  role!: UserRole;

  // Automatically handled by mongoose timestamps configuration mapping
  createdAt!: Date;
  lastActiveAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// FinOps Capacity Control: High-speed FIFO rotation strategy index
UserSchema.index({ createdAt: 1 });
