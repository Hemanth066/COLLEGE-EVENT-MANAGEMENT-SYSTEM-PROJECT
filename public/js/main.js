let role = "";

function getActiveSession() {
  if (localStorage.getItem('studentData')) return { role: 'Student', url: 'studentDashboard.html' };
  if (localStorage.getItem('facultyData')) return { role: 'Faculty', url: 'facultyDashboard.html' };
  if (localStorage.getItem('departmentHeadData')) return { role: 'Department Head / HOD', url: 'departmentHeadDashboard.html' };
  if (localStorage.getItem('adminData')) return { role: 'Admin', url: 'adminDashboard.html' };
  if (localStorage.getItem('deanData')) return { role: 'Dean', url: 'deanDashboard.html' };
  return null;
}

function openLogin(type) {
  const active = getActiveSession();
  if (active) {
    const goToDashboard = confirm(
      `⚠️ An active session is already logged in on this device (${active.role}).\n\n` +
      `Only one active login session at a time is allowed on this device. You must log out of your current session first before logging into another portal or account.\n\n` +
      `Click OK to go to your active ${active.role} dashboard.`
    );
    if (goToDashboard) {
      window.location.href = active.url;
    }
    return;
  }

  role = type;
  document.getElementById("card").classList.add("flipped");
    document.getElementById("loginTitle").innerText =
    type === "faculty" ? "Faculty Login" : type === "hod" ? "HOD Login" : type === "admin" ? "Admin Login" : "Student Login";
}

function goBack() {
  document.getElementById("card").classList.remove("flipped");
}

async function login() {
  const active = getActiveSession();
  if (active) {
    alert(`⚠️ A ${active.role} session is already logged in on this device. Please log out from that dashboard first!`);
    window.location.href = active.url;
    return;
  }

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
        const resetSession = confirm(
          (data.message || "⚠️ Account is already logged in on another device or tab. Please log out from the last page first before logging in!") +
          "\n\nDid you close your last browser without logging out? Click OK to Force Clear your previous session and log in now, or Cancel to go back."
        );
        if (resetSession) {
          let forceEndpoint = "/api/student/force-logout";
          if (role === "faculty") forceEndpoint = "/api/faculty/force-logout";
          else if (role === "admin") forceEndpoint = "/api/admin/force-logout";
          else if (role === "hod" || role === "department-head") forceEndpoint = "/api/department-head/force-logout";

          const forceRes = await fetch(forceEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
          });
          const forceData = await forceRes.json();
          if (forceRes.ok) {
            alert(forceData.message || "Session cleared! Attempting login again...");
            login(); // Retry login
          } else {
            alert(forceData.message || "Failed to clear session.");
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
