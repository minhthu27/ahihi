// ✅ Đây là file đã GHÉP hoàn chỉnh: profile_new.js + phần cần giữ lại của profile.js cũ

// --- CODE PHẦN ĐẦU GIỐNG profile_new.js ---

// Update any hardcoded '/profile' links to use the correct endpoint
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("auth_token")
  if (!token) {
    window.location.href = "/"
    return
  }
  const userId = getUserIdFromUrl()
  initializeProfile(userId)
})

function getUserIdFromUrl() {
  const pathParts = window.location.pathname.split("/")
  const lastPart = pathParts[pathParts.length - 1]
  if (lastPart === "profile") {
    const currentUser = JSON.parse(localStorage.getItem("current_user"))
    if (currentUser && currentUser._id) {
      window.location.replace(`/profile/${currentUser._id}`)
      return null
    }
    return null
  }
  return lastPart
}

function updateProfileLinks() {
  const profileLinks = document.querySelectorAll('a[href="/profile"]')
  const currentUser = JSON.parse(localStorage.getItem("current_user"))
  if (currentUser && currentUser._id) {
    profileLinks.forEach((link) => (link.href = `/profile/${currentUser._id}`))
  }
}

// --- GIỮ LẠI từ profile.js CŨ ---

function createPostElement(post) {
  const template = document.getElementById("post-template")
  const postElement = document.importNode(template.content, true).querySelector(".post")
  postElement.dataset.postId = post._id

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

  const postTime = postElement.querySelector(".post-time")
  postTime.textContent = formatTimeAgo(new Date(post.created_at))

  const postText = postElement.querySelector(".post-text")
  postText.textContent = post.content

  const postImage = postElement.querySelector(".post-image")
  const postImageElement = postElement.querySelector(".post-image img")
  if (post.image) {
    postImage.classList.add("active")
    postImageElement.src = post.image
    postImageElement.alt = "Post image"
  } else {
    postImage.style.display = "none"
  }

  const likeCount = postElement.querySelector(".like-count")
  likeCount.textContent = post.likes ? post.likes.length : 0

  const currentUser = JSON.parse(localStorage.getItem("current_user"))
  const likeBtn = postElement.querySelector(".like-btn")
  if (currentUser && post.likes && post.likes.includes(currentUser._id)) {
    likeBtn.classList.add("active")
    likeBtn.querySelector("i").classList.remove("far")
    likeBtn.querySelector("i").classList.add("fas")
  }

  let totalCommentCount = post.comments ? post.comments.length : 0
  if (post.comments) {
    post.comments.forEach((comment) => {
      if (comment.replies) {
        totalCommentCount += comment.replies.length
      }
    })
  }

  if (post.comment_count !== undefined) {
    totalCommentCount = post.comment_count
  }

  const commentCount = postElement.querySelector(".comment-count")
  commentCount.textContent = totalCommentCount

  const shareCount = postElement.querySelector(".share-count")
  shareCount.textContent = post.shares || 0

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

// Update the setupPostInteractions function to include all post actions
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
        document.querySelectorAll(".post-dropdown.active").forEach((dd) => {
          if (dd !== dropdown) dd.classList.remove("active")
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

    // Report post
    const reportPostOption = post.querySelector(".post-dropdown ul li:last-child a")
    if (reportPostOption) {
      reportPostOption.addEventListener("click", (e) => {
        e.preventDefault()
        const postId = post.dataset.postId
        reportPost(postId, post)
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

async function toggleLikePost(postId, button) {
  try {
    const token = localStorage.getItem("auth_token")
    const icon = button.querySelector("i")
    const countElement = button.querySelector(".like-count")
    const count = Number.parseInt(countElement.textContent)
    if (button.classList.contains("active")) {
      icon.classList.replace("fas", "far")
      button.classList.remove("active")
      countElement.textContent = Math.max(0, count - 1)
    } else {
      icon.classList.replace("far", "fas")
      button.classList.add("active")
      countElement.textContent = count + 1
    }
    const response = await fetch(`/api/posts/${postId}/like`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    })
    if (!response.ok) throw new Error("Failed to toggle like")
  } catch (error) {
    console.error("Error toggling like:", error)
  }
}

// Add the following functions after toggleLikePost

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
// Modify the openCommentModal function to properly load and display comments
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
  // Add this line after it to mark the post as active
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

  // Find the closeCommentOverlay function inside openCommentModal and update it:
  function closeCommentOverlay() {
    // Remove active-comment class from all posts
    document.querySelectorAll(".post.active-comment").forEach((post) => {
      post.classList.remove("active-comment")
    })

    overlay.remove()
    document.body.style.overflow = "" // Restore scrolling
  }
}

// Improve the loadComments function to properly display comments
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

// Cập nhật hàm createCommentElement để sửa lỗi avatar
// Thay thế hàm createCommentElement hiện tại bằng hàm này

// Update the createCommentElement function to improve comment display
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
function deletePost(postId, postElement) {
  if (confirm("Are you sure you want to delete this post?")) {
    try {
      const token = localStorage.getItem("auth_token")

      fetch(`/api/posts/${postId}/delete`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to delete post")
          }
          return response.json()
        })
        .then(() => {
          // Remove post from feed
          postElement.remove()

          // Show success message
          showSuccess("Post deleted successfully!")

          // Update post count in profile stats if we're on the profile page
          const postsCount = document.getElementById("posts-count")
          if (postsCount) {
            const count = Number.parseInt(postsCount.textContent)
            postsCount.textContent = Math.max(0, count - 1)
          }
        })
        .catch((error) => {
          console.error("Error deleting post:", error)
          showError("Failed to delete post. Please try again.")
        })
    } catch (error) {
      console.error("Error deleting post:", error)
      showError("Failed to delete post. Please try again.")
    }
  }
}

// Report post
function reportPost(postId, postElement) {
  // Create modal
  const modal = document.createElement("div")
  modal.className = "modal report-modal"
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
  const cancelBtn = modal.querySelector(".cancel-report-btn")
  cancelBtn.addEventListener("click", closeModal)

  // Setup report options
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

  // Setup submit button
  submitReportBtn.addEventListener("click", () => {
    const selectedOption = modal.querySelector('input[name="report-reason"]:checked')

    if (!selectedOption) {
      showError("Please select a reason for reporting.")
      return
    }

    let reason = selectedOption.value
    if (reason === "other") {
      reason = otherReasonTextarea.value.trim()
      if (reason === "") {
        showError("Please specify the reason for reporting.")
        return
      }
    }

    // Here you would normally send the report to the server
    // For now, we'll just show a success message
    showSuccess("Thank you for your report. We'll review it shortly.")
    closeModal()
  })

  function closeModal() {
    modal.classList.remove("active")
    setTimeout(() => {
      modal.remove()
    }, 300)
  }
}

// Format time ago function (if not already defined)
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

// --- Phần còn lại giữ nguyên như profile_new.js ---

// Bạn chỉ cần giữ 4 hàm này từ code cũ, rồi paste nguyên phần còn lại từ profile_new.js vào là hoàn chỉnh!
// Initialize profile page
async function initializeProfile(userId) {
  try {
    // First fetch current user data to know who is logged in
    const currentUserData = await fetchCurrentUser()

    if (!currentUserData) {
      // If we couldn't get current user data, redirect to home
      window.location.href = "/"
      return
    }

    // If no user ID provided or if we're at /profile without ID parameter,
    // we should show the current user's profile
    if (!userId) {
      userId = currentUserData._id

      // Redirect to the profile with ID to prevent infinite loading
      if (window.location.pathname === "/profile") {
        window.location.replace(`/profile/${userId}`)
        return
      }
    }

    // Fetch profile user data
    const profileData = await fetchUserProfile(userId)

    if (!profileData) {
      showError("Profile not found")
      return
    }

    // Setup user dropdown menu
    setupUserDropdown()

    // Setup theme toggle
    setupThemeToggle()

    // Setup message closing
    setupMessageClosing()

    // Setup tabs
    setupProfileTabs()

    // Load user posts
    loadUserPosts(userId)

    // Load suggested users
    loadSuggestedUsers()

    // Setup share profile button
    setupShareProfileButton()

    // Always load the current user's following list, not the profile user's
    loadFollowingList(currentUserData._id)

    // Setup external avatar upload
    setupExternalAvatarUpload()
    setupExternalCoverUpload();

    addChangeCoverButton();
  } catch (error) {
    showError("Failed to load profile. Please try again later.")
    console.error("Error initializing profile:", error)
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

    // Update UI with user data
    updateCurrentUserUI(userData)

    // Store user data in localStorage for easy access
    localStorage.setItem("current_user", JSON.stringify(userData))

    // Update profile links with the user ID
    updateProfileLinks()

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
      el.src = userData.avatar || "/static/uploads/default-avatar-1.jpg"
      el.alt = userData.fullname || userData.username
    }
  })
}

// Update the fetchUserProfile function to properly handle the profile data
async function fetchUserProfile(userId) {
  try {
    const token = localStorage.getItem("auth_token")

    const response = await fetch(`/api/profile/user/id/${userId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch user profile")
    }

    const userData = await response.json()

    // Update profile UI
    updateProfileUI(userData)

    // Store profile data
    localStorage.setItem("profile_user", JSON.stringify(userData))

    // Check if this is the current user's profile
    const currentUser = JSON.parse(localStorage.getItem("current_user"))

    // Debug information to help troubleshoot
    console.log("Current user ID:", currentUser?._id)
    console.log("Profile user ID:", userData?._id)
    console.log("Is same user:", currentUser && currentUser._id === userData._id)

    const isCurrentUser = currentUser && currentUser._id === userData._id

    // Show/hide edit profile button and follow button
    const editProfileBtn = document.getElementById("edit-profile-btn")
    const followBtn = document.getElementById("follow-btn")

    if (editProfileBtn && followBtn) {
      if (isCurrentUser) {
        // If viewing own profile, show Edit Profile button and hide Follow button
        editProfileBtn.style.display = "block"
        followBtn.style.display = "none"

        // Remove any existing event listeners
        const newEditBtn = editProfileBtn.cloneNode(true)
        editProfileBtn.parentNode.replaceChild(newEditBtn, editProfileBtn)

        // Add event listener to the new button
        newEditBtn.addEventListener("click", openEditProfileModal)
      } else {
        // If viewing someone else's profile, hide Edit Profile button and show Follow button
        editProfileBtn.style.display = "none"
        followBtn.style.display = "block"

        // Check if current user is following this user
        const isFollowing = userData.isFollowing || false

        if (isFollowing) {
          followBtn.textContent = "Following"
          followBtn.classList.add("following")
        } else {
          followBtn.textContent = "Follow"
          followBtn.classList.remove("following")
        }

        // Remove existing event listeners
        const newFollowBtn = followBtn.cloneNode(true)
        followBtn.parentNode.replaceChild(newFollowBtn, followBtn)

        // Add event listener
        newFollowBtn.addEventListener("click", function () {
          toggleFollow(userData._id, this)
        })
      }
    }

    // Show share profile button
    const shareProfileBtn = document.getElementById("share-profile-btn")
    if (shareProfileBtn) {
      shareProfileBtn.style.display = "block"

      // Add event listener for share button
      shareProfileBtn.addEventListener("click", () => {
        openShareModal(userData.username, userData._id)
      })
    }

    // Setup stats click handlers
    setupStatsClickHandlers(userData._id)

    return userData
  } catch (error) {
    showError("Failed to fetch user profile. Please try again later.")
    console.error("Error fetching user profile:", error)
    return null
  }
}

// Add a function to update the profile UI with user data
function updateProfileUI(userData) {
  console.log("Updating profile UI with:", userData);

  // Update profile name and username
  const profileName = document.getElementById("profile-name");
  const profileUsername = document.getElementById("profile-username");

  if (profileName) profileName.textContent = userData.fullname || userData.username;
  if (profileUsername) profileUsername.textContent = `@${userData.username}`;

  // Update profile bio
  const profileBio = document.getElementById("profile-bio");
  if (profileBio) {
    profileBio.textContent = userData.bio || "No bio yet";
  }

  // Update profile avatar
  const profileAvatar = document.getElementById("profile-avatar");
  if (profileAvatar) {
    if (userData.avatar) {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      profileAvatar.src = `${userData.avatar}?t=${timestamp}`;
    } else {
      // If no avatar, show initials in the avatar circle
      const avatarContainer = profileAvatar.parentElement;
      avatarContainer.innerHTML = `<div class="avatar-initials">${getInitials(userData.fullname || userData.username)}</div>`;
    }
  }

  // Update join date
  const joinDateText = document.getElementById("join-date-text");
  if (joinDateText) {
    const joinDate = userData.created_at ? new Date(userData.created_at) : null;
    if (joinDate && !isNaN(joinDate.getTime())) {
      const options = { year: "numeric", month: "long" };
      joinDateText.textContent = `Joined ${joinDate.toLocaleDateString("en-US", options)}`;
    } else {
      joinDateText.textContent = "Joined recently";
    }
  }

  // Update stats
  const postsCount = document.getElementById("posts-count");
  const followingCount = document.getElementById("following-count");
  const followersCount = document.getElementById("followers-count");

  if (postsCount) postsCount.textContent = userData.postsCount || 0;
  if (followingCount) followingCount.textContent = userData.following ? userData.following.length : 0;
  if (followersCount) followersCount.textContent = userData.followers ? userData.followers.length : 0;

  // Update cover image - check both cover and coverImage fields
  const profileCover = document.getElementById("profile-cover");
  if (profileCover) {
    const coverImage = userData.cover || userData.coverImage;
    if (coverImage) {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      profileCover.style.backgroundImage = `url(${coverImage}?t=${timestamp})`;
      console.log("Updated cover image to:", coverImage);
    } else {
      profileCover.style.backgroundImage = "url('/static/uploads/default-cover.jpg')";
    }
  }

  // Make sure follow button has the correct data-user-id attribute
  const followBtn = document.getElementById("follow-btn");
  if (followBtn && userData._id) {
    followBtn.setAttribute("data-user-id", userData._id);
    console.log("✅ Set data-user-id for follow button:", userData._id);
  }
}

// Helper function to get initials from name
function getInitials(name) {
  if (!name) return "??"

  const parts = name.split(" ")
  if (parts.length === 1) {
    return name.substring(0, 2).toUpperCase()
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// Function to setup click handlers for stats
function setupStatsClickHandlers(userId) {
  const followingStat = document.getElementById("following-stat")
  const followersStat = document.getElementById("followers-stat")

  if (followingStat) {
    followingStat.addEventListener("click", () => {
      openFollowModal("following", userId)
    })
  }

  if (followersStat) {
    followersStat.addEventListener("click", () => {
      openFollowModal("followers", userId)
    })
  }
}

// Function to open follow/following modal
function openFollowModal(type, userId) {
  // Create modal if it doesn't exist
  let modal = document.getElementById("follow-modal")
  if (!modal) {
    modal = document.createElement("div")
    modal.id = "follow-modal"
    modal.className = "modal follow-modal"

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="follow-modal-title"></h2>
          <button class="close-modal"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="follow-list" id="follow-list">
            <div class="loading-spinner">
              <i class="fas fa-spinner fa-spin"></i>
              <span>Loading...</span>
            </div>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    // Add event listener to close button
    const closeBtn = modal.querySelector(".close-modal")
    closeBtn.addEventListener("click", () => {
      modal.classList.remove("active")
    })
  }

  // Update modal title
  const modalTitle = modal.querySelector("#follow-modal-title")
  modalTitle.textContent = type === "following" ? "Following" : "Followers"

  // Show modal
  modal.classList.add("active")

  // Load users
  loadFollowUsers(type, userId)
}

// Function to load following/followers users
async function loadFollowUsers(type, userId) {
  try {
    const token = localStorage.getItem("auth_token")
    const followList = document.getElementById("follow-list")

    if (!followList) return

    // Show loading spinner
    followList.innerHTML = `
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <span>Loading...</span>
      </div>
    `

    const endpoint =
      type === "following" ? `/api/profile/following/id/${userId}` : `/api/profile/followers/id/${userId}`

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch ${type}`)
    }

    const users = await response.json()

    // Clear loading spinner
    followList.innerHTML = ""

    if (users.length === 0) {
      followList.innerHTML = `
        <div class="no-users">
          <p>No ${type} yet</p>
        </div>
      `
      return
    }

    // Render users
    users.forEach((user) => {
      const userElement = document.createElement("div")
      userElement.className = "follow-user"

      userElement.innerHTML = `
        <div class="follow-user-info">
          <a href="/profile/${user._id}" class="user-avatar small">
            <img src="${user.avatar || "/static/uploads/default-avatar-1.jpg"}" alt="${user.fullname || user.username}">
          </a>
          <div class="user-details">
            <h4>${user.fullname || user.username}</h4>
            <p>@${user.username}</p>
            ${user.bio ? `<p class="user-bio">${user.bio}</p>` : ""}
          </div>
        </div>
        <button class="follow-btn ${user.isFollowing ? "following" : ""}" data-user-id="${user._id}">
          ${user.isFollowing ? "Following" : "Follow"}
        </button>
      `

      followList.appendChild(userElement)
    })

    // Setup follow buttons
    setupFollowButtons()
  } catch (error) {
    console.error(`Error loading ${type}:`, error)
    const followList = document.getElementById("follow-list")
    if (followList) {
      followList.innerHTML = `
        <div class="error-message">
          <p>Failed to load ${type}. Please try again later.</p>
        </div>
      `
    }
  }
}

// Function to update follow counters
function updateFollowCounters(isFollowing, userId) {
  const currentUser = JSON.parse(localStorage.getItem("current_user"))
  const viewedUserId = document.body.dataset.viewedUserId

  const followingCount = document.getElementById("following-count")
  const followersCount = document.getElementById("followers-count")

  if (currentUser._id === userId) {
    // If following self, don't change counts
    return
  }

  if (viewedUserId === userId) {
    // If on the profile page of the user being followed/unfollowed
    if (followersCount) {
      const count = Number.parseInt(followersCount.textContent) || 0
      followersCount.textContent = isFollowing ? count + 1 : Math.max(0, count - 1)
    }
  }

  if (followingCount && viewedUserId === currentUser._id) {
    // If on current user's profile, update following count
    const count = Number.parseInt(followingCount.textContent) || 0
    followingCount.textContent = isFollowing ? count + 1 : Math.max(0, count - 1)
  }
}

// Toggle follow/unfollow function
async function toggleFollow(userId, button) {
  console.log("👉 Bắt đầu toggle follow cho user:", userId)

  try {
    const token = localStorage.getItem("auth_token")
    const isFollowing = button.classList.contains("following")
    const endpoint = isFollowing ? "/api/profile/unfollow" : "/api/profile/follow"

    button.disabled = true
    const originalText = button.textContent
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'

    console.log(`📡 Đang gửi tới: ${endpoint} cho userId: ${userId}`)

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    })

    const result = await response.json()
    console.log("📦 Kết quả trả về từ server:", result)

    if (response.ok && result.success) {
      const newIsFollowing = !isFollowing
      button.textContent = newIsFollowing ? "Following" : "Follow"
      button.classList.toggle("following", newIsFollowing)
      updateFollowCounters(newIsFollowing, userId)
      console.log(`✅ Đã ${newIsFollowing ? "follow" : "unfollow"} user thành công.`)
    } else {
      button.textContent = originalText
      button.classList.toggle("following", isFollowing)
      console.error("❌ Server trả về lỗi:", result.error || "Unknown error.")
      showError(result.error || "Failed to update follow status.")
    }
  } catch (error) {
    console.error("⚠️ Lỗi khi fetch follow/unfollow:", error)
    showError("Failed to update follow status. Please try again.")
  } finally {
    button.disabled = false
  }
}

// Setup follow buttons
function setupFollowButtons() {
  const followButtons = document.querySelectorAll(".follow-btn")

  console.log("🔍 Tìm thấy", followButtons.length, "nút follow để gắn event")

  followButtons.forEach((button) => {
    // Remove existing event listeners by cloning the button
    const newButton = button.cloneNode(true)
    button.parentNode.replaceChild(newButton, button)

    // Add new event listener
    newButton.addEventListener("click", function () {
      const userId = this.dataset.userId
      if (userId) {
        console.log("🖱️ Đã click vào nút follow cho user:", userId)
        toggleFollow(userId, this)
      } else {
        console.error("❌ Không tìm thấy userId trong data-user-id attribute")
      }
    })
  })
}

// Rest of your profile.js code remains unchanged
// ...

// Function to show success message
function showSuccess(message) {
  const successMessage = document.getElementById("success-message")
  const successText = document.getElementById("success-text")

  if (successMessage && successText) {
    successText.textContent = message
    successMessage.classList.add("active")

    // Hide after 3 seconds
    setTimeout(() => {
      successMessage.classList.remove("active")
    }, 3000)
  }
}

// Function to show error message
function showError(message) {
  const errorMessage = document.getElementById("error-message")
  const errorText = document.getElementById("error-text")

  if (errorMessage && errorText) {
    errorText.textContent = message
    errorMessage.classList.add("active")

    // Hide after 3 seconds
    setTimeout(() => {
      errorMessage.classList.remove("active")
    }, 3000)
  }
}

// Load following list - Always load the current user's following list
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

// Dummy functions to satisfy the linter.  These should be defined elsewhere.
function setupUserDropdown() {
  const userProfileMenu = document.getElementById("user-profile-menu")
  const userMenuToggle = document.getElementById("user-menu-toggle")
  const userDropdown = document.getElementById("user-dropdown")
  const themeToggle = document.getElementById("theme-toggle")
  const logoutBtn = document.getElementById("logout-btn")

  if (userMenuToggle && userDropdown) {
    // Bấm vào icon mở/đóng dropdown
    userMenuToggle.addEventListener("click", (e) => {
      e.stopPropagation()
      userDropdown.classList.toggle("active")
    })

    // Click ra ngoài sẽ tự động đóng dropdown
    document.addEventListener("click", (e) => {
      if (!userProfileMenu.contains(e.target)) {
        userDropdown.classList.remove("active")
      }
    })
  }

  // Đổi theme light / dark
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-theme")
      const currentTheme = document.body.classList.contains("dark-theme") ? "dark" : "light"
      localStorage.setItem("theme", currentTheme)
    })

    // Lấy theme đã lưu và áp dụng lại khi load trang
    const savedTheme = localStorage.getItem("theme")
    if (savedTheme === "dark") {
      document.body.classList.add("dark-theme")
    }
  }

  // Xử lý logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("auth_token")
      localStorage.removeItem("current_user")
      window.location.href = "/"
    })
  }
}

function setupThemeToggle() {
  const themeToggle = document.getElementById("theme-toggle")
  if (!themeToggle) return

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme")
    localStorage.setItem("theme", document.body.classList.contains("dark-theme") ? "dark" : "light")
  })

  const savedTheme = localStorage.getItem("theme")
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme")
  }
}

function setupMessageClosing() {
  const closeButtons = document.querySelectorAll(".close-message")

  closeButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const message = this.parentNode
      message.classList.remove("active")
    })
  })
}

function setupProfileTabs() {
  const tabButtons = document.querySelectorAll(".profile-tab-btn")
  const tabContents = document.querySelectorAll(".profile-tab-content")

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.dataset.tab

      // Remove active class from all buttons and contents
      tabButtons.forEach((btn) => btn.classList.remove("active"))
      tabContents.forEach((content) => content.classList.remove("active"))

      // Add active class to clicked button and corresponding content
      button.classList.add("active")
      document.getElementById(tabId).classList.add("active")

      // Load content based on tab
      const userId = getUserIdFromUrl()
      if (userId) {
        if (tabId === "posts-tab") {
          loadUserPosts(userId)
        } else if (tabId === "media-tab") {
          loadUserMedia(userId)
        } else if (tabId === "likes-tab") {
          loadUserLikes(userId)
        }
      }
    })
  })
}

async function loadUserPosts(userId) {
  try {
    const token = localStorage.getItem("auth_token")
    const postsContainer = document.getElementById("user-posts")

    if (!postsContainer) return

    // Show loading spinner
    postsContainer.innerHTML = `
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <span>Loading posts...</span>
      </div>
    `

    const response = await fetch(`/api/posts/user/id/${userId}`, {
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
    postsContainer.innerHTML = ""

    if (posts.length === 0) {
      postsContainer.innerHTML = `
        <div class="no-posts">
          <p>No posts yet.</p>
        </div>
      `
      return
    }

    // Render posts
    posts.forEach((post) => {
      const postElement = createPostElement(post)
      postsContainer.appendChild(postElement)
    })

    // Setup post interactions
    setupPostInteractions()
  } catch (error) {
    console.error("Error loading posts:", error)
    const postsContainer = document.getElementById("user-posts")

    if (postsContainer) {
      postsContainer.innerHTML = `
        <div class="error-message">
          <p>Failed to load posts. Please try again later.</p>
        </div>
      `
    }
  }
}
// Load user media
async function loadUserMedia(userId) {
  try {
    const token = localStorage.getItem("auth_token")
    const mediaContainer = document.getElementById("user-media")

    if (!mediaContainer) return

    // Show loading spinner
    mediaContainer.innerHTML = `
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <span>Loading media...</span>
      </div>
    `

    const response = await fetch(`/api/posts/user/id/${userId}`, {
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

    // Filter posts with images
    const mediaPosts = posts.filter((post) => post.image)

    // Clear loading spinner
    mediaContainer.innerHTML = ""

    if (mediaPosts.length === 0) {
      mediaContainer.innerHTML = `
        <div class="no-media">
          <p>No media posts yet.</p>
        </div>
      `
      return
    }

    // Render media grid
    mediaPosts.forEach((post) => {
      const mediaElement = document.createElement("div")
      mediaElement.className = "media-item"
      mediaElement.dataset.postId = post._id

      mediaElement.innerHTML = `
        <img src="${post.image}" alt="Media post">
      `

      // Add click event to open post
      mediaElement.addEventListener("click", () => {
        // You can implement a function to show the post in a modal
        showPostModal(post)
      })

      mediaContainer.appendChild(mediaElement)
    })
  } catch (error) {
    console.error("Error loading media:", error)
    const mediaContainer = document.getElementById("user-media")

    if (mediaContainer) {
      mediaContainer.innerHTML = `
        <div class="error-message">
          <p>Failed to load media. Please try again later.</p>
        </div>
      `
    }
  }
}

// Load user likes
async function loadUserLikes(userId) {
  try {
    const token = localStorage.getItem("auth_token")
    const likesContainer = document.getElementById("user-likes")

    if (!likesContainer) return

    // Show loading spinner
    likesContainer.innerHTML = `
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <span>Loading likes...</span>
      </div>
    `

    const response = await fetch(`/api/posts/liked/id/${userId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch liked posts")
    }

    const likedPosts = await response.json()

    // Clear loading spinner
    likesContainer.innerHTML = ""

    if (likedPosts.length === 0) {
      likesContainer.innerHTML = `
        <div class="no-likes">
          <p>No liked posts yet.</p>
        </div>
      `
      return
    }

    // Render liked posts
    likedPosts.forEach((post) => {
      const postElement = createPostElement(post)
      likesContainer.appendChild(postElement)
    })

    // Setup post interactions
    setupPostInteractions()
  } catch (error) {
    console.error("Error loading likes:", error)
    const likesContainer = document.getElementById("user-likes")

    if (likesContainer) {
      likesContainer.innerHTML = `
        <div class="error-message">
          <p>Failed to load likes. Please try again later.</p>
        </div>
      `
    }
  }
}
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
      const element = document.createElement("div")
      element.className = "suggested-user"
      element.innerHTML = `
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
      container.appendChild(element)
    })

    // 🔥 Gắn lại event cho nút follow!
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

function setupShareProfileButton() {
  const shareProfileBtn = document.getElementById("share-profile-btn")
  if (!shareProfileBtn) return

  shareProfileBtn.addEventListener("click", () => {
    const profileUser = JSON.parse(localStorage.getItem("profile_user"))
    if (profileUser) {
      openShareModal(profileUser.username, profileUser._id)
    }
  })
}

// Cập nhật hàm openEditProfileModal để gọi API cập nhật avatar trong comments sau khi cập nhật profile

// Enhanced openEditProfileModal function with improved cover image handling
function openEditProfileModal() {
  // Get current user data
  const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}");
  const timestamp = new Date().getTime();

  // Create modal HTML
  const modal = document.createElement("div");
  modal.id = "edit-profile-modal";
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Edit Profile</h2>
        <button class="close-modal"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <form id="edit-profile-form">
          <div class="form-group cover-upload-section">
            <label>Cover Photo</label>
            <div class="cover-preview">
              <img id="cover-preview" src="${
                currentUser.cover || "/static/uploads/default-cover.jpg"
              }?t=${timestamp}" alt="Cover Preview">
            </div>
            <div class="cover-actions">
              <label for="edit-cover" class="btn secondary">
                <i class="fas fa-upload"></i> Upload New Cover
              </label>
              <input type="file" id="edit-cover" accept="image/*" style="display: none;">
              <button type="button" id="remove-cover-btn" class="btn secondary">
                <i class="fas fa-trash"></i> Remove Cover
              </button>
            </div>
          </div>
          <div class="form-group avatar-upload-section">
            <label>Profile Picture</label>
            <div class="avatar-preview">
              <img id="avatar-preview" src="${
                currentUser.avatar || "/static/uploads/default-avatar-1.jpg"
              }?t=${timestamp}" alt="Avatar Preview">
            </div>
            <div class="avatar-actions">
              <label for="edit-avatar" class="btn secondary">
                <i class="fas fa-upload"></i> Upload New Picture
              </label>
              <input type="file" id="edit-avatar" accept="image/*" style="display: none;">
              <button type="button" id="remove-avatar-btn" class="btn secondary">
                <i class="fas fa-trash"></i> Remove Picture
              </button>
            </div>
          </div>
          <div class="form-group">
            <label for="edit-fullname">Name</label>
            <input type="text" id="edit-fullname" value="${currentUser.fullname || ""}" maxlength="50">
          </div>
          <div class="form-group">
            <label for="edit-bio">Bio</label>
            <textarea id="edit-bio" maxlength="160">${currentUser.bio || ""}</textarea>
          </div>
          <div class="form-group">
            <label for="edit-location">Location</label>
            <input type="text" id="edit-location" value="${currentUser.location || ""}" maxlength="30">
          </div>
          <div class="form-group">
            <label for="edit-website">Website</label>
            <input type="url" id="edit-website" value="${currentUser.website || ""}" maxlength="100">
          </div>
          <div class="form-actions">
            <button type="button" class="btn secondary cancel-btn">Cancel</button>
            <button type="button" class="btn primary save-profile-btn" disabled>Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Append modal to body
  document.body.appendChild(modal);

  // Show modal
  setTimeout(() => modal.classList.add("active"), 10);

  // Get modal elements
  const closeBtn = modal.querySelector(".close-modal");
  const cancelBtn = modal.querySelector(".cancel-btn");
  const saveBtn = modal.querySelector(".save-profile-btn");
  const form = modal.querySelector("#edit-profile-form");
  const coverInput = modal.querySelector("#edit-cover");
  const coverPreview = modal.querySelector("#cover-preview");
  const removeCoverBtn = modal.querySelector("#remove-cover-btn");
  const avatarInput = modal.querySelector("#edit-avatar");
  const avatarPreview = modal.querySelector("#avatar-preview");
  const removeAvatarBtn = modal.querySelector("#remove-avatar-btn");

  // Enable save button on input changes
  const inputs = form.querySelectorAll("input, textarea");
  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      saveBtn.disabled = false;
    });
  });

  // Setup cover preview
  if (coverInput && coverPreview) {
    coverInput.addEventListener("change", function () {
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          coverPreview.src = e.target.result;
          saveBtn.disabled = false;
        };
        reader.readAsDataURL(this.files[0]);
      }
    });
  }

  // Setup remove cover button
  if (removeCoverBtn && coverPreview) {
    removeCoverBtn.addEventListener("click", async () => {
      if (confirm("Are you sure you want to remove your cover photo?")) {
        try {
          const token = localStorage.getItem("auth_token");
          coverPreview.src = "/static/uploads/default-cover.jpg";
          const response = await fetch("/api/settings/profile", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ cover: "/static/uploads/default-cover.jpg" }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to remove cover photo");
          }

          showSuccess("Cover photo removed successfully!");
          const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}");
          currentUser.cover = "/static/uploads/default-cover.jpg";
          currentUser.coverImage = "/static/uploads/default-cover.jpg";
          localStorage.setItem("current_user", JSON.stringify(currentUser));
          saveBtn.disabled = false;
        } catch (error) {
          console.error("Error removing cover photo:", error);
          showError(error.message || "Failed to remove cover photo. Please try again.");
        }
      }
    });
  }

  // Setup avatar preview
  if (avatarInput && avatarPreview) {
    avatarInput.addEventListener("change", function () {
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          avatarPreview.src = e.target.result;
          saveBtn.disabled = false;
        };
        reader.readAsDataURL(this.files[0]);
      }
    });
  }

  // Setup remove avatar button
  if (removeAvatarBtn && avatarPreview) {
    removeAvatarBtn.addEventListener("click", async () => {
      if (confirm("Are you sure you want to remove your profile picture?")) {
        try {
          const token = localStorage.getItem("auth_token");
          avatarPreview.src = "/static/uploads/default-avatar-1.jpg";
          const response = await fetch("/api/settings/profile", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ avatar: "/static/uploads/default-avatar-1.jpg" }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to remove profile picture");
          }

          showSuccess("Profile picture removed successfully!");
          const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}");
          currentUser.avatar = "/static/uploads/default-avatar-1.jpg";
          localStorage.setItem("current_user", JSON.stringify(currentUser));
          saveBtn.disabled = false;
          updateProfileUI(currentUser);
        } catch (error) {
          console.error("Error removing profile picture:", error);
          showError(error.message || "Failed to remove profile picture. Please try again.");
        }
      }
    });
  }

  // Close modal
  const closeModal = () => {
    modal.classList.remove("active");
    setTimeout(() => modal.remove(), 300);
  };

  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  // Handle save changes
  saveBtn.addEventListener("click", saveProfileChanges);

  // Close modal on click outside
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
}

// Function to save profile changes
// Enhanced saveProfileChanges function with improved cover image handling
async function saveProfileChanges() {
  try {
    const token = localStorage.getItem("auth_token");
    const saveBtn = document.querySelector(".save-profile-btn");

    // Disable save button and show loading state
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    // Get form values
    const fullname = document.getElementById("edit-fullname").value.trim();
    const bio = document.getElementById("edit-bio").value.trim();
    const location = document.getElementById("edit-location").value.trim();
    const website = document.getElementById("edit-website").value.trim();

    // Get avatar and cover inputs
    const avatarInput = document.getElementById("edit-avatar");
    const coverInput = document.getElementById("edit-cover");
    const coverPreview = document.getElementById("cover-preview");

    // Create form data for profile update
    const formData = new FormData();
    formData.append("fullname", fullname);
    formData.append("bio", bio);
    formData.append("location", location);
    formData.append("website", website);

    // Handle avatar
    if (avatarInput.files && avatarInput.files[0]) {
      formData.append("avatar", avatarInput.files[0]);
      console.log("Appending avatar file:", avatarInput.files[0].name);
    }

    // Handle cover image upload separately using /api/settings/cover
    let coverUrl = null;
    if (coverInput.files && coverInput.files[0]) {
      const coverFormData = new FormData();
      coverFormData.append("cover", coverInput.files[0]);

      console.log("Uploading cover file:", coverInput.files[0].name);

      const coverResponse = await fetch("/api/settings/cover", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: coverFormData,
      });

      if (!coverResponse.ok) {
        const errorData = await coverResponse.json();
        throw new Error(errorData.error || "Failed to upload cover image");
      }

      const coverResult = await coverResponse.json();
      coverUrl = coverResult.cover;
      console.log("Cover uploaded successfully:", coverUrl);

      // Update cover preview
      const timestamp = new Date().getTime();
      coverPreview.src = `${coverUrl}?t=${timestamp}`;
    }

    // Send profile update request
    const response = await fetch("/api/profile/update", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update profile");
    }

    const updatedUser = await response.json();
    console.log("Profile updated:", updatedUser);

    // Ensure cover field consistency
    if (coverUrl) {
      updatedUser.cover = coverUrl;
      updatedUser.coverImage = coverUrl; // For backward compatibility
    } else {
      updatedUser.cover = updatedUser.cover || updatedUser.coverImage || "/static/uploads/default-cover.jpg";
      updatedUser.coverImage = updatedUser.cover;
    }

    // Update user data in localStorage
    localStorage.setItem("current_user", JSON.stringify(updatedUser));

    // Update profile UI
    updateProfileUI(updatedUser);

    // Update avatar in comments and posts if changed
    if (avatarInput.files && avatarInput.files[0]) {
      await updateUserAvatarInContent();
    }

    // Close modal
    const modal = document.getElementById("edit-profile-modal");
    if (modal) {
      modal.classList.remove("active");
      setTimeout(() => modal.remove(), 300);
    }

    // Show success message
    showSuccess("Profile updated successfully!");

    // Reload page to reflect changes
    setTimeout(() => window.location.reload(), 1000);
  } catch (error) {
    console.error("Error updating profile:", error);
    showError(error.message || "Failed to update profile. Please try again.");

    // Re-enable save button
    const saveBtn = document.querySelector(".save-profile-btn");
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
    }
  }
}
// Function to update user avatar in all comments and posts
async function updateUserAvatarInContent() {
  try {
    const token = localStorage.getItem("auth_token")

    // Update avatar in comments
    const updateCommentsResponse = await fetch("/api/posts/update-user-comments-avatar", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!updateCommentsResponse.ok) {
      console.warn("Failed to update avatar in comments")
    }

    // Update avatar in posts
    const updatePostsResponse = await fetch("/api/posts/update-user-posts-avatar", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!updatePostsResponse.ok) {
      console.warn("Failed to update avatar in posts")
    }

    return true
  } catch (error) {
    console.error("Error updating avatar in content:", error)
    return false
  }
}

function openShareModal(username, userId) {
  // Create modal
  const modal = document.createElement("div")
  modal.className = "modal share-modal"
  modal.id = "share-profile-modal"

  const profileUrl = `${window.location.origin}/profile/${userId}`

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Share Profile</h2>
        <button class="close-modal"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <p>Share ${username}'s profile on ConnectHub</p>
        
        <div class="share-link">
          <input type="text" value="${profileUrl}" readonly id="share-link-input">
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
      const shareText = `Check out ${username}'s profile on ConnectHub`

      switch (platform) {
        case "facebook":
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`, "_blank")
          break
        case "twitter":
          window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(profileUrl)}`,
            "_blank",
          )
          break
        case "whatsapp":
          window.open(
            `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + profileUrl)}`,
            "_blank",
          )
          break
        case "email":
          window.open(
            `mailto:?subject=${encodeURIComponent("Check out this profile on ConnectHub")}&body=${encodeURIComponent(shareText + "\n\n" + profileUrl)}`,
            "_blank",
          )
          break
        case "linkedin":
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`, "_blank")
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

function setupExternalAvatarUpload() {
  const avatarInput = document.getElementById("edit-avatar")
  if (!avatarInput) return

  avatarInput.addEventListener("change", async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append("avatar", file)

    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch("/api/profile/update-avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload avatar")
      }

      const result = await response.json()
      const avatarUrl = result.avatar

      // Update avatar in UI
      const avatarPreview = document.getElementById("avatar-preview")
      if (avatarPreview) {
        avatarPreview.src = avatarUrl
      }

      // Update current user data in localStorage
      const currentUser = JSON.parse(localStorage.getItem("current_user"))
      currentUser.avatar = avatarUrl
      localStorage.setItem("current_user", JSON.stringify(currentUser))

      showSuccess("Avatar updated successfully!")
    } catch (error) {
      console.error("Error uploading avatar:", error)
      showError("Failed to upload avatar. Please try again.")
    }
  })
}

function showPostModal(post) {
  // Create modal
  const modal = document.createElement("div")
  modal.className = "modal post-modal"
  modal.id = "post-modal"

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Post</h2>
        <button class="close-modal"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="post">
          <div class="post-header">
            <div class="user-avatar">
              <img src="${post.author.avatar || "/static/uploads/default-avatar-1.jpg"}" alt="${post.author.fullname || post.author.username}">
            </div>
            <div class="post-author-info">
              <span class="post-author">${post.author.fullname || post.author.username}</span>
              <span class="post-username">@${post.author.username}</span>
            </div>
          </div>
          <div class="post-content">
            <p class="post-text">${post.content}</p>
            ${post.image ? `<img src="${post.image}" alt="Post image">` : ""}
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

  function closeModal() {
    modal.classList.remove("active")
    setTimeout(() => {
      modal.remove()
    }, 300)
  }
}
// Load replies for a comment
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
    const postElement = document.querySelector(`.post[data-post-id="${postId}"]`)
    if (postElement) {
      const commentCountElement = postElement.querySelector(".comment-count")
      if (commentCountElement) {
        commentCountElement.textContent = Number.parseInt(commentCountElement.textContent) + 1
      }
    }
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

// Helper function to get post ID from a comment
function getPostIdFromComment(commentId) {
  const commentElement = document.querySelector(`.comment[data-comment-id="${commentId}"]`)
  if (!commentElement) return null

  // Find the closest post element
  const postElement = commentElement.closest(".post")
  return postElement ? postElement.dataset.postId : null
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
      countElement.textContent = Math.max(0, count - 1)
    } else {
      // Like
      icon.classList.remove("far")
      icon.classList.add("fas")
      countElement.textContent = count + 1
    }

    // Send request to server
    const response = await fetch(`/api/comments/replies/${replyId}/like`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to toggle reply like")
    }

    // No need to update UI here, optimistic UI update is enough
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
// Update comment count after adding a reply
function updateCommentCountAfterReply(commentId) {
  console.log(`Updating comment count for comment: ${commentId}`)

  // First try to find the post ID from the comment
  const commentElement = document.querySelector(`.comment[data-comment-id="${commentId}"]`)
  if (!commentElement) {
    console.error(`Comment element not found for ID: ${commentId}`)
    return
  }

  // Find the post that contains this comment
  let postId = null

  // If we're in a comment modal
  const commentOverlay = document.getElementById("comment-overlay")
  if (commentOverlay) {
    // Try to find the active post
    const activePost = document.querySelector(".post.active-comment")
    if (activePost) {
      postId = activePost.dataset.postId
    }
  }

  // If we couldn't find the post ID from the modal, try to find it from the DOM
  if (!postId) {
    // Walk up the DOM to find the post
    let parent = commentElement.parentElement
    while (parent) {
      if (parent.classList.contains("post") && parent.dataset.postId) {
        postId = parent.dataset.postId
        break
      }
      parent = parent.parentElement
    }
  }

  if (!postId) {
    console.error("Could not find post ID for comment")
    return
  }

  console.log(`Found post ID: ${postId} for comment: ${commentId}`)

  // Update all instances of this post on the page
  const postElements = document.querySelectorAll(`.post[data-post-id="${postId}"]`)
  postElements.forEach((postElement) => {
    const commentCountElement = postElement.querySelector(".comment-count")
    if (commentCountElement) {
      const currentCount = Number.parseInt(commentCountElement.textContent) || 0
      commentCountElement.textContent = currentCount + 1
      console.log(`Updated comment count to ${currentCount + 1}`)
    }
  })
}
// Function to add a change cover button to the profile page
function addChangeCoverButton() {
  const currentUser = JSON.parse(localStorage.getItem("current_user"));
  const profileUser = JSON.parse(localStorage.getItem("profile_user"));
  
  // Only add the button if viewing own profile
  if (!currentUser || !profileUser || currentUser._id !== profileUser._id) {
    return;
  }
  
  const profileCover = document.getElementById("profile-cover");
  if (!profileCover) return;
  
  // Check if button already exists
  if (document.getElementById("change-cover-btn")) return;
  
  // Create button
  const changeCoverBtn = document.createElement("button");
  changeCoverBtn.id = "change-cover-btn";
  changeCoverBtn.className = "change-cover-btn";
  changeCoverBtn.innerHTML = '<i class="fas fa-camera"></i> Change Cover';
  
  // Add button to profile cover
  profileCover.appendChild(changeCoverBtn);
  
  // Add event listener
  changeCoverBtn.addEventListener("click", openCoverUploadModal);
}

// Function to open a simple cover upload modal
function openCoverUploadModal() {
  // Create modal
  const modal = document.createElement("div");
  modal.className = "modal cover-upload-modal";
  modal.id = "cover-upload-modal";
  
  // Add timestamp to prevent caching
  const timestamp = new Date().getTime();
  const currentUser = JSON.parse(localStorage.getItem("current_user"));
  const coverImage = currentUser.cover || currentUser.coverImage || "/static/uploads/default-cover.jpg";
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Change Cover Photo</h2>
        <button class="close-modal"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="cover-preview">
          <img src="${coverImage}?t=${timestamp}" alt="Cover Preview" id="cover-upload-preview">
        </div>
        <div class="cover-upload-options">
          <input type="file" id="cover-upload-input" accept="image/*" style="display: none;">
          <button id="select-cover-btn" class="btn btn-primary">Select Image</button>
          <button id="remove-cover-btn" class="btn btn-danger">Remove Cover</button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="cancel-btn">Cancel</button>
        <button class="save-cover-btn" disabled>Save Changes</button>
      </div>
    </div>
  `;
  
  // Add modal to body
  document.body.appendChild(modal);
  
  // Show modal
  setTimeout(() => {
    modal.classList.add("active");
  }, 10);
  
  // Setup close modal
  const closeBtn = modal.querySelector(".close-modal");
  closeBtn.addEventListener("click", closeModal);
  
  // Setup cancel button
  const cancelBtn = modal.querySelector(".cancel-btn");
  cancelBtn.addEventListener("click", closeModal);
  
  // Setup select image button
  const selectBtn = document.getElementById("select-cover-btn");
  const fileInput = document.getElementById("cover-upload-input");
  
  selectBtn.addEventListener("click", () => {
    fileInput.click();
  });
  
  // Setup file input change
  fileInput.addEventListener("change", function() {
    if (this.files && this.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        document.getElementById("cover-upload-preview").src = e.target.result;
        document.querySelector(".save-cover-btn").disabled = false;
      };
      reader.readAsDataURL(this.files[0]);
    }
  });
  
  // Setup remove cover button
  const removeBtn = document.getElementById("remove-cover-btn");
  removeBtn.addEventListener("click", () => {
    document.getElementById("cover-upload-preview").src = "/static/uploads/default-cover.jpg";
    document.querySelector(".save-cover-btn").disabled = false;
  });
  
  // Setup save button
  const saveBtn = document.querySelector(".save-cover-btn");
  saveBtn.addEventListener("click", async () => {
    try {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
      
      const token = localStorage.getItem("auth_token");
      const preview = document.getElementById("cover-upload-preview");
      const formData = new FormData();
      
      // Check if cover was removed
      if (preview.src.includes("default-cover.jpg")) {
        // Send request to remove cover
        const response = await fetch("/api/settings/profile", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cover: "/static/uploads/default-cover.jpg" }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to remove cover");
        }
        
        // Update user data
        const currentUser = JSON.parse(localStorage.getItem("current_user"));
        currentUser.cover = "/static/uploads/default-cover.jpg";
        currentUser.coverImage = "/static/uploads/default-cover.jpg";
        localStorage.setItem("current_user", JSON.stringify(currentUser));
      } 
      // Check if new file was selected
      else if (fileInput.files && fileInput.files[0]) {
        formData.append("cover", fileInput.files[0]);
        
        // Upload cover
        const response = await fetch("/api/settings/cover", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error("Failed to upload cover");
        }
        
        const result = await response.json();
        
        // Update user data
        const currentUser = JSON.parse(localStorage.getItem("current_user"));
        currentUser.cover = result.cover;
        currentUser.coverImage = result.cover;
        localStorage.setItem("current_user", JSON.stringify(currentUser));
      }
      
      // Show success message
      showSuccess("Cover photo updated successfully!");
      
      // Close modal
      closeModal();
      
      // Reload page to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Error updating cover:", error);
      showError(error.message || "Failed to update cover. Please try again.");
      
      // Re-enable save button
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
    }
  });
  
  function closeModal() {
    modal.classList.remove("active");
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

function setupExternalCoverUpload() {
  const coverInput = document.getElementById("external-cover-input");
  const coverImage = document.getElementById("cover-img");

  if (!coverInput || !coverImage) return;

  coverInput.addEventListener("change", async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Hiển thị ảnh tạm thời
      const reader = new FileReader();
      reader.onload = (e) => {
        coverImage.src = e.target.result;
      };
      reader.readAsDataURL(file);

      // Upload ảnh lên server
      const formData = new FormData();
      formData.append("image", file);

      const token = localStorage.getItem("auth_token");
      try {
        const response = await fetch("/api/upload/cover", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) throw new Error("Failed to upload cover");

        const result = await response.json();

        // Cập nhật lại trong localStorage
        const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}");
        currentUser.cover = result.imageUrl;
        localStorage.setItem("current_user", JSON.stringify(currentUser));

        showSuccess("Cover updated successfully!");
      } catch (error) {
        console.error("Error uploading cover:", error);
        showError("Failed to update cover. Please try again.");
      }
    }
  });
}
