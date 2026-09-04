import {expect} from '@loopback/testlab';
import {OrderAddress} from '../../../models/order.model';
import {InvoicePrintService} from '../../../services/invoice-print.service';

type AddressFormatter = {
  addressBlock(address?: OrderAddress): string;
};

describe('InvoicePrintService', () => {
  it('prints every saved customer address field', () => {
    const service = new InvoicePrintService();
    const html = (service as unknown as AddressFormatter).addressBlock({
      fullName: 'Test Customer',
      phone: '9999999999',
      address: 'Flat 12, Example Tower',
      addressLine1: 'Flat 12',
      addressLine2: 'Example Tower',
      landmark: 'Near Central Park',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      country: 'India',
    });

    expect(html).to.match(/<div>Flat 12<\/div>/);
    expect(html).to.match(/<div>Example Tower<\/div>/);
    expect(html).to.match(/<div>Landmark: Near Central Park<\/div>/);
    expect(html).to.match(/<div>Mumbai, Maharashtra<\/div>/);
    expect(html).to.match(/<div>400001<\/div>/);
    expect(html).to.match(/<div>India<\/div>/);
  });

  it('keeps older orders with only the combined address field working', () => {
    const service = new InvoicePrintService();
    const html = (service as unknown as AddressFormatter).addressBlock({
      fullName: 'Test Customer',
      phone: '9999999999',
      address: 'Flat 12, Example Tower',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      country: 'India',
    });

    expect(html).to.match(/<div>Flat 12, Example Tower<\/div>/);
  });
});
