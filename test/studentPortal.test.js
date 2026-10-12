import assert from 'assert';
import app from '../src/app.js';
import {
  getTodayIST,
  timeToMinutes,
  isSlotJoinable,
  isBatchJoinable,
  getNextClass,
} from '../src/utils/istTime.js';
import { requirePasswordChange } from '../src/middleware/requirePasswordChange.js';
import studentPortalRoutes from '../src/routes/studentPortal.routes.js';

console.log('--- Running Student Portal Backend Tests ---');

// 1. Test getTodayIST
console.log('Testing getTodayIST()...');
const istNow = getTodayIST();
assert.ok(
  typeof istNow.dayOfWeek === 'number' && istNow.dayOfWeek >= 0 && istNow.dayOfWeek <= 6,
  'dayOfWeek must be between 0 and 6'
);
assert.ok(
  typeof istNow.minutesNow === 'number' && istNow.minutesNow >= 0 && istNow.minutesNow <= 1439,
  'minutesNow must be between 0 and 1439'
);

// Specific date test for IST
// 2026-10-12T00:15:00.000Z in UTC is 05:45 AM Monday in IST (UTC + 5:30)
const fixedDate = new Date('2026-10-12T00:15:00.000Z');
const istCalculated = getTodayIST(fixedDate);
assert.strictEqual(istCalculated.dayOfWeek, 1, 'Monday should have dayOfWeek 1');
assert.strictEqual(istCalculated.minutesNow, 5 * 60 + 45, '05:45 AM should be 345 minutes');
console.log('✓ getTodayIST() passed');

// 2. Test timeToMinutes
console.log('Testing timeToMinutes()...');
assert.strictEqual(timeToMinutes('00:00'), 0);
assert.strictEqual(timeToMinutes('09:30'), 570);
assert.strictEqual(timeToMinutes('16:45'), 1005);
assert.strictEqual(timeToMinutes('23:59'), 1439);
assert.strictEqual(timeToMinutes(''), 0);
console.log('✓ timeToMinutes() passed');

// 3. Test isSlotJoinable
console.log('Testing isSlotJoinable()...');
const slot = { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' };
const startMin = 10 * 60; // 600
const endMin = 11 * 60;   // 660

// 11 minutes before (09:49 = 589) -> false
assert.strictEqual(isSlotJoinable(slot, 1, 589), false, 'Should not join 11 mins before');
// 10 minutes before (09:50 = 590) -> true
assert.strictEqual(isSlotJoinable(slot, 1, 590), true, 'Should join 10 mins before');
// During class (10:30 = 630) -> true
assert.strictEqual(isSlotJoinable(slot, 1, 630), true, 'Should join during class');
// At end time (11:00 = 660) -> true
assert.strictEqual(isSlotJoinable(slot, 1, 660), true, 'Should join at end time');
// 1 minute after end (11:01 = 661) -> false
assert.strictEqual(isSlotJoinable(slot, 1, 661), false, 'Should not join after end time');
// Different day of week (e.g. Tuesday = 2) -> false
assert.strictEqual(isSlotJoinable(slot, 2, 600), false, 'Should not join on different day');
console.log('✓ isSlotJoinable() passed');

// 4. Test isBatchJoinable
console.log('Testing isBatchJoinable()...');
const batchSchedule = [
  { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
  { dayOfWeek: 3, startTime: '14:00', endTime: '15:00' },
];
assert.strictEqual(isBatchJoinable(batchSchedule, 1, 535), true, 'Joinable within slot 1 window (08:55)');
assert.strictEqual(isBatchJoinable(batchSchedule, 1, 700), false, 'Not joinable outside slot 1 window');
assert.strictEqual(isBatchJoinable(batchSchedule, 3, 14 * 60 + 10), true, 'Joinable within slot 2 window');
assert.strictEqual(isBatchJoinable([], 1, 540), false, 'Empty schedule returns false');
console.log('✓ isBatchJoinable() passed');

// 5. Test getNextClass
console.log('Testing getNextClass()...');
const multiSchedule = [
  { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }, // Mon morning
  { dayOfWeek: 1, startTime: '16:00', endTime: '17:00' }, // Mon afternoon
  { dayOfWeek: 3, startTime: '11:00', endTime: '12:00' }, // Wed morning
];

// Mon at 08:00 (before first slot) -> returns Mon 09:00
const next1 = getNextClass(multiSchedule, 1, 8 * 60);
assert.strictEqual(next1.startTime, '09:00');

// Mon at 10:30 (between slot 1 and slot 2) -> returns Mon 16:00
const next2 = getNextClass(multiSchedule, 1, 10 * 60 + 30);
assert.strictEqual(next2.startTime, '16:00');

// Mon at 17:01 (after all Mon slots) -> returns Wed 11:00
const next3 = getNextClass(multiSchedule, 1, 17 * 60 + 1);
assert.strictEqual(next3.dayOfWeek, 3);
assert.strictEqual(next3.startTime, '11:00');

// Wed at 15:00 -> wraps across weekend to Mon 09:00
const next4 = getNextClass(multiSchedule, 3, 15 * 60);
assert.strictEqual(next4.dayOfWeek, 1);
assert.strictEqual(next4.startTime, '09:00');

// Empty or null schedule
assert.strictEqual(getNextClass([], 1, 500), null);
assert.strictEqual(getNextClass(null, 1, 500), null);
console.log('✓ getNextClass() passed');

// 6. Test requirePasswordChange middleware
console.log('Testing requirePasswordChange middleware...');
let passedNext = false;
let blockedStatus = null;
let blockedJson = null;

// Case A: mustChangePassword is true
const mockReqBlocked = { user: { mustChangePassword: true } };
const mockResBlocked = {
  status: (code) => {
    blockedStatus = code;
    return {
      json: (data) => {
        blockedJson = data;
      },
    };
  },
};
requirePasswordChange(mockReqBlocked, mockResBlocked, () => {
  passedNext = true;
});
assert.strictEqual(blockedStatus, 403, 'Must return 403 Forbidden');
assert.strictEqual(blockedJson.success, false);
assert.strictEqual(passedNext, false, 'Should not call next() when password change required');

// Case B: mustChangePassword is false
const mockReqAllowed = { user: { mustChangePassword: false } };
let allowedNext = false;
requirePasswordChange(mockReqAllowed, {}, () => {
  allowedNext = true;
});
assert.strictEqual(allowedNext, true, 'Should proceed to next() when mustChangePassword is false');
console.log('✓ requirePasswordChange middleware passed');

// 7. Verify all student portal routes exist in studentPortalRoutes
console.log('Testing Student Portal route definitions...');
const expectedRoutes = [
  { path: '/login', method: 'post' },
  { path: '/logout', method: 'post' },
  { path: '/password', method: 'patch' },
  { path: '/me', method: 'get' },
  { path: '/dashboard', method: 'get' },
  { path: '/courses', method: 'get' },
  { path: '/batches', method: 'get' },
  { path: '/notices', method: 'get' },
  { path: '/notices/:id', method: 'get' },
  { path: '/profile', method: 'get' },
];

const registeredStudentRoutes = [];
studentPortalRoutes.stack.forEach((layer) => {
  if (layer.route) {
    const methods = Object.keys(layer.route.methods).filter((m) => layer.route.methods[m]);
    methods.forEach((method) => {
      registeredStudentRoutes.push({
        path: layer.route.path,
        method: method.toLowerCase(),
      });
    });
  }
});

expectedRoutes.forEach((expected) => {
  const found = registeredStudentRoutes.some(
    (r) => r.path === expected.path && r.method === expected.method
  );
  assert.ok(
    found,
    `Route ${expected.method.toUpperCase()} ${expected.path} should be registered in studentPortalRoutes`
  );
});
console.log(`✓ All ${expectedRoutes.length} student portal routes verified`);

// 8. Verify Express app has mounted /api/student
console.log('Testing /api/student mounting on Express app...');
const hasStudentRouteMount = app._router.stack.some(
  (layer) => layer.regexp && layer.regexp.test('/api/student')
);
assert.ok(hasStudentRouteMount, 'Express app router must mount /api/student');
console.log('✓ /api/student route layer mounted on Express app');

console.log('\nAll Student Portal backend tests completed successfully! 🚀');
