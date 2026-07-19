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

    // Use the populated endpoint — returns event data embedded in each registration
    // so past/deleted events still show full details
    const response = await fetch(`/api/register/student/${currentUser.pinNumber}/with-events`);
    if (response.ok) {
      myRegistrations = await response.json();
      console.log("My registrations loaded:", myRegistrations.length);
    } else {
      console.error("Failed to load registrations");
      myRegistrations = [];
    }
  } catch (error) {
    console.error("Error loading registrations:", error);
    myRegistrations = [];
  }
}

// Helper — get the string ID from a registration's eventId
// (may be a plain string or a populated object after the with-events endpoint)
function regEventId(reg) {
  if (!reg.eventId) return '';
  if (typeof reg.eventId === 'object') return reg.eventId._id || reg.eventId.toString();
  return reg.eventId;
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
        regEventId(reg) === event._id &&
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
    // eventId is now a populated object from the with-events endpoint
    const event = (typeof reg.eventId === 'object' && reg.eventId !== null)
      ? reg.eventId
      : allEventsUnfiltered.find(e => e._id === reg.eventId);

    if (!event) continue;

    const eventTitle  = event.title  || 'Event';
    const eventVenue  = event.venue  || 'TBA';
    const eventDate   = event.date   || 'TBA';
    const eventTime   = event.time   || 'TBA';
    const eventVer    = event.version || 1;
    const eventIdStr  = event._id    || regEventId(reg);

    let feedbackSection = '';

    if (reg.attended) {
      let alreadySubmitted = false;
      try {
        const res = await fetch(`/api/feedback/check/${reg.pinNumber}/${eventIdStr}`);
        const data = await res.json();
        alreadySubmitted = data.submitted;
      } catch (e) { /* ignore */ }

      if (alreadySubmitted) {
        feedbackSection = `<div class="feedback-done">✅ Feedback Submitted Successfully</div>`;
      } else {
        feedbackSection = `
          <div class="feedback-form" id="feedback-${eventIdStr}">
            <p><strong>⭐ Submit Feedback</strong></p>
            <div class="rating-group">
              <label>Rating:</label>
              <select id="rating-${eventIdStr}">
                <option value="">-- Select --</option>
                <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                <option value="4">⭐⭐⭐⭐ Good</option>
                <option value="3">⭐⭐⭐ Average</option>
                <option value="2">⭐⭐ Poor</option>
                <option value="1">⭐ Very Poor</option>
              </select>
            </div>
            <textarea id="comment-${eventIdStr}" placeholder="Write your feedback here..." rows="3"></textarea>
            <button class="btn-feedback" onclick="submitFeedback('${eventIdStr}', '${reg.studentName}', '${reg.pinNumber}')">Submit Feedback</button>
          </div>
        `;
      }
    }

    regHTML += `
      <div class="registration-card" id="card-${eventIdStr}">
        <h4>📌 ${eventTitle} ${eventVer > 1 ? `<span style="font-size:12px;color:#fbbf24;">(v${eventVer})</span>` : ''}</h4>
        <p><strong>Your Details:</strong></p>
        <p>Name: ${reg.studentName}</p>
        <p>Student ID: ${reg.pinNumber}</p>
        <p>Branch: ${reg.branch} | Section: ${reg.section}</p>
        <p><strong>Event Details:</strong></p>
        <p>📍 Venue: ${eventVenue}</p>
        <p>📅 Date: ${eventDate} | 🕐 Time: ${eventTime}</p>
        <span class="badge">✅ Registered${reg.attended ? ' & Attended' : ''}</span>
        ${reg.score ? `<span class="badge" style="background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.3);margin-left:6px;">🏆 Score: ${reg.score}</span>` : ''}
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
  localStorage.setItem("selectedEventId", eventId);
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

  // All attended registrations — includes past events because eventId is populated
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
  let scoredCount = 0;

  attendedRegs.forEach(reg => {
    // Use populated event object if available, fall back to allEventsUnfiltered lookup
    const event = (typeof reg.eventId === 'object' && reg.eventId !== null)
      ? reg.eventId
      : (allEvents.find(e => e._id === regEventId(reg)) || allEventsUnfiltered.find(e => e._id === regEventId(reg)));

    const score     = reg.score || 0;
    const title     = event ? event.title   : `Event (${regEventId(reg).slice(-6)})`;
    const date      = event ? (event.date  || 'TBA') : 'Past Event';
    const time      = event ? (event.time  || 'TBA') : '—';
    const venue     = event ? (event.venue || 'TBA') : '—';
    const version   = event ? (event.version || 1)  : reg.eventVersion || 1;

    totalScore += score;
    if (score > 0) scoredCount++;

    scoresHTML += `
      <div class="score-card">
        <div class="score-info">
          <h4>📌 ${title} ${version > 1 ? `<span style="font-size:12px;color:var(--gold);">(v${version})</span>` : ''}</h4>
          <p>📅 ${date} | 🕐 ${time}</p>
          <p>📍 ${venue}</p>
          <span class="badge" style="background:rgba(34,197,94,0.15);color:#4ade80;border:1px solid rgba(34,197,94,0.3);">✅ Attended</span>
          ${score === 0 ? `<span class="badge" style="background:rgba(255,255,255,0.06);color:var(--muted);border:1px solid var(--border);margin-left:6px;">Score pending</span>` : ''}
        </div>
        <div class="score-display">
          <div class="score-number" style="${score === 0 ? 'color:var(--muted);' : ''}">${score}</div>
          <div class="score-label">Points</div>
        </div>
      </div>
    `;
  });

  // Summary card at top
  const avgScore = attendedRegs.length > 0 ? (totalScore / attendedRegs.length).toFixed(1) : 0;
  const summaryHTML = `
    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:16px; margin-bottom:28px;">
      <div class="score-card" style="background:rgba(251,191,36,0.12); border-color:rgba(251,191,36,0.4); flex-direction:column; align-items:center; text-align:center; padding:24px 16px;">
        <div class="score-number" style="font-size:48px; color:#fbbf24;">${totalScore}</div>
        <div class="score-label" style="color:#fbbf24; font-weight:600;">🏆 Total Score</div>
      </div>
      <div class="score-card" style="background:rgba(59,130,246,0.1); border-color:rgba(59,130,246,0.35); flex-direction:column; align-items:center; text-align:center; padding:24px 16px;">
        <div class="score-number" style="font-size:48px; color:var(--blue);">${attendedRegs.length}</div>
        <div class="score-label" style="color:var(--blue); font-weight:600;">🎯 Events Attended</div>
      </div>
      <div class="score-card" style="background:rgba(168,85,247,0.1); border-color:rgba(168,85,247,0.35); flex-direction:column; align-items:center; text-align:center; padding:24px 16px;">
        <div class="score-number" style="font-size:48px; color:#a78bfa;">${avgScore}</div>
        <div class="score-label" style="color:#a78bfa; font-weight:600;">📈 Avg Score / Event</div>
      </div>
    </div>
    <div style="font-size:13px; color:var(--muted); margin-bottom:20px; padding:0 4px;">
      Showing all ${attendedRegs.length} attended event(s) — including past events
    </div>
  `;

  scoresList.innerHTML = summaryHTML + scoresHTML;

  // Update the home tab total score counter as well
  const totalScoreEl = document.getElementById('totalScore');
  if (totalScoreEl) totalScoreEl.textContent = totalScore;
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
