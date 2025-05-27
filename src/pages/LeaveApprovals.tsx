import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../api/api';
import { Link } from 'react-router-dom';
import './LeaveApprovals.css';

interface Leave {
    leave_id: number;
    user_id: number;
    type_id: number;
    start_date: string;
    end_date: string; 
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Awaiting_Admin_Approval';
    required_approvals: number;
    applied_at: string;
    processed_by_id?: number | null;
    processed_at?: string | null;
    leaveType: {
        type_id: number;
        name: string;
    };
    user: {
        user_id: number;
        name: string;
        email: string;
        role_id: number;
    };
}

interface ErrorResponse {
    message: string;
}

interface UpdateLeaveStatusSuccessResponse {
    message: string;
    leaveId: number;
    newStatus: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Awaiting_Admin_Approval';
}


interface AuthUser {
    user_id: number;
    name: string;
    email: string;
    role_id: number;
}

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    logout: () => void;
}

const MANAGER_ROLE_ID = 3;
const ADMIN_ROLE_ID = 1;


function LeaveApprovals() {
    const { user, token } = useAuth() as AuthContextType;

    const [pendingLeaves, setPendingLeaves] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false); 
    const [actionError, setActionError] = useState<string | null>(null); 
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);


    const isManagerOrAdmin = user && (user.role_id === MANAGER_ROLE_ID || user.role_id === ADMIN_ROLE_ID);


    useEffect(() => {
        const fetchPendingLeaves = async () => {
            setLoading(true);
            setError(null);
            try {
                let endpoint = '';
          
                if (user?.role_id === MANAGER_ROLE_ID) {
                  
                    endpoint = '/api/manager/pending-requests';
                    console.log('Fetching pending requests for Manager from:', endpoint);
                } else if (user?.role_id === ADMIN_ROLE_ID) {
                    
                    endpoint = '/api/admin/leave-requests/approvals-needed';
                    console.log('Fetching pending requests for Admin from:', endpoint);
                } else {
                    
                    setLoading(false);
                    setError('Invalid role to view pending requests.');
                    return;
                }

            
                if (endpoint) {
                    
                    const pendingData: Leave[] = await api(endpoint, 'GET');
                    setPendingLeaves(pendingData);
                    console.log('Fetched pending leave requests:', pendingData);
                }


            } catch (err: any) {
                console.error('Error fetching pending leave requests:', err);
                const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch pending leave requests.';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        if (user && token && isManagerOrAdmin) {
            fetchPendingLeaves();
        } else {
             
            setLoading(false);
            if (!token) {
                setError('Not authenticated to view this page.');
            } else if (user && !isManagerOrAdmin) {
                setError('Forbidden: You do not have permission to view this page.');
            }
        }

    }, [token, user, isManagerOrAdmin, MANAGER_ROLE_ID, ADMIN_ROLE_ID]);

    const handleProcessLeave = async (leaveId: number, status: 'Approved' | 'Rejected') => {
        
        if (!user || !user.role_id) {
            setActionError("User information missing. Cannot process leave.");
            return;
        }

        setIsSubmitting(true);
        setActionError(null);
        setActionSuccess(null);

        try {
            let endpoint = '';
            if (user.role_id === MANAGER_ROLE_ID) {
                endpoint = `/api/leaves/status/${leaveId}`;
                console.log(`Processing leave ${leaveId} as Manager. Calling endpoint: ${endpoint}`);
            } else if (user.role_id === ADMIN_ROLE_ID) {
                endpoint = `/api/admin/leave-requests/${leaveId}/status`;
                console.log(`Processing leave ${leaveId} as Admin. Calling endpoint: ${endpoint}`);
            } else {
                setActionError("Invalid role to process leave requests.");
                setIsSubmitting(false);
                return;
            }

             if (!endpoint) {
                setActionError("Could not determine processing endpoint for your role.");
                setIsSubmitting(false);
                return;
            }

            const response: UpdateLeaveStatusSuccessResponse = await api(
                endpoint, 
                'PUT',
                { status }
            );

            console.log(`Leave request ${leaveId} processed with status ${status}:`, response);
            setActionSuccess(`Leave request ${leaveId} ${status.toLowerCase()} successfully.`);
            setPendingLeaves(prevLeaves => prevLeaves.filter(leave => leave.leave_id !== leaveId));


        } catch (err: any) {
            console.error(`Error processing leave request ${leaveId}:`, err);
            const errorMessage = err.response?.data?.message || err.message || `Failed to process leave request ${leaveId} with status ${status}.`;
            setActionError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };


    
    const handleApprove = async (leaveId: number) => {
        await handleProcessLeave(leaveId, 'Approved');
    };

    
    const handleReject = async (leaveId: number) => {
        await handleProcessLeave(leaveId, 'Rejected');
    };


    
    if (!user) {
         return <div>Redirecting to login...</div>;
    }

    if (!isManagerOrAdmin) {
         return (
             <div className="leave-approvals-container">
                 <h2>Access Denied</h2>
                 <p>You do not have the necessary permissions to view this page.</p>
                 <p><Link to="/dashboard">Back to Dashboard</Link></p>
             </div>
         );
    }


    return (
        <div className="leave-approvals-container">
            <h2>{user.role_id === ADMIN_ROLE_ID ? 'Admin Leave Approvals' : 'Manager Leave Approvals'}</h2>

            {loading && <p className="loading-message">Loading pending leave requests...</p>}
            
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}

            
            {actionError && <p className="action-error">Action Error: {actionError}</p>}
            {actionSuccess && <p className="action-success">Action Success: {actionSuccess}</p>}

            {!loading && !error && pendingLeaves.length > 0 && (
                <table className="pending-requests-table">
                    <thead>
                        <tr>
                            
                            <th>Applicant</th>
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
                        {pendingLeaves.map(leave => (
                            <tr key={leave.leave_id}>
                                
                                <td>{leave.user?.name || 'N/A'} ({leave.user?.email || 'N/A'})</td>
                                
                                <td>{leave.leaveType?.name || 'Unknown Type'}</td>
                                
                                <td>{new Date(leave.start_date).toLocaleDateString()}</td>
                                <td>{new Date(leave.end_date).toLocaleDateString()}</td>
                                <td>{leave.reason}</td>
                                <td>{leave.status.replace(/_/g, ' ')}</td>
                                <td>{new Date(leave.applied_at).toLocaleString()}</td>
                                <td>
                                    
                                    
                                    
                                    {leave.status !== 'Approved' && leave.status !== 'Rejected' && leave.status !== 'Cancelled' && (
                                        <> 
                                            <button
                                                onClick={() => handleApprove(leave.leave_id)}
                                                disabled={isSubmitting}
                                                className="approve-button"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleReject(leave.leave_id)}
                                                disabled={isSubmitting}
                                                className="reject-button"
                                            >
                                                Reject
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {!loading && !error && pendingLeaves.length === 0 && (
                <p className="no-data-message">No pending leave requests found.</p>
            )}

             <p className="back-link-container"><Link to="/dashboard">Back to Dashboard</Link></p>
        </div>
    );
}

export default LeaveApprovals;