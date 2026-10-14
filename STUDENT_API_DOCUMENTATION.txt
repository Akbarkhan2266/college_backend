# Student Portal API Documentation

Complete API reference for all Student Portal endpoints in the College Backend.

---

## Table of Contents
1. [General Information & Security Rules](#general-information--security-rules)
2. [Timezone & Slot Logic (IST)](#timezone--slot-logic-ist)
3. [Student Authentication (`/api/student`)](#1-student-authentication-apistudent)
4. [Student Panel Endpoints (`/api/student`)](#2-student-panel-endpoints-apistudent)
5. [Common Error Responses](#common-error-responses)

---

## General Information & Security Rules

- **Base URL:** `http://localhost:2000` (or configured `PORT` in `.env`)
- **Default Content-Type:** `application/json`
- **Authentication Options:**
  1. **httpOnly Cookie:** Automatically set as `token=<jwt_token>` upon successful login.
  2. **Authorization Header:** `Authorization: Bearer <jwt_token>`
- **Security & Data Isolation:**
  - Every student query filters strictly by `req.user._id`. Students cannot access another student's data.
  - Meeting links are only returned for batches in which the student has an active enrollment.
  - **First-time Login (`mustChangePassword`):** When a student account is created by admin, `mustChangePassword` is set to `true`. Panel routes return `403 Forbidden` until the student updates their password via `PATCH /api/student/password`.

---

## Timezone & Slot Logic (IST)

Server calculates all class timings and schedules in Indian Standard Time (`Asia/Kolkata`):
- `dayOfWeek`: `0` = Sunday, `1` = Monday, `2` = Tuesday, `3` = Wednesday, `4` = Thursday, `5` = Friday, `6` = Saturday.
- `canJoin`: Evaluates to `true` starting **10 minutes before class start time** until the scheduled end time on the class day.
- `nextClass`: Returns the next upcoming class slot, wrapping across weekends and upcoming days of the week.

---

## 1. Student Authentication (`/api/student`)

### 1.1 Student Login
- **Method:** `POST`
- **URL:** `/api/student/login`
- **Auth:** Public *(Rate limited: 10 attempts / 15 min)*
- **Request Body:**
```json
{
  "studentId": "1",
  "password": "TemporaryPassword123!"
}
```
*(Note: Numeric IDs are automatically zero-padded to 3 digits: `"1"` -> `"001"`, `"42"` -> `"042"`).*

- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "name": "Zaid Ahmad",
    "mustChangePassword": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 1.2 Student Logout
- **Method:** `POST`
- **URL:** `/api/student/logout`
- **Auth:** Student
- **Request Body:** None
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 1.3 Update Password (First Login & Later)
- **Method:** `PATCH`
- **URL:** `/api/student/password`
- **Auth:** Student *(Accessible even while `mustChangePassword` is `true`)*
- **Request Body:**
```json
{
  "oldPassword": "TemporaryPassword123!",
  "newPassword": "MySecurePassword2026!"
}
```
*(Minimum password length: 8 characters).*

- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

### 1.4 Get Student Session Info (`me`)
- **Method:** `GET`
- **URL:** `/api/student/me`
- **Auth:** Student *(Accessible even while `mustChangePassword` is `true` to guide first-time password change redirect)*
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "name": "Zaid Ahmad",
    "loginId": "001",
    "mustChangePassword": false
  }
}
```

---

## 2. Student Panel Endpoints (`/api/student`)

> **Important:** All routes below require `auth('student')` **AND** `mustChangePassword === false`.  
> If `mustChangePassword` is `true`, the server responds with **`403 Forbidden`**.

---

### 2.1 Student Dashboard
Returns today's classes from the student's active enrollments and the 3 latest notices.
- **Method:** `GET`
- **URL:** `/api/student/dashboard`
- **Auth:** Student + Password Changed
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "todaysClasses": [
      {
        "courseName": "Tajweed Essentials",
        "batchName": "Morning Batch A",
        "teacher": "Ustadh Zaid",
        "startTime": "09:00",
        "endTime": "10:30",
        "meetingLink": "https://meet.google.com/abc-defg-hij",
        "canJoin": false
      }
    ],
    "latestNotices": [
      {
        "_id": "670aa123b456c789d0123456",
        "title": "Semester Examination Schedule Published",
        "category": "exam",
        "publishedAt": "2026-10-12T14:00:00.000Z"
      }
    ]
  }
}
```
*(Note: `canJoin` automatically turns `true` 10 minutes prior to `startTime` in Asia/Kolkata timezone).*

---

### 2.2 My Enrolled Courses
Lists all active course enrollments for the logged-in student.
- **Method:** `GET`
- **URL:** `/api/student/courses`
- **Auth:** Student + Password Changed
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "course": {
        "_id": "6acca5779a47c99d2b821d78",
        "name": "Tajweed Essentials",
        "description": "Foundational recitation rules",
        "ageGroup": "All Ages",
        "slug": "tajweed-essentials"
      },
      "batchName": "Morning Batch A",
      "enrollmentStatus": "active",
      "startDate": "2026-10-12T09:30:00.000Z"
    }
  ]
}
```

---

### 2.3 My Enrolled Batches
Lists active batches with meeting link, schedule, `canJoin` status, and `nextClass` slot.
- **Method:** `GET`
- **URL:** `/api/student/batches`
- **Auth:** Student + Password Changed
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6acca7a29a47c99d2b821d7d",
      "name": "Morning Batch A",
      "courseName": "Tajweed Essentials",
      "teacherName": "Ustadh Zaid",
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
      ],
      "meetingLink": "https://meet.google.com/abc-defg-hij",
      "canJoin": false,
      "nextClass": {
        "dayOfWeek": 3,
        "startTime": "09:00",
        "endTime": "10:30"
      }
    }
  ]
}
```

---

### 2.4 Student Notices
Lists active published notices for students with pagination.
- **Method:** `GET`
- **URL:** `/api/student/notices?category=exam&page=1&limit=20`
- **Auth:** Student + Password Changed
- **Query Params (Optional):**
  - `category`: `urgent` | `holiday` | `exam` | `new_batch` | `general`
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
        "description": "Please check attached timetable.",
        "pdfUrl": "/uploads/notices/exam_schedule.pdf",
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

### 2.5 Student Notice by ID
Fetches full details of a specific active notice.
- **Method:** `GET`
- **URL:** `/api/student/notices/:id`
- **Auth:** Student + Password Changed
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "670aa123b456c789d0123456",
    "title": "Semester Examination Schedule Published",
    "category": "exam",
    "description": "Detailed exam schedule and guidelines for all online batches.",
    "pdfUrl": "/uploads/notices/exam_schedule.pdf",
    "publishedAt": "2026-10-12T14:00:00.000Z"
  }
}
```

---

### 2.6 Student Profile (Read-Only)
Returns personal and guardian information for the authenticated student.
- **Method:** `GET`
- **URL:** `/api/student/profile`
- **Auth:** Student + Password Changed
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "name": "Zaid Ahmad",
    "phone": "+919876543210",
    "email": "zaid.ahmad@example.com",
    "loginId": "001",
    "guardianName": "Mohammad Ahmad",
    "address": "12 Civil Lines, New Delhi, India",
    "dob": "2006-05-14T00:00:00.000Z"
  }
}
```
*(Read-only: Students cannot update personal information directly; updates must be performed by admin).*

---

## Common Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid student ID or password"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access denied. No authentication token provided."
}
```

### 403 Forbidden (First-Time Password Change Required)
```json
{
  "success": false,
  "message": "Password change is required before accessing the student panel. Please update your password."
}
```

### 403 Forbidden (Deactivated Student Account)
```json
{
  "success": false,
  "message": "Your account has been deactivated. Please contact the administrator."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Notice not found"
}
```
