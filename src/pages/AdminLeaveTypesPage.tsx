import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../api/api"; // Assuming your API helper is here
import { Link } from "react-router-dom";
import './AdminLeaveTypesPage.css'
// Define the interface for the LeaveType data expected from the backend
// This should match the structure of your LeaveType entity in the backend
interface LeaveType {
  type_id: number;
  name: string;
  requires_approval: boolean;
  is_balance_based: boolean; // Add any other properties of your LeaveType entity
}

// Define the expected type for the user object from the auth context
interface AuthUser {
  user_id: number;
  name: string;
  email: string;
  role_id: number; // We need role_id for frontend access control // Add any other properties your user object from auth context has
}

// Define role IDs (should match your backend/database role IDs)
const ADMIN_ROLE_ID = 1; // <-- Define Admin Role ID here or import it

// --- Single, Correct AdminLeaveTypesPage Function Component ---
function AdminLeaveTypesPage() {
  // Get user and token from authentication context
  // Explicitly assert the expected type returned by useAuth to help TypeScript
  const { user, token, isAuthenticated, loading, login, logout } =
    useAuth() as {
      user: AuthUser | null; // Assert the type for the user property
      token: string | null; // Assert the type for the token property // Include other properties returned by useAuth that you might use
      isAuthenticated: boolean;
      loading: boolean; // Assuming this is part of your auth state loading
      login: (newToken: string, newUser: any) => void; // Assuming login function exists in context
      logout: () => void; // Assuming logout function exists in context
    }; // State for the list of leave types (using its own loading/error state)

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]); // Note: Using 'loadingLeaveTypes' and 'errorLeaveTypes' here for the leave types fetch specifically,
  // distinct from the auth 'loading' state from useAuth.
  const [loadingLeaveTypes, setLoadingLeaveTypes] = useState(true);
  const [errorLeaveTypes, setErrorLeaveTypes] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null); //For deleting leave types.
  const [actionSuccess, setActionSuccess] = useState<string | null>(null); //For deleting leavetypes.
  const [isDeleting, setIsDeleting] = useState(false); //For deleting leavetypes.
  // --- New State for the Create Leave Type Form ---
  const [newLeaveTypeName, setNewLeaveTypeName] = useState("");
  const [newLeaveTypeRequiresApproval, setNewLeaveTypeRequiresApproval] =
    useState(true); // Default to true
  const [newLeaveTypeIsBalanceBased, setNewLeaveTypeIsBalanceBased] =
    useState(true); // Default to true
  const [createLeaveTypeLoading, setCreateLeaveTypeLoading] = useState(false);
  const [createLeaveTypeError, setCreateLeaveTypeError] = useState<
    string | null
  >(null);
  const [createLeaveTypeSuccess, setCreateLeaveTypeSuccess] = useState<
    string | null
  >(null); // Check if the logged-in user is an Admin (using the user from the asserted useAuth) // Using optional chaining for safe access to role_id
  // --- End New State ---

  const isAdmin = user?.role_id === ADMIN_ROLE_ID;

  // Effect to fetch leave types when the component mounts or token/user changes
  const fetchLeaveTypes = async () => {
    // Made fetch function accessible outside useEffect
    setLoadingLeaveTypes(true); // Set loading specifically for leave types fetch
    setErrorLeaveTypes(null);
    try {
      // Make the API call to the backend admin endpoint
      const typesData: LeaveType[] = await api("/api/admin/leave-types", "GET");
      setLeaveTypes(typesData);
      console.log("Fetched leave types for admin:", typesData);
    } catch (err: any) {
      console.error("Error fetching leave types for admin:", err);
      // Check if the error is a Forbidden error (403) or Unauthorized (401)
      if (
        err.response &&
        (err.response.status === 403 || err.response.status === 401)
      ) {
        // These errors are expected if user is not admin or not fully authenticated
        // Don't set a generic error message here, as the UI handles access denied separately
        console.log("Access denied or unauthorized for admin endpoint.");
      } else {
        // Handle other types of fetch errors (e.g., network, server 500)
        setErrorLeaveTypes(err.message || "Failed to fetch leave types.");
      }
    } finally {
      setLoadingLeaveTypes(false); // Set loading to false
    }
  };

  useEffect(() => {
    // Only attempt to fetch if the user is authenticated and confirmed as Admin,
    // and the auth loading is complete.
    // Use the 'loading' variable from the destructured useAuth() call
    if (!loading && token && user && user.role_id === ADMIN_ROLE_ID) {
      fetchLeaveTypes(); // Call the fetch function
    } else {
      // If not authenticated, not Admin, or auth still loading,
      // ensure leave types loading is false, but don't show a fetch error.
      setLoadingLeaveTypes(false);
    }
  }, [token, user, loading]); // Dependencies: token, user (specifically role_id changes), and auth loading state


  const handleDeleteLeaveType = async (typeId: number, typeName: string) => {
    // Ask for confirmation before deleting to prevent accidental clicks
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the leave type "${typeName}"? This action cannot be undone.`
    );

    // If the user cancels the confirmation, stop the function
    if (!confirmDelete) {
      return;
    }

    setCreateLeaveTypeLoading(true); // Disable buttons
    setCreateLeaveTypeError(null); // Clear form-specific errors
    setCreateLeaveTypeSuccess(null); // Clear form-specific success
    setActionError(null); // Clear previous action errors
    setActionSuccess(null); // Clear previous action success messages


    try {
        // Call the backend DELETE endpoint we just created
        // The response is expected to be a JSON object like { message: "..." }
        const response: { message: string } = await api(
            `/api/admin/leave-types/${typeId}`, // Endpoint includes the leave type ID
            'DELETE' // Use the DELETE HTTP method
        );

        console.log(`Leave type ${typeId} deleted:`, response);
        // Show a success message
        setActionSuccess(response.message || `Leave type "${typeName}" deleted successfully.`);

        // --- Update the UI: Remove the deleted leave type from the list ---
        // Filter the leaveTypes state to remove the deleted type
        setLeaveTypes(prevTypes => prevTypes.filter(type => type.type_id !== typeId));

    } catch (err: any) {
        console.error(`Error deleting leave type ${typeId}:`, err);
        // Handle errors from the backend
        // Check if the error response has a specific message (like the 409 Conflict error)
        const errorMessage = err.response?.data?.message || err.message || `Failed to delete leave type "${typeName}".`;
        setActionError(errorMessage);

    } finally {
        // Reset submitting state regardless of success or failure
        setCreateLeaveTypeLoading(false); // Or setIsDeleting(false);
    }
  };

  // --- New Function to Handle Create Leave Type Form Submission ---
  const handleCreateLeaveTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    setCreateLeaveTypeLoading(true);
    setCreateLeaveTypeError(null);
    setCreateLeaveTypeSuccess(null); // Clear previous messages

    // Basic client-side validation
    if (!newLeaveTypeName.trim()) {
      setCreateLeaveTypeError("Leave type name cannot be empty.");
      setCreateLeaveTypeLoading(false);
      return;
    }

    const newTypeData = {
      name: newLeaveTypeName.trim(),
      requires_approval: newLeaveTypeRequiresApproval,
      is_balance_based: newLeaveTypeIsBalanceBased,
    };

    try {
      // Call the backend POST endpoint
      const createdType: LeaveType = await api(
        "/api/admin/leave-types",
        "POST",
        newTypeData
      );

      console.log("New leave type created:", createdType);
      setCreateLeaveTypeSuccess(
        `Leave type "${createdType.name}" created successfully!`
      );

      // Clear the form
      setNewLeaveTypeName("");
      setNewLeaveTypeRequiresApproval(true);
      setNewLeaveTypeIsBalanceBased(true);

      // Refresh the list of leave types after successful creation
      // Add a slight delay to ensure backend is ready (optional)
      setTimeout(fetchLeaveTypes, 500); // Refetch the list after 500ms
    } catch (err: any) {
      console.error("Error creating leave type:", err);
      // Check if the error is a Conflict error (409) for duplicate name
      if (err.response && err.response.status === 409) {
        setCreateLeaveTypeError(
          `Error: Leave type with name "${newLeaveTypeName.trim()}" already exists.`
        );
      } else {
        setCreateLeaveTypeError(err.message || "Failed to create leave type.");
      }
    } finally {
      setCreateLeaveTypeLoading(false);
    }
  };
  // --- End New Function ---

  // Render content based on auth loading, user status, and leave types loading/error
  // Handle initial auth loading state from the context first
  if (loading) {
    // <-- Use the 'loading' variable from the destructured useAuth() call
    return <div className="admin-loading-message">Loading authentication state...</div>;
  } // --- Frontend Role Check (Optional but good practice) --- // If the user is logged in but not an Admin, show a forbidden message

  // This check happens AFTER initial auth loading is complete (checked above)
  if (!isAdmin) {
    // Check if the user is NOT an admin
    return (
      <div className="admin-forbidden-container">
        {/* Add CSS class later */}<h2>Access Denied</h2>
         <p>You do not have permission to view this page.</p>
        <p className="back-link-container">
          <Link to="/dashboard">Go to Dashboard</Link>
        </p>
      </div>
    );
  } // --- End Frontend Role Check ---
  // If we reached here, the user is an Admin (and auth loading is complete)
  return (
    <div className="admin-leave-types-container">
      <h2>Manage Leave Types</h2>
      {/* --- New Create Leave Type Form --- */}
      <div className="create-leave-type-form-section">
        {/* Add CSS class later */}
        <h3>Create New Leave Type</h3>
        <form onSubmit={handleCreateLeaveTypeSubmit} className="create-leave-type-form">
          <div className="form-group">
            <label htmlFor="leaveTypeName">Leave Type Name:</label>
            <input
              type="text"
              id="leaveTypeName"
              value={newLeaveTypeName}
              onChange={(e) => setNewLeaveTypeName(e.target.value)}
              required
              disabled={createLeaveTypeLoading}
            />
          </div>
          <div className="checkbox-group">
            <label htmlFor="requiresApproval">Requires Approval:</label>
            <input
              type="checkbox"
              id="requiresApproval"
              checked={newLeaveTypeRequiresApproval}
              onChange={(e) =>
                setNewLeaveTypeRequiresApproval(e.target.checked)
              }
              disabled={createLeaveTypeLoading}
            />
          </div>
          <div className="checkbox-group">
            <label htmlFor="isBalanceBased">Is Balance Based:</label>
            <input
              type="checkbox"
              id="isBalanceBased"
              checked={newLeaveTypeIsBalanceBased}
              onChange={(e) => setNewLeaveTypeIsBalanceBased(e.target.checked)}
              disabled={createLeaveTypeLoading}
            />
          </div>
          <button type="submit" disabled={createLeaveTypeLoading} className="submit-button">
            {createLeaveTypeLoading ? "Creating..." : "Create Leave Type"}
          </button>
        </form>
        {createLeaveTypeError && (
          <p className="error-message">
            {createLeaveTypeError}
          </p>
        )}
        {createLeaveTypeSuccess && (
          <p className="success-message">{createLeaveTypeSuccess}</p>
        )}
      </div>
      {/* --- End New Create Leave Type Form --- */}
      <hr /> {/* Separator */}
      {/* Existing Display Leave Types Section */}
      <h3>All Leave Types</h3>
      {loadingLeaveTypes && <p className="loading-message">Loading leave types...</p>}{" "}
      {/* Use state for leave types fetch */}
      {errorLeaveTypes && ( // Show generic fetch error only if it happened AFTER passing admin check
        <p className="error-message">
          Error: {errorLeaveTypes}
        </p>
      )}
      {!loadingLeaveTypes &&
        !errorLeaveTypes &&
        leaveTypes.length > 0 && ( // Check state for leave types fetch
          <div className="existing-leave-types-section">
            {" "}
            {/* Add CSS class later */}
            {/* You can display this in a table or list */}
            <table className="leave-types-table">
              {" "}
              {/* Add CSS class later */}{" "}
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Requires Approval</th>
                  <th>Balance Based</th>
                  {/* Add headers for other properties */}
                   <th>Actions</th> {/* For Edit/Delete buttons */}
                </tr>
              </thead>
              <tbody>
                {leaveTypes.map((type) => (
                  <tr key={type.type_id}>
                    <td>{type.type_id}</td>
                    <td>{type.name}</td>
                    <td className={type.requires_approval ? 'boolean-yes' : 'boolean-no'}>{type.requires_approval ? "Yes" : "No"}</td>
                    {" "}
                    <td className={type.is_balance_based ? 'boolean-yes' : 'boolean-no'}>{type.is_balance_based ? "Yes" : "No"}</td>
                    <td>
                      {/* TODO: Add Edit and Delete buttons here */}
                      <button onClick={() => handleDeleteLeaveType(type.type_id, type.name)} className="delete-button" disabled={createLeaveTypeLoading}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {!loadingLeaveTypes &&
        !errorLeaveTypes &&
        leaveTypes.length === 0 &&
        isAdmin && ( // Show 'No types found' only for Admin
          <p className="no-data-message">No leave types found in the system.</p>
        )}
       {/* TODO: Add button/link to Add New Leave Type */}
      <p className="back-link-container">
        <Link to="/dashboard">Back to Dashboard</Link>
      </p>
    </div>
  );
}

export default AdminLeaveTypesPage;

