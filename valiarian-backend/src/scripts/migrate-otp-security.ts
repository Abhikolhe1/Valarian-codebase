import {ValiarianBackendApplication} from '../application';
import {ValiarianDataSource} from '../datasources';

function canonicalIndianPhone(value: string): string | null {
  const digits = String(value ?? '').replace(/\D/g, '');
  const national = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(national) ? `+91${national}` : null;
}

async function run() {
  const app = new ValiarianBackendApplication();
  await app.boot();
  const db = await app.get<ValiarianDataSource>('datasources.valiarian');
  const users: Array<{id: string; phone: string}> = await db.execute(
    'SELECT id, phone FROM public.users WHERE phone IS NOT NULL AND phone <> \'\'',
  );
  const owners = new Map<string, string[]>();
  for (const user of users) {
    const canonical = canonicalIndianPhone(user.phone);
    if (!canonical) continue;
    owners.set(canonical, [...(owners.get(canonical) ?? []), user.id]);
  }
  const duplicates = [...owners.entries()].filter(([, ids]) => ids.length > 1);
  if (duplicates.length) {
    throw new Error(`Phone normalization stopped: duplicate canonical numbers found for user IDs: ${duplicates.map(([phone, ids]) => `${phone}=[${ids.join(',')}]`).join('; ')}`);
  }

  const transaction = await db.beginTransaction({isolationLevel: 'READ COMMITTED'});
  try {
    for (const user of users) {
      const canonical = canonicalIndianPhone(user.phone);
      if (canonical && canonical !== user.phone) {
        await db.execute('UPDATE public.users SET phone = $1, "updatedAt" = NOW() WHERE id = $2', [canonical, user.id], {transaction});
      }
    }
    await db.execute('DROP TABLE IF EXISTS public.otp', [], {transaction});
    await db.execute(`
      CREATE TABLE public.otp (
        id uuid PRIMARY KEY,
        "userId" uuid NULL,
        type integer NOT NULL,
        "identifierType" varchar(16) NOT NULL,
        purpose varchar(40) NOT NULL,
        identifier varchar(255) NOT NULL,
        attempts integer NOT NULL DEFAULT 0,
        "expiresAt" timestamptz NOT NULL,
        otp varchar(255) NOT NULL,
        "isUsed" boolean NOT NULL DEFAULT false,
        "consumedAt" timestamptz NULL,
        "providerMessageId" varchar(255) NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "isDeleted" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT NOW(),
        "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
        "deletedAt" timestamptz NULL
      )
    `, [], {transaction});
    await db.execute('CREATE INDEX otp_identifier_purpose_unused_idx ON public.otp (identifier, purpose, "isUsed", "createdAt" DESC)', [], {transaction});
    await db.execute('CREATE INDEX otp_expiry_idx ON public.otp ("expiresAt")', [], {transaction});
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
  await app.stop();
  console.log('OTP security migration completed');
}

run().catch(error => {
  console.error('OTP security migration failed:', error.message);
  process.exit(1);
});
