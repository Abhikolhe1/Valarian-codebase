import {Order} from '../models';

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
    gstRates: number[];
    taxableAmount: number;
    gstAmount: number;
    cgstRate: number;
    sgstRate: number;
    igstRate: number;
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
    basePrice: number;
    subtotal: number;
    totalAmount: number;
    hsnSac: string;
    gstRate: number;
    cgstRate: number;
    sgstRate: number;
    igstRate: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
  }>;
  totals: {
    subtotal: number;
    taxableAmount: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
  };
}

const roundCurrency = (value: number | string | null | undefined) =>
  Number(Number(value || 0).toFixed(2));

export const getGstRateForClothing = (finalUnitPrice: number): number =>
  Number(finalUnitPrice) <= 1000 ? 5 : 12;

export const isIntraStateSupply = (sellerState?: string, customerState?: string): boolean =>
  String(sellerState || '').trim().toLowerCase() === String(customerState || '').trim().toLowerCase();

export function calculateInclusiveGstBreakup(params: {
  finalUnitPrice: number;
  quantity: number;
  sellerState?: string;
  customerState?: string;
}) {
  const finalUnitPrice = roundCurrency(params.finalUnitPrice);
  const quantity = Number(params.quantity || 0);
  const gstRate = getGstRateForClothing(finalUnitPrice);
  const intraState = isIntraStateSupply(params.sellerState, params.customerState);
  const totalAmount = roundCurrency(finalUnitPrice * quantity);
  const basePrice = roundCurrency(totalAmount / (1 + gstRate / 100));
  const totalGst = roundCurrency(totalAmount - basePrice);
  const splitTax = roundCurrency(totalGst / 2);

  return {
    price: finalUnitPrice,
    quantity,
    basePrice,
    gstRate,
    cgstRate: intraState ? gstRate / 2 : 0,
    sgstRate: intraState ? gstRate / 2 : 0,
    igstRate: intraState ? 0 : gstRate,
    cgstAmount: intraState ? splitTax : 0,
    sgstAmount: intraState ? splitTax : 0,
    igstAmount: intraState ? 0 : totalGst,
    gstAmount: totalGst,
    totalAmount,
    supplyType: intraState ? 'intra_state' : 'inter_state',
  };
}

export function generateInvoiceNumber(orderNumber: string): string {
  return `INV-${orderNumber}`;
}

export function buildInvoiceFromOrder(order: Order): GeneratedInvoice {
  const shippingState = String(order.shippingAddress?.state || '').trim().toLowerCase();
  const companyState = DEFAULT_COMPANY_STATE.trim().toLowerCase();
  const isIntraState = Boolean(shippingState) && shippingState === companyState;
  const sourceItems = ((order as Order & {orderItems?: any[]}).orderItems || order.items || []).map(item => ({
    ...item,
    subtotal: item.subtotal ?? item.totalAmount ?? 0,
  }));
  const computedItems = sourceItems.map(item => {
    const basePrice =
      item.basePrice ??
      calculateInclusiveGstBreakup({
        finalUnitPrice: item.price,
        quantity: item.quantity,
        sellerState: DEFAULT_COMPANY_STATE,
        customerState: order.shippingAddress?.state,
      }).basePrice;

    const gstRate =
      item.gstRate ??
      getGstRateForClothing(item.price);
    const lineTax =
      roundCurrency((item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0)) ||
      roundCurrency((item.totalAmount ?? item.subtotal) - basePrice);
    const cgstRate = item.cgstRate ?? (isIntraState ? gstRate / 2 : 0);
    const sgstRate = item.sgstRate ?? (isIntraState ? gstRate / 2 : 0);
    const igstRate = item.igstRate ?? (isIntraState ? 0 : gstRate);

    return {
      id: item.id,
      productId: item.productId,
      name: item.name || 'Product',
      sku: item.sku || '',
      quantity: item.quantity,
      price: roundCurrency(item.price),
      basePrice: roundCurrency(basePrice),
      subtotal: roundCurrency(item.subtotal),
      totalAmount: roundCurrency(item.totalAmount ?? item.subtotal),
      hsnSac: DEFAULT_HSN_SAC,
      gstRate,
      cgstRate,
      sgstRate,
      igstRate,
      cgstAmount: roundCurrency(item.cgstAmount ?? (isIntraState ? lineTax / 2 : 0)),
      sgstAmount: roundCurrency(item.sgstAmount ?? (isIntraState ? lineTax / 2 : 0)),
      igstAmount: roundCurrency(item.igstAmount ?? (isIntraState ? 0 : lineTax)),
    };
  });

  const taxableAmount = roundCurrency(
    computedItems.reduce((sum, item) => sum + item.basePrice, 0),
  );
  const cgst = roundCurrency(computedItems.reduce((sum, item) => sum + item.cgstAmount, 0));
  const sgst = roundCurrency(computedItems.reduce((sum, item) => sum + item.sgstAmount, 0));
  const igst = roundCurrency(computedItems.reduce((sum, item) => sum + item.igstAmount, 0));
  const gstAmount = roundCurrency(cgst + sgst + igst);
  const gstRates = Array.from(new Set(computedItems.map(item => item.gstRate))).sort((a, b) => a - b);
  const uniformGstRate = gstRates.length === 1 ? gstRates[0] : 0;

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
      gstRate: uniformGstRate,
      gstRates,
      taxableAmount,
      gstAmount,
      cgstRate: isIntraState && uniformGstRate ? uniformGstRate / 2 : 0,
      sgstRate: isIntraState && uniformGstRate ? uniformGstRate / 2 : 0,
      igstRate: !isIntraState ? uniformGstRate : 0,
      cgst,
      sgst,
      igst,
      hsnSac: DEFAULT_HSN_SAC,
      supplyType: isIntraState ? 'intra_state' : 'inter_state',
    },
    items: computedItems,
    totals: {
      subtotal: roundCurrency(order.subtotal),
      taxableAmount,
      discount: roundCurrency(order.discount),
      shipping: roundCurrency(order.shipping),
      tax: gstAmount,
      total: roundCurrency(order.total),
    },
  };
}
