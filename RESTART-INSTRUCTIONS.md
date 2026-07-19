# CRITICAL: Server Must Be Restarted

## The Problem
The server is still using the old route `/api/register` but the frontend is calling `/api/registrations`.

## Solution - Restart the Server

### Step 1: Stop the Current Server
1. Go to the terminal where `node server.js` is running
2. Press `Ctrl + C` to stop it
3. Wait for it to fully stop

### Step 2: Start the Server Again
```bash
node server.js
```

### Step 3: Verify Routes Are Loaded
You should see this output:
```
MongoDB Connected ✅
Routes imported successfully
Routes registered:
  - /api/faculty
  - /api/student
  - /api/events
  - /api/registrations    <-- This must say "registrations" not "register"
Server running on http://localhost:5000
```

### Step 4: Test the Application
1. Clear browser cache (Ctrl + Shift + Delete)
2. Refresh the page (Ctrl + F5)
3. Login as student1 / pass123
4. Try registering for an event

## If You Still See Errors

Run this test to verify the server:
```bash
node testServer.js
```

This will check if all endpoints are working correctly.

## Common Issues

### Issue: "Cannot find module 'node-fetch'"
Solution: The testServer.js needs node-fetch. You can skip this test and just verify manually by:
1. Open browser to http://localhost:5000/test
2. You should see "Server Working 🚀"

### Issue: Port 5000 already in use
Solution: Kill all node processes first:
```bash
taskkill /F /IM node.exe
```
Then start the server again.

### Issue: MongoDB not connected
Solution: Make sure MongoDB is running on port 27017
