import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/clients/postClientAuthentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_address: email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.message || 'Login failed!');
        return;
      }

      const data = await response.json();
      localStorage.setItem('token', '12345');
      localStorage.setItem('userId', data.userId);
      navigate('/home');
    } catch (err) {
      console.error('Error during login:', err);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 relative overflow-hidden flex">
      {/* Animated Gradient Sidebar */}
      <div className="hidden lg:block w-1/2 relative overflow-hidden">
        <motion.div
          initial={{ x: -100, y: -100 }}
          animate={{ x: [0, 100, 0], y: [0, 100, 0] }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/20 via-purple-500/10 to-transparent"
        />
        
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-transparent to-purple-900/20 backdrop-blur-xl" />
        
        <div className="relative h-full flex items-center justify-center p-12">
          <div className="max-w-md space-y-6">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Conduit
            </h1>
            <p className="text-xl text-gray-300">
              Transform your data workflows with intelligent automation
            </p>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-gray-400 text-sm">Secure cloud processing</span>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form Section */}
      <div className="w-full lg:w-1/2 backdrop-blur-xl bg-gray-900/50 border-l border-gray-800">
        <div className="min-h-screen flex items-center justify-center p-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-2">
                Welcome Back
              </h2>
              <p className="text-gray-400">Sign in to your data workflow platform</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-gray-800/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-gray-100 placeholder-gray-500 border border-gray-700 hover:border-gray-600"
                    placeholder="Work email"
                  />
                </div>

                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-gray-800/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-gray-100 placeholder-gray-500 border border-gray-700 hover:border-gray-600"
                    placeholder="Password"
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
                className="w-full relative inline-flex items-center justify-center px-6 py-3.5 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300 rounded-lg transition-all font-medium text-gray-900 hover:shadow-lg hover:shadow-blue-500/20"
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4 ml-2 -mr-1" />
                  </>
                )}
              </motion.button>
            </form>

            <div className="mt-8 text-center text-sm">
              <button
                onClick={() => navigate("/register")}
                className="text-gray-300 hover:text-blue-400 transition-colors duration-200 font-medium"
              >
                Create account
              </button>
              <span className="mx-2 text-gray-600">·</span>
              <button
                className="text-gray-300 hover:text-cyan-400 transition-colors duration-200 font-medium"
              >
                Recover access
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent pointer-events-none" />
    </div>
  );
};

export default Login;