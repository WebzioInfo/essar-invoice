import { NextRequest, NextResponse } from "next/server";
import { verifySessionVerified } from "@/lib/auth-server";
import path from "path";

export async function POST(req: NextRequest) {
    try {
        const session = await verifySessionVerified();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const mimeType = file.type || "";
        const fileName = file.name?.toLowerCase() || "";
        const isPdf = mimeType === "application/pdf" || fileName.endsWith(".pdf");

        let rawText = "";

        if (isPdf) {
            // PDF: extract embedded text directly (no OCR, very fast)
            rawText = await extractTextFromPdf(buffer);
        } else {
            // Image (JPG/PNG/TIFF): OCR via Tesseract
            rawText = await extractTextFromImage(buffer);
        }

        console.log("[EXTRACT_RAW_TEXT]", rawText?.substring(0, 400));

        const parsedData = parseBillText(rawText);

        return NextResponse.json({ 
            success: true, 
            data: parsedData,
            raw: rawText.substring(0, 500)
        });

    } catch (error: any) {
        console.error("[EXTRACT_API_ERROR]", error.message);
        return NextResponse.json({ error: error.message || "Failed to process bill" }, { status: 500 });
    }
}

// ─── PDF Text Extraction using pdf-parse (Node.js native, no worker needed) ──
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text || "";
}

// ─── Image OCR using Tesseract.js ─────────────────────────────────────────────
async function extractTextFromImage(buffer: Buffer): Promise<string> {
    const { createWorker } = await import("tesseract.js");

    const projectRoot = process.cwd();
    const worker = await createWorker('eng', 1, {
        workerPath: path.join(projectRoot, 'node_modules', 'tesseract.js', 'src', 'worker-script', 'node', 'index.js'),
        corePath: path.join(projectRoot, 'node_modules', 'tesseract.js-core', 'tesseract-core-lstm.wasm.js'),
        cachePath: path.join(projectRoot, '.tesseract-cache'),
        cacheMethod: 'readWrite' as any,
        logger: () => {}
    });

    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();
    return text;
}

// ─── Bill Text Parser ─────────────────────────────────────────────────────────
function parseBillText(text: string) {
    const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);

    // 1. GSTIN
    const gstMatch = text.match(/(?:GSTIN|GST\s*No|GST\s*Number)[:\s.]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])/i)
                  || text.match(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/);
    const vendorGst = gstMatch ? (gstMatch[1] || gstMatch[0]).toUpperCase() : "";

    // 2. Invoice Number
    const invMatch = text.match(/(?:Invoice|Inv\.?|Bill|Tax\s*Invoice)\s*(?:No\.?|Number|#)[:\s]*([A-Za-z0-9/_-]{3,30})/i)
                  || text.match(/(?:No\.?|Ref\.?)[:\s]+([A-Za-z0-9/_-]{4,30})/i);
    const invoiceNo = invMatch ? (invMatch[1] || "").toUpperCase().trim() : "";

    // 3. Date — supports DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, 15 May 2024 etc.
    const dateMatch = text.match(/(?:Date|Dated|Dt\.?)[:\s]*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i)
                  || text.match(/(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/)
                  || text.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i);
    let date = dateMatch ? (dateMatch[1] || dateMatch[0]).trim() : new Date().toISOString().split('T')[0];

    // Normalise DD/MM/YYYY → YYYY-MM-DD
    const ddmmyyyy = date.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (ddmmyyyy) {
        date = `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
    }

    // 4. Line Items
    const items: any[] = [];
    lines.forEach(line => {
        // Pattern with HSN: Description  HSN  Qty  Rate  Amount
        const withHsn = line.match(/^(.+?)\s+(\d{4,8})\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/);
        if (withHsn && parseFloat(withHsn[3]) > 0) {
            items.push({
                description: withHsn[1].trim(),
                hsn: withHsn[2],
                qty: parseFloat(withHsn[3]),
                rate: parseFloat(withHsn[4]),
                amount: parseFloat(withHsn[5])
            });
            return;
        }
        // Pattern without HSN: Description  Qty  Rate  Amount
        const simple = line.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d{2,}(?:\.\d+)?)$/);
        if (simple && parseFloat(simple[2]) > 0 && parseFloat(simple[3]) > 0) {
            items.push({
                description: simple[1].trim(),
                hsn: "",
                qty: parseFloat(simple[2]),
                rate: parseFloat(simple[3]),
                amount: parseFloat(simple[4])
            });
        }
    });

    return {
        vendorGst,
        invoiceNo,
        date,
        items: items.slice(0, 20)
    };
}
