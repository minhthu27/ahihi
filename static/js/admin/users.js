document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("auth_token");
    if (!token || token.trim() === "" || token === "null" || token === "undefined") {
        alert("Please log in to continue.");
        window.location.href = "/";
        return;
    }

    checkAdminAccess(token);

    // Gắn sự kiện thay đổi cho dropdown để tự động làm mới
    document.getElementById("sortBy").addEventListener("change", fetchUsers);
    document.getElementById("sortOrder").addEventListener("change", fetchUsers);
});

function checkAdminAccess(token) {
    fetch("/api/user/me", {
        headers: { Authorization: `Bearer ${token}` },
    })
    .then((res) => {
        if (!res.ok) {
            if (res.status === 401) {
                alert("Your session is invalid. Please log in again.");
                window.location.href = "/";
                return;
            }
            if (res.status === 403) {
                alert("You do not have admin permission.");
                window.location.href = "/admin/dashboard";
                return;
            }
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then((user) => {
        if (!user || user.role !== "admin") {
            alert("You do not have admin permission.");
            window.location.href = "/admin/dashboard";
            return;
        }
        fetchUsers();
    })
    .catch((err) => {
        console.error("Error verifying admin:", err);
        alert("An error occurred while checking access.");
        window.location.href = "/admin/dashboard";
    });
}

function fetchUsers() {
    const token = localStorage.getItem("auth_token");
    if (!token || token.trim() === "" || token === "null" || token === "undefined") {
        alert("Please log in to continue.");
        window.location.href = "/";
        return;
    }

    const loading = document.getElementById("loading");
    const errorMessage = document.getElementById("errorMessage");
    const userTableBody = document.getElementById("userTableBody");

    loading.style.display = "block";
    errorMessage.style.display = "none";
    userTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading data...</td></tr>';

    const search = document.getElementById("searchInput").value;
    const sortBy = document.getElementById("sortBy").value;
    const sortOrder = document.getElementById("sortOrder").value;

    console.log("Fetching users with params:", { search, sortBy, sortOrder });

    const query = new URLSearchParams({
        search: search,
        sort_by: sortBy,
        sort_order: sortOrder
    }).toString();

    fetch(`/api/admin/users?${query}`, {
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
                window.location.href = "/admin/dashboard";
                return;
            }
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then((users) => {
        console.log("Received users:", users);
        loading.style.display = "none";
        renderUsers(users);
    })
    .catch((err) => {
        console.error("Unable to load users:", err);
        loading.style.display = "none";
        errorMessage.style.display = "block";
    });
}

function renderUsers(users) {
    const userTableBody = document.getElementById("userTableBody");
    userTableBody.innerHTML = "";

    if (users.length === 0) {
        userTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No users found.</td></tr>';
        return;
    }

    users.forEach((user) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${user.username || 'N/A'}</td>
            <td>${user.email || 'N/A'}</td>
            <td>${user.report_count || 0}</td>
            <td>
                <button class="btn btn-sm btn-primary action-btn" onclick="openUpdateUserModal('${user._id}', '${user.username}', '${user.email}')">Update</button>
                <button class="btn btn-sm btn-danger action-btn" onclick="deleteUser('${user._id}')">Delete</button>
            </td>
        `;
        userTableBody.appendChild(tr);
    });
}

function openUpdateUserModal(userId, username, email) {
    document.getElementById("updateUserId").value = userId;
    document.getElementById("updateUsername").value = username || '';
    document.getElementById("updateEmail").value = email || '';
    
    const modal = new bootstrap.Modal(document.getElementById("updateUserModal"));
    modal.show();
}

function submitUpdateUser() {
    const token = localStorage.getItem("auth_token");
    const userId = document.getElementById("updateUserId").value;
    const username = document.getElementById("updateUsername").value;
    const email = document.getElementById("updateEmail").value;

    if (!username || !email) {
        alert("Please fill in all fields.");
        return;
    }

    fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email })
    })
    .then((res) => res.json())
    .then((data) => {
        if (data.error) {
            alert(data.error);
        } else {
            alert(data.message);
            const modal = bootstrap.Modal.getInstance(document.getElementById("updateUserModal"));
            modal.hide();
            fetchUsers();
        }
    })
    .catch((err) => {
        console.error("Error updating user:", err);
        alert("An error occurred while updating user.");
    });
}

function deleteUser(userId) {
    const token = localStorage.getItem("auth_token");
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

    fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    })
    .then((res) => res.json())
    .then((data) => {
        if (data.error) {
            alert(data.error);
        } else {
            alert(data.message);
            fetchUsers();
        }
    })
    .catch((err) => {
        console.error("Error deleting user:", err);
        alert("An error occurred while deleting user.");
    });
}

// Gắn sự kiện cho các bộ lọc và tìm kiếm
document.getElementById("applyFilters").addEventListener("click", fetchUsers);
document.getElementById("searchInput").addEventListener("input", fetchUsers);