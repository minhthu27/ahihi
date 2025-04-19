document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  const token = localStorage.getItem("auth_token")
  if (!token) {
    window.location.href = "/"
    return
  }

  // Initialize notifications
  initializeNotifications()
})

// Initialize notifications
function initializeNotifications() {
  // Fetch current user data
  applyTheme()
  fetchCurrentUser()

  // Load notifications
  loadNotifications()

  // Setup notification actions
  setupNotificationActions()

  // Setup notification filters
  setupNotificationFilters()

  // Load recent followers
  loadRecentFollowers()

  // Setup real-time notification polling
  setupNotificationPolling()
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

    // Update UI with user data
    updateCurrentUserUI(userData)

    // Store user data in localStorage for easy access
    localStorage.setItem("current_user", JSON.stringify(userData))

    // Update profile links with the user ID
    updateProfileLinks()

    // Load following list
    loadFollowingList(userData._id)

    return userData
  } catch (error) {
    showError("Failed to fetch user data. Please try again later.")
    console.error("Error fetching user data:", error)
    return null
  }
}

// Update UI with current user data
function updateCurrentUserUI(userData) {
  const userNameElements = document.querySelectorAll("#current-user-name")
  const userHandleElements = document.querySelectorAll("#current-user-handle")
  const userAvatarElements = document.querySelectorAll("#current-user-avatar")

  userNameElements.forEach((el) => {
    if (el) el.textContent = userData.fullname || userData.username
  })

  userHandleElements.forEach((el) => {
    if (el) el.textContent = `@${userData.username}`
  })

  userAvatarElements.forEach((el) => {
    if (el) {
      // Force browser to reload the image by adding a timestamp
      const timestamp = new Date().getTime()
      const avatarSrc = userData.avatar || "/static/uploads/default-avatar-1.jpg"
      el.src = `${avatarSrc}?t=${timestamp}`
      el.alt = userData.fullname || userData.username
    }
  })
}

// Update profile links
function updateProfileLinks() {
  const profileLinks = document.querySelectorAll('a[href="/profile"]')
  const currentUser = JSON.parse(localStorage.getItem("current_user"))
  if (currentUser && currentUser._id) {
    profileLinks.forEach((link) => {
      link.href = `/profile/${currentUser._id}`
    })
  }
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

// Load notifications
async function loadNotifications(limit = 20, skip = 0, type = null, unreadOnly = false) {
  try {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      console.error("No auth token found");
      window.location.href = "/";
      return;
    }
    const notificationsContainer = document.getElementById("notifications-list");

    if (!notificationsContainer) return;

    // Hiển thị spinner khi tải lần đầu
    if (skip === 0) {
      notificationsContainer.innerHTML = `
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <span>Loading notifications...</span>
        </div>
      `;
    } else {
      const loadingMore = document.createElement("div");
      loadingMore.className = "loading-spinner small";
      loadingMore.id = "loading-more";
      loadingMore.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
      notificationsContainer.appendChild(loadingMore);
    }

    // Tạo query parameters
    const params = new URLSearchParams();
    params.append("limit", limit);
    params.append("skip", skip);
    params.append("unread", unreadOnly);
    if (type) params.append("type", type); // Đã đúng, giữ nguyên

    const response = await fetch(`/api/notifications?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch notifications");
    }

    const data = await response.json();
    const notifications = data.notifications;
    const unreadCount = data.unread_count;
    const likesCount = data.likes_count;
    const followsCount = data.follows_count;
    const mentionsCount = data.mentions_count;

    // Cập nhật badge và stats
    updateNotificationBadge(unreadCount);
    updateActivityStats(likesCount, followsCount, mentionsCount);

    // Xóa spinner
    if (skip === 0) {
      notificationsContainer.innerHTML = "";
    } else {
      const loadingMore = document.getElementById("loading-more");
      if (loadingMore) loadingMore.remove();
    }

    // Hiển thị thông báo "không có" nếu rỗng
    if (notifications.length === 0 && skip === 0) {
      notificationsContainer.innerHTML = `
        <div class="no-notifications">
          <i class="fas fa-bell-slash"></i>
          <p>No notifications yet</p>
        </div>
      `;
      return;
    }

    // Hiển thị danh sách thông báo
    notifications.forEach((notification) => {
      const notificationElement = createNotificationElement(notification);
      notificationsContainer.appendChild(notificationElement);
    });

    // Thêm nút "Load More" nếu còn thông báo
    if (data.has_more) {
      const loadMoreBtn = document.createElement("button");
      loadMoreBtn.className = "load-more-btn";
      loadMoreBtn.textContent = "Load More";
      loadMoreBtn.addEventListener("click", () => {
        loadMoreBtn.remove();
        loadNotifications(limit, skip + limit, type, unreadOnly);
      });
      notificationsContainer.appendChild(loadMoreBtn);
    }
  } catch (error) {
    console.error("Error loading notifications:", error);
    const notificationsContainer = document.getElementById("notifications-list");
    if (notificationsContainer) {
      notificationsContainer.innerHTML = `
        <div class="error-message">
          <p>Failed to load notifications. Please try again later.</p>
        </div>
      `;
    }
  }
}
// Create notification element
function createNotificationElement(notification) {
  const notificationElement = document.createElement("div");
  notificationElement.className = `notification ${notification.read ? "" : "unread"}`;
  notificationElement.dataset.id = notification._id;
  notificationElement.dataset.type = notification.type;

  if (notification.entity_id) {
    notificationElement.dataset.entityId = notification.entity_id;
    notificationElement.dataset.entityType = notification.entity_type;
  }

  // Format thời gian
  const notificationTime = formatTimeAgo(new Date(notification.created_at));

  // Nội dung thông báo dựa trên type
  let notificationContent = "";
  let notificationIcon = "";

  switch (notification.type) {
    case "follow":
      notificationIcon = '<i class="fas fa-user-plus"></i>';
      notificationContent = `<a href="/profile/${notification.actor._id}">${notification.actor.fullname || notification.actor.username}</a> started following you`;
      break;
    case "like":
      notificationIcon = '<i class="fas fa-heart"></i>';
      notificationContent = `<a href="/profile/${notification.actor._id}">${notification.actor.fullname || notification.actor.username}</a> liked your post: "${truncateText(notification.content, 50)}"`;
      break;
    case "comment":
      notificationIcon = '<i class="fas fa-comment"></i>';
      notificationContent = `<a href="/profile/${notification.actor._id}">${notification.actor.fullname || notification.actor.username}</a> commented on your post: "${truncateText(notification.content, 50)}"`;
      break;
    case "reply":
      notificationIcon = '<i class="fas fa-reply"></i>';
      notificationContent = `<a href="/profile/${notification.actor._id}">${notification.actor.fullname || notification.actor.username}</a> replied to your comment: "${truncateText(notification.content, 50)}"`;
      break;
    case "mention":
      notificationIcon = '<i class="fas fa-at"></i>';
      notificationContent = `<a href="/profile/${notification.actor._id}">${notification.actor.fullname || notification.actor.username}</a> mentioned you: "${truncateText(notification.content, 50)}"`;
      break;
    case "post":
      notificationIcon = '<i class="fas fa-file-alt"></i>';
      notificationContent = `<a href="/profile/${notification.actor._id}">${notification.actor.fullname || notification.actor.username}</a> posted something new: "${truncateText(notification.content, 50)}"`;
      break;
    default:
      notificationIcon = '<i class="fas fa-bell"></i>';
      notificationContent = `You have a new notification`;
  }

  notificationElement.innerHTML = `
    <div class="notification-icon">
      ${notificationIcon}
    </div>
    <div class="notification-content">
      <div class="notification-avatar">
        <img src="${notification.actor ? notification.actor.avatar : "/static/uploads/default-avatar-1.jpg"}" alt="User Avatar">
      </div>
      <div class="notification-details">
        <p class="notification-text">${notificationContent}</p>
        <span class="notification-time">${notificationTime}</span>
      </div>
    </div>
    <div class="notification-actions">
      <button class="mark-read-btn" title="Mark as ${notification.read ? "unread" : "read"}">
        <i class="fas fa-${notification.read ? "envelope" : "check"}"></i>
      </button>
    </div>
  `;

  // Sự kiện nhấp chuột để chuyển hướng
  notificationElement.addEventListener("click", (e) => {
    if (e.target.closest(".notification-actions") || e.target.tagName === "A") {
      return;
    }
    navigateToNotificationEntity(notification);
  });

  // Sự kiện đánh dấu đã đọc/chưa đọc
  const markReadBtn = notificationElement.querySelector(".mark-read-btn");
  markReadBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleNotificationRead(notification._id, !notification.read);
  });

  return notificationElement;
}
// Navigate to notification entity
function navigateToNotificationEntity(notification) {
  // Mark notification as read
  if (!notification.read) {
    toggleNotificationRead(notification._id, true)
  }

  // Navigate based on notification type and entity
  switch (notification.type) {
    case "follow":
      if (notification.actor && notification.actor._id) {
        window.location.href = `/profile/${notification.actor._id}`
      }
      break
    case "like":
    case "comment":
    case "reply":
    case "mention":
    case "post":
      if (notification.entity_id && notification.entity_type === "post") {
        window.location.href = `/post/${notification.entity_id}`
      } else if (notification.entity_type === "comment" && notification.entity_id) {
        window.location.href = `/post/${notification.entity_id}?comment=${notification.comment_id || ""}`
      }
      break
    default:
      // Do nothing for unknown types
      break
  }
}

// Toggle notification read status
async function toggleNotificationRead(notificationId, read) {
  try {
    const token = localStorage.getItem("auth_token")
    const endpoint = read ? "/api/notifications/mark-read" : "/api/notifications/mark-unread"

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notification_ids: [notificationId],
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to mark notification as ${read ? "read" : "unread"}`)
    }

    // Update UI
    const notificationElement = document.querySelector(`.notification[data-id="${notificationId}"]`)
    if (notificationElement) {
      if (read) {
        notificationElement.classList.remove("unread")
        notificationElement.querySelector(".mark-read-btn i").className = "fas fa-envelope"
        notificationElement.querySelector(".mark-read-btn").title = "Mark as unread"
      } else {
        notificationElement.classList.add("unread")
        notificationElement.querySelector(".mark-read-btn i").className = "fas fa-check"
        notificationElement.querySelector(".mark-read-btn").title = "Mark as read"
      }
    }

    // Update notification count
    fetchNotificationCount()
  } catch (error) {
    console.error(`Error marking notification as ${read ? "read" : "unread"}:`, error)
    showError(`Failed to mark notification as ${read ? "read" : "unread"}. Please try again.`)
  }
}

// Mark all notifications as read
async function markAllNotificationsAsRead() {
  try {
    const token = localStorage.getItem("auth_token")

    const response = await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        all: true,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to mark all notifications as read")
    }

    // Update UI
    const unreadNotifications = document.querySelectorAll(".notification.unread")
    unreadNotifications.forEach((notification) => {
      notification.classList.remove("unread")
      notification.querySelector(".mark-read-btn i").className = "fas fa-envelope"
      notification.querySelector(".mark-read-btn").title = "Mark as unread"
    })

    // Update notification count
    updateNotificationBadge(0)
    updateActivityStats(0, 0, 0)

    showSuccess("All notifications marked as read")
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    showError("Failed to mark all notifications as read. Please try again.")
  }
}

// Clear all notifications
async function clearAllNotifications() {
  try {
    if (!confirm("Are you sure you want to clear all notifications? This action cannot be undone.")) {
      return
    }

    const token = localStorage.getItem("auth_token")

    const response = await fetch("/api/notifications/clear", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to clear notifications")
    }

    // Update UI
    const notificationsContainer = document.getElementById("notifications-list")
    if (notificationsContainer) {
      notificationsContainer.innerHTML = `
        <div class="no-notifications">
          <i class="fas fa-bell-slash"></i>
          <p>No notifications yet</p>
        </div>
      `
    }

    // Update notification count
    updateNotificationBadge(0)
    updateActivityStats(0, 0, 0)

    showSuccess("All notifications cleared")
  } catch (error) {
    console.error("Error clearing notifications:", error)
    showError("Failed to clear notifications. Please try again.")
  }
}

// Setup notification polling
function setupNotificationPolling() {
  // Poll for new notifications every 15 seconds
  setInterval(async () => {
    const data = await fetchNotificationCount()

    // If there are new notifications, show a visual indicator
    if (data && data.unread_count > 0) {
      const notificationBadges = document.querySelectorAll(".notification-badge")
      notificationBadges.forEach((badge) => {
        badge.classList.add("has-new")
      })

      // If we're on the notifications page, refresh the list
      if (window.location.pathname.includes("/notifications")) {
        const activeFilter = document.querySelector(".notifications-filter button.active")
        if (activeFilter) {
          // Determine which filter is active and reload accordingly
          if (activeFilter.id === "unread-notifications-btn") {
            loadNotifications(20, 0, null, true)
          } else if (activeFilter.id === "mentions-notifications-btn") {
            loadNotifications(20, 0, "mention", false)
          } else if (activeFilter.id === "likes-notifications-btn") {
            loadNotifications(20, 0, "like", false)
          } else if (activeFilter.id === "follows-notifications-btn") {
            loadNotifications(20, 0, "follow", false)
          } else {
            loadNotifications(20, 0, null, false)
          }
        } else {
          // Default to all notifications
          loadNotifications(20, 0, null, false)
        }

        // Also refresh recent followers
        loadRecentFollowers()
      }
    }
  }, 15000)
}

// Fetch notification count
async function fetchNotificationCount() {
  const token = localStorage.getItem("auth_token")
  console.log("Fetching notification count, token:", token)
  if (!token) {
    console.error("No auth token")
    return null
  }
  try {
    const response = await fetch("/api/notifications/count", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
    if (!response.ok) {
      throw new Error("Failed to fetch notification count")
    }
    const data = await response.json()
    console.log("Notification count data:", data)
    return data
  } catch (error) {
    console.error("Error fetching notification count:", error)
    return null
  }
}

// Update notification badge
function updateNotificationBadge(count) {
  console.log("Updating badge with count:", count)
  const notificationBadges = document.querySelectorAll(".notification-badge")
  notificationBadges.forEach((badge) => {
    if (!badge) {
      console.error("Notification badge element not found")
      return
    }
    if (count > 0) {
      badge.textContent = count > 99 ? "99+" : count
      badge.style.display = "flex"
      badge.classList.add("has-new")
    } else {
      badge.style.display = "none"
      badge.classList.remove("has-new")
    }
  })
  // Update page title if there are unread notifications
  const originalTitle = document.title.replace(/^$$\d+$$ /, "")
  document.title = count > 0 ? `(${count}) ${originalTitle}` : originalTitle
}

// Update activity stats
function updateActivityStats(likesCount, followsCount, mentionsCount) {
  const newFollowersCount = document.getElementById("new-followers-count")
  const newLikesCount = document.getElementById("new-likes-count")
  const newMentionsCount = document.getElementById("new-mentions-count")

  if (newFollowersCount) newFollowersCount.textContent = followsCount
  if (newLikesCount) newLikesCount.textContent = likesCount
  if (newMentionsCount) newMentionsCount.textContent = mentionsCount
}

// Load recent followers
async function loadRecentFollowers() {
  try {
    const token = localStorage.getItem("auth_token")
    const container = document.getElementById("recent-followers-list")
    if (!container) return

    container.innerHTML = `
      <div class="loading-spinner small">
        <i class="fas fa-spinner fa-spin"></i>
      </div>
    `

    const response = await fetch("/api/notifications/recent-followers", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch recent followers")
    }

    const followers = await response.json()
    container.innerHTML = ""

    if (followers.length === 0) {
      container.innerHTML = `
        <div class="no-followers">
          <p>No recent followers</p>
        </div>
      `
      return
    }

    followers.forEach((follower) => {
      const followerElement = document.createElement("div")
      followerElement.className = "recent-follower"

      // Format time
      const followTime = formatTimeAgo(new Date(follower.followed_at))

      followerElement.innerHTML = `
        <a href="/profile/${follower._id}" class="user-link">
          <div class="user-avatar small">
            <img src="${follower.avatar || "/static/uploads/default-avatar-1.jpg"}" alt="${follower.fullname || follower.username}">
          </div>
          <div class="follower-info">
            <h4 class="follower-name">${follower.fullname || follower.username}</h4>
            <p class="follower-username">@${follower.username}</p>
            <span class="follow-time">${followTime}</span>
          </div>
        </a>
      `

      container.appendChild(followerElement)
    })
  } catch (error) {
    console.error("Error loading recent followers:", error)
    const container = document.getElementById("recent-followers-list")
    if (container) {
      container.innerHTML = `
        <div class="error-message">
          <p>Failed to load recent followers</p>
        </div>
      `
    }
  }
}

// Setup notification actions
function setupNotificationActions() {
  // Mark all as read button
  const markAllReadBtn = document.getElementById("mark-all-read-btn")
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener("click", markAllNotificationsAsRead)
  }

  // Clear all button
  const clearAllBtn = document.getElementById("clear-all-notifications-btn")
  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", clearAllNotifications)
  }
}

// Setup notification filters
function setupNotificationFilters() {
  const allNotificationsBtn = document.getElementById("all-notifications-btn")
  const unreadNotificationsBtn = document.getElementById("unread-notifications-btn")
  const mentionsNotificationsBtn = document.getElementById("mentions-notifications-btn")
  const likesNotificationsBtn = document.getElementById("likes-notifications-btn")
  const followsNotificationsBtn = document.getElementById("follows-notifications-btn")

  if (allNotificationsBtn) {
    allNotificationsBtn.addEventListener("click", () => {
      setActiveFilter(allNotificationsBtn)
      loadNotifications(20, 0, null, false)
    })
  }

  if (unreadNotificationsBtn) {
    unreadNotificationsBtn.addEventListener("click", () => {
      setActiveFilter(unreadNotificationsBtn)
      loadNotifications(20, 0, null, true)
    })
  }

  if (mentionsNotificationsBtn) {
    mentionsNotificationsBtn.addEventListener("click", () => {
      setActiveFilter(mentionsNotificationsBtn)
      loadNotifications(20, 0, "mention", false)
    })
  }

  if (likesNotificationsBtn) {
    likesNotificationsBtn.addEventListener("click", () => {
      setActiveFilter(likesNotificationsBtn)
      loadNotifications(20, 0, "like", false)
    })
  }

  if (followsNotificationsBtn) {
    followsNotificationsBtn.addEventListener("click", () => {
      setActiveFilter(followsNotificationsBtn)
      loadNotifications(20, 0, "follow", false)
    })
  }
}

// Set active filter
function setActiveFilter(activeButton) {
  const filterButtons = document.querySelectorAll(".notifications-filter button")
  filterButtons.forEach((button) => {
    button.classList.remove("active")
  })
  activeButton.classList.add("active")
}

// Helper function to truncate text
function truncateText(text, maxLength) {
  if (!text) return ""
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text
}

// Format time ago
function formatTimeAgo(date) {
  const now = new Date()
  const seconds = Math.round((now - date) / 1000)
  const minutes = Math.round(seconds / 60)
  const hours = Math.round(minutes / 60)
  const days = Math.round(hours / 24)
  const months = Math.round(days / 30)
  const years = Math.round(days / 365)

  if (seconds < 60) {
    return "Just now"
  } else if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`
  } else if (days < 30) {
    return `${days} day${days !== 1 ? "s" : ""} ago`
  } else if (months < 12) {
    return `${months} month${months !== 1 ? "s" : ""} ago`
  } else {
    return `${years} year${years !== 1 ? "s" : ""} ago`
  }
}

// Show error message
function showError(message) {
  const errorMessage = document.getElementById("error-message")
  const errorText = document.getElementById("error-text")

  if (errorMessage && errorText) {
    errorText.textContent = message
    errorMessage.classList.add("active")

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
    successText.textContent = message
    successMessage.classList.add("active")

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
function applyTheme() {
  const isDarkMode = localStorage.getItem("dark_mode") === "true"
  if (isDarkMode) {
      document.body.classList.add("dark-mode")
  } else {
      document.body.classList.remove("dark-mode")
  }
}