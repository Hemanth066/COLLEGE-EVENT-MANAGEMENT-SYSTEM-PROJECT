let currentDepartmentHead = null;
let allFaculty = [], allStudents = [], allEvents = [];
let selectedFacultyId = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentDepartmentHead = JSON.parse(localStorage.getItem('departmentHeadData'));
  if (!currentDepartmentHead) {
    window.location.href = 'index.html';
    return;
  }
  
  document.getElementById('profileName').textContent = currentDepartmentHead.fullName || currentDepartmentHead.username;
  document.getElementById('welcomeName').textContent = currentDepartmentHead.fullName || currentDepartmentHead.username;
  document.getElementById('deptName').textContent = currentDepartmentHead.department || '—';
  document.getElementById('yearName').textContent = currentDepartmentHead.year || '—';

  // Load initial dashboard
  await loadStats();
  await loadFaculty();
  await loadEvents();
  await loadStudents();
});

async function loadStats() {
  try {
    const res = await fetch(`/api/department-head/stats/${currentDepartmentHead._id}`);
    const stats = await res.json();
    document.getElementById('statFaculty').textContent = stats.totalFaculty;
    document.getElementById('statStudents').textContent = stats.totalStudents;
    document.getElementById('statEvents').textContent = stats.totalEvents;
    
    let detail = stats.studentsByBranch.map(b => `${b._id.branch}/${b._id.section}: ${b.count}`).join(', ');
    document.getElementById('statStudentsDetail').textContent = detail || 'No data';
    document.getElementById('facultyCount').textContent = `${stats.totalFaculty} faculty in department`;
    document.getElementById('studentCount').textContent = `${stats.totalStudents} students (Year ${stats.year})`;
    document.getElementById('eventsCount').textContent = `${stats.totalEvents} events published by dept faculty`;
  } catch (e) {
    console.error('Stats load error:', e);
  }
}

async function loadFaculty() {
  try {
    const res = await fetch(`/api/department-head/faculty/${currentDepartmentHead._id}`);
    allFaculty = await res.json();
    renderFaculty(allFaculty);
    document.getElementById('facultyCount').textContent = `${allFaculty.length} faculty in department`;
  } catch (e) {
    console.error('Faculty load error:', e);
    document.getElementById('facultyBody').innerHTML = '<tr><td colspan="6" class="no-data">No faculty found or error loading</td></tr>';
  }
}

function renderFaculty(list) {
  const tbody = document.getElementById('facultyBody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="no-data">No faculty in your department</td></tr>';
    return;
  }
  tbody.innerHTML = list.map((f, i) => `
    <tr onclick="selectFaculty('${f._id}')" style="cursor:pointer;">
      <td>${i+1}</td>
      <td>${f.fullName || '—'}</td>
      <td>${f.username || '—'}</td>
      <td>${f.email || '—'}</td>
      <td>${f.phone || '—'}</td>
      <td><button class="btn btn-primary" onclick="event.stopPropagation(); editFaculty('${f._id}')">✏️ Edit</button></td>
    </tr>`).join('');
}

function selectFaculty(id) {
  selectedFacultyId = id;
  document.querySelectorAll('#facultyTable tr').forEach(tr => tr.style.background = '');
  event.currentTarget.style.background = 'rgba(34,197,94,0.2)';
}

async function loadStudents() {
  // Students loaded via stats.studentsByBranch already
  // Table shows branch counts
  const tbody = document.getElementById('studentsBody');
  tbody.innerHTML = '<tr><td colspan="2" class="no-data">Student counts shown in dashboard stats</td></tr>';
}

async function loadEvents() {
  try {
    const res = await fetch(`/api/department-head/events/${currentDepartmentHead._id}`);
    allEvents = await res.json();
    renderEvents(allEvents);
    document.getElementById('eventsCount').textContent = `${allEvents.length} events published by dept faculty`;
  } catch (e) {
    console.error('Events load error:', e);
    document.getElementById('eventsBody').innerHTML = '<tr><td colspan="6" class="no-data">No events or error loading</td></tr>';
  }
}

function renderEvents(list) {
  const tbody = document.getElementById('eventsBody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="no-data">No events published by your department faculty</td></tr>';
    return;
  }
  tbody.innerHTML = list.map((e, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${e.title || '—'}</td>
      <td>${e.date ? new Date(e.date).toLocaleDateString() : '—'}</td>
      <td>${e.venue || '—'}</td>
      <td>${e.publishedByFacultyId?.fullName || e.faculty || '—'}</td>
      <td><button class="btn btn-primary" onclick="viewEvent('${e._id}')">View</button></td>
    </tr>`).join('');
}

function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
  document.getElementById(tab).classList.add('active');
  event.currentTarget.classList.add('active');
  if (tab === 'faculty') loadFaculty();
  if (tab === 'students') loadStudents();
  if (tab === 'events') loadEvents();
}

function filterFacultyList() {
  const q = document.getElementById('facultySearch').value.toLowerCase();
  const filtered = allFaculty.filter(f => 
    (f.fullName || '').toLowerCase().includes(q) || 
    (f.username || '').toLowerCase().includes(q) || 
    (f.email || '').toLowerCase().includes(q)
  );
  renderFaculty(filtered);
}

function filterEventsList() {
  const q = document.getElementById('eventsSearch')?.value.toLowerCase() || '';
  const filtered = allEvents.filter(e => 
    (e.title || '').toLowerCase().includes(q) || 
    (e.publishedByFacultyId?.fullName || '').toLowerCase().includes(q)
  );
  renderEvents(filtered);
}

async function editFaculty(id) {
  try {
    const res = await fetch(`/api/department-head/faculty/${currentDepartmentHead._id}/${id}`);
    const f = await res.json();
    // Open modal form similar to admin.js
    console.log('Edit faculty:', f);
  } catch (e) {
    console.error('Faculty edit error:', e);
  }
}

function viewEvent(id) {
  console.log('View event details:', id);
  // Navigate to event details or modal
}

function logout() {
  localStorage.removeItem('departmentHeadData');
  localStorage.removeItem('role');
  window.location.href = 'index.html';
}
