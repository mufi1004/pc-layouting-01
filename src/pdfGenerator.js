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
} from './constants';

// Draw a small "+" cut mark centered at (cx, cy)
function drawMark(doc, cx, cy) {
  const half = MARK_SIZE / 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.01);
  doc.line(cx - half, cy, cx + half, cy);
  doc.line(cx, cy - half, cx, cy + half);
}

// centers: array of all mark center points on a page (grid corners, not per-card)
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

export async function generatePdf(croppedImages, filename = 'photocards.pdf') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'cm',
    format: [PAGE_W, PAGE_H],
  });

  const totalPages = Math.max(1, Math.ceil(croppedImages.length / PER_PAGE));

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage([PAGE_W, PAGE_H], 'portrait');

    const pageImages = croppedImages.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

    pageImages.forEach((dataUrl, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      // Card is centered on the grid cell center point, card size 6x9, cell spacing 5.7x8.7
      const cellCenterX = MARGIN_X + (col + 0.5) * SPACING_X;
      const cellCenterY = MARGIN_Y + (row + 0.5) * SPACING_Y;
      const x = cellCenterX - CARD_W / 2;
      const y = cellCenterY - CARD_H / 2;
      doc.addImage(dataUrl, 'JPEG', x, y, CARD_W, CARD_H, undefined, 'FAST');
    });

    // draw cut marks at every grid intersection
    getMarkCenters().forEach(({ x, y }) => drawMark(doc, x, y));
  }

  doc.save(filename);
}
