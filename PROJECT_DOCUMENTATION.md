# College Event Management System (CEM) — Comprehensive Technical Documentation

---

## 1. Project Overview

The **College Event Management System (CEM)** is an end-to-end, multi-role web platform designed for academic institutions to streamline and automate the entire event lifecycle. From event publication, student registration, and deadline enforcement to attendance marking, score assignment, automated PDF certificate generation, external certificate eligibility verification, feedback collection, and executive analytics—CEM unifies all campus activities into a seamless ecosystem.

### Key Highlights
- **Multi-Role Portals**: Tailored interfaces for **Students**, **Faculty**, **Department Heads (HODs)**, **Deans**, and **Admins**.
- **Automated Certificate Pipeline**: Dynamically generated PDF certificates stored on Cloudinary with QR/Signature verification, plus an automated 6-hour background retention cleanup engine.
- **Event Versioning System**: Editing an event increments its version to maintain registration integrity.
- **External Certificate Eligibility (Other Certificates)**: Allows faculty to define PIN range and branch criteria for external certificate mark attributions.
- **Data Import Suite**: Batch Excel (`.xlsx`) import scripts capable of seeding thousands of student and faculty records instantly.

---

## 2. Technology Stack

### Backend Stack
| Technology / Package | Version | Purpose |
| :--- | :--- | :--- |
| **Node.js** | v18+ | JavaScript server runtime environment |
| **Express.js** | ^4.18.2 | RESTful HTTP server and route dispatcher |
| **MongoDB** | Atlas / Local 27017 | NoSQL document database |
| **Mongoose** | ^8.0.0 | MongoDB Object Data Modeling (ODM) layer |
| **Cloudinary** | ^1.41.3 | Cloud storage for certificates, signatures, and profile images |
| **Multer & Multer Storage Cloudinary** | ^2.2.0 / ^4.0.0 | Multipart form-data parser for file uploads |
| **PDFKit & pdf-parse** | ^0.18.0 / ^1.1.1 | Server-side dynamic PDF generation and parsing |
| **Nodemailer** | ^8.0.1 | Automated transactional HTML email notifications |
| **XLSX (SheetJS)** | ^0.18.5 | Reading and parsing batch student/faculty Excel files |
| **CORS** | ^2.8.5 | Cross-Origin Resource Sharing handling |
| **Dotenv** | ^17.4.0 | Environment variable management |

### Frontend Stack
| Technology | Purpose |
| :--- | :--- |
| **HTML5** | Semantic structure for landing page & single-page app (SPA) dashboards |
| **CSS3 (Vanilla)** | Glassmorphism UI, custom CSS design system variables, CSS Grid & Flexbox, smooth transitions |
| **Vanilla JavaScript (ES6+)** | Client-side API integration via `fetch`, dynamic DOM rendering, session handling |
| **Poppins (Google Fonts)** | Modern typography across all portals |
| **Browser LocalStorage** | User authentication state, role tokens, and UI cache persistence |

---

## 3. Project Directory Architecture

```
CEM/
├── server.js                        # Express server entry point & cleanup interval
├── .env                             # Environment variables (DB URI, Cloudinary, Mailer credentials)
├── package.json                     # Project dependencies & scripts
├── emailService.js                  # Nodemailer templates (Registration, Attendance, Score)
├── restart-server.bat               # Automated server restart batch script
│
├── config/
│   ├── db.js                        # Mongoose database connection setup
│   └── cloudinary.js                # Cloudinary SDK configuration
│
├── models/                          # Mongoose Database Schemas
│   ├── Admin.js                     # System Admin schema
│   ├── Branch.js                    # Academic Branch schema (CSE, AIML, DS, etc.)
│   ├── Dean.js                      # Dean portal executive schema
│   ├── DepartmentHead.js            # Department Head (HOD) schema
│   ├── Event.js                     # Main Event schema (with versioning & limits)
│   ├── Faculty.js                   # Faculty profile & auth schema
│   ├── Feedback.js                  # Student event feedback schema
│   ├── Hod.js                       # Legacy/HOD schema
│   ├── Notification.js              # In-app targeted notification schema
│   ├── OtherCertificate.js          # External certificate eligibility criteria schema
│   ├── OtherCertUpload.js            # Student uploaded external certificate schema
│   ├── PastEvent.js                 # Archived past event schema
│   ├── PastEventParticipant.js      # Archived past event attendee schema
│   ├── Registration.js              # Event registration & score/certificate schema
│   ├── Student.js                   # Student profile & auth schema
│   └── SystemSetting.js             # Global retention & system parameters schema
│
├── routes/                          # Express REST API Endpoints
│   ├── adminRoutes.js               # User management, system settings, global reports
│   ├── certificateRoutes.js         # Certificate generation, upload, & retention endpoints
│   ├── departmentHeadRoutes.js      # HOD/Dept Head department oversight endpoints
│   ├── eventroutes.js               # Event CRUD, versioning, faculty listings
│   ├── facultyRoutes.js             # Faculty auth, profile, & password management
│   ├── feedbackRoutes.js            # Feedback submission & per-event analytics
│   ├── hodRoutes.js                 # HOD portal specific endpoints
│   ├── notificationRoutes.js        # Notification fetch & permanent clearance
│   ├── otherCertRoutes.js           # External certificate rule creation & review routes
│   ├── pastEventRoutes.js           # Past event PDF upload & participant archive routes
│   ├── registrationroutes.js        # Event registration, attendance, & scoring
│   └── studentRoutes.js             # Student auth, profile, & password management
│
├── utils/
│   └── certificateCleanup.js        # Automated Cloudinary retention cleanup tasks
│
├── public/                          # Frontend Static Assets & Web Apps
│   ├── index.html                   # Master landing page with multi-role login modals
│   ├── studentDashboard.html        # Single-page Student Portal (6 tabs)
│   ├── facultyDashboard.html        # Single-page Faculty Portal (9 tabs)
│   ├── departmentHeadDashboard.html # Single-page Department Head Portal
│   ├── deanDashboard.html           # Single-page Dean Portal
│   ├── adminDashboard.html          # Single-page Admin Control Panel
│   ├── register.html                # Direct event registration page
│   ├── publishEvent.html            # Event publishing interface
│   ├── css/                         # Custom stylesheet files
│   ├── js/                          # Client-side JavaScript controllers
│   ├── images/ & signatures/        # Web logos, accreditation badges, and signatures
│   └── certificates/ & uploads/     # Temporary certificate storage
│
└── Data & Utility Scripts           # Excel import & seeding tools
    ├── importStudents.js            # Excel importer for student records
    ├── importAllData.js             # Comprehensive database seeder
    ├── generate1000Students.js      # Large scale test data generator
    ├── AIML DATA.xsls.xlsx.xlsx     # Departmental student dataset
    ├── DS data.xsls.xlsx.xlsx       # Departmental student dataset
    ├── IT data.xsls.xlsx.xlsx       # Departmental student dataset
    └── Students.xsls.xlsx.xlsx      # Master student dataset
```

---

## 4. Database Models & Schema Specifications

### 1. `Student`
Represents student accounts in the institution.
- `studentId` (String, Required, Unique): Student unique identifier.
- `username` (String, Required): Login username.
- `password` (String, Required): Login password.
- `pinNumber` (String, Required, Unique): Academic Roll/PIN number.
- `fullName` (String, Required): Student full name.
- `email` (String, Required): Email address for notifications.
- `phone` (String): Contact number.
- `branch` (String, Required): Department branch code (e.g., CSE, AIML, DS, IT).
- `section` (String): Class section (e.g., A, B, C).
- `year` (String): Academic year (e.g., 1st Year, 2nd Year, 3rd Year, 4th Year).
- `profileImage` (String): Profile picture URL / Cloudinary URL.

### 2. `Faculty`
Represents faculty members and event coordinators.
- `facultyId` (String, Required, Unique): Faculty employee ID.
- `username` (String, Required): Login username.
- `password` (String, Required): Login password.
- `fullName` (String, Required): Faculty full name.
- `email` (String, Required): Official email address.
- `phone` (String): Contact phone number.
- `department` (String, Required): Associated academic department.
- `profileImage` (String): Faculty avatar image URL.

### 3. `Event`
Stores active and upcoming college events.
- `title` (String, Required): Event title.
- `description` (String): Full event details and agenda.
- `venue` (String): Campus location or venue.
- `date` (String): Event date.
- `time` (String): Event time window.
- `faculty` & `facultyPhone`: Faculty coordinator details.
- `student` & `studentPhone`: Student coordinator details.
- `version` (Number, Default: 1): Increments when updated to invalidate past invalid registrations.
- `publishedByFacultyId`: Employee ID of the publishing faculty member.
- `registrationDeadline` (String/Date): Registration cutoff time.
- `maxParticipants` (Number, Default: null): Seat capacity limit (null = unlimited).

### 4. `Registration`
Links students to registered events and holds outcome data.
- `studentName`, `pinNumber`, `branch`, `section`, `year`: Student metadata snapshot.
- `eventId` (ObjectId, Ref: 'Event'): Target event reference.
- `eventVersion` (Number): Event version during registration.
- `attended` (Boolean, Default: false): Attendance flag.
- `score` (Number, Default: null): Performance score assigned by faculty (0-100).
- `certificateUrl` (String): Active Cloudinary URL of generated PDF certificate.
- `certificateCloudinaryPublicId` (String): Public ID for retention file cleanup.
- `certificateGeneratedAt` (Date): Timestamp when certificate was issued.
- `hasCertificate` (Boolean, Default: false): Flags certificate eligibility for lazy regeneration.

### 5. `OtherCertificate` & `OtherCertUpload`
Manages external/non-event certificate mark attributions.
- **`OtherCertificate`**: Criteria rule created by faculty specifying `certificateName`, `branch`, `pinStart`, `pinEnd`, `marks`, `startDate`, `endDate`, and `extendDate`.
- **`OtherCertUpload`**: Student submissions containing `studentPin`, `fileUrl`, `status` (`pending`, `approved`, `rejected`), `facultyComment`, `reviewedBy`, and `reviewedAt`.

### 6. `Notification`
Delivers targeted notifications to student and faculty dashboards.
- `type`: Category (`new_event`, `event_updated`, `attendance`, `score`, `certificate`, `new_registration`, `registration_confirmed`).
- `title` & `message`: Notification content.
- `eventId` & `eventTitle`: Optional event context.
- `pinNumber`: Null for global notifications, or specific student PIN.
- `facultyId`: Optional faculty recipient ID.

### 7. `PastEvent` & `PastEventParticipant`
Archive for historic events.
- Stores completed event summaries, uploaded summary report PDFs (`uploadedPdf`), and archived historical participant rosters.

---

## 5. Portal Features & User Workflows

### 🎓 Student Portal (`studentDashboard.html`)
1. **Home Overview**: Quick stats on registered events, attended events, total earned scores, and active certificates.
2. **Available Events**: Browse upcoming campus events with dynamic search, deadline timers, seat capacity bars, and 1-click registration.
3. **My Registrations**: View registration history, registration status, and event details.
4. **My Scores**: Track event attendance status and scores awarded by faculty.
5. **My Certificates**: Download event participation/achievement certificates generated on-demand.
6. **Other Certificates**: Upload external certifications against faculty eligibility rules (PIN range & branch) for extra credit.
7. **In-App Notifications**: Real-time notification center with unread counters and permanent clear options.
8. **Profile & Security**: Edit profile details and update account password.

### 👨‍🏫 Faculty Portal (`facultyDashboard.html`)
1. **Dashboard Home**: Event statistics overview, published events feed, and quick actions.
2. **Publish Event**: Create new events with participant limits, registration deadlines, and student/faculty co-coordinators.
3. **Update Event**: Modify existing event details with automatic event version incrementation.
4. **Registrations & Attendance**: View student rosters per event, mark attendance (present/absent toggle) with real-time email triggers.
5. **Score Management**: Assign scores (0-100) to attended students individually or via bulk update.
6. **Feedback Analytics**: View star rating summaries and written feedback comments submitted by students.
7. **Certificate Management**: Upload custom certificate background templates, preview dynamic certificate positioning, and issue certificates.
8. **Other Certificates Review**: Inspect, approve, or reject student external certificate submissions with custom marks attribution.
9. **Past Events Upload**: Archive completed events by uploading official event PDF reports and attendee records.
10. **Reports & Exports**: Download instant PDF attendance & score reports.

### 🏛️ Department Head (HOD) Portal (`departmentHeadDashboard.html`)
- Overview of all events published by department faculty.
- Departmental student registration trends, attendance rates, and score averages.
- Faculty performance tracking and departmental approval controls.

### 🎓 Dean Portal (`deanDashboard.html`)
- Campus-wide executive analytics across all branches (CSE, AIML, DS, IT, ECE, EEE, MECH, CIVIL).
- Inter-departmental comparison charts and top event highlights.
- Institutional oversight and event audit logs.

### 🛠️ Admin Portal (`adminDashboard.html`)
- User account CRUD management (Students, Faculty, HODs, Deans).
- Global system settings: Configure certificate retention periods (`certificateRetentionDays`, `otherCertRetentionDays`).
- Database backup tools and branch configuration updates.

---

## 6. API Route Reference Guide

| Module | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Faculty Auth** | `POST` | `/api/faculty/login` | Authenticate faculty account |
| | `GET` | `/api/faculty/profile/:facultyId` | Fetch faculty profile details |
| | `PUT` | `/api/faculty/profile/:facultyId` | Update faculty profile |
| | `PUT` | `/api/faculty/change-password/:facultyId` | Update faculty password |
| **Student Auth** | `POST` | `/api/student/login` | Authenticate student account |
| | `GET` | `/api/student/profile/:studentId` | Fetch student profile details |
| | `PUT` | `/api/student/profile/:studentId` | Update student profile |
| | `PUT` | `/api/student/change-password/:studentId` | Update student password |
| **Events** | `POST` | `/api/events` | Create new event |
| | `GET` | `/api/events` | Fetch all active events with registration counts |
| | `GET` | `/api/events/faculty/:facultyId` | Get events published by specific faculty |
| | `PUT` | `/api/events/:id` | Update event (increments version) |
| | `DELETE` | `/api/events/:id` | Delete event |
| **Registrations** | `POST` | `/api/registrations` | Register student for an event |
| | `GET` | `/api/registrations/student/:pinNumber` | Get registrations for a student |
| | `PUT` | `/api/registrations/attendance/:id` | Update student attendance |
| | `PUT` | `/api/registrations/score/:id` | Assign performance score |
| **Certificates** | `POST` | `/api/certificates/generate/:registrationId` | Dynamically render PDF certificate & save to Cloudinary |
| | `GET` | `/api/certificates/download/:registrationId` | On-demand certificate download / lazy regeneration |
| **Other Certs** | `POST` | `/api/other-certs/rule` | Faculty creates external certificate criteria rule |
| | `GET` | `/api/other-certs/eligible/:pinNumber` | Fetch active eligibility rules for a student PIN |
| | `POST` | `/api/other-certs/upload` | Student uploads external certificate file |
| | `PUT` | `/api/other-certs/review/:uploadId` | Faculty approves/rejects uploaded certificate |
| **Notifications** | `GET` | `/api/notifications` | Fetch targeted student notifications |
| | `GET` | `/api/notifications/faculty/:facultyId` | Fetch targeted faculty notifications |
| | `DELETE` | `/api/notifications/student/:pinNumber` | Permanently clear student notifications |
| | `DELETE` | `/api/notifications/faculty/:facultyId` | Permanently clear faculty notifications |
| **Branches** | `GET` | `/api/branches` | Fetch all dynamic academic branches |

---

## 7. Automated Background Services & Storage Cleanups

### 1. Retention Cleanup Engine (`utils/certificateCleanup.js`)
To optimize cloud storage limits on Cloudinary, CEM features an automated background retention cleaner:
- Runs automatically upon server boot and repeats every **6 hours** via `setInterval`.
- Inspects `SystemSetting` for `certificateRetentionDays` (default: 30 days) and `otherCertRetentionDays` (default: 30 days).
- Deletes expired raw certificate files from Cloudinary storage (`CEM_Certificates` and `CEM_OtherCerts`).
- Updates database record setting `certificateUrl = null` while preserving `hasCertificate = true`.
- **Lazy Regeneration**: When a student requests an expired certificate, the system regenerates the PDF on the fly seamlessly without re-uploading storage bloat.

### 2. Transactional Email Dispatcher (`emailService.js`)
Integrated with **Nodemailer** for automated communication:
- **Registration Confirmation**: HTML email with event date, time, venue, and student PIN.
- **Attendance Updates**: Immediate alert informing student whether marked Present or Absent.
- **Score Notifications**: Highlighted score card email sent upon faculty evaluation.

---

## 8. Setup & Running Instructions

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **MongoDB** (Local instance on `mongodb://localhost:27017` or MongoDB Atlas URI)

### Installation & Execution

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables (`.env`)**:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<user>:<password>@cem.c5r0uv0.mongodb.net/CEM?retryWrites=true&w=majority
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

3. **Start the Server**:
   ```bash
   npm start
   ```
   *Note: Server includes a port fallback mechanism. If port 5000 is occupied, it automatically increments and binds to port 5001, 5002, etc.*

4. **Access the Application**:
   Open browser at `http://localhost:5000`.

---
*Documentation auto-generated for College Event Management System (CEM).*
