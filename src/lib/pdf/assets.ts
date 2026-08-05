// assets.ts
import jsPDF from "jspdf";
import { FontManager } from "./FontManager";

/**
 * Initializes and registers custom font files in the document.
 */
export async function initializeFonts(doc: jsPDF): Promise<void> {
    FontManager.registerFonts(doc);
}

/**
 * Gets the active font family name.
 */
export function getFontName(): string {
    return FontManager.getFont().fontName;
}
