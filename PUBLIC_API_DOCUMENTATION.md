# Public Website API Documentation

Endpoints for the public-facing showcase website (courses, notice board, and admission form). All routes in this document are **public** and do **not require authentication**.

---

## Base URL
`http://localhost:2000` (or your configured `PORT`)

---

## 1. Get Public Courses (`GET /api/public/courses`)
Retrieves active courses to display on the public website. Pinned courses appear first.

- **Method:** `GET`
- **URL:** `/api/public/courses`
- **Auth:** Public
- **Query Parameters (Optional):**
  - `search`: string (case-insensitive filter by course name, e.g. `?search=tajweed`)
  - `ageGroup`: string (filter by age group, e.g. `?ageGroup=Adults`)
  - `page`: number (optional, for pagination, e.g. `?page=1`)
  - `limit`: number (optional, e.g. `?limit=10`)

### Example Request
```bash
curl -X GET "http://localhost:2000/api/public/courses?search=tajweed"
```

### Response (200 OK - Direct List):
```json
{
  "success": true,
  "data": [
    {
      "_id": "6acca5779a47c99d2b821d78",
      "name": "Tajweed Essentials",
      "slug": "tajweed-essentials",
      "description": "Foundational rules of Quranic recitation",
      "ageGroup": "All Ages",
      "image": "/uploads/courses/course-1770800000000.png",
      "imageUrl": "/uploads/courses/course-1770800000000.png",
      "isActive": true,
      "isPinned": true,
      "createdAt": "2026-10-12T14:00:00.000Z"
    }
  ]
}
```

### Response (200 OK - When using `page` and `limit`):
```json
{
  "success": true,
  "data": {
    "courses": [ ... ],
    "pagination": {
      "total": 12,
      "page": 1,
      "limit": 10,
      "totalPages": 2
    }
  }
}
```

---

## 2. Get Public Course Detail (`GET /api/public/courses/:idOrSlug`)
Fetches single course details using either its unique **slug** (e.g., `tajweed-essentials`) or **MongoDB ID** (e.g., `6acca5779a47c99d2b821d78`).  
Also includes public active batches with schedules so visitors can see class timings before applying (private meeting links are kept hidden).

- **Method:** `GET`
- **URL:** `/api/public/courses/:idOrSlug`
- **Auth:** Public

### Example Requests
```bash
# Using slug:
curl -X GET "http://localhost:2000/api/public/courses/tajweed-essentials"

# Using MongoDB ObjectId:
curl -X GET "http://localhost:2000/api/public/courses/6acca5779a47c99d2b821d78"
```

### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "6acca5779a47c99d2b821d78",
    "name": "Tajweed Essentials",
    "slug": "tajweed-essentials",
    "description": "Foundational rules of Quranic recitation",
    "ageGroup": "All Ages",
    "image": "/uploads/courses/course-1770800000000.png",
    "imageUrl": "/uploads/courses/course-1770800000000.png",
    "isActive": true,
    "isPinned": true,
    "batches": [
      {
        "_id": "6acca7a29a47c99d2b821d7d",
        "name": "Morning Batch A",
        "teacherName": "Ustadh Zaid",
        "capacity": 25,
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
}
```

---

## 3. Get Public Notices / News Ticker (`GET /api/public/notices`)
Fetches active notices for the public news ticker, announcement banner, or public notice board.

- **Method:** `GET`
- **URL:** `/api/public/notices`
- **Auth:** Public
- **Query Parameters (Optional):**
  - `tickerOnly`: `true` (filters only items flagged for the top scrolling ticker)
  - `category`: `urgent` | `holiday` | `exam` | `new_batch` | `general`
  - `page`: number (optional, for pagination)
  - `limit`: number (optional, for pagination)

### Example Requests
```bash
# For homepage scrolling ticker:
curl -X GET "http://localhost:2000/api/public/notices?tickerOnly=true"

# For notice board with category filter:
curl -X GET "http://localhost:2000/api/public/notices?category=exam"
```

### Response (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "_id": "670aa123b456c789d0123456",
      "title": "Semester Examination Schedule Published",
      "category": "exam",
      "description": "Final examination schedule for all enrolled batches has been announced.",
      "pdfUrl": "/uploads/notices/exam_schedule.pdf",
      "showOnTicker": true,
      "isActive": true,
      "publishedAt": "2026-10-12T14:00:00.000Z"
    }
  ]
}
```

---

## 4. Get Public Notice Detail (`GET /api/public/notices/:id`)
Fetches details of a specific active notice by ID, including its full description and attachment PDF URL.

- **Method:** `GET`
- **URL:** `/api/public/notices/:id`
- **Auth:** Public

### Example Request
```bash
curl -X GET "http://localhost:2000/api/public/notices/670aa123b456c789d0123456"
```

### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "670aa123b456c789d0123456",
    "title": "Semester Examination Schedule Published",
    "category": "exam",
    "description": "Detailed exam timetable and instructions for all students.",
    "pdfUrl": "/uploads/notices/exam_schedule.pdf",
    "showOnTicker": true,
    "isActive": true,
    "publishedAt": "2026-10-12T14:00:00.000Z"
  }
}
```

---

## 5. Submit Admission Form (`POST /api/public/admissions`)
Allows prospective students/parents to submit an admission inquiry from the website.  
Triggers email notifications to admin and an acknowledgement to the student.

- **Method:** `POST`
- **URL:** `/api/public/admissions`
- **Auth:** Public *(Rate limited: 5 submissions / 15 min)*
- **Content-Type:** `application/json`

### Request Body
*(Note: `name`, `phone`, `email`, and `courseId` are required fields)*
```json
{
  "name": "Zaid Ahmad",
  "phone": "+919876543210",
  "email": "zaid.ahmad@example.com",
  "guardianName": "Mohammad Ahmad",
  "address": "12 Civil Lines, New Delhi, India",
  "dob": "2006-05-14",
  "courseId": "6acca5779a47c99d2b821d78"
}
```

### Response (201 Created):
```json
{
  "success": true,
  "message": "Admission form submitted successfully. We will review it shortly.",
  "data": {
    "id": "670ab890c1234567890abcde",
    "name": "Zaid Ahmad",
    "courseId": "6acca5779a47c99d2b821d78",
    "status": "pending"
  }
}
```
