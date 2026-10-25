import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { store } from '../db/store.js';
import { config } from '../config.js';

// Parse command-line arguments (e.g., --email admin@bookleaf.com --password AdminPass123 --name "Ops Admin")
function parseArgs(): { email?: string; password?: string; name?: string } {
  const args = process.argv.slice(2);
  const result: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace(/^--/, '');
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
      result[key] = value;
      if (value !== 'true') i++;
    }
  }

  return result;
}

const adminInputSchema = z.object({
  email: z.string().trim().email('A valid administrator email address is required.'),
  password: z
    .string()
    .min(8, 'Administrator password must be at least 8 characters long.')
    .regex(/[A-Za-z]/, 'Administrator password must contain at least one letter.')
    .regex(/[0-9]/, 'Administrator password must contain at least one number.'),
  name: z.string().trim().min(2, 'Administrator display name must be at least 2 characters.').default('BookLeaf Administrator')
});

async function main() {
  console.log('========================================================');
  console.log('  BookLeaf Administrator Provisioning Utility           ');
  console.log('========================================================');

  const cliArgs = parseArgs();

  const email = (cliArgs.email || config.adminEmail || '').trim();
  const password = cliArgs.password || config.adminPassword || '';
  const name = (cliArgs.name || config.adminName || 'BookLeaf Administrator').trim();

  if (!email || !password) {
    console.error('\n[Error] Administrator credentials missing.');
    console.error('Please provide them via environment variables:');
    console.error('  ADMIN_EMAIL="admin@bookleaf.com"');
    console.error('  ADMIN_PASSWORD="YourStrongPassword123"');
    console.error('  ADMIN_NAME="Operations Admin"');
    console.error('\nOr pass them directly as CLI flags:');
    console.error('  npm run create-admin -- --email admin@bookleaf.com --password YourStrongPassword123 --name "Operations Admin"\n');
    process.exit(1);
  }

  const parseResult = adminInputSchema.safeParse({ email, password, name });
  if (!parseResult.success) {
    console.error('\n[Validation Error]');
    for (const err of parseResult.error.issues) {
      console.error(` - ${err.path.join('.')}: ${err.message}`);
    }
    process.exit(1);
  }

  const validated = parseResult.data;
  const normalizedEmail = validated.email.toLowerCase();

  // Check if admin already exists
  const existingUser = store.findUserByEmail(normalizedEmail);
  if (existingUser) {
    if (existingUser.role === 'admin') {
      console.log(`\n[Notice] An administrator account with email '${normalizedEmail}' already exists.`);
      console.log('Security policy: Refusing to overwrite or reset existing administrator.');
      console.log('Provisioning completed safely without duplicates.\n');
      process.exit(0);
    } else {
      console.error(`\n[Error] A non-admin user with email '${normalizedEmail}' already exists in the system.`);
      process.exit(1);
    }
  }

  // Hash password securely
  const passwordHash = await bcrypt.hash(validated.password, 12);

  try {
    const newAdmin = store.createAdminUser({
      name: validated.name,
      email: normalizedEmail,
      passwordHash
    });

    console.log('\n[Success] Administrator account provisioned successfully!');
    console.log(` - ID:    ${newAdmin.id}`);
    console.log(` - Name:  ${newAdmin.name}`);
    console.log(` - Email: ${newAdmin.email}`);
    console.log(` - Role:  ${newAdmin.role}`);
    console.log('\nYou can now log in at /admin/login using these credentials.\n');
  } catch (err: any) {
    console.error('\n[Error] Failed to create administrator:', err.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
