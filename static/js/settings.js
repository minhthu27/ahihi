document.addEventListener("DOMContentLoaded", () => {
    // Check if user is logged in
    const token = localStorage.getItem("auth_token")
    if (!token) {
      window.location.href = "/"
      return
    }
  
    // Initialize settings page
    initializeSettings()
  })
 
  // Initialize settings page
  function initializeSettings() {
    // Fetch current user data
    fetchCurrentUser()
  
    // Setup settings navigation
    setupSettingsNavigation()
  
    // Load settings data
    loadSettingsData()
  
    // Setup form submissions
    setupFormSubmissions()
  
    // Setup avatar and cover upload
    setupImageUploads()
  
    // Setup delete account modal
    setupDeleteAccountModal()
  
    // Setup user dropdown menu
    setupUserDropdown()
  
    // Setup theme toggle
    setupThemeToggle()
  
    // Setup message closing
    setupMessageClosing()

    // Setup profile navigation links
    setupProfileNavigation()

    setupFormSubmissions();
    setupPrivacyForm(); 
  }
  function setupProfileNavigation() {
    // Get all profile links in the settings page
    const profileLinks = document.querySelectorAll('a[href="/profile"], a[href="profile"]');
    
    profileLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Get the current user ID from localStorage
        const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}");
        if (currentUser && currentUser._id) {
          // Navigate to the profile with the user ID
          window.location.href = `/profile/${currentUser._id}`;
        } else {
          // If for some reason we don't have the ID, fetch it first
          const token = localStorage.getItem("auth_token");
          if (token) {
            fetch("/api/profile/me", {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            })
            .then(response => response.json())
            .then(userData => {
              window.location.href = `/profile/${userData._id}`;
            })
            .catch(error => {
              console.error("Error fetching user data:", error);
              // If all else fails, try the default profile route
              window.location.href = "/profile";
            });
          } else {
            window.location.href = "/";
          }
        }
      });
    });
  }
  
  // Fetch current user data
  async function fetchCurrentUser() {
    try {
      const token = localStorage.getItem("auth_token")
  
      const response = await fetch("/api/profile/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
  
      if (!response.ok) {
        throw new Error("Failed to fetch user data")
      }
  
      const userData = await response.json()
  
      updateCurrentUserUI(userData)
      localStorage.setItem("current_user", JSON.stringify(userData))
      loadFollowingList(userData._id)
    } catch (error) {
      showError("Failed to fetch user data. Please try again later.")
      console.error("Error fetching user data:", error)
    }
  }
  
  // Update UI with current user data
  function updateCurrentUserUI(userData) {
    const userNameElements = document.querySelectorAll("#current-user-name")
    const userHandleElements = document.querySelectorAll("#current-user-handle")
    const userAvatarElements = document.querySelectorAll("#current-user-avatar")
  
    // Thêm timestamp để tránh cache
    const timestamp = new Date().getTime()
  
    userNameElements.forEach((el) => {
      if (el) el.textContent = userData.fullname || userData.username
    })
  
    userHandleElements.forEach((el) => {
      if (el) el.textContent = `@${userData.username}`
    })
  
    userAvatarElements.forEach((el) => {
      if (el) {
        const avatarSrc = userData.avatar || "/static/uploads/default-avatar-1.jpg"
        el.src = `${avatarSrc}?t=${timestamp}`
        el.alt = userData.fullname || userData.username
      }
    })
  
    // Cập nhật avatar trong comment forms
    const commentAvatars = document.querySelectorAll(".add-comment .user-avatar img")
    commentAvatars.forEach((avatar) => {
      const avatarSrc = userData.avatar || "/static/uploads/default-avatar-1.jpg"
      avatar.src = `${avatarSrc}?t=${timestamp}`
      avatar.alt = userData.fullname || userData.username
    })
  
    // Cập nhật avatar trong các bài post của người dùng
    updateUserPostsAvatar(userData.avatar)
  }
  
  function updateUserPostsAvatar(avatarUrl) {
    if (!avatarUrl) return
  
    const currentUser = JSON.parse(localStorage.getItem("current_user"))
    if (!currentUser || !currentUser._id) return
  
    const timestamp = new Date().getTime()
    const posts = document.querySelectorAll(".post")
  
    posts.forEach((post) => {
      const authorId = post.dataset.authorId
      if (authorId === currentUser._id) {
        const avatarImg = post.querySelector(".post-header .user-avatar img")
        if (avatarImg) {
          avatarImg.src = `${avatarUrl}?t=${timestamp}`
        }
      }
    })
  }
  // Load following list
  async function loadFollowingList(userId) {
    try {
      const token = localStorage.getItem("auth_token")
      const followingContainer = document.querySelector(".following-list")
      if (!followingContainer) return
  
      followingContainer.innerHTML = `
        <div class="loading-spinner small">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
      `
  
      const response = await fetch(`/api/profile/following/id/${userId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
  
      if (!response.ok) throw new Error("Failed to fetch following list")
  
      const followingUsers = await response.json()
      followingContainer.innerHTML = ""
  
      if (followingUsers.length === 0) {
        followingContainer.innerHTML = `
          <div class="no-following">
            <p>Not following anyone yet.</p>
          </div>
        `
        return
      }
  
      followingUsers.forEach((user) => {
        const userElement = document.createElement("li")
        userElement.innerHTML = `
          <a href="/profile/${user._id}" class="following-item">
            <div class="user-avatar mini">
              <img src="${user.avatar || "/static/uploads/default-avatar-1.jpg"}" alt="${user.fullname || user.username}">
            </div>
            <span>${user.fullname || user.username}</span>
          </a>
        `
        followingContainer.appendChild(userElement)
      })
    } catch (error) {
      console.error("Error loading following list:", error)
      const followingContainer = document.querySelector(".following-list")
      if (followingContainer) {
        followingContainer.innerHTML = `
          <div class="error-message">
            <p>Failed to load following list.</p>
          </div>
        `
      }
    }
  }
  
  // Setup settings navigation
  function setupSettingsNavigation() {
    const navButtons = document.querySelectorAll(".settings-nav-btn")
    const tabContents = document.querySelectorAll(".settings-tab")
  
    navButtons.forEach((button) => {
      button.addEventListener("click", () => {
        // Remove active class from all buttons and tabs
        navButtons.forEach((btn) => btn.classList.remove("active"))
        tabContents.forEach((tab) => tab.classList.remove("active"))
  
        // Add active class to clicked button and corresponding tab
        button.classList.add("active")
        const tabId = button.dataset.tab
        document.getElementById(tabId).classList.add("active")
      })
    })
  }
  
  // Load settings data
  function loadSettingsData() {
    try {
      const token = localStorage.getItem("auth_token")
  
      // Show loading state
      document.querySelectorAll(".settings-section").forEach((section) => {
        section.classList.add("loading")
      })
  
      // Fetch settings data
      fetch("/api/settings/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch settings data")
          }
          return response.json()
        })
        .then((settingsData) => {
          // Populate profile settings
          document.getElementById("fullname").value = settingsData.fullname || ""
          document.getElementById("username").value = settingsData.username || ""
          document.getElementById("bio").value = settingsData.bio || ""
          document.getElementById("email").value = settingsData.email || ""
  
          // Set avatar and cover images with timestamp to prevent caching
          const timestamp = new Date().getTime()
          const avatarPreview = document.getElementById("avatar-preview")
          if (avatarPreview) {
            avatarPreview.src = settingsData.avatar
              ? `${settingsData.avatar}?t=${timestamp}`
              : "/static/uploads/default-avatar-1.jpg"
          }
  
          const coverPreview = document.getElementById("cover-preview")
          if (coverPreview) {
            coverPreview.src = settingsData.cover
              ? `${settingsData.cover}?t=${timestamp}`
              : "/static/uploads/default-cover.jpg"
          }
  
          // Set privacy settings
          if (settingsData.privacy_settings) {
            const profileVisibility = settingsData.privacy_settings.profile_visibility || "public"
            const postVisibility = settingsData.privacy_settings.post_visibility || "public"
            const showOnlineStatus = settingsData.privacy_settings.show_online_status !== false
  
            document.querySelector(`input[name="profile_visibility"][value="${profileVisibility}"]`).checked = true
            document.querySelector(`input[name="post_visibility"][value="${postVisibility}"]`).checked = true
            document.querySelector('input[name="show_online_status"]').checked = showOnlineStatus
          }
  
          // Set notification settings
          if (settingsData.notification_settings) {
            const notificationSettings = settingsData.notification_settings
            document.querySelector('input[name="email_notifications"]').checked =
              notificationSettings.email_notifications !== false
            document.querySelector('input[name="push_notifications"]').checked =
              notificationSettings.push_notifications !== false
            document.querySelector('input[name="new_follower"]').checked = notificationSettings.new_follower !== false
            document.querySelector('input[name="post_likes"]').checked = notificationSettings.post_likes !== false
            document.querySelector('input[name="post_comments"]').checked = notificationSettings.post_comments !== false
            document.querySelector('input[name="mentions"]').checked = notificationSettings.mentions !== false
          }
  
          // Set theme
          const theme = settingsData.theme || "light"
          document.querySelector(`input[name="theme"][value="${theme}"]`).checked = true
  
          // Apply theme if it's dark
          if (theme === "dark") {
            document.body.classList.add("dark-mode")
          }
  
          // Remove loading state
          document.querySelectorAll(".settings-section").forEach((section) => {
            section.classList.remove("loading")
          })
        })
        .catch((error) => {
          console.error("Error loading settings data:", error)
          showError("Failed to load settings data. Please try again later.")
  
          // Remove loading state
          document.querySelectorAll(".settings-section").forEach((section) => {
            section.classList.remove("loading")
          })
        })
    } catch (error) {
      console.error("Error loading settings data:", error)
      showError("Failed to load settings data. Please try again later.")
  
      // Remove loading state
      document.querySelectorAll(".settings-section").forEach((section) => {
        section.classList.remove("loading")
      })
    }
  }
  
  
  // Setup form submissions
  function setupFormSubmissions() {
    // Profile form
    const profileForm = document.getElementById("profile-form")
    if (profileForm) {
      profileForm.addEventListener("submit", async (e) => {
        e.preventDefault()
  
        try {
          const token = localStorage.getItem("auth_token")
          const formData = {
            fullname: document.getElementById("fullname").value,
            username: document.getElementById("username").value,
            bio: document.getElementById("bio").value,
          }
  
          // Show loading state
          const submitBtn = profileForm.querySelector(".save-btn")
          const originalBtnText = submitBtn.textContent
          submitBtn.disabled = true
          submitBtn.textContent = "Saving..."
  
          const response = await fetch("/api/settings/profile", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
          })
  
          const result = await response.json()
  
          if (!response.ok) {
            throw new Error(result.error || "Failed to update profile settings")
          }
  
          // Reset button
          submitBtn.disabled = false
          submitBtn.textContent = originalBtnText
  
          // Show success message
          showSuccess("Profile settings updated successfully!")
  
          // Update current user data in localStorage
          const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}")
          const updatedUser = {
            ...currentUser,
            fullname: formData.fullname,
            username: formData.username,
            bio: formData.bio,
          }
          localStorage.setItem("current_user", JSON.stringify(updatedUser))
  
          // Update current user UI without refreshing
          updateCurrentUserUI(updatedUser)
        } catch (error) {
          console.error("Error updating profile settings:", error)
          showError(error.message || "Failed to update profile settings. Please try again.")
  
          // Reset button
          const submitBtn = profileForm.querySelector(".save-btn")
          submitBtn.disabled = false
          submitBtn.textContent = "Save Changes"
        }
      })
    }
  
    // Email form
    const emailForm = document.getElementById("email-form")
    if (emailForm) {
      emailForm.addEventListener("submit", async (e) => {
        e.preventDefault()
  
        try {
          const token = localStorage.getItem("auth_token")
          const formData = {
            email: document.getElementById("email").value,
          }
  
          // Show loading state
          const submitBtn = emailForm.querySelector(".save-btn")
          const originalBtnText = submitBtn.textContent
          submitBtn.disabled = true
          submitBtn.textContent = "Updating..."
  
          const response = await fetch("/api/settings/profile", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
          })
  
          const result = await response.json()
  
          if (!response.ok) {
            throw new Error(result.error || "Failed to update email")
          }
  
          // Reset button
          submitBtn.disabled = false
          submitBtn.textContent = originalBtnText
  
          // Show success message
          showSuccess("Email updated successfully!")
  
          // Update current user data in localStorage
          const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}")
          currentUser.email = formData.email
          localStorage.setItem("current_user", JSON.stringify(currentUser))
        } catch (error) {
          console.error("Error updating email:", error)
          showError(error.message || "Failed to update email. Please try again.")
  
          // Reset button
          const submitBtn = emailForm.querySelector(".save-btn")
          submitBtn.disabled = false
          submitBtn.textContent = "Update Email"
        }
      })
    }
  
    // Password form
    const passwordForm = document.getElementById("password-form");
  if (passwordForm) {
    passwordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      try {
        const token = localStorage.getItem("auth_token");
        const currentPassword = document.getElementById("current-password").value;
        const newPassword = document.getElementById("new-password").value;
        const confirmPassword = document.getElementById("confirm-password").value;
        
        // Clear previous error messages
        clearPasswordErrors();
        
        // Validate passwords
        let hasErrors = false;
        
        if (!currentPassword) {
          showPasswordError("current-password", "Current password is required");
          hasErrors = true;
        }
        
        if (!newPassword) {
          showPasswordError("new-password", "New password is required");
          hasErrors = true;
        } else if (newPassword.length < 6) {
          showPasswordError("new-password", "New password must be at least 6 characters long");
          hasErrors = true;
        }
        
        if (!confirmPassword) {
          showPasswordError("confirm-password", "Please confirm your new password");
          hasErrors = true;
        } else if (newPassword !== confirmPassword) {
          showPasswordError("confirm-password", "Passwords do not match");
          hasErrors = true;
        }
        
        if (hasErrors) {
          return;
        }
        
        // Show loading state
        const submitBtn = passwordForm.querySelector(".save-btn");
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Changing...";
        
        const response = await fetch("/api/settings/password", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          if (result.error && result.error.includes("Current password is incorrect")) {
            showPasswordError("current-password", "Current password is incorrect");
          } else {
            throw new Error(result.error || "Failed to update password");
          }
          
          // Reset button
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
          return;
        }
        
        // Reset form
        passwordForm.reset();
        
        // Reset button
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        
        // Show success message
        showSuccess("Password updated successfully!");
      } catch (error) {
        console.error("Error updating password:", error);
        showError(error.message || "Failed to update password. Please try again.");
        
        // Reset button
        const submitBtn = passwordForm.querySelector(".save-btn");
        submitBtn.disabled = false;
        submitBtn.textContent = "Change Password";
      }
    });
  }
  
    // Privacy form
    const privacyForm = document.getElementById("privacy-form")
    if (privacyForm) {
      privacyForm.addEventListener("submit", async (e) => {
        e.preventDefault()
  
        try {
          const token = localStorage.getItem("auth_token")
          const formData = {
            profile_visibility: document.querySelector('input[name="profile_visibility"]:checked').value,
            post_visibility: document.querySelector('input[name="post_visibility"]:checked').value,
            show_online_status: document.querySelector('input[name="show_online_status"]').checked,
          }
  
          // Show loading state
          const submitBtn = privacyForm.querySelector(".save-btn")
          const originalBtnText = submitBtn.textContent
          submitBtn.disabled = true
          submitBtn.textContent = "Saving..."
  
          const response = await fetch("/api/settings/privacy", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
          })
  
          const result = await response.json()
  
          if (!response.ok) {
            throw new Error(result.error || "Failed to update privacy settings")
          }
  
          // Reset button
          submitBtn.disabled = false
          submitBtn.textContent = originalBtnText
  
          // Show success message
          showSuccess("Privacy settings updated successfully!")
  
          // Update current user data in localStorage
          const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}")
          currentUser.privacy_settings = formData
          localStorage.setItem("current_user", JSON.stringify(currentUser))
        } catch (error) {
          console.error("Error updating privacy settings:", error)
          showError(error.message || "Failed to update privacy settings. Please try again.")
  
          // Reset button
          const submitBtn = privacyForm.querySelector(".save-btn")
          submitBtn.disabled = false
          submitBtn.textContent = "Save Privacy Settings"
        }
      })
    }
  
    // Notification form
    const notificationForm = document.getElementById("notification-form")
    if (notificationForm) {
      notificationForm.addEventListener("submit", async (e) => {
        e.preventDefault()
  
        try {
          const token = localStorage.getItem("auth_token")
          const formData = {
            email_notifications: document.querySelector('input[name="email_notifications"]').checked,
            push_notifications: document.querySelector('input[name="push_notifications"]').checked,
            new_follower: document.querySelector('input[name="new_follower"]').checked,
            post_likes: document.querySelector('input[name="post_likes"]').checked,
            post_comments: document.querySelector('input[name="post_comments"]').checked,
            mentions: document.querySelector('input[name="mentions"]').checked,
          }
  
          // Show loading state
          const submitBtn = notificationForm.querySelector(".save-btn")
          const originalBtnText = submitBtn.textContent
          submitBtn.disabled = true
          submitBtn.textContent = "Saving..."
  
          const response = await fetch("/api/settings/notifications", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
          })
  
          const result = await response.json()
  
          if (!response.ok) {
            throw new Error(result.error || "Failed to update notification settings")
          }
  
          // Reset button
          submitBtn.disabled = false
          submitBtn.textContent = originalBtnText
  
          // Show success message
          showSuccess("Notification settings updated successfully!")
  
          // Update current user data in localStorage
          const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}")
          currentUser.notification_settings = formData
          localStorage.setItem("current_user", JSON.stringify(currentUser))
        } catch (error) {
          console.error("Error updating notification settings:", error)
          showError(error.message || "Failed to update notification settings. Please try again.")
  
          // Reset button
          const submitBtn = notificationForm.querySelector(".save-btn")
          submitBtn.disabled = false
          submitBtn.textContent = "Save Notification Settings"
        }
      })
    }
  
    // Theme form
    const themeForm = document.getElementById("theme-form")
    if (themeForm) {
      themeForm.addEventListener("submit", async (e) => {
        e.preventDefault()
  
        try {
          const token = localStorage.getItem("auth_token")
          const theme = document.querySelector('input[name="theme"]:checked').value
  
          // Show loading state
          const submitBtn = themeForm.querySelector(".save-btn")
          const originalBtnText = submitBtn.textContent
          submitBtn.disabled = true
          submitBtn.textContent = "Saving..."
  
          const response = await fetch("/api/settings/theme", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ theme }),
          })
  
          const result = await response.json()
  
          if (!response.ok) {
            throw new Error(result.error || "Failed to update theme")
          }
  
          // Apply theme
          if (theme === "dark") {
            document.body.classList.add("dark-mode")
          } else {
            document.body.classList.remove("dark-mode")
          }
  
          // Save theme preference to localStorage
          localStorage.setItem("dark_mode", theme === "dark")
  
          // Update theme toggle in user dropdown
          const themeToggle = document.getElementById("theme-toggle")
          if (themeToggle) {
            if (theme === "dark") {
              themeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode'
            } else {
              themeToggle.innerHTML = '<i class="fas fa-moon"></i> Dark Mode'
            }
          }
  
          // Reset button
          submitBtn.disabled = false
          submitBtn.textContent = originalBtnText
  
          // Show success message
          showSuccess("Theme updated successfully!")
  
          // Update current user data in localStorage
          const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}")
          currentUser.theme = theme
          localStorage.setItem("current_user", JSON.stringify(currentUser))
        } catch (error) {
          console.error("Error updating theme:", error)
          showError(error.message || "Failed to update theme. Please try again.")
  
          // Reset button
          const submitBtn = themeForm.querySelector(".save-btn")
          submitBtn.disabled = false
          submitBtn.textContent = "Save Theme"
        }
      })
    }
  }
  
  
  // Setup image uploads
  function setupImageUploads() {
    // Avatar upload
    const avatarUpload = document.getElementById("avatar-upload")
    const avatarPreview = document.getElementById("avatar-preview")
    const removeAvatarBtn = document.getElementById("remove-avatar")
  
    if (avatarUpload && avatarPreview) {
      avatarUpload.addEventListener("change", async (e) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0]
  
          // Preview image
          const reader = new FileReader()
          reader.onload = (e) => {
            avatarPreview.src = e.target.result
          }
          reader.readAsDataURL(file)
  
          // Upload image
          await uploadImage(file, "avatar")
        }
      })
    }
  
    if (removeAvatarBtn) {
      removeAvatarBtn.addEventListener("click", async () => {
        // Confirm removal
        if (confirm("Are you sure you want to remove your profile picture?")) {
          try {
            const token = localStorage.getItem("auth_token")
  
            // Show loading state
            removeAvatarBtn.disabled = true
            removeAvatarBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removing...'
  
            // Set default avatar
            avatarPreview.src = "/static/uploads/default-avatar-1.jpg"
  
            // Update in database
            const response = await fetch("/api/settings/profile", {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ avatar: "/static/uploads/default-avatar-1.jpg" }),
            })
  
            const result = await response.json()
  
            if (!response.ok) {
              throw new Error(result.error || "Failed to remove profile picture")
            }
  
            // Reset button
            removeAvatarBtn.disabled = false
            removeAvatarBtn.innerHTML = '<i class="fas fa-trash"></i> Remove Picture'
  
            // Show success message
            showSuccess("Profile picture removed successfully!")
  
            // Update current user data in localStorage
            const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}")
            currentUser.avatar = "/static/uploads/default-avatar-1.jpg"
            localStorage.setItem("current_user", JSON.stringify(currentUser))
  
            // Update current user UI without refreshing
            updateCurrentUserUI(currentUser)
          } catch (error) {
            console.error("Error removing profile picture:", error)
            showError(error.message || "Failed to remove profile picture. Please try again.")
  
            // Reset button
            removeAvatarBtn.disabled = false
            removeAvatarBtn.innerHTML = '<i class="fas fa-trash"></i> Remove Picture'
          }
        }
      })
    }
  
    // Cover upload
    const coverUpload = document.getElementById("cover-upload")
    const coverPreview = document.getElementById("cover-preview")
    const removeCoverBtn = document.getElementById("remove-cover")
  
    if (coverUpload && coverPreview) {
      coverUpload.addEventListener("change", async (e) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0]
  
          // Preview image
          const reader = new FileReader()
          reader.onload = (e) => {
            coverPreview.src = e.target.result
          }
          reader.readAsDataURL(file)
  
          // Upload image
          await uploadImage(file, "cover")
        }
      })
    }
  
    if (removeCoverBtn) {
      removeCoverBtn.addEventListener("click", async () => {
        // Confirm removal
        if (confirm("Are you sure you want to remove your cover photo?")) {
          try {
            const token = localStorage.getItem("auth_token")
  
            // Show loading state
            removeCoverBtn.disabled = true
            removeCoverBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removing...'
  
            // Set default cover
            coverPreview.src = "/static/uploads/default-cover.jpg"
  
            // Update in database
            const response = await fetch("/api/settings/profile", {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ cover: "/static/uploads/default-cover.jpg" }),
            })
  
            const result = await response.json()
  
            if (!response.ok) {
              throw new Error(result.error || "Failed to remove cover photo")
            }
  
            // Reset button
            removeCoverBtn.disabled = false
            removeCoverBtn.innerHTML = '<i class="fas fa-trash"></i> Remove Cover'
  
            // Show success message
            showSuccess("Cover photo removed successfully!")
  
            // Update current user data in localStorage
            const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}")
            currentUser.cover = "/static/uploads/default-cover.jpg"
            localStorage.setItem("current_user", JSON.stringify(currentUser))
          } catch (error) {
            console.error("Error removing cover photo:", error)
            showError(error.message || "Failed to remove cover photo. Please try again.")
  
            // Reset button
            removeCoverBtn.disabled = false
            removeCoverBtn.innerHTML = '<i class="fas fa-trash"></i> Remove Cover'
          }
        }
      })
    }
  }
  
  // Upload image
  async function uploadImage(file, type) {
    try {
      const token = localStorage.getItem("auth_token");
      
      // Create form data
      const formData = new FormData();
      formData.append(type, file);
      
      // Show loading state
      const uploadBtn = document.querySelector(`label[for="${type}-upload"]`);
      const originalBtnText = uploadBtn.innerHTML;
      uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
      
      // Upload image
      const response = await fetch(`/api/settings/${type}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `Failed to upload ${type}`);
      }
      
      // Reset button
      uploadBtn.innerHTML = originalBtnText;
      
      // Show success message
      showSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully!`);
      
      // Update current user data in localStorage
      const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}");
      
      // Important: Update both avatar and cover fields in currentUser
      if (type === "avatar") {
        currentUser.avatar = result.avatar;
      } else if (type === "cover") {
        // Make sure we're updating the correct field name
        currentUser.cover = result.cover;
        // Also update coverImage field if it exists (for compatibility)
        currentUser.coverImage = result.cover;
      }
      
      localStorage.setItem("current_user", JSON.stringify(currentUser));
      
      // Update UI based on image type
      if (type === "avatar") {
        updateCurrentUserUI(currentUser);
        
        // Force reload profile page if we're on it
        if (window.location.pathname.includes("/profile")) {
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
      } else if (type === "cover") {
        // Update cover in UI if possible
        const coverPreview = document.getElementById("cover-preview");
        if (coverPreview) {
          // Add timestamp to prevent caching
          const timestamp = new Date().getTime();
          coverPreview.src = `${result.cover}?t=${timestamp}`;
        }
        
        // Force reload profile page if we're on it
        if (window.location.pathname.includes("/profile")) {
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
      }
      
      return result[type];
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      showError(error.message || `Failed to upload ${type}. Please try again.`);
      
      // Reset button
      const uploadBtn = document.querySelector(`label[for="${type}-upload"]`);
      uploadBtn.innerHTML = `<i class="fas fa-upload"></i> Upload New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
      
      return null;
    }
  }
  
  // Setup delete account modal
  function setupDeleteAccountModal() {
    const deleteAccountBtn = document.getElementById("delete-account-btn")
    const deleteAccountModal = document.getElementById("delete-account-modal")
    const closeModalBtn = deleteAccountModal?.querySelector(".close-modal")
    const cancelBtn = deleteAccountModal?.querySelector(".cancel-btn")
    const confirmDeleteBtn = document.getElementById("confirm-delete-btn")
    const deleteConfirmationInput = document.getElementById("delete-confirmation")
  
    if (deleteAccountBtn && deleteAccountModal) {
      // Open modal
      deleteAccountBtn.addEventListener("click", () => {
        deleteAccountModal.classList.add("active")
      })
  
      // Close modal
      if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
          deleteAccountModal.classList.remove("active")
        })
      }
  
      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
          deleteAccountModal.classList.remove("active")
        })
      }
  
      // Enable/disable confirm button based on input
      if (deleteConfirmationInput && confirmDeleteBtn) {
        deleteConfirmationInput.addEventListener("input", () => {
          confirmDeleteBtn.disabled = deleteConfirmationInput.value !== "DELETE"
        })
      }
  
      // Handle delete account
      if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener("click", async () => {
          try {
            const token = localStorage.getItem("auth_token")
  
            // Show loading state
            confirmDeleteBtn.disabled = true
            confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...'
  
            // Delete account
            const response = await fetch("/api/profile/delete", {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            })
  
            if (!response.ok) {
              const result = await response.json()
              throw new Error(result.error || "Failed to delete account")
            }
  
            // Show success message before redirecting
            showSuccess("Account deleted successfully. Redirecting to home page...")
  
            // Clear local storage
            setTimeout(() => {
              localStorage.removeItem("auth_token")
              localStorage.removeItem("current_user")
              localStorage.removeItem("dark_mode")
  
              // Redirect to home page
              window.location.href = "/"
            }, 2000)
          } catch (error) {
            console.error("Error deleting account:", error)
            showError(error.message || "Failed to delete account. Please try again.")
  
            // Reset button
            confirmDeleteBtn.disabled = false
            confirmDeleteBtn.textContent = "Delete Account"
  
            // Close modal
            deleteAccountModal.classList.remove("active")
          }
        })
      }
    }
  }
  
  // Setup user dropdown menu
  function setupUserDropdown() {
    const userProfileMenu = document.getElementById("user-profile-menu")
    const userMenuToggle = document.getElementById("user-menu-toggle")
    const userDropdown = document.getElementById("user-dropdown")
  
    if (userMenuToggle && userDropdown) {
      userMenuToggle.addEventListener("click", (e) => {
        e.stopPropagation()
        userDropdown.classList.toggle("active")
      })
  
      // Close dropdown when clicking outside
      document.addEventListener("click", (e) => {
        if (!userProfileMenu.contains(e.target)) {
          userDropdown.classList.remove("active")
        }
      })
    }
  
    // Setup theme toggle
    const themeToggle = document.getElementById("theme-toggle")
    if (themeToggle) {
      themeToggle.addEventListener("click", toggleTheme)
    }
  
    // Setup logout button
    const logoutBtn = document.getElementById("logout-btn")
    if (logoutBtn) {
      logoutBtn.addEventListener("click", handleLogout)
    }
  }
  
  // Toggle theme
  function toggleTheme(e) {
    e.preventDefault()
  
    document.body.classList.toggle("dark-mode")
    const isDark = document.body.classList.contains("dark-mode")
  
    // Update toggle text
    if (isDark) {
      this.innerHTML = '<i class="fas fa-sun"></i> Light Mode'
    } else {
      this.innerHTML = '<i class="fas fa-moon"></i> Dark Mode'
    }
  
    // Save preference
    localStorage.setItem("dark_mode", isDark)
  
    // Update theme radio buttons
    const themeRadios = document.querySelectorAll('input[name="theme"]')
    if (themeRadios.length > 0) {
      if (isDark) {
        document.querySelector('input[name="theme"][value="dark"]').checked = true
      } else {
        document.querySelector('input[name="theme"][value="light"]').checked = true
      }
    }
  }
  
  // Handle logout
  async function handleLogout(e) {
    e.preventDefault()
  
    try {
      const token = localStorage.getItem("auth_token")
  
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
  
      // Clear local storage
      localStorage.removeItem("auth_token")
      localStorage.removeItem("current_user")
      localStorage.removeItem("dark_mode")
  
      // Redirect to index page
      window.location.href = "/"
    } catch (error) {
      console.error("Error during logout:", error)
  
      // Still clear local storage and redirect on error
      localStorage.removeItem("auth_token")
      localStorage.removeItem("current_user")
      localStorage.removeItem("dark_mode")
      window.location.href = "/"
    }
  }
  
  // Setup message closing
  function setupMessageClosing() {
    const closeButtons = document.querySelectorAll(".close-message")
  
    closeButtons.forEach((button) => {
      button.addEventListener("click", function () {
        const message = this.parentNode
        message.classList.remove("active")
      })
    })
  }
  
  // Setup theme toggle
  function setupThemeToggle() {
    const themeForm = document.getElementById("theme-form");
    if (themeForm) {
      themeForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        try {
          const token = localStorage.getItem("auth_token");
          const theme = document.querySelector('input[name="theme"]:checked').value;
          
          // Show loading state
          const submitBtn = themeForm.querySelector(".save-btn");
          const originalBtnText = submitBtn.textContent;
          submitBtn.disabled = true;
          submitBtn.textContent = "Saving...";
          
          const response = await fetch("/api/settings/theme", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ theme }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to update theme");
          }
          
          // Apply theme
          if (theme === "dark") {
            document.body.classList.add("dark-mode");
          } else {
            document.body.classList.remove("dark-mode");
          }
          
          // Save theme preference to localStorage
          localStorage.setItem("dark_mode", theme === "dark");
          
          // Update theme toggle in user dropdown
          const themeToggle = document.getElementById("theme-toggle");
          if (themeToggle) {
            if (theme === "dark") {
              themeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
            } else {
              themeToggle.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
            }
          }
          
          // Reset button
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
          
          // Show success message
          showSuccess("Theme updated successfully!");
          
          // Update current user data in localStorage
          const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}");
          currentUser.theme = theme;
          localStorage.setItem("current_user", JSON.stringify(currentUser));
        } catch (error) {
          console.error("Error updating theme:", error);
          showError(error.message || "Failed to update theme. Please try again.");
          
          // Reset button
          const submitBtn = themeForm.querySelector(".save-btn");
          submitBtn.disabled = false;
          submitBtn.textContent = "Save Theme";
        }
      });
    }
    
    // Add direct theme toggle functionality
    const themeOptions = document.querySelectorAll('input[name="theme"]');
    themeOptions.forEach(option => {
      option.addEventListener('change', function() {
        // Apply theme immediately when option is selected
        if (this.value === "dark") {
          document.body.classList.add("dark-mode");
        } else {
          document.body.classList.remove("dark-mode");
        }
      });
    });
  }
  
  // Show error message
  function showError(message) {
    const errorMessage = document.getElementById("error-message")
    const errorText = document.getElementById("error-text")
  
    if (errorMessage && errorText) {
      // Nếu đang hiển thị thông báo, xóa trước khi hiển thị thông báo mới
      if (errorMessage.classList.contains("active")) {
        errorMessage.classList.remove("active")
        setTimeout(() => {
          errorText.textContent = message
          errorMessage.classList.add("active")
        }, 300)
      } else {
        errorText.textContent = message
        errorMessage.classList.add("active")
      }
  
      // Auto hide after 5 seconds
      setTimeout(() => {
        errorMessage.classList.remove("active")
      }, 5000)
    } else {
      // Create a floating message if the error container doesn't exist
      const messageBox = document.createElement("div")
      messageBox.className = "message error active"
      messageBox.innerHTML = `
        <p>${message}</p>
        <button class="close-message"><i class="fas fa-times"></i></button>
      `
  
      document.body.appendChild(messageBox)
  
      // Close message after 5 seconds
      setTimeout(() => {
        messageBox.classList.remove("active")
        setTimeout(() => {
          messageBox.remove()
        }, 300)
      }, 5000)
  
      // Setup close message
      const closeBtn = messageBox.querySelector(".close-message")
      closeBtn.addEventListener("click", () => {
        messageBox.classList.remove("active")
        setTimeout(() => {
          messageBox.remove()
        }, 300)
      })
    }
  }
  
  // Show success message
  function showSuccess(message) {
    const successMessage = document.getElementById("success-message")
    const successText = document.getElementById("success-text")
  
    if (successMessage && successText) {
      // Nếu đang hiển thị thông báo, xóa trước khi hiển thị thông báo mới
      if (successMessage.classList.contains("active")) {
        successMessage.classList.remove("active")
        setTimeout(() => {
          successText.textContent = message
          successMessage.classList.add("active")
        }, 300)
      } else {
        successText.textContent = message
        successMessage.classList.add("active")
      }
  
      // Auto hide after 5 seconds
      setTimeout(() => {
        successMessage.classList.remove("active")
      }, 5000)
    } else {
      // Create a floating message if the success container doesn't exist
      const messageBox = document.createElement("div")
      messageBox.className = "message success active"
      messageBox.innerHTML = `
        <p>${message}</p>
        <button class="close-message"><i class="fas fa-times"></i></button>
      `
  
      document.body.appendChild(messageBox)
  
      // Close message after 5 seconds
      setTimeout(() => {
        messageBox.classList.remove("active")
        setTimeout(() => {
          messageBox.remove()
        }, 300)
      }, 5000)
  
      // Setup close message
      const closeBtn = messageBox.querySelector(".close-message")
      closeBtn.addEventListener("click", () => {
        messageBox.classList.remove("active")
        setTimeout(() => {
          messageBox.remove()
        }, 300)
      })
    }
  }

  async function updateUserAvatarInContent(avatarUrl) {
    try {
      const token = localStorage.getItem("auth_token");
      const currentUser = JSON.parse(localStorage.getItem("current_user"));
      
      if (!currentUser || !avatarUrl) return false;
      
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const avatarWithTimestamp = `${avatarUrl}?t=${timestamp}`;
      
      // Update current user data with new avatar
      currentUser.avatar = avatarUrl;
      localStorage.setItem("current_user", JSON.stringify(currentUser));
      
      // Update all avatar instances in the UI
      const userAvatarElements = document.querySelectorAll("#current-user-avatar");
      userAvatarElements.forEach(el => {
        if (el) el.src = avatarWithTimestamp;
      });
      
      // Update avatar in comment forms
      const commentAvatars = document.querySelectorAll(".add-comment .user-avatar img, .reply-form .user-avatar img");
      commentAvatars.forEach(avatar => {
        avatar.src = avatarWithTimestamp;
      });
      
      return true;
    } catch (error) {
      console.error("Error updating avatar in content:", error);
      return false;
    }
  }
  function showPasswordError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.createElement("div");
    errorDiv.className = "field-error";
    errorDiv.textContent = message;
    errorDiv.style.color = "#e74c3c";
    errorDiv.style.fontSize = "12px";
    errorDiv.style.marginTop = "5px";
    
    // Insert error message after the field
    field.parentNode.insertBefore(errorDiv, field.nextSibling);
    
    // Add red border to the field
    field.style.borderColor = "#e74c3c";
  }
  function clearPasswordErrors() {
    // Remove all error messages
    const errorMessages = document.querySelectorAll(".field-error");
    errorMessages.forEach(error => error.remove());
    
    // Reset field borders
    const passwordFields = ["current-password", "new-password", "confirm-password"];
    passwordFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) field.style.borderColor = "";
    });
  }
  async function submitPrivacySettings(formData) {
    try {
      const token = localStorage.getItem("auth_token");
      
      // Show loading state
      const submitBtn = document.querySelector("#privacy-form .save-btn");
      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Saving...";
      
      console.log("Submitting privacy settings:", formData);
      
      const response = await fetch("/api/settings/privacy", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update privacy settings");
      }
      
      const result = await response.json();
      
      // Reset button
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      
      // Show success message
      showSuccess("Privacy settings updated successfully!");
      
      // Update current user data in localStorage
      const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}");
      currentUser.privacy_settings = formData;
      localStorage.setItem("current_user", JSON.stringify(currentUser));
      
      return true;
    } catch (error) {
      console.error("Error updating privacy settings:", error);
      showError(error.message || "Failed to update privacy settings. Please try again.");
      
      // Reset button
      const submitBtn = document.querySelector("#privacy-form .save-btn");
      submitBtn.disabled = false;
      submitBtn.textContent = "Save Privacy Settings";
      
      return false;
    }
  }
  function setupPrivacyForm() {
    const privacyForm = document.getElementById("privacy-form");
    if (privacyForm) {
      privacyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // Get form data
        const profileVisibility = document.querySelector('input[name="profile_visibility"]:checked')?.value || "public";
        const postVisibility = document.querySelector('input[name="post_visibility"]:checked')?.value || "public";
        const showOnlineStatus = document.querySelector('input[name="show_online_status"]')?.checked || false;
        
        const formData = {
          profile_visibility: profileVisibility,
          post_visibility: postVisibility,
          show_online_status: showOnlineStatus,
        };
        
        await submitPrivacySettings(formData);
      });
    }
  }