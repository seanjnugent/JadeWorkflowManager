import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Workflow, History, Mail, HelpCircle, Plus, Settings } from 'lucide-react';
import '../jade.css'; // Import the CSS file

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const Hero = ({ user }) => {
  return (
    <div className="sg-page-header">
      <div className="sg-page-header-container">
        <h1 className="sg-page-header-title">Hi {user ? `${user.first_name}` : ''},</h1>

        <div className="w-3/4">
          <p className="sg-page-header-description">
            Welcome to your data pipeline management portal, providing access to tools for creating, monitoring, and managing your workflows and runs.
          </p>
        </div>
      </div>
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Fetch user info
  useEffect(() => {
    const fetchUser = async () => {
      const userId = localStorage.getItem('userId');
      const accessToken = localStorage.getItem('access_token');
      if (!userId || !accessToken) {
        navigate('/login', { replace: true });
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/users/user/${userId}`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('userId');
            navigate('/login', { replace: true });
            return;
          }
          throw new Error('Failed to fetch user data');
        }

        const data = await response.json();
        if (!data.user) throw new Error('User not found');
        setUser(data.user);
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };

    fetchUser();
  }, [navigate]);

  return (
    <div className="bg-gray-50">
      <Hero user={user} />

      <section className="bg-gray-50">
        <div className="sg-tiles-container-2x2">
          {/* Browse Workflows Tile */}
          <a href="/workflows" className="sg-tile" onClick={(e) => { e.preventDefault(); navigate('/workflows'); }}>
            <h2>
              <span className="sg-tile-icon">
                <Workflow className="w-6 h-6 text-[#0065bd]" />
              </span>
              Browse Workflows
            </h2>
            <p>Explore and manage your data processing pipelines and workflows with our intuitive interface.</p>
          </a>

          {/* View History Tile */}
          <a href="/runs" className="sg-tile" onClick={(e) => { e.preventDefault(); navigate('/runs'); }}>
            <h2>
              <span className="sg-tile-icon">
                <History className="w-6 h-6 text-[#0065bd]" />
              </span>
              View History
            </h2>
            <p>Monitor the execution history and status of your workflow runs with detailed insights.</p>
          </a>

          {/* Get in Touch Tile */}
          <a href="/contact" className="sg-tile" onClick={(e) => { e.preventDefault(); navigate('/contact'); }}>
            <h2>
              <span className="sg-tile-icon">
                <Mail className="w-6 h-6 text-[#0065bd]" />
              </span>
              Get in Touch
            </h2>
            <p>Contact our support team for assistance with your data pipelines and technical questions.</p>
          </a>

          {/* How to Use This Site Tile */}
          <a href="/help" className="sg-tile" onClick={(e) => { e.preventDefault(); navigate('/help'); }}>
            <h2>
              <span className="sg-tile-icon">
                <HelpCircle className="w-6 h-6 text-[#0065bd]" />
              </span>
              How to Use This Site
            </h2>
            <p>Learn how to navigate, manage, and utilize the data pipeline portal effectively.</p>
          </a>

          {/* Admin-only Tiles */}
          {user?.is_admin && (
            <>
              {/* New Workflow Tile */}
              <a href="/workflows/new" className="sg-tile" onClick={(e) => { e.preventDefault(); navigate('/workflows/new/'); }}>
                <h2>
                  <span className="sg-tile-icon">
                    <Plus className="w-6 h-6 text-[#0065bd]" />
                  </span>
                  New Workflow
                </h2>
                <p>Create a new data pipeline or ETL process for your datasets with our workflow builder.</p>
              </a>

              {/* Settings Tile */}
              <a href="/settings" className="sg-tile" onClick={(e) => { e.preventDefault(); navigate('/settings'); }}>
                <h2>
                  <span className="sg-tile-icon">
                    <Settings className="w-6 h-6 text-[#0065bd]" />
                  </span>
                  Settings
                </h2>
                <p>Configure your account preferences and manage data pipeline settings and permissions.</p>
              </a>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;