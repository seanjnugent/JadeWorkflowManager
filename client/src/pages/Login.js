    import React, { useState } from "react";
    import { createRoot } from "react-dom/client";
    import { useNavigate } from "react-router-dom";
    import { motion } from "framer-motion";
    import axios from "axios";

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
                <p className="mt-2 text-sm text-gray-600">Sign in to your account</p>
              </div>

              {/* Login Form Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <form onSubmit={handleLogin} className="space-y-6">
                  {/* Error Message */}
                  {error.message && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`p-4 rounded-lg text-sm ${
                        error.type === "locked"
                          ? "bg-amber-50 border border-amber-200 text-amber-800"
                          : "bg-red-50 border border-red-200 text-red-800"
                      }`}
                    >
                      <p className="font-medium">{error.message}</p>
                      {lockedUntil && (
                        <p className="mt-1 text-xs opacity-80">
                          Locked until: {new Date(lockedUntil).toLocaleString()}
                        </p>
                      )}
                      {remainingAttempts !== null && remainingAttempts > 0 && (
                        <p className="mt-1 text-xs opacity-80">
                          {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
                        </p>
                      )}
                    </motion.div>
                  )}

                  {/* Email Field */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
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
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 text-gray-600">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      Remember me
                    </label>
                    <a
                      href="#"
                      className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      Forgot password?
                    </a>
                  </div>

                  {/* Sign In Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Signing in...
                      </div>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </form>

                {/* Contact Admin */}
                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                  <p className="text-sm text-gray-600">
                    Need access to the platform?{' '}
                    <a
                      href="#"
                      className="text-blue-600 hover:text-blue-800 hover:underline transition-colors font-medium"
                    >
                      Contact your administrator
                    </a>
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center mt-6">
                <p className="text-xs text-gray-500">
                  This is a prototype only and contains no real data.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    };

export default Login;