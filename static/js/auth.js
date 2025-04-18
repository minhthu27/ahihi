// Base API URL - change this to your Flask backend URL if needed
const API_URL = "" // Empty string for relative URLs

// Check if user is logged in
function checkAuth() {
  const token = localStorage.getItem("auth_token");
  const path = window.location.pathname;

  // Nếu có token và đang ở index hoặc register thì không redirect
  if (token) {
    if (path === "/" || path === "/index" || path === "/register") {
      return;  // Cho phép user ở lại trang index hoặc register nếu họ muốn
    }
    // Nếu có token mà không phải ở 3 trang trên thì redirect về dashboard
    window.location.href = "/dashboard";
    return;
  }

  // Nếu chưa login, chỉ cho phép index hoặc register
  if (!token && path !== "/" && path !== "/index" && path !== "/register") {
    window.location.href = "/";
  }
}


// Display error message
function showError(elementId, message) {
  const errorElement = document.getElementById(elementId)
  if (!errorElement) {
    // Create error element if not exists
    const form = document.querySelector("form")
    if (form) {
      const errorDiv = document.createElement("div")
      errorDiv.id = elementId
      errorDiv.className = "error-message"
      errorDiv.textContent = message
      errorDiv.style.color = "red"
      errorDiv.style.margin = "10px 0"
      form.prepend(errorDiv)
    } else {
      console.error(message)
    }
  } else {
    errorElement.textContent = message
    errorElement.style.display = "block"
  }
}

// Handle login form submission
function setupLoginForm() {
  const loginForm = document.getElementById("login-form")
  if (!loginForm) return

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const email = document.getElementById("email").value.trim()
    const password = document.getElementById("password").value

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        // If token is invalid, remove it
        localStorage.removeItem("auth_token")

        if (response.status === 404) {
          // Display "Account not found" error
          showError("error-message", "Invalid email or password")
          return
        }

        throw new Error(data.error || "Login failed")
      }

      // Login successful
      localStorage.setItem("auth_token", data.access_token)

      // Redirect to dashboard or the specified redirect URL
      window.location.href = data.redirect || "/dashboard"
    } catch (err) {
      showError("error-message", err.message)
    }
  })
}

// Handle registration form submission
function setupRegisterForm() {
  const registerForm = document.getElementById("register-form")
  if (!registerForm) return

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    // 1. Get form values
    const fullname = document.getElementById("fullname").value.trim()
    const username = document.getElementById("username").value.trim()
    const email = document.getElementById("email").value.trim()
    const password = document.getElementById("password").value
    const confirmPassword = document.getElementById("confirm-password").value

    // 2. Basic frontend validation
    if (!fullname || !username || !email || !password || !confirmPassword) {
      showError("error-message", "Please fill in all fields")
      return
    }

    if (password !== confirmPassword) {
      showError("error-message", "Passwords do not match")
      return
    }

    if (password.length < 6) {
      showError("error-message", "Password must be at least 6 characters")
      return
    }

    try {
      console.log("Sending registration request...") // Debug

      // 3. Send request to backend
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullname,
          username,
          email,
          password,
        }),
      })

      console.log("Server response:", response) // Debug

      // 4. Handle response
      const data = await response.json()

      if (!response.ok) {
        // If server returns an error
        throw new Error(data.error || "Registration failed")
      }

      // 5. Success
      alert("Registration successful! Please log in.")
      window.location.href = "/"
    } catch (err) {
      console.error("Error during registration:", err) // Debug
      // 6. Display detailed error
      let errorMsg = err.message

      if (err.message.includes("Failed to fetch")) {
        errorMsg = "Could not connect to server"
      } else if (err.message.includes("NetworkError")) {
        errorMsg = "Network error, please try again"
      }

      showError("error-message", errorMsg)
    }
  })
}

// Handle logout
function handleLogout() {
  const logoutBtn = document.getElementById("logout-btn")
  if (!logoutBtn) return

  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem("auth_token")
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      }

      // Always clear local storage and redirect
      localStorage.removeItem("auth_token")
      localStorage.removeItem("current_user")
      window.location.href = "/"
    } catch (error) {
      console.error("Logout failed", error)
      // Still clear storage and redirect on error
      localStorage.removeItem("auth_token")
      localStorage.removeItem("current_user")
      window.location.href = "/"
    }
  })
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  checkAuth()
  setupLoginForm()
  setupRegisterForm()

  // Setup logout button if it exists
  const logoutBtn = document.getElementById("logout-btn")
  if (logoutBtn) {
    handleLogout()
  }
})
