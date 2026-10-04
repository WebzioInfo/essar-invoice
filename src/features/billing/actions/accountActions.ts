"use server";

import { verifySessionVerified } from "@/lib/auth-server";
import { PartyAccountService } from "../services/PartyAccountService";
import { StatementPdfService } from "../services/StatementPdfService";
import { InvoiceShareService } from "../services/InvoiceShareService";
import { recordAuditLog } from "@/lib/audit";
import { handleActionError } from "@/lib/validation";
import { db } from "@/db/prisma/client";
import nodemailer from "nodemailer";

import { buildWhatsAppStatementMessage, buildEmailStatementContent } from "../utils/shareTemplates";

export async function getPartyAccountOverviewAction(
    partyId: string,
    partyType: 'CLIENT' | 'SUPPLIER',
    filters?: {
        startDate?: string;
        endDate?: string;
        transactionType?: string;
        search?: string;
    }
) {
    const session = await verifySessionVerified();
    if (!session) throw new Error("Unauthorized");

    try {
        const data = await PartyAccountService.getAccountOverview(partyId, partyType, filters);
        return { success: true, data };
    } catch (error: any) {
        return handleActionError(error);
    }
}

export async function prepareStatementWhatsAppAction(
    partyId: string,
    partyType: 'CLIENT' | 'SUPPLIER',
    overridePhone?: string,
    customMessage?: string
) {
    const session = await verifySessionVerified();
    if (!session) throw new Error("Unauthorized");

    try {
        const data = await PartyAccountService.getAccountOverview(partyId, partyType);
        const { summary } = data;

        const phoneToUse = overridePhone || summary.phone;
        const phoneVal = InvoiceShareService.validateAndCleanPhone(phoneToUse);

        if (!phoneVal.valid) {
            throw new Error(phoneVal.error || "Phone number is invalid for WhatsApp sharing.");
        }

        const isClient = partyType === 'CLIENT';
        const bankDetailsShort = `${summary.companyName || 'ESSAR ENTERPRISES'}\nFederal Bank, Dommasandra\nA/C: 21650200003173\nIFSC: FDRL0002165`;
        const message = customMessage || buildWhatsAppStatementMessage(summary, isClient, bankDetailsShort);

        const whatsappUrl = `https://wa.me/${phoneVal.cleanPhone}?text=${encodeURIComponent(message)}`;

        await recordAuditLog(db, {
            userId: session.userId,
            action: isClient ? 'CLIENT_STATEMENT_WHATSAPP' : 'VENDOR_STATEMENT_WHATSAPP',
            entityType: isClient ? 'Client' : 'Vendor',
            entityId: partyId,
            details: {
                recipient: phoneVal.cleanPhone,
                status: 'OPENED',
                partyName: summary.name,
                closingBalance: summary.currentBalance,
                timestamp: new Date().toISOString()
            }
        });

        return {
            success: true,
            whatsappUrl,
            phone: phoneVal.cleanPhone,
            message
        };
    } catch (error: any) {
        return handleActionError(error);
    }
}

export async function sendStatementEmailAction(
    partyId: string,
    partyType: 'CLIENT' | 'SUPPLIER',
    overrideEmail?: string,
    customBody?: string,
    customSubject?: string,
    filters?: { startDate?: string; endDate?: string }
) {
    const session = await verifySessionVerified();
    if (!session) throw new Error("Unauthorized");

    try {
        const data = await PartyAccountService.getAccountOverview(partyId, partyType, filters);
        const { summary } = data;

        const emailToUse = overrideEmail || summary.email;
        const emailVal = InvoiceShareService.validateEmail(emailToUse);

        if (!emailVal.valid) {
            throw new Error(emailVal.error || "Email address is invalid.");
        }

        const { buffer, fileName } = await StatementPdfService.generateStatementPdf(partyId, partyType, filters);

        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const smtpFrom = process.env.SMTP_FROM || `"${summary.companyName || 'ESSAR ENTERPRISES'}" <${smtpUser || "noreply@essarenterprises.com"}>`;

        if (!smtpHost || !smtpUser || !smtpPass) {
            const missingError = "SMTP email provider is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.";
            
            await recordAuditLog(db, {
                userId: session.userId,
                action: partyType === 'CLIENT' ? 'CLIENT_STATEMENT_EMAIL' : 'VENDOR_STATEMENT_EMAIL',
                entityType: partyType === 'CLIENT' ? 'Client' : 'Vendor',
                entityId: partyId,
                details: { recipient: emailVal.email, status: 'FAILED', error: missingError }
            });

            throw new Error(missingError);
        }

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass }
        });

        const isClient = partyType === 'CLIENT';
        const bankDetails = `${summary.companyName || 'ESSAR ENTERPRISES'}\nFederal Bank, Dommasandra\nA/C No: 21650200003173\nIFSC: FDRL0002165`;
        
        let subject = customSubject || "";
        let body = customBody || "";
        if (!body) {
            const content = buildEmailStatementContent(summary, isClient, bankDetails);
            subject = content.subject;
            body = content.body;
        } else if (!subject) {
            subject = `Account Statement - ${summary.name} (${summary.companyName || 'ESSAR ENTERPRISES'})`;
        }

        const sendResult = await transporter.sendMail({
            from: smtpFrom,
            to: emailVal.email,
            subject,
            text: body,
            attachments: [{ filename: fileName, content: buffer, contentType: "application/pdf" }]
        });

        await recordAuditLog(db, {
            userId: session.userId,
            action: partyType === 'CLIENT' ? 'CLIENT_STATEMENT_EMAIL' : 'VENDOR_STATEMENT_EMAIL',
            entityType: partyType === 'CLIENT' ? 'Client' : 'Vendor',
            entityId: partyId,
            details: {
                recipient: emailVal.email,
                status: 'SENT',
                messageId: sendResult.messageId,
                closingBalance: summary.currentBalance
            }
        });

        return {
            success: true,
            recipient: emailVal.email,
            messageId: sendResult.messageId
        };
    } catch (error: any) {
        return handleActionError(error);
    }
}
