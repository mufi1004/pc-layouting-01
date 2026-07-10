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

// Default center-crop: given natural image size, compute the largest
// centered box matching the card aspect ratio (6:9), in pixel coords.
export function getDefaultCropPixels(naturalWidth, naturalHeight, aspect) {
  const imgAspect = naturalWidth / naturalHeight;
  let width, height;
  if (imgAspect > aspect) {
    // image wider than target -> constrain by height
    height = naturalHeight;
    width = height * aspect;
  } else {
    width = naturalWidth;
    height = width / aspect;
  }
  const x = (naturalWidth - width) / 2;
  const y = (naturalHeight - height) / 2;
  return { x, y, width, height };
}
