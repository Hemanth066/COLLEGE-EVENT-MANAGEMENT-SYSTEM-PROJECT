if (typeof BroadcastChannel !== 'undefined') {
  const sessionChannel = new BroadcastChannel('CEM_ACTIVE_TAB_CHANNEL');
  sessionChannel.onmessage = (event) => {
    if (event.data === 'PING') {
      sessionChannel.postMessage({ type: 'PONG', role: 'Admin' });
    }
  };
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted || !localStorage.getItem('adminData')) {
    window.location.replace('index.html');
  }
});

function startAdminSessionVerification() {
  setInterval(async () => {
    const aData = JSON.parse(localStorage.getItem('adminData') || '{}');
    const sessId = localStorage.getItem('sessionId');
    if (!aData.username && !aData._id) return;
    try {
      const res = await fetch('/api/admin/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: aData._id, username: aData.username, sessionId: sessId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.valid === false) {
          alert('⚠️ Your account was logged in on another device. You have been logged out.');
          localStorage.clear();
          window.location.replace('index.html');
        }
      }
    } catch (e) {}
  }, 4000);
}

let currentAdmin = null;
let allFaculty = [], allStudents = [], allEvents = [], allRegs = [], allCoordinators = [], allBranches = [];
let modalMode = '', modalId = '';

document.addEventListener('DOMContentLoaded', () => {
  startAdminSessionVerification();
  currentAdmin = JSON.parse(localStorage.getItem('adminData'));
  if (!currentAdmin) { window.location.replace('index.html'); return; }
  document.getElementById('adminName').textContent = currentAdmin.fullName || currentAdmin.username || 'Admin';
  loadStats();
  loadBranches();
});

// ── TAB ────────────────────────────────────────────────
function showTab(tab, element) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
  
  const targetTab = document.getElementById(tab);
  if (targetTab) targetTab.classList.add('active');

  const btn = element || (window.event ? (window.event.currentTarget || window.event.srcElement) : null);
  if (btn && btn.classList) btn.classList.add('active');

  if (tab === 'faculty')       loadFaculty();
  if (tab === 'students')      loadStudents();
  if (tab === 'branches')      loadBranches();
  if (tab === 'events')        loadEvents();
  if (tab === 'registrations') loadRegistrations();
  if (tab === 'hods')          loadHods();
  if (tab === 'deans')         loadDeans();
  if (tab === 'coordinators')  loadCoordinators();
  if (tab === 'settings')      loadSettings();
}

async function loadSettings() {
  try {
    const res = await fetch('/api/admin/settings');
    const data = await res.json();
    const input = document.getElementById('certRetentionInput');
    if (input && data.certificateRetentionDays) {
      input.value = data.certificateRetentionDays;
    }
  } catch (e) {
    console.error('Error loading settings:', e);
  }
}

async function saveCertificateSettings() {
  const input = document.getElementById('certRetentionInput');
  if (input === null) return;
  const days = Number(input.value);
  if (isNaN(days) || days < 0) {
    showPopup('⚠️', 'Invalid Input', 'Please enter a valid number (0 or greater) for retention days.', 'error');
    return;
  }
  try {
    showPopup('⏳', 'Saving...', 'Updating certificate retention period...', 'info');
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ certificateRetentionDays: days })
    });
    const data = await res.json();
    if (res.ok) {
      showPopup('✅', 'Settings Saved', `Certificate retention set to ${days} days.`, 'success');
    } else {
      showPopup('❌', 'Error', data.message || 'Failed to save settings.', 'error');
    }
  } catch (e) {
    showPopup('❌', 'Error', 'Failed to save settings: ' + e.message, 'error');
  }
}

async function triggerManualCleanup() {
  if (!confirm('Are you sure you want to run certificate cleanup now? This will remove generated PDF files older than the retention period from server/Cloudinary storage.')) {
    return;
  }
  try {
    showPopup('⏳', 'Cleaning Up...', 'Removing expired certificate files...', 'info');
    const res = await fetch('/api/admin/cleanup-certificates', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      showPopup('✅', 'Cleanup Completed', data.message || 'Certificate storage cleanup completed successfully.', 'success');
    } else {
      showPopup('❌', 'Cleanup Failed', data.message || 'Error running cleanup.', 'error');
    }
  } catch (e) {
    showPopup('❌', 'Error', 'Cleanup failed: ' + e.message, 'error');
  }
}

async function logout() {
  const aData = JSON.parse(localStorage.getItem('adminData') || '{}');
  try {
    await fetch('/api/admin/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: aData.username, id: aData._id })
    });
  } catch (e) {}
  localStorage.removeItem('adminData');
  window.location.replace('index.html');
}

// ── STATS ──────────────────────────────────────────────
async function loadStats() {
  const r = await fetch('/api/admin/stats');
  const d = await r.json();
  document.getElementById('statStudents').textContent = d.students;
  document.getElementById('statFaculty').textContent  = d.faculty;
  document.getElementById('statEvents').textContent   = d.events;
  document.getElementById('statRegs').textContent     = d.registrations;
}

// ── FACULTY ────────────────────────────────────────────
async function loadFaculty() {
  const r = await fetch('/api/admin/faculty');
  allFaculty = await r.json();
  renderFaculty(allFaculty);
}

function filterFaculty() {
  const q    = (document.getElementById('filterFacultyName')?.value || '').toLowerCase();
  const dept = document.getElementById('filterDept')?.value || '';
  const filtered = allFaculty.filter(f => {
    const matchText = !q || (f.fullName||'').toLowerCase().includes(q) || (f.username||'').toLowerCase().includes(q);
    const matchDept = !dept || f.department === dept;
    return matchText && matchDept;
  });
  renderFaculty(filtered);
}

function renderFaculty(list) {
  const tbody   = document.getElementById('facultyBody');
  const countEl = document.getElementById('facultyCount');
  if (countEl) countEl.textContent = `Showing ${list.length} of ${allFaculty.length} faculty`;
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="7" class="no-data">No faculty match the filter</td></tr>'; return; }
  tbody.innerHTML = list.map((f, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${f.fullName || '—'}</td>
      <td><span class="badge badge-blue">${f.username}</span></td>
      <td>${f.department || '—'}</td>
      <td>${f.email || '—'}</td>
      <td>${f.phone || '—'}</td>
      <td style="display:flex;gap:6px;">
        <button class="btn btn-primary btn-sm" onclick="openEditFaculty('${f._id}')">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteFaculty('${f._id}','${(f.fullName||f.username||'').replace(/'/g,'')}')">🗑️</button>
      </td>
    </tr>`).join('');
}

function openAddFaculty() {
  modalMode = 'addFaculty'; modalId = '';
  document.getElementById('modalTitle').textContent = 'Add Faculty';
  document.getElementById('modalBody').innerHTML = facultyForm({});
  document.getElementById('modalOverlay').classList.add('show');
}

function openEditFaculty(id) {
  const f = allFaculty.find(x => x._id === id);
  if (!f) return;
  modalMode = 'editFaculty'; modalId = id;
  document.getElementById('modalTitle').textContent = 'Edit Faculty';
  document.getElementById('modalBody').innerHTML = facultyForm(f);
  document.getElementById('modalOverlay').classList.add('show');
}

function facultyForm(f) {
  const branchNames = allBranches.length
    ? allBranches.map(b => b.name)
    : ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'DS', 'AIML'];

  const currentDept = (f.department || '').trim().toUpperCase();
  const deptOpts = branchNames.map(b =>
    `<option value="${b}" ${currentDept === b ? 'selected' : ''}>${b}</option>`
  ).join('');

  return `
    <div class="form-group"><label>Full Name</label><input id="mFullName" value="${f.fullName||''}"></div>
    <div class="form-group"><label>Username *</label><input id="mUsername" value="${f.username||''}"></div>
    <div class="form-group"><label>Password ${modalMode==='editFaculty'?'(leave blank to keep)':' *'}</label><input id="mPassword" type="password"></div>
    <div class="form-group">
      <label>Department / Branch *</label>
      <select id="mDept">
        <option value="">Select Branch</option>
        ${deptOpts}
      </select>
    </div>
    <div class="form-group"><label>Email</label><input id="mEmail" value="${f.email||''}"></div>
    <div class="form-group"><label>Phone</label><input id="mPhone" value="${f.phone||''}"></div>`;
}

async function deleteFaculty(id, name) {
  if (!confirm(`Remove faculty "${name}"?`)) return;
  const r = await fetch(`/api/admin/faculty/${id}`, { method:'DELETE' });
  const d = await r.json();
  showPopup('✅', 'Done', d.message);
  loadFaculty(); loadStats();
}

// ── STUDENTS ───────────────────────────────────────────
function matchBranchValue(studentBranch, selectedBranch) {
  if (!selectedBranch) return true;
  if (!studentBranch) return false;
  return String(studentBranch).trim().toLowerCase() === String(selectedBranch).trim().toLowerCase();
}

function matchYearValue(studentYear, selectedYear) {
  if (!selectedYear) return true;
  if (studentYear === undefined || studentYear === null || studentYear === '') return false;

  const sStr = String(studentYear).trim().toLowerCase();
  const selStr = String(selectedYear).trim().toLowerCase();

  if (sStr === selStr) return true;

  const sDigit = sStr.replace(/[^0-9]/g, '');
  const selDigit = selStr.replace(/[^0-9]/g, '');

  if (sDigit && selDigit && sDigit === selDigit) return true;

  return false;
}

function populateBranchOptions(students) {
  const select = document.getElementById('filterBranch');
  if (!select) return;

  const existingValues = new Set(Array.from(select.options).map(o => o.value.trim().toUpperCase()));
  const newBranches = new Set();

  (students || []).forEach(s => {
    if (s.branch) {
      const b = String(s.branch).trim().toUpperCase();
      if (b && !existingValues.has(b)) {
        newBranches.add(b);
      }
    }
  });

  Array.from(newBranches).sort().forEach(b => {
    const opt = document.createElement('option');
    opt.value = b;
    opt.textContent = b;
    select.appendChild(opt);
  });
}

async function loadStudents() {
  const r = await fetch('/api/admin/students');
  allStudents = await r.json();
  populateBranchOptions(allStudents);
  filterStudents();
}

function filterStudents() {
  const q       = (document.getElementById('filterStudentName')?.value || '').toLowerCase().trim();
  const branch  = document.getElementById('filterBranch')?.value || '';
  const year    = document.getElementById('filterYear')?.value || '';

  const filtered = allStudents.filter(s => {
    const matchText = !q ||
      (s.fullName||'').toLowerCase().includes(q) ||
      (s.studentId||'').toLowerCase().includes(q) ||
      (s.username||'').toLowerCase().includes(q) ||
      (s.pinNumber||'').toLowerCase().includes(q) ||
      (s.email||'').toLowerCase().includes(q);

    const matchBranch  = matchBranchValue(s.branch, branch);
    const matchYear    = matchYearValue(s.year, year);
    return matchText && matchBranch && matchYear;
  });
  renderStudents(filtered);
}

function renderStudents(list) {
  const tbody = document.getElementById('studentsBody');
  const countEl = document.getElementById('studentCount');
  if (countEl) countEl.textContent = `Showing ${list.length} of ${allStudents.length} students`;
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="8" class="no-data">No students match the filter</td></tr>'; return; }
  tbody.innerHTML = list.map((s, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${s.fullName || '—'}</td>
      <td><span class="badge badge-green">${s.studentId||'—'}</span></td>
      <td>${s.branch||'—'}</td>
      <td>${s.year||'—'}</td>
      <td>${s.email||'—'}</td>
      <td style="display:flex;gap:6px;">
        <button class="btn btn-primary btn-sm" onclick="openEditStudent('${s._id}')">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s._id}','${(s.fullName||s.username||'').replace(/'/g,'')}')">🗑️</button>
      </td>
    </tr>`).join('');
}

function openAddStudent() {
  modalMode = 'addStudent'; modalId = '';
  document.getElementById('modalTitle').textContent = 'Add Student';
  document.getElementById('modalBody').innerHTML = studentForm({});
  document.getElementById('modalOverlay').classList.add('show');
}

function openEditStudent(id) {
  const s = allStudents.find(x => x._id === id);
  if (!s) return;
  modalMode = 'editStudent'; modalId = id;
  document.getElementById('modalTitle').textContent = 'Edit Student';
  document.getElementById('modalBody').innerHTML = studentForm(s);
  document.getElementById('modalOverlay').classList.add('show');
}

function studentForm(s) {
  const branches = ['CSE','ECE','EEE','MECH','CIVIL','IT','DS','AIML'];
  const branchOpts = branches.map(b => `<option value="${b}" ${s.branch===b?'selected':''}>${b}</option>`).join('');
  const yearOpts = ['1','2','3','4'].map(y => `<option value="${y}" ${s.year===y?'selected':''}>${y}</option>`).join('');
  return `
    <div class="form-group"><label>Full Name</label><input id="mFullName" value="${s.fullName||''}"></div>
    <div class="form-group"><label>Username *</label><input id="mUsername" value="${s.username||''}"></div>
    <div class="form-group"><label>Password ${modalMode==='editStudent'?'(leave blank to keep)':' *'}</label><input id="mPassword" type="password"></div>
    <div class="form-group"><label>Student ID</label><input id="mStudentId" value="${s.studentId||''}"></div>
    <div class="form-group"><label>Branch</label>
      <select id="mBranch"><option value="">Select Branch</option>${branchOpts}</select></div>
    <div class="form-group"><label>Year</label>
      <select id="mYear"><option value="">Select Year</option>${yearOpts}</select></div>
    <div class="form-group"><label>Email</label><input id="mEmail" value="${s.email||''}"></div>
    <div class="form-group"><label>Phone</label><input id="mPhone" value="${s.phone||''}"></div>`;
}

async function deleteStudent(id, name) {
  if (!confirm(`Remove student "${name}"?`)) return;
  const r = await fetch(`/api/admin/students/${id}`, { method:'DELETE' });
  const d = await r.json();
  showPopup('✅', 'Done', d.message);
  loadStudents(); loadStats();
}

// ── BRANCHES ───────────────────────────────────────────
async function loadBranches() {
  try {
    const r = await fetch('/api/admin/branches');
    if (r.ok) {
      allBranches = await r.json();
      renderBranches(allBranches);
      updateBranchDropdowns();
    }
  } catch (e) {
    console.error('Error loading branches:', e);
  }
}

function filterBranches() {
  const q = (document.getElementById('filterBranchName')?.value || '').toLowerCase().trim();
  const filtered = allBranches.filter(b =>
    (b.name || '').toLowerCase().includes(q) ||
    (b.code || '').toLowerCase().includes(q) ||
    (b.description || '').toLowerCase().includes(q)
  );
  renderBranches(filtered);
}

function renderBranches(list) {
  const tbody = document.getElementById('branchesBody');
  const countEl = document.getElementById('branchCount');
  if (countEl) countEl.textContent = `Showing ${list.length} of ${allBranches.length} branches`;
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="no-data">No branches match the search</td></tr>';
    return;
  }
  tbody.innerHTML = list.map((b, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong style="color:var(--blue-dark);font-size:15px;">🌿 ${b.name}</strong></td>
      <td>${b.description || '—'}</td>
      <td>${b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '—'}</td>
      <td style="display:flex;gap:6px;">
        <button class="btn btn-primary btn-sm" onclick="openEditBranch('${b._id}')">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteBranch('${b._id}','${(b.name||'').replace(/'/g,'')}')">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function openAddBranch() {
  modalMode = 'addBranch'; modalId = '';
  document.getElementById('modalTitle').textContent = 'Add New College Branch';
  document.getElementById('modalBody').innerHTML = branchForm({});
  document.getElementById('modalOverlay').classList.add('show');
}

function openEditBranch(id) {
  const b = allBranches.find(x => x._id === id);
  if (!b) return;
  modalMode = 'editBranch'; modalId = id;
  document.getElementById('modalTitle').textContent = 'Edit Branch';
  document.getElementById('modalBody').innerHTML = branchForm(b);
  document.getElementById('modalOverlay').classList.add('show');
}

function branchForm(b) {
  return `
    <div class="form-group">
      <label>Branch Name / Acronym * (e.g. CSE, AIML, ROBOTICS, AIDS)</label>
      <input id="mBranchName" value="${b.name || ''}" placeholder="e.g. ROBOTICS" style="text-transform:uppercase;">
    </div>
    <div class="form-group">
      <label>Full Branch Title / Description</label>
      <input id="mBranchDesc" value="${b.description || ''}" placeholder="e.g. Department of Robotics & Automation">
    </div>
  `;
}

async function deleteBranch(id, name) {
  if (!confirm(`Delete branch "${name}"?`)) return;
  try {
    const r = await fetch(`/api/admin/branches/${id}`, { method: 'DELETE' });
    const d = await r.json();
    showPopup(r.ok ? '✅' : '❌', r.ok ? 'Done' : 'Error', d.message);
    loadBranches();
  } catch (e) {
    showPopup('❌', 'Error', 'Network error.');
  }
}

function updateBranchDropdowns() {
  if (!allBranches.length) return;
  const branchNames = allBranches.map(b => b.name);

  // Update filter dropdowns if present
  ['filterDept', 'filterBranch'].forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    const currentVal = select.value;
    const firstOptLabel = id === 'filterDept' ? 'All Departments' : 'All Branches';
    select.innerHTML = `<option value="">${firstOptLabel}</option>` +
      branchNames.map(b => `<option value="${b}">${b}</option>`).join('');
    if (currentVal && branchNames.includes(currentVal)) select.value = currentVal;
  });
}

// ── EVENTS ─────────────────────────────────────────────
async function loadEvents() {
  const r = await fetch('/api/admin/events');
  allEvents = await r.json();
  const tbody = document.getElementById('eventsBody');
  if (!allEvents.length) { tbody.innerHTML = '<tr><td colspan="6" class="no-data">No events found</td></tr>'; return; }
  tbody.innerHTML = allEvents.map((e, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${e.title||'—'}</td>
      <td>${e.date ? new Date(e.date).toLocaleDateString() : '—'}</td>
      <td>${e.venue||'—'}</td>
      <td>${e.faculty||'—'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteEvent('${e._id}','${(e.title||'').replace(/'/g,'')}')">🗑️ Delete</button></td>
    </tr>`).join('');
}

async function deleteEvent(id, title) {
  if (!confirm(`Delete event "${title}"? All registrations will also be removed.`)) return;
  const r = await fetch(`/api/admin/events/${id}`, { method:'DELETE' });
  const d = await r.json();
  showPopup('✅', 'Done', d.message);
  loadEvents(); loadStats();
}

// ── REGISTRATIONS ──────────────────────────────────────
async function loadRegistrations() {
  const r = await fetch('/api/admin/registrations');
  allRegs = await r.json();
  const tbody = document.getElementById('regsBody');
  if (!allRegs.length) { tbody.innerHTML = '<tr><td colspan="5" class="no-data">No registrations found</td></tr>'; return; }
  tbody.innerHTML = allRegs.map((reg, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${reg.studentName||reg.studentId||'—'}</td>
      <td>${reg.eventId?.title || reg.eventId || '—'}</td>
      <td><span class="badge ${reg.attended?'badge-green':'badge-blue'}">${reg.attended?'Attended':'Registered'}</span></td>
      <td>${reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString() : '—'}</td>
    </tr>`).join('');
}

// ── MODAL SAVE ─────────────────────────────────────────
async function modalSave() {
  const get = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };

  if (modalMode === 'addBranch' || modalMode === 'editBranch') {
    const name = get('mBranchName').toUpperCase();
    const description = get('mBranchDesc');
    if (!name) { alert('Branch Name is required'); return; }

    const url = modalMode === 'addBranch' ? '/api/admin/branches' : `/api/admin/branches/${modalId}`;
    const method = modalMode === 'addBranch' ? 'POST' : 'PUT';
    try {
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });
      const d = await r.json();
      if (r.ok) {
        closeModal();
        showPopup('✅', 'Done', d.message);
        loadBranches();
      } else {
        alert(d.message || 'Error saving branch');
      }
    } catch (e) {
      alert('Network error. Please try again.');
    }
  }

  if (modalMode === 'addFaculty' || modalMode === 'editFaculty') {
    const body = { fullName:get('mFullName'), username:get('mUsername'),
                   department:get('mDept'), email:get('mEmail'), phone:get('mPhone') };
    const pwd = get('mPassword');
    if (pwd) body.password = pwd;
    else if (modalMode === 'addFaculty') { alert('Password is required'); return; }

    const url    = modalMode === 'addFaculty' ? '/api/admin/faculty' : `/api/admin/faculty/${modalId}`;
    const method = modalMode === 'addFaculty' ? 'POST' : 'PUT';
    const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    const d = await r.json();
    closeModal();
    showPopup('✅', 'Done', d.message);
    loadFaculty(); loadStats();
  }

  if (modalMode === 'addStudent' || modalMode === 'editStudent') {
    const body = { fullName:get('mFullName'), username:get('mUsername'), studentId:get('mStudentId'),
                   branch:get('mBranch'), year:get('mYear'),
                   email:get('mEmail'), phone:get('mPhone') };
    const pwd = get('mPassword');
    if (pwd) body.password = pwd;
    else if (modalMode === 'addStudent') { alert('Password is required'); return; }

    const url    = modalMode === 'addStudent' ? '/api/admin/students' : `/api/admin/students/${modalId}`;
    const method = modalMode === 'addStudent' ? 'POST' : 'PUT';
    const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    const d = await r.json();
    closeModal();
    showPopup('✅', 'Done', d.message);
    loadStudents(); loadStats();
  }

  if (modalMode === 'addHod' || modalMode === 'editHod') {
    const body = { fullName:get('mFullName'), username:get('mUsername'),
                   department:get('mDept'), year:get('mYear'), email:get('mEmail'), phone:get('mPhone') };
    const pwd = get('mPassword');
    if (pwd) body.password = pwd;
    else if (modalMode === 'addHod') { alert('Password is required'); return; }
    const url    = modalMode === 'addHod' ? '/api/admin/hods' : `/api/admin/hods/${modalId}`;
    const method = modalMode === 'addHod' ? 'POST' : 'PUT';
    const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    const d = await r.json();
    closeModal(); showPopup('✅', 'Done', d.message); loadHods();
  }

  if (modalMode === 'addDean' || modalMode === 'editDean') {
    let branchesVal = 'ALL';
    const allBranchMaster = document.getElementById('mDeanBranchAll');
    if (allBranchMaster && !allBranchMaster.checked) {
      const selectedBranches = Array.from(document.querySelectorAll('.dean-branch-cb:checked')).map(cb => cb.value);
      if (selectedBranches.length) branchesVal = selectedBranches.join(', ');
    }

    let yearsVal = 'ALL';
    const allYearMaster = document.getElementById('mDeanYearAll');
    if (allYearMaster && !allYearMaster.checked) {
      const selectedYears = Array.from(document.querySelectorAll('.dean-year-cb:checked')).map(cb => cb.value);
      if (selectedYears.length) yearsVal = selectedYears.join(', ');
    }

    const body = {
      fullName: get('mFullName'),
      username: get('mUsername'),
      faculty: get('mFaculty'),
      branches: branchesVal,
      year: yearsVal,
      email: get('mEmail'),
      phone: get('mPhone')
    };
    const pwd = get('mPassword');
    if (pwd) body.password = pwd;
    else if (modalMode === 'addDean') { alert('Password is required'); return; }
    const url    = modalMode === 'addDean' ? '/api/admin/deans' : `/api/admin/deans/${modalId}`;
    const method = modalMode === 'addDean' ? 'POST' : 'PUT';
    const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    const d = await r.json();
    closeModal(); showPopup('✅', 'Done', d.message); loadDeans();
  }

  if (modalMode === 'assignCoordinator') {
    const branch = get('mCoordBranch');
    const facultyId = get('mCoordFaculty');
    if (!branch || !facultyId) { alert('Please select both Branch and Faculty Member'); return; }
    const r = await fetch('/api/admin/coordinators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facultyId, branch })
    });
    const d = await r.json();
    if (!r.ok) { alert(d.message || 'Assignment failed'); return; }
    closeModal(); showPopup('✅', 'Done', d.message); loadCoordinators();
  }
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('show'); }

// ── SEARCH FILTER ──────────────────────────────────────
function filterTable(tableId, query) {
  const q = query.toLowerCase();
  document.querySelectorAll(`#${tableId} tbody tr`).forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

// ── POPUP ──────────────────────────────────────────────
function showPopup(icon, title, msg) {
  document.getElementById('popupIcon').textContent  = icon;
  document.getElementById('popupTitle').textContent = title;
  document.getElementById('popupMsg').textContent   = msg;
  document.getElementById('popupOverlay').classList.add('show');
  document.getElementById('popup').classList.add('show');
}
function closePopup() {
  document.getElementById('popupOverlay').classList.remove('show');
  document.getElementById('popup').classList.remove('show');
}

// ── HOD ────────────────────────────────────────────────
let allHods = [], allDeans = [];

async function loadHods() {
  const r = await fetch('/api/admin/hods');
  allHods = await r.json();
  renderHods(allHods);
}

function filterHods() {
  const q    = (document.getElementById('filterHodName')?.value || '').toLowerCase();
  const dept = document.getElementById('filterHodDept')?.value || '';
  const year = document.getElementById('filterHodYear')?.value || '';
  const filtered = allHods.filter(h =>
    (!q    || (h.fullName||'').toLowerCase().includes(q) || (h.username||'').toLowerCase().includes(q)) &&
    (!dept || h.department === dept) &&
    (!year || h.year === year)
  );
  renderHods(filtered);
}

function renderHods(list) {
  const tbody = document.getElementById('hodsBody');
  const countEl = document.getElementById('hodCount');
  if (countEl) countEl.textContent = `Showing ${list.length} of ${allHods.length} HODs`;
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="8" class="no-data">No HODs found</td></tr>'; return; }
  tbody.innerHTML = list.map((h, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${h.fullName||'—'}</td>
      <td><span class="badge badge-blue">${h.username}</span></td>
      <td>${h.department||'—'}</td>
      <td>${h.year||'—'}</td>
      <td>${h.email||'—'}</td>
      <td>${h.phone||'—'}</td>
      <td style="display:flex;gap:6px;">
        <button class="btn btn-primary btn-sm" onclick="openEditHod('${h._id}')">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteHod('${h._id}','${(h.fullName||h.username||'').replace(/'/g,'')}')">🗑️</button>
      </td>
    </tr>`).join('');
}

function openAddHod() {
  modalMode = 'addHod'; modalId = '';
  document.getElementById('modalTitle').textContent = 'Add HOD';
  document.getElementById('modalBody').innerHTML = hodForm({});
  document.getElementById('modalOverlay').classList.add('show');
}
function openEditHod(id) {
  const h = allHods.find(x => x._id === id); if (!h) return;
  modalMode = 'editHod'; modalId = id;
  document.getElementById('modalTitle').textContent = 'Edit HOD';
  document.getElementById('modalBody').innerHTML = hodForm(h);
  document.getElementById('modalOverlay').classList.add('show');
}
function hodForm(h) {
  const depts = allBranches.length
    ? allBranches.map(b => b.name)
    : ['CSE','ECE','EEE','MECH','CIVIL','IT','DS','AIML','MCA','MBA'];
  const currentDept = (h.department || '').trim().toUpperCase();
  const deptOpts = depts.map(d => `<option value="${d}" ${currentDept===d?'selected':''}>${d}</option>`).join('');
  // Year groups: Year 1 is separate, Years 2-3-4 share one HOD
  const yearGroups = [
    { value:'1',     label:'Year 1 (1st Year HOD)' },
    { value:'2-3-4', label:'Years 2, 3 & 4 (Senior HOD)' }
  ];
  const yearOpts = yearGroups.map(y => `<option value="${y.value}" ${h.year===y.value?'selected':''}>${y.label}</option>`).join('');
  return `
    <div class="form-group"><label>Full Name</label><input id="mFullName" value="${h.fullName||''}"></div>
    <div class="form-group"><label>Username *</label><input id="mUsername" value="${h.username||''}"></div>
    <div class="form-group"><label>Password ${modalMode==='editHod'?'(leave blank to keep)':' *'}</label><input id="mPassword" type="password"></div>
    <div class="form-group"><label>Department</label>
      <select id="mDept"><option value="">Select Department</option>${deptOpts}</select></div>
    <div class="form-group"><label>Year Group</label>
      <select id="mYear"><option value="">Select Year Group</option>${yearOpts}</select></div>
    <div class="form-group"><label>Email</label><input id="mEmail" value="${h.email||''}"></div>
    <div class="form-group"><label>Phone</label><input id="mPhone" value="${h.phone||''}"></div>`;
}
async function deleteHod(id, name) {
  if (!confirm(`Remove HOD "${name}"?`)) return;
  const r = await fetch(`/api/admin/hods/${id}`, { method:'DELETE' });
  const d = await r.json();
  showPopup('✅', 'Done', d.message);
  loadHods();
}

// ── DEAN ───────────────────────────────────────────────
async function loadDeans() {
  const r = await fetch('/api/admin/deans');
  allDeans = await r.json();
  renderDeans(allDeans);
}

function filterDeans() {
  const q    = (document.getElementById('filterDeanName')?.value || '').toLowerCase();
  const year = document.getElementById('filterDeanYear')?.value || '';
  const filtered = allDeans.filter(d =>
    (!q    || (d.fullName||'').toLowerCase().includes(q) || (d.username||'').toLowerCase().includes(q)) &&
    (!year || d.year === year)
  );
  renderDeans(filtered);
}

function renderDeans(list) {
  const tbody = document.getElementById('deansBody');
  const countEl = document.getElementById('deanCount');
  if (countEl) countEl.textContent = `Showing ${list.length} of ${allDeans.length} Deans`;
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="9" class="no-data">No Deans found</td></tr>'; return; }
  tbody.innerHTML = list.map((d, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${d.fullName||'—'}</td>
      <td><span class="badge badge-blue">${d.username}</span></td>
      <td>${d.faculty||'—'}</td>
      <td><span class="badge badge-green">${d.branches || 'ALL'}</span></td>
      <td><span class="badge badge-blue">${d.year || 'ALL'}</span></td>
      <td>${d.email||'—'}</td>
      <td>${d.phone||'—'}</td>
      <td style="display:flex;gap:6px;">
        <button class="btn btn-primary btn-sm" onclick="openEditDean('${d._id}')">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteDean('${d._id}','${(d.fullName||d.username||'').replace(/'/g,'')}')">🗑️</button>
      </td>
    </tr>`).join('');
}

function openAddDean() {
  modalMode = 'addDean'; modalId = '';
  document.getElementById('modalTitle').textContent = 'Add Dean';
  document.getElementById('modalBody').innerHTML = deanForm({});
  document.getElementById('modalOverlay').classList.add('show');
}
function openEditDean(id) {
  const d = allDeans.find(x => x._id === id); if (!d) return;
  modalMode = 'editDean'; modalId = id;
  document.getElementById('modalTitle').textContent = 'Edit Dean';
  document.getElementById('modalBody').innerHTML = deanForm(d);
  document.getElementById('modalOverlay').classList.add('show');
}

function toggleDeanAllBranches(master) {
  if (master.checked) {
    document.querySelectorAll('.dean-branch-cb').forEach(cb => { cb.checked = false; });
  }
}
function uncheckDeanBranchAll() {
  const master = document.getElementById('mDeanBranchAll');
  if (master) master.checked = false;
}
function toggleDeanAllYears(master) {
  if (master.checked) {
    document.querySelectorAll('.dean-year-cb').forEach(cb => { cb.checked = false; });
  }
}
function uncheckDeanYearAll() {
  const master = document.getElementById('mDeanYearAll');
  if (master) master.checked = false;
}

function deanForm(d) {
  const branchesList = allBranches.length
    ? allBranches.map(b => b.name)
    : ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'DS', 'AIML', 'MCA', 'MBA'];
  const yearsList = ['1', '2', '3', '4'];

  const currentBranches = (d.branches || 'ALL').split(',').map(b => b.trim().toUpperCase());
  const currentYears = (d.year || 'ALL').split(',').map(y => y.trim().replace(/[^0-9]/g, ''));

  const isAllBranches = !d.branches || currentBranches.includes('ALL');
  const isAllYears = !d.year || currentYears.includes('ALL');

  const branchCbs = `
    <label style="font-weight:700;color:var(--blue);display:flex;align-items:center;gap:8px;cursor:pointer;padding-bottom:4px;border-bottom:1px solid var(--border);">
      <input type="checkbox" id="mDeanBranchAll" onchange="toggleDeanAllBranches(this)" ${isAllBranches ? 'checked' : ''} style="width:16px;height:16px;"> All Branches
    </label>
    ${branchesList.map(b => `
      <label style="font-size:13px;display:flex;align-items:center;gap:8px;cursor:pointer;">
        <input type="checkbox" class="dean-branch-cb" value="${b}" ${!isAllBranches && currentBranches.includes(b) ? 'checked' : ''} onchange="uncheckDeanBranchAll()" style="width:16px;height:16px;"> ${b}
      </label>
    `).join('')}`;

  const yearCbs = `
    <label style="font-weight:700;color:var(--blue);display:flex;align-items:center;gap:8px;cursor:pointer;padding-bottom:4px;border-bottom:1px solid var(--border);">
      <input type="checkbox" id="mDeanYearAll" onchange="toggleDeanAllYears(this)" ${isAllYears ? 'checked' : ''} style="width:16px;height:16px;"> All Years
    </label>
    ${yearsList.map(y => `
      <label style="font-size:13px;display:flex;align-items:center;gap:8px;cursor:pointer;">
        <input type="checkbox" class="dean-year-cb" value="${y}" ${!isAllYears && currentYears.includes(y) ? 'checked' : ''} onchange="uncheckDeanYearAll()" style="width:16px;height:16px;"> Year ${y}
      </label>
    `).join('')}`;

  return `
    <div class="form-group"><label>Full Name</label><input id="mFullName" value="${d.fullName||''}"></div>
    <div class="form-group"><label>Username *</label><input id="mUsername" value="${d.username||''}"></div>
    <div class="form-group"><label>Password ${modalMode==='editDean'?'(leave blank to keep)':' *'}</label><input id="mPassword" type="password"></div>
    <div class="form-group"><label>Faculty / Division</label><input id="mFaculty" value="${d.faculty||''}"></div>
    <div class="form-group">
      <label>Assigned Branch(es) * (Selected line by line)</label>
      <div style="display:flex;flex-direction:column;gap:8px;max-height:180px;overflow-y:auto;background:#f8fafc;padding:12px;border-radius:10px;border:1px solid var(--border);">
        ${branchCbs}
      </div>
    </div>
    <div class="form-group">
      <label>Assigned Year(s) * (Selected line by line)</label>
      <div style="display:flex;flex-direction:column;gap:8px;max-height:150px;overflow-y:auto;background:#f8fafc;padding:12px;border-radius:10px;border:1px solid var(--border);">
        ${yearCbs}
      </div>
    </div>
    <div class="form-group"><label>Email</label><input id="mEmail" value="${d.email||''}"></div>
    <div class="form-group"><label>Phone</label><input id="mPhone" value="${d.phone||''}"></div>`;
}
async function deleteDean(id, name) {
  if (!confirm(`Remove Dean "${name}"?`)) return;
  const r = await fetch(`/api/admin/deans/${id}`, { method:'DELETE' });
  const d = await r.json();
  showPopup('✅', 'Done', d.message);
  loadDeans();
}

// ── COORDINATORS ──────────────────────────────────────
async function loadCoordinators() {
  const [rCoords, rFac] = await Promise.all([
    fetch('/api/admin/coordinators'),
    fetch('/api/admin/faculty')
  ]);
  allCoordinators = await rCoords.json();
  allFaculty = await rFac.json();
  renderCoordinators();
}

function renderCoordinators() {
  const tbody = document.getElementById('coordinatorsBody');
  if (!tbody) return;

  const branches = allBranches.length
    ? allBranches.map(b => b.name)
    : ['CSE','ECE','EEE','MECH','CIVIL','IT','DS','AIML'];
  
  tbody.innerHTML = branches.map((b, i) => {
    const c = allCoordinators.find(x => x.coordinatorBranch === b);
    return `
      <tr>
        <td>${i+1}</td>
        <td><strong style="color:var(--blue-dark);">${b}</strong></td>
        <td>${c ? `<strong>${c.fullName || c.username}</strong> <span style="font-size:11px;background:rgba(234,179,8,0.15);color:#b45309;padding:2px 8px;border-radius:12px;font-weight:600;margin-left:4px;">⭐ Coordinator</span>` : '<span style="color:var(--muted);font-style:italic;">Not Assigned</span>'}</td>
        <td>${c?.username || '—'}</td>
        <td>${c?.department || '—'}</td>
        <td>${c?.email || '—'}</td>
        <td>${c?.phone || '—'}</td>
        <td>
          ${c ? `<button class="btn btn-danger btn-sm" onclick="removeCoordinator('${c._id}','${b}')">Unassign</button>` : `<button class="btn btn-primary btn-sm" onclick="openAssignCoordinator('${b}')">Assign</button>`}
        </td>
      </tr>`;
  }).join('');
}

function updateCoordFacultyList(selectedBranch) {
  const select = document.getElementById('mCoordFaculty');
  if (!select) return;
  const selB = (selectedBranch || '').trim().toLowerCase();

  const filteredFaculty = allFaculty.filter(f => {
    if (!selB) return true;
    const dept = (f.department || '').trim().toLowerCase();
    return dept === selB;
  });

  if (!filteredFaculty.length) {
    select.innerHTML = `<option value="">No faculty members found for ${selectedBranch || 'this branch'}</option>`;
    return;
  }

  select.innerHTML = '<option value="">Select Faculty Member</option>' +
    filteredFaculty.map(f => `<option value="${f._id}">${f.fullName || f.username} (${f.department || 'No Dept'})</option>`).join('');
}

function openAssignCoordinator(defaultBranch = '') {
  modalMode = 'assignCoordinator'; modalId = '';
  document.getElementById('modalTitle').textContent = 'Assign Branch Coordinator';
  
  const branches = allBranches.length
    ? allBranches.map(b => b.name)
    : ['CSE','ECE','EEE','MECH','CIVIL','IT','DS','AIML'];
  const branchOpts = branches.map(b => `<option value="${b}" ${defaultBranch===b?'selected':''}>${b}</option>`).join('');
  
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group">
      <label>Select Branch *</label>
      <select id="mCoordBranch" onchange="updateCoordFacultyList(this.value)"><option value="">Select Branch</option>${branchOpts}</select>
    </div>
    <div class="form-group">
      <label>Select Faculty Member *</label>
      <select id="mCoordFaculty"><option value="">Select Faculty</option></select>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-top:8px;">
      ℹ️ Only faculty belonging to the selected branch are displayed. This faculty will be designated as Coordinator for Years 2, 3 & 4.
    </div>`;

  document.getElementById('modalOverlay').classList.add('show');
  updateCoordFacultyList(defaultBranch);
}

async function removeCoordinator(id, branch) {
  if (!confirm(`Remove Coordinator role for branch "${branch}"?`)) return;
  const r = await fetch(`/api/admin/coordinators/${id}`, { method:'DELETE' });
  const d = await r.json();
  showPopup('✅', 'Done', d.message);
  loadCoordinators();
}
function toggleSidebar(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const sidebar = document.querySelector(".sidebar");
  if (sidebar) sidebar.classList.toggle("show");
}

document.addEventListener("click", function(e) {
  const sidebar = document.querySelector(".sidebar");
  const btn = document.querySelector(".hamburger-btn") || document.querySelector(".mobile-menu-btn");

  if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains("show")) {
    if (!sidebar.contains(e.target) && (!btn || !btn.contains(e.target))) {
      sidebar.classList.remove("show");
    }
  }
});