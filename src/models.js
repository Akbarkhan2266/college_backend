import mongoose from 'mongoose';

const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/; // "16:30"

/* ---------------- User (login / identity) ---------------- */
const UserSchema = new Schema({
  role:     { type: String, enum: ['admin', 'student'], required: true },
  name:     { type: String, required: true, trim: true },
  email:    { type: String, lowercase: true, trim: true },
  phone:    { type: String, trim: true },
  loginId:  { type: String, required: true, unique: true, trim: true }, // admin: email, student: 001 / ALZ-2026-001
  password: { type: String, required: true, select: false },            // bcrypt hash
  isActive: { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: false },
}, { timestamps: true });

// admin email -> lowercase, studentId -> uppercase
UserSchema.pre('validate', function (next) {
  if (this.loginId) {
    this.loginId = this.role === 'admin' ? this.loginId.toLowerCase() : this.loginId.toUpperCase();
  }
  next();
});

/* ---------------- StudentProfile (student personal data) ---------------- */
const StudentProfileSchema = new Schema({
  userId:       { type: ObjectId, ref: 'User', required: true, unique: true },
  guardianName: { type: String, trim: true },
  address:      { type: String, trim: true },
  dob:          Date,
  // future: previousSchool, documents, photo...
}, { timestamps: true });

/* ---------------- Course ---------------- */
const CourseSchema = new Schema({
  name:        { type: String, required: true, trim: true },
  slug:        { type: String, required: true, unique: true, lowercase: true, trim: true }, // public URL
  description: String,
  ageGroup:    { type: String, trim: true },   // "Class 1-5", "Adults", etc.
  isActive:    { type: Boolean, default: true },
  isPinned:    { type: Boolean, default: false },
}, { timestamps: true });

/* ---------------- Batch (timing + meeting link) ---------------- */
const SlotSchema = new Schema({
  dayOfWeek: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday
  startTime: { type: String, match: TIME_RE, required: true },
  endTime:   { type: String, match: TIME_RE, required: true },
}, { _id: false });

const BatchSchema = new Schema({
  courseId:    { type: ObjectId, ref: 'Course', required: true, index: true },
  name:        { type: String, required: true, trim: true },   // "Tajweed Morning"
  teacherName: { type: String, trim: true },
  meetingLink: { type: String, trim: true },
  capacity:    Number,
  schedule:    [SlotSchema],
  status:      { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

/* ---------------- Admission (public form submissions) ---------------- */
const AdmissionSchema = new Schema({
  name:          { type: String, required: true, trim: true },
  phone:         { type: String, required: true, trim: true },
  email:         { type: String, lowercase: true, trim: true },
  guardianName:  { type: String, trim: true },
  address:       { type: String, trim: true },
  dob:           Date,
  courseId:      { type: ObjectId, ref: 'Course', required: true },
  status:        { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  rejectReason:  String,
  studentUserId: { type: ObjectId, ref: 'User' },   // approve ke baad set hota hai
  reviewedAt:    Date,
}, { timestamps: true });

/* ---------------- Enrollment (student <-> course + batch) ---------------- */
const EnrollmentSchema = new Schema({
  studentId: { type: ObjectId, ref: 'User', required: true, index: true },
  courseId:  { type: ObjectId, ref: 'Course', required: true },
  batchId:   { type: ObjectId, ref: 'Batch', required: true, index: true },
  status:    { type: String, enum: ['active', 'left'], default: 'active' },
  startDate: { type: Date, default: Date.now },
}, { timestamps: true });

// ek student ka ek course me sirf ek ACTIVE enrollment
EnrollmentSchema.index(
  { studentId: 1, courseId: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

/* ---------------- Notice ---------------- */
const NoticeSchema = new Schema({
  title:        { type: String, required: true, trim: true },
  category:     { type: String, enum: ['urgent', 'holiday', 'exam', 'new_batch', 'general'], default: 'general' },
  description:  String,
  pdfUrl:       String,
  showOnTicker: { type: Boolean, default: false },
  isActive:     { type: Boolean, default: true },
  publishedAt:  { type: Date, default: Date.now, index: true },
}, { timestamps: true });

/* ---------------- Counter (atomic student ID generation) ---------------- */
const CounterSchema = new Schema({
  _id: String,                          // "student"
  seq: { type: Number, default: 0 },
});

/* ---------------- Models (hot-reload safe) ---------------- */
const m = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);

export const User           = m('User', UserSchema);
export const StudentProfile = m('StudentProfile', StudentProfileSchema);
export const Course         = m('Course', CourseSchema);
export const Batch          = m('Batch', BatchSchema);
export const Admission      = m('Admission', AdmissionSchema);
export const Enrollment     = m('Enrollment', EnrollmentSchema);
export const Notice         = m('Notice', NoticeSchema);
export const Counter        = m('Counter', CounterSchema);
