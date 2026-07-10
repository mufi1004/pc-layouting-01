import { jsPDF } from 'jspdf';
import {
  PAGE_W,
  PAGE_H,
  CARD_W,
  CARD_H,
  COLS,
  ROWS,
  PER_PAGE,
  SPACING_X,
  SPACING_Y,
  MARGIN_X,
  MARGIN_Y,
  MARK_SIZE,
  OUTLINE_WIDTH,
} from './constants';

function drawMark(doc, cx, cy) {
  const half = MARK_SIZE / 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.01);
  doc.line(cx - half, cy, cx + half, cy);
  doc.line(cx, cy - half, cx, cy + half);
}

function getMarkCenters() {
  const centers = [];
  for (let row = 0; row <= ROWS; row++) {
    for (let col = 0; col <= COLS; col++) {
      centers.push({
        x: MARGIN_X + col * SPACING_X,
        y: MARGIN_Y + row * SPACING_Y,
      });
    }
  }
  return centers;
}

// mirror = true flips column placement left-right, used for back-side pages
function drawImagesOnPage(doc, images, mirror) {
  images.forEach((dataUrl, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const placedCol = mirror ? COLS - 1 - col : col;
    const cellCenterX = MARGIN_X + (placedCol + 0.5) * SPACING_X;
    const cellCenterY = MARGIN_Y + (row + 0.5) * SPACING_Y;
    const x = cellCenterX - CARD_W / 2;
    const y = cellCenterY - CARD_H / 2;
    doc.addImage(dataUrl, 'JPEG', x, y, CARD_W, CARD_H, undefined, 'FAST');
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(OUTLINE_WIDTH);
    doc.rect(x, y, CARD_W, CARD_H);
  });

  getMarkCenters().forEach(({ x, y }) => drawMark(doc, x, y));
}

export async function generatePdf({ frontImages, backImages, twoSided, filename }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'cm',
    format: [PAGE_W, PAGE_H],
  });

  const totalPages = Math.max(1, Math.ceil(frontImages.length / PER_PAGE));
  let firstPage = true;

  for (let page = 0; page < totalPages; page++) {
    if (!firstPage) doc.addPage([PAGE_W, PAGE_H], 'portrait');
    firstPage = false;

    const pageFront = frontImages.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
    drawImagesOnPage(doc, pageFront, false);

    if (twoSided) {
      const pageBack = backImages.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
      if (pageBack.length > 0) {
        doc.addPage([PAGE_W, PAGE_H], 'portrait');
        drawImagesOnPage(doc, pageBack, true);
      }
    }
  }

  doc.save(filename);
}
