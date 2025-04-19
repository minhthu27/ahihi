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
  setupTabs()

  // Setup category filtering
  setupCategoryFilters()

  // Setup search functionality
  setupSearch()

  // Load trending posts (default tab)
  loadTrendingPosts()

  // Load suggested users for the right sidebar
  loadSuggestedUsers()

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
      // Update UI with user data if needed
      console.log("User data loaded:", user)
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
      tab.click() // Chuyển sang tab Trending
      if (category) {
        const categoryChip = document.querySelector(`.category-chip[data-category="${category}"]`)
        if (categoryChip) {
          categoryChip.click() // Chọn category
        }
      }
      if (query) {
        const searchInput = document.getElementById("explore-search-input")
        if (searchInput) {
          searchInput.value = query
          searchContent(query) // Tìm kiếm với hashtag
        }
      }
    }
  }
}

// Setup tab switching
function setupTabs() {
  const tabs = document.querySelectorAll(".explore-tab")
  const tabContents = document.querySelectorAll(".tab-content")

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Remove active class from all tabs
      tabs.forEach((t) => t.classList.remove("active"))

      // Add active class to clicked tab
      tab.classList.add("active")

      // Hide all tab contents
      tabContents.forEach((content) => content.classList.remove("active"))

      // Show the corresponding tab content
      const tabName = tab.dataset.tab
      const activeContent = document.getElementById(`${tabName}-content`)
      activeContent.classList.add("active")

      // Load content based on the active tab
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
      // Remove active class from all chips
      categoryChips.forEach((c) => c.classList.remove("active"))

      // Add active class to clicked chip
      chip.classList.add("active")

      // Get the selected category
      const category = chip.dataset.category

      // Reload trending posts with the selected category
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
        // Perform search
        searchContent(query)
      } else if (query.length === 0) {
        // If search is cleared, reload the current active tab
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
    }, 500) // Debounce for 500ms
  })
}

// Load trending posts
async function loadTrendingPosts(category = "all", silent = false) {
  try {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      console.warn("Không có auth_token, chuyển hướng về trang đăng nhập");
      window.location.href = "/";
      return;
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
    console.log("Trending posts data:", posts) // Debug: Log posts data

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
      console.log(`Processing post ${index + 1}:`, post) // Debug: Log each post
      const postElement = createPostElement(post)
      trendingPostsContainer.appendChild(postElement)
    })

    setupPostInteractions()
  } catch (error) {
    console.error("Error loading trending posts:", error)
    if (!silent) {
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
      console.warn("No auth token, skipping loadLatestPosts");
      return;
    }
    const latestPostsContainer = document.getElementById("latest-posts")

    if (!latestPostsContainer) return

    // Only show loading spinner if not a silent update
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

    // If this is a silent update, compare with existing posts
    if (silent) {
      const existingPostIds = Array.from(latestPostsContainer.querySelectorAll(".post")).map(
        (post) => post.dataset.postId,
      )

      // Find new posts that aren't in the existing list
      const newPosts = posts.filter((post) => !existingPostIds.includes(post._id))

      if (newPosts.length > 0) {
        // Show notification about new posts
        showNewContentNotification(newPosts.length, "latest posts")

        // Prepend new posts at the top
        newPosts.forEach((post) => {
          const postElement = createPostElement(post)
          latestPostsContainer.insertBefore(postElement, latestPostsContainer.firstChild)
        })

        // Setup interactions for new posts
        setupPostInteractions()
      }

      return
    }

    // For non-silent updates, clear the container and show all posts
    latestPostsContainer.innerHTML = ""

    if (posts.length === 0) {
      latestPostsContainer.innerHTML = `
          <div class="no-posts">
            <p>No latest posts found.</p>
          </div>
        `
      return
    }

    // Render posts
    posts.forEach((post) => {
      const postElement = createPostElement(post)
      latestPostsContainer.appendChild(postElement)
    })

    // Setup post interactions
    setupPostInteractions()
  } catch (error) {
    console.error("Error loading latest posts:", error)

    // Only show error if not a silent update
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
      console.warn("No auth token, skipping loadPopularPosts");
      return;
    }
    const popularPostsContainer = document.getElementById("popular-posts")

    if (!popularPostsContainer) return

    // Only show loading spinner if not a silent update
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

    // If this is a silent update, compare with existing posts
    if (silent) {
      const existingPostIds = Array.from(popularPostsContainer.querySelectorAll(".post")).map(
        (post) => post.dataset.postId,
      )

      // Find new posts that aren't in the existing list
      const newPosts = posts.filter((post) => !existingPostIds.includes(post._id))

      if (newPosts.length > 0) {
        // Show notification about new posts
        showNewContentNotification(newPosts.length, "popular posts")

        // Prepend new posts at the top
        newPosts.forEach((post) => {
          const postElement = createPostElement(post)
          popularPostsContainer.insertBefore(postElement, popularPostsContainer.firstChild)
        })

        // Setup interactions for new posts
        setupPostInteractions()
      }

      return
    }

    // For non-silent updates, clear the container and show all posts
    popularPostsContainer.innerHTML = ""

    if (posts.length === 0) {
      popularPostsContainer.innerHTML = `
          <div class="no-posts">
            <p>No popular posts found.</p>
          </div>
        `
      return
    }

    // Render posts
    posts.forEach((post) => {
      const postElement = createPostElement(post)
      popularPostsContainer.appendChild(postElement)
    })

    // Setup post interactions
    setupPostInteractions()
  } catch (error) {
    console.error("Error loading popular posts:", error)

    // Only show error if not a silent update
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

    const users = await response.json();

    if (silent) {
      const existingUserIds = Array.from(suggestedPeopleContainer.querySelectorAll(".user-card")).map(
        (user) => user.dataset.userId,
      );

      const newUsers = users.filter((user) => !existingUserIds.includes(user._id));

      if (newUsers.length > 0) {
        showNewContentNotification(newUsers.length, "suggested people");

        newUsers.forEach((user) => {
          const userCard = createUserCardElement(user); // Không truyền query
          suggestedPeopleContainer.insertBefore(userCard, suggestedPeopleContainer.firstChild);
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
      const userCard = createUserCardElement(user); // Không truyền query
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
// Search content
async function searchContent(query, silent = false) {
  try {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      console.warn("No auth token, redirecting to login");
      window.location.href = "/";
      return;
    }

    query = query.replace(/^#/, "").toLowerCase().trim(); // Chuẩn hóa query

    const activeTab = document.querySelector(".explore-tab.active");
    const tabName = activeTab ? activeTab.dataset.tab : "trending";

    const containerId = `${tabName}-content`;
    const container = document.getElementById(containerId);

    if (!container) {
      console.error(`Container not found for ID: ${containerId}`);
      return;
    }

    const contentContainer = document.getElementById(`${tabName}-posts`) || document.getElementById("suggested-people");

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

    let endpoint = tabName === "people" ? "/api/search/users" : "/api/search/posts";
    endpoint += `?q=${encodeURIComponent(query)}`;

    if (tabName !== "people") {
      endpoint += `&sort=${tabName}`;
      const activeCategory = document.querySelector(".category-chip.active");
      if (activeCategory && activeCategory.dataset.category !== "all") {
        endpoint += `&category=${encodeURIComponent(activeCategory.dataset.category.toLowerCase())}`;
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
    const resultsArray = tabName === "people" ? results.users : results.posts;

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
        const userCard = createUserCardElement(user, query); // Truyền query
        contentContainer.appendChild(userCard);
      });
      setupFollowButtons();
    } else {
      resultsArray.forEach((post) => {
        const postElement = createPostElement(post);
        contentContainer.appendChild(postElement);
      });
      setupPostInteractions();
    }
  } catch (error) {
    console.error("Error searching content:", error);
    const contentContainer = document.getElementById(`${document.querySelector(".explore-tab.active")?.dataset.tab || "trending"}-posts`) || document.getElementById("suggested-people");
    if (contentContainer && !silent) {
      contentContainer.innerHTML = `
        <div class="error-message">
          <p>${error.message || "Search failed. Please try again later."}</p>
        </div>
      `;
    }
  }
}
// Thêm hàm highlightQuery (nếu chưa có)
function highlightQuery(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<span class="highlight">$1</span>');
}

// Cập nhật createUserCardElement để nhận query
function createUserCardElement(user, query = "") {
  const template = document.getElementById("user-card-template");
  const userCard = document.importNode(template.content, true).querySelector(".user-card");

  userCard.dataset.userId = user._id;

  const userAvatar = userCard.querySelector(".user-avatar img");
  userAvatar.src = user.profile_picture || "/static/uploads/default-avatar-1.jpg";
  userAvatar.alt = user.fullname || user.username;

  const userName = userCard.querySelector(".user-name");
  userName.innerHTML = query ? highlightQuery(user.fullname || user.username, query) : (user.fullname || user.username);

  const userUsername = userCard.querySelector(".user-username");
  userUsername.innerHTML = query ? highlightQuery(`@${user.username}`, query) : `@${user.username}`;

  const userBio = userCard.querySelector(".user-bio");
  userBio.textContent = user.bio || "No bio available";

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
// Create user card element


// Import functions from dashboard.js
// These functions are already defined in dashboard.js, so we're just referencing them here
// setupUserDropdown, setupThemeToggle, setupMessageClosing, setupFollowButtons, fetchCurrentUser, createPostElement, setupPostInteractions

async function loadSuggestedUsers() {
  try {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      console.warn("No auth token, skipping loadSuggestedUsers");
      return;
    }
    const suggestedUsersContainer = document.getElementById("suggested-users");

    if (!suggestedUsersContainer) return;

    suggestedUsersContainer.innerHTML = `
          <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Loading suggested users...</span>
          </div>
        `;

    const response = await fetch("/api/users/discover", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch suggested users");
    }

    const users = await response.json();

    suggestedUsersContainer.innerHTML = "";

    if (users.length === 0) {
      suggestedUsersContainer.innerHTML = `
            <div class="no-users">
              <p>No suggested users found.</p>
            </div>
          `;
      return;
    }

    users.forEach((user) => {
      const userCard = createUserCardElement(user); // Không truyền query
      suggestedUsersContainer.appendChild(userCard);
    });

    setupFollowButtons();
  } catch (error) {
    console.error("Error loading suggested users:", error);
    const suggestedUsersContainer = document.getElementById("suggested-users");

    if (suggestedUsersContainer) {
      suggestedUsersContainer.innerHTML = `
            <div class="error-message">
              <p>Failed to load suggested users. Please try again later.</p>
            </div>
          `;
    }
  }
}

async function fetchCurrentUser() {
  try {
    // Lấy token từ localStorage
    const token = localStorage.getItem("auth_token");

    // Kiểm tra xem token có tồn tại không
    if (!token) {
      console.warn("Không tìm thấy auth_token, chuyển hướng về trang đăng nhập");
      window.location.href = "/"; // Chuyển hướng về trang đăng nhập
      return null;
    }

    // Gửi yêu cầu API để lấy thông tin người dùng
    const response = await fetch("/api/profile/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    // Xử lý lỗi 404
    if (response.status === 404) {
      console.warn("Không tìm thấy người dùng (404), có thể token không hợp lệ");
      localStorage.removeItem("auth_token"); // Xóa token
      window.location.href = "/"; // Chuyển hướng về trang đăng nhập
      return null;
    }

    // Kiểm tra các lỗi khác
    if (!response.ok) {
      throw new Error(`Lỗi khi lấy dữ liệu người dùng: ${response.status}`);
    }

    // Lấy dữ liệu người dùng
    const user = await response.json();
    console.log("Đã lấy thông tin người dùng:", user);
    return user;
  } catch (error) {
    console.error("Lỗi trong fetchCurrentUser:", error);
    return null;
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

  // Load theme from local storage
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
        button.disabled = true // Vô hiệu hóa nút trong khi xử lý
        const url = isFollowing ? "/api/profile/unfollow" : "/api/profile/follow"
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: userId }), // Gửi userId trong body
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || `Failed to ${isFollowing ? "unfollow" : "follow"} user`)
        }

        // Cập nhật giao diện sau khi thành công
        if (isFollowing) {
          button.classList.remove("following")
          button.textContent = "Follow"
        } else {
          button.classList.add("following")
          button.textContent = "Following"
        }

        // Cập nhật số liệu followers ngay lập tức
        const followersCount = document.querySelector(`.user-card[data-user-id="${userId}"] .followers-count`)
        if (followersCount) {
          followersCount.textContent = data.follower_count // Sử dụng giá trị từ API
        }
      } catch (error) {
        console.error("Error following/unfollowing user:", error)
        alert(`Failed to ${isFollowing ? "unfollow" : "follow"} user: ${error.message}`)
      } finally {
        button.disabled = false // Kích hoạt lại nút
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

  // Enhanced image handling
  const postImage = postElement.querySelector(".post-image img")
  if (postImage) {
    console.log(`Processing post ${post._id} (content: "${post.content}")`, { image: post.image })
    if (post.image && typeof post.image === "string" && post.image.trim() !== "") {
      postImage.src = post.image
      postImage.alt = "Post Image"
      postImage.style.display = "block"
      console.log(`Set image src to ${post.image} for post ${post._id}`)
    } else {
      postImage.style.display = "none"
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

  return postElement
}
function setupPostInteractions() {
  document.addEventListener("click", async (event) => {
    if (event.target.classList.contains("like-btn")) {
      const button = event.target
      const postId = button.dataset.postId

      if (!postId) return

      const isLiked = button.classList.contains("liked")

      try {
        const token = localStorage.getItem("auth_token")
        const method = isLiked ? "DELETE" : "POST"
        const url = isLiked ? `/api/posts/unlike/${postId}` : `/api/posts/like/${postId}`

        const response = await fetch(url, {
          method: method,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to ${isLiked ? "unlike" : "like"} post`)
        }

        const postElement = button.closest(".post")
        const likesCountElement = postElement.querySelector(".likes-count")
        let likesCount = Number.parseInt(likesCountElement.textContent)

        if (isLiked) {
          button.classList.remove("liked")
          likesCount--
        } else {
          button.classList.add("liked")
          likesCount++
        }

        likesCountElement.textContent = likesCount
      } catch (error) {
        console.error("Error liking/unliking post:", error)
        alert(`Failed to ${isLiked ? "unlike" : "like"} post. Please try again later.`)
      }
    }

    if (event.target.classList.contains("comment-btn")) {
      const button = event.target
      const postId = button.dataset.postId

      if (!postId) return

      // Redirect to the post detail page
      window.location.href = `/post/${postId}`
    }
  })
}
function setupRealTimeUpdates() {
  // Set up polling interval for active tab
  let pollingInterval
  const POLLING_INTERVAL = 30000 // 30 seconds

  function startPolling() {
    // Clear any existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval)
    }

    // Determine which tab is active
    const activeTab = document.querySelector(".explore-tab.active")
    if (!activeTab) return

    const tabName = activeTab.dataset.tab

    // Set up polling based on active tab
    pollingInterval = setInterval(() => {
      console.log(`Polling for updates on ${tabName} tab`)

      // Get the search query if any
      const searchInput = document.getElementById("explore-search-input")
      const query = searchInput ? searchInput.value.trim() : ""

      if (query.length > 2) {
        // If there's a search query, refresh the search results
        searchContent(query, true)
      } else {
        // Otherwise refresh the tab content
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

  // Start polling when the page loads
  startPolling()

  // Restart polling when tab changes
  const tabs = document.querySelectorAll(".explore-tab")
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      startPolling()
    })
  })

  // Restart polling when search input changes
  const searchInput = document.getElementById("explore-search-input")
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      // Reset the polling when search input changes
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
      startPolling()
    })
  }
}

function showNewContentNotification(count, type) {
  // Create notification element if it doesn't exist
  let notification = document.getElementById("new-content-notification")

  if (!notification) {
    notification = document.createElement("div")
    notification.id = "new-content-notification"
    notification.className = "new-content-notification"
    document.body.appendChild(notification)

    // Add click event to dismiss notification
    notification.addEventListener("click", () => {
      notification.classList.remove("active")
    })
  }

  // Update notification content
  notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-bell"></i>
        <span>${count} new ${type} available</span>
      </div>
    `

  // Show notification
  notification.classList.add("active")

  // Auto-hide after 5 seconds
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
    trendingSection.innerHTML = "" // Xóa nội dung hiện tại

    topics.forEach((topic) => {
      const formattedCount = formatNumber(topic.post_count) // Định dạng số bài viết
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

// Hàm định dạng số (ví dụ: 5200 -> 5.2K)
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

// Call on page load
document.addEventListener("DOMContentLoaded", () => {
  logTokenState()
  const token = localStorage.getItem("auth_token")
  if (!token) {
    window.location.href = "/"
    return
  }
  // ... rest of the code
})

// Call before navigation
document.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", (e) => {
    logTokenState()
    console.log(`[Explore] Clicking link to: ${link.href}`)
  })
})

// Fix for navigation issues
function fixNavigation() {
  // Remove the event listeners that were added at the bottom of the file
  document.querySelectorAll('a:not([href="/profile"]):not([href="profile"])').forEach((link) => {
    // Clone and replace to remove existing event listeners
    if (!link.dataset.navigationFixed) {
      const newLink = link.cloneNode(true)
      newLink.dataset.navigationFixed = "true"
      link.parentNode.replaceChild(newLink, link)
    }
  })

  console.log("[Navigation] Fixed navigation links")
}

// Call this function when the page loads
document.addEventListener("DOMContentLoaded", fixNavigation)
// Thêm hàm highlightQuery
function highlightQuery(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<span class="highlight">$1</span>');
}

