import { Schema, model, models, Types, type Model } from 'mongoose';

export interface IReport {
  user: Types.ObjectId;
  ride?: Types.ObjectId | null;
  type: 'report' | 'support' | 'emergency';
  reason: string;
  details?: string;
  lat?: number;
  lng?: number;
  status: 'open' | 'cancelled' | 'resolved';
  createdAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ride: { type: Schema.Types.ObjectId, ref: 'Ride', default: null },
    type: { type: String, enum: ['report', 'support', 'emergency'], required: true, index: true },
    reason: { type: String, required: true },
    details: String,
    lat: Number,
    lng: Number,
    status: { type: String, enum: ['open', 'cancelled', 'resolved'], default: 'open' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Report: Model<IReport> = (models.Report as Model<IReport>) || model<IReport>('Report', reportSchema);
