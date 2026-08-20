import {BindingScope, inject, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import bwipjs from 'bwip-js';
import {
  Barcode,
  BarcodeScanEventType,
  BarcodeStatus,
  Order,
  OrderItemEntity,
} from '../models';
import {BarcodeRepository, BarcodeScanLogRepository} from '../repositories';
import {LocalStorageService} from './storage.service';
import {v4 as uuidv4} from 'uuid';
import sharp from 'sharp';
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from '@zxing/library';

@injectable({scope: BindingScope.TRANSIENT})
export class BarcodeService {
  constructor(
    @inject('services.storage')
    private storageService: LocalStorageService,
    @repository(BarcodeRepository)
    private barcodeRepository: BarcodeRepository,
    @repository(BarcodeScanLogRepository)
    private barcodeScanLogRepository: BarcodeScanLogRepository,
  ) {}

  async generateUniqueCode(prefix = 'BRCODE'): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = `${prefix}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      const existing = await this.barcodeRepository.findByCode(candidate);

      if (!existing) {
        return candidate;
      }
    }

    throw new HttpErrors.InternalServerError('Failed to generate a unique barcode');
  }

  async renderBarcodeBuffer(code: string): Promise<Buffer> {
    return bwipjs.toBuffer({
      bcid: 'code128',
      text: code,
      scale: 3,
      height: 12,
      includetext: true,
      textxalign: 'center',
      backgroundcolor: 'FFFFFF',
    });
  }

  async uploadBarcodeImage(code: string): Promise<string> {
    const buffer = await this.renderBarcodeBuffer(code);
    const relativePath = await this.storageService.uploadFile(
      buffer,
      `${code}.png`,
      'barcodes',
    );

    return this.storageService.getFileUrl(relativePath);
  }

  async createBarcodeForOrderItem(
    orderItem: OrderItemEntity,
    order: Order,
    options?: object,
  ): Promise<Barcode> {
    const existing = await this.barcodeRepository.findByOrderItemId(
      orderItem.id,
      options,
    );

    if (existing) {
      return existing;
    }

    const code = await this.generateUniqueCode();
    const barcodeImageUrl = await this.uploadBarcodeImage(code);
    const barcode = await this.barcodeRepository.create(
      {
        id: uuidv4(),
        code,
        orderItemId: orderItem.id,
        status: 'GENERATED',
        barcodeImageUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      options,
    );

    await this.logEvent(
      barcode,
      'GENERATED',
      `Barcode generated for order ${order.orderNumber}`,
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderItemId: orderItem.id,
      },
      options,
    );

    return barcode;
  }

  async updateBarcodeStatus(
    barcode: Barcode,
    status: BarcodeStatus,
    message?: string,
    metadata?: object,
    options?: object,
  ): Promise<Barcode> {
    await this.barcodeRepository.updateById(
      barcode.id,
      {
        status,
        updatedAt: new Date(),
      },
      options,
    );

    const updated = await this.barcodeRepository.findById(barcode.id, undefined, options);
    await this.logEvent(
      updated,
      status === 'RETURN_REQUESTED' ? 'RETURN_REQUESTED' : 'STATUS_UPDATED',
      message ?? `Barcode status changed to ${status}`,
      metadata,
      options,
    );

    return updated;
  }

  async logEvent(
    barcode: Barcode,
    eventType: BarcodeScanEventType,
    message?: string,
    metadata?: object,
    options?: object,
  ): Promise<void> {
    const metadataWithOrder = metadata as {orderId?: string} | undefined;

    await this.barcodeScanLogRepository.create(
      {
        barcodeId: barcode.id,
        orderItemId: barcode.orderItemId,
        orderId: metadataWithOrder?.orderId,
        eventType,
        message,
        metadata,
        createdAt: new Date(),
      },
      options,
    );
  }

  async decodeBarcodeFromImageBuffer(buffer: Buffer): Promise<{
    code: string;
    format: string;
  }> {
    try {
      const {data, info} = await sharp(buffer)
        .rotate()
        .grayscale()
        .normalize()
        .raw()
        .toBuffer({resolveWithObject: true});

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const luminanceSource = new RGBLuminanceSource(
        new Uint8ClampedArray(data),
        info.width,
        info.height,
      );
      const binaryBitmap = new BinaryBitmap(
        new HybridBinarizer(luminanceSource),
      );
      const reader = new MultiFormatReader();
      reader.setHints(hints);

      const result = reader.decode(binaryBitmap);

      return {
        code: result.getText(),
        format: result.getBarcodeFormat().toString(),
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown barcode format';

      throw new HttpErrors.BadRequest(
        `Unable to decode barcode image: ${message}`,
      );
    }
  }

  buildPrintableLabelHtml(labels: Array<{
    barcodeCode: string;
    barcodeImageUrl?: string;
    orderNumber: string;
    productName: string;
    variantLabel?: string;
    quantity?: number;
  }>): string {
    const cards = labels
      .map(
        label => `
          <article class="label">
            <header>
              <p class="eyebrow">Shipping Label</p>
              <h1>${label.productName}</h1>
            </header>
            <p><strong>Order:</strong> ${label.orderNumber}</p>
            <p><strong>Barcode:</strong> ${label.barcodeCode}</p>
            <p><strong>Variant:</strong> ${label.variantLabel ?? 'Standard'}</p>
            <p><strong>Qty:</strong> ${label.quantity ?? 1}</p>
            <img src="${label.barcodeImageUrl ?? ''}" alt="${label.barcodeCode}" />
          </article>
        `,
      )
      .join('');

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Valiarian Barcode Labels</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: #f4f4f4; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
            .label { background: white; border: 1px solid #d9d9d9; border-radius: 12px; padding: 20px; page-break-inside: avoid; }
            .eyebrow { margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; color: #666; }
            h1 { margin: 0 0 12px; font-size: 18px; }
            p { margin: 6px 0; color: #222; }
            img { width: 100%; margin-top: 16px; }
            @media print {
              body { background: white; padding: 0; }
              .grid { gap: 8px; }
              .label { border-radius: 0; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <section class="grid">${cards}</section>
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `;
  }

  buildBarcodeOnlyHtml(labels: Array<{
    barcodeCode: string;
    barcodeImageUrl?: string;
  }>): string {
    const cards = labels
      .map(
        label => `
          <article class="label">
            <p class="eyebrow">Barcode</p>
            <p class="code">${label.barcodeCode}</p>
            <img src="${label.barcodeImageUrl ?? ''}" alt="${label.barcodeCode}" />
          </article>
        `,
      )
      .join('');

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Valiarian Barcode Labels</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: #f4f4f4; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
            .label { background: white; border: 1px solid #d9d9d9; border-radius: 12px; padding: 20px; page-break-inside: avoid; text-align: center; }
            .eyebrow { margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; color: #666; }
            .code { margin: 0 0 12px; font-size: 14px; color: #111; }
            img { width: 100%; margin-top: 6px; }
            @media print {
              body { background: white; padding: 0; }
              .grid { gap: 8px; }
              .label { border-radius: 0; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <section class="grid">${cards}</section>
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `;
  }
}
