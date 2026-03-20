import {Order} from '../models';

const DEFAULT_GST_RATE = Number(process.env.DEFAULT_GST_RATE || 18);
const DEFAULT_HSN_SAC = process.env.DEFAULT_HSN_SAC || '6109';
const DEFAULT_GST_NUMBER = process.env.COMPANY_GST_NUMBER || '27ABCDE1234F1Z5';
const DEFAULT_COMPANY_NAME = process.env.COMPANY_NAME || 'Valiarian';
const DEFAULT_COMPANY_STATE = process.env.COMPANY_STATE || 'Maharashtra';

export interface GeneratedInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  seller: {
    name: string;
    gstNumber: string;
    state: string;
  };
  customer: {
    name: string;
    email?: string;
    phone: string;
    address: any;
  };
  taxation: {
    gstRate: number;
    taxableAmount: number;
    gstAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    hsnSac: string;
    supplyType: 'intra_state' | 'inter_state';
  };
  items: Array<{
    id: string;
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    price: number;
    subtotal: number;
    hsnSac: string;
    gstRate: number;
  }>;
  totals: {
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
  };
}

const roundCurrency = (value: number) => Number((value || 0).toFixed(2));

export function generateInvoiceNumber(orderNumber: string): string {
  return `INV-${orderNumber}`;
}

export function buildInvoiceFromOrder(order: Order): GeneratedInvoice {
  const shippingState = String(order.shippingAddress?.state || '').trim().toLowerCase();
  const companyState = DEFAULT_COMPANY_STATE.trim().toLowerCase();
  const isIntraState = Boolean(shippingState) && shippingState === companyState;
  const taxableAmount = Math.max(0, roundCurrency(order.subtotal - order.discount));
  const gstAmount = roundCurrency(order.tax || taxableAmount * (DEFAULT_GST_RATE / 100));
  const splitTax = roundCurrency(gstAmount / 2);

  return {
    invoiceNumber: generateInvoiceNumber(order.orderNumber),
    invoiceDate: new Date(order.createdAt || new Date()).toISOString(),
    currency: order.currency || 'INR',
    seller: {
      name: DEFAULT_COMPANY_NAME,
      gstNumber: DEFAULT_GST_NUMBER,
      state: DEFAULT_COMPANY_STATE,
    },
    customer: {
      name: order.billingAddress?.fullName || 'Customer',
      email: order.billingAddress?.email,
      phone: order.billingAddress?.phone || '',
      address: order.billingAddress,
    },
    taxation: {
      gstRate: DEFAULT_GST_RATE,
      taxableAmount,
      gstAmount,
      cgst: isIntraState ? splitTax : 0,
      sgst: isIntraState ? splitTax : 0,
      igst: isIntraState ? 0 : gstAmount,
      hsnSac: DEFAULT_HSN_SAC,
      supplyType: isIntraState ? 'intra_state' : 'inter_state',
    },
    items: (order.items || []).map(item => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      sku: item.sku || '',
      quantity: item.quantity,
      price: roundCurrency(item.price),
      subtotal: roundCurrency(item.subtotal),
      hsnSac: DEFAULT_HSN_SAC,
      gstRate: DEFAULT_GST_RATE,
    })),
    totals: {
      subtotal: roundCurrency(order.subtotal),
      discount: roundCurrency(order.discount),
      shipping: roundCurrency(order.shipping),
      tax: roundCurrency(order.tax),
      total: roundCurrency(order.total),
    },
  };
}
