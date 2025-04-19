document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  const token = localStorage.getItem("auth_token")
  if (!token) {
    window.location.href = "/"
    return
  }

  // Initialize the dashboard
  initializeDashboard()
})
// document.addEventListener("DOMContentLoaded", () => {
//   const token = localStorage.getItem("auth_token");
//   console.log(`[Dashboard] auth_token: ${token ? token.slice(0, 10) + '...' : 'missing'}`);
//   if (!token) {
//       console.warn("[Dashboard] No auth token, redirecting to /index");
//       window.location.href = "/";
//       return;
//   }
//   initializeDashboard();
// });
document.addEventListener("DOMContentLoaded", () => {
  const notificationsLink = document.querySelector('a[href="/notifications"]')
  if (notificationsLink) {
    notificationsLink.addEventListener("click", async (e) => {
      e.preventDefault() // Chặn hành vi mặc định
      const token = localStorage.getItem("auth_token")
      console.log("Notifications link clicked, token:", token)
      if (!token) {
        console.error("No auth token, redirecting to login")
        window.location.href = "/"
        return
      }
      try {
        const response = await fetch("/notifications", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        if (response.ok) {
          window.location.href = "/notifications"
        } else {
          console.error("Failed to access notifications, status:", response.status)
          window.location.href = "/"
        }
      } catch (error) {
        console.error("Error accessing notifications:", error)
        window.location.href = "/"
      }
      window.location.href = "/notifications";
    })
  }
})

// Initialize dashboard components
function initializeDashboard() {
  // Fetch current user data
  applyTheme()
  fetchCurrentUser()

  // Load posts
  loadPosts()

  // Load suggested users
  loadSuggestedUsers()

  // Setup user dropdown menu
  // setupUserDropdown()

  // Setup post creation
  setupPostCreation()

  // Setup theme toggle
  // setupThemeToggle()

  // Setup message closing
  setupMessageClosing()

  // Setup follow buttons
  setupFollowButtons()
  // Setup notification polling
  setupNotificationPolling()

  setupExternalImageUpload()
  setupDashboardEdit()
  loadTrendingTopics()
}
function setupDashboardEdit() {
  const editDashboardBtn = document.getElementById("edit-dashboard-btn")

  if (editDashboardBtn) {
    editDashboardBtn.addEventListener("click", openEditDashboardModal)
  }
}

// Add this function to open the dashboard edit modal
function openEditDashboardModal() {
  const currentUser = JSON.parse(localStorage.getItem("current_user"))
  if (!currentUser) return

  // Create modal
  const modal = document.createElement("div")
  modal.className = "modal edit-dashboard-modal"
  modal.id = "edit-dashboard-modal"

  // Modal HTML content
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Edit Dashboard Settings</h2>
        <button class="close-modal"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <form id="edit-dashboard-form">
          <div class="form-group">
            <label for="dashboard-theme">Theme Preference</label>
            <select id="dashboard-theme">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System Default</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="dashboard-layout">Layout</label>
            <select id="dashboard-layout">
              <option value="standard">Standard</option>
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="content-filter">Content Filter</label>
            <select id="content-filter">
              <option value="all">Show All Content</option>
              <option value="following">Only Show Following</option>
              <option value="popular">Popular Content First</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Notification Settings</label>
            <div class="checkbox-group">
              <input type="checkbox" id="notify-likes" checked>
              <label for="notify-likes">Likes</label>
            </div>
            <div class="checkbox-group">
              <input type="checkbox" id="notify-comments" checked>
              <label for="notify-comments">Comments</label>
            </div>
            <div class="checkbox-group">
              <input type="checkbox" id="notify-follows" checked>
              <label for="notify-follows">New Followers</label>
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="cancel-edit-btn">Cancel</button>
        <button class="save-dashboard-btn">Save Changes</button>
      </div>
    </div>
  `

  // Add modal to body
  document.body.appendChild(modal)

  // Show modal
  setTimeout(() => {
    modal.classList.add("active")
  }, 10)

  // Load current settings
  loadDashboardSettings()

  // Setup close modal
  const closeBtn = modal.querySelector(".close-modal")
  closeBtn.addEventListener("click", closeModal)

  // Close modal when clicking outside
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal()
    }
  })

  // Setup cancel button
  const cancelBtn = modal.querySelector(".cancel-edit-btn")
  cancelBtn.addEventListener("click", closeModal)

  // Setup save button
  const saveBtn = modal.querySelector(".save-dashboard-btn")
  saveBtn.addEventListener("click", saveDashboardSettings)

  function closeModal() {
    modal.classList.remove("active")
    setTimeout(() => {
      modal.remove()
    }, 300)
  }
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
    updateProfileLinks()
    loadFollowingList(userData._id)
  } catch (error) {
    showError("Failed to fetch user data. Please try again later.")
    console.error("Error fetching user data:", error)
  }
}

function updateProfileLinks() {
  const profileLinks = document.querySelectorAll('a[href="/profile"]')
  const currentUser = JSON.parse(localStorage.getItem("current_user"))
  if (currentUser && currentUser._id) {
    profileLinks.forEach((link) => {
      link.href = `/profile/${currentUser._id}`
    })
  }
}

// Load following list - Updated to use user ID
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

// Update UI with current user data
function updateCurrentUserUI(userData) {
  const userNameElements = document.querySelectorAll("#current-user-name")
  const userHandleElements = document.querySelectorAll("#current-user-handle")
  const userAvatarElements = document.querySelectorAll("#current-user-avatar, #post-user-avatar")

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

  // Update avatar in comment forms
  const commentAvatars = document.querySelectorAll(".add-comment .user-avatar img")
  commentAvatars.forEach((avatar) => {
    const timestamp = new Date().getTime()
    const avatarSrc = userData.avatar || "/static/uploads/default-avatar-1.jpg"
    avatar.src = `${avatarSrc}?t=${timestamp}`
    avatar.alt = userData.fullname || userData.username
  })
}

// Load posts
async function loadPosts() {
  try {
    const token = localStorage.getItem("auth_token")
    const feedContainer = document.getElementById("posts-feed")

    if (!feedContainer) return

    // Show loading spinner
    feedContainer.innerHTML = `
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <span>Loading posts...</span>
      </div>
    `

    const response = await fetch("/api/posts/feed", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch posts")
    }

    const posts = await response.json()

    // Clear loading spinner
    feedContainer.innerHTML = ""

    if (posts.length === 0) {
      feedContainer.innerHTML = `
        <div class="no-posts">
          <p>No posts to show. Follow some users or create your first post!</p>
        </div>
      `
      return
    }

    // Render posts
    posts.forEach((post) => {
      const postElement = createPostElement(post)
      feedContainer.appendChild(postElement)
    })

    // Setup post interactions
    setupPostInteractions()
  } catch (error) {
    console.error("Error loading posts:", error)
    const feedContainer = document.getElementById("posts-feed")

    if (feedContainer) {
      feedContainer.innerHTML = `
        <div class="error-message">
          <p>Failed to load posts. Please try again later.</p>
        </div>
      `
    }
  }
}

// Load suggested users - FIXED to properly display and handle suggested users
async function loadSuggestedUsers() {
  try {
    const token = localStorage.getItem("auth_token")
    const container = document.getElementById("suggested-users")
    if (!container) return

    container.innerHTML = `
      <div class="loading-spinner small">
        <i class="fas fa-spinner fa-spin"></i>
      </div>
    `

    const response = await fetch("/api/users/suggested", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) throw new Error("Failed to fetch suggested users")

    const suggestedUsers = await response.json()
    container.innerHTML = ""

    if (suggestedUsers.length === 0) {
      container.innerHTML = `
        <div class="no-suggestions">
          <p>No suggestions available at this time.</p>
        </div>
      `
      return
    }

    suggestedUsers.forEach((user) => {
      const element = createSuggestedUserElement(user)
      container.appendChild(element)
    })

    // Setup follow buttons for the newly added users
    setupFollowButtons()
  } catch (error) {
    console.error("Error loading suggested users:", error)
    const container = document.getElementById("suggested-users")
    if (container) {
      container.innerHTML = `
        <div class="error-message">
          <p>Failed to load suggestions.</p>
        </div>
      `
    }
  }
}
function setupExternalImageUpload() {
  const postForm = document.querySelector(".post-form")
  if (!postForm) return

  // Add a button to select external images
  const attachmentsDiv = postForm.querySelector(".post-attachments")
  if (attachmentsDiv) {
    // Create a label element instead of a button for better styling consistency
    const externalImageLabel = document.createElement("label")
    externalImageLabel.className = "attachment-btn external-image-btn"
    externalImageLabel.innerHTML = '<i class="fas fa-folder-open"></i>'
    externalImageLabel.title = "Select image from your computer"
    externalImageLabel.style.cursor = "pointer"
    externalImageLabel.style.marginLeft = "10px"
    attachmentsDiv.appendChild(externalImageLabel)

    // Create a hidden input for the external image path
    const externalImagePathInput = document.createElement("input")
    externalImagePathInput.type = "hidden"
    externalImagePathInput.id = "external-image-path"
    externalImagePathInput.name = "external_image_path"
    postForm.appendChild(externalImagePathInput)

    // Add click event to the label
    externalImageLabel.addEventListener("click", (e) => {
      e.preventDefault() // Prevent default behavior

      // Show a modal to enter the file path
      const modal = document.createElement("div")
      modal.className = "modal external-image-modal"
      modal.style.position = "fixed"
      modal.style.top = "0"
      modal.style.left = "0"
      modal.style.width = "100%"
      modal.style.height = "100%"
      modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)"
      modal.style.zIndex = "1000"
      modal.style.display = "flex"
      modal.style.justifyContent = "center"
      modal.style.alignItems = "center"

      modal.innerHTML = `
        <div class="modal-content" style="background: white; padding: 20px; border-radius: 8px; width: 500px; max-width: 90%;">
          <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h2 style="margin: 0;">Select External Image</h2>
            <button class="close-modal" style="background: none; border: none; font-size: 20px; cursor: pointer;"><i class="fas fa-times"></i></button>
          </div>
          <div class="modal-body">
            <p>Enter the full path to the image file:</p>
            <input type="text" id="external-image-path-input" placeholder="C:/Users/YourName/Downloads/image.jpg" style="width: 100%; padding: 8px; margin-bottom: 10px;">
            <p class="note" style="font-size: 12px; color: #666;">Note: The application must have permission to access this location.</p>
          </div>
          <div class="modal-footer" style="display: flex; justify-content: flex-end; margin-top: 15px;">
            <button class="cancel-btn" style="background: #f1f1f1; border: none; padding: 8px 15px; margin-right: 10px; cursor: pointer; border-radius: 4px;">Cancel</button>
            <button class="select-btn" style="background: #1da1f2; color: white; border: none; padding: 8px 15px; cursor: pointer; border-radius: 4px;">Select</button>
          </div>
        </div>
      `

      document.body.appendChild(modal)

      // Setup close button
      const closeBtn = modal.querySelector(".close-modal")
      closeBtn.addEventListener("click", closeModal)

      // Setup cancel button
      const cancelBtn = modal.querySelector(".cancel-btn")
      cancelBtn.addEventListener("click", closeModal)

      // Setup select button
      const selectBtn = modal.querySelector(".select-btn")
      const pathInput = modal.querySelector("#external-image-path-input")

      // Focus on the input
      setTimeout(() => {
        pathInput.focus()
      }, 100)

      selectBtn.addEventListener("click", () => {
        const path = pathInput.value.trim()
        if (path) {
          // Set the path in the hidden input
          externalImagePathInput.value = path

          // Show preview
          const imagePreview = document.getElementById("image-preview")
          const previewImage = document.getElementById("preview-image")
          const removePreviewBtn = document.getElementById("remove-preview")

          if (imagePreview && previewImage && removePreviewBtn) {
            // Extract filename from path
            const filename = path.split("\\").pop().split("/").pop()

            // Show filename instead of image preview
            imagePreview.style.display = "block"
            previewImage.style.display = "none" // Hide the image element

            // Add filename text if it doesn't exist
            let filenameElement = imagePreview.querySelector(".filename-text")
            if (!filenameElement) {
              filenameElement = document.createElement("div")
              filenameElement.className = "filename-text"
              filenameElement.style.padding = "10px"
              filenameElement.style.backgroundColor = "#f1f1f1"
              filenameElement.style.borderRadius = "4px"
              imagePreview.appendChild(filenameElement)
            }

            filenameElement.textContent = `Selected file: ${filename}`

            // Make sure remove button is visible
            removePreviewBtn.style.display = "block"

            // Enable post button
            const createPostBtn = document.getElementById("create-post-btn")
            if (createPostBtn) {
              createPostBtn.disabled = false
            }
          }

          closeModal()
        }
      })

      function closeModal() {
        document.body.removeChild(modal)
      }
    })
  }
}
// Create suggested user element - Updated to use user ID
function createSuggestedUserElement(user) {
  const userElement = document.createElement("div")
  userElement.className = "suggested-user"

  userElement.innerHTML = `
    <a href="/profile/${user._id}" class="user-link">
      <div class="user-avatar small">
        <img src="${user.avatar || "/static/uploads/default-avatar-1.jpg"}" alt="${user.fullname || user.username}">
      </div>
    </a>
    <div class="user-info">
      <a href="/profile/${user._id}" class="user-link">
        <h4>${user.fullname || user.username}</h4>
      </a>
      <p>@${user.username}</p>
    </div>
    <button class="follow-btn ${user.isFollowing ? "following" : ""}" data-user-id="${user._id}">
      ${user.isFollowing ? "Following" : "Follow"}
    </button>
  `

  return userElement
}

// Create post element - Updated to use user ID and correctly count comments
function createPostElement(post) {
  // Clone the post template
  const template = document.getElementById("post-template")
  const postElement = document.importNode(template.content, true).querySelector(".post")

  // Set post ID
  postElement.dataset.postId = post._id

  // Set author info
  const authorLinks = postElement.querySelectorAll(".user-link")
  authorLinks.forEach((link) => {
    link.href = `/profile/${post.author._id}`
  })

  const authorAvatar = postElement.querySelector(".post-header .user-avatar img")
  authorAvatar.src = post.author.avatar || "/static/uploads/default-avatar-1.jpg"
  authorAvatar.alt = post.author.fullname || post.author.username

  const authorName = postElement.querySelector(".post-author")
  authorName.textContent = post.author.fullname || post.author.username

  const authorUsername = postElement.querySelector(".post-username")
  authorUsername.textContent = `@${post.author.username}`

  // Set post time
  const postTime = postElement.querySelector(".post-time")
  postTime.textContent = formatTimeAgo(new Date(post.created_at))

  // Set post content
  const postText = postElement.querySelector(".post-text")
  postText.textContent = post.content

  // Set post image if exists
  const postImage = postElement.querySelector(".post-image")
  const postImageElement = postElement.querySelector(".post-image img")
  if (post.image) {
    postImage.classList.add("active")
    postImageElement.src = post.image
    postImageElement.alt = "Post image"
  } else {
    postImage.style.display = "none"
  }

  // Set like count
  const likeCount = postElement.querySelector(".like-count")
  likeCount.textContent = post.likes ? post.likes.length : 0

  // Check if current user liked the post
  const currentUser = JSON.parse(localStorage.getItem("current_user"))
  const likeBtn = postElement.querySelector(".like-btn")
  if (currentUser && post.likes && post.likes.includes(currentUser._id)) {
    likeBtn.classList.add("active")
    likeBtn.querySelector("i").classList.remove("far")
    likeBtn.querySelector("i").classList.add("fas")
  }

  // Calculate total comment count including replies
  let totalCommentCount = post.comments ? post.comments.length : 0

  // Add reply counts if available
  if (post.comments) {
    post.comments.forEach((comment) => {
      if (comment.replies) {
        totalCommentCount += comment.replies.length
      }
    })
  }

  // Use comment_count from server if available (this is the most accurate)
  if (post.comment_count !== undefined) {
    totalCommentCount = post.comment_count
  }

  // Set comment count
  const commentCount = postElement.querySelector(".comment-count")
  commentCount.textContent = totalCommentCount

  // Set share count
  const shareCount = postElement.querySelector(".share-count")
  shareCount.textContent = post.shares || 0

  // Show/hide edit and delete options
  const editOption = postElement.querySelector(".edit-post-option")
  const deleteOption = postElement.querySelector(".delete-post-option")
  if (currentUser && post.author._id === currentUser._id) {
    editOption.style.display = "block"
    deleteOption.style.display = "block"
  } else {
    editOption.style.display = "none"
    deleteOption.style.display = "none"
  }

  return postElement
}

// Setup post creation
function setupPostCreation() {
  const postContent = document.getElementById("post-content");
  const postImageInput = document.getElementById("post-image");
  const imagePreview = document.getElementById("image-preview");
  const previewImage = document.getElementById("preview-image");
  const removePreviewBtn = document.getElementById("remove-preview");
  const createPostBtn = document.getElementById("create-post-btn");

  if (!postContent || !createPostBtn) return;

  // Enable/disable post button based on content
  postContent.addEventListener("input", function () {
      createPostBtn.disabled = this.value.trim() === "" && !postImageInput.files[0];
  });

  // Setup image preview
  postImageInput.addEventListener("change", function () {
      if (this.files && this.files[0]) {
          const reader = new FileReader();
          reader.onload = (e) => {
              previewImage.src = e.target.result;
              imagePreview.style.display = "block";
              createPostBtn.disabled = false;
          };
          reader.readAsDataURL(this.files[0]);
      }
  });

  // Setup remove preview button
  removePreviewBtn.addEventListener("click", () => {
      postImageInput.value = "";
      previewImage.src = "";
      imagePreview.style.display = "none";
      createPostBtn.disabled = postContent.value.trim() === "";
  });

  // Setup form submission
  createPostBtn.addEventListener("click", async () => {
      if (postContent.value.trim() === "" && !postImageInput.files[0]) {
          showError("Post must have content or image");
          return;
      }

      try {
          const token = localStorage.getItem("auth_token");
          createPostBtn.disabled = true;
          createPostBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

          const formData = new FormData();
          formData.append("content", postContent.value.trim());
          if (postImageInput.files[0]) {
              formData.append("image", postImageInput.files[0]);
          }

          const response = await fetch("/api/posts/create", {
              method: "POST",
              headers: {
                  Authorization: `Bearer ${token}`,
              },
              body: formData,
          });

          if (!response.ok) {
              throw new Error("Failed to create post");
          }

          const newPost = await response.json();

          // Clear form
          postContent.value = "";
          postImageInput.value = "";
          previewImage.src = "";
          imagePreview.style.display = "none";

          createPostBtn.disabled = true;
          createPostBtn.innerHTML = "Post";

          // Add new post to feed
          const feedContainer = document.getElementById("posts-feed");
          const noPostsMessage = feedContainer.querySelector(".no-posts");
          if (noPostsMessage) {
              feedContainer.innerHTML = "";
          }

          const postElement = createPostElement(newPost);
          feedContainer.insertBefore(postElement, feedContainer.firstChild);

          setupPostInteractions();
          showSuccess("Post created successfully!");

          // Kích hoạt sự kiện postCreated
          document.dispatchEvent(new Event("postCreated"));
      } catch (error) {
          console.error("Error creating post:", error);
          showError("Failed to create post. Please try again.");
          createPostBtn.disabled = false;
          createPostBtn.innerHTML = "Post";
      }
  });
}

// Setup follow buttons
function setupFollowButtons() {
  const followButtons = document.querySelectorAll(".follow-btn")

  followButtons.forEach((button) => {
    // Remove existing event listeners
    const newButton = button.cloneNode(true)
    button.parentNode.replaceChild(newButton, button)

    newButton.addEventListener("click", function () {
      const userId = this.dataset.userId
      if (userId) {
        toggleFollow(userId, this)
      }
    })
  })
}

// Setup follow modal event listeners
document.addEventListener("click", (e) => {
  const button = e.target.closest("[data-open-follow-modal]")
  if (button) {
    const userId = button.getAttribute("data-user-id")
    const type = button.getAttribute("data-follow-type")
    const modal = document.getElementById("follow-modal")
    if (modal) {
      const modalTitle = modal.querySelector("h2")
      const modalList = document.getElementById("follow-list")

      modal.classList.add("active")
      modalTitle.textContent = type.charAt(0).toUpperCase() + type.slice(1)
      modalList.innerHTML = `<div class="loading-spinner small"><i class="fas fa-spinner fa-spin"></i></div>`

      loadFollowModalList(userId, type)
    }
  }
})

async function loadFollowModalList(userId, type) {
  try {
    const token = localStorage.getItem("auth_token")
    const modalList = document.getElementById("follow-list")
    if (!modalList) return

    const endpoint =
      type === "followers" ? `/api/profile/followers/id/${userId}` : `/api/profile/following/id/${userId}`

    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    })

    if (!response.ok) throw new Error("Failed to fetch list")

    const users = await response.json()
    modalList.innerHTML = ""

    if (users.length === 0) {
      modalList.innerHTML = `<p class="empty-list">No ${type} found.</p>`
      return
    }

    users.forEach((user) => {
      const div = document.createElement("div")
      div.className = "follow-user-item"

      div.innerHTML = `
        <a href="/profile/${user._id}" class="user-avatar small">
          <img src="${user.avatar || "/static/uploads/default-avatar-1.jpg"}" alt="${user.fullname || user.username}">
        </a>
        <div class="user-info">
          <h4>${user.fullname || user.username}</h4>
          <p>@${user.username}</p>
        </div>
        <button class="follow-btn ${user.isFollowing ? "following" : ""}" data-user-id="${user._id}">
          ${user.isFollowing ? "Following" : "Follow"}
        </button>
      `

      const followBtn = div.querySelector(".follow-btn")
      followBtn.onclick = () => toggleFollow(user._id, followBtn)
      modalList.appendChild(div)
    })
  } catch (error) {
    console.error(`Error loading ${type} list:`, error)
    const modalList = document.getElementById("follow-list")
    if (modalList) {
      modalList.innerHTML = `<p class="error">Failed to load ${type}. Try again later.</p>`
    }
  }
}

// FIXED: Update follow counters correctly
function updateFollowCounters(isFollowing, userId) {
  const currentUser = JSON.parse(localStorage.getItem("current_user"))
  const viewedUserId = document.body.dataset.viewedUserId

  // Update followers count if we're viewing the profile of the user being followed
  if (viewedUserId === userId) {
    const followersCount = document.getElementById("followers-count")
    if (followersCount) {
      const count = Number.parseInt(followersCount.textContent) || 0
      followersCount.textContent = isFollowing ? count + 1 : Math.max(0, count - 1)
    }
  }

  // Update following count if we're viewing the current user's profile
  if (viewedUserId === currentUser._id) {
    const followingCount = document.getElementById("following-count")
    if (followingCount) {
      const count = Number.parseInt(followingCount.textContent) || 0
      followingCount.textContent = isFollowing ? count + 1 : Math.max(0, count - 1)
    }
  }

  // Also update the "my-following-count" elements that might be on the page
  const myFollowingCountElements = document.querySelectorAll(".my-following-count")
  if (myFollowingCountElements.length > 0) {
    const currentFollowing = currentUser.following ? currentUser.following.length : 0
    const newCount = isFollowing ? currentFollowing + 1 : Math.max(0, currentFollowing - 1)

    myFollowingCountElements.forEach((el) => {
      el.textContent = newCount
    })
  }
}

// Toggle follow/unfollow - FIXED to update correct counts
async function toggleFollow(userId, button) {
  try {
    const token = localStorage.getItem("auth_token")
    const isFollowing = button.classList.contains("following")
    const endpoint = isFollowing ? "/api/profile/unfollow" : "/api/profile/follow"

    button.disabled = true
    const originalText = button.textContent
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    })

    const result = await response.json()

    if (response.ok && result.success) {
      const newIsFollowing = !isFollowing
      button.textContent = newIsFollowing ? "Following" : "Follow"
      button.classList.toggle("following", newIsFollowing)

      updateFollowCounters(newIsFollowing, userId)

      // Update current user data in localStorage
      const currentUser = JSON.parse(localStorage.getItem("current_user"))
      if (currentUser) {
        if (!currentUser.following) currentUser.following = []

        if (newIsFollowing) {
          if (!currentUser.following.includes(userId)) {
            currentUser.following.push(userId)
          }
        } else {
          currentUser.following = currentUser.following.filter((id) => id !== userId)
        }
        localStorage.setItem("current_user", JSON.stringify(currentUser))
      }
    } else {
      button.textContent = originalText
      button.classList.toggle("following", isFollowing)
      showError(result.error || "Failed to update follow status.")
    }
  } catch (error) {
    console.error("Error toggling follow:", error)
    showError("Failed to update follow status. Please try again.")
  } finally {
    button.disabled = false
  }
}

// Setup post interactions
function setupPostInteractions() {
  const posts = document.querySelectorAll(".post")

  posts.forEach((post) => {
    // Post menu toggle
    const menuToggle = post.querySelector(".post-menu-toggle")
    const dropdown = post.querySelector(".post-dropdown")

    if (menuToggle && dropdown) {
      menuToggle.addEventListener("click", (e) => {
        e.stopPropagation()
        dropdown.classList.toggle("active")

        // Close other dropdowns
        document.querySelectorAll(".post-dropdown.active").forEach((dd) => {
          if (dd !== dropdown) {
            dd.classList.remove("active")
          }
        })
      })
    }

    // Like button
    const likeBtn = post.querySelector(".like-btn")
    if (likeBtn) {
      likeBtn.addEventListener("click", function () {
        const postId = post.dataset.postId
        toggleLikePost(postId, this)
      })
    }

    // Comment button
    const commentBtn = post.querySelector(".comment-btn")
    if (commentBtn) {
      commentBtn.addEventListener("click", () => {
        const postId = post.dataset.postId
        openCommentModal(postId, post)
      })
    }

    // Share button
    const shareBtn = post.querySelector(".share-btn")
    if (shareBtn) {
      shareBtn.addEventListener("click", () => {
        const postId = post.dataset.postId
        sharePost(postId, post)
      })
    }

    // Edit post
    const editPostOption = post.querySelector(".edit-post-option a")
    if (editPostOption) {
      editPostOption.addEventListener("click", (e) => {
        e.preventDefault()
        const postId = post.dataset.postId
        const postText = post.querySelector(".post-text").textContent
        editPost(postId, postText, post)
      })
    }

    // Delete post
    const deletePostOption = post.querySelector(".delete-post-option a")
    if (deletePostOption) {
      deletePostOption.addEventListener("click", (e) => {
        e.preventDefault()
        const postId = post.dataset.postId
        deletePost(postId, post)
      })
    }
  })

  // Close dropdowns when clicking outside
  document.addEventListener("click", () =>
    document.querySelectorAll(".post-dropdown.active").forEach((dropdown) => {
      dropdown.classList.remove("active")
    }),
  )
}

// Toggle like on a post
async function toggleLikePost(postId, button) {
  try {
    const token = localStorage.getItem("auth_token")
    const icon = button.querySelector("i")
    const countElement = button.querySelector(".like-count")
    const count = Number.parseInt(countElement.textContent)

    // Optimistic UI update
    if (button.classList.contains("active")) {
      // Unlike
      icon.classList.remove("fas")
      icon.classList.add("far")
      button.classList.remove("active")
      countElement.textContent = Math.max(0, count - 1)
    } else {
      // Like
      icon.classList.remove("far")
      icon.classList.add("fas")
      button.classList.add("active")
      countElement.textContent = count + 1
    }

    const response = await fetch(`/api/posts/${postId}/like`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to toggle like")
    }

    // No need to update UI here, optimistic update is enough
  } catch (error) {
    console.error("Error toggling like:", error)

    // Revert UI changes on error
    const icon = button.querySelector("i")
    const countElement = button.querySelector(".like-count")
    const count = Number.parseInt(countElement.textContent)

    if (button.classList.contains("active")) {
      // Revert to liked
      icon.classList.remove("fas")
      icon.classList.add("far")
      button.classList.remove("active")
      countElement.textContent = Math.max(0, count - 1)
    } else {
      // Revert to unliked
      icon.classList.remove("far")
      icon.classList.add("fas")
      button.classList.add("active")
      countElement.textContent = count + 1
    }

    showError("Failed to update like. Please try again.")
  }
}

// Open comment modal
function openCommentModal(postId, postElement) {
  // Create comment overlay
  const overlay = document.createElement("div")
  overlay.className = "comment-overlay"
  overlay.id = "comment-overlay"

  // Get post data
  const postContent = postElement.querySelector(".post-text").textContent
  const postAuthor = postElement.querySelector(".post-author").textContent
  const postUsername = postElement.querySelector(".post-username").textContent
  const postTime = postElement.querySelector(".post-time").textContent
  const postImage = postElement.querySelector(".post-image.active img")
  const postImageSrc = postImage ? postImage.src : null

  // Get current user data
  const currentUser = JSON.parse(localStorage.getItem("current_user"))

  // Add timestamp to avatar URL to prevent caching
  const timestamp = new Date().getTime()
  const userAvatar = currentUser.avatar || "/static/uploads/default-avatar-1.jpg"
  const avatarWithTimestamp = `${userAvatar}?t=${timestamp}`

  // Get existing comments
  const commentCount = Number.parseInt(postElement.querySelector(".comment-count").textContent)
  let commentsHtml = ""

  if (commentCount > 0) {
    commentsHtml = `
      <div class="comments-list" id="comments-list">
        <div class="loading-spinner small">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
      </div>
    `
  } else {
    commentsHtml = `
      <div class="no-comments">
        <p>No comments yet. Be the first to comment!</p>
      </div>
    `
  }

  overlay.innerHTML = `
    <div class="comment-container">
      <div class="comment-header">
        <h3>Comments</h3>
        <button class="close-comment-btn" id="close-comment-btn">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="comment-content">
        <div class="original-post">
          <div class="post-author-info">
            <div class="post-author-avatar">
              <img src="${postElement.querySelector(".post-header .user-avatar img").src}" alt="${postAuthor}">
            </div>
            <div>
              <span class="post-author-name">${postAuthor}</span>
              <span class="post-author-username">${postUsername}</span>
              <span class="post-time">${postTime}</span>
            </div>
          </div>
          <div class="post-content-text">${postContent}</div>
          ${postImageSrc ? `<div class="post-image-container"><img src="${postImageSrc}" alt="Post image"></div>` : ""}
        </div>
        
        ${commentsHtml}
      </div>
      <div class="comment-form">
        <div class="user-avatar">
          <img src="${avatarWithTimestamp}" alt="${currentUser.fullname || currentUser.username}">
        </div>
        <div class="comment-input-container">
          <textarea id="comment-input" class="comment-input" placeholder="Write your comment..."></textarea>
          <div class="comment-actions">
            <button id="submit-comment" class="submit-comment-btn">Comment</button>
          </div>
        </div>
      </div>
    </div>
  `

  // Add overlay to body
  document.body.appendChild(overlay)
  document.body.style.overflow = "hidden" // Prevent scrolling
  postElement.classList.add("active-comment")

  // Setup close button
  const closeBtn = document.getElementById("close-comment-btn")
  closeBtn.addEventListener("click", closeCommentOverlay)

  // Close when clicking outside the comment container
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeCommentOverlay()
    }
  })

  // Load comments if any
  if (commentCount > 0) {
    loadComments(postId)
  }

  // Setup comment submission
  const submitBtn = document.getElementById("submit-comment")
  const commentInput = document.getElementById("comment-input")

  // Focus on comment input
  setTimeout(() => {
    commentInput.focus()
  }, 100)

  submitBtn.addEventListener("click", async () => {
    if (commentInput.value.trim() === "") {
      return
    }

    try {
      const token = localStorage.getItem("auth_token")

      // Disable submit button
      submitBtn.disabled = true
      submitBtn.textContent = "Posting..."

      const response = await fetch(`/api/posts/${postId}/comment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: commentInput.value.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to add comment")
      }

      const newComment = await response.json()

      // Update comment count
      const commentCount = postElement.querySelector(".comment-count")
      const currentCount = Number.parseInt(commentCount.textContent)
      commentCount.textContent = currentCount + 1

      // Clear comment text
      commentInput.value = ""

      // Re-enable submit button
      submitBtn.disabled = false
      submitBtn.textContent = "Comment"

      // If comments container exists, add the new comment
      const commentsList = document.getElementById("comments-list")
      if (commentsList) {
        // Create comment element
        const commentElement = createCommentElement(newComment)

        // Remove no comments message if it exists
        const noComments = document.querySelector(".no-comments")
        if (noComments) {
          noComments.remove()

          // Create comments list if it doesn't exist
          if (!commentsList) {
            const commentsContainer = document.createElement("div")
            commentsContainer.className = "comments-list"
            commentsContainer.id = "comments-list"
            document.querySelector(".comment-content").appendChild(commentsContainer)
          }
        }

        // Add comment to list
        document.getElementById("comments-list").appendChild(commentElement)
      } else {
        // Remove no comments message
        const noComments = document.querySelector(".no-comments")
        if (noComments) {
          noComments.remove()
        }

        // Create comments list
        const commentsContainer = document.createElement("div")
        commentsContainer.className = "comments-list"
        commentsContainer.id = "comments-list"
        document.querySelector(".comment-content").appendChild(commentsContainer)

        // Add the new comment
        const commentElement = createCommentElement(newComment)
        commentsContainer.appendChild(commentElement)
      }

      // Show success message
      showSuccess("Comment added successfully!")
    } catch (error) {
      console.error("Error adding comment:", error)
      showError("Failed to add comment. Please try again.")

      // Re-enable submit button
      submitBtn.disabled = false
      submitBtn.textContent = "Comment"
    }
  })

  function closeCommentOverlay() {
    // Remove active-comment class from all posts
    document.querySelectorAll(".post.active-comment").forEach((post) => {
      post.classList.remove("active-comment")
    })

    overlay.remove()
    document.body.style.overflow = "" // Restore scrolling
  }
}

// Share post
function sharePost(postId, postElement) {
  // Create modal
  const modal = document.createElement("div")
  modal.className = "modal share-modal"
  modal.id = "share-post-modal"

  const postUrl = `${window.location.origin}/post/${postId}`
  const postAuthor = postElement.querySelector(".post-author").textContent
  const postContent =
    postElement.querySelector(".post-text").textContent.substring(0, 50) +
    (postElement.querySelector(".post-text").textContent.length > 50 ? "..." : "")

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Share Post</h2>
        <button class="close-modal"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <p>Share ${postAuthor}'s post: "${postContent}"</p>
        
        <div class="share-link">
          <input type="text" value="${postUrl}" readonly id="share-link-input">
          <button class="copy-link-btn" id="copy-link-btn">Copy</button>
        </div>
        
        <div class="share-options">
          <div class="share-option" data-platform="facebook">
            <div class="share-icon facebook">
              <i class="fab fa-facebook-f"></i>
            </div>
            <span class="share-name">Facebook</span>
          </div>
          
          <div class="share-option" data-platform="twitter">
            <div class="share-icon twitter">
              <i class="fab fa-twitter"></i>
            </div>
            <span class="share-name">Twitter</span>
          </div>
          
          <div class="share-option" data-platform="whatsapp">
            <div class="share-icon whatsapp">
              <i class="fab fa-whatsapp"></i>
            </div>
            <span class="share-name">WhatsApp</span>
          </div>
          
          <div class="share-option" data-platform="email">
            <div class="share-icon email">
              <i class="fas fa-envelope"></i>
            </div>
            <span class="share-name">Email</span>
          </div>
          
          <div class="share-option" data-platform="linkedin">
            <div class="share-icon linkedin">
              <i class="fab fa-linkedin-in"></i>
            </div>
            <span class="share-name">LinkedIn</span>
          </div>
          
          <div class="share-option" data-platform="copy">
            <div class="share-icon copy">
              <i class="fas fa-copy"></i>
            </div>
            <span class="share-name">Copy Link</span>
          </div>
        </div>
      </div>
    </div>
  `

  // Add modal to body
  document.body.appendChild(modal)

  // Show modal
  setTimeout(() => {
    modal.classList.add("active")
  }, 10)

  // Setup close modal
  const closeBtn = modal.querySelector(".close-modal")
  closeBtn.addEventListener("click", closeModal)

  // Close modal when clicking outside
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal()
    }
  })

  // Setup copy link button
  const copyLinkBtn = document.getElementById("copy-link-btn")
  const shareLinkInput = document.getElementById("share-link-input")

  copyLinkBtn.addEventListener("click", () => {
    shareLinkInput.select()
    document.execCommand("copy")
    copyLinkBtn.textContent = "Copied!"
    setTimeout(() => {
      copyLinkBtn.textContent = "Copy"
    }, 2000)
  })

  // Setup share options
  const shareOptions = modal.querySelectorAll(".share-option")
  shareOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const platform = option.dataset.platform
      const shareText = `Check out this post by ${postAuthor} on ConnectHub: "${postContent}"`

      switch (platform) {
        case "facebook":
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`, "_blank")
          break
        case "twitter":
          window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(postUrl)}`,
            "_blank",
          )
          break
        case "whatsapp":
          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + postUrl)}`, "_blank")
          break
        case "email":
          window.open(
            `mailto:?subject=${encodeURIComponent("Check out this post on ConnectHub")}&body=${encodeURIComponent(shareText + "\n\n" + postUrl)}`,
            "_blank",
          )
          break
        case "linkedin":
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`, "_blank")
          break
        case "copy":
          shareLinkInput.select()
          document.execCommand("copy")
          showSuccess("Link copied to clipboard!")
          break
      }
    })
  })

  function closeModal() {
    modal.classList.remove("active")
    setTimeout(() => {
      modal.remove()
    }, 300)
  }
}

// Edit post
function editPost(postId, postText, postElement) {
  // Create modal
  const modal = document.createElement("div")
  modal.className = "modal edit-post-modal"
  modal.id = "edit-post-modal"

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Edit Post</h2>
        <button class="close-modal"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <textarea id="edit-post-content">${postText}</textarea>
      </div>
      <div class="modal-footer">
        <button class="cancel-edit-btn">Cancel</button>
        <button class="save-edit-btn">Save</button>
      </div>
    </div>
  `

  // Add modal to body
  document.body.appendChild(modal)

  // Show modal
  setTimeout(() => {
    modal.classList.add("active")
  }, 10)

  // Setup close modal
  const closeBtn = modal.querySelector(".close-modal")
  closeBtn.addEventListener("click", closeModal)

  // Close modal when clicking outside
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal()
    }
  })

  // Setup cancel button
  const cancelBtn = modal.querySelector(".cancel-edit-btn")
  cancelBtn.addEventListener("click", closeModal)

  // Setup save button
  const saveBtn = modal.querySelector(".save-edit-btn")
  const editTextarea = modal.querySelector("#edit-post-content")

  saveBtn.addEventListener("click", async () => {
    const newText = editTextarea.value.trim()

    if (newText === "") {
      showError("Post content cannot be empty.")
      return
    }

    try {
      const token = localStorage.getItem("auth_token")

      const response = await fetch(`/api/posts/${postId}/update`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newText,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update post")
      }

      // Update post text
      postElement.querySelector(".post-text").textContent = newText

      // Close modal
      closeModal()

      // Show success message
      showSuccess("Post updated successfully!")
    } catch (error) {
      console.error("Error updating post:", error)
      showError("Failed to update post. Please try again.")
    }
  })

  function closeModal() {
    modal.classList.remove("active")
    setTimeout(() => {
      modal.remove()
    }, 300)
  }
}

// Delete post
async function deletePost(postId, postElement) {
  if (confirm("Are you sure you want to delete this post?")) {
    try {
      const token = localStorage.getItem("auth_token")

      const response = await fetch(`/api/posts/${postId}/delete`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to delete post")
      }

      // Remove post from feed
      postElement.remove()

      // Show success message
      showSuccess("Post deleted successfully!")
    } catch (error) {
      console.error("Error deleting post:", error)
      showError("Failed to delete post. Please try again.")
    }
  }
}

// Setup user dropdown menu
// function setupUserDropdown() {
//   const userProfileMenu = document.getElementById("user-profile-menu")
//   const userMenuToggle = document.getElementById("user-menu-toggle")
//   const userDropdown = document.getElementById("user-dropdown")

//   if (userMenuToggle && userDropdown) {
//     userMenuToggle.addEventListener("click", (e) => {
//       e.stopPropagation()
//       userDropdown.classList.toggle("active")
//     })

//     // Close dropdown when clicking outside
//     document.addEventListener("click", (e) => {
//       if (!userProfileMenu.contains(e.target)) {
//         userDropdown.classList.remove("active")
//       }
//     })
//   }

//   // Setup theme toggle
//   const themeToggle = document.getElementById("theme-toggle")
//   if (themeToggle) {
//     themeToggle.addEventListener("click", toggleTheme)
//   }

//   // Setup logout button
//   const logoutBtn = document.getElementById("logout-btn")
//   if (logoutBtn) {
//     logoutBtn.addEventListener("click", handleLogout)
//   }
// }

// Toggle theme
// function toggleTheme(e) {
//   e.preventDefault()

//   document.body.classList.toggle("dark-mode")
//   const isDark = document.body.classList.contains("dark-mode")

//   // Update toggle text
//   if (isDark) {
//     this.innerHTML = '<i class="fas fa-sun"></i> Light Mode'
//   } else {
//     this.innerHTML = '<i class="fas fa-moon"></i> Dark Mode'
//   }

//   // Save preference
//   localStorage.setItem("dark_mode", isDark)
// }

// Handle logout
// async function handleLogout(e) {
//   e.preventDefault()

//   try {
//     const token = localStorage.getItem("auth_token")

//     await fetch("/api/auth/logout", {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json",
//       },
//     })

//     // Clear local storage
//     localStorage.removeItem("auth_token")
//     localStorage.removeItem("current_user")
//     localStorage.removeItem("profile_user")

//     // Redirect to index page
//     window.location.href = "/"
//   } catch (error) {
//     console.error("Error during logout:", error)

//     // Still clear local storage and redirect on error
//     localStorage.removeItem("auth_token")
//     localStorage.removeItem("current_user")
//     localStorage.removeItem("profile_user")
//     window.location.href = "/"
//   }
// }

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
// function setupThemeToggle() {
//   const themeToggle = document.getElementById("theme-toggle")

//   // Check if dark mode is enabled
//   const isDarkMode = localStorage.getItem("dark_mode") === "true"

//   // Apply dark mode if enabled
//   if (isDarkMode) {
//     document.body.classList.add("dark-mode")
//     if (themeToggle) {
//       themeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode'
//     }
//   }
// }

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

async function loadComments(postId) {
  try {
    const token = localStorage.getItem("auth_token")
    const commentsList = document.getElementById("comments-list")

    if (!commentsList) return

    console.log(`Fetching comments for post: ${postId}`)

    const response = await fetch(`/api/posts/${postId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch comments: ${response.status} ${response.statusText}`)
    }

    const post = await response.json()
    console.log("Post data received:", post)
    const comments = post.comments || []

    // Clear loading spinner
    commentsList.innerHTML = ""

    if (comments.length === 0) {
      commentsList.innerHTML = `
        <div class="no-comments">
          <p>No comments yet. Be the first to comment!</p>
        </div>
      `
      return
    }

    // Render comments
    comments.forEach((comment) => {
      const commentElement = createCommentElement(comment)
      commentsList.appendChild(commentElement)
    })
  } catch (error) {
    console.error("Error loading comments:", error)
    const commentsList = document.getElementById("comments-list")
    if (commentsList) {
      commentsList.innerHTML = `
        <div class="error-message">
          <p>Failed to load comments. Please try again later.</p>
          <p class="error-details">${error.message}</p>
        </div>
      `
    }
  }
}

function createCommentElement(comment) {
  // Create comment element
  const commentElement = document.createElement("div")
  commentElement.className = "comment"
  commentElement.dataset.commentId = comment._id

  // Format time
  const commentTime = formatTimeAgo(new Date(comment.created_at))

  // Force browser to reload the avatar image by adding a timestamp if not already present
  let avatarSrc = comment.author.avatar || "/static/uploads/default-avatar-1.jpg"
  if (!avatarSrc.includes("?")) {
    const timestamp = new Date().getTime()
    avatarSrc = `${avatarSrc}?t=${timestamp}`
  }

  commentElement.innerHTML = `
    <div class="user-avatar small">
      <img src="${avatarSrc}" alt="${comment.author.fullname || comment.author.username}">
    </div>
    <div class="comment-body">
      <div class="comment-user">
        <a href="/profile/${comment.author._id}" class="comment-user-name">${comment.author.fullname || comment.author.username}</a>
        <span class="comment-user-username">@${comment.author.username}</span>
        <span class="comment-time">${commentTime}</span>
      </div>
      <p class="comment-text">${comment.content}</p>
      <div class="comment-footer">
        <button class="like-comment-btn comment-action" data-comment-id="${comment._id}">
          <i class="${comment.likes && comment.likes.includes(getCurrentUserId()) ? "fas" : "far"} fa-heart"></i> 
          <span class="comment-like-count">${comment.likes ? comment.likes.length : 0}</span>
        </button>
        <button class="reply-comment-btn comment-action" data-comment-id="${comment._id}" data-author="${comment.author.username}">
          <i class="far fa-comment"></i> Reply
        </button>
      </div>
      <div class="comment-replies" id="replies-${comment._id}" style="display: none;">
        <div class="replies-list"></div>
        <div class="reply-form" style="display: none;">
          <div class="user-avatar mini">
            <img src="${getCurrentUserAvatar()}" alt="${getCurrentUserName()}">
          </div>
          <div class="reply-input-container">
            <textarea class="reply-input" placeholder="Write your reply..."></textarea>
            <button class="send-reply-btn"><i class="fas fa-paper-plane"></i></button>
          </div>
        </div>
      </div>
    </div>
  `

  // Add event listeners for like and reply buttons
  setTimeout(() => {
    const likeBtn = commentElement.querySelector(".like-comment-btn")
    const replyBtn = commentElement.querySelector(".reply-comment-btn")

    if (likeBtn) {
      likeBtn.addEventListener("click", function () {
        toggleCommentLike(comment._id, this)
      })
    }

    if (replyBtn) {
      replyBtn.addEventListener("click", function () {
        toggleReplyForm(comment._id, this.dataset.author)
      })
    }

    const replyForm = commentElement.querySelector(".reply-form")
    if (replyForm) {
      const sendReplyBtn = replyForm.querySelector(".send-reply-btn")
      const replyInput = replyForm.querySelector(".reply-input")

      if (sendReplyBtn && replyInput) {
        sendReplyBtn.addEventListener("click", () => {
          if (replyInput.value.trim() !== "") {
            submitReply(comment._id, replyInput.value.trim())
          }
        })

        replyInput.addEventListener("keypress", function (e) {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            if (this.value.trim() !== "") {
              submitReply(comment._id, this.value.trim())
            }
          }
        })
      }
    }
  }, 0)

  return commentElement
}

// Helper functions for getting current user info
function getCurrentUserId() {
  const currentUser = JSON.parse(localStorage.getItem("current_user"))
  return currentUser ? currentUser._id : null
}

function getCurrentUserAvatar() {
  const currentUser = JSON.parse(localStorage.getItem("current_user"))
  const timestamp = new Date().getTime()
  const avatarSrc = currentUser && currentUser.avatar ? currentUser.avatar : "/static/uploads/default-avatar-1.jpg"
  return `${avatarSrc}?t=${timestamp}`
}

function getCurrentUserName() {
  const currentUser = JSON.parse(localStorage.getItem("current_user"))
  return currentUser ? currentUser.fullname || currentUser.username : "User"
}

// Toggle like on a comment
async function toggleCommentLike(commentId, button) {
  try {
    const token = localStorage.getItem("auth_token")
    const icon = button.querySelector("i")
    const countElement = button.querySelector(".comment-like-count")
    const count = Number.parseInt(countElement.textContent)

    // Optimistic UI update
    const isLiked = icon.classList.contains("fas")
    if (isLiked) {
      // Unlike
      icon.classList.remove("fas")
      icon.classList.add("far")
      countElement.textContent = Math.max(0, count - 1)
    } else {
      // Like
      icon.classList.remove("far")
      icon.classList.add("fas")
      countElement.textContent = count + 1
    }

    // Send request to server
    const response = await fetch(`/api/comments/${commentId}/like`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to toggle comment like")
    }

    // No need to update UI here, optimistic update is enough
  } catch (error) {
    console.error("Error toggling comment like:", error)

    // Revert UI changes on error
    const icon = button.querySelector("i")
    const countElement = button.querySelector(".comment-like-count")
    const count = Number.parseInt(countElement.textContent)

    if (icon.classList.contains("fas")) {
      // Revert to unliked
      icon.classList.remove("fas")
      icon.classList.add("far")
      countElement.textContent = Math.max(0, count - 1)
    } else {
      // Revert to liked
      icon.classList.remove("far")
      icon.classList.add("fas")
      countElement.textContent = count + 1
    }

    showError("Failed to update like. Please try again.")
  }
}

// Toggle reply form visibility
function toggleReplyForm(commentId, authorUsername) {
  console.log(`Toggling reply form for comment: ${commentId}`)

  const commentReplies = document.getElementById(`replies-${commentId}`)
  if (!commentReplies) {
    console.error(`Reply container not found for comment ${commentId}`)
    return
  }

  // Show the replies section
  commentReplies.style.display = "block"

  const replyForm = commentReplies.querySelector(".reply-form")
  if (!replyForm) {
    console.error(`Reply form not found for comment ${commentId}`)
    return
  }

  // Toggle reply form
  replyForm.style.display = replyForm.style.display === "none" ? "flex" : "none"

  // Focus on input and add @username
  if (replyForm.style.display === "flex") {
    const replyInput = replyForm.querySelector(".reply-input")
    if (replyInput) {
      replyInput.value = `@${authorUsername} `
      replyInput.focus()
    }
  }

  // Load replies if they exist and haven't been loaded yet
  const repliesList = commentReplies.querySelector(".replies-list")
  if (repliesList && repliesList.dataset.loaded !== "true") {
    loadReplies(commentId)
  }
}

// Load replies for a comment
async function loadReplies(commentId) {
  try {
    const token = localStorage.getItem("auth_token")
    const repliesList = document.querySelector(`#replies-${commentId} .replies-list`)

    if (!repliesList) {
      console.error(`Replies list container not found for comment ${commentId}`)
      return
    }

    // Check if replies are already loaded
    if (repliesList.dataset.loaded === "true") return

    // Show loading spinner
    repliesList.innerHTML = `
      <div class="loading-spinner small">
        <i class="fas fa-spinner fa-spin"></i>
      </div>
    `

    console.log(`Loading replies for comment: ${commentId}`)

    const response = await fetch(`/api/comments/${commentId}/replies`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to fetch replies")
    }

    const replies = await response.json()
    console.log(`Loaded ${replies.length} replies for comment ${commentId}:`, replies)

    // Clear loading spinner
    repliesList.innerHTML = ""

    if (replies.length === 0) {
      repliesList.innerHTML = `
        <div class="no-replies">
          <p>No replies yet. Be the first to reply!</p>
        </div>
      `
    } else {
      // Render replies
      replies.forEach((reply) => {
        // Make sure createReplyElement is defined before using it
        if (typeof createReplyElement === "function") {
          const replyElement = createReplyElement(reply)
          repliesList.appendChild(replyElement)
        } else {
          console.error("createReplyElement function is not defined")
          repliesList.innerHTML += `<div class="reply simple-reply">
            <strong>${reply.author.fullname || reply.author.username}</strong>: ${reply.content}
          </div>`
        }
      })
    }

    // Mark as loaded
    repliesList.dataset.loaded = "true"
  } catch (error) {
    console.error("Error loading replies:", error)
    const repliesList = document.querySelector(`#replies-${commentId} .replies-list`)

    if (repliesList) {
      repliesList.innerHTML = `
        <div class="error-message">
          <p>Failed to load replies: ${error.message}</p>
        </div>
      `
    }
  }
}

// Create a reply element
function createReplyElement(reply) {
  const replyElement = document.createElement("div")
  replyElement.className = "reply"
  replyElement.dataset.replyId = reply._id

  // Format time
  const replyTime = formatTimeAgo(new Date(reply.created_at))

  // Force browser to reload the avatar image by adding a timestamp
  let avatarSrc = reply.author.avatar || "/static/uploads/default-avatar-1.jpg"
  if (!avatarSrc.includes("?")) {
    const timestamp = new Date().getTime()
    avatarSrc = `${avatarSrc}?t=${timestamp}`
  }

  replyElement.innerHTML = `
    <div class="user-avatar mini">
      <img src="${avatarSrc}" alt="${reply.author.fullname || reply.author.username}">
    </div>
    <div class="reply-body">
      <div class="reply-user">
        <a href="/profile/${reply.author._id}" class="reply-user-name">${reply.author.fullname || reply.author.username}</a>
        <span class="reply-user-username">@${reply.author.username}</span>
        <span class="reply-time">${replyTime}</span>
      </div>
      <p class="reply-text">${reply.content}</p>
      <div class="reply-footer">
        <button class="like-reply-btn reply-action" data-reply-id="${reply._id}">
          <i class="${reply.likes && reply.likes.includes(getCurrentUserId()) ? "fas" : "far"} fa-heart"></i> 
          <span class="reply-like-count">${reply.likes ? reply.likes.length : 0}</span>
        </button>
      </div>
    </div>
  `

  // Add event listener for like button
  setTimeout(() => {
    const likeBtn = replyElement.querySelector(".like-reply-btn")

    if (likeBtn) {
      likeBtn.addEventListener("click", function () {
        toggleReplyLike(reply._id, this)
      })
    }
  }, 0)

  return replyElement
}

// Submit a reply
async function submitReply(commentId, content) {
  try {
    const token = localStorage.getItem("auth_token")
    const repliesList = document.querySelector(`#replies-${commentId} .replies-list`)
    const replyForm = document.querySelector(`#replies-${commentId} .reply-form`)

    if (!repliesList || !replyForm) {
      console.error("Reply list or form not found")
      return
    }

    const replyInput = replyForm.querySelector(".reply-input")
    const sendReplyBtn = replyForm.querySelector(".send-reply-btn")

    // Disable button and input
    sendReplyBtn.disabled = true
    replyInput.disabled = true
    sendReplyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'

    console.log(`Submitting reply to comment ${commentId}: ${content}`)

    // Find the post ID that contains this comment
    const postId = findPostIdForComment(commentId)
    if (!postId) {
      console.error("Could not find post ID for this comment")
      throw new Error("Post not found for this comment")
    }

    console.log(`Found post ID for comment: ${postId}`)

    const response = await fetch(`/api/comments/${commentId}/reply`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        postId, // Send the post ID to update the post's comment count
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to submit reply")
    }

    const reply = await response.json()
    console.log("Reply created successfully:", reply)

    // Clear input and re-enable
    replyInput.value = ""
    replyInput.disabled = false
    sendReplyBtn.disabled = false
    sendReplyBtn.innerHTML = '<i class="fas fa-paper-plane"></i>'

    // Remove no-replies message if it exists
    const noReplies = repliesList.querySelector(".no-replies")
    if (noReplies) {
      noReplies.remove()
    }

    // Add the new reply
    if (typeof createReplyElement === "function") {
      const replyElement = createReplyElement(reply)
      repliesList.appendChild(replyElement)
    } else {
      console.error("createReplyElement function is not defined")
      repliesList.innerHTML += `<div class="reply simple-reply">
        <strong>${reply.author.fullname || reply.author.username}</strong>: ${reply.content}
      </div>`
    }

    // Mark as loaded
    repliesList.dataset.loaded = "true"

    // Update comment count in all posts with this comment
    updateCommentCountAfterReply(postId, commentId)

    // Show success message
    showSuccess("Reply added successfully!")
  } catch (error) {
    console.error("Error submitting reply:", error)

    // Re-enable button and input
    const replyForm = document.querySelector(`#replies-${commentId} .reply-form`)
    if (replyForm) {
      const replyInput = replyForm.querySelector(".reply-input")
      const sendReplyBtn = replyForm.querySelector(".send-reply-btn")

      if (replyInput) replyInput.disabled = false
      if (sendReplyBtn) {
        sendReplyBtn.disabled = false
        sendReplyBtn.innerHTML = '<i class="fas fa-paper-plane"></i>'
      }
    }

    showError(`Failed to submit reply: ${error.message}`)
  }
}

// Improved function to find the post ID for a comment
function findPostIdForComment(commentId) {
  // First try to find the comment in the comment modal
  const commentElement = document.querySelector(`.comment[data-comment-id="${commentId}"]`)
  if (!commentElement) return null

  // If we're in the comment modal
  const commentOverlay = document.getElementById("comment-overlay")
  if (commentOverlay) {
    // Try to find the active post
    const activePost = document.querySelector(".post.active-comment")
    if (activePost) {
      return activePost.dataset.postId
    }
  }

  // If we're not in a modal, try to find the post by walking up the DOM
  let parent = commentElement.parentElement
  while (parent) {
    if (parent.classList.contains("post") && parent.dataset.postId) {
      return parent.dataset.postId
    }
    parent = parent.parentElement
  }

  // If we still can't find it, try to get it from the URL
  const urlParams = new URLSearchParams(window.location.search)
  const postIdFromUrl = urlParams.get("post")
  if (postIdFromUrl) {
    return postIdFromUrl
  }

  // Last resort: check if we're on a post page and extract from URL
  const pathParts = window.location.pathname.split("/")
  if (pathParts.includes("post")) {
    const postIndex = pathParts.indexOf("post")
    if (postIndex >= 0 && postIndex < pathParts.length - 1) {
      return pathParts[postIndex + 1]
    }
  }

  return null
}

// Add a function to update comment count after adding a reply
function updateCommentCountAfterReply(postId, commentId) {
  // Find all instances of this post on the page
  const postElements = document.querySelectorAll(`.post[data-post-id="${postId}"]`)

  if (postElements.length === 0) {
    console.log("No post elements found to update comment count")
    // Try to update the count on the server
    updateCommentCountOnServer(postId)
    return
  }

  postElements.forEach((postElement) => {
    const commentCountElement = postElement.querySelector(".comment-count")
    if (commentCountElement) {
      const currentCount = Number.parseInt(commentCountElement.textContent) || 0
      commentCountElement.textContent = currentCount + 1
      console.log(`Updated comment count to ${currentCount + 1}`)
    }
  })

  // Also update on the server to ensure persistence
  updateCommentCountOnServer(postId)
}

// Function to update comment count on the server
async function updateCommentCountOnServer(postId) {
  try {
    const token = localStorage.getItem("auth_token")

    const response = await fetch(`/api/posts/update-comment-count/${postId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to update comment count on server")
    }

    const result = await response.json()
    console.log("Server comment count updated:", result)
  } catch (error) {
    console.error("Error updating comment count on server:", error)
  }
}

// Modify the createCommentElement function to add a "See Replies" button
function createCommentElement(comment) {
  // Create comment element
  const commentElement = document.createElement("div")
  commentElement.className = "comment"
  commentElement.dataset.commentId = comment._id

  // Format time
  const commentTime = formatTimeAgo(new Date(comment.created_at))

  // Force browser to reload the avatar image by adding a timestamp if not already present
  let avatarSrc = comment.author.avatar || "/static/uploads/default-avatar-1.jpg"
  if (!avatarSrc.includes("?")) {
    const timestamp = new Date().getTime()
    avatarSrc = `${avatarSrc}?t=${timestamp}`
  }

  // Check if comment has replies
  const hasReplies = comment.replies && comment.replies.length > 0
  const replyCount = hasReplies ? comment.replies.length : 0

  commentElement.innerHTML = `
    <div class="user-avatar small">
      <img src="${avatarSrc}" alt="${comment.author.fullname || comment.author.username}">
    </div>
    <div class="comment-body">
      <div class="comment-user">
        <a href="/profile/${comment.author._id}" class="comment-user-name">${comment.author.fullname || comment.author.username}</a>
        <span class="comment-user-username">@${comment.author.username}</span>
        <span class="comment-time">${commentTime}</span>
      </div>
      <p class="comment-text">${comment.content}</p>
      <div class="comment-footer">
        <button class="like-comment-btn comment-action" data-comment-id="${comment._id}">
          <i class="${comment.likes && comment.likes.includes(getCurrentUserId()) ? "fas" : "far"} fa-heart"></i> 
          <span class="comment-like-count">${comment.likes ? comment.likes.length : 0}</span>
        </button>
        <button class="reply-comment-btn comment-action" data-comment-id="${comment._id}" data-author="${comment.author.username}">
          <i class="far fa-comment"></i> Reply
        </button>
        ${
          hasReplies
            ? `<button class="view-replies-btn comment-action" data-comment-id="${comment._id}">
          <i class="fas fa-chevron-down"></i> View ${replyCount} ${replyCount === 1 ? "reply" : "replies"}
        </button>`
            : ""
        }
      </div>
      <div class="comment-replies" id="replies-${comment._id}" style="display: none;">
        <div class="replies-list"></div>
        <div class="reply-form" style="display: none;">
          <div class="user-avatar mini">
            <img src="${getCurrentUserAvatar()}" alt="${getCurrentUserName()}">
          </div>
          <div class="reply-input-container">
            <textarea class="reply-input" placeholder="Write your reply..."></textarea>
            <button class="send-reply-btn"><i class="fas fa-paper-plane"></i></button>
          </div>
        </div>
      </div>
    </div>
  `

  // Add event listeners for like and reply buttons
  setTimeout(() => {
    const likeBtn = commentElement.querySelector(".like-comment-btn")
    const replyBtn = commentElement.querySelector(".reply-comment-btn")
    const viewRepliesBtn = commentElement.querySelector(".view-replies-btn")

    if (likeBtn) {
      likeBtn.addEventListener("click", function () {
        toggleCommentLike(comment._id, this)
      })
    }

    if (replyBtn) {
      replyBtn.addEventListener("click", function () {
        toggleReplyForm(comment._id, this.dataset.author)
      })
    }

    if (viewRepliesBtn) {
      viewRepliesBtn.addEventListener("click", function () {
        const commentId = this.dataset.commentId
        const repliesContainer = document.getElementById(`replies-${commentId}`)

        if (repliesContainer) {
          const isVisible = repliesContainer.style.display !== "none"

          // Toggle visibility
          repliesContainer.style.display = isVisible ? "none" : "block"

          // Change button text and icon
          if (isVisible) {
            this.innerHTML = `<i class="fas fa-chevron-down"></i> View ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`
          } else {
            this.innerHTML = `<i class="fas fa-chevron-up"></i> Hide replies`

            // Load replies if they haven't been loaded yet
            const repliesList = repliesContainer.querySelector(".replies-list")
            if (repliesList && repliesList.dataset.loaded !== "true") {
              loadReplies(commentId)
            }
          }
        }
      })
    }

    const replyForm = commentElement.querySelector(".reply-form")
    if (replyForm) {
      const sendReplyBtn = replyForm.querySelector(".send-reply-btn")
      const replyInput = replyForm.querySelector(".reply-input")

      if (sendReplyBtn && replyInput) {
        sendReplyBtn.addEventListener("click", () => {
          if (replyInput.value.trim() !== "") {
            submitReply(comment._id, replyInput.value.trim())
          }
        })

        replyInput.addEventListener("keypress", function (e) {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            if (this.value.trim() !== "") {
              submitReply(comment._id, this.value.trim())
            }
          }
        })
      }
    }
  }, 0)

  return commentElement
}

// Modify the loadComments function to include replies count
async function loadComments(postId) {
  try {
    const token = localStorage.getItem("auth_token")
    const commentsList = document.getElementById("comments-list")

    if (!commentsList) return

    console.log(`Fetching comments for post: ${postId}`)

    const response = await fetch(`/api/posts/${postId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch comments: ${response.status} ${response.statusText}`)
    }

    const post = await response.json()
    console.log("Post data received:", post)
    const comments = post.comments || []

    // Clear loading spinner
    commentsList.innerHTML = ""

    if (comments.length === 0) {
      commentsList.innerHTML = `
        <div class="no-comments">
          <p>No comments yet. Be the first to comment!</p>
        </div>
      `
      return
    }

    // Render comments
    comments.forEach((comment) => {
      // Get replies count for each comment if available
      if (comment.replies) {
        comment.replies = comment.replies || []
      }

      const commentElement = createCommentElement(comment)
      commentsList.appendChild(commentElement)
    })
  } catch (error) {
    console.error("Error loading comments:", error)
    const commentsList = document.getElementById("comments-list")
    if (commentsList) {
      commentsList.innerHTML = `
        <div class="error-message">
          <p>Failed to load comments. Please try again later.</p>
          <p class="error-details">${error.message}</p>
        </div>
      `
    }
  }
}

// Toggle like on a reply
async function toggleReplyLike(replyId, button) {
  try {
    const token = localStorage.getItem("auth_token")
    const icon = button.querySelector("i")
    const countElement = button.querySelector(".reply-like-count")
    const count = Number.parseInt(countElement.textContent)

    // Optimistic UI update
    const isLiked = icon.classList.contains("fas")
    if (isLiked) {
      // Unlike
      icon.classList.remove("fas")
      icon.classList.add("far")
      button.classList.remove("active")
      countElement.textContent = Math.max(0, count - 1)
    } else {
      // Like
      icon.classList.remove("far")
      icon.classList.add("fas")
      button.classList.add("active")
      countElement.textContent = count + 1
    }

    // Send request to server
    const response = await fetch(`/api/replies/${replyId}/like`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to toggle reply like")
    }

    // No need to update UI here, optimistic update is enough
  } catch (error) {
    console.error("Error toggling reply like:", error)

    // Revert UI changes on error
    const icon = button.querySelector("i")
    const countElement = button.querySelector(".reply-like-count")
    const count = Number.parseInt(countElement.textContent)

    if (icon.classList.contains("fas")) {
      // Revert to unliked
      icon.classList.remove("fas")
      icon.classList.add("far")
      button.classList.remove("active")
      countElement.textContent = Math.max(0, count - 1)
    } else {
      // Revert to liked
      icon.classList.remove("far")
      icon.classList.add("fas")
      button.classList.add("active")
      countElement.textContent = count + 1
    }

    showError("Failed to update like. Please try again.")
  }
}
async function loadTrendingTopics() {
  try {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      console.error("No auth token found");
      return;
    }

    const trendingSection = document.getElementById("trending-topics");
    if (!trendingSection) {
      console.log("Trending topics section not found on this page.");
      return; // Exit if the element doesn't exist
    }

    const response = await fetch("/api/posts/trending-topics", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch trending topics");
    }

    const topics = await response.json();
    trendingSection.innerHTML = ""; // Now safe to set innerHTML

    topics.forEach((topic) => {
      const formattedCount = formatNumber(topic.post_count);
      const topicElement = document.createElement("div");
      topicElement.classList.add("trending-topic");
      topicElement.innerHTML = `
        <a href="/explore?category=${topic.category.toLowerCase()}&q=${topic.hashtag}" class="topic-link">
            <p class="topic-category">${topic.category}</p>
            <h4>${topic.hashtag}</h4>
            <p>${formattedCount} posts</p>
        </a>
      `;
      trendingSection.appendChild(topicElement);
    });
  } catch (error) {
    console.error("Error loading trending topics:", error);
  }
}

// Hàm định dạng số (ví dụ: 5200 -> 5.2K)
function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K"
  }
  return num.toString()
}

// Gọi hàm khi trang tải
function setupNotificationPolling() {
  // Initial fetch
  fetchNotificationCount()

  // Poll for new notifications every 30 seconds
  setInterval(fetchNotificationCount, 30000)
}

// Fetch notification count
async function fetchNotificationCount() {
  try {
    const token = localStorage.getItem("auth_token")

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
    updateNotificationBadge(data.unread_count)

    return data
  } catch (error) {
    console.error("Error fetching notification count:", error)
    return null
  }
}

// Update notification badge
function updateNotificationBadge(count) {
  const notificationBadge = document.querySelector(".notification-badge")

  if (notificationBadge) {
    if (count > 0) {
      notificationBadge.textContent = count > 99 ? "99+" : count
      notificationBadge.style.display = "flex"
      notificationBadge.classList.add("has-new")
    } else {
      notificationBadge.style.display = "none"
      notificationBadge.classList.remove("has-new")
    }
  }
}
function loadDashboardSettings() {
  // Implement your logic here to load dashboard settings
  console.log("Loading dashboard settings...")
}

// Dummy function for saveDashboardSettings
function saveDashboardSettings() {
  // Implement your logic here to save dashboard settings
  console.log("Saving dashboard settings...")
}
// Apply theme from localStorage
function applyTheme() {
  const isDarkMode = localStorage.getItem("dark_mode") === "true"
  if (isDarkMode) {
      document.body.classList.add("dark-mode")
  } else {
      document.body.classList.remove("dark-mode")
  }
}