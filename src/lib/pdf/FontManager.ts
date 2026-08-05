// FontManager.ts
import jsPDF from "jspdf";
import fs from "fs";
import path from "path";

let regularFontBase64 = "";
let boldFontBase64 = "";
let italicFontBase64 = "";
let boldItalicFontBase64 = "";
let isLoaded = false;

export const FontManager = {
    /**
     * Reads local NotoSans TTF files from public/fonts folder and caches them in base64.
     */
    loadFonts(): void {
        if (isLoaded) return;

        const baseDirs = [
            path.join(process.cwd(), "public", "fonts"),
            path.join(process.cwd(), "src", "assets", "fonts")
        ];

        let regBuf: Buffer | null = null;
        let boldBuf: Buffer | null = null;
        let italicBuf: Buffer | null = null;
        let boldItalicBuf: Buffer | null = null;

        for (const dir of baseDirs) {
            const regPath = path.join(dir, "NotoSans-Regular.ttf");
            const boldPath = path.join(dir, "NotoSans-Bold.ttf");
            const italicPath = path.join(dir, "NotoSans-Italic.ttf");
            const boldItalicPath = path.join(dir, "NotoSans-BoldItalic.ttf");

            if (fs.existsSync(regPath) && fs.existsSync(boldPath)) {
                regBuf = fs.readFileSync(regPath);
                boldBuf = fs.readFileSync(boldPath);
                if (fs.existsSync(italicPath)) italicBuf = fs.readFileSync(italicPath);
                if (fs.existsSync(boldItalicPath)) boldItalicBuf = fs.readFileSync(boldItalicPath);
                break;
            }
        }

        if (!regBuf || !boldBuf) {
            throw new Error("Could not locate NotoSans TrueType fonts in public/fonts!");
        }

        regularFontBase64 = regBuf.toString("base64");
        boldFontBase64 = boldBuf.toString("base64");
        if (italicBuf) italicFontBase64 = italicBuf.toString("base64");
        if (boldItalicBuf) boldItalicFontBase64 = boldItalicBuf.toString("base64");

        isLoaded = true;
    },

    /**
     * Registers the cached fonts into the jsPDF instance.
     */
    registerFonts(doc: jsPDF): void {
        this.loadFonts();
        try {
            doc.addFileToVFS("NotoSans-Regular.ttf", regularFontBase64);
            doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");

            doc.addFileToVFS("NotoSans-Bold.ttf", boldFontBase64);
            doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");

            if (italicFontBase64) {
                doc.addFileToVFS("NotoSans-Italic.ttf", italicFontBase64);
                doc.addFont("NotoSans-Italic.ttf", "NotoSans", "italic");
            }
            if (boldItalicFontBase64) {
                doc.addFileToVFS("NotoSans-BoldItalic.ttf", boldItalicFontBase64);
                doc.addFont("NotoSans-BoldItalic.ttf", "NotoSans", "bolditalic");
            }
        } catch (err) {
            console.error("Error registering NotoSans fonts in jsPDF:", err);
        }
    },

    /**
     * Returns the custom font family name and styles.
     */
    getFont(style: "normal" | "bold" | "italic" | "bolditalic" = "normal"): { fontName: string; fontStyle: string } {
        return {
            fontName: isLoaded ? "NotoSans" : "helvetica",
            fontStyle: style
        };
    },

    /**
     * Standard built-in fallback font.
     */
    fallbackFont(): string {
        return "helvetica";
    },

    /**
     * Measures the text width using the designated font details.
     */
    measureTextWidth(doc: jsPDF, text: string, style: "normal" | "bold" | "italic" | "bolditalic", size: number): number {
        const { fontName, fontStyle } = this.getFont(style);
        doc.saveGraphicsState();
        doc.setFont(fontName, fontStyle);
        doc.setFontSize(size);
        const w = doc.getTextWidth(text);
        doc.restoreGraphicsState();
        return w;
    }
};
