// Faculty Dashboard JavaScript - Version 1.0
let allEvents = [];
let allRegistrations = [];
let currentFaculty = null;

// Load data on page load
document.addEventListener("DOMContentLoaded", async () => {
  // Get current faculty from localStorage - check both old and new keys
  currentFaculty = JSON.parse(localStorage.getItem("facultyData")) || JSON.parse(localStorage.getItem("user"));
  
  console.log("Current faculty from localStorage:", currentFaculty);
  console.log("Faculty ID:", currentFaculty?.facultyId);
  console.log("Faculty _id:", currentFaculty?._id);
  
  // If no faculty logged in, redirect to login
  if (!currentFaculty) {
    alert("❌ Please login first");
    window.location.href = "index.html";
    return;
  }
  
  // Use _id if facultyId is not available
  if (!currentFaculty.facultyId && currentFaculty._id) {
    currentFaculty.facultyId = currentFaculty._id;
  }
  
  await loadEvents();
  await loadRegistrations();
  updateStats();
  displayEvents();
  populateEventFilters();
  displayAllRegistrations();
});

async function loadEvents() {
  try {
    // Use _id if facultyId is not available
    const facultyIdentifier = currentFaculty.facultyId || currentFaculty._id;
    console.log('Loading events for faculty:', facultyIdentifier);
    
    // Load only events published by this faculty
    const response = await fetch(`/api/events/faculty/${facultyIdentifier}`);
    if (response.ok) {
      allEvents = await response.json();
      console.log("Events loaded for faculty:", allEvents.length);
    } else {
      console.error("Failed to load events:", response.status);
      allEvents = [];
    }
  } catch (error) {
    console.error("Error loading events:", error);
    allEvents = [];
  }
}

async function loadRegistrations() {
  try {
    const response = await fetch("/api/registrations/all");
    if (response.ok) {
      const allRegs = await response.json();
      
      // Filter registrations to only show those for this faculty's events
      allRegistrations = allRegs.filter(reg => {
        const regEventId = typeof reg.eventId === 'string' ? reg.eventId : reg.eventId?._id;
        return allEvents.some(event => event._id === regEventId);
      });
      
      console.log("Registrations loaded for faculty's events:", allRegistrations.length);
    } else {
      console.error("Failed to load registrations:", response.status);
      allRegistrations = [];
    }
  } catch (error) {
    console.error("Error loading registrations:", error);
    allRegistrations = [];
  }
}

function updateStats() {
  // Only count registrations for events that still exist
  const validRegistrations = allRegistrations.filter(reg => {
    const regEventId = typeof reg.eventId === 'string' ? reg.eventId : reg.eventId?._id;
    return allEvents.find(e => e._id === regEventId);
  });
  
  document.getElementById("totalEvents").textContent = allEvents.length;
  document.getElementById("totalRegistrations").textContent = validRegistrations.length;
  
  const avg = allEvents.length > 0 ? Math.round(validRegistrations.length / allEvents.length) : 0;
  document.getElementById("avgRegistrations").textContent = avg;
}

function displayEvents() {
  const eventsGrid = document.getElementById("eventsGrid");

  console.log("displayEvents called");
  console.log("allEvents:", allEvents.length);
  console.log("allRegistrations:", allRegistrations.length);

  if (!allEvents.length) {
    eventsGrid.innerHTML = `
      <div class="no-data">
        <div class="no-data-icon">📭</div>
        <p>No events published yet. Create your first event!</p>
      </div>
    `;
    return;
  }

  eventsGrid.innerHTML = "";

  allEvents.forEach(event => {
    // Fix: Handle both string and object eventId
    const registrations = allRegistrations.filter(reg => {
      const regEventId = typeof reg.eventId === 'string' ? reg.eventId : reg.eventId?._id;
      return regEventId === event._id;
    });
    
    console.log(`Event ${event.title}: ${registrations.length} registrations`);
    
    const eventCard = document.createElement("div");
    eventCard.className = "event-card";
    eventCard.innerHTML = `
      <h4>📌 ${event.title}</h4>
      <p>${event.description || "No description provided"}</p>
      
      <div class="event-meta">
        <div class="meta-item">📍 ${event.venue || "TBA"}</div>
        <div class="meta-item">📅 ${event.date || "TBA"}</div>
        <div class="meta-item">🕐 ${event.time || "TBA"}</div>
      </div>
      
      <span class="badge success">👥 ${registrations.length} Registered</span>
      
      ${registrations.length > 0 ? `
        <button class="view-btn" onclick="toggleRegistrations('${event._id}')">
          View Registrations ▼
        </button>
        
        <div class="registrations-list" id="reg-${event._id}">
          ${registrations.map((reg, index) => `
            <div class="registration-item">
              <strong>${index + 1}. ${reg.studentName}</strong>
              PIN: ${reg.pinNumber} | ${reg.branch} - Section ${reg.section}
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
    
    eventsGrid.appendChild(eventCard);
  });
  
  // Populate event filter dropdowns
  populateEventFilters();
}

function displayAllRegistrations() {
  const tbody = document.getElementById("registrationsBody");
  const regCount = document.getElementById("regCount");

  regCount.textContent = `${allRegistrations.length} Registrations`;

  if (!allRegistrations.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: #999;">
          No registrations yet
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = "";

  allRegistrations.forEach((reg, index) => {
    const event = allEvents.find(e => e._id === reg.eventId);
    
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${reg.studentName}</td>
      <td>${reg.pinNumber}</td>
      <td>${reg.branch}</td>
      <td>${reg.section}</td>
      <td>${reg.year || 'N/A'}</td>
      <td>${event?.title || 'Unknown Event'}</td>
      <td>
        <button class="attendance-btn ${reg.attended ? 'present' : 'absent'}" 
                data-reg-id="${reg._id}" 
                data-attended="${reg.attended}">
          ${reg.attended ? '✅ Present' : '❌ Absent'}
        </button>
      </td>
    `;
    tbody.appendChild(row);
    
    // Add event listener to the button
    const button = row.querySelector('.attendance-btn');
    button.addEventListener('click', function() {
      const regId = this.getAttribute('data-reg-id');
      const currentAttended = this.getAttribute('data-attended') === 'true';
      toggleAttendance(regId, !currentAttended);
    });
  });
  
  displayAttendedStudents();
}

function displayAttendedStudents() {
  const tbody = document.getElementById("attendanceBody");
  const attendedCount = document.getElementById("attendedCount");

  const attendedStudents = allRegistrations.filter(reg => reg.attended);

  attendedCount.textContent = `${attendedStudents.length} Students`;

  if (!attendedStudents.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 40px; color: #999;">
          No students marked as attended yet
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = "";

  attendedStudents.forEach((reg, index) => {
    const event = allEvents.find(e => e._id === reg.eventId);
    
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${reg.studentName}</td>
      <td>${reg.pinNumber}</td>
      <td>${reg.branch}</td>
      <td>${reg.section}</td>
      <td>${reg.year || 'N/A'}</td>
      <td>${event?.title || "N/A"}</td>
      <td><span class="badge success">${reg.score || 0}</span></td>
      <td>
        <input 
          type="number" 
          min="0" 
          max="100" 
          value="${reg.score || 0}" 
          id="score-${reg._id}"
          style="width:90px; padding:8px 10px; border-radius:8px; font-size:14px; font-family:'Poppins',sans-serif; text-align:center; background:rgba(79,110,247,0.1); border:1px solid rgba(79,110,247,0.3); color:white; outline:none; cursor:text; position:relative; z-index:10;" onfocus="this.style.borderColor='#4f6ef7'" onblur="this.style.borderColor='rgba(79,110,247,0.3)'"
        >
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Toggle attendance
async function toggleAttendance(regId, attended) {
  try {
    console.log("Toggling attendance:", regId, attended);
    
    if (!regId) {
      showPopup('❌', 'Error', 'Registration ID is missing', 'error');
      return;
    }
    
    const url = `/api/registrations/attendance/${regId}`;
    console.log("Calling URL:", url);
    
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attended })
    });

    console.log("Response status:", response.status);
    
    if (!response.ok) {
      const text = await response.text();
      console.error("Response text:", text);
      showPopup('❌', 'Server Error', `Error ${response.status}: ${text}`, 'error');
      return;
    }

    const result = await response.json();
    console.log("Response:", result);

    if (response.ok) {
      // Reload data and reapply filter
      await loadRegistrations();
      filterRegistrations();
      filterAttendance();
      showPopup(
        attended ? '✅' : '❌', 
        'Attendance Updated', 
        attended ? 'Student marked as Present' : 'Student marked as Absent', 
        'success'
      );
    } else {
      showPopup('❌', 'Error', result.message, 'error');
    }
  } catch (error) {
    console.error("Error updating attendance:", error);
    showPopup('❌', 'Server Error', error.message, 'error');
  }
}

// Populate event filter dropdowns
function populateEventFilters() {
  const regFilter = document.getElementById('filterEventReg');
  const attFilter = document.getElementById('filterEventAtt');
  const updateSelect = document.getElementById('eventToUpdate');
  const certFilter = document.getElementById('filterEventCert');
  
  // Clear existing options
  regFilter.innerHTML = '<option value="">🔍 Select an event to view registrations...</option>';
  attFilter.innerHTML = '<option value="">🔍 Select an event to view attendance...</option>';
  updateSelect.innerHTML = '<option value="">🔍 Select an event to update...</option>';
  certFilter.innerHTML = '<option value="">🔍 Select an event to upload certificates...</option>';
  
  // Only show events that exist
  if (allEvents.length === 0) {
    regFilter.innerHTML = '<option value="">No events available</option>';
    attFilter.innerHTML = '<option value="">No events available</option>';
    updateSelect.innerHTML = '<option value="">No events available</option>';
    certFilter.innerHTML = '<option value="">No events available</option>';
    return;
  }
  
  allEvents.forEach((event, index) => {
    const option1 = `<option value="${event._id}">${event.title} (v${event.version || 1})</option>`;
    regFilter.innerHTML += option1;
    attFilter.innerHTML += option1;
    updateSelect.innerHTML += option1;
    certFilter.innerHTML += option1;
  });
}

// Filter registrations by event
function filterRegistrations() {
  const eventId = document.getElementById('filterEventReg').value;
  const tbody = document.getElementById('registrationsBody');
  const regCount = document.getElementById('regCount');
  const tableContainer = document.getElementById('registrationsTableContainer');
  
  console.log("Filtering registrations for eventId:", eventId);
  
  // If no events exist
  if (allEvents.length === 0) {
    if (tableContainer) {
      tableContainer.style.display = 'none';
    }
    regCount.textContent = 'No events available';
    return;
  }
  
  // If no event selected, hide table
  if (!eventId) {
    if (tableContainer) {
      tableContainer.style.display = 'none';
    }
    regCount.textContent = 'Select an event';
    return;
  }
  
  // Show table when event is selected
  if (tableContainer) {
    tableContainer.style.display = 'block';
  }
  
  // Filter registrations for this event AND ensure event still exists
  const filtered = allRegistrations.filter(reg => {
    const regEventId = typeof reg.eventId === 'string' ? reg.eventId : reg.eventId?._id;
    const eventExists = allEvents.find(e => e._id === regEventId);
    return regEventId === eventId && eventExists;
  });
  
  regCount.textContent = `${filtered.length} Registrations`;
  
  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: #999;">
          No registrations found for this event
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = "";
  filtered.forEach((reg, index) => {
    // Find event by matching ID
    const regEventId = typeof reg.eventId === 'string' ? reg.eventId : reg.eventId?._id;
    const event = allEvents.find(e => e._id === regEventId);
    
    console.log(`Registration ${index}: eventId=${regEventId}, found event:`, event?.title);
    
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${reg.studentName}</td>
      <td>${reg.pinNumber}</td>
      <td>${reg.branch}</td>
      <td>${reg.section}</td>
      <td>${reg.year || 'N/A'}</td>
      <td>${event?.title || "Unknown Event"}</td>
      <td>
        <button 
          class="attendance-btn ${reg.attended ? 'present' : 'absent'}" 
          onclick="toggleAttendance('${reg._id}', ${!reg.attended})">
          ${reg.attended ? '✅ Present' : '❌ Absent'}
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Filter attendance by event
function filterAttendance() {
  const eventId = document.getElementById('filterEventAtt').value;
  const tbody = document.getElementById('attendanceBody');
  const attendedCount = document.getElementById('attendedCount');
  const tableContainer = document.getElementById('attendanceTableContainer');
  
  console.log("Filtering attendance for eventId:", eventId);
  
  // If no events exist
  if (allEvents.length === 0) {
    if (tableContainer) {
      tableContainer.style.display = 'none';
    }
    attendedCount.textContent = 'No events available';
    return;
  }
  
  // If no event selected, hide table
  if (!eventId) {
    if (tableContainer) {
      tableContainer.style.display = 'none';
    }
    attendedCount.textContent = 'Select an event';
    return;
  }
  
  // Show table when event is selected
  if (tableContainer) {
    tableContainer.style.display = 'block';
  }
  
  // Filter attended students for this event AND ensure event still exists
  const filtered = allRegistrations.filter(reg => {
    const regEventId = typeof reg.eventId === 'string' ? reg.eventId : reg.eventId?._id;
    const eventExists = allEvents.find(e => e._id === regEventId);
    return reg.attended && regEventId === eventId && eventExists;
  });
  
  attendedCount.textContent = `${filtered.length} Students`;
  
  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 40px; color: #999;">
          No attended students for this event yet
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = "";
  filtered.forEach((reg, index) => {
    // Find event by matching ID
    const regEventId = typeof reg.eventId === 'string' ? reg.eventId : reg.eventId?._id;
    const event = allEvents.find(e => e._id === regEventId);
    
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${reg.studentName}</td>
      <td>${reg.pinNumber}</td>
      <td>${reg.branch}</td>
      <td>${reg.section}</td>
      <td>${reg.year || 'N/A'}</td>
      <td>${event?.title || "Unknown Event"}</td>
      <td><span class="badge success">${reg.score || 0}</span></td>
      <td>
        <input 
          type="number" 
          min="0" 
          max="100" 
          value="${reg.score || 0}" 
          id="score-${reg._id}"
          style="width:90px; padding:8px 10px; border-radius:8px; font-size:14px; font-family:'Poppins',sans-serif; text-align:center; background:rgba(79,110,247,0.1); border:1px solid rgba(79,110,247,0.3); color:white; outline:none; cursor:text; position:relative; z-index:10;" onfocus="this.style.borderColor='#4f6ef7'" onblur="this.style.borderColor='rgba(79,110,247,0.3)'"
        >
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Other utility functions
function toggleRegistrations(eventId) {
  const regList = document.getElementById(`reg-${eventId}`);
  regList.style.display = regList.style.display === 'block' ? 'none' : 'block';
}

async function changeFacultyPassword() {
  const currentPwd   = document.getElementById('facultyCurrentPwd').value.trim();
  const newPwd       = document.getElementById('facultyNewPwd').value.trim();
  const confirmPwd   = document.getElementById('facultyConfirmPwd').value.trim();

  if (!currentPwd || !newPwd || !confirmPwd) {
    showPopup('⚠️', 'Missing Fields', 'Please fill in all password fields.', 'error');
    return;
  }
  if (newPwd.length < 6) {
    showPopup('⚠️', 'Too Short', 'New password must be at least 6 characters.', 'error');
    return;
  }
  if (newPwd !== confirmPwd) {
    showPopup('⚠️', 'Mismatch', 'New password and confirm password do not match.', 'error');
    return;
  }

  const facultyId = currentFaculty?.facultyId || currentFaculty?._id;
  try {
    const res = await fetch(`/api/faculty/change-password/${facultyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd })
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('facultyCurrentPwd').value = '';
      document.getElementById('facultyNewPwd').value = '';
      document.getElementById('facultyConfirmPwd').value = '';
      showPopup('✅', 'Password Changed', 'Your password has been updated successfully.', 'success');
    } else {
      showPopup('❌', 'Failed', data.message || 'Could not change password.', 'error');
    }
  } catch (err) {
    showPopup('❌', 'Error', 'Network error. Please try again.', 'error');
  }
}

function logout() {
  if (confirm("Are you sure you want to logout?")) {
    window.location.href = "index.html";
  }
}

// Save all scores
async function saveAllScores() {
  const eventId = document.getElementById('filterEventAtt').value;
  
  if (!eventId) {
    showPopup('⚠️', 'No Event Selected', 'Please select an event first', 'error');
    return;
  }
  
  // Only get attended students for the selected event
  const attendedStudents = allRegistrations.filter(reg => {
    const regEventId = typeof reg.eventId === 'string' ? reg.eventId : reg.eventId?._id;
    return reg.attended && regEventId === eventId;
  });
  
  if (!attendedStudents.length) {
    showPopup('⚠️', 'No Students Found', 'No attended students to assign scores for this event', 'error');
    return;
  }

  let errorCount = 0;
  let successCount = 0;
  let invalidScores = [];

  for (const reg of attendedStudents) {
    const scoreInput = document.getElementById(`score-${reg._id}`);
    
    // Check if input exists
    if (!scoreInput) {
      console.warn(`Score input not found for registration ${reg._id}`);
      continue;
    }
    
    const score = parseInt(scoreInput.value);

    if (isNaN(score) || score < 0 || score > 100) {
      errorCount++;
      invalidScores.push(reg.studentName);
      continue;
    }

    try {
      const response = await fetch(`/api/registrations/score/${reg._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score })
      });

      if (response.ok) {
        successCount++;
      } else {
        errorCount++;
      }
    } catch (error) {
      console.error("Error saving score:", error);
      errorCount++;
    }
  }

  // Reload data
  await loadRegistrations();
  filterRegistrations();
  filterAttendance();

  // Show appropriate popup
  if (errorCount === 0) {
    showPopup(
      '✅', 
      'Scores Saved Successfully!', 
      `All ${successCount} scores have been saved successfully.`, 
      'success'
    );
  } else if (successCount > 0) {
    const invalidMsg = invalidScores.length > 0 ? `\n\nInvalid scores (must be 0-100) for: ${invalidScores.join(', ')}` : '';
    showPopup(
      '⚠️', 
      'Partially Saved', 
      `${successCount} scores saved successfully. ${errorCount} failed.${invalidMsg}`, 
      'error'
    );
  } else {
    const invalidMsg = invalidScores.length > 0 ? `\n\nInvalid scores (must be 0-100) for: ${invalidScores.join(', ')}` : '';
    showPopup(
      '❌', 
      'Save Failed', 
      `Failed to save scores. Please check the values and try again.${invalidMsg}`, 
      'error'
    );
  }
}

// Show popup notification
function showPopup(icon, title, message, type = 'success') {
  const overlay = document.getElementById('popupOverlay');
  const popup = document.getElementById('popupNotification');
  const popupIcon = document.getElementById('popupIcon');
  const popupTitle = document.getElementById('popupTitle');
  const popupMessage = document.getElementById('popupMessage');
  const popupBtn = document.getElementById('popupBtn');
  
  popupIcon.textContent = icon;
  popupTitle.textContent = title;
  popupMessage.textContent = message;
  
  // Update button style based on type
  if (type === 'error') {
    popupBtn.classList.add('error');
  } else {
    popupBtn.classList.remove('error');
  }
  
  overlay.classList.add('show');
  popup.classList.add('show');
}

// Close popup notification
function closePopup() {
  const overlay = document.getElementById('popupOverlay');
  const popup = document.getElementById('popupNotification');
  
  overlay.classList.remove('show');
  popup.classList.remove('show');
}

// Load event data for updating
function loadEventData() {
  const eventId = document.getElementById('eventToUpdate').value;
  const form = document.getElementById('updateEventForm');
  
  if (!eventId) {
    form.style.display = 'none';
    return;
  }
  
  const event = allEvents.find(e => e._id === eventId);
  if (event) {
    document.getElementById('updateTitle').value = event.title || '';
    document.getElementById('updateDescription').value = event.description || '';
    document.getElementById('updateVenue').value = event.venue || '';
    document.getElementById('updateDate').value = event.date || '';
    document.getElementById('updateTime').value = event.time || '';
    
    // Handle registration deadline - convert to datetime-local format if exists
    if (event.registrationDeadline) {
      const deadline = new Date(event.registrationDeadline);
      const year = deadline.getFullYear();
      const month = String(deadline.getMonth() + 1).padStart(2, '0');
      const day = String(deadline.getDate()).padStart(2, '0');
      const hours = String(deadline.getHours()).padStart(2, '0');
      const minutes = String(deadline.getMinutes()).padStart(2, '0');
      document.getElementById('updateRegistrationDeadline').value = `${year}-${month}-${day}T${hours}:${minutes}`;
    } else {
      document.getElementById('updateRegistrationDeadline').value = '';
    }
    
    document.getElementById('updateFaculty').value = event.faculty || '';
    document.getElementById('updateFacultyPhone').value = event.facultyPhone || '';
    document.getElementById('updateStudent').value = event.student || '';
    document.getElementById('updateStudentPhone').value = event.studentPhone || '';
    document.getElementById('updateMaxParticipants').value = event.maxParticipants || '';
    
    form.style.display = 'block';
    form.style.opacity = '0';
    setTimeout(() => {
      form.style.transition = 'opacity 0.3s ease';
      form.style.opacity = '1';
    }, 10);
    
    setTimeout(() => {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}

// Handle update event form submission
async function handleUpdateEvent(e) {
  e.preventDefault();
  
  const eventId = document.getElementById('eventToUpdate').value;
  const eventData = {
    title: document.getElementById('updateTitle').value,
    description: document.getElementById('updateDescription').value,
    venue: document.getElementById('updateVenue').value,
    date: document.getElementById('updateDate').value,
    time: document.getElementById('updateTime').value,
    registrationDeadline: document.getElementById('updateRegistrationDeadline').value,
    faculty: document.getElementById('updateFaculty').value,
    facultyPhone: document.getElementById('updateFacultyPhone').value,
    student: document.getElementById('updateStudent').value,
    studentPhone: document.getElementById('updateStudentPhone').value,
    maxParticipants: document.getElementById('updateMaxParticipants').value
      ? parseInt(document.getElementById('updateMaxParticipants').value) : null
  };

  try {
    const response = await fetch(`/api/events/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData)
    });

    const result = await response.json();

    if (response.ok) {
      showPopup(
        '✅', 
        'Event Updated Successfully!', 
        'Event version has been incremented. Students can now register again for the updated event!', 
        'success'
      );
      await loadEvents();
      displayEvents();
      cancelUpdate();
    } else {
      showPopup('❌', 'Update Failed', result.message, 'error');
    }
  } catch (error) {
    showPopup('❌', 'Server Error', 'Failed to update event. Please try again.', 'error');
    console.error(error);
  }
}

// Cancel update
function cancelUpdate() {
  const form = document.getElementById('updateEventForm');
  const select = document.getElementById('eventToUpdate');
  
  form.style.display = 'none';
  select.value = '';
  
  document.getElementById('updateTitle').value = '';
  document.getElementById('updateDescription').value = '';
  document.getElementById('updateVenue').value = '';
  document.getElementById('updateDate').value = '';
  document.getElementById('updateTime').value = '';
  document.getElementById('updateFaculty').value = '';
  document.getElementById('updateFacultyPhone').value = '';
  document.getElementById('updateStudent').value = '';
  document.getElementById('updateStudentPhone').value = '';
}


// Publish Event Handler
async function handlePublishEvent(e) {
  e.preventDefault();
  
  // Use _id if facultyId is not available
  const facultyIdentifier = currentFaculty.facultyId || currentFaculty._id;
  
  const eventData = {
    title: document.getElementById('eventTitle').value,
    description: document.getElementById('eventDescription').value,
    venue: document.getElementById('eventVenue').value,
    date: document.getElementById('eventDate').value,
    time: document.getElementById('eventTime').value,
    registrationDeadline: document.getElementById('eventRegistrationDeadline').value,
    faculty: document.getElementById('eventFaculty').value,
    facultyPhone: document.getElementById('eventFacultyPhone').value,
    student: document.getElementById('eventStudent').value,
    studentPhone: document.getElementById('eventStudentPhone').value,
    publishedBy: currentFaculty.username,
    publishedByFacultyId: facultyIdentifier,
    maxParticipants: document.getElementById('eventMaxParticipants').value
      ? parseInt(document.getElementById('eventMaxParticipants').value) : null
  };

  console.log('Publishing event:', eventData);

  try {
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });

    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response data:', result);

    if (response.ok) {
      showPopup('✅', 'Event Published!', 'Your event has been published successfully and is now visible to students.', 'success');
      document.getElementById('publishEventForm').reset();
      await loadEvents();
      displayEvents();
      showTab('home');
    } else {
      showPopup('❌', 'Publish Failed', result.message || 'Unknown error occurred', 'error');
    }
  } catch (error) {
    console.error('Error publishing event:', error);
    showPopup('❌', 'Server Error', 'Failed to connect to server. Make sure the server is running on port 5000.', 'error');
  }
}


// Load Faculty Profile
async function loadProfile() {
  if (!currentFaculty) {
    console.error('No faculty logged in');
    return;
  }
  
  // Use _id if facultyId is not available
  const facultyIdentifier = currentFaculty.facultyId || currentFaculty._id;
  console.log('Loading profile for faculty:', facultyIdentifier);
  
  try {
    const response = await fetch(`/api/faculty/profile/${facultyIdentifier}`);
    console.log('Profile response status:', response.status);
    
    if (response.ok) {
      const profile = await response.json();
      console.log('Profile data loaded:', profile);
      
      // Update profile display
      const profileImage = profile.profileImage || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.fullName || 'Faculty') + '&background=667eea&color=fff&size=200';
      document.getElementById('profileImage').src = profileImage;
      document.getElementById('profileFullName').textContent = profile.fullName || 'Faculty Name';
      document.getElementById('profileUsername').textContent = '@' + profile.username;
      
      // Update form fields
      document.getElementById('profileFullNameInput').value = profile.fullName || '';
      document.getElementById('profileEmail').value = profile.email || '';
      document.getElementById('profilePhone').value = profile.phone || '';
      document.getElementById('profileDepartment').value = profile.department || '';
    } else {
      console.error('Failed to load profile:', response.status);
      showPopup('⚠️', 'Profile Not Found', 'Please update your profile information.', 'error');
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    showPopup('❌', 'Error', 'Failed to load profile. Please try again.', 'error');
  }
}

// Update Faculty Profile
async function updateProfile(e) {
  e.preventDefault();
  
  // Use _id if facultyId is not available
  const facultyIdentifier = currentFaculty.facultyId || currentFaculty._id;
  
  const profileData = {
    fullName: document.getElementById('profileFullNameInput').value,
    email: document.getElementById('profileEmail').value,
    phone: document.getElementById('profilePhone').value,
    department: document.getElementById('profileDepartment').value
  };
  
  try {
    const response = await fetch(`/api/faculty/profile/${facultyIdentifier}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showPopup('✅', 'Profile Updated!', 'Your profile has been updated successfully.', 'success');
      await loadProfile();
    } else {
      showPopup('❌', 'Update Failed', result.message, 'error');
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    showPopup('❌', 'Server Error', 'Failed to update profile. Please try again.', 'error');
  }
}

// Override showTab to load profile when profile tab is shown
function showTab(tabName) {
  console.log("showTab called with:", tabName);
  
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active class from all menu items
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Show selected tab
  const selectedTab = document.getElementById(tabName);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
  
  // Add active class to clicked menu item
  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(tabName)) {
      item.classList.add('active');
    }
  });
  
  // Load profile when profile tab is shown
  if (tabName === 'profile') {
    console.log('Profile tab opened, loading profile...');
    loadProfile();
  }
  
  // Load analytics when analytics tab is shown
  if (tabName === 'analytics') {
    console.log('Analytics tab opened, loading analytics...');
    loadAnalytics();
  }

  // Load feedback analysis when tab is shown
  if (tabName === 'feedbackAnalysis') {
    populateFeedbackEventDropdown();
  }
}

// Load Analytics Data
function loadAnalytics() {
  // Calculate stats
  const totalEvents = allEvents.length;
  const totalRegistrations = allRegistrations.length;
  const attendedCount = allRegistrations.filter(reg => reg.attended).length;
  const attendanceRate = totalRegistrations > 0 ? Math.round((attendedCount / totalRegistrations) * 100) : 0;

  // Update stat boxes
  document.getElementById('analyticsEvents').textContent = totalEvents;
  document.getElementById('analyticsRegistrations').textContent = totalRegistrations;
  document.getElementById('analyticsAttended').textContent = attendedCount;
  document.getElementById('analyticsRate').textContent = attendanceRate + '%';

  // Event Performance
  displayEventPerformance();
  
  // Top Students
  displayTopStudents();
}

// Display Event Performance
function displayEventPerformance() {
  const container = document.getElementById('eventPerformance');
  
  if (allEvents.length === 0) {
    container.innerHTML = '<p style="color: #999; text-align: center; padding: 40px;">No events published yet</p>';
    return;
  }

  const eventStats = allEvents.map(event => {
    const regs = allRegistrations.filter(reg => {
      const regEventId = typeof reg.eventId === 'string' ? reg.eventId : reg.eventId?._id;
      return regEventId === event._id;
    });
    
    const attended = regs.filter(r => r.attended).length;
    const rate = regs.length > 0 ? Math.round((attended / regs.length) * 100) : 0;
    
    return {
      title: event.title,
      registrations: regs.length,
      attended: attended,
      rate: rate
    };
  });

  container.innerHTML = `
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background: #f8f9fa; border-bottom: 2px solid #e0e0e0;">
          <th style="padding: 12px; text-align: left;">Event</th>
          <th style="padding: 12px; text-align: center;">Registrations</th>
          <th style="padding: 12px; text-align: center;">Attended</th>
          <th style="padding: 12px; text-align: center;">Attendance Rate</th>
        </tr>
      </thead>
      <tbody>
        ${eventStats.map(stat => `
          <tr style="border-bottom: 1px solid #f0f0f0;">
            <td style="padding: 15px; font-weight: 500;">${stat.title}</td>
            <td style="padding: 15px; text-align: center;">
              <span class="badge" style="background: #e3f2fd; color: #1976d2; padding: 4px 12px; border-radius: 12px; font-size: 13px;">
                ${stat.registrations}
              </span>
            </td>
            <td style="padding: 15px; text-align: center;">
              <span class="badge" style="background: #e8f5e9; color: #388e3c; padding: 4px 12px; border-radius: 12px; font-size: 13px;">
                ${stat.attended}
              </span>
            </td>
            <td style="padding: 15px; text-align: center;">
              <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <div style="flex: 1; max-width: 100px; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden;">
                  <div style="width: ${stat.rate}%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); transition: width 0.3s;"></div>
                </div>
                <span style="font-weight: 600; color: #667eea;">${stat.rate}%</span>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Display Top Students
function displayTopStudents() {
  const container = document.getElementById('topStudents');
  
  if (allRegistrations.length === 0) {
    container.innerHTML = '<p style="color: #999; text-align: center; padding: 40px;">No registrations yet</p>';
    return;
  }

  // Group by student and calculate total scores
  const studentScores = {};
  
  allRegistrations.forEach(reg => {
    if (reg.attended && reg.score > 0) {
      const key = reg.pinNumber;
      if (!studentScores[key]) {
        studentScores[key] = {
          name: reg.studentName,
          pin: reg.pinNumber,
          totalScore: 0,
          eventsAttended: 0
        };
      }
      studentScores[key].totalScore += reg.score;
      studentScores[key].eventsAttended += 1;
    }
  });

  // Convert to array and sort by total score
  const topStudents = Object.values(studentScores)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 10);

  if (topStudents.length === 0) {
    container.innerHTML = '<p style="color: #999; text-align: center; padding: 40px;">No scores assigned yet</p>';
    return;
  }

  container.innerHTML = `
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background: #f8f9fa; border-bottom: 2px solid #e0e0e0;">
          <th style="padding: 12px; text-align: left;">Rank</th>
          <th style="padding: 12px; text-align: left;">Student Name</th>
          <th style="padding: 12px; text-align: center;">PIN Number</th>
          <th style="padding: 12px; text-align: center;">Events Attended</th>
          <th style="padding: 12px; text-align: center;">Total Score</th>
        </tr>
      </thead>
      <tbody>
        ${topStudents.map((student, index) => `
          <tr style="border-bottom: 1px solid #f0f0f0;">
            <td style="padding: 15px;">
              <span style="font-size: 20px;">
                ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
              </span>
            </td>
            <td style="padding: 15px; font-weight: 500;">${student.name}</td>
            <td style="padding: 15px; text-align: center; color: #666;">${student.pin}</td>
            <td style="padding: 15px; text-align: center;">
              <span class="badge" style="background: #e3f2fd; color: #1976d2; padding: 4px 12px; border-radius: 12px; font-size: 13px;">
                ${student.eventsAttended}
              </span>
            </td>
            <td style="padding: 15px; text-align: center;">
              <span style="font-size: 18px; font-weight: 700; color: #667eea;">
                ${student.totalScore}
              </span>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}


// ===============================
// FEEDBACK ANALYSIS
// ===============================

function populateFeedbackEventDropdown() {
  const select = document.getElementById('feedbackEventSelect');
  if (!select) return;

  select.innerHTML = '<option value="">🔍 Select an event to view feedback...</option>';
  allEvents.forEach(event => {
    select.innerHTML += `<option value="${event._id}">${event.title} (${event.date || 'No date'})</option>`;
  });

  // Reset view
  document.getElementById('feedbackResultsContainer').style.display = 'none';
}

async function loadFeedbackAnalysis() {
  const eventId = document.getElementById('feedbackEventSelect').value;
  const container = document.getElementById('feedbackResultsContainer');

  if (!eventId) {
    container.style.display = 'none';
    return;
  }

  try {
    const res = await fetch(`/api/feedback/event/${eventId}`);
    if (!res.ok) throw new Error('Failed to fetch feedback');
    const feedbacks = await res.json();

    if (feedbacks.length === 0) {
      container.style.display = 'none';
      // Show a no-feedback message inline
      document.getElementById('fbCommentsBody').innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#999;">No feedback submitted for this event yet</td></tr>`;
      container.style.display = 'block';
      document.getElementById('fbTotalCount').textContent = '0';
      document.getElementById('fbAvgRating').textContent = '—';
      document.getElementById('fbStars').textContent = '—';
      document.getElementById('fbBreakdown').innerHTML = '<p style="color:rgba(255,255,255,0.5);padding:10px 0;">No ratings yet</p>';
      document.getElementById('fbCommentsCount').textContent = '0 Comments';
      return;
    }

    // Average rating
    const avg = feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length;

    // Rating breakdown
    const breakdown = [5, 4, 3, 2, 1].map(star => ({
      star,
      count: feedbacks.filter(f => f.rating === star).length
    }));

    // Summary cards
    document.getElementById('fbTotalCount').textContent = feedbacks.length;
    document.getElementById('fbAvgRating').textContent = avg.toFixed(1);
    document.getElementById('fbStars').textContent = renderStars(avg);
    document.getElementById('fbCommentsCount').textContent = `${feedbacks.length} Comments`;

    // Breakdown bars
    document.getElementById('fbBreakdown').innerHTML = breakdown.map(b => {
      const pct = Math.round((b.count / feedbacks.length) * 100);
      return `
        <div style="display:flex; align-items:center; gap:14px; margin-bottom:12px;">
          <span style="width:90px; font-size:14px; color:rgba(255,255,255,0.85);">${'⭐'.repeat(b.star)} ${b.star}</span>
          <div style="flex:1; background:rgba(255,255,255,0.1); border-radius:20px; height:14px; overflow:hidden;">
            <div style="width:${pct}%; background:linear-gradient(90deg,#667eea,#764ba2); height:100%; border-radius:20px; transition:width 0.4s;"></div>
          </div>
          <span style="width:70px; font-size:13px; color:rgba(255,255,255,0.6); text-align:right;">${b.count} (${pct}%)</span>
        </div>
      `;
    }).join('');

    // Comments table rows
    document.getElementById('fbCommentsBody').innerHTML = feedbacks.map((f, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${f.studentName}</td>
        <td>${renderStars(f.rating)} (${f.rating}/5)</td>
        <td style="max-width:300px;">${f.comment}</td>
        <td>${new Date(f.submittedAt).toLocaleString()}</td>
      </tr>
    `).join('');

    container.style.display = 'block';

  } catch (err) {
    console.error('Feedback analysis error:', err);
  }
}

function renderStars(rating) {
  const full = Math.round(rating);
  return '⭐'.repeat(full) + '☆'.repeat(5 - full);
}

// ─── CERTIFICATE MODULE ───────────────────────────────────────────────────────

function filterCertificates() {
  const eventId = document.getElementById('filterEventCert').value;
  const tbody = document.getElementById('certBody');
  const certCount = document.getElementById('certCount');
  const tableContainer = document.getElementById('certTableContainer');

  if (!eventId) {
    tableContainer.style.display = 'none';
    certCount.textContent = 'Select an event';
    return;
  }

  tableContainer.style.display = 'block';

  // Only attended students
  const attended = allRegistrations.filter(reg => {
    const regEventId = typeof reg.eventId === 'string' ? reg.eventId : reg.eventId?._id;
    return reg.attended && regEventId === eventId;
  });

  certCount.textContent = `${attended.length} Students`;

  if (!attended.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: #999;">
          No attended students for this event yet
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = '';
  attended.forEach((reg, index) => {
    const hasCert = !!reg.certificateUrl;
    const row = document.createElement('tr');
    row.id = `cert-row-${reg._id}`;
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${reg.studentName}</td>
      <td>${reg.pinNumber}</td>
      <td>${reg.branch}</td>
      <td>${reg.section}</td>
      <td>${reg.year || 'N/A'}</td>
      <td id="cert-status-${reg._id}">
        ${hasCert
          ? `<span style="display:inline-flex; align-items:center; gap:6px; background:rgba(76,175,80,0.15); border:1px solid rgba(76,175,80,0.4); padding:5px 12px; border-radius:20px;">
               <span style="color:#4caf50; font-size:16px;">✅</span>
               <a href="${reg.certificateUrl}" target="_blank"
                  style="color:#4caf50; font-weight:600; font-size:13px; text-decoration:none;">
                 Uploaded — View
               </a>
             </span>`
          : `<span style="color:rgba(255,255,255,0.5);">No certificate</span>`}
      </td>
      <td id="cert-action-${reg._id}">
        <label style="cursor:pointer; padding:6px 14px; background:rgba(102,126,234,0.25); border:1px solid rgba(102,126,234,0.5); border-radius:6px; font-size:12px; font-weight:600; color:white; transition:0.2s;"
               onmouseover="this.style.background='rgba(102,126,234,0.45)'"
               onmouseout="this.style.background='rgba(102,126,234,0.25)'">
          ${hasCert ? '📤 Replace' : '📤 Upload'}
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" style="display:none;"
                 onchange="uploadCertificate('${reg._id}', this)">
        </label>
        ${hasCert ? `
        <button onclick="deleteCertificate('${reg._id}')"
          style="margin-left:8px; padding:6px 12px; background:rgba(244,67,54,0.2); border:1px solid rgba(244,67,54,0.4); border-radius:6px; font-size:12px; font-weight:600; color:#f44336; cursor:pointer; transition:0.2s;"
          onmouseover="this.style.background='rgba(244,67,54,0.4)'"
          onmouseout="this.style.background='rgba(244,67,54,0.2)'">
          🗑️ Remove
        </button>` : ''}
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function uploadCertificate(regId, input) {
  if (!input.files || !input.files[0]) return;

  const file = input.files[0];
  const formData = new FormData();
  formData.append('certificate', file);

  // Show uploading state
  const statusEl = document.getElementById(`cert-status-${regId}`);
  if (statusEl) statusEl.innerHTML = `<span style="color:rgba(255,255,255,0.6);">⏳ Uploading...</span>`;

  try {
    const response = await fetch(`/api/registrations/certificate/${regId}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const err = await response.json();
      showPopup('❌', 'Upload Failed', err.message || 'Could not upload certificate', 'error');
      if (statusEl) statusEl.innerHTML = `<span style="color:rgba(255,255,255,0.5);">No certificate</span>`;
      return;
    }

    const result = await response.json();

    // Update the registration in memory
    const reg = allRegistrations.find(r => r._id === regId);
    if (reg) reg.certificateUrl = result.certificateUrl;

    showPopup('✅', 'Certificate Uploaded', 'Certificate has been uploaded successfully.', 'success');

    // Refresh the certificate table
    filterCertificates();
  } catch (error) {
    console.error('Upload error:', error);
    showPopup('❌', 'Upload Error', error.message, 'error');
    if (statusEl) statusEl.innerHTML = `<span style="color:rgba(255,255,255,0.5);">No certificate</span>`;
  }
}

async function deleteCertificate(regId) {
  if (!confirm('Remove this certificate?')) return;

  try {
    const response = await fetch(`/api/registrations/certificate/${regId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      showPopup('❌', 'Error', 'Could not remove certificate', 'error');
      return;
    }

    // Update in memory
    const reg = allRegistrations.find(r => r._id === regId);
    if (reg) reg.certificateUrl = null;

    showPopup('✅', 'Certificate Removed', 'Certificate has been removed.', 'success');
    filterCertificates();
  } catch (error) {
    console.error('Delete error:', error);
    showPopup('❌', 'Error', error.message, 'error');
  }
}

async function uploadCertificate(regId, input) {
  if (!input.files || !input.files[0]) return;

  const file = input.files[0];
  const formData = new FormData();
  formData.append('certificate', file);

  // Immediately show uploading state in the row
  const statusEl = document.getElementById(`cert-status-${regId}`);
  const actionCell = document.getElementById(`cert-action-${regId}`);
  if (statusEl) statusEl.innerHTML = `<span style="color:rgba(255,255,255,0.6);">⏳ Uploading...</span>`;
  if (actionCell) actionCell.style.opacity = '0.5';

  try {
    const response = await fetch(`/api/registrations/certificate/${regId}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const err = await response.json();
      showPopup('❌', 'Upload Failed', err.message || 'Could not upload certificate', 'error');
      if (statusEl) statusEl.innerHTML = `<span style="color:rgba(255,255,255,0.5);">No certificate</span>`;
      if (actionCell) actionCell.style.opacity = '1';
      return;
    }

    const result = await response.json();

    // Update in-memory registration — handle both string and object _id
    const reg = allRegistrations.find(r => {
      const id = typeof r._id === 'object' ? r._id.toString() : r._id;
      return id === regId;
    });
    if (reg) reg.certificateUrl = result.certificateUrl;

    // Update the status cell immediately — no need to re-render the whole table
    if (statusEl) {
      statusEl.innerHTML = `
        <span style="display:inline-flex; align-items:center; gap:6px; background:rgba(76,175,80,0.15); border:1px solid rgba(76,175,80,0.4); padding:5px 12px; border-radius:20px;">
          <span style="color:#4caf50; font-size:16px;">✅</span>
          <a href="${result.certificateUrl}" target="_blank"
             style="color:#4caf50; font-weight:600; font-size:13px; text-decoration:none;">
            Uploaded — View
          </a>
        </span>`;
    }

    // Update action cell: keep Upload button + add Remove button
    if (actionCell) {
      actionCell.style.opacity = '1';
      actionCell.innerHTML = `
        <label style="cursor:pointer; padding:6px 14px; background:rgba(102,126,234,0.25); border:1px solid rgba(102,126,234,0.5); border-radius:6px; font-size:12px; font-weight:600; color:white; transition:0.2s;"
               onmouseover="this.style.background='rgba(102,126,234,0.45)'"
               onmouseout="this.style.background='rgba(102,126,234,0.25)'">
          📤 Replace
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" style="display:none;"
                 onchange="uploadCertificate('${regId}', this)">
        </label>
        <button onclick="deleteCertificate('${regId}')"
          style="margin-left:8px; padding:6px 12px; background:rgba(244,67,54,0.2); border:1px solid rgba(244,67,54,0.4); border-radius:6px; font-size:12px; font-weight:600; color:#f44336; cursor:pointer; transition:0.2s;"
          onmouseover="this.style.background='rgba(244,67,54,0.4)'"
          onmouseout="this.style.background='rgba(244,67,54,0.2)'">
          🗑️ Remove
        </button>`;
    }

    showPopup('✅', 'Certificate Uploaded', `Certificate for ${reg?.studentName || 'student'} uploaded successfully.`, 'success');

  } catch (error) {
    console.error('Upload error:', error);
    showPopup('❌', 'Upload Error', error.message, 'error');
    if (statusEl) statusEl.innerHTML = `<span style="color:rgba(255,255,255,0.5);">No certificate</span>`;
    if (actionCell) actionCell.style.opacity = '1';
  }
}

async function deleteCertificate(regId) {
  if (!confirm('Remove this certificate?')) return;

  try {
    const response = await fetch(`/api/registrations/certificate/${regId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      showPopup('❌', 'Error', 'Could not remove certificate', 'error');
      return;
    }

    // Update in memory
    const reg = allRegistrations.find(r => {
      const id = typeof r._id === 'object' ? r._id.toString() : r._id;
      return id === regId;
    });
    if (reg) reg.certificateUrl = null;

    // Update status cell immediately
    const statusEl = document.getElementById(`cert-status-${regId}`);
    const actionCell = document.getElementById(`cert-action-${regId}`);

    if (statusEl) statusEl.innerHTML = `<span style="color:rgba(255,255,255,0.5);">No certificate</span>`;
    if (actionCell) {
      actionCell.innerHTML = `
        <label style="cursor:pointer; padding:6px 14px; background:rgba(102,126,234,0.25); border:1px solid rgba(102,126,234,0.5); border-radius:6px; font-size:12px; font-weight:600; color:white; transition:0.2s;"
               onmouseover="this.style.background='rgba(102,126,234,0.45)'"
               onmouseout="this.style.background='rgba(102,126,234,0.25)'">
          📤 Upload
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" style="display:none;"
                 onchange="uploadCertificate('${regId}', this)">
        </label>`;
    }

    showPopup('✅', 'Certificate Removed', 'Certificate has been removed.', 'success');
  } catch (error) {
    console.error('Delete error:', error);
    showPopup('❌', 'Error', error.message, 'error');
  }
}
