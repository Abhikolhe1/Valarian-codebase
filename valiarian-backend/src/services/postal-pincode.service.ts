import {BindingScope, injectable} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';
import axios from 'axios';

const UNAVAILABLE = 'We could not verify this PIN code with the postal directory. Please try again shortly.';

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

/** Unknown/malformed provider responses are outages, not proof of an invalid PIN. */
export function parsePostalPincodeResponse(data: unknown, pincode: string): boolean {
  const envelope = record(Array.isArray(data) && data.length === 1 ? data[0] : data);
  if (!envelope) throw new Error('Unexpected postal response');
  const status = String(envelope.Status ?? '').toLowerCase();
  const offices = envelope.PostOffice;
  if (status === 'success' && Array.isArray(offices) && offices.some(value => {
    const office = record(value);
    return office && String(office.Country ?? '').trim().toLowerCase() === 'india' &&
      String(office.Pincode ?? office.PINCode ?? '').trim() === pincode;
  })) return true;
  if (status === 'error' && /^no records found\.?$/i.test(String(envelope.Message ?? '').trim()) &&
    (offices === null || (Array.isArray(offices) && offices.length === 0))) return false;
  throw new Error('Unconfirmed postal response');
}

/** Public third-party directory sourced from India Post, not an official API.
 * Sends only a PIN code, never the customer's name, phone or street address.
 */
@injectable({scope: BindingScope.SINGLETON})
export class PostalPincodeService {
  private readonly cache = new Map<string, {exists: boolean; expiresAt: number}>();
  private readonly pending = new Map<string, Promise<boolean>>();
  private unavailableUntil = 0;

  async assertExists(value: string): Promise<void> {
    const pincode = String(value ?? '').trim();
    if (!/^[1-9]\d{5}$/.test(pincode)) {
      throw new HttpErrors.UnprocessableEntity('Please enter a valid 6-digit Indian PIN code.');
    }
    const cached = this.cache.get(pincode);
    let exists: boolean;
    if (cached && cached.expiresAt > Date.now()) {
      exists = cached.exists;
    } else {
      const active = this.pending.get(pincode);
      if (active) {
        exists = await active;
      } else {
        if (Date.now() < this.unavailableUntil || this.pending.size >= 20) {
          throw new HttpErrors.ServiceUnavailable(UNAVAILABLE);
        }
        const lookup = this.lookup(pincode).finally(() => this.pending.delete(pincode));
        this.pending.set(pincode, lookup);
        exists = await lookup;
      }
    }
    if (!exists) {
      throw new HttpErrors.UnprocessableEntity(`PIN code ${pincode} was not found in the Indian postal directory. Please check your delivery address.`);
    }
  }

  private async lookup(pincode: string): Promise<boolean> {
    try {
      const config = {
        timeout: 4000, maxRedirects: 0, maxContentLength: 1024 * 1024,
      };
      const response = await axios.get<unknown>(`https://api.postalpincode.in/pincode/${pincode}`, config);
      const exists = parsePostalPincodeResponse(response.data, pincode);
      if (this.cache.size >= 1000) {
        const oldest = this.cache.keys().next().value;
        if (oldest !== undefined) this.cache.delete(oldest);
      }
      this.cache.set(pincode, {exists, expiresAt: Date.now() + (exists ? 24 * 60 : 15) * 60 * 1000});
      return exists;
    } catch {
      this.unavailableUntil = Date.now() + 10000;
      throw new HttpErrors.ServiceUnavailable(UNAVAILABLE);
    }
  }
}
