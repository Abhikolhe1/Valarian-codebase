import {BindingScope, injectable} from '@loopback/core';
import {Order, OrderAddress} from '../models/order.model';
import {GeneratedInvoice} from '../utils/invoice.utils';

export interface ParcelSheetContext {
  awbNumber?: string;
  courierName?: string;
  barcodeDataUri?: string;
}

const COMPANY_ADDRESS = process.env.COMPANY_ADDRESS ?? '';
const COMPANY_SUPPORT_EMAIL = process.env.COMPANY_SUPPORT_EMAIL ?? '';

/**
 * Renders print-ready A4 HTML for order paperwork. Output is opened in an
 * iframe or window by the clients, which then call window.print(); nothing here
 * produces a PDF, so no PDF toolchain is required.
 */
@injectable({scope: BindingScope.SINGLETON})
export class InvoicePrintService {
  /**
   * Every interpolated value below originates from customer-supplied order data,
   * so it is escaped rather than trusted.
   */
  private esc(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private money(value: number | undefined | null): string {
    return `₹${Number(value ?? 0).toFixed(2)}`;
  }

  private date(value: string | Date | undefined): string {
    const parsed = value ? new Date(value) : new Date();
    return parsed.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private addressBlock(address?: OrderAddress): string {
    if (!address) return '';
    const parts = [
      address.address,
      [address.city, address.state].filter(Boolean).join(', '),
      address.zipCode,
      address.country,
    ].filter(Boolean);
    return parts.map(part => `<div>${this.esc(part)}</div>`).join('');
  }

  private baseStyles(): string {
    return `
      @page { size: A4; margin: 12mm; }
      * { box-sizing: border-box; }
      body {
        font-family: Arial, Helvetica, sans-serif;
        color: #111;
        margin: 0;
        padding: 16px;
        background: #f2f2f2;
        font-size: 12px;
        line-height: 1.45;
      }
      .sheet {
        background: #fff;
        max-width: 190mm;
        margin: 0 auto;
        padding: 18px 20px;
        border: 1px solid #ccc;
      }
      h1 { font-size: 19px; margin: 0; letter-spacing: -0.01em; }
      h2 {
        font-size: 11px;
        margin: 0 0 6px;
        text-transform: uppercase;
        letter-spacing: 0.09em;
        color: #555;
        font-weight: 700;
      }
      .row { display: flex; gap: 18px; }
      .row > * { flex: 1; min-width: 0; }
      .head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 18px;
        border-bottom: 2px solid #111;
        padding-bottom: 10px;
        margin-bottom: 14px;
      }
      .muted { color: #555; }
      .box { border: 1px solid #bbb; padding: 10px 12px; }
      .mt { margin-top: 14px; }
      table { width: 100%; border-collapse: collapse; margin-top: 6px; }
      th, td { padding: 7px 8px; border-bottom: 1px solid #ddd; text-align: left; vertical-align: top; }
      th {
        background: #f0f0f0;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        border-bottom: 1px solid #999;
      }
      td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
      tfoot td { border-bottom: none; padding: 4px 8px; }
      tfoot tr.grand td {
        border-top: 2px solid #111;
        font-weight: 700;
        font-size: 14px;
        padding-top: 8px;
      }
      .totals { width: 260px; margin-left: auto; }
      .foot {
        margin-top: 18px;
        border-top: 1px solid #ddd;
        padding-top: 10px;
        font-size: 10px;
        color: #666;
      }
      @media print {
        body { background: #fff; padding: 0; font-size: 11px; }
        .sheet { border: none; max-width: none; padding: 0; }
        .no-print { display: none !important; }
      }
    `;
  }

  /**
   * autoPrint fires the print dialog from the document's own load event, which
   * is the only reliable moment once images and styles have settled. Callers
   * that preview in an iframe with their own print button leave it off.
   */
  private page(
    title: string,
    body: string,
    extraStyles = '',
    autoPrint = false,
  ): string {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${this.esc(title)}</title>
<style>${this.baseStyles()}${extraStyles}</style>
</head>
<body>
<div class="sheet">${body}</div>
${autoPrint ? '<script>window.addEventListener("load", function () { window.print(); });</script>' : ''}
</body>
</html>`;
  }

  private itemRows(invoice: GeneratedInvoice): string {
    return invoice.items
      .map(
        (item, index) => `
        <tr>
          <td class="num">${index + 1}</td>
          <td>
            <strong>${this.esc(item.name)}</strong>
            ${item.sku ? `<div class="muted">SKU ${this.esc(item.sku)}</div>` : ''}
          </td>
          <td>${this.esc(item.hsnSac)}</td>
          <td class="num">${item.quantity}</td>
          <td class="num">${this.money(item.basePrice / (item.quantity || 1))}</td>
          <td class="num">${item.gstRate}%</td>
          <td class="num">${this.money(
            item.cgstAmount + item.sgstAmount + item.igstAmount,
          )}</td>
          <td class="num">${this.money(item.totalAmount)}</td>
        </tr>`,
      )
      .join('');
  }

  private taxSummaryRows(invoice: GeneratedInvoice): string {
    const {taxation} = invoice;
    if (taxation.supplyType === 'intra_state') {
      return `
        <tr><td>CGST</td><td class="num">${this.money(taxation.cgst)}</td></tr>
        <tr><td>SGST</td><td class="num">${this.money(taxation.sgst)}</td></tr>`;
    }
    return `<tr><td>IGST</td><td class="num">${this.money(taxation.igst)}</td></tr>`;
  }

  buildInvoiceHtml(
    order: Order,
    invoice: GeneratedInvoice,
    autoPrint = false,
  ): string {
    const body = `
      <div class="head">
        <div>
          <h1>${this.esc(invoice.seller.name)}</h1>
          ${COMPANY_ADDRESS ? `<div class="muted">${this.esc(COMPANY_ADDRESS)}</div>` : ''}
          <div class="muted">GSTIN ${this.esc(invoice.seller.gstNumber)}</div>
        </div>
        <div style="text-align:right">
          <h2>Tax Invoice</h2>
          <div><strong>${this.esc(invoice.invoiceNumber)}</strong></div>
          <div class="muted">Order ${this.esc(order.orderNumber)}</div>
          <div class="muted">${this.date(invoice.invoiceDate)}</div>
        </div>
      </div>

      <div class="row">
        <div class="box">
          <h2>Billed to</h2>
          <div><strong>${this.esc(invoice.customer.name)}</strong></div>
          ${this.addressBlock(invoice.customer.address)}
          ${invoice.customer.phone ? `<div>${this.esc(invoice.customer.phone)}</div>` : ''}
        </div>
        <div class="box">
          <h2>Shipped to</h2>
          <div><strong>${this.esc(order.shippingAddress?.fullName)}</strong></div>
          ${this.addressBlock(order.shippingAddress)}
          ${order.shippingAddress?.phone ? `<div>${this.esc(order.shippingAddress.phone)}</div>` : ''}
        </div>
      </div>

      <table class="mt">
        <thead>
          <tr>
            <th class="num">#</th>
            <th>Item</th>
            <th>HSN</th>
            <th class="num">Qty</th>
            <th class="num">Rate</th>
            <th class="num">GST</th>
            <th class="num">Tax</th>
            <th class="num">Amount</th>
          </tr>
        </thead>
        <tbody>${this.itemRows(invoice)}</tbody>
      </table>

      <table class="totals mt">
        <tbody>
          <tr><td>Taxable value</td><td class="num">${this.money(invoice.totals.taxableAmount)}</td></tr>
          ${this.taxSummaryRows(invoice)}
          ${invoice.totals.discount ? `<tr><td>Discount</td><td class="num">-${this.money(invoice.totals.discount)}</td></tr>` : ''}
          <tr><td>Shipping</td><td class="num">${this.money(invoice.totals.shipping)}</td></tr>
        </tbody>
        <tfoot>
          <tr class="grand"><td>Total</td><td class="num">${this.money(invoice.totals.total)}</td></tr>
        </tfoot>
      </table>

      <div class="foot">
        <div>Payment: ${this.esc((order.paymentMethod || '').toUpperCase())} · ${this.esc(order.paymentStatus)}</div>
        <div>This is a computer-generated invoice and does not require a signature.</div>
        ${COMPANY_SUPPORT_EMAIL ? `<div>Questions? ${this.esc(COMPANY_SUPPORT_EMAIL)}</div>` : ''}
      </div>
    `;

    return this.page(`Invoice ${invoice.invoiceNumber}`, body, '', autoPrint);
  }

  /** Builds a compact 4 x 6 inch label for attaching to a parcel. */
  buildShippingLabelHtml(
    order: Order,
    invoice: GeneratedInvoice,
    context: ParcelSheetContext = {},
  ): string {
    const isCod = order.paymentMethod === 'cod';
    const extraStyles = `
      @page { size: 4in 6in; margin: 4mm; }
      body { padding: 8px; }
      .sheet { max-width: 4in; min-height: 5.7in; padding: 10px; border: 2px solid #111; }
      .label-head { display: flex; justify-content: space-between; gap: 8px; padding-bottom: 8px; border-bottom: 2px solid #111; }
      .brand { font-size: 17px; font-weight: 800; text-transform: uppercase; }
      .order-ref { text-align: right; font-size: 10px; }
      .ship-to { padding: 10px 2px; border-bottom: 2px solid #111; }
      .ship-to .name { font-size: 18px; font-weight: 800; }
      .ship-to .lines { font-size: 14px; line-height: 1.45; }
      .phone { margin-top: 5px; font-size: 14px; font-weight: 800; }
      .routing { display: flex; gap: 10px; align-items: center; padding: 9px 0; border-bottom: 2px solid #111; }
      .routing .code { flex: 1; text-align: center; }
      .routing .code img { width: 100%; max-height: 68px; object-fit: contain; }
      .routing .awb { width: 110px; font-size: 10px; text-align: right; }
      .pay { margin: 8px 0; border: 3px solid #111; padding: 8px; text-align: center; font-size: 14px; font-weight: 800; letter-spacing: 0.04em; }
      .pay.cod { background: #111; color: #fff; }
      .contents { margin-top: 8px; }
      .contents th, .contents td { padding: 5px 4px; font-size: 10px; }
      .contents th { font-size: 9px; }
      .label-foot { margin-top: 8px; font-size: 9px; color: #555; }
      @media print { body { padding: 0; } .sheet { min-height: 0; border: 2px solid #111; padding: 8px; } }
    `;

    const itemRows = invoice.items
      .map(
        item => `<tr>
          <td><strong>${this.esc(item.name)}</strong></td>
          <td>${this.esc(item.sku ? item.sku : '-')}</td>
          <td class="num"><strong>${item.quantity}</strong></td>
        </tr>`,
      )
      .join('');

    const body = `
      <div class="label-head">
        <div><div class="brand">${this.esc(invoice.seller.name)}</div><div class="muted">Shipping label</div></div>
        <div class="order-ref"><strong>ORDER</strong><br />${this.esc(order.orderNumber)}<br /><span class="muted">${this.date(order.createdAt)}</span></div>
      </div>
      <div class="ship-to">
        <h2>Deliver to</h2>
        <div class="name">${this.esc(order.shippingAddress?.fullName)}</div>
        <div class="lines">${this.addressBlock(order.shippingAddress)}</div>
        ${order.shippingAddress?.phone ? `<div class="phone">Phone: ${this.esc(order.shippingAddress.phone)}</div>` : ''}
      </div>
      <div class="routing">
        <div class="code">${context.barcodeDataUri ? `<img src="${context.barcodeDataUri}" alt="Order barcode" />` : `<strong>${this.esc(order.orderNumber)}</strong>`}</div>
        <div class="awb">
          ${context.courierName ? `<strong>${this.esc(context.courierName)}</strong><br />` : ''}
          ${context.awbNumber ? `AWB<br /><strong>${this.esc(context.awbNumber)}</strong>` : 'AWB pending'}
        </div>
      </div>
      <div class="pay ${isCod ? 'cod' : ''}">${isCod ? `COD - COLLECT INR ${Number(order.total ?? 0).toFixed(2)}` : 'PREPAID - DO NOT COLLECT CASH'}</div>
      <table class="contents">
        <thead><tr><th>Package contents</th><th>SKU</th><th class="num">Qty</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="label-foot">
        Sold by ${this.esc(invoice.seller.name)}${COMPANY_ADDRESS ? ` &middot; ${this.esc(COMPANY_ADDRESS)}` : ''}<br />
        This is a shipping label, not a tax invoice.
      </div>
    `;

    return this.page(`Shipping label ${order.orderNumber}`, body, extraStyles);
  }

  /**
   * Combined sheet for sticking on the parcel: delivery address and order
   * barcode up top, contents and tax invoice below, on one A4 page.
   */
  buildParcelSheetHtml(
    order: Order,
    invoice: GeneratedInvoice,
    context: ParcelSheetContext = {},
  ): string {
    const isCod = order.paymentMethod === 'cod';
    const extraStyles = `
      .ship {
        border: 2px solid #111;
        padding: 12px 14px;
        display: flex;
        gap: 16px;
        align-items: flex-start;
      }
      .ship .to { flex: 1; }
      .ship .to .name { font-size: 17px; font-weight: 700; }
      .ship .to .lines { font-size: 14px; line-height: 1.5; }
      .ship .code { width: 230px; text-align: center; flex: none; }
      .ship .code img { width: 100%; height: auto; }
      .pay {
        margin-top: 8px;
        border: 2px solid #111;
        padding: 7px 10px;
        text-align: center;
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 0.04em;
      }
      .pay.cod { background: #111; color: #fff; }
      .cut {
        margin: 16px 0;
        border-top: 2px dashed #999;
        text-align: center;
        font-size: 9px;
        color: #999;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .cut span { background: #fff; padding: 0 8px; position: relative; top: -7px; }
    `;

    const body = `
      <div class="ship">
        <div class="to">
          <h2>Deliver to</h2>
          <div class="name">${this.esc(order.shippingAddress?.fullName)}</div>
          <div class="lines">
            ${this.addressBlock(order.shippingAddress)}
            ${order.shippingAddress?.phone ? `<div><strong>${this.esc(order.shippingAddress.phone)}</strong></div>` : ''}
          </div>
        </div>
        <div class="code">
          ${
            context.barcodeDataUri
              ? `<img src="${context.barcodeDataUri}" alt="${this.esc(order.orderNumber)}" />`
              : `<div style="font-size:16px;font-weight:700">${this.esc(order.orderNumber)}</div>`
          }
          ${
            context.awbNumber
              ? `<div style="margin-top:6px;font-size:11px">
                   ${this.esc(context.courierName ?? 'Courier')} AWB<br />
                   <strong style="font-size:13px">${this.esc(context.awbNumber)}</strong>
                 </div>`
              : ''
          }
        </div>
      </div>

      <div class="pay ${isCod ? 'cod' : ''}">
        ${
          isCod
            ? `COLLECT ON DELIVERY — ${this.money(order.total)}`
            : `PREPAID — DO NOT COLLECT CASH`
        }
      </div>

      <div class="row mt">
        <div class="box">
          <h2>Order</h2>
          <div><strong>${this.esc(order.orderNumber)}</strong></div>
          <div class="muted">Placed ${this.date(order.createdAt)}</div>
        </div>
        <div class="box">
          <h2>Sold by</h2>
          <div><strong>${this.esc(invoice.seller.name)}</strong></div>
          <div class="muted">GSTIN ${this.esc(invoice.seller.gstNumber)}</div>
        </div>
        <div class="box">
          <h2>Invoice</h2>
          <div><strong>${this.esc(invoice.invoiceNumber)}</strong></div>
          <div class="muted">${this.date(invoice.invoiceDate)}</div>
        </div>
      </div>

      <div class="cut"><span>Tax invoice below</span></div>

      <table>
        <thead>
          <tr>
            <th class="num">#</th>
            <th>Item</th>
            <th>HSN</th>
            <th class="num">Qty</th>
            <th class="num">Rate</th>
            <th class="num">GST</th>
            <th class="num">Tax</th>
            <th class="num">Amount</th>
          </tr>
        </thead>
        <tbody>${this.itemRows(invoice)}</tbody>
      </table>

      <table class="totals mt">
        <tbody>
          <tr><td>Taxable value</td><td class="num">${this.money(invoice.totals.taxableAmount)}</td></tr>
          ${this.taxSummaryRows(invoice)}
          ${invoice.totals.discount ? `<tr><td>Discount</td><td class="num">-${this.money(invoice.totals.discount)}</td></tr>` : ''}
          <tr><td>Shipping</td><td class="num">${this.money(invoice.totals.shipping)}</td></tr>
        </tbody>
        <tfoot>
          <tr class="grand"><td>Total</td><td class="num">${this.money(invoice.totals.total)}</td></tr>
        </tfoot>
      </table>

      <div class="foot">
        Computer-generated invoice, no signature required. Keep this slip for returns.
      </div>
    `;

    return this.page(`Parcel sheet ${order.orderNumber}`, body, extraStyles);
  }
}
