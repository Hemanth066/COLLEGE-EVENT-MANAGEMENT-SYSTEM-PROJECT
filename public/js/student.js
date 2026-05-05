// Student Dashboard JavaScript
let allEvents = [];
let allEventsUnfiltered = []; // All events including expired deadlines (for registrations tab)
let myRegistrations = [];
let currentUser = null;
let currentStudent = null;

// Load data on page load
document.addEventListener("DOMContentLoaded", async () => {
  // Get current user from localStorage
  currentUser = JSON.parse(localStorage.getItem("user"));
  currentStudent = currentUser; // Store student info
  
  console.log("Current user from localStorage:", currentUser);
  
  // If no user or no pinNumber, ask for it
  if (!currentUser) {
    alert("❌ Please login first");
    window.location.href = "index.html";
    return;
  }
  
  // If student doesn't have pinNumber stored, prompt for it
  if (!currentUser.pinNumber) {
    const pinNumber = prompt("Please enter your PIN number to continue:");
    if (!pinNumber) {
      alert("PIN number is required");
      window.location.href = "index.html";
      return;
    }
    currentUser.pinNumber = pinNumber;
    localStorage.setItem("user", JSON.stringify(currentUser));
  }
  
  await loadEvents();
  await loadMyRegistrations();
  displayEvents();
});

async function loadEvents() {
  try {
    const response = await fetch("/api/events");
    if (response.ok) {
      const allEventsFromAPI = await response.json();
      
      // Keep all events for registrations/feedback lookup
      allEventsUnfiltered = allEventsFromAPI;

      // Filter out events with expired registration deadlines (for browse tab)
      const now = new Date();
      allEvents = allEventsFromAPI.filter(event => {
        if (!event.registrationDeadline) return true;
        const deadline = new Date(event.registrationDeadline);
        return deadline > now;
      });
      
      console.log(`Events loaded: ${allEvents.length} active out of ${allEventsFromAPI.length} total`);
    }
  } catch (error) {
    console.error("Error loading events:", error);
  }
}

async function loadMyRegistrations() {
  try {
    if (!currentUser || !currentUser.pinNumber) {
      console.error("No user logged in");
      return;
    }
    
    // Fetch only registrations for the current student using their PIN number
    const response = await fetch(`/api/register/student/${currentUser.pinNumber}`);
    if (response.ok) {
      myRegistrations = await response.json();
      console.log("My registrations loaded:", myRegistrations);
    } else {
      console.error("Failed to load registrations");
      myRegistrations = [];
    }
  } catch (error) {
    console.error("Error loading registrations:", error);
    myRegistrations = [];
  }
}

function displayEvents(eventsToShow) {
  const grid = document.getElementById("eventsGrid");
  const homeGrid = document.getElementById("homeEventsGrid");
  const events = eventsToShow !== undefined ? eventsToShow : allEvents;

  const renderCards = (list, container, limit) => {
    if (!list.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">No events found.</div></div>`;
      return;
    }
    const slice = limit ? list.slice(0, limit) : list;
    container.innerHTML = slice.map(event => {
      const isRegistered = myRegistrations.some(reg =>
        reg.pinNumber === currentUser.pinNumber &&
        reg.eventId === event._id &&
        reg.eventVersion === (event.version || 1)
      );
      let deadlineHTML = '';
      if (event.registrationDeadline) {
        const dl = new Date(event.registrationDeadline);
        deadlineHTML = `<div class="event-deadline">⏳ Register by: ${dl.toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>`;
      }
      return `
        <div class="event-card">
          <div class="event-card-top">
            <div class="event-title">📌 ${event.title}${event.version > 1 ? ` <span style="font-size:11px;color:var(--gold);">(v${event.version})</span>` : ''}</div>
            <div class="event-badges">
              ${isRegistered ? '<span class="badge badge-registered">✅ Registered</span>' : '<span class="badge badge-pending">Open</span>'}
            </div>
          </div>
          <div class="event-card-body">
            <div class="event-meta">
              <div class="meta-item"><div class="meta-icon">📍</div>${event.venue || 'TBA'}</div>
              <div class="meta-item"><div class="meta-icon">📅</div>${event.date || 'TBA'}</div>
              <div class="meta-item"><div class="meta-icon">🕐</div>${event.time || 'TBA'}</div>
              ${event.branch ? `<div class="meta-item"><div class="meta-icon">🎓</div>${event.branch}</div>` : ''}
            </div>
            <div class="event-description">${(event.description || 'No description provided').substring(0, 100)}${(event.description || '').length > 100 ? '…' : ''}</div>
            ${deadlineHTML}
            ${isRegistered
              ? `<button class="event-btn btn-disabled" disabled>✅ Already Registered</button>`
              : `<button class="event-btn btn-primary" onclick="registerEvent('${event._id}')">📝 Register Now</button>`
            }
          </div>
        </div>`;
    }).join('');
  };

  if (grid) renderCards(events, grid);
  if (homeGrid) renderCards(allEvents, homeGrid, 4);

  // Update result count
  const countEl = document.getElementById('filterResultCount');
  if (countEl && eventsToShow !== undefined) {
    countEl.textContent = `Showing ${events.length} of ${allEvents.length} event${allEvents.length !== 1 ? 's' : ''}`;
  } else if (countEl) {
    countEl.textContent = '';
  }
}

// Show event details in modal
function showEventDetails(event, isRegistered) {
  document.getElementById('modalTitle').textContent = event.title;
  document.getElementById('modalDescription').textContent = event.description || "No description provided";
  document.getElementById('modalVenue').textContent = event.venue || "TBA";
  document.getElementById('modalDate').textContent = event.date || "TBA";
  document.getElementById('modalTime').textContent = event.time || "TBA";
  document.getElementById('modalFaculty').textContent = event.faculty || "N/A";
  document.getElementById('modalFacultyPhone').textContent = event.facultyPhone || "N/A";
  document.getElementById('modalStudent').textContent = event.student || "N/A";
  document.getElementById('modalStudentPhone').textContent = event.studentPhone || "N/A";
  
  // Show version badge if version > 1
  const versionBadge = document.getElementById('modalVersion');
  if (event.version > 1) {
    versionBadge.textContent = `Updated - Version ${event.version}`;
    versionBadge.style.display = 'inline-block';
  } else {
    versionBadge.style.display = 'none';
  }
  
  // Update action buttons
  const modalActions = document.getElementById('modalActions');
  if (isRegistered) {
    modalActions.innerHTML = `
      <button class="modal-btn registered">
        <span>✅</span>
        <span>Already Registered</span>
      </button>
      <button class="modal-btn secondary" onclick="closeEventModal()">
        <span>Close</span>
      </button>
    `;
  } else {
    modalActions.innerHTML = `
      <button class="modal-btn primary" onclick="registerEvent('${event._id}')">
        <span>📝</span>
        <span>Register Now</span>
      </button>
      <button class="modal-btn secondary" onclick="closeEventModal()">
        <span>Close</span>
      </button>
    `;
  }
  
  // Show modal
  document.getElementById('eventModal').classList.add('show');
  document.body.style.overflow = 'hidden';
}

// Close event details modal
function closeEventModal(event) {
  if (event && event.target.classList.contains('modal-content')) {
    return;
  }
  document.getElementById('eventModal').classList.remove('show');
  document.body.style.overflow = 'auto';
}

async function displayMyRegistrations() {
  const myRegList = document.getElementById("myRegistrationsList");

  // Filter only current student's registrations
  const myRegs = myRegistrations.filter(reg => reg.pinNumber === currentUser.pinNumber);

  if (!myRegs.length) {
    myRegList.innerHTML = `
      <div class="no-data">
        <div class="no-data-icon">📋</div>
        <p>You haven't registered for any events yet</p>
      </div>
    `;
    return;
  }

  let regHTML = "";

  for (const reg of myRegs) {
    const event = allEventsUnfiltered.find(e => e._id === reg.eventId);
    if (!event) continue;

    let feedbackSection = '';

    if (reg.attended) {
      // Check if feedback already submitted
      let alreadySubmitted = false;
      try {
        const res = await fetch(`/api/feedback/check/${reg.pinNumber}/${reg.eventId}`);
        const data = await res.json();
        alreadySubmitted = data.submitted;
      } catch (e) { /* ignore */ }

      if (alreadySubmitted) {
        feedbackSection = `<div class="feedback-done">✅ Feedback Submitted Successfully</div>`;
      } else {
        feedbackSection = `
          <div class="feedback-form" id="feedback-${reg.eventId}">
            <p><strong>⭐ Submit Feedback</strong></p>
            <div class="rating-group">
              <label>Rating:</label>
              <select id="rating-${reg.eventId}">
                <option value="">-- Select --</option>
                <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                <option value="4">⭐⭐⭐⭐ Good</option>
                <option value="3">⭐⭐⭐ Average</option>
                <option value="2">⭐⭐ Poor</option>
                <option value="1">⭐ Very Poor</option>
              </select>
            </div>
            <textarea id="comment-${reg.eventId}" placeholder="Write your feedback here..." rows="3"></textarea>
            <button class="btn-feedback" onclick="submitFeedback('${reg.eventId}', '${reg.studentName}', '${reg.pinNumber}')">Submit Feedback</button>
          </div>
        `;
      }
    }

    regHTML += `
      <div class="registration-card" id="card-${reg.eventId}">
        <h4>📌 ${event.title} ${event.version > 1 ? `<span style="font-size: 12px; color: #fbbf24;">(v${event.version})</span>` : ''}</h4>
        <p><strong>Your Details:</strong></p>
        <p>Name: ${reg.studentName}</p>
        <p>Student ID: ${reg.pinNumber}</p>
        <p>Branch: ${reg.branch} | Section: ${reg.section}</p>
        <p><strong>Event Details:</strong></p>
        <p>📍 Venue: ${event.venue || "TBA"}</p>
        <p>📅 Date: ${event.date || "TBA"} | 🕐 Time: ${event.time || "TBA"}</p>
        <span class="badge">✅ Registered${reg.attended ? ' & Attended' : ''}</span>
        ${feedbackSection}
      </div>
    `;
  }

  myRegList.innerHTML = regHTML || `
    <div class="no-data">
      <div class="no-data-icon">📋</div>
      <p>No registrations found</p>
    </div>
  `;
}

async function submitFeedback(eventId, studentName, pinNumber) {
  const rating = document.getElementById(`rating-${eventId}`).value;
  const comment = document.getElementById(`comment-${eventId}`).value.trim();

  if (!rating) return showPopup('⚠️', 'Missing Rating', 'Please select a rating.', 'error');
  if (!comment) return showPopup('⚠️', 'Missing Comment', 'Please write a feedback comment.', 'error');

  try {
    const res = await fetch('/api/feedback/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentName, pinNumber, eventId, rating: Number(rating), comment })
    });

    const data = await res.json();

    if (res.ok) {
      // Replace feedback form with success message
      const formEl = document.getElementById(`feedback-${eventId}`);
      if (formEl) {
        formEl.outerHTML = `<div class="feedback-done">✅ Feedback Submitted Successfully</div>`;
      }
      showPopup('✅', 'Thank You!', 'Your feedback has been submitted.', 'success');
    } else {
      showPopup('❌', 'Error', data.message || 'Failed to submit feedback.', 'error');
    }
  } catch (err) {
    showPopup('❌', 'Error', 'Network error. Please try again.', 'error');
  }
}

function registerEvent(eventId) {
  localStorage.setItem("eventId", eventId);
  window.location.href = "register.html";
}

function filterEvents() {
  const keyword = (document.getElementById('eventSearch')?.value || '').toLowerCase().trim();
  const dateVal = document.getElementById('eventDateFilter')?.value || '';
  const branch  = (document.getElementById('eventBranchFilter')?.value || '').toLowerCase();

  const filtered = allEvents.filter(event => {
    const matchKeyword = !keyword ||
      (event.title || '').toLowerCase().includes(keyword) ||
      (event.description || '').toLowerCase().includes(keyword) ||
      (event.venue || '').toLowerCase().includes(keyword);

    const matchDate = !dateVal || (event.date || '') === dateVal;

    const matchBranch = !branch ||
      (event.branch || '').toLowerCase().includes(branch) ||
      (event.targetBranch || '').toLowerCase().includes(branch) ||
      (event.branches || []).some(b => b.toLowerCase().includes(branch));

    return matchKeyword && matchDate && matchBranch;
  });

  displayEvents(filtered);
}

function clearEventFilters() {
  const s = document.getElementById('eventSearch');
  const d = document.getElementById('eventDateFilter');
  const b = document.getElementById('eventBranchFilter');
  if (s) s.value = '';
  if (d) d.value = '';
  if (b) b.value = '';
  displayEvents();
}

function showTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Remove active class from all menu items
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.remove('active');
  });

  // Show selected tab
  document.getElementById(tabName).classList.add('active');
  
  // Add active class to clicked menu item
  if (event && event.target) {
    const menuItem = event.target.closest('.menu-item');
    if (menuItem) {
      menuItem.classList.add('active');
    }
  }
}

function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.clear();
    window.location.href = "index.html";
  }
}

function displayScores() {
  const scoresList = document.getElementById("scoresList");

  // Filter only current student's attended registrations with scores
  const attendedRegs = myRegistrations.filter(reg => 
    reg.pinNumber === currentUser.pinNumber && reg.attended
  );

  if (!attendedRegs.length) {
    scoresList.innerHTML = `
      <div class="no-data">
        <div class="no-data-icon">📊</div>
        <p>No scores available yet. Attend events to receive scores!</p>
      </div>
    `;
    return;
  }

  let scoresHTML = "";
  let totalScore = 0;

  attendedRegs.forEach(reg => {
    const event = allEvents.find(e => e._id === reg.eventId);
    totalScore += reg.score || 0;
    
    if (event) {
      scoresHTML += `
        <div class="score-card">
          <div class="score-info">
            <h4>📌 ${event.title} ${event.version > 1 ? `<span style="font-size: 12px; color: #fbbf24;">(v${event.version})</span>` : ''}</h4>
            <p>📅 ${event.date || "TBA"} | 🕐 ${event.time || "TBA"}</p>
            <p>📍 ${event.venue || "TBA"}</p>
            <span class="badge">✅ Attended</span>
          </div>
          <div class="score-display">
            <div class="score-number">${reg.score || 0}</div>
            <div class="score-label">Points</div>
          </div>
        </div>
      `;
    }
  });

  // Add total score card
  scoresHTML = `
    <div class="score-card" style="background: rgba(251,191,36,0.2); border-color: rgba(251,191,36,0.5);">
      <div class="score-info">
        <h4>🏆 Total Score</h4>
        <p>Across ${attendedRegs.length} attended event(s)</p>
      </div>
      <div class="score-display">
        <div class="score-number" style="font-size: 48px;">${totalScore}</div>
        <div class="score-label">Total Points</div>
      </div>
    </div>
  ` + scoresHTML;

  scoresList.innerHTML = scoresHTML;
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
  popupBtn.className = 'popup-btn ' + type;
  
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
