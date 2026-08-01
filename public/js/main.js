let role = "";

function getActiveSession() {
  if (localStorage.getItem('studentData')) return { role: 'Student', url: 'studentDashboard.html' };
  if (localStorage.getItem('facultyData')) return { role: 'Faculty', url: 'facultyDashboard.html' };
  if (localStorage.getItem('departmentHeadData')) return { role: 'Department Head / HOD', url: 'departmentHeadDashboard.html' };
  if (localStorage.getItem('adminData')) return { role: 'Admin', url: 'adminDashboard.html' };
  if (localStorage.getItem('deanData')) return { role: 'Dean', url: 'deanDashboard.html' };
  return null;
}

function checkActiveTab() {
  const activeSession = getActiveSession();
  if (!activeSession) return Promise.resolve(null);
  if (typeof BroadcastChannel === 'undefined') return Promise.resolve(activeSession.role);

  return new Promise((resolve) => {
    const channel = new BroadcastChannel('CEM_ACTIVE_TAB_CHANNEL');
    let respondedRole = null;
    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'PONG') {
        respondedRole = event.data.role || activeSession.role;
      }
    };
    channel.postMessage('PING');
    setTimeout(() => {
      channel.close();
      if (!respondedRole) {
        localStorage.removeItem('studentData');
        localStorage.removeItem('facultyData');
        localStorage.removeItem('departmentHeadData');
        localStorage.removeItem('adminData');
        localStorage.removeItem('deanData');
        localStorage.removeItem('role');
        resolve(null);
      } else {
        resolve(respondedRole);
      }
    }, 60);
  });
}

function openLogin(type) {
  role = type;
  document.getElementById("card").classList.add("flipped");
    document.getElementById("loginTitle").innerText =
    type === "faculty" ? "Faculty Login" : type === "hod" ? "HOD Login" : type === "admin" ? "Admin Login" : "Student Login";
}

function goBack() {
  document.getElementById("card").classList.remove("flipped");
}

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  if (!username || !password) {
    alert("Please enter both username and password");
    return;
  }

  try {
    let endpoint;
    if (role === "faculty")  endpoint = "/api/faculty/login";
    else if (role === "admin") endpoint = "/api/admin/login";
    else if (role === "department-head") endpoint = "/api/department-head/login";
    else if (role === "hod") endpoint = "/api/department-head/login";
    else endpoint = "/api/student/login";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.removeItem('studentData');
      localStorage.removeItem('facultyData');
      localStorage.removeItem('departmentHeadData');
      localStorage.removeItem('adminData');
      localStorage.removeItem('deanData');

      if (data.sessionId) localStorage.setItem('sessionId', data.sessionId);

      if (role === "faculty") {
        localStorage.setItem("facultyData", JSON.stringify(data.faculty));
        localStorage.setItem("role", "faculty");
        window.location.href = "facultyDashboard.html";
      } else if (role === "admin") {
        localStorage.setItem("adminData", JSON.stringify(data.admin));
        localStorage.setItem("role", "admin");
        window.location.href = "adminDashboard.html";
      } else if (role === "hod") {
        localStorage.setItem("departmentHeadData", JSON.stringify(data.departmentHead));
        localStorage.setItem("role", "department-head");
        window.location.href = "departmentHeadDashboard.html";
      } else {
        localStorage.setItem("studentData", JSON.stringify(data.student));
        localStorage.setItem("role", "student");
        window.location.href = "studentDashboard.html";
      }
    } else {
      if (data.isAlreadyLoggedIn) {
        const forceLogin = confirm(
          `⚠️ This account (${username}) is currently logged in on another device or browser.\n\n` +
          `Click OK to log out the previous device and log in on this device now, or Cancel to stay here.`
        );
        if (forceLogin) {
          let forceEndpoint = "/api/student/force-logout";
          if (role === "faculty") forceEndpoint = "/api/faculty/force-logout";
          else if (role === "admin") forceEndpoint = "/api/admin/force-logout";
          else if (role === "hod" || role === "department-head") forceEndpoint = "/api/department-head/force-logout";

          const forceRes = await fetch(forceEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
          });
          if (forceRes.ok) {
            login(); // Seamless retry login
          } else {
            const forceData = await forceRes.json();
            alert(forceData.message || "Failed to log out previous device session.");
          }
        }
      } else {
        alert(data.message || "Login failed");
      }
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("Server connection error. Please try again.");
  }
}
