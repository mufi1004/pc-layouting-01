// Utility to turn a source image + react-easy-crop's croppedAreaPixels
// into a cropped image (data URL), rendered at a fixed output resolution
// matching the 6x9cm card aspect ratio.

const OUTPUT_W = 600; // px, ~254dpi at 6cm
const OUTPUT_H = 900; // px, matches 6:9 ratio

function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (err) => reject(err));
    img.src = url;
  });
}

export async function getCroppedImage(imageSrc, croppedAreaPixels) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_W;
  canvas.height = OUTPUT_H;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    OUTPUT_W,
    OUTPUT_H
  );

  return canvas.toDataURL('image/jpeg', 0.92);
}

// Given natural image size, the on-screen container size (px), zoom level,
// and pan position (0-100 percent for x/y), compute the exact crop
// rectangle in the image's natural pixel coordinates. This mirrors the
// CSS background-size/background-position math used for the live preview,
// so preview and final export always match exactly.
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

// Background-size in px for the live CSS preview, matching computeCropFromZoomPan.
export function computeBackgroundSize(naturalWidth, naturalHeight, containerW, containerH, zoom) {
  const coverScale = Math.max(containerW / naturalWidth, containerH / naturalHeight);
  const effectiveScale = coverScale * zoom;
  return {
    width: naturalWidth * effectiveScale,
    height: naturalHeight * effectiveScale,
  };
}
