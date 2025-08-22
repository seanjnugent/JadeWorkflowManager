import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { GridLoader } from 'react-spinners';
import { jwtDecode } from 'jwt-decode';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  const refreshAccessToken = async (refreshToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/user/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('access_token', data.access_token);
        return true;
      }
      throw new Error(data.detail || 'Refresh token invalid or expired');
    } catch (err) {
      console.error('Refresh error:', err.message);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('userId');
      return false;
    }
  };

  useEffect(() => {
    const verifyToken = async () => {
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (!accessToken) {
        setIsAuthenticated(false);
        return;
      }

      try {
        // Decode access token to check expiration
        const decoded = jwtDecode(accessToken);
        const currentTime = Date.now() / 1000; // Current time in seconds
        const bufferTime = 5 * 60; // 5 minutes before expiration

        if (decoded.exp < currentTime) {
          // Token expired, try refreshing
          if (refreshToken) {
            const refreshed = await refreshAccessToken(refreshToken);
            setIsAuthenticated(refreshed);
          } else {
            setIsAuthenticated(false);
          }
          return;
        }

        // Proactively refresh if token is nearing expiration
        if (decoded.exp < currentTime + bufferTime && refreshToken) {
          await refreshAccessToken(refreshToken);
        }

        // Verify access token
        const response = await fetch(`${API_BASE_URL}/users/user/verify`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`, // Use updated token
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Token verification failed');
        }

        setIsAuthenticated(true);
      } catch (err) {
        console.error('Authentication error:', err.message);
        setIsAuthenticated(false);
      }
    };

    verifyToken();

    // Periodic check for token expiration
    const interval = setInterval(() => {
      const accessToken = localStorage.getItem('access_token');
      if (accessToken) {
        const decoded = jwtDecode(accessToken);
        const currentTime = Date.now() / 1000;
        const bufferTime = 5 * 60;
        if (decoded.exp < currentTime + bufferTime) {
          verifyToken(); // Refresh if nearing expiration
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <div className="text-center">
          <GridLoader color="#0065bd" size={17.5} margin={7.5} />
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;