
export type View = 'dashboard' | 'sales' | 'inventory' | 'clients' | 'purchases' | 'vendors' | 'reports' | 'gst_filing' | 'recurring_invoices' | 'settings';

export enum PriceType {
  EXCLUSIVE = 'EXCLUSIVE',
  INCLUSIVE = 'INCLUSIVE',
}

export enum TransactionType {
  INTRA_STATE = 'INTRA_STATE',
  INTER_STATE = 'INTER_STATE',
}

export enum InvoiceStatus {
    PAID = 'PAID',
    UNPAID = 'UNPAID',
}

export enum PurchaseStatus {
    PAID = 'PAID',
    UNPAID = 'UNPAID',
}

export enum BillingFrequency {
    MONTHLY = 'MONTHLY',
    QUARTERLY = 'QUARTERLY',
    YEARLY = 'YEARLY',
}

export enum ProfileStatus {
    ACTIVE = 'ACTIVE',
    PAUSED = 'PAUSED',
}


export interface Item {
  id: string;
  description: string;
  hsn: string;
  quantity: number;
  price: number;
  gstRate: number;
}

export interface Product {
    id: string;
    name: string;
    hsn: string;
    price: number;
    gstRate: number;
    trackStock: boolean;
    stock: number;
    lowStockThreshold: number;
}

export interface GstBreakdownDetail {
    rate: number;
    taxableAmount: number;
    gstAmount: number;
}

export interface CalculationResult {
  totalNetAmount: number;
  totalGstAmount: number;
  grandTotal: number;
  gstBreakdown: GstBreakdownDetail[];
}

export interface BusinessDetails {
    name: string;
    gstin: string;
    address: string;
    logo?: string;
    terms: string;
    bankDetails: string;
}

export interface ClientDetails {
    id: string;
    name: string;
    gstin: string;
    address: string;
}

export interface Vendor {
    id: string;
    name: string;
    gstin: string;
    address: string;
}

export interface LogisticsDetails {
    transporterName: string;
    transporterId: string;
    vehicleNumber: string;
    ewayBillNumber: string;
}

export interface Settings {
    razorpayKeyId: string;
    razorpayKeySecret: string;
}

export interface InvoiceRecord {
    id: string;
    invoiceNumber: string;
    client: ClientDetails;
    business: BusinessDetails;
    items: Item[];
    date: string; // ISO Date String
    totalAmount: number;
    calculationResult: CalculationResult;
    transactionType: TransactionType;
    priceType: PriceType;
    status: InvoiceStatus;
    paymentDate?: string; // ISO Date String
    logistics?: LogisticsDetails;
    paymentLink?: string;
}

export interface QuotationRecord {
    id: string;
    quotationNumber: string;
    client: ClientDetails;
    business: BusinessDetails;
    items: Item[];
    date: string; // ISO Date String
    totalAmount: number;
    calculationResult: CalculationResult;
    transactionType: TransactionType;
    priceType: PriceType;
}

export interface PurchaseItem {
    id: string;
    description: string;
    hsn: string;
    quantity: number;
    price: number;
    gstRate: number;
}

export interface PurchaseRecord {
    id: string;
    billNumber: string;
    vendor: Vendor;
    items: PurchaseItem[];
    date: string; // ISO Date String
    totalAmount: number;
    calculationResult: CalculationResult;
    transactionType: TransactionType;
    priceType: PriceType;
    status: PurchaseStatus;
}

export interface RecurringProfile {
    id: string;
    client: ClientDetails;
    items: Item[];
    frequency: BillingFrequency;
    startDate: string; // ISO Date String
    endDate?: string; // ISO Date String
    lastGeneratedDate?: string; // ISO Date String
    nextDueDate: string; // ISO Date String
    status: ProfileStatus;
    priceType: PriceType;
    transactionType: TransactionType;
}
