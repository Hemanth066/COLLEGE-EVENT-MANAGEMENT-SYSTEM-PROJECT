# Update Features Implementation Summary

## ✅ Completed:
1. Added UPDATE and DELETE routes to `routes/eventroutes.js`
2. Added "Update Event" menu item to sidebar

## 🔧 To Complete Manually:

### 1. Add Update Event Tab (after Publish Event tab)
Add this HTML after the `<!-- PUBLISH EVENT TAB -->` section:

```html
<!-- UPDATE EVENT TAB -->
<div id="updateEvent" class="tab-content">
  <div class="content-header">
    <h1>✏️ Update Event</h1>
    <p>Select and update existing events</p>
  </div>

  <div class="form-container">
    <div class="form-group">
      <label>Select Event to Update</label>
      <select id="eventToUpdate" onchange="loadEventData()">
        <option value="">-- Select an Event --</option>
      </select>
    </div>

    <form id="updateEventForm" style="display: none;">
      <!-- Same fields as publish event form but with "update" prefix -->
      <button type="submit" class="submit-btn">✅ Update Event</button>
    </form>
  </div>
</div>
```

### 2. Add Search Dropdowns
In All Registrations tab header, replace:
```html
<span class="count" id="regCount">0 Registrations</span>
```
With:
```html
<div style="display: flex; gap: 15px;">
  <select id="filterEventReg" onchange="filterRegistrations()">
    <option value="">All Events</option>
  </select>
  <span class="count" id="regCount">0 Registrations</span>
</div>
```

Same for Attendance tab with `filterEventAtt` and `filterAttendance()`.

### 3. Add JavaScript Functions
Add these functions before the closing `</script>` tag:

```javascript
// Populate event dropdowns
function populateEventFilters() {
  const regFilter = document.getElementById('filterEventReg');
  const attFilter = document.getElementById('filterEventAtt');
  const updateSelect = document.getElementById('eventToUpdate');
  
  allEvents.forEach(event => {
    const option1 = `<option value="${event._id}">${event.title}</option>`;
    regFilter.innerHTML += option1;
    attFilter.innerHTML += option1;
    updateSelect.innerHTML += option1;
  });
}

// Filter registrations by event
function filterRegistrations() {
  const eventId = document.getElementById('filterEventReg').value;
  const tbody = document.getElementById('registrationsBody');
  
  const filtered = eventId ? 
    allRegistrations.filter(reg => reg.eventId === eventId) : 
    allRegistrations;
  
  // Re-display with filtered data
  displayFilteredRegistrations(filtered);
}

// Filter attendance by event
function filterAttendance() {
  const eventId = document.getElementById('filterEventAtt').value;
  const filtered = eventId ?
    allRegistrations.filter(reg => reg.attended && reg.eventId === eventId) :
    allRegistrations.filter(reg => reg.attended);
  
  displayFilteredAttendance(filtered);
}

// Load event data for updating
function loadEventData() {
  const eventId = document.getElementById('eventToUpdate').value;
  if (!eventId) {
    document.getElementById('updateEventForm').style.display = 'none';
    return;
  }
  
  const event = allEvents.find(e => e._id === eventId);
  if (event) {
    document.getElementById('updateTitle').value = event.title;
    document.getElementById('updateDescription').value = event.description;
    document.getElementById('updateVenue').value = event.venue;
    document.getElementById('updateDate').value = event.date;
    document.getElementById('updateTime').value = event.time;
    document.getElementById('updateFaculty').value = event.faculty;
    document.getElementById('updateFacultyPhone').value = event.facultyPhone;
    document.getElementById('updateStudent').value = event.student;
    document.getElementById('updateStudentPhone').value = event.studentPhone;
    
    document.getElementById('updateEventForm').style.display = 'block';
  }
}

// Handle update event form submission
document.getElementById('updateEventForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const eventId = document.getElementById('eventToUpdate').value;
  const eventData = {
    title: document.getElementById('updateTitle').value,
    description: document.getElementById('updateDescription').value,
    venue: document.getElementById('updateVenue').value,
    date: document.getElementById('updateDate').value,
    time: document.getElementById('updateTime').value,
    faculty: document.getElementById('updateFaculty').value,
    facultyPhone: document.getElementById('updateFacultyPhone').value,
    student: document.getElementById('updateStudent').value,
    studentPhone: document.getElementById('updateStudentPhone').value
  };

  try {
    const response = await fetch(`http://localhost:5000/api/events/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData)
    });

    const result = await response.json();

    if (response.ok) {
      alert("✅ " + result.message);
      await loadEvents();
      displayEvents();
      populateEventFilters();
    } else {
      alert("❌ " + result.message);
    }
  } catch (error) {
    alert("❌ Server error");
    console.error(error);
  }
});
```

### 4. Call populateEventFilters()
Add this line in the `displayEvents()` function at the end:
```javascript
populateEventFilters();
```

## 🚀 Quick Implementation:
The server routes are ready. Just need to add the UI elements and JavaScript functions to faculty dashboard.

## ✅ Server is Running
Port: 5000
All routes active including PUT /api/events/:id
