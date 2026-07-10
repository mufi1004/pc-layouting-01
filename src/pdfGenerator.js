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

// Convert all cm constants to mm once (jsPDF is most precise in mm).
const cm2mm = (v) => v * 10;

const PAGE_W_MM = cm2mm(PAGE_W);
const PAGE_H_MM = cm2mm(PAGE_H);
const CARD_W_MM = cm2mm(CARD_W);
const CARD_H_MM = cm2mm(CARD_H);
const SPACING_X_MM = cm2mm(SPACING_X);
const SPACING_Y_MM = cm2mm(SPACING_Y);
const MARGIN_X_MM = cm2mm(MARGIN_X);
const MARGIN_Y_MM = cm2mm(MARGIN_Y);
const MARK_SIZE_MM = cm2mm(MARK_SIZE);
const OUTLINE_WIDTH_MM = cm2mm(OUTLINE_WIDTH);

function drawMark(doc, cx, cy) {
  const half = MARK_SIZE_MM / 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.1); // 0.1mm hairline
  doc.line(cx - half, cy, cx + half, cy);
  doc.line(cx, cy - half, cx, cy + half);
}

function getMarkCenters() {
  const centers = [];
  for (let row = 0; row <= ROWS; row++) {
    for (let col = 0; col <= COLS; col++) {
      centers.push({
        x: MARGIN_X_MM + col * SPACING_X_MM,
        y: MARGIN_Y_MM + row * SPACING_Y_MM,
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
    const cellCenterX = MARGIN_X_MM + (placedCol + 0.5) * SPACING_X_MM;
    const cellCenterY = MARGIN_Y_MM + (row + 0.5) * SPACING_Y_MM;
    const x = cellCenterX - CARD_W_MM / 2;
    const y = cellCenterY - CARD_H_MM / 2;
    doc.addImage(dataUrl, 'JPEG', x, y, CARD_W_MM, CARD_H_MM, undefined, 'FAST');
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(OUTLINE_WIDTH_MM);
    doc.rect(x, y, CARD_W_MM, CARD_H_MM);
  });

  // marks drawn last so they sit on top of any image bleed
  getMarkCenters().forEach(({ x, y }) => drawMark(doc, x, y));
}

export async function generatePdf({ frontImages, backImages, twoSided, filename }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_W_MM, PAGE_H_MM],
    compress: true,
  });

  const totalPages = Math.max(1, Math.ceil(frontImages.length / PER_PAGE));
  let firstPage = true;

  for (let page = 0; page < totalPages; page++) {
    if (!firstPage) doc.addPage([PAGE_W_MM, PAGE_H_MM], 'portrait');
    firstPage = false;

    const pageFront = frontImages.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
    drawImagesOnPage(doc, pageFront, false);

    if (twoSided) {
      const pageBack = backImages.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
      if (pageBack.length > 0) {
        doc.addPage([PAGE_W_MM, PAGE_H_MM], 'portrait');
        drawImagesOnPage(doc, pageBack, true);
      }
    }
  }

  doc.save(filename);
}
