# College Portal - Admin Backend API

Production-ready backend API for the College Portal Admin Panel built with Node.js, Express, and Mongoose (ES6 modules).

---

## 1. Stack & Technologies

- **Runtime:** Node.js (ES6 modules)
- **Framework:** Express.js
- **Database:** MongoDB via Mongoose
- **Authentication:** JWT stored in secure `httpOnly` cookies (also supports `Authorization: Bearer <token>`)
- **Validation:** Zod request schema validation
- **Security:** Helmet, CORS, Express-Rate-Limit, BcryptJS
- **File Upload:** Multer for PDF notices

---

## 2. Folder Structure

```
college_backend/
├── .env.example
├── package.json
├── README.md
├── uploads/
│   └── notices/                 # Notice PDF attachments
└── src/
    ├── server.js                # App entrypoint (initializes DB & starts server)
    ├── app.js                   # Express app setup, middlewares, routes mounting
    ├── config/
    │   └── db.js                # MongoDB connection handler
    ├── models.js                # All Mongoose models & schemas with hooks
    ├── middleware/
    │   ├── auth.js              # Verifies JWT, checks role, isActive in DB
    │   ├── validate.js          # Zod schema validation
    │   ├── rateLimit.js         # Rate limiters for login & admission form
    │   └── upload.js            # Multer config for PDF notice files
    ├── utils/
    │   ├── generateStudentId.js # Atomic 3-digit auto-increment ID generator (001-999) & normalizer
    │   ├── generatePassword.js  # Random 8-character password generator
    │   └── slugify.js           # Unique slug generator with deduplication
    ├── controller/
    │   ├── admin/
    │   │   └── admin.controller.js       # Admin login, logout, password change, profile update, getMe
    │   ├── course/
    │   │   └── course.controller.js      # Course CRUD with slug generation & dependency-safe deletion
    │   ├── batch/
    │   │   └── batch.controller.js       # Batch CRUD, schedule slots, capacity tracking
    │   ├── notice/
    │   │   └── notice.controller.js      # Notice CRUD with PDF multer upload & cleanup
    │   ├── admission/
    │   │   └── admission.controller.js   # Public form submission, approval pipeline, rejection
    │   └── student/
    │       └── student.controller.js     # Student listing, profile edit, batch transfer, status, reset password
    └── routes/
        ├── admin.routes.js               # /api/admin
        ├── course.routes.js              # /api/admin/courses
        ├── batch.routes.js               # /api/admin/batches
        ├── notice.routes.js              # /api/admin/notices
        ├── admission.routes.js           # /api/admin/admissions
        ├── student.routes.js             # /api/admin/students
        └── public.routes.js              # /api/public (courses, notices, admissions)
```

---

## 3. Environment Configuration

Copy `.env.example` to `.env` and fill in your values:

```bash
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/college_portal
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
COOKIE_SECRET=your_cookie_secret_key
CLIENT_URL=http://localhost:3000
```

---

## 4. Getting Started

### Installation
```bash
npm install
```

### Running in Development
```bash
npm run dev
```

### Running in Production
```bash
npm start
```

---

## 5. API Endpoints

### 5.1 Admin Authentication & Profile (`/api/admin`)
| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/admin/login` | Public (Rate Limited) | Login with `{ email, password }`, returns JWT in httpOnly cookie |
| `POST` | `/api/admin/logout` | Admin | Clears authentication cookie |
| `PATCH` | `/api/admin/password` | Admin | Updates password with `{ oldPassword, newPassword }` |
| `PATCH` | `/api/admin/profile` | Admin | Updates `{ name, phone, email }` (syncs `loginId`) |
| `GET` | `/api/admin/me` | Admin | Fetches active admin profile for session validation |

---

### 5.2 Course Management (`/api/admin/courses`)
| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/courses` | Admin | List courses (`?search=&isActive=&page=&limit=`) |
| `GET` | `/api/admin/courses/:id` | Admin | Get single course and its associated batches |
| `POST` | `/api/admin/courses` | Admin | Create course (auto-generates unique slug) |
| `PATCH` | `/api/admin/courses/:id` | Admin | Update course (regenerates slug only if name changes) |
| `DELETE` | `/api/admin/courses/:id` | Admin | Deletes course (blocks delete if enrollments/batches exist) |

---

### 5.3 Batch Management (`/api/admin/batches`)
| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/batches` | Admin | List batches with enrolled count & available seats (`?courseId=&status=`) |
| `GET` | `/api/admin/batches/:id` | Admin | Get single batch details and occupancy |
| `POST` | `/api/admin/batches` | Admin | Create batch with schedule slots & capacity |
| `PATCH` | `/api/admin/batches/:id` | Admin | Update batch info or schedule |
| `DELETE` | `/api/admin/batches/:id` | Admin | Delete batch (blocks delete if active enrollments exist) |

---

### 5.4 Notice Management (`/api/admin/notices`)
| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/notices` | Admin | List notices (`?category=&showOnTicker=&isActive=&page=&limit=`) |
| `GET` | `/api/admin/notices/:id` | Admin | Get notice details |
| `POST` | `/api/admin/notices` | Admin | Create notice with optional PDF upload (`multipart/form-data`) |
| `PATCH` | `/api/admin/notices/:id` | Admin | Update notice details and replace PDF |
| `DELETE` | `/api/admin/notices/:id` | Admin | Delete notice (also cleans up stored PDF file) |

---

### 5.5 Admission Review (`/api/admin/admissions`)
| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/admissions` | Admin | List admission applications (`?status=&search=&page=&limit=`) |
| `GET` | `/api/admin/admissions/:id` | Admin | Get admission application details |
| `POST` | `/api/admin/admissions/:id/approve` | Admin | Approves admission with `{ batchId }`, generates 3-digit student ID & password |
| `POST` | `/api/admin/admissions/:id/reject` | Admin | Rejects application with optional `{ reason }` |

---

### 5.6 Student Management (`/api/admin/students`)
| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/students` | Admin | List students with enrollments (`?search=&courseId=&batchId=&isActive=&page=&limit=`) |
| `GET` | `/api/admin/students/:id` | Admin | Get student profile and populated courses/batches |
| `PATCH` | `/api/admin/students/:id` | Admin | Update personal info (name, phone, email, guardianName, address, dob) |
| `PATCH` | `/api/admin/students/:id/batch` | Admin | Transfer student to new batch `{ enrollmentId, newBatchId }` |
| `PATCH` | `/api/admin/students/:id/status` | Admin | Activate/deactivate student (`{ isActive }`) |
| `POST` | `/api/admin/students/:id/reset-password` | Admin | Generates and returns a temporary password once |

---

### 5.7 Public Routes (`/api/public`)
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/public/admissions` | Public admission application (rate limited + honeypot spam protection) |
| `GET` | `/api/public/courses` | List active courses |
| `GET` | `/api/public/courses/:slug` | Get course by slug |
| `GET` | `/api/public/notices` | List active notices / ticker items (`?tickerOnly=true&category=`) |

---

## 6. Student ID & Counter Specifications

- **Format:** 3 digits, auto-incremented: `001`, `002`, `003`, ..., `999`.
- **Collection:** `Counter` with atomic `findOneAndUpdate({ _id: 'student' }, { $inc: { seq: 1 } }, { upsert: true, new: true })`.
- **Duplicate Key Race Handling:** Retries once on Mongo `E11000`.
- **Capacity Guard:** Throws an explicit error if sequence exceeds 999.
- **Normalization:** Student login normalizes typed inputs (e.g., `"1"` becomes `"001"`).
