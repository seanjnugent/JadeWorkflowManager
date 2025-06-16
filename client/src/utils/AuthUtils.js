import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Logout function to be used across the app
export const logoutUser = async () => {
  const navigate = useNavigate();
  const refreshToken = localStorage.getItem('refresh_token');
  const accessToken = localStorage.getItem('access_token');

  // Optionally notify backend to invalidate refresh token
  if (refreshToken && accessToken) {
    try {
      await fetch(`${API_BASE_URL}/users/user/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
    } catch (err) {
      console.error('Error invalidating refresh token:', err);
      // Proceed with logout even if backend call fails
    }
  }

  // Clear localStorage
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('userId');

  // Redirect to login
  navigate('/login', { replace: true });
};

// Hook version for components needing navigate
export const useLogout = () => {
  const navigate = useNavigate();

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    const accessToken = localStorage.getItem('access_token');

    // Optionally notify backend to invalidate refresh token
    if (refreshToken && accessToken) {
      try {
        await fetch(`${API_BASE_URL}/users/user/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ refresh_token: refreshToken })
        });
      } catch (err) {
        console.error('Error invalidating refresh token:', err);
      }
    }

    // Clear localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('userId');

    // Redirect to login
    navigate('/login', { replace: true });
  };

  return logout;
};