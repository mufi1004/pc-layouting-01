// All measurements in cm
export const PAGE_W = 33;
export const PAGE_H = 48.3;

export const CARD_W = 6;
export const CARD_H = 9;

export const COLS = 5;
export const ROWS = 5;
export const PER_PAGE = COLS * ROWS; // 25

// cards are placed edge-to-edge (no gap, no overlap) -- pitch equals card size
export const GRID_W = CARD_W * COLS;
export const GRID_H = CARD_H * ROWS;
export const MARGIN_X = (PAGE_W - GRID_W) / 2;
export const MARGIN_Y = (PAGE_H - GRID_H) / 2;

// crop aspect ratio (w / h)
export const CARD_ASPECT = CARD_W / CARD_H;

// each of the 4 corner marks is inset this far from the card's own edge
// (gives 5.7 x 8.7 cm mark-to-mark span within a card, and 0.3cm / 3mm
// between a card's mark and its neighbor's mark)
export const MARK_INSET = 0.15;

// thin cross size for each cut mark, in cm
export const MARK_SIZE = 0.4;

// thin outline around each card, in cm
export const OUTLINE_WIDTH = 0.02;

export const FIXED_CODE = 'AP260';
