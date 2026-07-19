# College Event Management System (CEM)

A full-stack web application for managing college events with separate portals for faculty and students.

## Features

- Faculty Portal: Publish and manage events
- Student Portal: View and register for events
- MongoDB database integration
- Real-time event updates

## Setup Instructions

1. Make sure MongoDB is installed and running on your system
2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm start
   ```

4. Open your browser and go to: `http://localhost:5000`

## Default Test Credentials

You'll need to add test users to MongoDB first. Open MongoDB Compass or use mongosh:

```javascript
// Add a test faculty user
db.faculties.insertOne({
  facultyId: "FAC001",
  username: "faculty",
  password: "faculty123"
})

// Add a test student user
db.students.insertOne({
  studentId: "STU001",
  username: "student",
  password: "student123"
})
```

## Project Structure

- `/config` - Database configuration
- `/models` - MongoDB schemas
- `/routes` - API endpoints
- `/public` - Frontend files (HTML, CSS, JS)
- `server.js` - Main server file

## API Endpoints

- `POST /api/faculty/login` - Faculty login
- `POST /api/student/login` - Student login
- `POST /api/events/publish` - Publish new event
- `GET /api/events` - Get all events
- `POST /api/register` - Register for an event
