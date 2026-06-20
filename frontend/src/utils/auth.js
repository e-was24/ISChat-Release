// utils/auth.js
// Simple helper to handle logout.
// Adjust storage key ("token") to match what you used when saving it at login.

export function logout(navigate) {
    // Remove the stored auth token
    localStorage.removeItem("token");

    // Optional: remove any other cached user data
    localStorage.removeItem("user");

    // Redirect to login page
    if (navigate) {
        navigate("/login");
    } else {
        window.location.href = "/login";
    }
}