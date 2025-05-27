import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../api/api";
import { Link } from "react-router-dom";
import "./AdminUsersPage.css";

const ADMIN_ROLE_ID = 1;
const EMPLOYEE_ROLE_ID = 2;
const MANAGER_ROLE_ID = 3;
const INTERN_ROLE_ID = 4;

interface AuthUser {
  user_id: number;
  name: string;
  email: string;
  role_id: number;
  manager_id?: number | null;
}

interface UserResponse {
  user_id: number;
  name: string;
  email: string;
  role_id: number;
  manager_id: number | null;
  role: {
    role_id: number;
    name: string;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (newToken: string, newUser: AuthUser) => void;
  logout: () => void;
}

interface CreateUserRequestBody {
  name: string;
  email: string;
  password: string;
  role_id: number;
  manager_id?: number | null;
}

interface UserWithBalancesResponse {
  user_id: number;
  name: string;
  email: string;
  role_id: number;
  manager_id: number | null;
  role: {
    role_id: number;
    name: string;
  };
  leaveBalances: {
    leaveTypeName: string;
    totalDays: number;
    usedDays: number;
    availableDays: number;
    year: number;
  }[];
}

function AdminUsersPage() {
  const {
    user,
    token,
    isAuthenticated,
    loading: authLoading,
  } = useAuth() as AuthContextType;

  const isAdmin = user?.role_id === ADMIN_ROLE_ID;

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");

  const [newUserRole, setNewUserRole] = useState<number | "">("");
  const [newUserManagerId, setNewUserManagerId] = useState<number | "">("");
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(
    null
  );

  const [managersList, setManagersList] = useState<UserWithBalancesResponse[]>(
    []
  );
  const [employeesList, setEmployeesList] = useState<
    UserWithBalancesResponse[]
  >([]);
  const [internsList, setInternsList] = useState<UserWithBalancesResponse[]>(
    []
  );
  const [allUsersList, setAllUsersList] = useState<UserWithBalancesResponse[]>(
    []
  );

  const [loadingLists, setLoadingLists] = useState(false);
  const [errorLists, setErrorLists] = useState<string | null>(null);
  const [currentListView, setCurrentListView] = useState<string>("All");

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserLoading(true);
    setCreateUserError(null);
    setCreateUserSuccess(null);

    if (
      !newUserName.trim() ||
      !newUserEmail.trim() ||
      !newUserPassword.trim() ||
      newUserRole === ""
    ) {
      setCreateUserError("All required fields must be filled.");
      setCreateUserLoading(false);
      return;
    }

    const newUserData: CreateUserRequestBody = {
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      password: newUserPassword,
      role_id: newUserRole as number,
      ...(newUserRole !== MANAGER_ROLE_ID && {
        manager_id: newUserManagerId === "" ? null : newUserManagerId,
      }),
    };

    try {
      const createdUser = await api(
        "/api/admin/users",
        "POST",
        newUserData
      );

      setCreateUserSuccess(
        `User "${createdUser.name}" (ID: ${createdUser.user_id}) created successfully!`
      );

      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("");
      setNewUserManagerId("");

      fetchUsersByRole(MANAGER_ROLE_ID);
      fetchUsersByRole();
    } catch (err: any) {
      if (err.response && err.response.status === 409) {
        setCreateUserError(
          `Error: User with email "${newUserEmail.trim()}" already exists.`
        );
      } else if (
        err.response &&
        err.response.data &&
        err.response.data.message
      ) {
        setCreateUserError(`Error: ${err.response.data.message}`);
      } else {
        setCreateUserError(err.message || "Failed to create user.");
      }
    } finally {
      setCreateUserLoading(false);
    }
  };

  const fetchUsersByRole = async (roleId?: number) => {
    setLoadingLists(true);
    setErrorLists(null);
    let viewName = "All";

    if (!isAuthenticated || !isAdmin) {
      setLoadingLists(false);
      return;
    }

    try {
      let endpoint = "/api/admin/users";
      if (roleId !== undefined) {
        endpoint += `?role_id=${roleId}`;
        if (roleId === MANAGER_ROLE_ID) viewName = "Managers";
        else if (roleId === EMPLOYEE_ROLE_ID) viewName = "Employees";
        else if (roleId === INTERN_ROLE_ID) viewName = "Interns";
      } else {
        viewName = "All";
      }
      const fetchedUsers: UserWithBalancesResponse[] = await api(
        endpoint,
        "GET"
      );

      if (roleId === MANAGER_ROLE_ID) {
        setManagersList(fetchedUsers);
      } else if (roleId === EMPLOYEE_ROLE_ID) {
        setEmployeesList(fetchedUsers);
      } else if (roleId === INTERN_ROLE_ID) {
        setInternsList(fetchedUsers);
      }

      if (roleId === undefined) {
        setAllUsersList(fetchedUsers);
      }

      setCurrentListView(viewName);
    } catch (err: any) {
      setErrorLists(err.message || `Failed to fetch ${viewName} list.`);
    } finally {
      setLoadingLists(false);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete user "${userName}" (ID: ${userId})? This action cannot be undone.`
      )
    ) {
      return;
    }

    setLoadingLists(true);
    setErrorLists(null);

    try {
      await api(`/api/admin/users/${userId}`, "DELETE");

      setAllUsersList((prevList) =>
        prevList.filter((user) => user.user_id !== userId)
      );
      setManagersList((prevList) =>
        prevList.filter((user) => user.user_id !== userId)
      );
      setEmployeesList((prevList) =>
        prevList.filter((user) => user.user_id !== userId)
      );
      setInternsList((prevList) =>
        prevList.filter((user) => user.user_id !== userId)
      );

    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.message) {
        setErrorLists(`Error deleting user: ${err.response.data.message}`);
      } else {
        setErrorLists(err.message || "Failed to delete user.");
      }
    } finally {
      setLoadingLists(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated && isAdmin) {
        fetchUsersByRole(MANAGER_ROLE_ID);
        fetchUsersByRole();
      } else {
        setLoadingLists(false);
        setErrorLists("You do not have permission to view user lists.");
      }
    }
  }, [token, user, isAdmin, authLoading, isAuthenticated]);

  const listToDisplay: UserWithBalancesResponse[] = useMemo(() => {
    if (currentListView === "Managers") return managersList;
    if (currentListView === "Employees") return employeesList;
    if (currentListView === "Interns") return internsList;
    return allUsersList;
  }, [currentListView, managersList, employeesList, internsList, allUsersList]);

  if (authLoading) {
    return (
      <div className="admin-page-loading">Loading authentication state...</div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="admin-forbidden-container">
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
        <p>
          <Link to="/dashboard">Go to Dashboard</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="admin-users-container">
      <h2>Admin User Management</h2>
      <div className="create-user-form">
        <h3>Create New User</h3>
        <form onSubmit={handleCreateUserSubmit}>
          <div>
            <label htmlFor="userName">Name:</label>
            <input
              type="text"
              id="userName"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              required
              disabled={createUserLoading}
            />
          </div>
          <div>
            <label htmlFor="userEmail">Email:</label>
            <input
              type="email"
              id="userEmail"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              required
              disabled={createUserLoading}
            />
          </div>
          <div>
            <label htmlFor="userPassword">Password:</label>
            <input
              type="password"
              id="userPassword"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              required
              disabled={createUserLoading}
            />
          </div>
          <div>
            <label htmlFor="userRole">Role:</label>
            <select
              id="userRole"
              value={newUserRole === "" ? "" : String(newUserRole)}
              onChange={(e) => setNewUserRole(parseInt(e.target.value, 10))}
              required
              disabled={createUserLoading}
            >
              <option value="">--Select Role--</option>
              <option value={MANAGER_ROLE_ID}>Manager</option>
              <option value={EMPLOYEE_ROLE_ID}>Employee</option>
              <option value={INTERN_ROLE_ID}>Intern</option>
            </select>
          </div>

          {newUserRole !== "" && newUserRole !== MANAGER_ROLE_ID && (
            <div>
              <label htmlFor="userManager">Manager:</label>
              <select
                id="userManager"
                value={newUserManagerId === "" ? "" : String(newUserManagerId)}
                onChange={(e) =>
                  setNewUserManagerId(
                    e.target.value === "" ? "" : parseInt(e.target.value, 10)
                  )
                }
                disabled={createUserLoading || loadingLists}
              >
                <option value="">--Select Manager (Optional)--</option>
                {managersList.map((manager) => (
                  <option key={manager.user_id} value={manager.user_id}>
                    {manager.name} (ID: {manager.user_id})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" disabled={createUserLoading}>
            {createUserLoading ? "Creating..." : "Create User"}
          </button>
        </form>
        {createUserError && (
          <p className="error-message" style={{ color: "red" }}>
            {createUserError}
          </p>
        )}
        {createUserSuccess && (
          <p style={{ color: "green" }}>{createUserSuccess}</p>
        )}
      </div>
      <hr />
      <div className="admin-user-lists">
        <h3>User Lists</h3>
        <div className="user-list-buttons">
          <button onClick={() => fetchUsersByRole()} disabled={loadingLists}>
            {loadingLists && currentListView === "All"
              ? "Loading..."
              : "View All Users"}
          </button>
          <button
            onClick={() => fetchUsersByRole(MANAGER_ROLE_ID)}
            disabled={loadingLists}
          >
            {loadingLists && currentListView === "Managers"
              ? "Loading..."
              : "View Managers"}
          </button>
          <button
            onClick={() => fetchUsersByRole(EMPLOYEE_ROLE_ID)}
            disabled={loadingLists}
          >
            {loadingLists && currentListView === "Employees"
              ? "Loading..."
              : "View Employees"}
          </button>
          <button
            onClick={() => fetchUsersByRole(INTERN_ROLE_ID)}
            disabled={loadingLists}
          >
            {loadingLists && currentListView === "Interns"
              ? "Loading..."
              : "View Interns"}
          </button>
        </div>
        {loadingLists && (
          <p>Loading {currentListView.toLowerCase()} list...</p>
        )}
        {errorLists && (
          <p className="error-message" style={{ color: "red" }}>
            {errorLists}
          </p>
        )}
        {!loadingLists && !errorLists && listToDisplay.length > 0 && (
          <div className="user-list-display">
            <h4>
              {currentListView || "All"} List ({listToDisplay.length} users)
            </h4>
            <ul className="user-list">
              {listToDisplay.map((user) => (
                <li key={user.user_id} className="user-item">
                  <div className="user-main-info">
                    <strong>{user.name}</strong> ({user.role.name}) - ID:{" "}
                    {user.user_id}
                    {user.manager_id && ` | Manager ID: ${user.manager_id}`}
                  </div>
                  <div className="user-leave-balances">
                    <h5>
                      Leave Balances{" "}
                      {user.leaveBalances.length > 0
                        ? `(${user.leaveBalances[0].year}):`
                        : "(Current Year):"}
                    </h5>
                    {/* CORRECTED LOGIC: Check if the specific user has leaveBalances data */}
                    {user.leaveBalances.length > 0 ? (
                      <ul className="balance-list">
                        {user.leaveBalances.map((balance) => (
                          <li key={`${user.user_id}-${balance.leaveTypeName}`}>
                            {balance.leaveTypeName}:{" "}
                            {balance.usedDays.toFixed(2)} /{" "}
                            {balance.totalDays.toFixed(2)} days (Available:{" "}
                            {balance.availableDays.toFixed(2)})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No leave policy or balances available for this user.</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!loadingLists &&
          !errorLists &&
          listToDisplay.length === 0 &&
          currentListView !== null && (
            <p>No {currentListView.toLowerCase()} found in the system.</p>
          )}
      </div>
      <hr />
      <p>
        <Link to="/dashboard">Back to Dashboard</Link>
      </p>
    </div>
  );
}

export default AdminUsersPage;