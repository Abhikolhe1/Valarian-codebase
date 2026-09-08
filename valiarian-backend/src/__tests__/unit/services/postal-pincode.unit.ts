import {strict as assert} from 'assert';
import {sinon} from '@loopback/testlab';
import axios from 'axios';
import {parsePostalPincodeResponse, PostalPincodeService} from '../../../services/postal-pincode.service';

const valid = [{Status: 'Success', PostOffice: [{Country: 'India', Pincode: '400001', DeliveryStatus: 'Non-Delivery'}]}];
const missing = [{Status: 'Error', Message: 'No records found', PostOffice: null}];
const httpResponse = (data: unknown) => ({data, status: 200, statusText: 'OK', headers: {}, config: {url: 'https://api.postalpincode.in/pincode/400001'}});

describe('Postal PIN directory validation', () => {
  afterEach(() => sinon.restore());

  it('accepts a matching Indian postal record (not a courier coverage promise)', () => {
    assert.equal(parsePostalPincodeResponse(valid, '400001'), true);
    assert.equal(parsePostalPincodeResponse(valid[0], '400001'), true);
  });
  it('recognizes the explicit no-records response', () => {
    assert.equal(parsePostalPincodeResponse(missing, '678956'), false);
  });
  for (const data of [null, [], {}, '<html>Error</html>', [{Status: 'Success', PostOffice: []}],
    [{Status: 'Error', Message: 'Service down', PostOffice: null}],
    [{Status: 'Success', PostOffice: [{Country: 'India', Pincode: '400002'}]}],
    [{Status: 'Success', PostOffice: [{Country: 'Singapore', Pincode: '400001'}]}]]) {
    it(`does not treat ambiguous data as valid or nonexistent: ${JSON.stringify(data)}`, () => {
      assert.throws(() => parsePostalPincodeResponse(data, '400001'));
    });
  }
  it('rejects malformed inputs without network access', async () => {
    const http = sinon.stub(axios, 'get').rejects(new Error('Must not call'));
    const service = new PostalPincodeService();
    for (const pin of ['000000', '012345', '12345', '1234567', '../400001']) {
      await assert.rejects(() => service.assertExists(pin), {statusCode: 422});
    }
    assert.equal(http.callCount, 0);
  });
  it('caches confirmed existing PINs for 24 hours with bounded HTTP requests', async () => {
    const clock = sinon.useFakeTimers();
    const http = sinon.stub(axios, 'get').resolves(httpResponse(valid));
    const service = new PostalPincodeService();
    await service.assertExists('400001');
    await service.assertExists(' 400001 ');
    assert.equal(http.callCount, 1);
    assert.equal(http.firstCall.args[0], 'https://api.postalpincode.in/pincode/400001');
    assert.equal(http.firstCall.args[1]?.timeout, 4000);
    assert.deepEqual(http.firstCall.args[1], {timeout: 4000, maxRedirects: 0, maxContentLength: 1024 * 1024});
    clock.tick(24 * 60 * 60 * 1000 + 1);
    await service.assertExists('400001');
    assert.equal(http.callCount, 2);
  });
  it('rejects unlisted PINs and expires the negative cache after 15 minutes', async () => {
    const clock = sinon.useFakeTimers();
    const http = sinon.stub(axios, 'get').resolves(httpResponse(missing));
    const service = new PostalPincodeService();
    await assert.rejects(() => service.assertExists('678956'), {statusCode: 422});
    await assert.rejects(() => service.assertExists('678956'), /not found/);
    assert.equal(http.callCount, 1);
    clock.tick(15 * 60 * 1000 + 1);
    await assert.rejects(() => service.assertExists('678956'), {statusCode: 422});
    assert.equal(http.callCount, 2);
  });
  it('reports outages as 503, never caches them as invalid, and allows recovery', async () => {
    const clock = sinon.useFakeTimers();
    const http = sinon.stub(axios, 'get').rejects(new Error('Timeout with private upstream details'));
    const service = new PostalPincodeService();
    await assert.rejects(() => service.assertExists('400001'), {statusCode: 503});
    await assert.rejects(() => service.assertExists('400001'), /Please try again/);
    assert.equal(http.callCount, 1);
    clock.tick(10001);
    http.resolves(httpResponse(valid));
    await service.assertExists('400001');
    assert.equal(http.callCount, 2);
  });
  it('coalesces concurrent requests for the same PIN', async () => {
    const http = sinon.stub(axios, 'get').resolves(httpResponse(valid));
    const service = new PostalPincodeService();
    await Promise.all([service.assertExists('400001'), service.assertExists('400001')]);
    assert.equal(http.callCount, 1);
  });
});
