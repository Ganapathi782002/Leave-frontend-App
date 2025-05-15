// src/main.jsx

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx"; // Your App component
import { AuthProvider } from "./context/Authcontext.jsx";

// Import global styles if you have them (uncomment if needed)
// import './index.css';

// Get the root element from your HTML
const container = document.getElementById("root");

// Create a root
const root = ReactDOM.createRoot(container);

// Render the root component tree
root.render(
  <React.StrictMode>
    {/* The single Router is now expected to be within App.tsx */}
    {/* Removed: <BrowserRouter> */}
    {/* Wrap the entire application with AuthProvider so context is available */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
