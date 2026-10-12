import assert from 'assert';
import app from '../src/app.js';
import { generatePassword } from '../src/utils/generatePassword.js';
import { normalizeStudentId } from '../src/utils/generateStudentId.js';
import { toSlug } from '../src/utils/slugify.js';
import { TIME_RE } from '../src/models.js';

console.log('--- Running College Backend Sanity Tests ---');

// 1. Password generator test
console.log('Testing generatePassword...');
const pwd1 = generatePassword(8);
const pwd2 = generatePassword(8);
assert.strictEqual(pwd1.length, 8, 'Password must be 8 characters long');
assert.strictEqual(pwd2.length, 8, 'Password must be 8 characters long');
assert.notStrictEqual(pwd1, pwd2, 'Generated passwords should be random');
console.log('✓ Password generator passed:', pwd1);

// 2. Student ID normalizer test
console.log('Testing normalizeStudentId...');
assert.strictEqual(normalizeStudentId('1'), '001');
assert.strictEqual(normalizeStudentId('42'), '042');
assert.strictEqual(normalizeStudentId('100'), '100');
assert.strictEqual(normalizeStudentId('alz-2026-001'), 'ALZ-2026-001');
console.log('✓ Student ID normalizer passed');

// 3. Slug generator test
console.log('Testing toSlug...');
assert.strictEqual(toSlug('Tajweed Basics'), 'tajweed-basics');
assert.strictEqual(toSlug('Advanced Fiqh & Arabic 101!'), 'advanced-fiqh-arabic-101');
console.log('✓ Slug generator passed');

// 4. TIME_RE regex test
console.log('Testing TIME_RE...');
assert.strictEqual(TIME_RE.test('16:30'), true);
assert.strictEqual(TIME_RE.test('09:00'), true);
assert.strictEqual(TIME_RE.test('24:00'), false);
assert.strictEqual(TIME_RE.test('9:00'), false);
console.log('✓ TIME_RE passed');

// 5. Express App routes test
console.log('Testing Express app routing stack...');
assert.ok(app._router, 'Express app router should exist');
const registeredRoutes = [];
app._router.stack.forEach((layer) => {
  if (layer.route) {
    registeredRoutes.push(layer.route.path);
  } else if (layer.name === 'router' && layer.regexp) {
    registeredRoutes.push(layer.regexp.toString());
  }
});
assert.ok(registeredRoutes.length > 0, 'Routes must be registered in Express app');
console.log(`✓ Express app initialized with ${registeredRoutes.length} route layers`);

// 6. Mailer transporter test
console.log('Testing mailer configuration...');
const { getTransporter } = await import('../src/utils/mailer.js');
const transporter = getTransporter();
assert.ok(transporter, 'Mailer transporter should be defined');
assert.strictEqual(typeof transporter.sendMail, 'function', 'Transporter should have sendMail method');
console.log('✓ Mailer transporter initialized successfully');

console.log('All sanity tests passed successfully! 🎉');
