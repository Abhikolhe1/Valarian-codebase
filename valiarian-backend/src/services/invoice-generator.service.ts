import {BindingScope, injectable} from '@loopback/core';
import {Order} from '../models';
import {buildInvoiceFromOrder} from '../utils/invoice.utils';

@injectable({scope: BindingScope.TRANSIENT})
export class InvoiceGeneratorService {
  generateInvoiceNumber(order: Order): string {
    const year = new Date(order.createdAt || new Date()).getFullYear();
    const suffix = String(order.orderNumber || order.id).replace(/[^0-9A-Za-z]/g, '').slice(-6);
    return `INV-${year}-${suffix || '000001'}`;
  }

  buildInvoiceRecord(order: Order) {
    const generatedInvoice = buildInvoiceFromOrder(order);

    return {
      invoiceNumber: this.generateInvoiceNumber(order),
      totalAmount: order.totalAmount ?? order.total,
      taxAmount: order.tax ?? generatedInvoice.taxation.gstAmount,
      pdfUrl: undefined as string | undefined,
      generatedInvoice,
    };
  }
}
