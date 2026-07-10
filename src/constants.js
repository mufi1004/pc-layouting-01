// All measurements in cm
export const PAGE_W = 32.9;
export const PAGE_H = 48.3;

export const CARD_W = 6;
export const CARD_H = 9;

export const COLS = 5;
export const ROWS = 5;
export const PER_PAGE = COLS * ROWS; // 25

// center-to-center spacing between marks
export const SPACING_X = 5.7;
export const SPACING_Y = 8.7;

// margins so the grid of marks is centered on the page
export const GRID_W = SPACING_X * COLS;
export const GRID_H = SPACING_Y * ROWS;
export const MARGIN_X = (PAGE_W - GRID_W) / 2;
export const MARGIN_Y = (PAGE_H - GRID_H) / 2;

// crop aspect ratio (w / h)
export const CARD_ASPECT = CARD_W / CARD_H;

// cut mark size (small "+" cross), in cm
export const MARK_SIZE = 0.3;

// thin outline around each card, in cm
export const OUTLINE_WIDTH = 0.02;

export const FIXED_CODE = 'AP260';
