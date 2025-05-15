// src/hooks/useAuth.js
// Custom hook to easily access the authentication context

import { useContext } from "react";
// Assuming your AuthContext is exported as default from ./AuthContext.jsx
import AuthContext from "../context/Authcontext";

// Define the custom useAuth hook
export const useAuth = () => {
  // Get the authentication context using the useContext hook
  const context = useContext(AuthContext); // If the context is undefined, it means the useAuth hook was called // outside of an AuthProvider. This is an error in usage.

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  } // Return the context value (user, token, isAuthenticated, loading, login, logout) // Components that use useAuth will get these values and functions.

  console.log("useAuth hook called. Context value:", context); // Log the context value
  return context;
};
