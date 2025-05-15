// src/pages/Register.jsx
import React, { useState } from 'react'; // Import useState hook
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate for redirection

function Register() {
  // State variables to hold form input values
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null); // To display registration errors
  const [success, setSuccess] = useState(false); // To show success message

  // Call the useNavigate hook to get the navigate function
  const navigate = useNavigate(); // <-- ADD THIS LINE

  const handleSubmit = async (e) => { // Made function async
    e.preventDefault(); // Prevent default browser form submission

    // Clear previous messages
    setError(null);
    setSuccess(false);

    // Prepare data to send to the backend
    const registrationData = {
      name,
      email,
      password,
      role_id: 2, // TODO: This is hardcoded for 'Employee' role for now.
                   // You'll need logic to assign roles or let admin do it later.
    };

    try {
      // Make the API call to your backend registration endpoint
      const response = await fetch('http://localhost:5000/api/auth/register', { // Replace 5000 if your backend runs on a different port
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData), // Send data as JSON string
      });

      const data = await response.json(); // Parse the JSON response

      if (response.ok) { // Check for success status
        console.log('Registration successful:', data);
        setSuccess(true); // Show success message
        // Optional: Clear form fields on success
        setName('');
        setEmail('');
        setPassword('');
         setTimeout(() => {
           navigate('/login'); // Use the navigate function here
         }, 2000); // Redirect after 2 seconds
      } else {
        // Handle backend errors (e.g., email already exists, validation errors)
        console.error('Registration failed:', data.message);
        setError(data.message || 'Registration failed'); // Display error message
      }

    } catch (err) {
      // Handle network errors or other exceptions
      console.error('Network error during registration:', err);
      setError('Network error. Please try again.');
    }
  };

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        {/* Display messages */}
        {error && <div style={{ color: 'red' }}>{error}</div>}
        {success && <div style={{ color: 'green' }}>Registration successful! You can now <Link to="/login">Login</Link>.</div>}


        <div>
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
         {/* Role selection - currently hardcoded in backend */}
        <button type="submit">Register</button>
      </form>
      <p>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
}

export default Register;
