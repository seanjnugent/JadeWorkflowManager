import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { Mail, Eye, EyeOff } from "lucide-react";

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

      const { access_token, refresh_token, user_id } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('userId', user_id);
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
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* Left Side - Animated Gradient Background */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
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
              <h1 className="text-5xl font-light tracking-tight">Pierre</h1>
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
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-16">
        <div className="w-full max-w-md space-y-8">
          {/* Header with Scottish Government Logo */}
          <div className="text-center">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/0/01/Scottish_Government_Logo.svg"
              alt="Scottish Government"
              className="h-12 mx-auto mb-6"
            />
            <h1 className="text-xl font-semibold text-gray-900">Sign In</h1>
          </div>

          {/* Login Form Card */}
          <div className="bg-white border border-gray-300 p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Error Message */}
              {error.message && (
                <div className={`p-4 text-sm ${
                  error.type === "locked"
                    ? "bg-amber-50 border border-amber-200 text-amber-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}>
                  <p className="font-medium">{error.message}</p>
                  {lockedUntil && (
                    <p className="mt-1 text-xs opacity-80">
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
                    <p className="mt-1 text-xs opacity-80">
                      {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
                    </p>
                  )}
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    required
                    placeholder="your.name@gov.scot"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-9 px-2 pl-8 border border-gray-300 text-sm text-gray-900 focus:border-blue-900"
                  />
                  <Mail className="absolute left-2 top-2.5 h-4 w-4 text-gray-600" />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-9 px-2 pr-8 border border-gray-300 text-sm text-gray-900 focus:border-blue-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-2.5 text-gray-600 hover:text-gray-900"
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
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-gray-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 border-gray-300 text-blue-900 focus:ring-blue-900"
                  />
                  Remember me
                </label>
                <a
                  href="#"
                  className="text-blue-900 hover:underline"
                >
                  Forgot password?
                </a>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full text-sm font-medium text-white bg-blue-900 border border-blue-900 hover:bg-blue-800 py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Contact Admin */}
            <div className="mt-6 pt-4 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600">
                Need access to the platform?{' '}
                <a
                  href="#"
                  className="text-blue-900 hover:underline font-medium"
                >
                  Contact your administrator
                </a>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-600">
              This is a prototype only and contains no real data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;