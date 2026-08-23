// styles.ts

export const COLORS = {
    TEXT_PRIMARY: [15, 23, 42] as [number, number, number],   // #0F172A - Slate 900
    TEXT_SECONDARY: [71, 85, 105] as [number, number, number], // #475569 - Slate 600
    TEXT_MUTED: [148, 163, 184] as [number, number, number],  // #94A3B8 - Slate 400
    BORDER_LIGHT: [241, 245, 249] as [number, number, number], // #F1F5F9 - Soft row border
    BORDER_DARK: [226, 232, 240] as [number, number, number],  // #E2E8F0 - Accent border
    BG_LIGHT: [248, 250, 252] as [number, number, number],     // #F8FAFC - Soft card fill
    BG_MUTED: [241, 245, 249] as [number, number, number],     // #F1F5F9 - Light header fill
    PRIMARY: [30, 41, 59] as [number, number, number],         // #1E293B - Slate 800
    WHITE: [255, 255, 255] as [number, number, number],
};

// Strict three-size typography scale
export const FONT_SIZES = {
    LARGE: 22,
    MEDIUM: 10,
    SMALL: 8,
};

export const DIMENSIONS = {
    MARGIN: 20, // 20mm margins for print balance
    PAGE_WIDTH: 210, // A4 width
    PAGE_HEIGHT: 297, // A4 height
};

export const BORDERS = {
    HAIRLINE: 0.1,
    DEFAULT: 0.15,
    ACCENT: 1.0,
};

export const SPACING = {
    SECTION_GAP: 5,
    ITEM_GAP: 4,
    CARD_PADDING: 2,
    TABLE_CELL_PADDING: 2.5,
    LINE_HEIGHT_RATIO: 0.45,
};

export const TABLE_TOKENS = {
    TABLE_OUTER_BORDER_COLOR: [148, 163, 184] as [number, number, number], // #94A3B8 - Slate 400
    TABLE_INNER_BORDER_COLOR: [209, 213, 219] as [number, number, number], // #D1D5DB - Gray 300
    TABLE_HEADER_FILL: [243, 244, 246] as [number, number, number],        // #F3F4F6 - Light Gray
    
    TABLE_OUTER_BORDER_WIDTH: 0.16, // 0.16 mm ~ 0.45 pt
    TABLE_INNER_BORDER_WIDTH: 0.12, // 0.12 mm ~ 0.35 pt
    
    CELL_PADDING: 2.2,   // 2.2 mm cell padding
    HEADER_PADDING: 2.2, // 2.2 mm header padding
    
    HEADER_FONT_SIZE: 9,   // 9 pt
    BODY_FONT_SIZE: 8.5,   // 8.5 pt
};

