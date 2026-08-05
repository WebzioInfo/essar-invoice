// UnicodeRenderer.ts
import jsPDF from "jspdf";
import { TextRenderer } from "./TextRenderer";

export const UnicodeRenderer = {
    /**
     * Renders text containing special Unicode symbols or glyphs safely using loaded TrueType fonts.
     */
    renderText(
        doc: jsPDF,
        text: string,
        x: number,
        y: number,
        options?: {
            align?: "left" | "center" | "right";
            style?: "normal" | "bold" | "italic" | "bolditalic";
            size?: number;
            color?: [number, number, number];
        }
    ): void {
        TextRenderer.drawText(doc, text, x, y, options);
    }
};
