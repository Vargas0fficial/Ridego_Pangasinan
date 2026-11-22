import mongoose from 'mongoose';
import { config } from './config';

export async function connectDb(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
  console.log('[db] connected');
}
