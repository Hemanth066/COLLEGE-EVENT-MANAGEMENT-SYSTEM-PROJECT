# Attendance & Score Management System

## Overview
Complete attendance tracking and score assignment system for the College Event Management System.

## Features Implemented

### 1. Database Model Updates
- Added `attended` field (Boolean, default: false)
- Added `score` field (Number, default: 0)

### 2. Faculty Dashboard Features

#### All Registrations Tab
- View all student registrations in a table
- **Attendance Column**: Toggle button to mark students as Present/Absent
  - ✅ Present (Green button)
  - ❌ Absent (Red button)
- **Score Column**: Display current score
- **Actions Column**: 
  - Input field to enter score (0-100)
  - Submit button to assign score
  - Both disabled until student is marked as Present

#### Workflow:
1. Faculty views all registrations
2. Marks attendance (Present/Absent)
3. For attended students, enters score and submits
4. Score is saved to database

### 3. Student Dashboard Features

#### New "Check Score" Tab (🏆)
- Displays total score across all attended events
- Shows individual scores for each attended event
- Event details included (title, date, time, venue)
- Visual score display with large numbers
- Only shows events where attendance was marked

#### Score Card Features:
- Total score summary at top
- Individual event scores below
- Attended badge indicator
- Points display

### 4. API Endpoints

#### Mark Attendance
```
PUT /api/register/attendance/:id
Body: { attended: true/false }
```

#### Assign Score
```
PUT /api/register/score/:id
Body: { score: 0-100 }
```

#### Get All Registrations
```
GET /api/register/all
Returns: Array of registrations with attended and score fields
```

## Usage Instructions

### For Faculty:
1. Login to Faculty Dashboard
2. Go to "All Registrations" tab
3. Click attendance button to mark Present/Absent
4. For Present students, enter score (0-100) and click Submit
5. Scores are immediately saved

### For Students:
1. Login to Student Dashboard
2. Go to "Check Score" tab
3. View total score and individual event scores
4. Only attended events with scores will be displayed

## Database Schema

```javascript
{
  studentName: String,
  pinNumber: String,
  branch: String,
  section: String,
  eventId: ObjectId,
  attended: Boolean (default: false),
  score: Number (default: 0)
}
```

## Notes
- Scores can only be assigned to students marked as Present
- Score range: 0-100
- Students can only see scores for events they attended
- Faculty can update attendance and scores anytime
