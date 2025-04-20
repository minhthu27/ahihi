document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("auth_token")
  if (!token) {
    window.location.href = "/"
    return
  }

  // Initialize the explore page
  initializeExplorePage()

  // Setup profile navigation click
  const profileLinks = document.querySelectorAll('a[href="/profile"], a[href="profile"]')
  profileLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault()

      const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}")
      if (currentUser && currentUser._id) {
        window.location.href = `/profile/${currentUser._id}`
      } else {
        const token = localStorage.getItem("auth_token")
        if (token) {
          fetch("/api/profile/me", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          })
            .then((response) => response.json())
            .then((userData) => {
              window.location.href = `/profile/${userData._id}`
            })
            .catch((error) => {
              console.error("Error fetching user data:", error)
              window.location.href = "/profile"
            })
        } else {
          window.location.href = "/"
        }
      }
    })
  })
})

// Initialize explore page components
function initializeExplorePage() {
  if (!document.getElementById("post-template")) {
    console.error("Post template not found in DOM")
    document.getElementById("trending-posts").innerHTML = `
          <div class="error-message">
              <p>Failed to load posts: Template missing.</p>
          </div>
      `
    return
  }
  // Setup tab switching
  applyTheme()
  setupTabs()

  // Setup category filtering
  setupCategoryFilters()

  // Setup search functionality
  setupSearch()

  // Load trending posts (default tab)
  loadTrendingPosts()

  // Load suggested users for the right sidebar
  loadSuggestedUsers()
  loadFollowingList()

  // Setup user dropdown menu
  setupUserDropdown()

  // Setup theme toggle
  setupThemeToggle()

  // Setup message closing
  setupMessageClosing()

  // Setup follow buttons
  setupFollowButtons()

  // Fetch current user data
  fetchCurrentUser().then((user) => {
    if (user) {
      console.log("User data loaded:", user)
      // Lưu thông tin người dùng hiện tại vào localStorage để sử dụng sau này
      localStorage.setItem("current_user", JSON.stringify(user))
    }
  })

  // Setup real-time updates
  setupRealTimeUpdates()
  loadTrendingTopics()
  const urlParams = new URLSearchParams(window.location.search)
  const category = urlParams.get("category")
  const query = urlParams.get("q")

  if (category || query) {
    const tab = document.querySelector('.explore-tab[data-tab="trending"]')
    if (tab) {
      tab.click()
      if (category) {
        const categoryChip = document.querySelector(`.category-chip[data-category="${category}"]`)
        if (categoryChip) {
          categoryChip.click()
        }
      }
      if (query) {
        const searchInput = document.getElementById("explore-search-input")
        if (searchInput) {
          searchInput.value = query
          searchContent(query)
        }
      }
    }
  }

  // Thiết lập các chức năng post actions
  setupPostDropdowns()
  setupEditPostAction()
  setupDeletePostAction()
  setupReportPostAction()
}

// Thiết lập dropdown menu cho các bài post
function setupPostDropdowns() {
  // Sử dụng event delegation để xử lý tất cả các post (bao gồm cả những post được thêm sau)
  document.addEventListener("click", (e) => {
    const menuToggle = e.target.closest(".post-menu-toggle")
    if (menuToggle) {
      e.stopPropagation()

      // Đóng tất cả các dropdown khác
      document.querySelectorAll(".post-dropdown.active").forEach((dropdown) => {
        if (!dropdown.closest(".post").contains(menuToggle)) {
          dropdown.classList.remove("active")
        }
      })

      // Toggle dropdown hiện tại
      const dropdown = menuToggle.closest(".post").querySelector(".post-dropdown")
      if (dropdown) {
        dropdown.classList.toggle("active")
      }
    } else if (!e.target.closest(".post-dropdown")) {
      // Đóng tất cả dropdown khi click ra ngoài
      document.querySelectorAll(".post-dropdown.active").forEach((dropdown) => {
        dropdown.classList.remove("active")
      })
    }
  })
}

// Thiết lập chức năng edit post
function setupEditPostAction() {
  document.addEventListener("click", (e) => {
    const editOption = e.target.closest(".edit-post-option a")
    if (editOption) {
      e.preventDefault()
      const post = editOption.closest(".post")
      const postId = post.dataset.postId
      const postText = post.querySelector(".post-text").textContent

      // Đóng dropdown
      const dropdown = post.querySelector(".post-dropdown")
      if (dropdown) dropdown.classList.remove("active")

      // Mở modal edit post
      openEditPostModal(postId, postText, post)
    }
  })
}

// Mở modal edit post
function openEditPostModal(postId, postText, postElement) {
  // Tạo modal
  const modal = document.createElement("div")
  modal.className = "modal"
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

  // Thêm modal vào body
  document.body.appendChild(modal)

  // Hiển thị modal
  setTimeout(() => {
    modal.classList.add("active")
  }, 10)

  // Thiết lập nút đóng modal
  const closeBtn = modal.querySelector(".close-modal")
  closeBtn.addEventListener("click", closeModal)

  // Đóng modal khi click ra ngoài
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal()
    }
  })

  // Thiết lập nút cancel
  const cancelBtn = modal.querySelector(".cancel-edit-btn")
  cancelBtn.addEventListener("click", closeModal)

  // Thiết lập nút save
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

      // Disable nút save
      saveBtn.disabled = true
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'

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
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update post")
      }

      // Cập nhật nội dung post trên UI
      postElement.querySelector(".post-text").textContent = newText

      // Đóng modal
      closeModal()

      // Hiển thị thông báo thành công
      showSuccess("Post updated successfully!")
    } catch (error) {
      console.error("Error updating post:", error)
      showError(error.message || "Failed to update post. Please try again.")

      // Re-enable nút save
      saveBtn.disabled = false
      saveBtn.innerHTML = "Save"
    }
  })

  function closeModal() {
    modal.classList.remove("active")
    setTimeout(() => {
      modal.remove()
    }, 300)
  }
}

// Thiết lập chức năng delete post
function setupDeletePostAction() {
  document.addEventListener("click", (e) => {
    const deleteOption = e.target.closest(".delete-post-option a")
    if (deleteOption) {
      e.preventDefault()
      const post = deleteOption.closest(".post")
      const postId = post.dataset.postId

      // Đóng dropdown
      const dropdown = post.querySelector(".post-dropdown")
      if (dropdown) dropdown.classList.remove("active")

      // Xác nhận xóa post
      if (confirm("Are you sure you want to delete this post?")) {
        deletePost(postId, post)
      }
    }
  })
}

// Xóa post
async function deletePost(postId, postElement) {
  try {
    const token = localStorage.getItem("auth_token")

    // Hiển thị loading state
    postElement.style.opacity = "0.5"

    const response = await fetch(`/api/posts/${postId}/delete`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to delete post")
    }

    // Xóa post khỏi UI với animation
    postElement.style.height = postElement.offsetHeight + "px"
    postElement.style.overflow = "hidden"

    setTimeout(() => {
      postElement.style.height = "0"
      postElement.style.padding = "0"
      postElement.style.margin = "0"

      setTimeout(() => {
        postElement.remove()
      }, 300)
    }, 100)

    // Hiển thị thông báo thành công
    showSuccess("Post deleted successfully!")
  } catch (error) {
    console.error("Error deleting post:", error)

    // Khôi phục trạng thái post
    postElement.style.opacity = "1"

    showError(error.message || "Failed to delete post. Please try again.")
  }
}

// Thiết lập chức năng report post
function setupReportPostAction() {
  document.addEventListener("click", (e) => {
    const reportOption = e.target.closest(".report-post-option a")
    if (reportOption) {
      e.preventDefault()
      const post = reportOption.closest(".post")
      const postId = post.dataset.postId

      // Đóng dropdown
      const dropdown = post.querySelector(".post-dropdown")
      if (dropdown) dropdown.classList.remove("active")

      // Mở modal report post
      openReportPostModal(postId)
    }
  })
}

// Mở modal report post
function openReportPostModal(postId) {
  // Tạo modal
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.id = "report-post-modal"

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Report Post</h2>
        <button class="close-modal"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <p>Why are you reporting this post?</p>
        <div class="report-options">
          <div class="report-option">
            <input type="radio" name="report-reason" id="report-spam" value="spam">
            <label for="report-spam">It's spam</label>
          </div>
          <div class="report-option">
            <input type="radio" name="report-reason" id="report-harmful" value="harmful">
            <label for="report-harmful">It's harmful or abusive</label>
          </div>
          <div class="report-option">
            <input type="radio" name="report-reason" id="report-misleading" value="misleading">
            <label for="report-misleading">It contains misleading information</label>
          </div>
          <div class="report-option">
            <input type="radio" name="report-reason" id="report-sensitive" value="sensitive">
            <label for="report-sensitive">It contains sensitive content</label>
          </div>
          <div class="report-option">
            <input type="radio" name="report-reason" id="report-other" value="other">
            <label for="report-other">Other</label>
          </div>
          <div class="report-other-container" style="display: none;">
            <textarea id="report-other-reason" placeholder="Please specify the reason"></textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="cancel-report-btn">Cancel</button>
        <button class="submit-report-btn" disabled>Submit Report</button>
      </div>
    </div>
  `

  // Thêm modal vào body
  document.body.appendChild(modal)

  // Hiển thị modal
  setTimeout(() => {
    modal.classList.add("active")
  }, 10)

  // Thiết lập nút đóng modal
  const closeBtn = modal.querySelector(".close-modal")
  closeBtn.addEventListener("click", closeModal)

  // Đóng modal khi click ra ngoài
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal()
    }
  })

  // Thiết lập nút cancel
  const cancelBtn = modal.querySelector(".cancel-report-btn")
  cancelBtn.addEventListener("click", closeModal)

  // Thiết lập các tùy chọn report
  const reportOptions = modal.querySelectorAll('input[name="report-reason"]')
  const otherReasonContainer = modal.querySelector(".report-other-container")
  const otherReasonTextarea = modal.querySelector("#report-other-reason")
  const submitReportBtn = modal.querySelector(".submit-report-btn")

  reportOptions.forEach((option) => {
    option.addEventListener("change", () => {
      if (option.value === "other") {
        otherReasonContainer.style.display = "block"
        submitReportBtn.disabled = otherReasonTextarea.value.trim() === ""
      } else {
        otherReasonContainer.style.display = "none"
        submitReportBtn.disabled = false
      }
    })
  })

  otherReasonTextarea.addEventListener("input", () => {
    submitReportBtn.disabled = otherReasonTextarea.value.trim() === ""
  })

  // Thiết lập nút submit
  submitReportBtn.addEventListener("click", async () => {
    const selectedOption = modal.querySelector('input[name="report-reason"]:checked')

    if (!selectedOption) {
      showError("Please select a reason for reporting.")
      return
    }

    const reason = selectedOption.value
    let description = ""
    if (reason === "other") {
      description = otherReasonTextarea.value.trim()
      if (description === "") {
        showError("Please specify the reason for reporting.")
        return
      }
    }

    try {
      const token = localStorage.getItem("auth_token")
      submitReportBtn.disabled = true
      submitReportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...'

      const response = await fetch(`/api/posts/${postId}/report`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: reason,
          description: description,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to submit report")
      }

      const result = await response.json()
      showSuccess(result.message || "Thank you for your report. We'll review it shortly.")
      closeModal()
    } catch (error) {
      console.error("Error submitting report:", error)
      showError(error.message || "Failed to submit report. Please try again.")
      submitReportBtn.disabled = false
      submitReportBtn.innerHTML = "Submit Report"
    }
  })

  function closeModal() {
    modal.classList.remove("active")
    setTimeout(() => {
      modal.remove()
    }, 300)
  }
}

// Hiển thị thông báo lỗi
function showError(message) {
  // Kiểm tra xem đã có thông báo lỗi có sẵn chưa
  const existingError = document.getElementById("error-message")

  if (existingError) {
    const errorText = document.getElementById("error-text")
    errorText.textContent = message
    existingError.classList.add("active")

    // Tự động ẩn sau 5 giây
    setTimeout(() => {
      existingError.classList.remove("active")
    }, 5000)
  } else {
    // Tạo thông báo lỗi mới nếu không có sẵn
    const errorDiv = document.createElement("div")
    errorDiv.className = "error-message active"
    errorDiv.innerHTML = `
      <i class="fas fa-exclamation-circle"></i>
      <span>${message}</span>
      <button class="close-message"><i class="fas fa-times"></i></button>
    `

    document.body.appendChild(errorDiv)

    // Thiết lập nút đóng
    const closeBtn = errorDiv.querySelector(".close-message")
    closeBtn.addEventListener("click", () => {
      errorDiv.classList.remove("active")
      setTimeout(() => {
        errorDiv.remove()
      }, 300)
    })

    // Tự động ẩn sau 5 giây
    setTimeout(() => {
      errorDiv.classList.remove("active")
      setTimeout(() => {
        errorDiv.remove()
      }, 300)
    }, 5000)
  }
}

// Hiển thị thông báo thành công
function showSuccess(message) {
  // Kiểm tra xem đã có thông báo thành công có sẵn chưa
  const existingSuccess = document.getElementById("success-message")

  if (existingSuccess) {
    const successText = document.getElementById("success-text")
    successText.textContent = message
    existingSuccess.classList.add("active")

    // Tự động ẩn sau 5 giây
    setTimeout(() => {
      existingSuccess.classList.remove("active")
    }, 5000)
  } else {
    // Tạo thông báo thành công mới nếu không có sẵn
    const successDiv = document.createElement("div")
    successDiv.className = "success-message active"
    successDiv.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <span>${message}</span>
      <button class="close-message"><i class="fas fa-times"></i></button>
    `

    document.body.appendChild(successDiv)

    // Thiết lập nút đóng
    const closeBtn = successDiv.querySelector(".close-message")
    closeBtn.addEventListener("click", () => {
      successDiv.classList.remove("active")
      setTimeout(() => {
        successDiv.remove()
      }, 300)
    })

    // Tự động ẩn sau 5 giây
    setTimeout(() => {
      successDiv.classList.remove("active")
      setTimeout(() => {
        successDiv.remove()
      }, 300)
    }, 5000)
  }
}

// Setup tab switching
function setupTabs() {
  const tabs = document.querySelectorAll(".explore-tab")
  const tabContents = document.querySelectorAll(".tab-content")

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"))
      tab.classList.add("active")
      tabContents.forEach((content) => content.classList.remove("active"))
      const tabName = tab.dataset.tab
      const activeContent = document.getElementById(`${tabName}-content`)
      activeContent.classList.add("active")

      switch (tabName) {
        case "trending":
          loadTrendingPosts()
          break
        case "latest":
          loadLatestPosts()
          break
        case "popular":
          loadPopularPosts()
          break
        case "people":
          loadSuggestedPeople()
          break
      }
    })
  })
}

// Setup category filtering
function setupCategoryFilters() {
  const categoryChips = document.querySelectorAll(".category-chip")

  categoryChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      categoryChips.forEach((c) => c.classList.remove("active"))
      chip.classList.add("active")
      const category = chip.dataset.category
      loadTrendingPosts(category)
    })
  })
}

// Setup search functionality
function setupSearch() {
  const searchInput = document.getElementById("explore-search-input")

  if (!searchInput) return

  let debounceTimer

  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer)

    debounceTimer = setTimeout(() => {
      const query = searchInput.value.trim()

      if (query.length > 2) {
        searchContent(query)
      } else if (query.length === 0) {
        const activeTab = document.querySelector(".explore-tab.active")
        if (activeTab) {
          const tabName = activeTab.dataset.tab

          switch (tabName) {
            case "trending":
              loadTrendingPosts()
              break
            case "latest":
              loadLatestPosts()
              break
            case "popular":
              loadPopularPosts()
              break
            case "people":
              loadSuggestedPeople()
              break
          }
        }
      }
    }, 500)
  })
}

// Load trending posts
async function loadTrendingPosts(category = "all", silent = false) {
  try {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      console.warn("Không có auth_token, chuyển hướng về trang đăng nhập")
      window.location.href = "/"
      return
    }
    const trendingPostsContainer = document.getElementById("trending-posts")

    if (!trendingPostsContainer) {
      console.error("Trending posts container not found")
      return
    }

    if (!silent) {
      trendingPostsContainer.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Loading trending posts...</span>
                </div>
            `
    }

    const url = `/api/posts/trending?category=${encodeURIComponent(category.toLowerCase())}`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch trending posts: ${response.status}`)
    }

    const posts = await response.json()
    console.log("Trending posts data:", posts)

    trendingPostsContainer.innerHTML = ""

    if (!Array.isArray(posts) || posts.length === 0) {
      trendingPostsContainer.innerHTML = `
                <div class="no-posts">
                    <p>No trending posts found in this category.</p>
                </div>
            `
      return
    }

    posts.forEach((post, index) => {
      console.log(`Processing post ${index + 1}:`, post)
      const postElement = createPostElement(post)
      trendingPostsContainer.appendChild(postElement)
    })
  } catch (error) {
    console.error("Error loading trending posts:", error)
    if (!silent) {
      const trendingPostsContainer = document.getElementById("trending-posts")
      trendingPostsContainer.innerHTML = `
                <div class="error-message">
                    <p>Failed to load trending posts. Please try again later.</p>
                </div>
            `
    }
  }
}

// Load latest posts
async function loadLatestPosts(silent = false) {
  try {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      console.warn("No auth token, skipping loadLatestPosts")
      return
    }
    const latestPostsContainer = document.getElementById("latest-posts")

    if (!latestPostsContainer) return

    if (!silent) {
      latestPostsContainer.innerHTML = `
          <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Loading latest posts...</span>
          </div>
        `
    }

    const response = await fetch("/api/posts/latest", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch latest posts")
    }

    const posts = await response.json()

    if (silent) {
      const existingPostIds = Array.from(latestPostsContainer.querySelectorAll(".post")).map(
        (post) => post.dataset.postId,
      )

      const newPosts = posts.filter((post) => !existingPostIds.includes(post._id))

      if (newPosts.length > 0) {
        showNewContentNotification(newPosts.length, "latest posts")

        newPosts.forEach((post) => {
          const postElement = createPostElement(post)
          latestPostsContainer.insertBefore(postElement, latestPostsContainer.firstChild)
        })
      }

      return
    }

    latestPostsContainer.innerHTML = ""

    if (posts.length === 0) {
      latestPostsContainer.innerHTML = `
          <div class="no-posts">
            <p>No latest posts found.</p>
          </div>
        `
      return
    }

    posts.forEach((post) => {
      const postElement = createPostElement(post)
      latestPostsContainer.appendChild(postElement)
    })
  } catch (error) {
    console.error("Error loading latest posts:", error)

    if (!silent) {
      const latestPostsContainer = document.getElementById("latest-posts")
      if (latestPostsContainer) {
        latestPostsContainer.innerHTML = `
            <div class="error-message">
              <p>Failed to load latest posts. Please try again later.</p>
            </div>
          `
      }
    }
  }
}

// Load popular posts
async function loadPopularPosts(silent = false) {
  try {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      console.warn("No auth token, skipping loadPopularPosts")
      return
    }
    const popularPostsContainer = document.getElementById("popular-posts")

    if (!popularPostsContainer) return

    if (!silent) {
      popularPostsContainer.innerHTML = `
          <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Loading popular posts...</span>
          </div>
        `
    }

    const response = await fetch("/api/posts/popular", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch popular posts")
    }

    const posts = await response.json()

    if (silent) {
      const existingPostIds = Array.from(popularPostsContainer.querySelectorAll(".post")).map(
        (post) => post.dataset.postId,
      )

      const newPosts = posts.filter((post) => !existingPostIds.includes(post._id))

      if (newPosts.length > 0) {
        showNewContentNotification(newPosts.length, "popular posts")

        newPosts.forEach((post) => {
          const postElement = createPostElement(post)
          popularPostsContainer.insertBefore(postElement, popularPostsContainer.firstChild)
        })
      }

      return
    }

    popularPostsContainer.innerHTML = ""

    if (posts.length === 0) {
      popularPostsContainer.innerHTML = `
          <div class="no-posts">
            <p>No popular posts found.</p>
          </div>
        `
      return
    }

    posts.forEach((post) => {
      const postElement = createPostElement(post)
      popularPostsContainer.appendChild(postElement)
    })
  } catch (error) {
    console.error("Error loading popular posts:", error)

    if (!silent) {
      const popularPostsContainer = document.getElementById("popular-posts")
      if (popularPostsContainer) {
        popularPostsContainer.innerHTML = `
            <div class="error-message">
              <p>Failed to load popular posts. Please try again later.</p>
            </div>
          `
      }
    }
  }
}

// Load suggested people
async function loadSuggestedPeople(silent = false) {
  try {
    const token = localStorage.getItem("auth_token");
    const suggestedPeopleContainer = document.getElementById("suggested-people");

    if (!suggestedPeopleContainer) return;

    if (!silent) {
      suggestedPeopleContainer.innerHTML = `
          <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Loading suggested people...</span>
          </div>
        `;
    }

    const response = await fetch("/api/users/discover", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch suggested people");
    }

    let users = await response.json();

    // Lấy thông tin người dùng hiện tại từ localStorage
    const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}");
    const currentUserId = currentUser?._id;

    // Lọc bỏ người dùng hiện tại khỏi danh sách
    if (currentUserId) {
      users = users.filter((user) => user._id !== currentUserId);
    }

    if (silent) {
      const existingUserIds = Array.from(
        suggestedPeopleContainer.querySelectorAll(".user-card")
      ).map((user) => user.dataset.userId);

      const newUsers = users.filter(
        (user) => !existingUserIds.includes(user._id)
      );

      if (newUsers.length > 0) {
        showNewContentNotification(newUsers.length, "suggested people");

        newUsers.forEach((user) => {
          const userCard = createUserCardElement(user);
          suggestedPeopleContainer.insertBefore(
            userCard,
            suggestedPeopleContainer.firstChild
          );
        });

        setupFollowButtons();
      }

      return;
    }

    suggestedPeopleContainer.innerHTML = "";

    if (users.length === 0) {
      suggestedPeopleContainer.innerHTML = `
          <div class="no-users">
            <p>No suggested people found.</p>
          </div>
        `;
      return;
    }

    users.forEach((user) => {
      const userCard = createUserCardElement(user);
      suggestedPeopleContainer.appendChild(userCard);
    });

    setupFollowButtons();
  } catch (error) {
    console.error("Error loading suggested people:", error);

    if (!silent) {
      const suggestedPeopleContainer = document.getElementById("suggested-people");
      if (suggestedPeopleContainer) {
        suggestedPeopleContainer.innerHTML = `
            <div class="error-message">
              <p>Failed to load suggested people. Please try again later.</p>
            </div>
          `;
      }
    }
  }
}
// Search content
async function searchContent(query, silent = false) {
  try {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      console.warn("No auth token, redirecting to login");
      window.location.href = "/";
      return;
    }

    query = query.replace(/^#/, "").toLowerCase().trim();

    const activeTab = document.querySelector(".explore-tab.active");
    const tabName = activeTab ? activeTab.dataset.tab : "trending";

    const containerId = `${tabName}-content`;
    const container = document.getElementById(containerId);

    if (!container) {
      console.error(`Container not found for ID: ${containerId}`);
      return;
    }

    const contentContainer =
      document.getElementById(`${tabName}-posts`) ||
      document.getElementById("suggested-people");

    if (!contentContainer) {
      console.error(`Content container not found for tab: ${tabName}`);
      container.innerHTML = `
        <div class="error-message">
          <p>Content container not found. Please try again.</p>
        </div>
      `;
      return;
    }

    if (!silent) {
      contentContainer.innerHTML = `
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <span>Searching for "${query}"...</span>
        </div>
      `;
    }

    let endpoint =
      tabName === "people" ? "/api/search/users" : "/api/search/posts";
    endpoint += `?q=${encodeURIComponent(query)}`;

    if (tabName !== "people") {
      endpoint += `&sort=${tabName}`;
      const activeCategory = document.querySelector(".category-chip.active");
      if (activeCategory && activeCategory.dataset.category !== "all") {
        endpoint += `&category=${encodeURIComponent(
          activeCategory.dataset.category.toLowerCase()
        )}`;
      }
    }

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      console.warn("Unauthorized, redirecting to login");
      localStorage.removeItem("auth_token");
      window.location.href = "/";
      return;
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Search failed");
    }

    const results = await response.json();
    let resultsArray = tabName === "people" ? results.users : results.posts;

    // Lấy thông tin người dùng hiện tại từ localStorage
    const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}");
    const currentUserId = currentUser?._id;

    // Lọc bỏ người dùng hiện tại khỏi danh sách nếu đang ở tab "people"
    if (tabName === "people" && currentUserId) {
      resultsArray = resultsArray.filter((user) => user._id !== currentUserId);
    }

    contentContainer.innerHTML = "";

    if (!resultsArray || resultsArray.length === 0) {
      contentContainer.innerHTML = `
        <div class="no-results">
          <p>No results found for "${query}".</p>
        </div>
      `;
      return;
    }

    if (tabName === "people") {
      resultsArray.forEach((user) => {
        const userCard = createUserCardElement(user, query);
        contentContainer.appendChild(userCard);
      });
      setupFollowButtons();
    } else {
      resultsArray.forEach((post) => {
        const postElement = createPostElement(post);
        contentContainer.appendChild(postElement);
      });
    }
  } catch (error) {
    console.error("Error searching content:", error);
    const contentContainer =
      document.getElementById(
        `${
          document.querySelector(".explore-tab.active")?.dataset.tab || "trending"
        }-posts`
      ) || document.getElementById("suggested-people");
    if (contentContainer && !silent) {
      contentContainer.innerHTML = `
        <div class="error-message">
          <p>${error.message || "Search failed. Please try again later."}</p>
        </div>
      `;
    }
  }
}

function highlightQuery(text, query) {
  if (!query) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
  return text.replace(regex, '<span class="highlight">$1</span>')
}

function createUserCardElement(user, query = "") {
  const template = document.getElementById("user-card-template");
  const userCard = document.importNode(template.content, true).querySelector(".user-card");

  userCard.dataset.userId = user._id;

  const userAvatar = userCard.querySelector(".user-avatar img");
  userAvatar.src = user.avatar || "/static/uploads/default-avatar-1.jpg";
  userAvatar.alt = user.fullname || user.username;

  const userName = userCard.querySelector(".user-name");
  userName.innerHTML = query ? highlightQuery(user.fullname || user.username, query) : user.fullname || user.username;

  const userUsername = userCard.querySelector(".user-username");
  userUsername.innerHTML = query ? highlightQuery(`@${user.username}`, query) : `@${user.username}`;

  const userBio = userCard.querySelector(".user-bio");
  userBio.textContent = user.bio || "No bio available";

  // Hiển thị số bài viết và người theo dõi
  const postsCount = userCard.querySelector(".posts-count");
  if (postsCount) {
    postsCount.textContent = user.posts_count !== undefined ? user.posts_count : 0;
  }

  const followersCount = userCard.querySelector(".followers-count");
  if (followersCount) {
    followersCount.textContent = user.followers_count !== undefined ? user.followers_count : 0;
  }

  const followBtn = userCard.querySelector(".follow-btn");
  followBtn.dataset.userId = user._id;
  if (user.isFollowing) {
    followBtn.classList.add("following");
    followBtn.textContent = "Following";
  } else {
    followBtn.textContent = "Follow";
  }

  const userLink = userCard.querySelector(".user-link");
  userLink.href = `/profile/${user._id}`;

  return userCard;
}
async function loadSuggestedUsers() {
  try {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      console.warn("No auth token, skipping loadSuggestedUsers")
      return
    }
    const suggestedUsersContainer = document.getElementById("suggested-users")

    if (!suggestedUsersContainer) return

    suggestedUsersContainer.innerHTML = `
          <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Loading suggested users...</span>
          </div>
        `

    const response = await fetch("/api/users/discover", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch suggested users")
    }

    const users = await response.json()

    suggestedUsersContainer.innerHTML = ""

    if (users.length === 0) {
      suggestedUsersContainer.innerHTML = `
            <div class="no-users">
              <p>No suggested users found.</p>
            </div>
          `
      return
    }

    users.forEach((user) => {
      const userCard = createUserCardElement(user)
      suggestedUsersContainer.appendChild(userCard)
    })

    setupFollowButtons()
  } catch (error) {
    console.error("Error loading suggested users:", error)
    const suggestedUsersContainer = document.getElementById("suggested-users")

    if (suggestedUsersContainer) {
      suggestedUsersContainer.innerHTML = `
            <div class="error-message">
              <p>Failed to load suggested users. Please try again later.</p>
            </div>
          `
    }
  }
}

async function fetchCurrentUser() {
  try {
    const token = localStorage.getItem("auth_token")

    if (!token) {
      console.warn("Không tìm thấy auth_token, chuyển hướng về trang đăng nhập")
      window.location.href = "/"
      return null
    }

    const response = await fetch("/api/profile/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (response.status === 404) {
      console.warn("Không tìm thấy người dùng (404), có thể token không hợp lệ")
      localStorage.removeItem("auth_token")
      window.location.href = "/"
      return null
    }

    if (!response.ok) {
      throw new Error(`Lỗi khi lấy dữ liệu người dùng: ${response.status}`)
    }

    const user = await response.json()
    console.log("Đã lấy thông tin người dùng:", user)
    return user
  } catch (error) {
    console.error("Lỗi trong fetchCurrentUser:", error)
    return null
  }
}

function updateUserInfoDropdown(user) {
  const userAvatar = document.querySelector(".user-dropdown .user-avatar img")
  const userName = document.querySelector(".user-dropdown .user-name")
  const userUsername = document.querySelector(".user-dropdown .user-username")

  if (userAvatar) {
    userAvatar.src = user.avatar || "/static/uploads/default-avatar-1.jpg"
    userAvatar.alt = user.fullname || user.username
  }

  if (userName) {
    userName.textContent = user.fullname || user.username
  }

  if (userUsername) {
    userUsername.textContent = `@${user.username}`
  }
}

function setupUserDropdown() {
  const userDropdown = document.querySelector(".user-dropdown")
  const dropdownMenu = document.querySelector(".dropdown-menu")

  if (!userDropdown || !dropdownMenu) return

  userDropdown.addEventListener("click", (event) => {
    event.stopPropagation()
    dropdownMenu.classList.toggle("show")
  })

  document.addEventListener("click", (event) => {
    if (!userDropdown.contains(event.target)) {
      dropdownMenu.classList.remove("show")
    }
  })

  const logoutBtn = document.getElementById("logout-btn")
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("auth_token")
      window.location.href = "/"
    })
  }
}

function setupThemeToggle() {
  const themeToggle = document.getElementById("theme-toggle")
  if (!themeToggle) return

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode")
    const isDarkMode = document.body.classList.contains("dark-mode")
    localStorage.setItem("dark-mode", isDarkMode)
  })

  const storedTheme = localStorage.getItem("dark-mode")
  if (storedTheme === "true") {
    document.body.classList.add("dark-mode")
  } else {
    document.body.classList.remove("dark-mode")
  }
}

function setupMessageClosing() {
  const message = document.querySelector(".message")
  if (!message) return

  const closeBtn = message.querySelector(".close-btn")
  if (!closeBtn) return

  closeBtn.addEventListener("click", () => {
    message.style.display = "none"
  })
}

function setupFollowButtons() {
  document.addEventListener("click", async (event) => {
    if (event.target.classList.contains("follow-btn")) {
      const button = event.target
      const userId = button.dataset.userId
      if (!userId) {
        console.error("User ID not found on follow button")
        return
      }

      const isFollowing = button.classList.contains("following")
      const token = localStorage.getItem("auth_token")
      if (!token) {
        alert("Please log in to follow users.")
        return
      }

      try {
        button.disabled = true
        const url = isFollowing ? "/api/profile/unfollow" : "/api/profile/follow"
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: userId }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || `Failed to ${isFollowing ? "unfollow" : "follow"} user`)
        }

        if (isFollowing) {
          button.classList.remove("following")
          button.textContent = "Follow"
        } else {
          button.classList.add("following")
          button.textContent = "Following"
        }

        const followersCount = document.querySelector(`.user-card[data-user-id="${userId}"] .followers-count`)
        if (followersCount) {
          followersCount.textContent = data.follower_count
        }
      } catch (error) {
        console.error("Error following/unfollowing user:", error)
        alert(`Failed to ${isFollowing ? "unfollow" : "follow"} user: ${error.message}`)
      } finally {
        button.disabled = false
      }
    }
  })
}

function createPostElement(post) {
  if (!post || !post._id || !post.author || !post.author.username) {
    console.error("Invalid post data:", post)
    return document.createElement("div")
  }

  const template = document.getElementById("post-template")
  if (!template) {
    console.error("Post template not found")
    return document.createElement("div")
  }

  const postElement = document.importNode(template.content, true).querySelector(".post")
  if (!postElement) {
    console.error("Post element not found in template")
    return document.createElement("div")
  }

  postElement.dataset.postId = post._id

  const postAuthorAvatar = postElement.querySelector(".user-avatar img")
  if (postAuthorAvatar) {
    postAuthorAvatar.src = post.author.avatar || "/static/uploads/default-avatar-1.jpg"
    postAuthorAvatar.alt = post.author.fullname || post.author.username
  } else {
    console.warn("Post author avatar image not found in template")
  }

  const postAuthorName = postElement.querySelector(".post-author")
  if (postAuthorName) {
    postAuthorName.textContent = post.author.fullname || post.author.username
  }

  const postAuthorUsername = postElement.querySelector(".post-username")
  if (postAuthorUsername) {
    postAuthorUsername.textContent = `@${post.author.username}`
  }

  const postTime = postElement.querySelector(".post-time")
  if (postTime && post.created_at) {
    postTime.textContent = formatPostTime(post.created_at)
  }

  const postContent = postElement.querySelector(".post-text")
  if (postContent) {
    postContent.textContent = post.content || ""
  }

  const postImage = postElement.querySelector(".post-image img")
  if (postImage) {
    console.log(`Processing post ${post._id} (content: "${post.content}")`, { image: post.image })
    if (post.image && typeof post.image === "string" && post.image.trim() !== "") {
      postImage.src = post.image
      postImage.alt = "Post Image"
      postImage.style.display = "block"
      postElement.querySelector(".post-image").classList.add("active")
      console.log(`Set image src to ${post.image} for post ${post._id}`)
    } else {
      postImage.style.display = "none"
      postElement.querySelector(".post-image").classList.remove("active")
      console.log(`No valid image for post ${post._id} (content: "${post.content}"), hiding image`)
    }
  } else {
    console.warn("Post image element not found in template")
  }

  const likesCount = postElement.querySelector(".like-count")
  if (likesCount) {
    likesCount.textContent = post.likes_count || 0
  }

  const commentsCount = postElement.querySelector(".comment-count")
  if (commentsCount) {
    commentsCount.textContent = post.comments_count || 0
  }

  const likeBtn = postElement.querySelector(".like-btn")
  if (likeBtn) {
    likeBtn.dataset.postId = post._id
    if (post.isLiked) {
      likeBtn.classList.add("liked")
      likeBtn.querySelector("i").classList.remove("far")
      likeBtn.querySelector("i").classList.add("fas")
    }
  }

  const commentBtn = postElement.querySelector(".comment-btn")
  if (commentBtn) {
    commentBtn.dataset.postId = post._id
  }

  const shareBtn = postElement.querySelector(".share-btn")
  if (shareBtn) {
    shareBtn.dataset.postId = post._id
  }

  // Show/hide edit, delete, and report options
  const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}")
  const editOption = postElement.querySelector(".edit-post-option")
  const deleteOption = postElement.querySelector(".delete-post-option")
  const reportOption = postElement.querySelector(".report-post-option")

  if (currentUser && post.author._id === currentUser._id) {
    console.log(`Post ${post._id}: Showing edit/delete, hiding report`)
    editOption.style.display = "block"
    deleteOption.style.display = "block"
    reportOption.style.display = "none"
  } else {
    console.log(`Post ${post._id}: Hiding edit/delete, showing report`)
    editOption.style.display = "none"
    deleteOption.style.display = "none"
    reportOption.style.display = "block"
  }

  return postElement
}

function setupRealTimeUpdates() {
  let pollingInterval
  const POLLING_INTERVAL = 30000

  function startPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval)
    }

    const activeTab = document.querySelector(".explore-tab.active")
    if (!activeTab) return

    const tabName = activeTab.dataset.tab

    pollingInterval = setInterval(() => {
      console.log(`Polling for updates on ${tabName} tab`)

      const searchInput = document.getElementById("explore-search-input")
      const query = searchInput ? searchInput.value.trim() : ""

      if (query.length > 2) {
        searchContent(query, true)
      } else {
        switch (tabName) {
          case "trending":
            const activeCategory = document.querySelector(".category-chip.active")
            const category = activeCategory ? activeCategory.dataset.category : "all"
            loadTrendingPosts(category, true)
            break
          case "latest":
            loadLatestPosts(true)
            break
          case "popular":
            loadPopularPosts(true)
            break
          case "people":
            loadSuggestedPeople(true)
            break
        }
      }
    }, POLLING_INTERVAL)
  }

  startPolling()

  const tabs = document.querySelectorAll(".explore-tab")
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      startPolling()
    })
  })

  const searchInput = document.getElementById("explore-search-input")
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
      startPolling()
    })
  }
}

function showNewContentNotification(count, type) {
  let notification = document.getElementById("new-content-notification")

  if (!notification) {
    notification = document.createElement("div")
    notification.id = "new-content-notification"
    notification.className = "new-content-notification"
    document.body.appendChild(notification)

    notification.addEventListener("click", () => {
      notification.classList.remove("active")
    })
  }

  notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-bell"></i>
        <span>${count} new ${type} available</span>
      </div>
    `

  notification.classList.add("active")

  setTimeout(() => {
    notification.classList.remove("active")
  }, 5000)
}

async function loadTrendingTopics() {
  try {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      console.error("No auth token found")
      return
    }

    const response = await fetch("/api/posts/trending-topics", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch trending topics")
    }

    const topics = await response.json()
    const trendingSection = document.getElementById("trending-topics")
    trendingSection.innerHTML = ""

    topics.forEach((topic) => {
      const formattedCount = formatNumber(topic.post_count)
      const topicElement = document.createElement("div")
      topicElement.classList.add("trending-topic")
      topicElement.innerHTML = `
                <a href="/explore?category=${topic.category.toLowerCase()}&q=${topic.hashtag}" class="topic-link">
                    <p class="topic-category">${topic.category}</p>
                    <h4>${topic.hashtag}</h4>
                    <p>${formattedCount} posts</p>
                </a>
            `
      trendingSection.appendChild(topicElement)
    })
  } catch (error) {
    console.error("Error loading trending topics:", error)
  }
}

function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K"
  }
  return num.toString()
}

function refreshTrendingPosts() {
  const activeCategory = document.querySelector(".category-chip.active")
  const category = activeCategory ? activeCategory.dataset.category : "all"
  loadTrendingPosts(category)
}

document.addEventListener("postCreated", () => {
  refreshTrendingPosts()
})

function formatPostTime(timestamp) {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHr = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHr / 24)

    if (diffSec < 60) return `${diffSec}s ago`
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHr < 24) return `${diffHr}h ago`
    if (diffDay < 7) return `${diffDay}d ago`
    return date.toLocaleDateString()
  } catch (e) {
    console.warn("Invalid timestamp:", timestamp)
    return ""
  }
}

function logTokenState() {
  const token = localStorage.getItem("auth_token")
  console.log(
    `[Explore] Time: ${new Date().toISOString()}, Current page: ${window.location.pathname}, ` +
      `auth_token: ${token ? token.slice(0, 10) + "..." : "missing"}`,
  )
}

document.addEventListener("DOMContentLoaded", () => {
  logTokenState()
  const token = localStorage.getItem("auth_token")
  if (!token) {
    window.location.href = "/"
    return
  }
})

document.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", (e) => {
    logTokenState()
    console.log(`[Explore] Clicking link to: ${link.href}`)
  })
})

function fixNavigation() {
  document.querySelectorAll('a:not([href="/profile"]):not([href="profile"])').forEach((link) => {
    if (!link.dataset.navigationFixed) {
      const newLink = link.cloneNode(true)
      newLink.dataset.navigationFixed = "true"
      link.parentNode.replaceChild(newLink, link)
    }
  })

  console.log("[Navigation] Fixed navigation links")
}

document.addEventListener("DOMContentLoaded", fixNavigation)

function applyTheme() {
  const isDarkMode = localStorage.getItem("dark-mode") === "true"
  if (isDarkMode) {
    document.body.classList.add("dark-mode")
  } else {
    document.body.classList.remove("dark-mode")
  }
}

async function loadFollowingList() {
  try {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      console.warn("No auth token, skipping loadFollowingList")
      return
    }

    const followingListContainer = document.querySelector(".following-list")
    if (!followingListContainer) {
      console.error("Following list container not found")
      return
    }

    followingListContainer.innerHTML = `
      <li class="loading-spinner small">
        <i class="fas fa-spinner fa-spin"></i>
      </li>
    `

    const response = await fetch("/api/profile/following", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch following list")
    }

    const users = await response.json()
    followingListContainer.innerHTML = ""

    if (users.length === 0) {
      followingListContainer.innerHTML = `
        <li class="no-users">
          <p>You are not following anyone yet.</p>
        </li>
      `
      return
    }

    users.forEach((user) => {
      const listItem = document.createElement("li")
      listItem.classList.add("following-user")
      listItem.innerHTML = `
        <a href="/profile/${user._id}" class="user-link">
          <div class="user-avatar small">
            <img src="${user.profile_picture || "/static/uploads/default-avatar-1.jpg"}" alt="${user.fullname || user.username}">
          </div>
          <div class="user-info">
            <h4>${user.fullname || user.username}</h4>
            <p>@${user.username}</p>
          </div>
        </a>
      `
      followingListContainer.appendChild(listItem)
    })
  } catch (error) {
    console.error("Error loading following list:", error)
    const followingListContainer = document.querySelector(".following-list")
    if (followingListContainer) {
      followingListContainer.innerHTML = `
        <li class="error-message">
          <p>Failed to load following list.</p>
        </li>
      `
    }
  }
}
