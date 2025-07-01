import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const verifyToken = async () => {
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (!accessToken) {
        setIsAuthenticated(false);
        return;
      }

      try {
        // Verify access token
        const response = await fetch(`${API_BASE_URL}/users/user/verify`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          setIsAuthenticated(true);
          return;
        }

        // If access token is invalid, try refreshing
        if (refreshToken) {
          const refreshResponse = await fetch(`${API_BASE_URL}/users/user/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ refresh_token: refreshToken })
          });

          const refreshData = await refreshResponse.json();

          if (refreshResponse.ok) {
            localStorage.setItem('access_token', refreshData.access_token);
            setIsAuthenticated(true);
          } else {
            throw new Error('Refresh token invalid or expired');
          }
        } else {
          throw new Error('No refresh token available');
        }
      } catch (err) {
        console.error('Authentication error:', err);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('userId');
        setIsAuthenticated(false);
      }
    };

    verifyToken();
  }, []);

  if (isAuthenticated === null) {
    return <div>Loading...</div>; // Show loading state while verifying
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;