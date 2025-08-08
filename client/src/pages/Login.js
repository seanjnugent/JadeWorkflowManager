import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { Mail, Eye, EyeOff, Lock, X } from "lucide-react";
import "../jade.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/users/user/refresh`, { refresh_token: refreshToken });
        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState({ message: "", type: "" });
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [lockedUntil, setLockedUntil] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError({ message: "", type: "" });
    setRemainingAttempts(null);
    setLockedUntil(null);

    try {
      const response = await api.post('/users/user/authenticate', {
        email_address: email,
        password
      });

      const { access_token, refresh_token, user_id, role } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('userId', user_id);
      localStorage.setItem('userRole', role);
      navigate('/home');
    } catch (err) {
      console.error('Login error:', err);

      if (err.response?.data?.detail) {
        const errorDetail = err.response.data.detail;

        if (errorDetail.error_code === "account_locked") {
          setError({
            message: "Your account is locked. Please try again later.",
            type: "locked"
          });
          setLockedUntil(errorDetail.lockedUntil);
        } else if (errorDetail.error_code === "invalid_credentials") {
          setError({
            message: "Invalid email or password",
            type: "credentials"
          });
          if (errorDetail.remainingAttempts !== null) {
            setRemainingAttempts(errorDetail.remainingAttempts);
          }
        } else {
          setError({
            message: errorDetail.message || "An unexpected error occurred",
            type: "generic"
          });
        }
      } else {
        setError({
          message: err.message || "An unexpected error occurred",
          type: "generic"
        });
      }

      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left Side - Animated Gradient Background */}
      <div className="login-left-side">
        <motion.div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(
              135deg,
              #1e3c72 0%,
              #2a5298 25%,
              #3a6073 50%,
              #16222a 75%,
              #0b979c 100%
            )`,
            backgroundSize: '300% 300%'
          }}
          animate={{
            backgroundPosition: [
              '0% 0%',
              '100% 100%',
              '0% 0%'
            ]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <div className="relative z-10 flex items-center justify-center w-full p-16">
          <div className="text-left text-white space-y-8 max-w-xl w-full">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              <h1 className="text-5xl font-bold tracking-tight">Jade</h1>
              <div className="h-px w-32 bg-white/30 my-6"></div>
              <p className="text-lg font-light text-white/90">
                Data Workflow Manager
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 text-white/80">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                <span className="text-sm">Execute pipelines and process data in the cloud</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-right-side">
        <div className="login-form-container">
          <div className="sg-workflow-card">
            {/* Header with Scottish Government Logo */}
            <div className="login-header">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/0/01/Scottish_Government_Logo.svg"
                alt="Scottish Government"
                className="h-12 mx-auto mb-6"
              />
              <h1 className="login-title">Sign In</h1>
              <p className="login-subtitle">Access your Jade account</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Error Message */}
              {error.message && (
                <div className={`error-message ${
                  error.type === "locked" ? "error-locked" : "error-credentials"
                }`}>
                  <div className="flex justify-between items-center">
                    <p className="font-medium">{error.message}</p>
                    <button 
                      onClick={() => setError({ message: "", type: "" })} 
                      className="error-close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {lockedUntil && (
                    <p className="error-detail">
                      Locked until: {new Date(lockedUntil).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}
                    </p>
                  )}
                  {remainingAttempts !== null && remainingAttempts > 0 && (
                    <p className="error-detail">
                      {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
                    </p>
                  )}
                </div>
              )}

              {/* Email Field */}
              <div className="input-container">
                <label htmlFor="email" className="input-label">
                  Email Address
                </label>
                <div className="input-field">
                  <Mail className="input-icon" />
                  <input
                    type="email"
                    id="email"
                    required
                    placeholder="your.name@gov.scot"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-element"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="input-container">
                <label htmlFor="password" className="input-label">
                  Password
                </label>
                <div className="input-field">
                  <Lock className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-element"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="form-footer">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                  Remember me
                </label>
                <a
                  href="#"
                  className="forgot-password"
                >
                  Forgot password?
                </a>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="submit-button"
              >
                {isLoading ? (
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Contact Admin */}
            <div className="contact-admin">
              <p className="contact-text">
                Need access to the platform?{' '}
                <a
                  href="#"
                  className="contact-link"
                >
                  Contact your administrator
                </a>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="login-footer">
            <p className="footer-text">
              This is a prototype only and contains no real data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;