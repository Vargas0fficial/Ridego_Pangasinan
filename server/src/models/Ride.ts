import { Schema, model, models, Types, type Model } from 'mongoose';

export type RideStatus = 'searching' | 'accepted' | 'arrived' | 'ongoing' | 'completed' | 'cancelled' | 'no_riders';

export const ACTIVE_STATUSES: RideStatus[] = ['searching', 'accepted', 'arrived', 'ongoing'];
export const WITH_RIDER_STATUSES: RideStatus[] = ['accepted', 'arrived', 'ongoing'];

export interface IPlace {
  label: string;
  lat: number;
  lng: number;
}

export interface IRide {
  passenger: Types.ObjectId;
  rider?: Types.ObjectId | null;
  pickup: IPlace;
  dropoff: IPlace;
  distanceKm: number;
  durationMin: number;
  fare: number;
  serviceFee: number;
  riderEarning: number;
  paymentMethod: 'cash' | 'online';
  status: RideStatus;
  pin: string;
  shareToken: string;
  geometry: number[][];
  approach?: { geometry: number[][]; distanceKm: number; durationMin: number };
  messages: { from: 'passenger' | 'rider'; text: string; at: Date }[];
  times: {
    requested: Date;
    accepted?: Date;
    arrived?: Date;
    started?: Date;
    completed?: Date;
    cancelled?: Date;
  };
  cancelledBy?: 'passenger' | 'rider' | 'system';
  ratings?: {
    byPassenger?: { stars: number; tags: string[]; comment?: string; tip?: number };
    byRider?: { stars: number; comment?: string };
  };
  createdAt: Date;
}

const placeSchema = new Schema<IPlace>({ label: String, lat: Number, lng: Number }, { _id: false });

const rideSchema = new Schema<IRide>(
  {
    passenger: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rider: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    pickup: { type: placeSchema, required: true },
    dropoff: { type: placeSchema, required: true },
    distanceKm: { type: Number, required: true },
    durationMin: { type: Number, required: true },
    fare: { type: Number, required: true },
    serviceFee: { type: Number, required: true },
    riderEarning: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['cash', 'online'], default: 'cash' },
    status: {
      type: String,
      enum: ['searching', 'accepted', 'arrived', 'ongoing', 'completed', 'cancelled', 'no_riders'],
      default: 'searching',
      index: true,
    },
    pin: { type: String, required: true },
    shareToken: { type: String, required: true, unique: true },
    geometry: { type: [[Number]], default: [] },
    approach: {
      type: new Schema({ geometry: { type: [[Number]], default: [] }, distanceKm: Number, durationMin: Number }, { _id: false }),
      default: undefined,
    },
    messages: {
      type: [
        new Schema(
          { from: { type: String, enum: ['passenger', 'rider'] }, text: String, at: { type: Date, default: Date.now } },
          { _id: false },
        ),
      ],
      default: [],
    },
    times: {
      requested: { type: Date, default: Date.now },
      accepted: Date,
      arrived: Date,
      started: Date,
      completed: Date,
      cancelled: Date,
    },
    cancelledBy: { type: String, enum: ['passenger', 'rider', 'system'] },
    ratings: {
      byPassenger: {
        stars: Number,
        tags: { type: [String], default: undefined },
        comment: String,
        tip: Number,
      },
      byRider: { stars: Number, comment: String },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

rideSchema.index({ passenger: 1, status: 1 });
rideSchema.index({ rider: 1, status: 1 });

export const Ride: Model<IRide> = (models.Ride as Model<IRide>) || model<IRide>('Ride', rideSchema);
