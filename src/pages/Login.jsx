// my-leave-app/src/pages/Login.jsx
// Login Page component

import React, { useState } from "react";
// Import necessary hooks from react
// Import useAuth hook to access authentication context functions (login)
import { useAuth } from "../hooks/useAuth";
// Import useNavigate hook from react-router-dom for navigation
import { useNavigate } from "react-router-dom";
import './LoginPage.css';

// Assuming your API helper is here and exports a default api function
import api from "../api/api";

function Login() {
  // State for form inputs (email and password)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // State for displaying error messages to the user
  const [error, setError] = useState("");
  // State to indicate if login is in progress (for button disabling)
  const [loginLoading, setLoginLoading] = useState(false); // Get the login function from the authentication context

  const { login } = useAuth(); // Get the navigate function from react-router-dom
  const navigate = useNavigate(); // This hook must be used within a Router context // Handler for form submission when the login button is clicked

  const handleSubmit = async (e) => {
    // Prevent the default browser form submission behavior (which causes page reload)
    // If using TS, add type: (e: React.FormEvent)
    e.preventDefault(); // <-- THIS LINE MUST BE CALLED TO STOP PAGE REFRESH

    console.log("Login handleSubmit entered."); // <-- Log start of handler
    setError(""); // Clear any previous error messages displayed to the user
    setLoginLoading(true); // Set loading state // Basic client-side validation: check if email and password are not empty

    if (!email || !password) {
      setError("Please enter both email and password."); // Set error message
      console.warn("Login handleSubmit: Email or password missing."); // Log warning
      setLoginLoading(false); // Reset loading state
      return; // Stop the function execution
    }

    try {
      console.log("Login handleSubmit: Calling API for login..."); // Log before API call // Call the API helper function to send login credentials to the backend // The api helper should handle constructing the URL and headers // We set requiresAuth to false because the login endpoint itself does not require authentication

      const response = await api(
        "/api/auth/login",
        "POST",
        {
          email,
          password,
        },
        false
      ); // Set requiresAuth to false for the login endpoint

      console.log(
        "Login handleSubmit: API call completed. Response received:",
        response
      ); // Log the received response object // Check if the response from the backend indicates success and contains the expected data (token and user object)

      if (response && response.token && response.user) {
        console.log(
          "Login handleSubmit: Login API call successful. Received token and user data."
        ); // Log success // Call the login function from the authentication context // This updates the shared state and stores the token/user in localStorage

        console.log(
          "Login handleSubmit: Calling AuthContext login function..."
        );
        login(response.token, response.user); // Update auth state // --- Navigate to the dashboard page after successful login ---

        console.log("Login handleSubmit: Navigating to /dashboard...");
        navigate("/dashboard"); // Use the navigate function here
      } else {
        // Handle cases where the API call succeeded (e.g., status 200) but the response structure was unexpected
        console.error(
          "Login handleSubmit: Login failed - API response structure unexpected.",
          response
        );
        setError("Login failed. Please check credentials."); // Display a generic error message for unexpected response
      }
    } catch (err) {
      // This block catches errors thrown by the api helper (e.g., network errors, non-ok HTTP statuses like 401, 403, 404, 500)
      // If using TS, add type: (err: any)
      console.error("Login handleSubmit: Login API call caught an error:", err); // Log the caught error // Attempt to display the error message from the backend response if available, otherwise use a generic message // The api helper should ideally throw errors that include response data for non-ok statuses

      if (err.response && err.response.data && err.response.data.message) {
        // If the error object contains a backend response with a message property
        console.error(
          "Login handleSubmit: Backend error message:",
          err.response.data.message
        );
        setError(err.response.data.message);
      } else if (err.message) {
        // If the error object has a standard message property (e.g., network error)
        console.error("Login handleSubmit: Error message:", err.message);
        setError(err.message);
      } else {
        // Fallback for unexpected error structures
        console.error("Login handleSubmit: An unknown error occurred.");
        setError("An unknown error occurred during login.");
      }
    } finally {
      // This block runs regardless of whether try or catch finished
      setLoginLoading(false); // Reset loading state after attempt
      console.log("Login handleSubmit finished."); // Log end of handler
    }
  };

  return (
    // Main container for the login page
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label htmlFor="email">Email:</label> {/* Label for accessibility */}
          <input
            type="email" // Use email type for basic browser validation and keyboard types on mobile
            id="email" // Link label and input for accessibility
            value={email} // Bind the input value to the 'email' state
            onChange={(e) => setEmail(e.target.value)} // Update 'email' state when input changes
            required // Make the field required for HTML5 validation
            disabled={loginLoading} // Disable input while loading
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password" // Use password type to mask input
            id="password" // Link label and input
            value={password} // Bind the input value to the 'password' state
            onChange={(e) => setPassword(e.target.value)} // Update 'password' state
            required // Make the field required
            disabled={loginLoading} // Disable input while loading
          />
        </div>
        {error && (
          <p className="error-message" style={{ color: "red" }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={loginLoading} className="login-button">
          {loginLoading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div> // End of login-container
  );
}

export default Login;
