# CEM — College Event Management System
## Tech Stack Documentation

---

## Project Overview

CEM is a full-stack web application for managing college events. It provides two role-based portals — Faculty and Student — covering the complete event lifecycle from publishing to certificate issuance.

---

## Tech Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | v18+ | Runtime environment |
| Express.js | ^4.18.2 | HTTP server and REST API framework |
| MongoDB | Local (27017) | NoSQL database |
| Mongoose | ^8.0.0 | MongoDB ODM — schema modeling and queries |
| Multer | ^2.1.1 | File upload handling (certificates) |
| Nodemailer | ^8.0.1 | Email notifications |
| CORS | ^2.8.5 | Cross-origin request handling |

### Frontend

| Technology | Purpose |
|---|---|
| HTML5 / CSS3 | Page structure and styling |
| Vanilla JavaScript (ES2020+) | All client-side logic, no frameworks |
| Poppins (Google Fonts) | Typography |
| Fetch API | All HTTP requests to backend |
| localStorage | Session persistence (login state, notification timestamps) |

---

## Project Structure

```
CEM/
├── server.js                  # Express app entry point
├── config/
│   └── db.js                  # MongoDB connection
├── models/
│   ├── Event.js               # Event schema
│   ├── Faculty.js             # Faculty schema
│   ├── Student.js             # Student schema
│   ├── Registration.js        # Registration schema
│   ├── Feedback.js            # Feedback schema
│   └── Notification.js        # Notification schema
├── routes/
│   ├── facultyRoutes.js       # Faculty auth + profile
│   ├── studentRoutes.js       # Student auth + profile
│   ├── eventroutes.js         # Event CRUD
│   ├── registrationroutes.js  # Registration + attendance + scores + certificates
│   ├── feedbackRoutes.js      # Feedback submit + analytics
│   └── notificationRoutes.js  # Notification fetch + delete
├── emailService.js            # Nodemailer email templates
└── public/
    ├── index.html             # Landing page + login modals
    ├── studentDashboard.html  # Student portal (single-page, tab-based)
    ├── facultyDashboardNew2.html  # Faculty portal (single-page, tab-based)
    ├── register.html          # Event registration form
    ├── css/
    │   └── style.css          # Shared styles
    └── js/
        ├── main.js            # Landing page JS
        ├── faculty.js         # Faculty dashboard logic
        └── student.js         # (legacy, superseded by inline script)
```

---

## API Routes

### Faculty — `/api/faculty`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/login` | Faculty login |
| GET | `/profile/:facultyId` | Get faculty profile |
| PUT | `/profile/:facultyId` | Update faculty profile |
| PUT | `/change-password/:facultyId` | Change password |

### Student — `/api/student`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/login` | Student login |
| GET | `/profile/:studentId` | Get student profile |
| PUT | `/profile/:studentId` | Update student profile |
| PUT | `/change-password/:studentId` | Change password |

### Events — `/api/events`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/` | Publish new event |
| GET | `/` | Get all events (with registration count) |
| GET | `/faculty/:facultyId` | Get events by faculty |
| PUT | `/:id` | Update event (increments version, clears registrations) |
| DELETE | `/:id` | Delete event |

### Registrations — `/api/registrations`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/` | Register student for event |
| GET | `/all` | Get all registrations |
| GET | `/student/:pinNumber` | Get registrations by student PIN |
| PUT | `/attendance/:id` | Mark attendance (present/absent) |
| PUT | `/score/:id` | Assign score |
| POST | `/certificate/:id` | Upload certificate (PDF/image) |
| DELETE | `/certificate/:id` | Remove certificate |

### Feedback — `/api/feedback`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/submit` | Submit feedback (rating + comment) |
| GET | `/check/:pinNumber/:eventId` | Check if feedback already submitted |
| GET | `/event/:eventId` | Get all feedback for an event |

### Notifications — `/api/notifications`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Get student notifications (excludes faculty-only types) |
| GET | `/faculty/:facultyId` | Get faculty notifications |
| DELETE | `/student/:pinNumber` | Permanently clear student notifications |
| DELETE | `/faculty/:facultyId` | Permanently clear faculty notifications |

---

## Database Models

### Event
```
title, description, venue, date, time,
faculty, facultyPhone, student, studentPhone,
version (default:1), updatedAt,
publishedBy, publishedByFacultyId,
registrationDeadline, maxParticipants
```

### Student
```
studentId, username, password, pinNumber,
fullName, email, phone, branch, section, year, profileImage
```

### Faculty
```
facultyId, username, password,
fullName, email, phone, department, profileImage
```

### Registration
```
studentName, pinNumber, branch, section, year,
eventId, eventVersion, attended, score, certificateUrl
```

### Feedback
```
studentName, pinNumber, eventId, rating (1-5), comment, submittedAt
```

### Notification
```
type (new_event | event_updated | attendance | score |
      certificate | new_registration | registration_confirmed),
title, message, eventId, eventTitle,
pinNumber (null = global), facultyId, createdAt
```

---

## Notification Routing Logic

| Trigger | Recipient | Type |
|---|---|---|
| Faculty publishes event | All students (global) | `new_event` |
| Faculty updates event | All students (global) | `event_updated` |
| Student registers | That student only | `registration_confirmed` |
| Student registers | Faculty who published | `new_registration` |
| Attendance marked | That student only | `attendance` |
| Score assigned | That student only | `score` |
| Certificate uploaded | That student only | `certificate` |

---

## Student Dashboard Tabs

| Tab | ID | Data Source |
|---|---|---|
| Home | `home` | Events + Registrations summary |
| Available Events | `events` | `GET /api/events` |
| My Registrations | `registrations` | `GET /api/registrations/student/:pin` |
| My Scores | `scores` | Filtered from registrations (attended=true) |
| My Certificates | `certificates` | Filtered from registrations (certificateUrl set) |
| Profile | `profile` | localStorage `studentData` |

## Faculty Dashboard Tabs

| Tab | ID | Description |
|---|---|---|
| Home | `home` | Stats + published events overview |
| Publish Event | `publish` | Create new event form |
| Update Event | `updateEvent` | Edit existing event |
| All Registrations | `registrations` | View + attendance toggle per event |
| Attendance & Scoring | `attendance` | Assign scores to attended students |
| Analytics | `analytics` | Registration and attendance charts |
| Feedback Analysis | `feedbackAnalysis` | Per-event feedback ratings |
| Certificates | `certificates` | Upload/remove certificates per student |
| My Profile | `profile` | Faculty profile + password change |

---

## Running the Project

```bash
# Install dependencies
npm install

# Start server
npm start
# or
node server.js

# Server runs at: http://localhost:5000
# MongoDB must be running locally on port 27017
```

---

## Key Features Summary

- Role-based login (Faculty / Student)
- Event publish, update (with versioning), delete
- Registration with deadline enforcement and participant limits
- Attendance marking and score assignment
- Feedback collection with faculty analytics
- Certificate upload (PDF/image) and student download
- In-app notification bell for both roles
- Email notifications (registration, attendance, score)
- Password change for both roles
- PDF attendance report download (faculty)
- Permanent notification clear (client + database)
