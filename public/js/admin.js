let currentAdmin = null;
let allFaculty = [], allStudents = [], allEvents = [], allRegs = [];
let modalMode = '', modalId = '';

document.addEventListener('DOMContentLoaded', () => {
  currentAdmin = JSON.parse(localStorage.getItem('adminData'));
  if (!currentAdmin) { window.location.href = 'index.html'; return; }
  document.getElementById('adminName').textContent = currentAdmin.fullName || currentAdmin.username || 'Admin';
  loadStats();
});

// ── TAB ────────────────────────────────────────────────
function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
  document.getElementById(tab).classList.add('active');
  event.currentTarget.classList.add('active');
  if (tab === 'faculty')       loadFaculty();
  if (tab === 'students')      loadStudents();
  if (tab === 'events')        loadEvents();
  if (tab === 'registrations') loadRegistrations();
  if (tab === 'hods')          loadHods();
  if (tab === 'deans')         loadDeans();
}

function logout() {
  localStorage.removeItem('adminData');
  window.location.href = 'index.html';
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
  return `
    <div class="form-group"><label>Full Name</label><input id="mFullName" value="${f.fullName||''}"></div>
    <div class="form-group"><label>Username *</label><input id="mUsername" value="${f.username||''}"></div>
    <div class="form-group"><label>Password ${modalMode==='editFaculty'?'(leave blank to keep)':' *'}</label><input id="mPassword" type="password"></div>
    <div class="form-group"><label>Department</label><input id="mDept" value="${f.department||''}"></div>
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
async function loadStudents() {
  const r = await fetch('/api/admin/students');
  allStudents = await r.json();
  renderStudents(allStudents);
}

function filterStudents() {
  const q       = (document.getElementById('filterStudentName')?.value || '').toLowerCase();
  const branch  = document.getElementById('filterBranch').value;
  const section = document.getElementById('filterSection').value;
  const year    = document.getElementById('filterYear').value;

  const filtered = allStudents.filter(s => {
    const matchText = !q || (s.fullName||'').toLowerCase().includes(q) || (s.studentId||'').toLowerCase().includes(q) || (s.username||'').toLowerCase().includes(q);
    const matchBranch  = !branch  || s.branch  === branch;
    const matchSection = !section || s.section === section;
    const matchYear    = !year    || s.year    === year;
    return matchText && matchBranch && matchSection && matchYear;
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
      <td>${s.section||'—'}</td>
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
  const branches = ['CSE','ECE','EEE','MECH','CIVIL','IT','AIDS','AIML'];
  const branchOpts = branches.map(b => `<option value="${b}" ${s.branch===b?'selected':''}>${b}</option>`).join('');
  const sectionOpts = ['1','2','3','4','5','6','7','8','9','10'].map(x => `<option value="${x}" ${s.section===x?'selected':''}>${x}</option>`).join('');
  const yearOpts = ['1','2','3','4'].map(y => `<option value="${y}" ${s.year===y?'selected':''}>${y}</option>`).join('');
  return `
    <div class="form-group"><label>Full Name</label><input id="mFullName" value="${s.fullName||''}"></div>
    <div class="form-group"><label>Username *</label><input id="mUsername" value="${s.username||''}"></div>
    <div class="form-group"><label>Password ${modalMode==='editStudent'?'(leave blank to keep)':' *'}</label><input id="mPassword" type="password"></div>
    <div class="form-group"><label>Student ID</label><input id="mStudentId" value="${s.studentId||''}"></div>
    <div class="form-group"><label>Branch</label>
      <select id="mBranch"><option value="">Select Branch</option>${branchOpts}</select></div>
    <div class="form-group"><label>Section</label>
      <select id="mSection"><option value="">Select Section</option>${sectionOpts}</select></div>
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
                   branch:get('mBranch'), section:get('mSection'), year:get('mYear'),
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
    const body = { fullName:get('mFullName'), username:get('mUsername'),
                   faculty:get('mFaculty'), year:get('mYear'), email:get('mEmail'), phone:get('mPhone') };
    const pwd = get('mPassword');
    if (pwd) body.password = pwd;
    else if (modalMode === 'addDean') { alert('Password is required'); return; }
    const url    = modalMode === 'addDean' ? '/api/admin/deans' : `/api/admin/deans/${modalId}`;
    const method = modalMode === 'addDean' ? 'POST' : 'PUT';
    const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    const d = await r.json();
    closeModal(); showPopup('✅', 'Done', d.message); loadDeans();
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
  const depts = ['CSE','ECE','EEE','MECH','CIVIL','IT','AIDS','AIML','MCA','MBA'];
  const deptOpts = depts.map(d => `<option value="${d}" ${h.department===d?'selected':''}>${d}</option>`).join('');
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
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="8" class="no-data">No Deans found</td></tr>'; return; }
  tbody.innerHTML = list.map((d, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${d.fullName||'—'}</td>
      <td><span class="badge badge-blue">${d.username}</span></td>
      <td>${d.faculty||'—'}</td>
      <td>${d.year||'—'}</td>
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
function deanForm(d) {
  const yearOpts = ['1','2','3','4'].map(y => `<option value="${y}" ${d.year===y?'selected':''}>${y}</option>`).join('');
  return `
    <div class="form-group"><label>Full Name</label><input id="mFullName" value="${d.fullName||''}"></div>
    <div class="form-group"><label>Username *</label><input id="mUsername" value="${d.username||''}"></div>
    <div class="form-group"><label>Password ${modalMode==='editDean'?'(leave blank to keep)':' *'}</label><input id="mPassword" type="password"></div>
    <div class="form-group"><label>Faculty / Division</label><input id="mFaculty" value="${d.faculty||''}"></div>
    <div class="form-group"><label>Year</label>
      <select id="mYear"><option value="">Select Year</option>${yearOpts}</select></div>
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
