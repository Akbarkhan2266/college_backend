# Admin Portal API Documentation

Complete API reference for all Admin endpoints in the College Portal Backend.

---

## Table of Contents
1. [General Information & Auth](#general-information--auth)
2. [Admin Auth & Profile (`/api/admin`)](#1-admin-auth--profile-apiadmin)
3. [Course Management (`/api/admin/courses`)](#2-course-management-apiadmincourses)
4. [Batch Management (`/api/admin/batches`)](#3-batch-management-apiadminbatches)
5. [Notice Management (`/api/admin/notices`)](#4-notice-management-apiadminnotices)
6. [Admission Management (`/api/admin/admissions`)](#5-admission-management-apiadminadmissions)
7. [Student Management (`/api/admin/students`)](#6-student-management-apiadminstudents)
8. [Common Error Responses](#common-error-responses)

---

## General Information & Auth

- **Base URL:** `http://localhost:2000` (or configured `PORT` in `.env`)
- **Default Content-Type:** `application/json` (or `multipart/form-data` for notice file upload)
- **Role Requirement:** All endpoints except `/api/admin/login` require an authenticated user with `role: 'admin'`.
- **Authentication Methods:**
  1. **httpOnly Cookie:** Automatically set as `token=<jwt_token>` upon login.
  2. **Authorization Header:** `Authorization: Bearer <jwt_token>`

---

## 1. Admin Auth & Profile (`/api/admin`)

### 1.1 Admin Login
- **Method:** `POST`
- **URL:** `/api/admin/login`
- **Auth:** Public *(Rate limited: 10 attempts / 15 min)*
- **Request Body:**
```json
{
  "email": "admin@college.com",
  "password": "AdminPassword123!"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "670aa000b456c789d0000001",
      "name": "System Admin",
      "email": "admin@college.com",
      "role": "admin",
      "mustChangePassword": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 1.2 Admin Logout
- **Method:** `POST`
- **URL:** `/api/admin/logout`
- **Auth:** Admin
- **Request Body:** None
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 1.3 Get Current Admin Session (`me`)
- **Method:** `GET`
- **URL:** `/api/admin/me`
- **Auth:** Admin
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "670aa000b456c789d0000001",
    "name": "System Admin",
    "email": "admin@college.com",
    "role": "admin",
    "isActive": true,
    "mustChangePassword": false
  }
}
```

---

### 1.4 Update Admin Password
- **Method:** `PATCH`
- **URL:** `/api/admin/password`
- **Auth:** Admin
- **Request Body:**
```json
{
  "oldPassword": "AdminPassword123!",
  "newPassword": "NewAdminPassword456!"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

### 1.5 Update Admin Profile Details
- **Method:** `PATCH`
- **URL:** `/api/admin/profile`
- **Auth:** Admin
- **Request Body:**
```json
{
  "name": "Principal Admin",
  "email": "admin@college.com",
  "phone": "+919876543210"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "670aa000b456c789d0000001",
    "name": "Principal Admin",
    "email": "admin@college.com",
    "phone": "+919876543210",
    "role": "admin"
  }
}
```

---

## 2. Course Management (`/api/admin/courses`)

### 2.1 List All Courses
- **Method:** `GET`
- **URL:** `/api/admin/courses`
- **Auth:** Admin
- **Query Params (Optional):**
  - `search`: string (filters by course name)
  - `isActive`: `true` | `false`
  - `page`: number (default: 1)
  - `limit`: number (default: 20)
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "_id": "6acca5779a47c99d2b821d78",
        "name": "Tajweed Essentials",
        "slug": "tajweed-essentials",
        "description": "Foundational rules of Quranic recitation",
        "ageGroup": "All Ages",
        "isActive": true,
        "isPinned": false,
        "batchCount": 2,
        "studentCount": 18
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

---

### 2.2 Get Course by ID
- **Method:** `GET`
- **URL:** `/api/admin/courses/:id`
- **Auth:** Admin
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "6acca5779a47c99d2b821d78",
    "name": "Tajweed Essentials",
    "slug": "tajweed-essentials",
    "description": "Foundational rules of Quranic recitation",
    "ageGroup": "All Ages",
    "isActive": true,
    "isPinned": false,
    "batches": []
  }
}
```

---

### 2.3 Create Course
- **Method:** `POST`
- **URL:** `/api/admin/courses`
- **Auth:** Admin
- **Request Body:**
```json
{
  "name": "Islamic Studies Level 1",
  "description": "Comprehensive course on Fiqh, Aqeedah, and Seerah",
  "ageGroup": "Class 6-10",
  "isActive": true,
  "isPinned": false
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Course created successfully",
  "data": {
    "_id": "6acca8889a47c99d2b821d88",
    "name": "Islamic Studies Level 1",
    "slug": "islamic-studies-level-1",
    "description": "Comprehensive course on Fiqh, Aqeedah, and Seerah",
    "ageGroup": "Class 6-10",
    "isActive": true,
    "isPinned": false
  }
}
```

---

### 2.4 Update Course
- **Method:** `PATCH`
- **URL:** `/api/admin/courses/:id`
- **Auth:** Admin
- **Request Body:**
```json
{
  "name": "Islamic Studies Level 1 (Advanced)",
  "description": "Updated syllabus with additional Tafseer modules",
  "isPinned": true
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Course updated successfully",
  "data": {
    "_id": "6acca8889a47c99d2b821d88",
    "name": "Islamic Studies Level 1 (Advanced)",
    "slug": "islamic-studies-level-1",
    "isPinned": true
  }
}
```

---

### 2.5 Delete Course
- **Method:** `DELETE`
- **URL:** `/api/admin/courses/:id`
- **Auth:** Admin
- *(Blocked with 400 error if active batches or students exist)*
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Course deleted successfully"
}
```

---

## 3. Batch Management (`/api/admin/batches`)

### 3.1 List Batches
- **Method:** `GET`
- **URL:** `/api/admin/batches`
- **Auth:** Admin
- **Query Params (Optional):**
  - `courseId`: string (Course ObjectId)
  - `status`: `active` | `inactive`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6acca7a29a47c99d2b821d7d",
      "courseId": {
        "_id": "6acca5779a47c99d2b821d78",
        "name": "Tajweed Essentials",
        "slug": "tajweed-essentials"
      },
      "name": "Morning Batch A",
      "teacherName": "Ustadh Zaid",
      "meetingLink": "https://meet.google.com/abc-defg-hij",
      "capacity": 25,
      "status": "active",
      "enrolledCount": 12,
      "schedule": [
        {
          "dayOfWeek": 1,
          "startTime": "09:00",
          "endTime": "10:30"
        },
        {
          "dayOfWeek": 3,
          "startTime": "09:00",
          "endTime": "10:30"
        }
      ]
    }
  ]
}
```

---

### 3.2 Get Batch by ID
- **Method:** `GET`
- **URL:** `/api/admin/batches/:id`
- **Auth:** Admin
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "6acca7a29a47c99d2b821d7d",
    "name": "Morning Batch A",
    "teacherName": "Ustadh Zaid",
    "meetingLink": "https://meet.google.com/abc-defg-hij",
    "capacity": 25,
    "status": "active",
    "students": []
  }
}
```

---

### 3.3 Create Batch
- **Method:** `POST`
- **URL:** `/api/admin/batches`
- **Auth:** Admin
- **Request Body:**
```json
{
  "courseId": "6acca5779a47c99d2b821d78",
  "name": "Evening Batch B",
  "teacherName": "Ustadh Bilal",
  "meetingLink": "https://meet.google.com/klm-nopq-rst",
  "capacity": 30,
  "status": "active",
  "schedule": [
    {
      "dayOfWeek": 2,
      "startTime": "17:00",
      "endTime": "18:30"
    },
    {
      "dayOfWeek": 4,
      "startTime": "17:00",
      "endTime": "18:30"
    }
  ]
}
```
*(Note: `dayOfWeek`: 0 = Sunday, 1 = Monday, ..., 6 = Saturday. Time format: `HH:mm`)*
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Batch created successfully",
  "data": {
    "_id": "6acca9999a47c99d2b821d99",
    "courseId": "6acca5779a47c99d2b821d78",
    "name": "Evening Batch B",
    "teacherName": "Ustadh Bilal",
    "capacity": 30,
    "status": "active"
  }
}
```

---

### 3.4 Update Batch
- **Method:** `PATCH`
- **URL:** `/api/admin/batches/:id`
- **Auth:** Admin
- **Request Body:**
```json
{
  "teacherName": "Ustadh Bilal Farooq",
  "meetingLink": "https://meet.google.com/new-updated-link",
  "capacity": 35
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Batch updated successfully",
  "data": {
    "_id": "6acca9999a47c99d2b821d99",
    "teacherName": "Ustadh Bilal Farooq",
    "capacity": 35
  }
}
```

---

### 3.5 Delete Batch
- **Method:** `DELETE`
- **URL:** `/api/admin/batches/:id`
- **Auth:** Admin
- *(Blocked with 400 error if enrolled students exist)*
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Batch deleted successfully"
}
```

---

## 4. Notice Management (`/api/admin/notices`)

### 4.1 List Notices
- **Method:** `GET`
- **URL:** `/api/admin/notices`
- **Auth:** Admin
- **Query Params (Optional):**
  - `category`: `urgent` | `holiday` | `exam` | `new_batch` | `general`
  - `showOnTicker`: `true` | `false`
  - `isActive`: `true` | `false`
  - `page`: number (default: 1)
  - `limit`: number (default: 20)
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notices": [
      {
        "_id": "670aa123b456c789d0123456",
        "title": "Semester Examination Schedule Published",
        "category": "exam",
        "description": "Please check the attached timetable.",
        "pdfUrl": "/uploads/notices/exam_schedule.pdf",
        "showOnTicker": true,
        "isActive": true,
        "publishedAt": "2026-10-12T14:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

---

### 4.2 Get Notice by ID
- **Method:** `GET`
- **URL:** `/api/admin/notices/:id`
- **Auth:** Admin
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "670aa123b456c789d0123456",
    "title": "Semester Examination Schedule Published",
    "category": "exam",
    "description": "Please check the attached timetable.",
    "pdfUrl": "/uploads/notices/exam_schedule.pdf",
    "showOnTicker": true,
    "isActive": true
  }
}
```

---

### 4.3 Create Notice
- **Method:** `POST`
- **URL:** `/api/admin/notices`
- **Auth:** Admin
- **Content-Type:** `multipart/form-data` or `application/json`

#### Option A: JSON Body (No file upload)
```json
{
  "title": "Mid-Term Exam Schedule",
  "category": "exam",
  "description": "Please check the attached timetable.",
  "showOnTicker": true,
  "isActive": true,
  "pdfUrl": "/uploads/notices/timetable.pdf"
}
```

#### Option B: Multipart Form Data (With PDF file upload)
- `title`: `Mid-Term Exam Schedule`
- `category`: `exam`
- `description`: `Please check the attached timetable.`
- `showOnTicker`: `true`
- `isActive`: `true`
- `pdf`: File (`exam_schedule.pdf`)

- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Notice created successfully",
  "data": {
    "_id": "670aa222b456c789d0123477",
    "title": "Mid-Term Exam Schedule",
    "category": "exam",
    "description": "Please check the attached timetable.",
    "pdfUrl": "/uploads/notices/notice_1770800000000_123456.pdf",
    "showOnTicker": true,
    "isActive": true,
    "publishedAt": "2026-10-12T14:30:00.000Z"
  }
}
```

---

### 4.4 Update Notice
- **Method:** `PATCH`
- **URL:** `/api/admin/notices/:id`
- **Auth:** Admin
- **Request Body (JSON):**
```json
{
  "title": "Updated Mid-Term Exam Schedule",
  "showOnTicker": false
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Notice updated successfully",
  "data": {
    "_id": "670aa222b456c789d0123477",
    "title": "Updated Mid-Term Exam Schedule",
    "showOnTicker": false
  }
}
```

---

### 4.5 Delete Notice
- **Method:** `DELETE`
- **URL:** `/api/admin/notices/:id`
- **Auth:** Admin
- *(Automatically removes uploaded PDF file from the server uploads directory)*
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Notice deleted successfully"
}
```

---

## 5. Admission Management (`/api/admin/admissions`)

### 5.1 List Admissions
- **Method:** `GET`
- **URL:** `/api/admin/admissions`
- **Auth:** Admin
- **Query Params (Optional):**
  - `status`: `pending` | `approved` | `rejected`
  - `search`: string (matches name, phone, or email)
  - `page`: number (default: 1)
  - `limit`: number (default: 20)
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "admissions": [
      {
        "_id": "670ab890c1234567890abcde",
        "name": "Zaid Ahmad",
        "phone": "+919876543210",
        "email": "zaid.ahmad@example.com",
        "guardianName": "Mohammad Ahmad",
        "courseId": {
          "_id": "6acca5779a47c99d2b821d78",
          "name": "Tajweed Essentials",
          "slug": "tajweed-essentials"
        },
        "status": "pending",
        "createdAt": "2026-10-12T09:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

---

### 5.2 Get Admission by ID
- **Method:** `GET`
- **URL:** `/api/admin/admissions/:id`
- **Auth:** Admin
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "670ab890c1234567890abcde",
    "name": "Zaid Ahmad",
    "phone": "+919876543210",
    "email": "zaid.ahmad@example.com",
    "guardianName": "Mohammad Ahmad",
    "address": "12 Civil Lines, New Delhi",
    "dob": "2006-05-14T00:00:00.000Z",
    "courseId": {
      "_id": "6acca5779a47c99d2b821d78",
      "name": "Tajweed Essentials"
    },
    "status": "pending"
  }
}
```

---

### 5.3 Approve Admission & Assign Batch
- **Method:** `POST`
- **URL:** `/api/admin/admissions/:id/approve`
- **Auth:** Admin
- **Request Body:**
```json
{
  "batchId": "6acca7a29a47c99d2b821d7d"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Admission approved successfully. Student account created and enrolled.",
  "data": {
    "studentId": "001",
    "loginId": "001",
    "temporaryPassword": "pW#9x!Kq",
    "name": "Zaid Ahmad",
    "isExistingUser": false,
    "batchName": "Morning Batch A"
  }
}
```

---

### 5.4 Reject Admission
- **Method:** `POST`
- **URL:** `/api/admin/admissions/:id/reject`
- **Auth:** Admin
- **Request Body:**
```json
{
  "reason": "Seat capacity full for the current academic session"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Admission application rejected successfully",
  "data": {
    "id": "670ab890c1234567890abcde",
    "status": "rejected",
    "rejectReason": "Seat capacity full for the current academic session"
  }
}
```

---

## 6. Student Management (`/api/admin/students`)

### 6.1 List Students
- **Method:** `GET`
- **URL:** `/api/admin/students`
- **Auth:** Admin
- **Query Params (Optional):**
  - `search`: string (matches name, phone, or loginId)
  - `courseId`: string
  - `batchId`: string
  - `isActive`: `true` | `false`
  - `page`: number (default: 1)
  - `limit`: number (default: 20)
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "_id": "670ac000d123456789011111",
        "name": "Zaid Ahmad",
        "loginId": "001",
        "email": "zaid.ahmad@example.com",
        "phone": "+919876543210",
        "isActive": true,
        "mustChangePassword": true,
        "profile": {
          "guardianName": "Mohammad Ahmad",
          "address": "12 Civil Lines, New Delhi",
          "dob": "2006-05-14T00:00:00.000Z"
        },
        "enrollments": [
          {
            "_id": "670ac111e123456789022222",
            "courseName": "Tajweed Essentials",
            "batchName": "Morning Batch A",
            "status": "active"
          }
        ]
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

---

### 6.2 Get Student by ID
- **Method:** `GET`
- **URL:** `/api/admin/students/:id`
- **Auth:** Admin
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "670ac000d123456789011111",
    "name": "Zaid Ahmad",
    "loginId": "001",
    "email": "zaid.ahmad@example.com",
    "phone": "+919876543210",
    "isActive": true,
    "profile": {
      "guardianName": "Mohammad Ahmad",
      "address": "12 Civil Lines, New Delhi",
      "dob": "2006-05-14T00:00:00.000Z"
    },
    "enrollments": []
  }
}
```

---

### 6.3 Update Student Personal Details
- **Method:** `PATCH`
- **URL:** `/api/admin/students/:id`
- **Auth:** Admin
- **Request Body:**
```json
{
  "name": "Zaid Ahmad Farooqi",
  "phone": "+919876543299",
  "email": "zaid.new@example.com",
  "guardianName": "Mohammad Farooqi",
  "address": "45 Park Street, New Delhi",
  "dob": "2006-05-14"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Student details updated successfully",
  "data": {
    "_id": "670ac000d123456789011111",
    "name": "Zaid Ahmad Farooqi",
    "phone": "+919876543299",
    "email": "zaid.new@example.com"
  }
}
```

---

### 6.4 Transfer / Change Student Batch
- **Method:** `PATCH`
- **URL:** `/api/admin/students/:id/batch`
- **Auth:** Admin
- **Request Body:**
```json
{
  "enrollmentId": "670ac111e123456789022222",
  "newBatchId": "6acca9999a47c99d2b821d99"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Student batch transferred successfully",
  "data": {
    "enrollmentId": "670ac111e123456789022222",
    "newBatchName": "Evening Batch B"
  }
}
```

---

### 6.5 Set Student Active / Inactive Status
- **Method:** `PATCH`
- **URL:** `/api/admin/students/:id/status`
- **Auth:** Admin
- **Request Body:**
```json
{
  "isActive": false
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Student status updated to inactive",
  "data": {
    "id": "670ac000d123456789011111",
    "isActive": false
  }
}
```

---

### 6.6 Reset Student Password
- **Method:** `POST`
- **URL:** `/api/admin/students/:id/reset-password`
- **Auth:** Admin
- **Request Body:** `{}` (empty)
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": {
    "loginId": "001",
    "temporaryPassword": "kZ#7v!Pq",
    "mustChangePassword": true
  }
}
```

---

## Common Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error: Course name is required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access denied. No authentication token provided."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Forbidden. You do not have permission to access this resource."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "API route not found: GET /api/admin/unknown"
}
```
