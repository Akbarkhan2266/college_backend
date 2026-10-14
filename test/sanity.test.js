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

// 7. Course Image and Large Payload Schema Test
console.log('Testing Course Image schema validation...');
const { createCourseSchema } = await import('../src/controller/course/course.controller.js');
const { uploadCourseImage } = await import('../src/middleware/upload.js');
assert.ok(uploadCourseImage, 'uploadCourseImage middleware should be defined');
// Test large base64 image string (simulate 2MB base64 string)
const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(2 * 1024 * 1024);
const parsedCourse = await createCourseSchema.parseAsync({
  name: 'Graphic Design',
  image: largeBase64,
  description: 'Design course with large thumbnail',
});
assert.strictEqual(parsedCourse.name, 'Graphic Design');
assert.strictEqual(parsedCourse.image, largeBase64);
console.log('✓ Course image validation passed for large payloads');

// 8. Public Routes verification
console.log('Testing Public route definitions...');
const publicRoutesModule = await import('../src/routes/public.routes.js');
const publicRouter = publicRoutesModule.default;
const expectedPublicRoutes = [
  { path: '/admissions', method: 'post' },
  { path: '/courses', method: 'get' },
  { path: '/courses/:idOrSlug', method: 'get' },
  { path: '/notices', method: 'get' },
  { path: '/notices/:id', method: 'get' },
];

const registeredPublicRoutes = [];
publicRouter.stack.forEach((layer) => {
  if (layer.route) {
    const methods = Object.keys(layer.route.methods).filter((m) => layer.route.methods[m]);
    methods.forEach((method) => {
      registeredPublicRoutes.push({
        path: layer.route.path,
        method: method.toLowerCase(),
      });
    });
  }
});

expectedPublicRoutes.forEach((expected) => {
  const found = registeredPublicRoutes.some(
    (r) => r.path === expected.path && r.method === expected.method
  );
  assert.ok(
    found,
    `Route ${expected.method.toUpperCase()} ${expected.path} should be registered in public routes`
  );
});
console.log(`✓ All ${expectedPublicRoutes.length} public showcase routes verified`);

// 9. JWT 7-Day Validity Test
console.log('Testing JWT 7-day expiration...');
const jwtModule = await import('jsonwebtoken');
const jwt = jwtModule.default;
const testSecret = process.env.JWT_SECRET || 'test_secret';
const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

const sampleToken = jwt.sign({ id: 'user_123', role: 'admin' }, testSecret, { expiresIn });
const decoded = jwt.decode(sampleToken);
const durationSeconds = decoded.exp - decoded.iat;
const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60; // 604800 seconds

assert.strictEqual(durationSeconds, SEVEN_DAYS_SECONDS, 'JWT token must be valid for exactly 7 days');
console.log('✓ JWT token duration is exactly 7 days (604,800 seconds)');

// 10. Admission Form Email Requirement and Approval Mailer Test
console.log('Testing Admission Form email requirement & approval mailer...');
const { submitAdmissionSchema } = await import('../src/controller/admission/admission.controller.js');
const { sendAdmissionApprovalEmail } = await import('../src/utils/mailer.js');

assert.strictEqual(typeof sendAdmissionApprovalEmail, 'function', 'sendAdmissionApprovalEmail should be a function');

// A. Should reject when email is missing
let emailMissingFailed = false;
try {
  await submitAdmissionSchema.parseAsync({
    name: 'Tariq',
    phone: '9876543210',
    courseId: '6acca5779a47c99d2b821d78',
  });
} catch (err) {
  emailMissingFailed = true;
}
assert.strictEqual(emailMissingFailed, true, 'Admission schema must require email');

// B. Should reject when email is empty string
let emptyEmailFailed = false;
try {
  await submitAdmissionSchema.parseAsync({
    name: 'Tariq',
    phone: '9876543210',
    email: '',
    courseId: '6acca5779a47c99d2b821d78',
  });
} catch (err) {
  emptyEmailFailed = true;
}
assert.strictEqual(emptyEmailFailed, true, 'Admission schema must reject empty email');

// C. Should pass when valid email is provided
const validAdmission = await submitAdmissionSchema.parseAsync({
  name: 'Tariq',
  phone: '9876543210',
  email: 'tariq@example.com',
  courseId: '6acca5779a47c99d2b821d78',
});
assert.strictEqual(validAdmission.email, 'tariq@example.com');
console.log('✓ Admission form strictly requires a valid email');

// 11. Vercel deployment & .gitignore tests
console.log('Testing Vercel deployment configuration & .gitignore...');
const fs = await import('fs');
assert.ok(fs.existsSync('vercel.json'), 'vercel.json must exist');
const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
assert.strictEqual(vercelConfig.version, 2, 'vercel.json should use version 2');
assert.ok(vercelConfig.rewrites && vercelConfig.rewrites.length > 0, 'vercel.json must have rewrites');
assert.strictEqual(vercelConfig.rewrites[0].destination, '/api/index.js');

assert.ok(fs.existsSync('api/index.js'), 'api/index.js must exist for Vercel');
const vercelHandler = await import('../api/index.js');
assert.strictEqual(typeof vercelHandler.default, 'function', 'api/index.js must export a default handler function');

assert.ok(fs.existsSync('.gitignore'), '.gitignore must exist');
const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
assert.ok(gitignoreContent.includes('node_modules/'), '.gitignore must ignore node_modules');
assert.ok(gitignoreContent.includes('.env'), '.gitignore must ignore .env');
console.log('✓ Vercel configuration & .gitignore passed');

// 12. Cloudinary configuration tests
console.log('Testing Cloudinary configuration & helpers...');
const { default: cloudinary, uploadBufferToCloudinary, uploadToCloudinary, deleteFromCloudinary } = await import('../src/config/cloudinary.js');
assert.ok(cloudinary, 'Cloudinary instance should be defined');
assert.strictEqual(typeof uploadBufferToCloudinary, 'function', 'uploadBufferToCloudinary should be a function');
assert.strictEqual(typeof uploadToCloudinary, 'function', 'uploadToCloudinary should be a function');
assert.strictEqual(typeof deleteFromCloudinary, 'function', 'deleteFromCloudinary should be a function');
assert.strictEqual(cloudinary.config().cloud_name, 'alrtljl6', 'Cloudinary cloud_name must match configured credentials');
console.log('✓ Cloudinary configuration and helper functions verified');

console.log('All sanity tests passed successfully! 🎉');
