// src/features/billing/types.ts

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export const InvoiceStatus = {
  DRAFT: 'DRAFT' as const,
  SENT: 'SENT' as const,
  PARTIAL: 'PARTIAL' as const,
  PAID: 'PAID' as const,
  OVERDUE: 'OVERDUE' as const,
  CANCELLED: 'CANCELLED' as const,
};

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'OTHER';
export const PaymentMethod = {
  CASH: 'CASH' as const,
  BANK_TRANSFER: 'BANK_TRANSFER' as const,
  UPI: 'UPI' as const,
  CHEQUE: 'CHEQUE' as const,
  OTHER: 'OTHER' as const,
};

export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED' | 'CANCELLED';
export const QuotationStatus = {
  DRAFT: 'DRAFT' as const,
  SENT: 'SENT' as const,
  ACCEPTED: 'ACCEPTED' as const,
  REJECTED: 'REJECTED' as const,
  CONVERTED: 'CONVERTED' as const,
  CANCELLED: 'CANCELLED' as const,
};
