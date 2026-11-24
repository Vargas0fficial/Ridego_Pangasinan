import { Schema, model, models, Types, type HydratedDocument, type Model } from 'mongoose';

export interface IUser {
  name: string;
  phone: string;
  email?: string;
  /** Small JPEG/PNG/WebP data URL, resized in the browser before upload. */
  photo?: string;
  passwordHash: string;
  role: 'passenger' | 'rider';
  ratingSum: number;
  ratingCount: number;
  vehicle?: { model: string; plate: string; color: string };
  isOnline: boolean;
  lat?: number;
  lng?: number;
  locationAt?: Date;
  activeRideId: Types.ObjectId | null;
  completedRides: number;
  trustedContacts: { name: string; phone: string }[];
  createdAt: Date;
}

export type UserDoc = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    // optional so accounts made before email sign-up still work; sparse keeps the unique index happy
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    photo: { type: String },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['passenger', 'rider'], required: true, index: true },
    ratingSum: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    vehicle: {
      type: new Schema({ model: String, plate: String, color: String }, { _id: false }),
      default: undefined,
    },
    isOnline: { type: Boolean, default: false, index: true },
    lat: Number,
    lng: Number,
    locationAt: Date,
    activeRideId: { type: Schema.Types.ObjectId, ref: 'Ride', default: null },
    completedRides: { type: Number, default: 0 },
    trustedContacts: {
      type: [new Schema({ name: String, phone: String }, { _id: false })],
      default: [],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const User: Model<IUser> = (models.User as Model<IUser>) || model<IUser>('User', userSchema);

export const ratingOf = (u: { ratingSum: number; ratingCount: number }): number =>
  u.ratingCount > 0 ? Math.round((u.ratingSum / u.ratingCount) * 10) / 10 : 5;