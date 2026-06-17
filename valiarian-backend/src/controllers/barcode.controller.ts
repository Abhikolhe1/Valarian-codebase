import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  get,
  HttpErrors,
  param,
  patch,
  post,
  Request,
  requestBody,
  Response,
  RestBindings,
} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import path from 'path';
import {v4 as uuidv4} from 'uuid';
import {authorize} from '../authorization';
import {
  Barcode,
  BarcodeStatus,
  Order,
  OrderItemEntity,
  OrderItemVariantSnapshot,
  ReturnRequest,
} from '../models';
import {
  BarcodeRepository,
  OrderItemRepository,
  OrderRepository,
  OrderStatusHistoryRepository,
  ReturnRequestRepository,
} from '../repositories';
import {BarcodeService} from '../services/barcode.service';
import {JWTService} from '../services/jwt-service';
import {LocalStorageService} from '../services/storage.service';

type UploadedFileMap = {
  barcodeImage?: Express.Multer.File[];
  productImages?: Express.Multer.File[];
};

type ParsedMultipartFields = {
  orderId?: string;
  reason?: string;
  comment?: string;
};

type LabelPayload = {
  orderItemId: string;
  orderNumber: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  barcode?: Barcode;
};

const buildVariantLabel = (
  variantSnapshot?: OrderItemVariantSnapshot,
): string => {
  if (!variantSnapshot) {
    return 'Standard';
  }

  const pieces = [
    variantSnapshot.colorName ?? variantSnapshot.color,
    variantSnapshot.size,
  ].filter(Boolean);

  return pieces.join(' / ') || 'Standard';
};

export class BarcodeController {
  constructor(
    @repository(BarcodeRepository)
    private barcodeRepository: BarcodeRepository,
    @repository(OrderItemRepository)
    private orderItemRepository: OrderItemRepository,
    @repository(OrderRepository)
    private orderRepository: OrderRepository,
    @repository(ReturnRequestRepository)
    private returnRequestRepository: ReturnRequestRepository,
    @repository(OrderStatusHistoryRepository)
    private orderStatusHistoryRepository: OrderStatusHistoryRepository,
    @inject('services.barcode')
    private barcodeService: BarcodeService,
    @inject('service.jwt.service')
    private jwtService: JWTService,
    @inject('services.storage')
    private storageService: LocalStorageService,
  ) {}

  private async requireAdminToken(token?: string) {
    if (!token) {
      throw new HttpErrors.Unauthorized('Authorization token is missing');
    }

    const userProfile = await this.jwtService.verifyToken(token);
    const roles = userProfile.roles ?? [];
    const isAdmin = roles.includes('admin') || roles.includes('super_admin');

    if (!isAdmin) {
      throw new HttpErrors.Forbidden('Admin privileges required');
    }

    return userProfile;
  }

  private async parseMultipartReturnRequest(
    request: Request,
    response: Response,
  ): Promise<{files: UploadedFileMap; fields: ParsedMultipartFields}> {
    const multer = require('multer');
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
        files: 7,
      },
    }).fields([
      {name: 'barcodeImage', maxCount: 1},
      {name: 'productImages', maxCount: 6},
    ]);

    return new Promise((resolve, reject) => {
      upload(request, response, (error: unknown) => {
        if (error) {
          reject(new HttpErrors.BadRequest(`Upload failed: ${String(error)}`));
          return;
        }

        resolve({
          files: (request.files ?? {}) as UploadedFileMap,
          fields: (request.body ?? {}) as ParsedMultipartFields,
        });
      });
    });
  }

  private async uploadEvidenceFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    const ext = path.extname(file.originalname ?? '').toLowerCase() || '.jpg';
    const filename = `${uuidv4()}${ext}`;
    const relativePath = await this.storageService.uploadFile(
      file.buffer,
      filename,
      folder,
    );

    return this.storageService.getFileUrl(relativePath);
  }

  private async getBarcodeContext(barcodeId: string) {
    const barcode = await this.barcodeRepository.findById(barcodeId);
    const orderItem = await this.orderItemRepository.findById(barcode.orderItemId, {
      include: [{relation: 'product'}, {relation: 'variant'}, {relation: 'barcode'}],
    });
    const order = await this.orderRepository.findById(orderItem.orderId, {
      include: [{relation: 'user'}],
    });

    return {barcode, orderItem, order};
    return {
      barcode,
      orderItem,
      order,
    };
  }

  private validateReturnEligibility(
    barcode: Barcode,
    orderItem: OrderItemEntity,
    order: Order,
    userId?: string,
    expectedOrderId?: string,
  ) {
    if (['RETURNED', 'REFUNDED'].includes(barcode.status)) {
      throw new HttpErrors.BadRequest(
        'This barcode has already been processed for return/refund',
      );
    }

    if (expectedOrderId && order.id !== expectedOrderId) {
      throw new HttpErrors.BadRequest(
        'Decoded barcode does not belong to the expected order. Fraud review required.',
      );
    }

    if (userId && order.userId !== userId) {
      throw new HttpErrors.Forbidden('You can only initiate returns for your own orders');
    }

    if (order.status !== 'delivered') {
      throw new HttpErrors.BadRequest('Only delivered items can be returned');
    }

    if (orderItem.barcodeId && orderItem.barcodeId !== barcode.id) {
      throw new HttpErrors.BadRequest('Barcode mismatch detected for order item');
    }
  }

  private async setBarcodeStatus(
    barcode: Barcode,
    status: BarcodeStatus,
    message: string,
    metadata?: object,
  ) {
    await this.barcodeService.updateBarcodeStatus(
      barcode,
      status,
      message,
      metadata,
    );
  }

  @post('/api/admin/barcodes/generate')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async generateMissingBarcodes(
    @requestBody()
    request: {orderItemIds: string[]},
  ) {
    const results = [];

    for (const orderItemId of request.orderItemIds || []) {
      const orderItem = await this.orderItemRepository.findById(orderItemId);
      const order = await this.orderRepository.findById(orderItem.orderId);
      const existing = await this.barcodeRepository.findByOrderItemId(orderItem.id);

      if (existing) {
        results.push(existing);
        continue;
      }

      const barcode = await this.barcodeService.createBarcodeForOrderItem(orderItem, order);
      await this.orderItemRepository.updateById(orderItem.id, {barcodeId: barcode.id});
      results.push(barcode);
    }

    return {
      success: true,
      count: results.length,
      barcodes: results,
    };
  }

  @get('/api/admin/barcodes/{barcodeId}')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async getBarcodeDetails(
    @param.path.string('barcodeId') barcodeId: string,
  ) {
    const {barcode, orderItem, order} = await this.getBarcodeContext(barcodeId);

    return {
      success: true,
      barcode,
      orderItem,
      order,
    };
  }

  @get('/api/admin/orders/{orderId}/labels')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async getOrderLabels(
    @param.path.string('orderId') orderId: string,
    @param.query.string('orderItemIds') orderItemIds?: string,
  ) {
    const filterIds = new Set(
      (orderItemIds ?? '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean),
    );
    const order = await this.orderRepository.findById(orderId);
    const orderItems = await this.orderItemRepository.find({
      where: {orderId},
      include: [{relation: 'barcode'}],
    });

    const labels: LabelPayload[] = orderItems
      .filter(item => !filterIds.size || filterIds.has(item.id))
      .map(item => {
        const barcode = (item as OrderItemEntity & {barcode?: Barcode}).barcode;

        return {
          orderItemId: item.id,
          orderNumber: order.orderNumber,
          productName: item.productNameSnapshot ?? item.name ?? '',
          variantLabel: buildVariantLabel(item.variantSnapshot),
          quantity: item.quantity,
          barcode,
        };
      })
      .filter((item): item is LabelPayload & {barcode: Barcode} =>
        Boolean(item.barcode),
      );

    return {
      success: true,
      labels,
    };
  }

  @get('/api/admin/orders/{orderId}/labels/print')
  async getPrintableLabelHtml(
    @param.path.string('orderId') orderId: string,
    @param.query.string('orderItemIds') orderItemIds?: string,
    @param.query.string('token') token?: string,
    @param.query.string('mode') mode?: string,
    @inject(RestBindings.Http.REQUEST) request?: Request,
  ): Promise<string> {
    let resolvedToken = token;
    if (!resolvedToken && request?.headers?.authorization) {
      const header = String(request.headers.authorization || '');
      resolvedToken = header.toLowerCase().startsWith('bearer ')
        ? header.slice(7)
        : header;
    }

    await this.requireAdminToken(resolvedToken);
    const payload = await this.getOrderLabels(orderId, orderItemIds);
    const printableLabels = payload.labels.map(label => ({
      barcodeCode: label.barcode!.code,
      barcodeImageUrl: label.barcode!.barcodeImageUrl,
      orderNumber: label.orderNumber,
      productName: label.productName,
      variantLabel: label.variantLabel,
      quantity: label.quantity,
    }));

    if (mode === 'barcode') {
      return this.barcodeService.buildBarcodeOnlyHtml(
        printableLabels.map(item => ({
          barcodeCode: item.barcodeCode,
          barcodeImageUrl: item.barcodeImageUrl,
        })),
      );
    }

    return this.barcodeService.buildPrintableLabelHtml(printableLabels);
  }

  @post('/api/returns/barcode/decode')
  @authenticate('jwt')
  @authorize({roles: ['user', 'admin', 'super_admin']})
  async decodeUploadedBarcode(
    @requestBody.file() request: Request,
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @param.query.string('expectedOrderId') expectedOrderId?: string,
  ) {
    const {files} = await this.parseMultipartReturnRequest(request, response);
    const barcodeImage = files.barcodeImage?.[0];

    if (!barcodeImage) {
      throw new HttpErrors.BadRequest('Barcode image is required');
    }

    const decoded = await this.barcodeService.decodeBarcodeFromImageBuffer(
      barcodeImage.buffer,
    );
    const barcode = await this.barcodeRepository.findByCode(decoded.code);

    if (!barcode) {
      throw new HttpErrors.NotFound('Decoded barcode was not found in the system');
    }

    const {orderItem, order} = await this.getBarcodeContext(barcode.id);
    this.validateReturnEligibility(
      barcode,
      orderItem,
      order,
      undefined,
      expectedOrderId,
    );

    return {
      success: true,
      decodedBarcode: decoded,
      barcode,
      order,
      orderItem,
      requestedBy: currentUser.id,
    };
  }

  @post('/api/returns/requests')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async createReturnRequest(
    @requestBody.file() request: Request,
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ) {
    const {files, fields} = await this.parseMultipartReturnRequest(request, response);
    const barcodeImage = files.barcodeImage?.[0];
    const productImages = files.productImages ?? [];

    if (!barcodeImage) {
      throw new HttpErrors.BadRequest('Barcode image is required');
    }

    if (!productImages.length) {
      throw new HttpErrors.BadRequest('At least one product image is required');
    }

    const decoded = await this.barcodeService.decodeBarcodeFromImageBuffer(
      barcodeImage.buffer,
    );
    const barcode = await this.barcodeRepository.findByCode(decoded.code);

    if (!barcode) {
      throw new HttpErrors.NotFound('Decoded barcode was not found in the system');
    }

    const {orderItem, order} = await this.getBarcodeContext(barcode.id);
    this.validateReturnEligibility(
      barcode,
      orderItem,
      order,
      currentUser.id,
      fields.orderId,
    );

    const existingRequest = await this.returnRequestRepository.findOne({
      where: {
        barcodeId: barcode.id,
        status: {inq: ['PENDING', 'APPROVED', 'REFUNDED']},
      },
    });

    if (existingRequest) {
      throw new HttpErrors.BadRequest('A return request already exists for this barcode');
    }

    const barcodeImageUrl = await this.uploadEvidenceFile(
      barcodeImage,
      'return-barcodes',
    );
    const productImageUrls = await Promise.all(
      productImages.map(file => this.uploadEvidenceFile(file, 'return-products')),
    );

    const returnRequest = await this.returnRequestRepository.create({
      barcodeId: barcode.id,
      orderItemId: orderItem.id,
      orderId: order.id,
      requesterId: currentUser.id,
      status: 'PENDING',
      decodedBarcodeCode: decoded.code,
      reason: String(fields.reason ?? '').trim(),
      comment: String(fields.comment ?? '').trim(),
      evidenceImages: {
        barcodeImageUrl,
        productImageUrls,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.setBarcodeStatus(
      barcode,
      'RETURN_REQUESTED',
      'Return requested using uploaded barcode image',
      {
        orderId: order.id,
        orderItemId: orderItem.id,
        returnRequestId: returnRequest.id,
      },
    );

    await this.orderStatusHistoryRepository.createStatusEntry(
      order.id,
      'return_requested',
      currentUser.id,
      `Item-level return requested for barcode ${barcode.code}`,
    );

    return {
      success: true,
      returnRequest,
      barcode,
      order,
      orderItem,
    };
  }

  @get('/api/admin/return-requests')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async listReturnRequests(
    @param.query.string('status') status?: string,
  ) {
    const where = status
      ? {status: status as ReturnRequest['status']}
      : undefined;
    const requests = await this.returnRequestRepository.find({
      where,
      order: ['createdAt DESC'],
      include: [
        {relation: 'requester'},
        {relation: 'barcode'},
        {relation: 'order'},
        {relation: 'orderItem'},
      ],
    });

    return {
      success: true,
      requests,
    };
  }

  @get('/api/admin/return-requests/{id}')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async getReturnRequestDetails(
    @param.path.string('id') id: string,
  ) {
    const request = await this.returnRequestRepository.findById(id, {
      include: [
        {relation: 'requester'},
        {relation: 'barcode'},
        {relation: 'order'},
        {relation: 'orderItem'},
      ],
    });

    return {
      success: true,
      request,
    };
  }

  @patch('/api/admin/return-requests/{id}')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async reviewReturnRequest(
    @param.path.string('id') id: string,
    @requestBody()
    body: {action: 'approve' | 'reject' | 'refund'; comment?: string},
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ) {
    const requestRecord = await this.returnRequestRepository.findById(id);

    if (!requestRecord) {
      throw new HttpErrors.NotFound('Return request not found');
    }

    const barcode = await this.barcodeRepository.findById(requestRecord.barcodeId);
    const orderItem = await this.orderItemRepository.findById(requestRecord.orderItemId);
    const order = await this.orderRepository.findById(requestRecord.orderId);

    if (!['approve', 'reject', 'refund'].includes(body.action)) {
      throw new HttpErrors.BadRequest('Invalid return action');
    }

    let nextRequestStatus: ReturnRequest['status'] = requestRecord.status;
    let nextBarcodeStatus: BarcodeStatus = barcode.status;
    let historyComment = body.comment ?? '';

    if (body.action === 'approve') {
      nextRequestStatus = 'APPROVED';
      nextBarcodeStatus = 'RETURNED';
      historyComment =
        historyComment || `Return approved for barcode ${barcode.code}`;
    }

    if (body.action === 'reject') {
      nextRequestStatus = 'REJECTED';
      nextBarcodeStatus = 'DELIVERED';
      historyComment =
        historyComment || `Return rejected for barcode ${barcode.code}`;
    }

    if (body.action === 'refund') {
      nextRequestStatus = 'REFUNDED';
      nextBarcodeStatus = 'REFUNDED';
      historyComment =
        historyComment || `Refund completed for barcode ${barcode.code}`;
    }

    await this.returnRequestRepository.updateById(requestRecord.id, {
      status: nextRequestStatus,
      adminDecision: historyComment,
      reviewedBy: currentUser.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    });

    await this.setBarcodeStatus(
      barcode,
      nextBarcodeStatus,
      historyComment,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
        returnRequestId: requestRecord.id,
      },
    );

    await this.orderStatusHistoryRepository.createStatusEntry(
      order.id,
      body.action === 'reject' ? 'delivered' : 'return_requested',
      currentUser.id,
      historyComment,
    );

    const updatedRequest = await this.returnRequestRepository.findById(id, {
      include: [
        {relation: 'requester'},
        {relation: 'barcode'},
        {relation: 'order'},
        {relation: 'orderItem'},
      ],
    });

    return {
      success: true,
      request: updatedRequest,
    };
  }

  @post('/api/admin/orders/{orderId}/barcodes/verify')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async verifyOrderBarcode(
    @param.path.string('orderId') orderId: string,
    @requestBody.file() request: Request,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ) {
    const {files} = await this.parseMultipartReturnRequest(request, response);
    const barcodeImage = files.barcodeImage?.[0];

    if (!barcodeImage) {
      throw new HttpErrors.BadRequest('Barcode image is required');
    }

    const decoded = await this.barcodeService.decodeBarcodeFromImageBuffer(
      barcodeImage.buffer,
    );
    const barcode = await this.barcodeRepository.findByCode(decoded.code);

    if (!barcode) {
      return {
        success: true,
        match: false,
        reason: 'barcode_not_found',
        decodedBarcode: decoded,
      };
    }

    const orderItem = await this.orderItemRepository.findById(barcode.orderItemId);

    if (!orderItem || orderItem.orderId !== orderId) {
      return {
        success: true,
        match: false,
        reason: 'order_mismatch',
        decodedBarcode: decoded,
        barcode,
      };
    }

    return {
      success: true,
      match: true,
      decodedBarcode: decoded,
      barcode,
      orderItem,
    };
  }

  @post('/api/admin/orders/{orderId}/barcodes/verify-code')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async verifyOrderBarcodeCode(
    @param.path.string('orderId') orderId: string,
    @requestBody()
    body: {code: string},
  ) {
    const code = String(body?.code ?? '').trim();

    if (!code) {
      throw new HttpErrors.BadRequest('Barcode code is required');
    }

    const barcode = await this.barcodeRepository.findByCode(code);

    if (!barcode) {
      return {
        success: true,
        match: false,
        reason: 'barcode_not_found',
        code,
      };
    }

    const orderItem = await this.orderItemRepository.findById(barcode.orderItemId);

    if (!orderItem || orderItem.orderId !== orderId) {
      return {
        success: true,
        match: false,
        reason: 'order_mismatch',
        code,
        barcode,
      };
    }

    return {
      success: true,
      match: true,
      code,
      barcode,
      orderItem,
    };
  }
}
