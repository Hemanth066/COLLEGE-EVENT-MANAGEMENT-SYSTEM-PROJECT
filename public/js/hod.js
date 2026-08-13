let currentHod = null;
let allFaculty = [], allStudents = [], allEvents = [], displayedStudents = [];
let selectedFacultyId = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentHod = JSON.parse(localStorage.getItem('hodData'));
  if (!currentHod) {
    window.location.href = 'index.html';
    return;
  }
  
  document.getElementById('profileName').textContent = currentHod.fullName || currentHod.username;
  document.getElementById('welcomeName').textContent = currentHod.fullName || currentHod.username;
  document.getElementById('deptName').textContent = currentHod.department || '—';
  document.getElementById('yearName').textContent = currentHod.year || '—';

  // Load initial dashboard
  await loadStats();
  await loadFaculty();
  await loadEvents();
  await loadStudents();
});

async function loadStats() {
  try {
    const res = await fetch(`/api/hod/stats/${currentHod._id}`);
    const stats = await res.json();
    document.getElementById('statFaculty').textContent = stats.totalFaculty;
    document.getElementById('statStudents').textContent = stats.totalStudents;
    document.getElementById('statEvents').textContent = stats.totalEvents;
    
    let detail = stats.studentsByBranch.map(b => `${b._id.branch}: ${b.count}`).join(', ');
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
    const res = await fetch(`/api/hod/faculty/${currentHod._id}`);
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
  // Similar to faculty, but use aggregation results for counts per branch/section
  // Table shows branch counts
}

async function loadEvents() {
  try {
    const res = await fetch(`/api/hod/events/${currentHod._id}`);
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

function populateTable(tableId, bodyId, data, columns) {
  const tbody = document.getElementById(bodyId);
  tbody.innerHTML = '';
  data.forEach((item, i) => {
    const row = tbody.insertRow();
    row.innerHTML = columns.map(col => `<td>${getNested(item, col) || '—'}</td>`).join('');
    row.insertCell().innerHTML = `<button onclick="editItem('${item._id}')">Edit</button>
                                  <button onclick="deleteItem('${item._id}', '${tableId}')">Delete</button>`;
  });
}

function getNested(obj, path) {
  return path.split('.').reduce((o, p) => o?.[p], obj);
}

function showTab(tab, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
  document.getElementById(tab).classList.add('active');
  if (el) el.classList.add('active');
  if (tab === 'faculty') loadFaculty();
  if (tab === 'students') loadStudents();
  if (tab === 'events') loadEvents();
  if (tab === 'profile') loadHodProfile();
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
    const res = await fetch(`/api/hod/faculty/${currentHod._id}/${id}`);
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

async function loadStudents() {
  try {
    const res = await fetch(`/api/hod/students/${currentHod._id}`);
    if (!res.ok) throw new Error('Failed to load students');
    allStudents = await res.json();
    renderStudents(allStudents);
    document.getElementById('studentCount').textContent = `${allStudents.length} students (Year ${currentHod.year || '—'}, Branch ${currentHod.department || '—'})`;
  } catch (e) {
    console.error('Students load error:', e);
    document.getElementById('studentsBody').innerHTML = '<tr><td colspan="7" class="no-data">Error loading students</td></tr>';
  }
}

function renderStudents(list) {
  const tbody = document.getElementById('studentsBody');
  const downloadWrap = document.getElementById('studentDownloadWrap');

  if (!list || !list.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="no-data">No students found for your branch/year</td></tr>';
    if (downloadWrap) downloadWrap.style.display = 'none';
    return;
  }

  const sortedList = [...list].sort((a, b) => {
    const pinA = String(a.pinNumber || a.studentId || a.username || '').trim();
    const pinB = String(b.pinNumber || b.studentId || b.username || '').trim();
    return pinA.localeCompare(pinB, undefined, { numeric: true, sensitivity: 'base' });
  });

  tbody.innerHTML = sortedList.map((s, i) => {
    const totalScore = (s.score || 0) + (s.eventScore || 0);
    return `<tr>
      <td>${i + 1}</td>
      <td>${s.fullName || s.username || '—'}</td>
      <td>${s.studentId || s.pinNumber || '—'}</td>
      <td>${s.branch || '—'}</td>
      <td>${s.year || '—'}</td>
      <td><strong style="color:var(--blue-dark);">${totalScore}</strong></td>
    </tr>`;
  }).join('');

  if (downloadWrap) downloadWrap.style.display = 'block';
}

// Track currently displayed (filtered) students for download
let displayedStudents = [];

function filterStudentsList() {
  const q = (document.getElementById('studentSearch')?.value || '').toLowerCase().trim();
  const maxScore = document.getElementById('scoreFilter')?.value;
  const threshold = maxScore !== '' && maxScore !== null ? Number(maxScore) : null;

  let filtered = allStudents.filter(s => {
    // Name / PIN search
    const nameMatch = !q ||
      (s.fullName || '').toLowerCase().includes(q) ||
      (s.username || '').toLowerCase().includes(q) ||
      (s.studentId || '').toLowerCase().includes(q) ||
      (s.pinNumber || '').toLowerCase().includes(q);

    // Score filter: show students with total score <= threshold
    const totalScore = (s.score || 0) + (s.eventScore || 0);
    const scoreMatch = threshold === null || totalScore <= threshold;

    return nameMatch && scoreMatch;
  });

  displayedStudents = filtered;

  // Update count label
  const countEl = document.getElementById('studentCount');
  if (countEl) {
    countEl.textContent = threshold !== null
      ? `${filtered.length} students (Max Score: ${threshold})`
      : `${filtered.length} of ${allStudents.length} students`;
  }

  renderStudents(filtered);
}

function clearStudentFilters() {
  const search = document.getElementById('studentSearch');
  const score  = document.getElementById('scoreFilter');
  if (search) search.value = '';
  if (score)  score.value  = '';
  displayedStudents = allStudents;
  document.getElementById('studentCount').textContent =
    `${allStudents.length} students (Year ${currentHod.year || '—'}, Branch ${currentHod.department || '—'})`;
  renderStudents(allStudents);
}

function downloadStudentsCSV() {
  const source = displayedStudents.length ? displayedStudents : allStudents;
  if (!source.length) return;

  const maxScore = document.getElementById('scoreFilter')?.value;
  const threshold = maxScore !== '' ? Number(maxScore) : null;

  const header = ['#', 'Student Name', 'Student ID', 'Branch', 'Year', 'Score'];
  const rows = source.map((s, i) => {
    const totalScore = (s.score || 0) + (s.eventScore || 0);
    return [
      i + 1,
      s.fullName || s.username || '',
      s.studentId || s.pinNumber || '',
      s.branch || '',
      s.year || '',
      totalScore
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const filename = threshold !== null
    ? `students_score_lte_${threshold}.csv`
    : `students_${currentHod.department || 'dept'}_year${currentHod.year || ''}.csv`;
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
// etc.

function logout() {
  localStorage.removeItem('hodData');
  localStorage.removeItem('role');
  window.location.href = 'index.html';
}

// ── PROFILE ──────────────────────────────────────────────────────────────────

async function loadHodProfile() {
  try {
    const res = await fetch(`/api/hod/profile/${currentHod._id}`);
    if (!res.ok) return;
    const p = await res.json();
    currentHod = { ...currentHod, ...p };
    localStorage.setItem('hodData', JSON.stringify(currentHod));

    const name = p.fullName || p.username || 'HOD';
    document.getElementById('hodProfileName').textContent = name;
    document.getElementById('hodProfileAvatar').textContent = name.charAt(0).toUpperCase();
    document.getElementById('hodInfoUsername').textContent = p.username || '—';
    document.getElementById('hodInfoDept').textContent     = p.department || '—';
    document.getElementById('hodInfoYear').textContent     = p.year ? `Year ${p.year}` : '—';
    document.getElementById('hodInfoId').textContent       = p._id || '—';
    document.getElementById('hodEditName').value  = p.fullName || '';
    document.getElementById('hodEditEmail').value = p.email    || '';
    document.getElementById('hodEditPhone').value = p.phone    || '';

    if (p.signatureUrl) {
      document.getElementById('hodSigPreviewImg').src = p.signatureUrl;
      document.getElementById('hodSigPreviewWrap').style.display = 'block';
    } else {
      document.getElementById('hodSigPreviewWrap').style.display = 'none';
    }
  } catch(e) { console.error('Profile load error:', e); }
}

async function updateHodProfile() {
  const fullName = document.getElementById('hodEditName').value.trim();
  const email    = document.getElementById('hodEditEmail').value.trim();
  const phone    = document.getElementById('hodEditPhone').value.trim();
  if (!fullName) return showHodProfileMsg('Please enter your full name.', 'error');
  try {
    const res = await fetch(`/api/hod/profile/${currentHod._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, phone })
    });
    const data = await res.json();
    if (res.ok) {
      currentHod = { ...currentHod, fullName, email, phone };
      localStorage.setItem('hodData', JSON.stringify(currentHod));
      document.getElementById('hodProfileName').textContent = fullName;
      document.getElementById('profileName').textContent   = fullName;
      document.getElementById('sidebarAvatar').textContent = fullName.charAt(0).toUpperCase();
      showHodProfileMsg('✅ Profile updated successfully!', 'success');
    } else { showHodProfileMsg(data.message || 'Update failed.', 'error'); }
  } catch(e) { showHodProfileMsg('Network error.', 'error'); }
}

function showHodProfileMsg(text, type) {
  const el = document.getElementById('hodProfileMsg');
  el.textContent = text; el.style.display = 'block';
  el.style.background = type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
  el.style.border      = type === 'success' ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(239,68,68,0.35)';
  el.style.color       = type === 'success' ? '#16a34a' : '#dc2626';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

async function changeHodPassword() {
  const current = document.getElementById('hodCurrentPwd').value.trim();
  const newPwd  = document.getElementById('hodNewPwd').value.trim();
  const confirm = document.getElementById('hodConfirmPwd').value.trim();
  if (!current || !newPwd || !confirm) return alert('Please fill in all password fields.');
  if (newPwd.length < 6) return alert('New password must be at least 6 characters.');
  if (newPwd !== confirm) return alert('Passwords do not match.');
  try {
    const res = await fetch(`/api/hod/change-password/${currentHod._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, newPassword: newPwd })
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('hodCurrentPwd').value = '';
      document.getElementById('hodNewPwd').value     = '';
      document.getElementById('hodConfirmPwd').value = '';
      alert('✅ Password changed successfully!');
    } else { alert('❌ ' + (data.message || 'Failed to change password.')); }
  } catch(e) { alert('Network error.'); }
}

function hodTogglePwd(inputId, btn) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.textContent = isHidden ? '🙈' : '👁️';
}

let hodSigBase64 = null;

function hodPreviewSignature(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    hodSigBase64 = e.target.result;
    document.getElementById('hodSigNewImg').src = hodSigBase64;
    document.getElementById('hodSigNewPreview').style.display = 'block';
    document.getElementById('hodSigSaveBtn').style.display    = 'block';
  };
  reader.readAsDataURL(file);
}

async function hodSaveSignature() {
  if (!hodSigBase64) return;
  const btn = document.getElementById('hodSigSaveBtn');
  btn.disabled = true; btn.textContent = '⏳ Saving…';
  try {
    const res = await fetch(`/api/hod/signature/${currentHod._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signatureBase64: hodSigBase64 })
    });
    const data = await res.json();
    if (res.ok) {
      currentHod.signatureUrl = data.signatureUrl;
      localStorage.setItem('hodData', JSON.stringify(currentHod));
      document.getElementById('hodSigPreviewImg').src = data.signatureUrl;
      document.getElementById('hodSigPreviewWrap').style.display = 'block';
      document.getElementById('hodSigNewPreview').style.display  = 'none';
      document.getElementById('hodSigSaveBtn').style.display     = 'none';
      document.getElementById('hodSigFileInput').value = '';
      hodSigBase64 = null;
      showHodSigMsg('✅ Signature saved!', 'success');
    } else { showHodSigMsg(data.message || 'Failed.', 'error'); }
  } catch(e) { showHodSigMsg('Network error.', 'error'); }
  finally { btn.disabled = false; btn.textContent = '💾 Save Signature'; }
}

function showHodSigMsg(text, type) {
  const el = document.getElementById('hodSigMsg');
  el.textContent = text; el.style.display = 'block';
  el.style.background = type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
  el.style.border      = type === 'success' ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(239,68,68,0.35)';
  el.style.color       = type === 'success' ? '#16a34a' : '#dc2626';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

