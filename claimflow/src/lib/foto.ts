/** Shrinks a photo to a JPEG data URL small enough to store with the claim (~150–300 kB). */
export async function verkleinFoto(file: File, max = 1400, kwaliteit = 0.74): Promise<string> {
  let bron: CanvasImageSource, b: number, h: number;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    bron = bmp; b = bmp.width; h = bmp.height;
  } catch {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    try { await img.decode(); } finally { URL.revokeObjectURL(url); }
    bron = img; b = img.naturalWidth; h = img.naturalHeight;
  }
  const schaal = Math.min(1, max / Math.max(b, h));
  const c = document.createElement("canvas");
  c.width = Math.round(b * schaal); c.height = Math.round(h * schaal);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bron, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", kwaliteit);
}
