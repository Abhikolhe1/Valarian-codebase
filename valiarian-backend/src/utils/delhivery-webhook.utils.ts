import {timingSafeEqual} from 'crypto';
import {InternalShipmentStatus} from '../interfaces/shipping-provider.interface';
import {mapDelhiveryStatus} from '../services/shipping-providers/delhivery.provider';

type JsonRecord = Record<string, unknown>;

export interface DelhiveryScanPush {
  awbNumber: string;
  status: string;
  statusType: string;
  statusCode: string;
  instructions?: string;
  location?: string;
  timestamp: Date;
  internalStatus: InternalShipmentStatus;
  rawPayload: JsonRecord;
}

const asRecord = (value: unknown): JsonRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {};

const text = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';

export function verifyDelhiveryWebhookAuthorization(
  authorization: string | undefined,
  secret: string | undefined,
): boolean {
  if (!secret || secret.length < 32 || !authorization) return false;
  const prefix = 'Bearer ';
  if (!authorization.startsWith(prefix)) return false;
  const supplied = Buffer.from(authorization.slice(prefix.length), 'utf8');
  const expected = Buffer.from(secret, 'utf8');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function parseDelhiveryScanPush(payload: unknown): DelhiveryScanPush {
  const body = asRecord(payload);
  const shipment = asRecord(body.Shipment ?? body.shipment);
  const statusRecord = asRecord(shipment.Status ?? shipment.status);
  const awbNumber = text(shipment.AWB ?? shipment.awb ?? shipment.Waybill);
  const status = text(statusRecord.Status ?? statusRecord.status);
  const statusType = text(
    statusRecord.StatusType ?? statusRecord.status_type ?? statusRecord.type,
  );
  const statusCode = text(
    statusRecord.StatusCode ?? statusRecord.status_code ??
      shipment.NSLCode ?? shipment.nsl_code,
  );
  const timestampText = text(
    statusRecord.StatusDateTime ?? statusRecord.status_datetime ??
      statusRecord.timestamp,
  );
  const timestamp = new Date(timestampText);

  if (!/^\d{8,20}$/.test(awbNumber)) {
    throw new Error('Delhivery Scan Push payload has an invalid AWB.');
  }
  if (!status) {
    throw new Error('Delhivery Scan Push payload is missing its status.');
  }
  if (!timestampText || Number.isNaN(timestamp.getTime())) {
    throw new Error('Delhivery Scan Push payload has an invalid status timestamp.');
  }

  return {
    awbNumber,
    status,
    statusType,
    statusCode,
    instructions: text(
      statusRecord.Instructions ?? statusRecord.instructions,
    ) || undefined,
    location: text(
      statusRecord.StatusLocation ?? statusRecord.status_location,
    ) || undefined,
    timestamp,
    internalStatus: mapDelhiveryStatus(
      status,
      statusType,
      statusCode,
      text(statusRecord.Instructions ?? statusRecord.instructions),
    ),
    rawPayload: body,
  };
}
