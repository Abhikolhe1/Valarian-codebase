import {strict as assert} from 'assert';
import {
  delhiveryPickupDate,
  earliestDelhiveryPickupDate,
} from '../../../utils/delhivery-pickup-schedule.utils';

describe('Delhivery pickup schedule', () => {
  it('allows today before 2 PM IST', () => {
    assert.equal(
      earliestDelhiveryPickupDate(new Date('2026-09-26T08:29:59.000Z')),
      '2026-09-26',
    );
  });

  it('uses tomorrow at and after 2 PM IST', () => {
    assert.equal(
      earliestDelhiveryPickupDate(new Date('2026-09-26T08:30:00.000Z')),
      '2026-09-27',
    );
  });

  it('rolls over month and year boundaries', () => {
    assert.equal(
      earliestDelhiveryPickupDate(new Date('2026-12-31T12:00:00.000Z')),
      '2027-01-01',
    );
  });

  it('preserves the requested calendar date for the provider payload', () => {
    assert.equal(
      delhiveryPickupDate('2026-09-27').toISOString().slice(0, 10),
      '2026-09-27',
    );
  });
});
