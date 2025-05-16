// src/api/api.js
// This file contains a helper function for making API calls with JWT authentication

// Define your backend base URL
const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000'; // Adjust if your backend URL or base path changes

// Helper function to get the token from localStorage
const getToken = () => {
  return localStorage.getItem('token');
};

// Helper function to handle logout (we'll use the AuthContext logout later)
// For now, a simple localStorage clear and redirect placeholder
const handleLogout = () => {
  console.log('API helper detected authentication issue, logging out...');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // TODO: Redirect to login page - cannot use useNavigate here directly
  // You would typically dispatch a logout action or use window.location
  window.location.href = '/login'; // Simple redirect for now
};


/**
 * Generic API call function with JWT authentication.
 * @param {string} endpoint - The API endpoint (e.g., '/auth/protected-test').
 * @param {string} method - The HTTP method (e.g., 'GET', 'POST', 'PUT', 'DELETE').
 * @param {object} [data=null] - The request body data (for POST, PUT, etc.).
 * @param {boolean} [requiresAuth=true] - Whether the endpoint requires authentication.
 * @returns {Promise<object>} - A promise that resolves with the JSON response data.
 * @throws {Error} - Throws an error if the request fails or returns a non-OK status.
 */
const api = async (endpoint, method, data = null, requiresAuth = true) => {
  const url = `${API_BASE_URL}${endpoint}`; // Construct the full URL

  const headers = {
    'Content-Type': 'application/json',
    // Add other default headers if needed
  };

  // Add Authorization header if the endpoint requires authentication
  if (requiresAuth) {
    const token = getToken();
    if (!token) {
      // If authentication is required but no token is found, throw an error
      // or handle logout immediately
      console.error('Authentication required but no token found.');
      handleLogout(); // Redirect to login
      throw new Error('Authentication required.'); // Stop execution
    }
    headers['Authorization'] = `Bearer ${token}`; // Add the JWT to the header
  }

  // Configure the fetch options
  const options = {
    method,
    headers,
    // Include body only for methods that typically have one
    body: data ? JSON.stringify(data) : null,
  };

  // Remove body for GET and HEAD requests as they should not have one
  if (method === 'GET' || method === 'HEAD') {
      delete options.body;
  }


  try {
    const response = await fetch(url, options);

    // Handle specific authentication errors (401 Unauthorized, 403 Forbidden)
    if (response.status === 401 || response.status === 403) {
        console.error(`Authentication error: ${response.status}`);
        handleLogout(); // Log out user on auth failure
        // Throw an error to be caught by the caller
        throw new Error('Authentication failed. Please log in again.');
    }

    // Check if the response status is not in the 200-299 range
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText })); // Try to parse error message
      console.error(`API Error: ${response.status} - ${errorData.message}`);
      // Throw an error with details
      throw new Error(errorData.message || `API request failed with status ${response.status}`);
    }

    // Parse and return the JSON response
    // Handle cases where the response might be empty (e.g., 204 No Content)
    const text = await response.text();
    return text ? JSON.parse(text) : {}; // Return empty object for empty responses

  } catch (error) {
    console.error('Network or API call error:', error);
    // Re-throw the error so the calling component can handle it
    throw error;
  }
};

// Export the api helper function
export default api;
