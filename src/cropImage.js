// Fixed reference "box" used for all crop math (pan/zoom -> pixel rect).
// Using a constant instead of the live-rendered DOM box size makes the
// exported crop deterministic and immune to layout/resize timing quirks.
// Ratio matches the card exactly (6:9 = 2:3).
export const REF_W = 600;
export const REF_H = 900;

function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (err) => reject(err));
    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}

// Renders the crop region (in natural pixel coords) onto a fixed-resolution
// output canvas matching the 6x9cm aspect ratio.
export async function getCroppedImage(imageSrc, croppedAreaPixels) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = REF_W;
  canvas.height = REF_H;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    REF_W,
    REF_H
  );

  return canvas.toDataURL('image/jpeg', 0.92);
}

// Given natural image size, a reference container size (fixed, not
// DOM-measured), zoom level, and pan position (0-100 percent for x/y),
// compute the crop rectangle in the image's natural pixel coordinates.
export function computeCropFromZoomPan(naturalWidth, naturalHeight, containerW, containerH, zoom, panX, panY) {
  const coverScale = Math.max(containerW / naturalWidth, containerH / naturalHeight);
  const effectiveScale = coverScale * zoom;

  const cropWidth = containerW / effectiveScale;
  const cropHeight = containerH / effectiveScale;

  const maxX = Math.max(0, naturalWidth - cropWidth);
  const maxY = Math.max(0, naturalHeight - cropHeight);

  const x = maxX * (panX / 100);
  const y = maxY * (panY / 100);

  return { x, y, width: cropWidth, height: cropHeight };
}
