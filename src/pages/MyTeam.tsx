import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api';
import './MyTeam.css';

// Define interfaces for the data received from the backend
interface LeaveBalanceDetail {
    type_id: number;
    type_name: string;
    total_days: number;
    used_days: number;
    available_days: number;
}

interface TeamMember {
    user_id: number;
    name: string;
    email: string;
    role_id: number;
    role_name: string;
    balances: LeaveBalanceDetail[];
}

interface AuthUser {
    user_id: number;
    name: string;
    email: string;
    role_id: number;
    manager_id?: number | null;
}

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (newToken: string, newUser: any) => void;
    logout: () => void;
}

const MANAGER_ROLE_ID = 3;
const EMPLOYEE_ROLE_ID = 2;
const INTERN_ROLE_ID = 4;

const MyTeam: React.FC = () => {
    const { user, isAuthenticated, loading: authLoading } = useAuth() as unknown as AuthContextType;
    const navigate = useNavigate();

    const [teamData, setTeamData] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Categorized lists
    const [employees, setEmployees] = useState<TeamMember[]>([]);
    const [interns, setInterns] = useState<TeamMember[]>([]);

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || user?.role_id !== MANAGER_ROLE_ID)) {
            navigate('/dashboard');
        }
    }, [authLoading, isAuthenticated, user, navigate]);

    useEffect(() => {
        const fetchTeamData = async () => {
            if (!authLoading && isAuthenticated && user?.role_id === MANAGER_ROLE_ID) {
                setLoading(true);
                setError(null);
                try {
                    const data: TeamMember[] = await api('/api/team/my-team-balances', 'GET');
                    setTeamData(data);

                    // Separate employees and interns
                    const fetchedEmployees: TeamMember[] = [];
                    const fetchedInterns: TeamMember[] = [];
                    data.forEach(member => {
                        if (member.role_id === EMPLOYEE_ROLE_ID) {
                            fetchedEmployees.push(member);
                        } else if (member.role_id === INTERN_ROLE_ID) {
                            fetchedInterns.push(member);
                        }
                    });
                    setEmployees(fetchedEmployees);
                    setInterns(fetchedInterns);

                } catch (err: any) {
                    console.error('Error fetching team leave balances:', err);
                    setError(err.message || 'Failed to fetch team leave balances.');
                } finally {
                    setLoading(false);
                }
            } else if (!authLoading) {
                setLoading(false);
            }
        };

        fetchTeamData();
    }, [isAuthenticated, user, authLoading]);

    const sortedEmployees = useMemo(() => {
        let sortableItems = [...employees];
        if (sortConfig !== null && ['name', 'email'].includes(sortConfig.key)) { // Only sort by name/email
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key as keyof TeamMember];
                const bValue = b[sortConfig.key as keyof TeamMember];
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [employees, sortConfig]);

    const sortedInterns = useMemo(() => {
        let sortableItems = [...interns];
        if (sortConfig !== null && ['name', 'email'].includes(sortConfig.key)) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key as keyof TeamMember];
                const bValue = b[sortConfig.key as keyof TeamMember];
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [interns, sortConfig]);


    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) {
            return '';
        }
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    if (loading) {
        return <div className="my-team-container my-team-loading">Loading team data...</div>;
    }

    if (error) {
        return (
            <div className="my-team-container">
                <p className="my-team-error">Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="my-team-container">
            <div className="my-team-header">
                <h2>My Team's Leave Balances</h2>
                <Link to="/dashboard" className="back-to-dashboard-btn">Back to Dashboard</Link>
            </div>

            {employees.length === 0 && interns.length === 0 && (
                <p className="no-data-message">No direct reports found or no leave balances configured for your team.</p>
            )}

            {employees.length > 0 && (
                <div className="team-section employees-section">
                    <h3>Employees</h3>
                    <div className="table-responsive">
                        <table className="my-team-table">
                            <thead>
                                <tr>
                                    <th onClick={() => requestSort('name')}>Employee Name{getSortIndicator('name')}</th>
                                    <th onClick={() => requestSort('email')}>Email{getSortIndicator('email')}</th>
                                    <th>Casual Leave (Taken / Total)</th>
                                    <th>Sick Leave (Taken / Total)</th>
                                    {/* Add other fixed leave types here if needed for employees */}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedEmployees.map(member => {
                                    const casualLeave = member.balances.find(b => b.type_name === 'Casual Leave');
                                    const sickLeave = member.balances.find(b => b.type_name === 'Sick Leave');

                                    return (
                                        <tr key={member.user_id}>
                                            <td>{member.name}</td>
                                            <td>{member.email}</td>
                                            <td>
                                                {casualLeave ?
                                                    `${casualLeave.used_days.toFixed(1)} / ${casualLeave.total_days.toFixed(1)}` :
                                                    '0.0 / 0.0'}
                                            </td>
                                            <td>
                                                {sickLeave ?
                                                    `${sickLeave.used_days.toFixed(1)} / ${sickLeave.total_days.toFixed(1)}` :
                                                    '0.0 / 0.0'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {interns.length > 0 && (
                <div className="team-section interns-section">
                    <h3>Interns</h3>
                    <div className="table-responsive">
                        <table className="my-team-table intern-table">
                            <thead>
                                <tr>
                                    <th onClick={() => requestSort('name')}>Intern Name{getSortIndicator('name')}</th>
                                    <th onClick={() => requestSort('email')}>Email{getSortIndicator('email')}</th>
                                    <th>Total Leave Taken</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedInterns.map(member => {
                                    const totalTaken = member.balances.reduce((sum, balance) => sum + balance.used_days, 0);
                                    return (
                                        <tr key={member.user_id}>
                                            <td>{member.name}</td>
                                            <td>{member.email}</td>
                                            <td>{totalTaken.toFixed(1)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyTeam;