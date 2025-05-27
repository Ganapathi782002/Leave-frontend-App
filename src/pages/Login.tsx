import { useState, FormEvent, JSX } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import './LoginPage.css';
import api from "../api/api";
import { toast } from 'react-toastify';
import { AuthUser } from "../context/Authcontext";

interface StructuredError extends Error {
  response?: {
    data?: {
      message?: string;
    };
  };
}

function Login(): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();

    setError("");
    setLoginLoading(true);

    if (!email || !password) {
      toast.warn("Please enter both email and password.");
      setLoginLoading(false);
      return;
    }

    try {
      const response: { token: string; user: AuthUser } = await api(
        "/api/auth/login",
        "POST",
        { email, password },
        false
      );

      if (response && response.token && response.user) {
        login(response.token, response.user);
        toast.success("Login successful! Redirecting...");
        navigate("/dashboard");
      } else {
        toast.error("Login failed. Please check credentials.");
      }
    } catch (err: any) {
      const structuredError = err as StructuredError;

      if (structuredError.response?.data?.message) {
        toast.error(structuredError.response.data.message);
      } else if (structuredError.message) {
        toast.error(`Error: ${structuredError.message}`);
      } else {
        toast.error("An unknown error occurred during login.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loginLoading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loginLoading}
          />
        </div>
        {error && (
          <p className="error-message" style={{ color: "red" }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={loginLoading} className="login-button">
          {loginLoading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

export default Login;