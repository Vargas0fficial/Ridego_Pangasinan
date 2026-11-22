import { Schema, model, models, type Model } from 'mongoose';

/** A sign-up waiting for its SMS code. The real User is only created after the code is confirmed. */
export interface IPendingSignup {
  phone: string;
  name: string;
  passwordHash: string;
  role: 'passenger' | 'rider';
  vehicle?: { model: string; plate: string; color: string };
  codeHash: string;
  attempts: number;
  sendCount: number;
  lastSentAt: Date;
  expiresAt: Date;
}

const schema = new Schema<IPendingSignup>({
  phone: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['passenger', 'rider'], required: true },
  vehicle: { model: String, plate: String, color: String },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  sendCount: { type: Number, default: 1 },
  lastSentAt: { type: Date, required: true },
  // MongoDB removes the document shortly after this time.
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export const PendingSignup: Model<IPendingSignup> =
  (models.PendingSignup as Model<IPendingSignup>) || model<IPendingSignup>('PendingSignup', schema);