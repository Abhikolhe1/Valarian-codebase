import {CreateShipmentParams} from '../interfaces/shipping-provider.interface';

const ADDRESS_LINE_LENGTH = 45;
const ADDRESS_LINE_COUNT = 3;

/** Builds and splits the complete delivery address for Blue Dart's three lines. */
export function buildBlueDartConsigneeAddress(
  params: CreateShipmentParams,
): [string, string, string] {
  const streetParts = params.receiverAddressLine1
    ? [params.receiverAddressLine1, params.receiverAddressLine2]
    : [params.receiverAddress];
  const fullAddress = [
    ...streetParts,
    params.receiverLandmark,
    params.receiverCity,
    params.receiverState,
    params.receiverCountry,
  ]
    .map(part => part?.trim())
    .filter(Boolean)
    .join(', ');

  const lines = Array.from({length: ADDRESS_LINE_COUNT}, (_, index) =>
    fullAddress.slice(
      index * ADDRESS_LINE_LENGTH,
      (index + 1) * ADDRESS_LINE_LENGTH,
    ),
  );

  return [lines[0], lines[1], lines[2]];
}
