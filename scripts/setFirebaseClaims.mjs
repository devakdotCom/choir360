import 'dotenv/config';
import { config } from 'dotenv';
import { getAdminAuth } from './firebaseAdmin.mjs';

config({ path: '.env.local', override: false });

const [email, role = 'choir_admin', tenantId = 'global', parishId = 'st-thomas-cathedral', choirId = 'st-thomas-cathedral-choir'] = process.argv.slice(2);

if (!email) {
  console.error('Usage: npm run firebase:set-claims -- user@example.com choir_admin global st-thomas-cathedral st-thomas-cathedral-choir');
  process.exit(1);
}

const auth = getAdminAuth();
const user = await auth.getUserByEmail(email);

await auth.setCustomUserClaims(user.uid, {
  role,
  tenantId,
  parishId,
  choirId,
});

console.log(`Claims set for ${email}:`, { role, tenantId, parishId, choirId });
