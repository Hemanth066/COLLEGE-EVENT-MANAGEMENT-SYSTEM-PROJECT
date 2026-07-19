# Registration Deadline Feature

## Overview
Events now support automatic expiration based on registration deadlines. Once the deadline passes, events automatically disappear from student view.

## How It Works

### For Faculty (Publishing Events)
1. When publishing an event in `publishEvent.html`, faculty MUST set a registration deadline
2. The deadline field is now required and includes a helpful note
3. Format: Date and Time (datetime-local input)

### For Students (Viewing Events)
1. Students only see events where:
   - No deadline is set (legacy events), OR
   - The registration deadline is in the future
2. Once the deadline passes, the event automatically disappears from:
   - Available Events tab
   - Event cards
   - Registration options

### Technical Implementation

#### Event Model (`models/Event.js`)
```javascript
registrationDeadline: String // Stores the deadline date-time
```

#### Client-Side Filtering
Both `public/js/student.js` and `public/studentDashboard.html` filter events:

```javascript
const now = new Date();
allEvents = allEventsFromAPI.filter(event => {
  if (!event.registrationDeadline) return true; // Show events without deadline
  const deadline = new Date(event.registrationDeadline);
  return deadline > now; // Only show events with future deadlines
});
```

#### Display
Events show the deadline prominently:
- Red text with ⏳ icon
- Format: "Register by: Dec 31, 2024, 11:59 PM"

## Benefits
1. **Automatic Management**: No manual intervention needed to hide expired events
2. **Clear Communication**: Students see exactly when registration closes
3. **Better Organization**: Only relevant events are displayed
4. **Backward Compatible**: Events without deadlines still work

## Testing
1. Publish an event with a deadline in the future → Event appears for students
2. Publish an event with a deadline in the past → Event does NOT appear for students
3. Wait for a deadline to pass → Event automatically disappears from student view
4. Refresh the page → Filtering happens automatically on each load

## Notes
- Filtering happens on the client side (browser)
- Events are not deleted from the database
- Faculty can still see all their events regardless of deadline
- The deadline is stored as a string in ISO format
