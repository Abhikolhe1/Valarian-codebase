import {Client} from '@loopback/testlab';
import {securityId, UserProfile} from '@loopback/security';
import {v4 as uuidv4} from 'uuid';
import {ValiarianBackendApplication} from '../..';
import {UsersRepository} from '../../repositories';
import {JWTService} from '../../services/jwt-service';
import {setupApplication} from './test-helper';

describe('Delhivery admin API security (acceptance)', () => {
  let app: ValiarianBackendApplication;
  let client: Client;
  let viewerToken: string;
  let usersRepository: UsersRepository;
  let viewerId: string;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());
    usersRepository = await app.getRepository(UsersRepository);
    const jwtService = await app.get<JWTService>('service.jwt.service');
    viewerId = uuidv4();
    await usersRepository.create({
      id: viewerId,
      email: `delhivery-security-${viewerId}@example.com`,
      fullName: 'Delhivery Security Viewer',
      isActive: true,
      isDeleted: false,
    });
    const viewer: UserProfile = {
      [securityId]: viewerId,
      id: viewerId,
      email: 'viewer@example.com',
      roles: ['viewer'],
      permissions: [],
    };
    viewerToken = await jwtService.generateToken(viewer);
  });

  after(async () => {
    if (viewerId) await usersRepository.deleteById(viewerId);
    await app.stop();
  });

  it('rejects unauthenticated read and allocation operations', async () => {
    await client.get('/api/admin/delhivery/waybills').expect(401);
    await client
      .get('/api/admin/delhivery/ndr/UPL123')
      .expect(401);
    await client
      .get('/api/admin/delhivery/shipments/00000000-0000-0000-0000-000000000000/documents/EPOD')
      .expect(401);
  });

  it('rejects unauthenticated courier mutations before validating their bodies', async () => {
    const shipmentId = '00000000-0000-0000-0000-000000000000';
    await client
      .patch(`/api/admin/delhivery/shipments/${shipmentId}`)
      .send({weightGrams: 500})
      .expect(401);
    await client
      .post(`/api/admin/delhivery/shipments/${shipmentId}/ewaybill`)
      .send({invoiceNumber: 'INV-1', ewaybillNumber: '123456789012'})
      .expect(401);
    await client
      .post(`/api/admin/delhivery/shipments/${shipmentId}/ndr`)
      .send({action: 'RE-ATTEMPT'})
      .expect(401);
    await client
      .post('/api/admin/delhivery/shipping-cost')
      .send({
        originPincode: '422001',
        destinationPincode: '400001',
        weightGrams: 500,
        paymentType: 'Pre-paid',
      })
      .expect(401);
    await client
      .post('/api/admin/delhivery/warehouses')
      .send({})
      .expect(401);
    await client
      .post('/api/admin/delhivery/pickups')
      .send({})
      .expect(401);
  });

  it('rejects an authenticated non-admin before calling Delhivery', async () => {
    await client
      .get('/api/admin/delhivery/waybills')
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(403);
    await client
      .post('/api/admin/delhivery/warehouses')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({})
      .expect(403);
  });
});
