# Student Dashboard Testing Guide

## ✅ Completed Changes

### 1. Student Dashboard (`public/studentDashboard.html`)
- **COMPLETED**: Full JavaScript implementation added
- **Features**:
  - Home tab with real-time stats (Available Events, Registrations, Attended, Total Score)
  - Available Events tab with card display and registration status check
  - My Registrations tab with table view
  - My Scores tab showing only attended events with scores
  - Profile tab with all student details
  - Auto-refresh on tab switch and page visibility change
  - "Already Registered" badge on event cards
  - One registration per student per event enforcement

### 2. Registration Page (`public/register.html`)
- **FIXED**: Updated to use consistent localStorage keys
- **Changes**:
  - Uses `selectedEventId` instead of `eventId`
  - Uses `studentData` instead of `user`
  - Auto-fills PIN number from logged-in student
  - Makes PIN field read-only
  - Fetches and displays event details
  - Redirects to dashboard after successful registration
  - Shows "Already Registered" alert and redirects if duplicate registration

### 3. Login Flow (`public/js/main.js`)
- **FIXED**: Updated to use consistent localStorage naming
- **Changes**:
  - Stores student data as `studentData` (not `user`)
  - Stores faculty data as `facultyData`
  - Consistent with dashboard expectations

### 4. Server Routes (`server.js`)
- **FIXED**: Updated registration route
- **Changes**:
  - Changed from `/api/register` to `/api/registrations`
  - Now consistent with frontend API calls

## 🧪 Testing Steps

### Step 1: Restart Server
```bash
# Stop current server (Ctrl+C in terminal)
# Start fresh server
node server.js
```

### Step 2: Test Login Flow
1. Open `http://localhost:5000/index.html`
2. Click "Student Login"
3. Enter credentials (use existing student from database)
4. Should redirect to `studentDashboard.html`
5. Verify student name appears in top-right corner

### Step 3: Test Home Tab
1. Should see 4 stat cards:
   - Available Events (count of all published events)
   - My Registrations (count of student's registrations)
   - Events Attended (count where attended = true)
   - Total Score (sum of all scores)
2. All counts should be accurate

### Step 4: Test Available Events Tab
1. Click "Available Events" in sidebar
2. Should see all published events in card format
3. Each card shows:
   - Event name
   - Date, time, venue
   - Description
   - Registration button OR "Already Registered" badge
4. Click "Register Now" on an event
5. Should redirect to registration page

### Step 5: Test Registration Flow
1. On registration page:
   - Event details should display at top
   - PIN number should be pre-filled and read-only
   - Fill in: Student Name, Branch, Section
   - Click "Submit Registration"
2. Should see success alert
3. Should redirect back to dashboard
4. Go to "Available Events" tab
5. The registered event should now show "Already Registered" badge
6. Home tab stats should update (My Registrations +1)

### Step 6: Test Duplicate Registration Prevention
1. Try to register for the same event again
2. Click the event card (should be disabled)
3. If you somehow bypass and submit:
   - Should see "Already Registered" alert
   - Should redirect to dashboard
   - No duplicate registration created

### Step 7: Test My Registrations Tab
1. Click "My Registrations" in sidebar
2. Should see table with all registered events
3. Columns: Event, Date, Time, Venue, Status
4. Status shows "Pending" or "Attended"

### Step 8: Test Faculty Marking Attendance
1. Open faculty dashboard in another browser/tab
2. Login as faculty
3. Find the event student registered for
4. Mark student as "Present"
5. Assign a score (e.g., 10)
6. Go back to student dashboard
7. Refresh or switch tabs
8. Home tab should update:
   - Events Attended +1
   - Total Score should increase

### Step 9: Test My Scores Tab
1. Click "My Scores" in sidebar
2. Should ONLY show events where attended = true
3. Should display score for each event
4. If no attended events, shows empty state message

### Step 10: Test Profile Tab
1. Click "Profile" in sidebar
2. Should show:
   - Student name and ID
   - Username
   - Student ID
   - Total Registrations count
   - Events Attended count
   - Total Score

### Step 11: Test Real-time Updates
1. Keep student dashboard open
2. In faculty dashboard, publish a new event
3. Switch to student dashboard
4. Click "Available Events" tab
5. New event should appear immediately
6. Home tab "Available Events" count should increase

### Step 12: Test Auto-refresh
1. Keep student dashboard open
2. Switch to another browser tab
3. In faculty dashboard, mark attendance or assign score
4. Switch back to student dashboard tab
5. Data should auto-refresh (page visibility change triggers reload)

## 🐛 Common Issues & Solutions

### Issue: Events not showing
- **Check**: Is server running on port 5000?
- **Check**: Are events published in database?
- **Solution**: Run `node mongodb-test-data.js` to add test data

### Issue: "Already Registered" not showing
- **Check**: Is PIN number consistent between login and registration?
- **Check**: Browser console for errors
- **Solution**: Clear localStorage and login again

### Issue: Stats not updating
- **Check**: Browser console for API errors
- **Check**: Network tab to see if API calls are successful
- **Solution**: Refresh page or switch tabs to trigger reload

### Issue: Registration fails
- **Check**: Server console for errors
- **Check**: MongoDB connection is active
- **Check**: Event ID is valid
- **Solution**: Verify `/api/registrations` route is working

### Issue: Scores not showing
- **Check**: Has faculty marked attendance as true?
- **Check**: Has faculty assigned a score?
- **Solution**: Scores only show for attended events

## 📝 API Endpoints Used

- `GET /api/events` - Fetch all events
- `GET /api/registrations/student/:pinNumber` - Fetch student registrations
- `POST /api/registrations` - Create new registration
- `POST /api/student/login` - Student login

## 🎯 Expected Behavior

1. **One Registration Per Event**: Student can only register once per event
2. **Real-time Updates**: All data refreshes when switching tabs
3. **Auto-refresh**: Data reloads when page becomes visible
4. **Consistent PIN**: Same PIN used for login and registration
5. **Status Badges**: Clear visual indicators for registration status
6. **Empty States**: Friendly messages when no data available
7. **Centered Content**: All content properly centered in tabs
8. **Professional UI**: Clean, modern design matching the theme

## ✨ Success Criteria

- ✅ Student can login and see dashboard
- ✅ All 5 tabs work correctly
- ✅ Stats update in real-time
- ✅ Events display with correct registration status
- ✅ Registration flow works end-to-end
- ✅ Duplicate registrations prevented
- ✅ Faculty changes reflect in student dashboard
- ✅ Scores only show for attended events
- ✅ Profile shows accurate information
- ✅ Auto-refresh works on tab visibility change
