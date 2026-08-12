// ================================================================
//  OTHER CERTIFICATES — Student Module
//  Uses the shared .uc-card design system (same as Events/Certificates tabs)
// ================================================================

let _ocPendingCertId = null;

async function ocStudentInit() {
  const loading = document.getElementById('ocStudentLoading');
  const empty   = document.getElementById('ocStudentEmpty');
  const grid    = document.getElementById('ocStudentGrid');
  if (!loading) return;
  loading.style.display = 'block';
  empty.style.display   = 'none';
  grid.style.display    = 'none';
  grid.innerHTML        = '';

  try {
    if (typeof refreshStudentData === 'function') {
      try { await refreshStudentData(); } catch(err) {}
    }
    const sData  = typeof studentData !== 'undefined' && studentData ? studentData : (JSON.parse(localStorage.getItem('studentData')) || {});
    const pin    = (sData.pinNumber || sData.studentId || sData.username || '').trim();
    const branch = (sData.branch || '').trim();

    if (!pin || !branch) {
      loading.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Student PIN or branch not found. Please log in again.</div></div>';
      return;
    }

    const res   = await fetch('/api/other-certs/student/' + encodeURIComponent(pin) + '/' + encodeURIComponent(branch));
    const certs = await res.json();

    loading.style.display = 'none';

    if (!Array.isArray(certs) || !certs.length) {
      empty.style.display = 'block';
      return;
    }

    grid.style.display = 'grid';
    grid.innerHTML = certs.map(function(cert) { return ocBuildCard(cert); }).join('');
  } catch(e) {
    if (loading) loading.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-text">Failed to load certificates.</div></div>';
  }
}

function ocFormatDateTime(val) {
  if (!val) return null;
  var d = new Date(val);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' @ ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function ocBuildCard(cert) {
  var marksText = cert.marksAwarded ? cert.marksAwarded : cert.marks;
  var statusMap = {
    pending:  { cls: 'uc-pill-yellow', text: '⏳ Pending Verification' },
    approved: { cls: 'uc-pill-green',  text: '✅ Approved (+' + marksText + ' Marks Added)' },
    rejected: { cls: 'uc-pill-red',    text: '❌ Rejected' }
  };
  var st = cert.uploadStatus ? (statusMap[cert.uploadStatus] || statusMap.pending) : null;

  var actionHtml = '';
  if (!cert.uploadStatus) {
    if (cert.isExpired) {
      actionHtml = '<div class="uc-status-row"><span class="uc-pill uc-pill-red">⏰ Time Limit Reached (Expired)</span></div>';
    } else {
      actionHtml =
        '<button onclick="ocTriggerUpload(\'' + cert._id + '\')" class="uc-action">' +
          '📤 Upload Certificate' +
        '</button>';
    }
  } else if (cert.uploadStatus === 'approved') {
    actionHtml =
      '<div class="uc-status-row"><span class="uc-pill uc-pill-green" style="font-weight:700;font-size:13px;padding:6px 14px;">' + st.text + '</span></div>' +
      (cert.fileUrl ? '<a href="' + cert.fileUrl + '" target="_blank" class="uc-action" style="display:inline-block;text-align:center;text-decoration:none;background:rgba(34,197,94,0.12);color:#15803d;border:1px solid rgba(34,197,94,0.3);margin-top:8px;">👁 View Submitted Certificate</a>' : '');
  } else if (cert.uploadStatus === 'rejected') {
    actionHtml =
      '<div class="uc-status-row"><span class="uc-pill uc-pill-red">❌ Rejected — contact faculty</span></div>' +
      (!cert.isExpired
        ? '<button onclick="ocTriggerUpload(\'' + cert._id + '\')" class="uc-action">🔄 Re-upload Certificate</button>'
        : '');
  } else {
    // Pending
    actionHtml =
      '<div class="uc-status-row"><span class="uc-pill" style="background:rgba(234,179,8,0.15);color:#ca8a04;font-weight:700;padding:6px 14px;">' + st.text + '</span></div>' +
      (cert.fileUrl ? '<a href="' + cert.fileUrl + '" target="_blank" class="uc-action" style="display:inline-block;text-align:center;text-decoration:none;background:rgba(30,136,229,0.1);color:var(--blue);border:1px solid rgba(30,136,229,0.25);margin-top:8px;">👁 View Uploaded File</a>' : '');
  }

  var descHtml = cert.description
    ? '<div class="uc-info-row"><div class="uc-info-icon">📝</div>' + cert.description + '</div>'
    : '';

  var deadlineStr = ocFormatDateTime(cert.endDate);
  var deadlineHtml = deadlineStr
    ? '<div class="uc-info-row"><div class="uc-info-icon">⏰</div>Deadline: ' + deadlineStr + (cert.isExpired ? ' <span style="color:#ef4444;font-weight:700;">(Ended)</span>' : '') + '</div>'
    : '';

  return (
    '<div class="uc-card">' +
      '<div class="uc-card-top">' +
        '<div class="uc-icon">📜</div>' +
        '<div style="flex:1; min-width:0;">' +
          '<div class="uc-title">' + cert.certificateName + '</div>' +
          '<div class="uc-meta">' +
            '<span class="uc-pill">📍 ' + cert.branch + '</span>' +
            '<span class="uc-pill uc-pill-green">🏆 +' + marksText + ' marks</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="uc-body">' +
        '<div class="uc-info-list">' +
          '<div class="uc-info-row"><div class="uc-info-icon">👤</div>' + (cert.facultyName || 'Faculty') + '</div>' +
          (cert.pinStart && cert.pinEnd
            ? '<div class="uc-info-row"><div class="uc-info-icon">📌</div>PIN Range: ' + cert.pinStart + ' – ' + cert.pinEnd + '</div>'
            : '') +
          deadlineHtml +
          descHtml +
        '</div>' +
        actionHtml +
      '</div>' +
    '</div>'
  );
}

function ocTriggerUpload(certId) {
  _ocPendingCertId = certId;
  var inp = document.getElementById('ocFileInput');
  if (inp) { inp.value = ''; inp.click(); }
}

async function ocStudentUpload(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  var allowed = ['application/pdf','image/jpeg','image/jpg','image/png'];
  if (!allowed.includes(file.type)) {
    alert('Only PDF, JPG, JPEG, PNG files are allowed.');
    input.value = '';
    return;
  }

  // 2MB size limit (2 * 1024 * 1024 bytes)
  var MAX_FILE_SIZE = 2 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    alert('Please compress your PDF to under 2MB and upload');
    input.value = '';
    return;
  }

  var certId = _ocPendingCertId;
  if (!certId) return;

  var fd = new FormData();
  fd.append('certificate', file);
  fd.append('studentPin',  studentData.pinNumber || studentData.studentId || '');
  fd.append('studentName', studentData.fullName  || studentData.username || '');
  fd.append('branch',      studentData.branch    || '');

  // Overlay container centered over main content area (accounting for mobile or desktop sidebar)
  var isMobile = window.innerWidth <= 768;
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:' + (isMobile ? '0' : 'var(--sidebar-w, 260px)') + ';z-index:9999;' +
    'background:rgba(15,23,42,0.35);backdrop-filter:blur(4px);' +
    'display:flex;align-items:center;justify-content:center;padding:20px;';

  var toast = document.createElement('div');
  toast.style.cssText = 'background:white;border:1px solid #e2e8f0;color:#1F2937;' +
    'padding:28px 36px;border-radius:18px;font-size:16px;font-weight:600;text-align:center;' +
    'box-shadow:0 20px 50px rgba(15,76,129,0.25);max-width:440px;width:100%;' +
    'display:flex;flex-direction:column;align-items:center;gap:12px;';

  toast.innerHTML = '<div style="font-size:36px;">⏳</div><div>Uploading certificate...</div>';
  overlay.appendChild(toast);
  document.body.appendChild(overlay);

  try {
    var res  = await fetch('/api/other-certs/upload/' + certId, { method: 'POST', body: fd });
    var data = await res.json();

    if (res.ok) {
      toast.innerHTML = '<div style="font-size:40px;">✅</div><div style="color:#16a34a;font-size:18px;font-weight:700;">Certificate Uploaded!</div><div style="font-size:13px;color:#6B7280;font-weight:400;">Waiting for faculty verification.</div>';
      toast.style.border = '1px solid rgba(34,197,94,0.4)';
      ocStudentInit();
    } else {
      toast.innerHTML = '<div style="font-size:40px;">❌</div><div style="color:#dc2626;font-size:18px;font-weight:700;">Upload Failed</div><div style="font-size:13px;color:#6B7280;font-weight:400;">' + (data.message || 'Please try again.') + '</div>';
      toast.style.border = '1px solid rgba(239,68,68,0.4)';
    }
  } catch(e) {
    toast.innerHTML = '<div style="font-size:40px;">❌</div><div style="color:#dc2626;font-size:18px;font-weight:700;">Network Error</div><div style="font-size:13px;color:#6B7280;font-weight:400;">Please check your connection and try again.</div>';
    toast.style.border = '1px solid rgba(239,68,68,0.4)';
  }

  setTimeout(function() {
    overlay.style.transition = 'opacity 0.3s ease';
    overlay.style.opacity = '0';
    setTimeout(function() { overlay.remove(); }, 300);
  }, 3000);
}