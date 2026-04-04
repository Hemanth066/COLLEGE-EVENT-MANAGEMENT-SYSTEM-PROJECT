let role = "";

function openLogin(type) {
  role = type;
  document.getElementById("card").classList.add("flipped");
  document.getElementById("loginTitle").innerText =
    type === "faculty" ? "Faculty Login" : "Student Login";
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
    const endpoint = role === "faculty" ? "/api/faculty/login" : "/api/student/login";
    
    const response = await fetch(`${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    console.log('Login response:', data);
    console.log('Response status:', response.status);
    console.log('Role:', role);

    if (response.ok) {
      // Store user data in localStorage with consistent naming
      if (role === "faculty") {
        console.log('Faculty login - storing data:', data.faculty);
        localStorage.setItem("facultyData", JSON.stringify(data.faculty));
        localStorage.setItem("role", "faculty");
        window.location.href = "facultyDashboardNew2.html";
      } else {
        console.log('Student login - storing data:', data.student);
        localStorage.setItem("studentData", JSON.stringify(data.student));
        localStorage.setItem("role", "student");
        console.log('Redirecting to studentDashboard.html');
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
