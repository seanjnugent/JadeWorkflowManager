import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Workflow, History, Mail, HelpCircle, Plus, Settings } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const Hero = ({ user }) => {
  return (
    <div className="sg-page-header" style={{ backgroundColor: '#0065bd', color: 'white', padding: '48px 0' }}>
      <div className="sg-page-header-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        <h1 className="sg-page-header-title" style={{ fontSize: '44px', fontWeight: 'bold', marginBottom: '32px' }}>Hi {user ? `${user.first_name}` : ''},</h1>

        <div className="w-3/4">
          <p className="sg-page-header-description" style={{ fontSize: '16px', lineHeight: '24px' }}>
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
    <div>
      <style>{`
        .sg-tiles-container-2x2 {
          max-width: 1200px;
          margin: 0 auto;
          padding: 56px 24px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        
        @media (max-width: 768px) {
          .sg-tiles-container-2x2 {
            grid-template-columns: 1fr;
            padding: 32px 16px;
          }
        }
        
        .sg-tile {
          background-color: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 32px;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
          overflow: hidden;
        }
        
        .sg-tile:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 101, 189, 0.15), 0 4px 10px rgba(0, 0, 0, 0.08);
          border-color: #0065bd;
        }
        
        .sg-tile:hover::before {
          transform: scaleX(1);
        }
        
        .sg-tile h2 {
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: color 0.3s ease;
        }
        
        .sg-tile:hover h2 {
          color: #0065bd;
        }
        
        .sg-tile p {
          font-size: 16px;
          color: #6b7280;
          line-height: 1.6;
          margin-top: auto;
          transition: color 0.3s ease;
        }
        
        .sg-tile:hover p {
          color: #4b5563;
        }
        
        .sg-tile-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #e6f2fa, #dbeafe);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        
        .sg-tile:hover .sg-tile-icon {
          background: linear-gradient(135deg, #0065bd, #004a9f);
          transform: scale(1.05);
        }
        
        .sg-tile:hover .sg-tile-icon svg {
          color: white !important;
        }
      `}</style>

      <Hero user={user} />

      <section >
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