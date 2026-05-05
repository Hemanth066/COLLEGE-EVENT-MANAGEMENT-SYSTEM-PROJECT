let role = "";

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
      if (role === "faculty") {
        localStorage.setItem("facultyData", JSON.stringify(data.faculty));
        localStorage.setItem("role", "faculty");
        window.location.href = "facultyDashboardNew2.html";
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
      alert(data.message || "Login failed");
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("Server connection error. Please try again.");
  }
}
