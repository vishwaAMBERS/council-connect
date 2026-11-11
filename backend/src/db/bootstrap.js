// First-time setup of a real (non-demo) database.
//
//   npm run bootstrap
//
// Creates the institution, its academic units and councils if they do not exist yet, then prints a
// one-time admin invite code. The first administrator registers with that code in the web app and
// issues every other invite code from the Admin dashboard. No demo accounts are created.
//
// The institution can be changed with INSTITUTION_NAME, INSTITUTION_CODE and INSTITUTION_EMAIL_DOMAIN.
import crypto from 'node:crypto';
import { query, closeDb, dbKind } from './index.js';
import { migrate } from './migrate.js';
import { UNITS } from './seed.js';

const one = async (text, params) => (await query(text, params)).rows[0];

async function bootstrap() {
  await migrate();

  const name = process.env.INSTITUTION_NAME || 'Government College of Engineering Aurangabad';
  const code = process.env.INSTITUTION_CODE || 'GECA';
  const domain = process.env.INSTITUTION_EMAIL_DOMAIN || 'geca.ac.in';

  let institution = await one('SELECT id FROM institutions WHERE code = $1', [code]);
  if (!institution) {
    institution = await one('INSERT INTO institutions (name, code, email_domain) VALUES ($1, $2, $3) RETURNING id', [name, code, domain]);
    await query(`INSERT INTO councils (institution_id, name, type) VALUES ($1, 'Main Student Council', 'main')`, [institution.id]);
    for (const [unitCode, unitName, type] of UNITS) {
      const unit = await one('INSERT INTO academic_units (institution_id, name, code, type) VALUES ($1, $2, $3, $4) RETURNING id', [institution.id, unitName, unitCode, type]);
      await query(`INSERT INTO councils (institution_id, academic_unit_id, name, type) VALUES ($1, $2, $3, 'departmental')`, [institution.id, unit.id, `${unitCode} Departmental Council`]);
    }
    console.log(`created ${name} (${code}) with ${UNITS.length} academic units and ${UNITS.length + 1} councils`);
  } else {
    console.log(`${code} already exists, structure left untouched`);
  }

  const inviteCode = `ADMIN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  await query(`INSERT INTO invite_codes (code, role, expires_at) VALUES ($1, 'admin', now() + interval '7 days')`, [inviteCode]);

  console.log('');
  console.log(`Database: ${await dbKind()}`);
  console.log(`Admin invite code (valid 7 days, works once): ${inviteCode}`);
  console.log(`Register in the web app with an @${domain} email and this code to create the first administrator.`);
}

bootstrap()
  .then(closeDb)
  .catch(async (error) => {
    console.error(error.message);
    await closeDb().catch(() => {});
    process.exit(1);
  });
