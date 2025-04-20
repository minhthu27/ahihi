document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("auth_token");
    // Check for invalid token values
    if (!token || token.trim() === "" || token === "null" || token === "undefined") {
        alert("Please log in to continue.");
        window.location.href = "/";
        return;
    }

    checkAdminAccess(token);
});

function checkAdminAccess(token) {
    console.log("Checking admin with token:", token);
    fetch("/api/user/me", {
        headers: { Authorization: `Bearer ${token}` },
    })
    .then((res) => {
        console.log("Response status:", res.status);
        if (!res.ok) {
            if (res.status === 401) {
                alert("Your session is invalid. Please log in again.");
                window.location.href = "/";
                return;
            }
            if (res.status === 403) {
                alert("You do not have admin permission.");
                window.location.href = "/dashboard";
                return;
            }
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then((user) => {
        if (!user || user.role !== "admin") {
            alert("You do not have admin permission.");
            window.location.href = "/dashboard";
            return;
        }
        fetchStats();
    })
    .catch((err) => {
        console.error("Error verifying admin:", err);
        alert("An error occurred while checking access.");
        window.location.href = "/dashboard";
    });
}


function fetchStats() {
    const token = localStorage.getItem("auth_token");
    if (!token || token.trim() === "" || token === "null" || token === "undefined") {
        alert("Please log in to continue.");
        window.location.href = "/";
        return;
    }

    const loading = document.getElementById("loading");
    const errorMessage = document.getElementById("errorMessage");
    const statsSection = document.getElementById("statsSection");

    loading.style.display = "block";
    errorMessage.style.display = "none";
    statsSection.style.display = "none";

    fetch("/api/admin/stats", {
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
            loading.style.display = "none";
            statsSection.style.display = "block";
            renderStats(data);
        })
        .catch((err) => {
            console.error("Unable to load statistics:", err);
            loading.style.display = "none";
            errorMessage.style.display = "block";
        });
}

function renderStats(data) {
    // Total Users
    document.getElementById("totalUsers").textContent = data.total_users || 0;

    // Total Posts
    document.getElementById("totalPosts").textContent = data.total_posts || 0;

    // Most Reported Post
    const mostReportedPost = data.most_reported_post;
    if (mostReportedPost && mostReportedPost.content) {
        document.getElementById("mostReportedPost").textContent =
            `${mostReportedPost.content} (${mostReportedPost.report_count} reports)`;
    } else {
        document.getElementById("mostReportedPost").textContent = "N/A";
    }       

    // User Role Breakdown
    const roleTableBody = document.getElementById("roleTableBody");
    roleTableBody.innerHTML = "";
    const roles = data.role_breakdown || { user: 0, admin: 0 };
    const rolesList = [
        { role: "User", count: roles.user || 0 },
        { role: "Admin", count: roles.admin || 0 },
    ];

    rolesList.forEach((role) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${role.role}</td>
            <td>${role.count}</td>
        `;
        roleTableBody.appendChild(tr);
    });
}