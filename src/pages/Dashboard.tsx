import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth"; // Assuming this provides the correct AuthContextType
import api from "../api/api";
import { Link, useNavigate } from "react-router-dom";
import "./Dashboard.css"; // Ensure this CSS file exists and is styled as needed

// Ideally, these constants should be imported from your central constants file
const ADMIN_ROLE_ID = 1;
const EMPLOYEE_ROLE_ID = 2;
const MANAGER_ROLE_ID = 3;
const INTERN_ROLE_ID = 4;

// --- START: Interface Definitions ---
// TODO: For better maintainability, import these interfaces from a central types file or their original definition locations.
interface AuthUser {
    user_id: number;
    name: string;
    email: string;
    role_id: number;
    manager_id?: number | null;
    manager?: { // This structure comes from the login response
        user_id: number;
        name: string;
        email: string;
    } | null;
}

interface AuthContextType { // This should ideally be imported from AuthContext.tsx
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (newToken: string, newUser: AuthUser) => void; // Ensure AuthUser is used here
    logout: () => void;
}

interface LeaveBalance {
    balance_id: number;
    user_id: number;
    type_id: number;
    year: number;
    total_days: number; // This will hold the parsed number
    used_days: number;  // This will hold the parsed number
    leaveType: {
        type_id: number;
        name: string;
    };
}

// For data coming from API before parsing total_days and used_days
interface RawLeaveBalance extends Omit<LeaveBalance, 'total_days' | 'used_days'> {
    total_days: string | number;
    used_days: string | number;
}


interface LeaveRequest {
    leave_id: number;
    user_id: number;
    type_id: number;
    start_date: string; // Dates are strings from backend, will be converted to Date objects for comparison
    end_date: string;
    reason: string;
    status:
        | "Pending"
        | "Approved"
        | "Rejected"
        | "Cancelled"
        | "Awaiting_Admin_Approval";
    required_approvals: number;
    applied_at: string;
    leaveType: {
        type_id: number;
        name: string;
    };
    user?: { // User details for the leave applicant
        user_id: number;
        name: string;
        email: string;
    };
}

interface LeaveType { // For AdminLeaveTypes, if fetched
    type_id: number;
    name: string;
    requires_approval: boolean;
    is_balance_based: boolean;
}

interface LeaveApproval { // For ApprovalHistory
    approval_id: number;
    leave_id: number;
    approver_id: number;
    action: "Pending" | "Approved" | "Rejected" | "Cancelled"; // Ensure "Cancelled" is a valid action if used
    comments?: string;
    approved_at: string;
    leave: LeaveRequest;  // Nested leave details
    approver: AuthUser;   // Nested approver details
}
// --- END: Interface Definitions ---


function Dashboard() {
    // TODO: Resolve the 'as unknown as AuthContextType' cast.
    // useAuth should ideally return a correctly and fully typed AuthContextType.
    const {
        user,
        // token, // token is used implicitly by api calls if requiredAuth is true
        logout,
        isAuthenticated,
        loading: authLoading,
    } = useAuth() as unknown as AuthContextType;

    const navigate = useNavigate();

    const [userLeaveBalances, setUserLeaveBalances] = useState<LeaveBalance[]>([]);
    const [loadingBalances, setLoadingBalances] = useState(true);
    const [errorBalances, setErrorBalances] = useState<string | null>(null);

    const [userLeaveRequests, setUserLeaveRequests] = useState<LeaveRequest[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [errorHistory, setErrorHistory] = useState<string | null>(null);

    const [adminLeaveTypes, setAdminLeaveTypes] = useState<LeaveType[]>([]);
    const [loadingAdminTypes, setLoadingAdminTypes] = useState(true);
    const [errorAdminTypes, setErrorAdminTypes] = useState<string | null>(null);

    const [approvalHistory, setApprovalHistory] = useState<LeaveApproval[]>([]);
    const [loadingApprovals, setLoadingApprovals] = useState(true);
    const [errorApprovals, setErrorApprovals] = useState<string | null>(null);

    const [cancellingLeaveId, setCancellingLeaveId] = useState<number | null>(null);
    const [cancelError, setCancelError] = useState<string | null>(null);
    const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);

    const isAdmin = user?.role_id === ADMIN_ROLE_ID;
    const isManager = user?.role_id === MANAGER_ROLE_ID;
    const isManagerOrAdmin = user && (user.role_id === MANAGER_ROLE_ID || user.role_id === ADMIN_ROLE_ID);
    const isEmployee = user?.role_id === EMPLOYEE_ROLE_ID || user?.role_id === INTERN_ROLE_ID;


    const fetchLeaveBalances = async () => {
        setLoadingBalances(true);
        setErrorBalances(null);
        try {
            const balancesDataFromApi: RawLeaveBalance[] = await api("/api/leaves/balance", "GET");
            
            const processedBalances: LeaveBalance[] = balancesDataFromApi.map((balance) => ({
                ...balance,
                total_days: parseFloat(String(balance.total_days)),
                used_days: parseFloat(String(balance.used_days)),
            }));
            setUserLeaveBalances(processedBalances);
        } catch (err: any) {
            console.error("Dashboard: Error fetching leave balances:", err);
            setErrorBalances(err.message || "Failed to fetch leave balances.");
        } finally {
            setLoadingBalances(false);
        }
    };

    useEffect(() => {
        if (!authLoading && isAuthenticated && user && !isAdmin) {
            fetchLeaveBalances();
        } else if (!authLoading) {
            setUserLeaveBalances([]);
            setLoadingBalances(false);
        }
    }, [authLoading, isAuthenticated, user, isAdmin]);

    useEffect(() => {
        const fetchLeaveHistory = async () => {
            setLoadingHistory(true);
            setErrorHistory(null);
            try {
                const historyData: LeaveRequest[] = await api("/api/leaves/my", "GET");
                setUserLeaveRequests(historyData);
            } catch (err: any) {
                console.error("Dashboard: Error fetching leave history:", err);
                setErrorHistory(err.message || "Failed to fetch leave history.");
            } finally {
                setLoadingHistory(false);
            }
        };

        if (!authLoading && isAuthenticated && user && !isAdmin) {
            fetchLeaveHistory();
        } else if (!authLoading) {
            setUserLeaveRequests([]);
            setLoadingHistory(false);
        }
    }, [authLoading, isAuthenticated, user, isAdmin]);

    useEffect(() => {
        const fetchApprovalHistory = async () => {
            setLoadingApprovals(true);
            setErrorApprovals(null);
            try {
                const historyData: LeaveApproval[] = await api("/api/leaves/approvals/history", "GET");
                setApprovalHistory(historyData);
            } catch (err: any) {
                console.error("Dashboard: Error fetching approval history:", err);
                setErrorApprovals(err.message || "Failed to fetch approval history.");
            } finally {
                setLoadingApprovals(false);
            }
        };

        if (!authLoading && isAuthenticated && user && isManagerOrAdmin) {
            fetchApprovalHistory();
        } else if (!authLoading) {
            setApprovalHistory([]);
            setLoadingApprovals(false);
        }
    }, [authLoading, isAuthenticated, user, isManagerOrAdmin]);

    useEffect(() => {
        const fetchAdminLeaveTypes = async () => {
            setLoadingAdminTypes(true);
            setErrorAdminTypes(null);
            try {
                const typesData: LeaveType[] = await api("/api/admin/leave-types", "GET");
                setAdminLeaveTypes(typesData);
            } catch (err: any) {
                console.error("Dashboard: Error fetching Admin leave types:", err);
                setErrorAdminTypes(err.message || "Failed to fetch admin leave types.");
            } finally {
                setLoadingAdminTypes(false);
            }
        };

        if (!authLoading && isAuthenticated && isAdmin) {
            fetchAdminLeaveTypes();
        } else if (!authLoading) {
            setAdminLeaveTypes([]);
            setLoadingAdminTypes(false);
        }
    }, [authLoading, isAuthenticated, isAdmin, user]);


    useEffect(() => {
        let successTimerId: number | undefined; // Use undefined for initial state
        let errorTimerId: number | undefined;

        if (cancelSuccess) {
            successTimerId = window.setTimeout(() => {
                setCancelSuccess(null);
            }, 3000); 
        }

        if (cancelError) {
            errorTimerId = window.setTimeout(() => {
                setCancelError(null);
            }, 5000); 
        }

        return () => { 
            if (successTimerId) window.clearTimeout(successTimerId);
            if (errorTimerId) window.clearTimeout(errorTimerId);
        };
    }, [cancelSuccess, cancelError]);


    const handleCancelLeave = async (leaveId: number, wasApproved: boolean) => {
        if (!window.confirm("Are you sure you want to cancel this leave request?")) {
            return;
        }

        setCancellingLeaveId(leaveId);
        setCancelError(null); 
        setCancelSuccess(null);

        try {
            await api(`/api/leaves/my/${leaveId}/cancel`, "PUT");

            setUserLeaveRequests((prevRequests) =>
                prevRequests.map((request) =>
                    request.leave_id === leaveId
                        ? { ...request, status: "Cancelled" as LeaveRequest['status'] }
                        : request
                )
            );
            
            setCancelSuccess(`Leave request ${leaveId} cancelled successfully.`);

            if (wasApproved) {
                await fetchLeaveBalances(); 
            }

        } catch (err: any) {
            console.error(`Dashboard: Error cancelling leave request ID ${leaveId}:`, err);
            const errorMessage = err.response?.data?.message || err.message || `Failed to cancel leave request ${leaveId}.`;
            setCancelError(errorMessage);
        } finally {
            setCancellingLeaveId(null);
        }
    };

    const handleLogout = () => {
        logout(); 
        navigate("/login");
    };

    if (authLoading) {
        return <div className="dashboard-loading">Loading authentication state...</div>;
    }

    if (!isAuthenticated || !user) {
        console.warn("Dashboard rendered without user/authentication after authLoading is false.");
        navigate("/login", { replace: true }); 
        return <div className="dashboard-unauthenticated">Not authenticated. Redirecting to login...</div>;
    }

    return (
        <div className="dashboard-container">
            <h2 className="page-title">Dashboard</h2>
            <p className="welcome-message">
                Welcome, <strong>{user.name}</strong>! ({user.email})
                {isEmployee && user.manager && (
                    <div className="manager-card">
                        <span className="manager-label">Reports to:</span>
                        <span className="manager-name">{user.manager.name}</span>
                        {user.manager.email && <span className="manager-email">({user.manager.email})</span>}
                    </div>
                )}
                {isEmployee && user.manager_id === null && (
                    <div className="manager-card no-manager">
                        <span className="manager-label">No Manager Assigned</span>
                    </div>
                )}
            </p>
            <hr />

            {/* Action Feedback Area for Cancellation */}
            {cancelSuccess && <p className="success-message" style={{ color: 'green' }}>{cancelSuccess}</p>}
            {cancelError && <p className="error-message" style={{ color: 'red' }}>Error: {cancelError}</p>}


            <h3>Navigation</h3>
            <div className="dashboard-nav">
                {!isAdmin && (
                    <p className="nav-link"><Link to="/apply-leave">Apply for Leave</Link></p>
                )}
                {isManagerOrAdmin && (
                    <p className="nav-link"><Link to="/approvals">View Pending Approvals</Link></p>
                )}
                {isManager && (
                    <p className="nav-link"><Link to="/my-team">My Team</Link></p>
                )}
                {isAdmin && (
                    <>
                        <p className="nav-link"><Link to="/admin/leave-types">Manage Leave Types</Link></p>
                        <p className="nav-link"><Link to="/admin/users">Manage Users</Link></p>
                    </>
                )}
                {isAuthenticated && (
                    <p className="nav-link"><Link to="/calendar">View Calendar</Link></p>
                )}
            </div>
            <hr />

            {user.role_id !== ADMIN_ROLE_ID && (
                <div className="role-specific-section leave-balances-section">
                    <h3>Your Leave Balances</h3>
                    {loadingBalances && <p className="loading-message">Loading leave balances...</p>}
                    {!loadingBalances && errorBalances && !userLeaveBalances.length && (
                        <p className="error-message" style={{ color: "red" }}>Error: {errorBalances}</p>
                    )}
                    {!loadingBalances && !errorBalances && userLeaveBalances.length > 0 && (
                        <table className="leave-table balances-table">
                            <thead>
                                <tr>
                                    <th>Leave Type</th>
                                    <th>Year</th>
                                    <th>Total Days</th>
                                    <th>Used Days</th>
                                    <th>Available Days</th>
                                </tr>
                            </thead>
                            <tbody>
                                {userLeaveBalances.map((balance) => (
                                    <tr key={balance.balance_id}>
                                        <td>{balance.leaveType?.name || "N/A"}</td>
                                        <td>{balance.year}</td>
                                        <td>{balance.total_days.toFixed(2)}</td>
                                        <td>{balance.used_days.toFixed(2)}</td>
                                        <td>{(balance.total_days - balance.used_days).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {!loadingBalances && !errorBalances && userLeaveBalances.length === 0 && (
                        <p className="no-data-message">No leave balances found for the current year.</p>
                    )}
                </div>
            )}
            <hr />

            {user.role_id !== ADMIN_ROLE_ID && (
                <div className="role-specific-section leave-history-section">
                    <h3>Your Leave Request History</h3>
                    {loadingHistory && <p className="loading-message">Loading leave history...</p>}
                    {!loadingHistory && errorHistory && !userLeaveRequests.length && (
                        <p className="error-message" style={{ color: "red" }}>Error: {errorHistory}</p>
                    )}
                    {!loadingHistory && !errorHistory && userLeaveRequests.length > 0 && (
                        <table className="leave-table history-table">
                            <thead>
                                <tr>
                                    <th>Leave Type</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Applied At</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {userLeaveRequests.map((request) => {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const leaveStartDate = new Date(request.start_date);
                                    leaveStartDate.setHours(0, 0, 0, 0);

                                    const canCancelPending = request.status === "Pending";
                                    const canCancelApproved = request.status === "Approved" && today < leaveStartDate;

                                    return (
                                        <tr key={request.leave_id}>
                                            <td>{request.leaveType?.name || "N/A"}</td>
                                            <td>{new Date(request.start_date).toLocaleDateString()}</td>
                                            <td>{new Date(request.end_date).toLocaleDateString()}</td>
                                            <td>{request.reason}</td>
                                            <td
                                                className={`status-${request.status.toLowerCase().replace(/_/g, '-')}`}
                                                style={{
                                                    color:
                                                        request.status === "Approved" ? "green"
                                                        : request.status === "Rejected" ? "red"
                                                        : request.status === "Pending" ? "orange"
                                                        : request.status === "Cancelled" ? "grey"
                                                        : request.status === "Awaiting_Admin_Approval" ? "blueviolet"
                                                        : "black",
                                                }}
                                            >
                                                {request.status.replace(/_/g, " ")}
                                            </td>
                                            <td>{new Date(request.applied_at).toLocaleString()}</td>
                                            <td>
                                                {(canCancelPending || canCancelApproved) && (
                                                    <button
                                                        className="cancel-button"
                                                        onClick={() => handleCancelLeave(request.leave_id, request.status === "Approved")}
                                                        disabled={cancellingLeaveId === request.leave_id || loadingHistory}
                                                    >
                                                        {cancellingLeaveId === request.leave_id ? "Cancelling..." : "Cancel"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                    {!loadingHistory && !errorHistory && userLeaveRequests.length === 0 && (
                        <p className="no-data-message">No leave history found.</p>
                    )}
                </div>
            )}
            <hr />

            {isManagerOrAdmin && (
                <div className="role-specific-section approval-history-section">
                    <h3>{isAdmin ? "All Approval History" : "Your Approval History"}</h3>
                    {loadingApprovals && <p className="loading-message">Loading approval history...</p>}
                    {!loadingApprovals && errorApprovals && (
                        <p className="error-message" style={{ color: "red" }}>Error: {errorApprovals}</p>
                    )}
                    {!loadingApprovals && !errorApprovals && approvalHistory.length > 0 && (
                        <table className="leave-table approval-history-table">
                            <thead>
                                <tr>
                                    <th>Applicant Name</th>
                                    <th>Leave Type</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th>Reason</th>
                                    <th>Action Taken</th>
                                    <th>Approver</th>
                                    <th>Action At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {approvalHistory.map((approval) => (
                                    <tr key={approval.approval_id}>
                                        <td>{approval.leave.user?.name || "N/A"}</td>
                                        <td>{approval.leave.leaveType?.name || "N/A"}</td>
                                        <td>{new Date(approval.leave.start_date).toLocaleDateString()}</td>
                                        <td>{new Date(approval.leave.end_date).toLocaleDateString()}</td>
                                        <td>{approval.leave.reason}</td>
                                        <td
                                            className={`status-${approval.action.toLowerCase()}`}
                                            style = {{
                                                color: approval.action === "Approved" ? "green" : approval.action === "Rejected" ? "red" : "black"
                                            }}
                                        >
                                            {approval.action.replace(/_/g, " ")}
                                        </td>
                                        <td>{approval.approver?.name || "N/A"}</td>
                                        <td>{new Date(approval.approved_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {!loadingApprovals && !errorApprovals && approvalHistory.length === 0 && (
                        <p className="no-data-message">No approval history found.</p>
                    )}
                </div>
            )}

            <button className="logout-button" onClick={handleLogout}>
                Logout
            </button>
        </div>
    );
}

export default Dashboard;