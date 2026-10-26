import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CertificateDocument = Certificate & Document;

@Schema({ 
  collection: 'certificates',
  _id: false 
})
export class Certificate {
  @Prop({ type: String, required: true })
  _id!: string; // Enforced custom string ID: f"{TARGET_USERNAME}-{slug}"

  @Prop({ type: String, required: true })
  slug!: string; // Program curriculum slug (e.g., 'responsive-web-design-v9')

  @Prop({ type: String, required: true })
  title!: string; // Display title of the certificate

  @Prop({ type: String, required: true })
  url!: string; // Verification URL linking back to freecodecamp.org
}

export const CertificateSchema = SchemaFactory.createForClass(Certificate);
