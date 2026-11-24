/** Crops an image file to a centred square, scales it down and returns a small JPEG data URL (about 10 to 25 KB). */
export async function squarePhoto(file: File, side = 256, quality = 0.82): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Could not read that photo. Try a JPG or PNG.'));
      i.src = url;
    });
    const min = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser cannot process photos');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, side, side);
    ctx.drawImage(img, (img.naturalWidth - min) / 2, (img.naturalHeight - min) / 2, min, min, 0, 0, side, side);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}