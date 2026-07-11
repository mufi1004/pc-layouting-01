import { jsPDF } from 'jspdf';
import {
  PAGE_W,
  PAGE_H,
  CARD_W,
  CARD_H,
  COLS,
  ROWS,
  PER_PAGE,
  MARGIN_X,
  MARGIN_Y,
  MARK_SIZE,
  MARK_INSET,
  OUTLINE_WIDTH,
} from './constants';

// Convert all cm constants to mm once (jsPDF is most precise in mm).
const cm2mm = (v) => v * 10;

const PAGE_W_MM = cm2mm(PAGE_W);
const PAGE_H_MM = cm2mm(PAGE_H);
const CARD_W_MM = cm2mm(CARD_W);
const CARD_H_MM = cm2mm(CARD_H);
const MARGIN_X_MM = cm2mm(MARGIN_X);
const MARGIN_Y_MM = cm2mm(MARGIN_Y);
const MARK_SIZE_MM = cm2mm(MARK_SIZE);
const MARK_INSET_MM = cm2mm(MARK_INSET);
const OUTLINE_WIDTH_MM = cm2mm(OUTLINE_WIDTH);

function drawMark(doc, cx, cy) {
  const half = MARK_SIZE_MM / 2;
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.1); // 0.1mm hairline
  doc.line(cx - half, cy, cx + half, cy);
  doc.line(cx, cy - half, cx, cy + half);
}

// 4 corner marks per card, inset MARK_INSET_MM from that card's own edges.
function drawCardMarks(doc, x, y) {
  const insetX = x + MARK_INSET_MM;
  const insetXRight = x + CARD_W_MM - MARK_INSET_MM;
  const insetY = y + MARK_INSET_MM;
  const insetYBottom = y + CARD_H_MM - MARK_INSET_MM;

  drawMark(doc, insetX, insetY); // top-left
  drawMark(doc, insetXRight, insetY); // top-right
  drawMark(doc, insetX, insetYBottom); // bottom-left
  drawMark(doc, insetXRight, insetYBottom); // bottom-right
}

// mirror = true flips column placement left-right, used for back-side pages
function drawImagesOnPage(doc, images, mirror) {
  const cardPositions = [];

  images.forEach((dataUrl, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const placedCol = mirror ? COLS - 1 - col : col;
    const x = MARGIN_X_MM + placedCol * CARD_W_MM;
    const y = MARGIN_Y_MM + row * CARD_H_MM;

    doc.addImage(dataUrl, 'JPEG', x, y, CARD_W_MM, CARD_H_MM, undefined, 'FAST');
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(OUTLINE_WIDTH_MM);
    doc.rect(x, y, CARD_W_MM, CARD_H_MM);

    cardPositions.push({ x, y });
  });

  // marks drawn last so they sit on top of the images
  cardPositions.forEach(({ x, y }) => drawCardMarks(doc, x, y));
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
