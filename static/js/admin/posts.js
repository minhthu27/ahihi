document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("auth_token");
  if (!token) {
      alert("Please log in to continue.");
      window.location.href = "/";
      return;
  }

  checkAdminAccess(token);

  document.getElementById("searchInput").addEventListener("input", () => {
      fetchPosts();
  });
  document.getElementById("sortSelect").addEventListener("change", () => {
      fetchPosts();
  });
});

function checkAdminAccess(token) {
  fetch("/api/user/me", {
      headers: { Authorization: `Bearer ${token}` },
  })
      .then((res) => {
          if (!res.ok) {
              if (res.status === 401) {
                  alert("Invalid login session. Please log in again.");
                  window.location.href = "/";
                  return;
              }
              throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
      })
      .then((user) => {
          if (!user || user.role !== "admin") {
              alert("You do not have access. Only admins are allowed.");
              window.location.href = "/dashboard";
              return;
          }
          fetchPosts();
      })
      .catch((err) => {
          console.error("Unable to check admin access:", err);
          alert("An error occurred while checking access.");
          window.location.href = "/dashboard";
      });
}

function fetchPosts() {
  const token = localStorage.getItem("auth_token");
  if (!token) {
      alert("Please log in to continue.");
      window.location.href = "/";
      return;
  }

  const search = document.getElementById("searchInput").value;
  const [sortBy, sortOrder] = document.getElementById("sortSelect").value.split("|");

  const url = `/api/admin/posts?sort_by=${sortBy}&sort_order=${sortOrder}&search=${encodeURIComponent(search)}`;

  fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
  })
      .then((res) => {
          if (!res.ok) {
              if (res.status === 401) {
                  alert("Invalid login session. Please log in again.");
                  window.location.href = "/";
                  return;
              }
              if (res.status === 403) {
                  alert("You do not have access. Only admins are allowed.");
                  window.location.href = "/dashboard";
                  return;
              }
              throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
      })
      .then((data) => {
          if (Array.isArray(data)) {
              renderPosts(data);
          } else {
              console.error("Data is not an array:", data);
              renderPosts([]);
          }
      })
      .catch((err) => {
          console.error("Unable to load posts:", err);
          renderPosts([]);
      });
}

function renderPosts(posts) {
  const tbody = document.getElementById("postTableBody");
  tbody.innerHTML = "";
  if (posts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No reported posts yet.</td></tr>';
      return;
  }
  posts.forEach((post) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
          <td>${post.content ? post.content.substring(0, 50) + (post.content.length > 50 ? "..." : "") : "No content"}</td>
          <td>${post.author ? post.author.username : "Unknown"}</td>
          <td>${new Date(post.created_at).toLocaleString("en-US")}</td>
          <td>${post.hidden ? "Hidden" : "Public"}</td>
          <td>${post.report_count || 0}</td>
          <td>
              <button class="btn btn-warning btn-sm" onclick="hidePost('${post._id}')">${post.hidden ? "Unhide" : "Hide"}</button>
              <button class="btn btn-danger btn-sm" onclick="deletePost('${post._id}')">Delete</button>
              <button class="btn btn-info btn-sm" onclick="viewPost('${post._id}', \`${post.content ? post.content.replace(/`/g, "\\`") : ""}\`, \`${post.image ? post.image.replace(/`/g, "\\`") : ""}\`)">View</button>
              <button class="btn btn-secondary btn-sm" onclick="viewReports('${post._id}')">Reports</button>
          </td>
      `;
      tbody.appendChild(tr);
  });
}

function hidePost(postId) {
  const token = localStorage.getItem("auth_token");
  if (!token) {
      alert("Please log in to continue.");
      window.location.href = "/";
      return;
  }

  fetch(`/api/admin/posts/${postId}/hide`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
  })
      .then((res) => {
          if (res.status === 401) {
              alert("Invalid login session. Please log in again.");
              window.location.href = "/";
              return;
          }
          if (res.status === 403) {
              alert("You do not have access. Only admins are allowed.");
              window.location.href = "/dashboard";
              return;
          }
          if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
      })
      .then((data) => {
          alert(data.message || "Post status updated successfully.");
          fetchPosts();
      })
      .catch((err) => {
          console.error("Unable to hide/unhide post:", err);
          alert("An error occurred while updating the post status.");
      });
}

function deletePost(postId) {
  if (confirm("Are you sure you want to delete this post?")) {
      const token = localStorage.getItem("auth_token");
      if (!token) {
          alert("Please log in to continue.");
          window.location.href = "/";
          return;
      }

      fetch(`/api/admin/posts/${postId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
      })
          .then((res) => {
              if (res.status === 401) {
                  alert("Invalid login session. Please log in again.");
                  window.location.href = "/";
                  return;
              }
              if (res.status === 403) {
                  alert("You do not have access. Only admins are allowed.");
                  window.location.href = "/dashboard";
                  return;
              }
              if (!res.ok) {
                  throw new Error(`HTTP error! status: ${res.status}`);
              }
              return res.json();
          })
          .then((data) => {
              alert(data.message || "Post deleted successfully.");
              fetchPosts();
          })
          .catch((err) => {
              console.error("Unable to delete post:", err);
              alert("An error occurred while deleting the post.");
          });
  }
}

function viewPost(postId, content, image) {
  document.getElementById("postContent").textContent = content || "No content";

  const postImageDiv = document.getElementById("postImage");
  if (image && image !== "") {
      postImageDiv.innerHTML = `<img src="${image}" alt="Post Image" style="max-width: 100%; height: auto;" />`;
  } else {
      postImageDiv.innerHTML = "";
  }

  const modal = new bootstrap.Modal(document.getElementById("contentModal"));
  modal.show();
}

function viewReports(postId) {
  const token = localStorage.getItem("auth_token");
  if (!token) {
      alert("Please log in to continue.");
      window.location.href = "/";
      return;
  }

  fetch(`/api/admin/posts/${postId}/reports`, {
      headers: { Authorization: `Bearer ${token}` },
  })
      .then((res) => {
          if (res.status === 401) {
              alert("Invalid login session. Please log in again.");
              window.location.href = "/";
              return;
          }
          if (res.status === 403) {
              alert("You do not have access. Only admins are allowed.");
              window.location.href = "/dashboard";
              return;
          }
          if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
      })
      .then((reports) => {
          const reportsContent = document.getElementById("reportsContent");
          if (reports.message) {
              reportsContent.innerHTML = "<p>No reports yet.</p>";
          } else {
              reportsContent.innerHTML = reports
                  .map(
                      (report) => `
                          <p><strong>Reason:</strong> ${report.reason || "No reason provided"}<br>
                          <strong>Created At:</strong> ${new Date(report.created_at).toLocaleString("en-US")}</p>
                      `,
                  )
                  .join("");
          }
          const modal = new bootstrap.Modal(document.getElementById("reportsModal"));
          modal.show();
      })
      .catch((err) => {
          console.error("Unable to load reports:", err);
          alert("An error occurred while loading reports.");
      });
}