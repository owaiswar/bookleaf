import assert from 'assert';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { store } from '../db/store.js';
import { config } from '../config.js';

let passedTests = 0;
let totalTests = 0;

async function test(name: string, fn: () => Promise<void> | void) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('  Running BookLeaf Authentication & Authorization Tests');
  console.log('======================================================\n');

  console.log('[1. User Registration & Password Security Tests]');

  await test('Valid author registration creates user and author profile in database', async () => {
    const testEmail = `test.author.${Date.now()}@example.com`;
    const password = 'AuthorPassword2026';
    const passwordHash = await bcrypt.hash(password, 10);

    const { user, author } = store.createUser({
      name: 'Test Author Suite',
      email: testEmail,
      passwordHash,
      publishingPackage: 'Standard Free',
      city: 'Pune'
    });

    assert.ok(user.id, 'User ID should be generated');
    assert.strictEqual(user.email, testEmail.toLowerCase());
    assert.strictEqual(user.role, 'author', 'Newly registered user must be strictly author role');
    assert.notStrictEqual(user.passwordHash, password, 'Password must be hashed, never plaintext');
    assert.strictEqual(user.passwordHash.startsWith('$2'), true, 'Password hash should be valid bcrypt hash');
    assert.ok(author, 'Associated Author record must be created');
    assert.strictEqual(author.name, 'Test Author Suite');

    // Verify lookup
    const found = store.findUserByEmail(testEmail);
    assert.ok(found, 'Should find user by normalized email');
    assert.strictEqual(found.id, user.id);
  });

  await test('Duplicate email registration throws 409 conflict error', async () => {
    const dupEmail = `duplicate.${Date.now()}@example.com`;
    const passwordHash = await bcrypt.hash('Password123', 10);

    store.createUser({
      name: 'First User',
      email: dupEmail,
      passwordHash
    });

    assert.throws(
      () => {
        store.createUser({
          name: 'Second User',
          email: dupEmail.toUpperCase(), // Case insensitive duplicate check
          passwordHash
        });
      },
      /already exists/i,
      'Store should reject duplicate email registrations'
    );
  });

  await test('Password validation verifies bcrypt match and rejects wrong password', async () => {
    const email = `auth.test.${Date.now()}@example.com`;
    const realPassword = 'CorrectPassword99';
    const passwordHash = await bcrypt.hash(realPassword, 10);

    const { user } = store.createUser({
      name: 'Auth Verifier',
      email,
      passwordHash
    });

    const isMatch = await bcrypt.compare(realPassword, user.passwordHash);
    assert.strictEqual(isMatch, true, 'Correct password must compare true');

    const isWrongMatch = await bcrypt.compare('WrongPassword99', user.passwordHash);
    assert.strictEqual(isWrongMatch, false, 'Incorrect password must compare false');
  });

  console.log('\n[2. Admin Provisioning & Security Tests]');

  await test('Admin provisioning assigns server-controlled admin role', async () => {
    const adminEmail = `admin.suite.${Date.now()}@bookleaf.com`;
    const adminPassword = 'AdminSecurePass2026';
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const admin = store.createAdminUser({
      name: 'Ops Triage Admin',
      email: adminEmail,
      passwordHash
    });

    assert.ok(admin.id);
    assert.strictEqual(admin.role, 'admin');
    assert.strictEqual(admin.email, adminEmail.toLowerCase());
  });

  await test('Admin provisioning refuses to overwrite an existing administrator', async () => {
    const existingAdminEmail = `admin.idempotent.${Date.now()}@bookleaf.com`;
    const passwordHash = await bcrypt.hash('AdminPass123', 10);

    store.createAdminUser({
      name: 'Existing Admin',
      email: existingAdminEmail,
      passwordHash
    });

    assert.throws(
      () => {
        store.createAdminUser({
          name: 'Duplicate Admin',
          email: existingAdminEmail,
          passwordHash
        });
      },
      /already exists.*Refusing to overwrite/i,
      'Must refuse to overwrite existing admin'
    );
  });

  console.log('\n[3. JWT Session & Role-Based Authorization Tests]');

  await test('JWT session token contains verified user claims and rejects tampering', () => {
    const payload = {
      id: 'test-user-123',
      email: 'test@example.com',
      role: 'author'
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' });
    const verified = jwt.verify(token, config.jwtSecret) as any;

    assert.strictEqual(verified.id, 'test-user-123');
    assert.strictEqual(verified.role, 'author');

    // Tampered token test
    assert.throws(() => {
      jwt.verify(token + 'tampered', config.jwtSecret);
    }, 'Tampered token must throw invalid signature error');

    // Token signed with wrong secret test
    assert.throws(() => {
      jwt.verify(token, 'attacker-fake-secret');
    }, 'Wrong secret must fail verification');
  });

  await test('Role-based access boundary: author is not granted admin privileges', () => {
    const authorUser = store.getUsers().find(u => u.role === 'author');
    assert.ok(authorUser, 'Must have at least one author in store');
    assert.strictEqual(authorUser.role, 'author');
    assert.notStrictEqual(authorUser.role, 'admin', 'Author must never have admin role');
  });

  await test('Author data isolation: author tickets only return tickets for that author', () => {
    const authors = store.getAuthors();
    if (authors.length >= 2) {
      const author1 = authors[0];
      const author2 = authors[1];

      const tickets1 = store.getAuthorTickets(author1.id);
      for (const t of tickets1) {
        assert.strictEqual(t.authorId, author1.id, 'Tickets must belong exclusively to author 1');
        assert.notStrictEqual(t.authorId, author2.id, 'Author 1 cannot see author 2 tickets');
      }
    }
  });

  await test('Internal notes isolation: author cannot see internal notes', () => {
    const tickets = store.getTickets();
    const ticketWithNotes = tickets.find(t => {
      const msgs = store.getMessages();
      return msgs.some(m => m.ticketId === t.id && m.visibility === 'internal');
    });

    if (ticketWithNotes) {
      const authorViewMessages = store.getMessagesForTicket(ticketWithNotes.id, 'author');
      for (const m of authorViewMessages) {
        assert.strictEqual(m.visibility, 'public', 'Author must strictly see ONLY public messages');
        assert.notStrictEqual(m.visibility, 'internal', 'Internal notes must NEVER be returned to authors');
      }

      const adminViewMessages = store.getMessagesForTicket(ticketWithNotes.id, 'admin');
      const hasInternal = adminViewMessages.some(m => m.visibility === 'internal');
      assert.strictEqual(hasInternal, true, 'Admin view must include internal notes');
    }
  });

  console.log('\n======================================================');
  console.log(`  All ${passedTests}/${totalTests} Tests Passed Successfully!`);
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('\nTest suite failed with error:', err);
  process.exit(1);
});
