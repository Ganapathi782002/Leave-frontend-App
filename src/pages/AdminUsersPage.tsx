import React, { useState, useEffect, useMemo, FormEvent, JSX } from "react";
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

interface RoleInfo {
    role_id: number;
    name: string;
}

interface UserResponse {
    user_id: number;
    name: string;
    email: string;
    role_id: number;
    manager_id: number | null;
    role: RoleInfo;
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
    role: RoleInfo;
    leaveBalances: {
        leaveTypeName: string;
        totalDays: number;
        usedDays: number;
        availableDays: number;
        year: number;
    }[];
}

interface UpdateUserRequestBody {
    name?: string;
    email?: string;
    role_id?: number;
    manager_id?: number | null | ""; // Allow "" for select, convert to null
}


function AdminUsersPage(): JSX.Element {
    const {
        user: loggedInUserGlobal,
        isAuthenticated,
        loading: authLoading,
    } = useAuth() as AuthContextType; 

    const isAdmin = loggedInUserGlobal?.role_id === ADMIN_ROLE_ID;

    const [newUserName, setNewUserName] = useState("");
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("");
    const [newUserRole, setNewUserRole] = useState<number | "">("");
    const [newUserManagerId, setNewUserManagerId] = useState<number | "" | null>("");
    const [createUserLoading, setCreateUserLoading] = useState(false);
    const [createUserError, setCreateUserError] = useState<string | null>(null);
    const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(null);

    const [managersList, setManagersList] = useState<UserWithBalancesResponse[]>([]);
    const [allUsersList, setAllUsersList] = useState<UserWithBalancesResponse[]>([]);
    const [loadingLists, setLoadingLists] = useState(true);
    const [errorLists, setErrorLists] = useState<string | null>(null);
    const [currentListView, setCurrentListView] = useState<string>("All");

    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const [currentUserToEdit, setCurrentUserToEdit] = useState<UserWithBalancesResponse | null>(null);
    const [editFormState, setEditFormState] = useState<UpdateUserRequestBody>({});
    const [editUserLoading, setEditUserLoading] = useState<boolean>(false);
    const [editUserError, setEditUserError] = useState<string | null>(null);
    const [editUserSuccess, setEditUserSuccess] = useState<string | null>(null);

    const fetchUsersByRole = async (roleId?: number, isManagerListFetch?: boolean) => {
        if (!isManagerListFetch) {
            setLoadingLists(true);
            setErrorLists(null);
        }
        let viewName = "All";

        if (!isAuthenticated || !isAdmin) {
            if (!isManagerListFetch) setLoadingLists(false);
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
            const fetchedUsers: UserWithBalancesResponse[] = await api(endpoint, "GET");

            if (isManagerListFetch && roleId === MANAGER_ROLE_ID) {
                setManagersList(fetchedUsers);
            } else {
                setAllUsersList(fetchedUsers);
                 if (roleId === undefined) { // If fetching all, update manager list too
                    setManagersList(fetchedUsers.filter(u => u.role.role_id === MANAGER_ROLE_ID));
                }
            }
            if (!isManagerListFetch) {
                setCurrentListView(viewName);
            }
        } catch (err: any) {
            if (!isManagerListFetch) setErrorLists(err.message || `Failed to fetch ${viewName} list.`);
            else console.error("Error fetching manager list for dropdown:", err);
        } finally {
            if (!isManagerListFetch) setLoadingLists(false);
        }
    };
    
    useEffect(() => {
        const initialFetch = async () => {
            if (!authLoading) {
                if (isAuthenticated && isAdmin) {
                    setLoadingLists(true);
                    await fetchUsersByRole(MANAGER_ROLE_ID, true); 
                    await fetchUsersByRole(undefined, false);     
                    setLoadingLists(false);
                } else {
                    setLoadingLists(false);
                    setErrorLists("You do not have permission to view user lists.");
                }
            }
        };
        initialFetch();
    }, [authLoading, isAuthenticated, isAdmin]);

    const handleCreateUserSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setCreateUserLoading(true);
        setCreateUserError(null);
        setCreateUserSuccess(null);

        if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim() || newUserRole === "") {
            setCreateUserError("All required fields (Name, Email, Password, Role) must be filled.");
            setCreateUserLoading(false);
            return;
        }

        const newUserData: CreateUserRequestBody = {
            name: newUserName.trim(),
            email: newUserEmail.trim().toLowerCase(),
            password: newUserPassword,
            role_id: newUserRole as number,
            ...((newUserRole === EMPLOYEE_ROLE_ID || newUserRole === INTERN_ROLE_ID) && {
                manager_id: newUserManagerId === "" || newUserManagerId === null ? null : Number(newUserManagerId),
            }),
        };

        try {
            const createdUser: UserResponse = await api("/api/admin/users", "POST", newUserData);
            setCreateUserSuccess(`User "${createdUser.name}" (ID: ${createdUser.user_id}) created successfully! Refreshing lists...`);
            setNewUserName(""); setNewUserEmail(""); setNewUserPassword(""); setNewUserRole(""); setNewUserManagerId("");
            
            await fetchUsersByRole(MANAGER_ROLE_ID, true); 
            await fetchUsersByRole(undefined);      
            setCurrentListView("All");

        } catch (err: any) {
            const message = err.response?.data?.message || err.message || "Failed to create user.";
            setCreateUserError(message);
        } finally {
            setCreateUserLoading(false);
        }
    };
    
    useEffect(() => {
        let timer: number | undefined;
        if (createUserSuccess || createUserError) {
            timer = window.setTimeout(() => {
                setCreateUserSuccess(null);
                setCreateUserError(null);
            }, 5000);
        }
        return () => { if (timer) window.clearTimeout(timer); };
    }, [createUserSuccess, createUserError]);

     useEffect(() => {
        let timer: number | undefined;
        if (editUserSuccess || editUserError) {
            timer = window.setTimeout(() => {
                setEditUserSuccess(null);
                setEditUserError(null);
            }, 5000);
        }
        return () => { if (timer) window.clearTimeout(timer); };
    }, [editUserSuccess, editUserError]);

    const handleDeleteUser = async (userId: number, userName: string) => {
        if (!window.confirm(`Are you sure you want to delete user "${userName}" (ID: ${userId})? This action cannot be undone.`)) {
            return;
        }
        setLoadingLists(true); 
        setErrorLists(null);
        setEditUserSuccess(null); 
        setEditUserError(null);
        try {
            await api(`/api/admin/users/${userId}`, "DELETE"); // Ensure this endpoint exists
            setEditUserSuccess(`User "${userName}" deleted successfully. Refreshing list...`);
            await fetchUsersByRole(MANAGER_ROLE_ID, true); 
            await fetchUsersByRole(undefined);      
            setCurrentListView(currentListView); 
        } catch (err: any) {
            const message = err.response?.data?.message || err.message || "Failed to delete user.";
            setEditUserError(message); 
        } finally {
            setLoadingLists(false);
        }
    };

    const handleOpenEditModal = (userToEdit: UserWithBalancesResponse) => {
        setCurrentUserToEdit(userToEdit);
        setEditFormState({
            name: userToEdit.name,
            email: userToEdit.email,
            role_id: userToEdit.role_id,
            manager_id: userToEdit.manager_id ?? "", // Use "" for empty select if manager_id is null/undefined
        });
        setIsEditModalOpen(true);
        setEditUserError(null);
        setEditUserSuccess(null);
    };

    const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditFormState(prev => ({
            ...prev,
            [name]: name === 'role_id' 
                ? (value === "" ? undefined : parseInt(value, 10))
                : name === 'manager_id' 
                    ? (value === "" ? null : parseInt(value, 10)) 
                    : value,
        }));
    };

    const handleEditUserSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!currentUserToEdit) return;

        setEditUserLoading(true);
        setEditUserError(null);
        setEditUserSuccess(null);

        let payload: UpdateUserRequestBody = {};
        if (editFormState.name && editFormState.name.trim() !== currentUserToEdit.name) {
            payload.name = editFormState.name.trim();
        }
        if (editFormState.email && editFormState.email.trim().toLowerCase() !== currentUserToEdit.email.toLowerCase()) {
            payload.email = editFormState.email.trim().toLowerCase();
        }
        
        const newRoleId = editFormState.role_id;
        if (newRoleId !== undefined && newRoleId !== currentUserToEdit.role_id) {
            payload.role_id = newRoleId;
        }

        const newManagerId = editFormState.manager_id; // This can be number, null, or ""
        if (newManagerId === "" && currentUserToEdit.manager_id !== null) { // Explicitly removing manager
            payload.manager_id = null;
        } else if (newManagerId !== null && newManagerId !== "" && Number(newManagerId) !== currentUserToEdit.manager_id) {
            payload.manager_id = Number(newManagerId);
        }


        if (Object.keys(payload).length === 0) {
            setEditUserError("No changes were made.");
            setEditUserLoading(false);
            return;
        }
        
        if (payload.role_id && currentUserToEdit.role_id !== payload.role_id) {
            const originalRoleId = currentUserToEdit.role_id;
            const tempNewRoleId = payload.role_id; 

            if (originalRoleId === ADMIN_ROLE_ID) {
                 setEditUserError("Administrator role cannot be changed from this interface.");
                 setEditUserLoading(false);
                 return;
            }
            if (tempNewRoleId === ADMIN_ROLE_ID) {
                 setEditUserError("Cannot assign Administrator role from this interface.");
                 setEditUserLoading(false);
                 return;
            }
            const isValidTransition =
                (originalRoleId === INTERN_ROLE_ID && tempNewRoleId === EMPLOYEE_ROLE_ID) ||
                (originalRoleId === EMPLOYEE_ROLE_ID && tempNewRoleId === MANAGER_ROLE_ID);
            if (!isValidTransition) {
                setEditUserError(`Invalid role transition: ${currentUserToEdit.role.name} to target role. Allowed: Intern->Employee, Employee->Manager.`);
                setEditUserLoading(false);
                return;
            }
        }

        try {
            const updatedUser: UserResponse = await api(
                `/api/admin/users/${currentUserToEdit.user_id}`,
                "PUT",
                payload
            );
            setEditUserSuccess(`User "${updatedUser.name}" updated successfully! Refreshing lists...`);
            setIsEditModalOpen(false);
            setCurrentUserToEdit(null);

            await fetchUsersByRole(MANAGER_ROLE_ID, true); 
            await fetchUsersByRole(undefined);      
            setCurrentListView(currentListView); 

        } catch (err: any) {
            const message = err.response?.data?.message || err.message || "Failed to update user.";
            setEditUserError(message);
        } finally {
            setEditUserLoading(false);
        }
    };

    const listToDisplay: UserWithBalancesResponse[] = useMemo(() => {
        if (!allUsersList) return [];
        if (currentListView === "Managers") return allUsersList.filter(u => u.role.role_id === MANAGER_ROLE_ID);
        if (currentListView === "Employees") return allUsersList.filter(u => u.role.role_id === EMPLOYEE_ROLE_ID);
        if (currentListView === "Interns") return allUsersList.filter(u => u.role.role_id === INTERN_ROLE_ID);
        return allUsersList;
    }, [currentListView, allUsersList]);

    if (authLoading) {
        return <div className="admin-page-loading">Loading authentication state...</div>;
    }

    if (!isAuthenticated || !isAdmin) {
        return (
            <div className="admin-forbidden-container">
                <h2>Access Denied</h2>
                <p>You do not have permission to view this page.</p>
                <p><Link to="/dashboard">Go to Dashboard</Link></p>
            </div>
        );
    }

    return (
        <div className="admin-users-container">
            <h2>Admin User Management</h2>

            <div className="create-user-form section-card">
                <h3>Create New User</h3>
                <form onSubmit={handleCreateUserSubmit}>
                    <div className="form-group">
                        <label htmlFor="newUserName">Name:</label>
                        <input type="text" id="newUserName" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} required disabled={createUserLoading} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="newUserEmail">Email:</label>
                        <input type="email" id="newUserEmail" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required disabled={createUserLoading} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="newUserPassword">Password:</label>
                        <input type="password" id="newUserPassword" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} required disabled={createUserLoading} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="newUserRole">Role:</label>
                        <select id="newUserRole" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value === "" ? "" : parseInt(e.target.value, 10))} required disabled={createUserLoading}>
                            <option value="">--Select Role--</option>
                            <option value={MANAGER_ROLE_ID}>Manager</option>
                            <option value={EMPLOYEE_ROLE_ID}>Employee</option>
                            <option value={INTERN_ROLE_ID}>Intern</option>
                        </select>
                    </div>
                    {(newUserRole === EMPLOYEE_ROLE_ID || newUserRole === INTERN_ROLE_ID) && (
                        <div className="form-group">
                            <label htmlFor="newUserManager">Manager:</label>
                            <select id="newUserManager" value={newUserManagerId === null ? "" : newUserManagerId} onChange={(e) => setNewUserManagerId(e.target.value === "" ? null : parseInt(e.target.value, 10))} disabled={createUserLoading || loadingLists}>
                                <option value="">--Select Manager (Optional)--</option>
                                {managersList.map((manager) => (
                                    <option key={manager.user_id} value={manager.user_id}>
                                        {manager.name} (ID: {manager.user_id})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <button type="submit" disabled={createUserLoading} className="action-button">
                        {createUserLoading ? "Creating..." : "Create User"}
                    </button>
                </form>
                {createUserSuccess && <p className="success-message">{createUserSuccess}</p>}
                {createUserError && <p className="error-message">{createUserError}</p>}
            </div>
            <hr />

            {isEditModalOpen && currentUserToEdit && (
                <div className="modal-overlay">
                    <div className="modal-content section-card">
                        <h3>Edit User: {currentUserToEdit.name} (ID: {currentUserToEdit.user_id})</h3>
                        <form onSubmit={handleEditUserSubmit}>
                            <div className="form-group">
                                <label htmlFor="editUserNameModal">Name:</label>
                                <input type="text" id="editUserNameModal" name="name" value={editFormState.name || ""} onChange={handleEditFormChange} required disabled={editUserLoading} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="editUserEmailModal">Email:</label>
                                <input type="email" id="editUserEmailModal" name="email" value={editFormState.email || ""} onChange={handleEditFormChange} required disabled={editUserLoading} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="editUserRoleModal">Role:</label>
                                <select 
                                    id="editUserRoleModal" 
                                    name="role_id" 
                                    value={editFormState.role_id ?? ""} 
                                    onChange={handleEditFormChange} 
                                    required 
                                    disabled={editUserLoading || currentUserToEdit.role_id === ADMIN_ROLE_ID}
                                >
                                    <option value={currentUserToEdit.role_id}>{currentUserToEdit.role.name} (Current)</option>
                                    {currentUserToEdit.role_id === INTERN_ROLE_ID && (
                                        <option value={EMPLOYEE_ROLE_ID}>Employee</option>
                                    )}
                                    {currentUserToEdit.role_id === EMPLOYEE_ROLE_ID && (
                                        <option value={MANAGER_ROLE_ID}>Manager</option>
                                    )}
                                </select>
                                {currentUserToEdit.role_id === ADMIN_ROLE_ID && <small> Admin role cannot be changed.</small>}
                            </div>
                            {( (typeof editFormState.role_id === 'number' && (editFormState.role_id === EMPLOYEE_ROLE_ID || editFormState.role_id === INTERN_ROLE_ID)) ||
                              (typeof editFormState.role_id !== 'number' && (currentUserToEdit.role_id === EMPLOYEE_ROLE_ID || currentUserToEdit.role_id === INTERN_ROLE_ID))
                             ) && (
                                <div className="form-group">
                                    <label htmlFor="editUserManagerModal">Manager:</label>
                                    <select 
                                        id="editUserManagerModal" 
                                        name="manager_id" 
                                        value={editFormState.manager_id === null ? "" : (editFormState.manager_id ?? "")} 
                                        onChange={handleEditFormChange} 
                                        disabled={editUserLoading || loadingLists}
                                    >
                                        <option value="">--Remove/Select Manager--</option>
                                        {managersList
                                            .filter(manager => manager.user_id !== currentUserToEdit.user_id)
                                            .map((manager) => (
                                            <option key={manager.user_id} value={manager.user_id}>
                                                {manager.name} (ID: {manager.user_id})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="modal-actions">
                                <button type="submit" disabled={editUserLoading} className="action-button">
                                    {editUserLoading ? "Saving..." : "Save Changes"}
                                </button>
                                <button type="button" onClick={() => { setIsEditModalOpen(false); setCurrentUserToEdit(null);}} disabled={editUserLoading} className="cancel-button">
                                    Cancel
                                </button>
                            </div>
                        </form>
                        {editUserSuccess && <p className="success-message">{editUserSuccess}</p>}
                        {editUserError && <p className="error-message">{editUserError}</p>}
                    </div>
                </div>
            )}

            <div className="admin-user-lists section-card">
                <h3>User Lists</h3>
                <div className="user-list-buttons">
                    <button onClick={() => { setCurrentListView("All"); fetchUsersByRole(undefined);}} disabled={loadingLists}>
                        {loadingLists && currentListView === "All" ? "Loading..." : "View All Users"}
                    </button>
                    <button onClick={() => { setCurrentListView("Managers"); fetchUsersByRole(MANAGER_ROLE_ID);}} disabled={loadingLists}>
                        {loadingLists && currentListView === "Managers" ? "Loading..." : "View Managers"}
                    </button>
                    <button onClick={() => { setCurrentListView("Employees"); fetchUsersByRole(EMPLOYEE_ROLE_ID);}} disabled={loadingLists}>
                        {loadingLists && currentListView === "Employees" ? "Loading..." : "View Employees"}
                    </button>
                    <button onClick={() => { setCurrentListView("Interns"); fetchUsersByRole(INTERN_ROLE_ID);}} disabled={loadingLists}>
                        {loadingLists && currentListView === "Interns" ? "Loading..." : "View Interns"}
                    </button>
                </div>

                {loadingLists && <p>Loading {currentListView.toLowerCase()} list...</p>}
                {errorLists && <p className="error-message">{errorLists}</p>}

                {!loadingLists && !errorLists && listToDisplay.length > 0 && (
                    <div className="user-list-display">
                        <h4>{currentListView} List ({listToDisplay.length} users)</h4>
                        <div className="table-responsive-container">
                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Manager ID</th>
                                        <th>Balances (Type: Used/Total)</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {listToDisplay.map((userToList) => (
                                        <tr key={userToList.user_id}>
                                            <td>{userToList.user_id}</td>
                                            <td>{userToList.name}</td>
                                            <td>{userToList.email}</td>
                                            <td>{userToList.role.name}</td>
                                            <td>{userToList.manager_id || 'N/A'}</td>
                                            <td>
                                                {userToList.leaveBalances.length > 0 ? (
                                                    <ul className="balance-list-inline">
                                                        {userToList.leaveBalances.map(balance => (
                                                            <li key={`${userToList.user_id}-${balance.leaveTypeName}`}>
                                                                {balance.leaveTypeName}: {balance.totalDays > 0 ? `${balance.usedDays.toFixed(1)}/${balance.totalDays.toFixed(1)}` : `${balance.usedDays.toFixed(1)} (N/A Total)`}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : ( <small>No balances</small> )}
                                            </td>
                                            <td>
                                                <button onClick={() => handleOpenEditModal(userToList)} className="edit-button small-button">Edit</button>
                                                {loggedInUserGlobal?.user_id !== userToList.user_id && (
                                                    <button onClick={() => handleDeleteUser(userToList.user_id, userToList.name)} className="delete-button small-button" disabled={loadingLists}>Delete</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {!loadingLists && !errorLists && listToDisplay.length === 0 && currentListView && (
                    <p>No {currentListView.toLowerCase()} users found.</p>
                )}
            </div>
            <hr />
            <p><Link to="/dashboard">Back to Dashboard</Link></p>
        </div>
    );
}

export default AdminUsersPage;