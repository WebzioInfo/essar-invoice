import { db } from "@/db/prisma/client";
import { recordAuditLog } from "@/lib/audit";
import { InvoicePdfService } from "@/features/billing/services/InvoicePdfService";
import nodemailer from "nodemailer";
import {
    ShareTemplateData,
    formatRupee,
    buildWhatsAppShareMessage,
    buildWhatsAppFollowupMessage,
    buildEmailShareContent,
    buildEmailFollowupContent,
} from "../utils/shareTemplates";

export class InvoiceShareService {
    static formatRupee(amount: number): string {
        return formatRupee(amount);
    }

    static validateAndCleanPhone(rawPhone: string | null | undefined): { valid: boolean; cleanPhone: string; error?: string } {
        if (!rawPhone || !rawPhone.trim()) {
            return { valid: false, cleanPhone: "", error: "Customer has no saved phone number." };
        }

        const digitsOnly = rawPhone.replace(/\D/g, "");

        if (digitsOnly.length < 10) {
            return { valid: false, cleanPhone: "", error: "Customer phone number is invalid (less than 10 digits)." };
        }

        let cleanPhone = digitsOnly;
        if (digitsOnly.length === 10 && /^[6-9]/.test(digitsOnly)) {
            cleanPhone = `91${digitsOnly}`;
        }

        return { valid: true, cleanPhone };
    }

    static validateEmail(rawEmail: string | null | undefined): { valid: boolean; email: string; error?: string } {
        if (!rawEmail || !rawEmail.trim()) {
            return { valid: false, email: "", error: "Customer has no saved email address." };
        }

        const email = rawEmail.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return { valid: false, email: "", error: "Customer email address format is invalid." };
        }

        return { valid: true, email };
    }

    static async getShareData(invoiceId: string): Promise<ShareTemplateData> {
        const invoice = await db.invoice.findFirst({
            where: { id: invoiceId, deletedAt: null },
            include: {
                client: true,
                lineItems: true,
                allocations: {
                    include: { payment: true }
                }
            }
        });

        if (!invoice) {
            throw new Error(`Invoice with ID ${invoiceId} not found.`);
        }

        const companySetting = await db.companySetting.findFirst();
        const companyName = companySetting?.companyName || "ESSAR ENTERPRISES";
        const bankName = companySetting?.bankName || "FEDERAL BANK";
        const bankAccountNo = companySetting?.bankAccountNo || "21650200003173";
        const bankIfsc = companySetting?.bankIfsc || "FDRL0002165";
        const bankBranch = companySetting?.bankBranch || "DOMMASANDRA";
        const bankAccountName = companySetting?.bankAccountName || "ESSAR ENTERPRISES";

        const bankDetails = `Bank: ${bankName} (${bankBranch})\nA/C Name: ${bankAccountName}\nA/C No: ${bankAccountNo}\nIFSC: ${bankIfsc}`;
        const bankDetailsShort = `${bankName} A/C: ${bankAccountNo} (IFSC: ${bankIfsc})`;

        const grandTotal = Number(invoice.grandTotal || 0);
        const totalPaid = invoice.allocations.reduce((sum, a) => sum + Number(a.amount || 0), 0);
        const balanceDue = Math.max(0, grandTotal - totalPaid);
        const isFullyPaid = balanceDue <= 0.01;

        const customerName = invoice.billingName || invoice.client?.name || "Customer";
        const customerPhone = invoice.billingPhone || invoice.client?.phone || null;
        const customerEmail = invoice.client?.email || null;

        const phoneVal = this.validateAndCleanPhone(customerPhone);
        const cleanPhone = phoneVal.valid ? phoneVal.cleanPhone : null;

        const dateObj = new Date(invoice.date);
        const invoiceDate = isNaN(dateObj.getTime())
            ? new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

        const firstItem = invoice.lineItems[0]?.description || "Goods / Services";
        const itemCount = invoice.lineItems.length;
        const itemSummary = itemCount > 1 ? `${firstItem} (+${itemCount - 1} more item${itemCount > 2 ? 's' : ''})` : firstItem;

        return {
            invoiceId: invoice.id,
            invoiceNo: invoice.invoiceNo,
            invoiceDate,
            customerName,
            customerPhone,
            customerEmail,
            cleanPhone,
            itemSummary,
            grandTotal,
            totalPaid,
            balanceDue,
            isFullyPaid,
            formattedGrandTotal: this.formatRupee(grandTotal),
            formattedTotalPaid: this.formatRupee(totalPaid),
            formattedBalanceDue: this.formatRupee(balanceDue),
            bankDetails,
            bankDetailsShort,
            companyName,
            isVendor: false
        };
    }

    static buildWhatsAppShareMessage(data: ShareTemplateData): string {
        return buildWhatsAppShareMessage(data);
    }

    static buildWhatsAppFollowupMessage(data: ShareTemplateData): string {
        return buildWhatsAppFollowupMessage(data);
    }

    static buildEmailShareContent(data: ShareTemplateData): { subject: string; body: string } {
        return buildEmailShareContent(data);
    }

    static buildEmailFollowupContent(data: ShareTemplateData): { subject: string; body: string } {
        return buildEmailFollowupContent(data);
    }

    static async prepareWhatsAppShare(
        userId: string | null,
        invoiceId: string,
        actionType: 'SHARE' | 'FOLLOWUP',
        overridePhone?: string,
        customMessage?: string
    ) {
        const data = await this.getShareData(invoiceId);

        const phoneToUse = overridePhone || data.customerPhone;
        const phoneVal = this.validateAndCleanPhone(phoneToUse);

        if (!phoneVal.valid) {
            throw new Error(phoneVal.error || "Customer phone number is invalid.");
        }

        let message = customMessage || "";
        if (!message) {
            if (actionType === 'SHARE') {
                message = this.buildWhatsAppShareMessage(data);
            } else {
                message = this.buildWhatsAppFollowupMessage(data);
            }
        }

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${phoneVal.cleanPhone}?text=${encodedMessage}`;

        await recordAuditLog(db, {
            userId,
            action: actionType === 'SHARE' ? 'SHARE_WHATSAPP' : 'FOLLOWUP_WHATSAPP',
            entityType: 'Invoice',
            entityId: invoiceId,
            details: {
                channel: 'WhatsApp',
                actionType,
                recipient: phoneVal.cleanPhone,
                status: 'OPENED',
                invoiceNo: data.invoiceNo,
                grandTotal: data.grandTotal,
                balanceDue: data.balanceDue,
                timestamp: new Date().toISOString()
            }
        });

        return {
            success: true,
            whatsappUrl,
            phone: phoneVal.cleanPhone,
            message,
            data
        };
    }

    static async sendEmail(
        userId: string | null,
        invoiceId: string,
        actionType: 'SHARE' | 'FOLLOWUP',
        overrideEmail?: string,
        customBody?: string,
        customSubject?: string
    ) {
        const data = await this.getShareData(invoiceId);

        const emailToUse = overrideEmail || data.customerEmail;
        const emailVal = this.validateEmail(emailToUse);

        if (!emailVal.valid) {
            throw new Error(emailVal.error || "Customer email address is invalid.");
        }

        let content: { subject: string; body: string };
        if (customBody) {
            let subject = customSubject || "";
            if (!subject) {
                subject = actionType === 'SHARE'
                    ? `Invoice ${data.invoiceNo} - ${data.companyName}`
                    : `Payment Follow-up - Invoice ${data.invoiceNo}`;
            }
            content = { subject, body: customBody };
        } else if (actionType === 'SHARE') {
            content = this.buildEmailShareContent(data);
        } else {
            content = this.buildEmailFollowupContent(data);
        }

        // Generate official invoice PDF
        const { buffer, fileName } = await InvoicePdfService.generateInvoicePdf(invoiceId, 'ORIGINAL');

        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const smtpFrom = process.env.SMTP_FROM || `"${data.companyName}" <${smtpUser || "noreply@essarenterprises.com"}>`;

        if (!smtpHost || !smtpUser || !smtpPass) {
            const missingError = "SMTP email provider is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.";

            await recordAuditLog(db, {
                userId,
                action: actionType === 'SHARE' ? 'SHARE_EMAIL' : 'FOLLOWUP_EMAIL',
                entityType: 'Invoice',
                entityId: invoiceId,
                details: {
                    channel: 'Email',
                    actionType,
                    recipient: emailVal.email,
                    status: 'FAILED',
                    error: missingError,
                    invoiceNo: data.invoiceNo,
                    timestamp: new Date().toISOString()
                }
            });

            throw new Error(missingError);
        }

        try {
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpPort === 465,
                auth: {
                    user: smtpUser,
                    pass: smtpPass
                }
            });

            const sendResult = await transporter.sendMail({
                from: smtpFrom,
                to: emailVal.email,
                subject: content.subject,
                text: content.body,
                attachments: [
                    {
                        filename: fileName,
                        content: buffer,
                        contentType: "application/pdf"
                    }
                ]
            });

            await recordAuditLog(db, {
                userId,
                action: actionType === 'SHARE' ? 'SHARE_EMAIL' : 'FOLLOWUP_EMAIL',
                entityType: 'Invoice',
                entityId: invoiceId,
                details: {
                    channel: 'Email',
                    actionType,
                    recipient: emailVal.email,
                    status: 'SENT',
                    messageId: sendResult.messageId,
                    invoiceNo: data.invoiceNo,
                    grandTotal: data.grandTotal,
                    balanceDue: data.balanceDue,
                    timestamp: new Date().toISOString()
                }
            });

            return {
                success: true,
                recipient: emailVal.email,
                messageId: sendResult.messageId,
                data
            };
        } catch (err: any) {
            const errorMsg = err.message || "Failed to deliver email through SMTP server.";

            await recordAuditLog(db, {
                userId,
                action: actionType === 'SHARE' ? 'SHARE_EMAIL' : 'FOLLOWUP_EMAIL',
                entityType: 'Invoice',
                entityId: invoiceId,
                details: {
                    channel: 'Email',
                    actionType,
                    recipient: emailVal.email,
                    status: 'FAILED',
                    error: errorMsg,
                    invoiceNo: data.invoiceNo,
                    timestamp: new Date().toISOString()
                }
            });

            throw new Error(`Email Delivery Failed: ${errorMsg}`);
        }
    }
}
