import { useState, useEffect, FormEvent, JSX } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../api/api";
import { useNavigate, Link } from "react-router-dom";
import "./ApplyLeave.css";

interface LeaveType {
  type_id: number;
  name: string;
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

  const navigate = useNavigate();

  const { user, token } = useAuth();

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

    if (token) {
      fetchLeaveTypes();
    } else {
      setLoadingTypes(false);
      setErrorTypes("Not authenticated to fetch leave types.");
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
          exceeding 5 working days require approval from both your Manager and
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
          {loadingTypes && (
            <p className="loading-types-message">Loading leave types...</p>
          )}
          {errorTypes && (
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
              disabled={loading || loadingTypes}
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
            disabled={loading || loadingTypes}
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
            disabled={loading || loadingTypes}
          />
        </div>

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
          disabled={loading || loadingTypes}
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