import { useState, useEffect, FormEvent, JSX, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../api/api";
import { useNavigate, Link } from "react-router-dom";
import "./ApplyLeave.css";

interface LeaveType {
  type_id: number;
  name: string;
  is_balance_based: boolean;
}

interface LeaveBalance {
  balance_id: number;
  user_id: number;
  type_id: number;
  year: number;
  total_days: number;
  used_days: number;
  leaveType: LeaveType;
}

function ApplyLeave(): JSX.Element {
  const [leaveType, setLeaveType] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [todayString, setTodayString] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState<boolean>(true);
  const [errorTypes, setErrorTypes] = useState<string | null>(null);

  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState<boolean>(true);
  const [errorBalances, setErrorBalances] = useState<string | null>(null);

  const navigate = useNavigate();

  const { user, token } = useAuth();

  const calculateWorkingDays = (start: string, end: string): number => {
    if (!start || !end) return 0;

    const startDateObj = new Date(start);
    const endDateObj = new Date(end);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      return 0;
    }

    let count = 0;
    const currentDate = new Date(startDateObj.getTime());

    while (currentDate <= endDateObj) {
      const dayOfWeek = currentDate.getDay();

      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
    return count;
  };

  const calculatedWorkingDays = useMemo(() => {
    return calculateWorkingDays(startDate, endDate);
  }, [startDate, endDate]);

  const selectedLeaveBalance = useMemo(() => {
    const selectedTypeId = parseInt(leaveType, 10);
    if (isNaN(selectedTypeId)) return null;
    const currentYear = new Date().getFullYear();
    return leaveBalances.find(
      (balance) =>
        balance.type_id === selectedTypeId && balance.year === currentYear
    );
  }, [leaveType, leaveBalances]);

  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    setTodayString(`${year}-${month}-${day}`);
  }, []);

  useEffect(() => {
    const fetchLeaveTypes = async () => {
      setLoadingTypes(true);
      setErrorTypes(null);
      try {
        const typesData = await api("/api/leaves/types", "GET") as LeaveType[];
        setLeaveTypes(typesData);
        console.log("Fetched leave types:", typesData);
      } catch (err: any) {
        console.error("Error fetching leave types:", err);
        setErrorTypes(err.message || "Failed to fetch leave types.");
      } finally {
        setLoadingTypes(false);
      }
    };

    const fetchLeaveBalances = async () => {
      setLoadingBalances(true);
      setErrorBalances(null);
      try {
        const balancesData = await api("/api/leaves/balance", "GET") as LeaveBalance[];
        setLeaveBalances(balancesData);
        console.log("Fetched leave balances:", balancesData);
      } catch (err: any) {
        console.error("Error fetching leave balances:", err);
        setErrorBalances(err.message || "Failed to fetch leave balances.");
      } finally {
        setLoadingBalances(false);
      }
    };

    if (token) {
      fetchLeaveTypes();
      fetchLeaveBalances();
    } else {
      setLoadingTypes(false);
      setErrorTypes("Not authenticated to fetch leave types.");
      setLoadingBalances(false);
      setErrorBalances("Not authenticated to fetch leave balances.");
    }
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setSuccess(false);

    if (!leaveType || !startDate || !endDate || !reason) {
      setError("All fields are required.");
      setLoading(false);
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      setError("Invalid date range. Ensure start date is not after end date.");
      setLoading(false);
      return;
    }

    const selectedLeaveTypeDetails = leaveTypes.find(type => type.type_id === parseInt(leaveType, 10));

    if (selectedLeaveTypeDetails && selectedLeaveTypeDetails.is_balance_based && selectedLeaveBalance) {
      const available = selectedLeaveBalance.total_days - selectedLeaveBalance.used_days;
      if (calculatedWorkingDays > available) {
        setError(`Insufficient balance for ${selectedLeaveTypeDetails.name}. Available: ${available}, Requested: ${calculatedWorkingDays}`);
        setLoading(false);
        return;
      }
    }

    const leaveData = {
      type_id: parseInt(leaveType, 10),
      start_date: startDate,
      end_date: endDate,
      reason: reason,
    };

    try {
      const responseData = await api("/api/leaves", "POST", leaveData);

      console.log("Leave request submitted successfully:", responseData);
      setSuccess(true);

      setLeaveType("");
      setStartDate("");
      setEndDate("");
      setReason("");

      const updatedBalancesData = await api("/api/leaves/balance", "GET") as LeaveBalance[];
      setLeaveBalances(updatedBalancesData);

      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err: any) {
      console.error("Error submitting leave request:", err);
      setError(err.message || "Failed to submit leave request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="apply-leave-container">
      <h2>Applying Leave</h2>
      {user && (
        <p className="applying-as-info">
          Applying as: <strong>{user.name}</strong>
        </p>
      )}

      <div className="leave-info-message">
        <p>
          <strong>Please note:</strong> Leave duration is calculated based on
          Working days. Weekends (Saturdays and Sundays) are automatically
          excluded and are not counted as leave days.
        </p>
      </div>
      <div className="leave-info-approval-rule">
        <p>
          <strong>Important:</strong>Leave requests
          exceeding 5 working days require approval from both Manager and
          Admin.
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && (
        <div className="success-message">
          Leave request submitted successfully! Redirecting...
        </div>
      )}

      <form onSubmit={handleSubmit} className="leave-form">
        <div className="form-group">
          <label htmlFor="leaveType">Leave Type:</label>
          {(loadingTypes || loadingBalances) && (
            <p className="loading-types-message">Loading leave types and balances...</p>
          )}
          {(errorTypes || errorBalances) && (
            <p className="error-types-message">
              Error loading leave types: {errorTypes}
            </p>
          )}

          {!loadingTypes && !errorTypes && (
            <select
              id="leaveType"
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              required
              disabled={loading || loadingTypes || loadingBalances}
            >
              <option value="">Select Leave Type</option>
              {leaveTypes.map((type) => (
                <option key={type.type_id} value={type.type_id}>
                  {type.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="startDate">Start Date:</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            min={todayString}
            disabled={loading || loadingTypes || loadingBalances}
          />
        </div>

        <div className="form-group">
          <label htmlFor="endDate">End Date:</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            min={startDate || todayString}
            disabled={loading || loadingTypes || loadingBalances}
          />
        </div>

        {(startDate && endDate && calculatedWorkingDays > 0) && (
          <div className="calculated-leave-info">
            <p>
              Requested Leave Days: <strong>{calculatedWorkingDays}</strong>
              {selectedLeaveBalance && (
                <>
                  <br />
                  Available {selectedLeaveBalance.leaveType.name} Balance:{" "}
                  <strong>
                    {(selectedLeaveBalance.total_days - selectedLeaveBalance.used_days).toFixed(2)}
                  </strong>
                </>
              )}
            </p>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="reason">Reason:</label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            disabled={loading || loadingTypes}
            rows={4}
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={loading || loadingTypes || loadingBalances}
          className="submit-button"
        >
          {loading ? "Submitting..." : "Submit Leave Request"}
        </button>
      </form>

      <div className="back-link-container">
        <p>
          <Link to="/dashboard">Back to Dashboard</Link>
        </p>
      </div>
    </div>
  );
}

export default ApplyLeave;