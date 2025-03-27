import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
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
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Base background with animation */}
      <style jsx>{`
        @keyframes gradientBg {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        
        .animated-gradient {
          background: linear-gradient(
            -45deg,
            #130a9c,  
            #0000ff,  
            #7c3aed,  /* vibrant purple */
            #2dd4bf,  /* mint teal */
            #1f1fff,  /* light green */
            #60a5fa,  /* sky blue */
            #7879ff,  /* vibrant pink */
            #bfbfff      /* soft lavender */
          );
          background-size: 800% 800%;
          animation: gradientBg 30s ease infinite;  /* Slowed down the animation */
        }

        .diagonal-fade {
          background: linear-gradient(100deg, transparent 0%, rgba(255, 255, 255, 0.1) 100%);
          backdrop-filter: blur(10px);
          transform: skewY(-10deg);
        }
      `}</style>
      
      <div className="absolute inset-0 animated-gradient" />
      
      {/* Moving overlay */}
      <div className="absolute inset-0 opacity-50">
        <div className="absolute inset-0 diagonal-fade" />
      </div>

      <div className="relative min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-xl">
              </div>
            </div>
            <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-white to-white/80 text-transparent bg-clip-text tracking-tight">
              Welcome Back
            </h1>
            <p className="text-white/80 text-lg">Sign in to your account</p>
          </div>

          <div className="backdrop-blur-xl bg-white/10 p-8 rounded-3xl shadow-2xl border border-white/10">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-hover:text-white/80 transition-colors duration-300">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-black/5 backdrop-blur-xl rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-300 text-white placeholder-white/50 border border-white/10"
                    placeholder="Enter your email"
                  />
                </div>

                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-hover:text-white/80 transition-colors duration-300">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-black/5 backdrop-blur-xl rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-300 text-white placeholder-white/50 border border-white/10"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-white/80 hover:text-white text-sm transition-colors duration-300"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="w-full group relative overflow-hidden px-6 py-4 bg-gradient-to-r from-white/90 to-white/80 hover:from-white hover:to-white text-violet-600 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 font-semibold"
              >
                <span>Sign In</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-white/80 mb-2">Don't have an account?</p>
              <button
                onClick={() => navigate("/register")}
                className="text-white hover:text-white/90 transition-colors duration-300"
              >
                Create an account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;