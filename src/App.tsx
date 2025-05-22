// my-leave-app/src/App.tsx

import React from "react";
// Import BrowserRouter and alias it as Router for clarity
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Assuming AuthProvider is correctly implemented and exported from AuthContext.jsx
import { AuthProvider } from "./context/Authcontext";

// Assuming ProtectedRoute component is implemented and exported
import ProtectedRoute from "./components/ProtectedRoute";

// Import your page components
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ApplyLeave from "./pages/ApplyLeave";
import LeaveApprovals from "./pages/LeaveApprovals";
import AdminLeaveTypesPage from "./pages/AdminLeaveTypesPage";
import AdminUsersPage from "./pages/AdminUsersPage"; // Make sure this component exists
import LeaveCalendar from './pages/LeaveCalendar';

function App() {
  return (
    // --- The single top-level Router for the application ---
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={<ProtectedRoute element={<Dashboard />} />}
          />
          <Route
            path="/apply-leave"
            element={<ProtectedRoute element={<ApplyLeave />} />}
          />
          <Route
            path="/approvals"
            element={<ProtectedRoute element={<LeaveApprovals />} />}
          />
          {/* Admin Routes - Protected by ProtectedRoute, Admin role check is often done inside the page component itself */}
          <Route
            path="/admin/leave-types"
            element={<ProtectedRoute element={<AdminLeaveTypesPage />} />}
          />
          <Route
            path="/admin/users"
            element={<ProtectedRoute element={<AdminUsersPage />} />}
          />
          <Route
            path="/calendar"
            element={<ProtectedRoute element={<LeaveCalendar />} />}
          />
          {/* Redirect for the root path - redirects to dashboard if authenticated, or ProtectedRoute handles redirect to login */}
          <Route
            path="/"
            element={<ProtectedRoute element={<Dashboard />} />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
