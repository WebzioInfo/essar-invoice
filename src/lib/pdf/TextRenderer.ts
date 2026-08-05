// TextRenderer.ts
import jsPDF from "jspdf";
import { FontManager } from "./FontManager";

export const TextRenderer = {
    /**
     * Draws text with automated custom font weight switching and size settings.
     */
    drawText(
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
        doc.saveGraphicsState();
        
        const style = options?.style ?? "normal";
        const { fontName, fontStyle } = FontManager.getFont(style);
        doc.setFont(fontName, fontStyle);

        if (options?.size) {
            doc.setFontSize(options.size);
        }
        if (options?.color) {
            doc.setTextColor(...options.color);
        }

        doc.text(text, x, y, { align: options?.align ?? "left" });
        doc.restoreGraphicsState();
    },

    /**
     * Splits text into wrapped lines based on the loaded custom font width metrics.
     */
    splitText(
        doc: jsPDF,
        text: string,
        width: number,
        style: "normal" | "bold" | "italic" | "bolditalic",
        size: number
    ): string[] {
        doc.saveGraphicsState();
        const { fontName, fontStyle } = FontManager.getFont(style);
        doc.setFont(fontName, fontStyle);
        doc.setFontSize(size);
        const lines = doc.splitTextToSize(text, width);
        doc.restoreGraphicsState();
        return lines;
    }
};
