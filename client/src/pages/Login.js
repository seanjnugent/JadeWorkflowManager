import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/postUserAuthentication`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email_address: email, password }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Received non-JSON response');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('token', '12345');
      localStorage.setItem('userId', data.userId);
      navigate('/home');
    } catch (err) {
      console.error('Full error:', err);
      setError(err.message || 'An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 relative overflow-hidden flex">
      {/* Animated Blue Gradient Left Side */}
  {/* Animated Blue Gradient Left Side */}
<div className="hidden lg:block w-1/2 relative overflow-hidden">
  {/* Animated Gradient Background - Now 150% size to prevent edge visibility */}
  <motion.div 
    className="absolute -inset-[25%]" // Increased size by 25% on all sides
    style={{
      background: `linear-gradient(
        -45deg, 
        #1e3c72, #2a5298, #3a6073, 
        #16222a, #3a6073, #1e3c72
      )`,
      backgroundSize: '400% 400%'
    }}
    animate={{
      backgroundPosition: [
        '0% 50%', 
        '100% 50%', 
        '0% 50%'
      ]
    }}
    transition={{
      duration: 15,
      repeat: Infinity,
      ease: "linear"
    }}
  />

  {/* Overlay with Soft Blur - Also enlarged */}
  <motion.div 
    className="absolute -inset-[15%]" // Slightly smaller than the gradient
    style={{
      background: `radial-gradient(
        circle at 30% 30%, 
        rgba(30, 60, 114, 0.7), 
        rgba(58, 96, 115, 0.5), 
        transparent 50%
      )`,
      backdropFilter: 'blur(50px)',
      opacity: 0.8
    }}
    animate={{
      scale: [1, 1.05, 1],
      rotate: [0, 5, -5, 0]
    }}
    transition={{
      duration: 10,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  />
  
  {/* Content remains the same */}
  <div className="relative h-full flex items-center justify-center p-12 z-10">
    <div className="max-w-md space-y-6 text-white">
      <h1 className="text-5xl font-bold">
        Conduit
      </h1>
      <p className="text-xl text-white/80">
        Transform your data workflows with intelligent automation
      </p>
      <div className="flex items-center gap-4">
        <div className="w-2 h-2 bg-white/70 rounded-full animate-pulse" />
        <span className="text-white/70 text-sm">Secure cloud processing</span>
      </div>
    </div>
  </div>
</div>

      {/* Login Form Section */}
      <div className="w-full lg:w-1/2 bg-white shadow-2xl">
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Welcome Back
              </h2>
              <p className="text-gray-500">Sign in to your data workflow platform</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-gray-800 placeholder-gray-500 border border-gray-200"
                    placeholder="Work email"
                    required
                  />
                </div>

                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-gray-800 placeholder-gray-500 border border-gray-200"
                    placeholder="Password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative inline-flex items-center justify-center px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-medium"
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4 ml-2 -mr-1" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center text-sm">
              <button
                onClick={() => navigate("/register")}
                className="text-gray-600 hover:text-blue-600 transition-colors duration-200 font-medium"
              >
                Create account
              </button>
              <span className="mx-2 text-gray-400">·</span>
              <button
                className="text-gray-600 hover:text-blue-600 transition-colors duration-200 font-medium"
              >
                Recover access
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;