import { ImageResponse } from 'next/og';
import { PwaIconArt } from '@/components/pwaIcon';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// iOS rounds the corners itself, so this one is a full square.
export default function AppleIcon() {
  return new ImageResponse(<PwaIconArt size={180} rounded={false} inset={0.8} />, size);
}