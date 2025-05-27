import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../api/api";
import { Link } from "react-router-dom";
import './AdminLeaveTypesPage.css'

interface LeaveType {
  type_id: number;
  name: string;
  requires_approval: boolean;
  is_balance_based: boolean;
}

interface AuthUser {
  user_id: number;
  name: string;
  email: string;
  role_id: number; 
}

const ADMIN_ROLE_ID = 1;

function AdminLeaveTypesPage() {
  const { user, token, loading } =
    useAuth() as {
      user: AuthUser | null; 
      token: string | null; 
      isAuthenticated: boolean;
      loading: boolean;
      login: (newToken: string, newUser: any) => void;
      logout: () => void;
    }; 

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loadingLeaveTypes, setLoadingLeaveTypes] = useState(true);
  const [errorLeaveTypes, setErrorLeaveTypes] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newLeaveTypeName, setNewLeaveTypeName] = useState("");
  const [newLeaveTypeRequiresApproval, setNewLeaveTypeRequiresApproval] =
    useState(true);
  const [newLeaveTypeIsBalanceBased, setNewLeaveTypeIsBalanceBased] =
    useState(true);
  const [createLeaveTypeLoading, setCreateLeaveTypeLoading] = useState(false);
  const [createLeaveTypeError, setCreateLeaveTypeError] = useState<
    string | null
  >(null);
  const [createLeaveTypeSuccess, setCreateLeaveTypeSuccess] = useState<
    string | null
  >(null);

  const isAdmin = user?.role_id === ADMIN_ROLE_ID;

  const fetchLeaveTypes = async () => {
    setLoadingLeaveTypes(true);
    setErrorLeaveTypes(null);
    try {
      const typesData: LeaveType[] = await api("/api/admin/leave-types", "GET");
      setLeaveTypes(typesData);
    } catch (err: any) {
      console.error("Error fetching leave types for admin:", err);
      if (
        err.response &&
        (err.response.status === 403 || err.response.status === 401)
      ) {
      } else {
        setErrorLeaveTypes(err.message || "Failed to fetch leave types.");
      }
    } finally {
      setLoadingLeaveTypes(false);
    }
  };

  useEffect(() => {
    if (!loading && token && user && user.role_id === ADMIN_ROLE_ID) {
      fetchLeaveTypes();
    } else {
      setLoadingLeaveTypes(false);
    }
  }, [token, user, loading]);


  const handleDeleteLeaveType = async (typeId: number, typeName: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the leave type "${typeName}"? This action cannot be undone.`
    );
    if (!confirmDelete) {
      return;
    }

    setCreateLeaveTypeLoading(true);
    setCreateLeaveTypeError(null);
    setCreateLeaveTypeSuccess(null);
    setActionError(null);
    setActionSuccess(null);


    try {
        const response: { message: string } = await api(
            `/api/admin/leave-types/${typeId}`,
            'DELETE'
        );

        setActionSuccess(response.message || `Leave type "${typeName}" deleted successfully.`);

        setLeaveTypes(prevTypes => prevTypes.filter(type => type.type_id !== typeId));

    } catch (err: any) {
        console.error(`Error deleting leave type ${typeId}:`, err);
        const errorMessage = err.response?.data?.message || err.message || `Failed to delete leave type "${typeName}".`;
        setActionError(errorMessage);

    } finally {
        setCreateLeaveTypeLoading(false);
    }
  };

  const handleCreateLeaveTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLeaveTypeLoading(true);
    setCreateLeaveTypeError(null);
    setCreateLeaveTypeSuccess(null);

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
      const createdType: LeaveType = await api(
        "/api/admin/leave-types",
        "POST",
        newTypeData
      );

      setCreateLeaveTypeSuccess(
        `Leave type "${createdType.name}" created successfully!`
      );

      setNewLeaveTypeName("");
      setNewLeaveTypeRequiresApproval(true);
      setNewLeaveTypeIsBalanceBased(true);

      setTimeout(fetchLeaveTypes, 500);
    } catch (err: any) {
      console.error("Error creating leave type:", err);
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

  if (loading) {
    return <div className="admin-loading-message">Loading authentication state...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="admin-forbidden-container">
        <h2>Access Denied</h2>
         <p>You do not have permission to view this page.</p>
        <p className="back-link-container">
          <Link to="/dashboard">Go to Dashboard</Link>
        </p>
      </div>
    );
  }
  return (
    <div className="admin-leave-types-container">
      <h2>Manage Leave Types</h2>
      <div className="create-leave-type-form-section">
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
      <hr /> {/* Separator */}
      <h3>All Leave Types</h3>
      {loadingLeaveTypes && <p className="loading-message">Loading leave types...</p>}{" "}
      {errorLeaveTypes && (
        <p className="error-message">
          Error: {errorLeaveTypes}
        </p>
      )}
      {!loadingLeaveTypes &&
        !errorLeaveTypes &&
        leaveTypes.length > 0 && (
          <div className="existing-leave-types-section">
            {" "}
            
            <table className="leave-types-table">
              {" "}
              {" "}
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Requires Approval</th>
                  <th>Balance Based</th>
                   <th>Actions</th>
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
        isAdmin && (
          <p className="no-data-message">No leave types found in the system.</p>
        )}
      <p className="back-link-container">
        <Link to="/dashboard">Back to Dashboard</Link>
      </p>
    </div>
  );
}

export default AdminLeaveTypesPage;

