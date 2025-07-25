import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, ChevronDown, ChevronUp, HelpCircle, Mail } from 'lucide-react';

const Help = () => {
  const navigate = useNavigate();
  useEffect(() => {
    document.title = "Jade | Help";
  }, []);

  const [expandedId, setExpandedId] = useState(null);
  const [activeSection, setActiveSection] = useState('faq');

  // Scroll spy functionality
  useEffect(() => {
    const sections = ['faq', 'contact'];

    const observerOptions = {
      root: null,
      rootMargin: '-45px 0px -60% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    sections.forEach((sectionId) => {
      const element = document.getElementById(sectionId);
      if (element) observer.observe(element);
    });

    return () => {
      sections.forEach((sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) observer.unobserve(element);
      });
    };
  }, []);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleJumpLinkClick = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 45;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: elementPosition, behavior: 'smooth' });
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <style>{`
        .sg-workflow-card-simple {
          padding: 24px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
          position: relative;
          overflow: hidden;
        }
        .sg-workflow-card {
          padding: 24px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
          position: relative;
          overflow: hidden;
        }
        .sg-workflow-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #0065bd, #004a9f);
          transform: scaleX(0);
          transition: transform 0.3s ease;
        }
        .sg-workflow-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 101, 189, 0.15), 0 4px 10px rgba(0, 0, 0, 0.08);
          border-color: #0065bd;
        }
        .sg-workflow-card:hover::before {
          transform: scaleX(1);
        }
        .sg-workflow-title {
          font-size: 20px;
          line-height: 28px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 12px;
          transition: color 0.3s ease;
        }
        .sg-workflow-card:hover .sg-workflow-title {
          color: #0065bd;
        }
        .sg-workflow-description {
          font-size: 16px;
          line-height: 24px;
          color: #6b7280;
          transition: color 0.3s ease;
        }
        .sg-workflow-card:hover .sg-workflow-description {
          color: #4b5563;
        }
        .sg-sidebar {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
          border: 1px solid #e5e7eb;
          height: fit-content;
          position: sticky;
          top: 24px;
        }
      `}</style>

      {/* Hero Header */}
      <div className="sg-page-header" style={{ backgroundColor: '#0065bd', color: 'white', padding: '32px 0' }}>
        <div className="sg-page-header-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <nav className="mb-4">
            <div className="flex items-center gap-2 text-blue-100">
              <button
                onClick={() => navigate('/workflows')}
                className="text-white hover:text-blue-200 underline transition-colors"
              >
                Workflows
              </button>
              <span>></span>
              <span className="text-white font-medium">Help & Support</span>
            </div>
          </nav>
          <h1 className="sg-page-header-title" style={{ fontSize: '44px', fontWeight: 'bold', marginBottom: '16px' }}>
            Help & Support
          </h1>
          <div className="w-3/4">
            <p className="sg-page-header-description" style={{ fontSize: '16px', lineHeight: '24px' }}>
              Find answers to common questions and get support for managing your workflows in Jade
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar Navigation */}
        <div className="w-1/4 shrink-0">
          <div className="sg-sidebar">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contents</h2>
            <nav className="space-y-2">
              {[
                { id: 'faq', label: 'Frequently Asked Questions' },
                { id: 'contact', label: 'Contact Support' }
              ].map(section => (
                <button
                  key={section.id}
                  onClick={() => handleJumpLinkClick(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-700 border-l-3 border-blue-600 font-bold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-3/4 space-y-8">
          {/* FAQ Section */}
          <section id="faq" className="sg-workflow-card-simple">
            <h2 className="sg-workflow-title">Frequently Asked Questions</h2>
            <p className="sg-workflow-description mb-6">
              Answers to common questions about using Cobalt for Dagster workflows
            </p>
            <div className="space-y-4">
              {[
                {
                  id: 'faq-1',
                  title: 'How do I create a new workflow?',
                  content: 'To create a new workflow, navigate to the Workflows page and click "New Workflow." Define your pipeline by specifying the data source, transformations, and destination (e.g., API, CSV, or database). Ensure you have the necessary permissions (Admin or Editor role) to create workflows. Save your configuration to make the workflow available for execution.'
                },
                {
                  id: 'faq-2',
                  title: 'How can I monitor my workflow runs?',
                  content: 'Go to the Runs page to view all workflow executions. You can filter runs by ID, Workflow ID, or status (e.g., Completed, Running, Failure). Click on a run to see detailed logs, including start time, error messages, and execution status. The Recent Activity section on the Home page also shows your latest runs.'
                },
                {
                  id: 'faq-3',
                  title: 'What should I do if a workflow run fails?',
                  content: 'On the Runs page, locate the failed run (marked with a red "Failure" badge). Click the run to view the error message in the details. Common issues include misconfigured data sources, invalid transformations, or permission errors. Update the workflow configuration on the Workflows page or contact your admin if the issue persists.'
                },
                {
                  id: 'faq-4',
                  title: 'How do I manage my user permissions?',
                  content: 'Visit the Profile page to view your workflow permissions under the "Workflow Permissions" section. Admins can modify roles (e.g., Admin, Viewer) for specific workflows. If you need elevated permissions, contact your team’s administrator through the Contact Support link.'
                },
                {
                  id: 'faq-5',
                  title: 'How can I update my profile information?',
                  content: 'On the Profile page, click "Change" next to Name, Email, or Role to edit your details. Enter the new information and click "Save." Note that only Admins can change roles. For security, you can also update your password or view your API token on the Profile page.'
                },
                {
                  id: 'faq-6',
                  title: 'How do I use the API to trigger workflows?',
                  content: 'Your API token is available on the Profile page under "Security." Use this token in the Authorization header (Bearer token) to authenticate API requests. To trigger a workflow, send a POST request to the /workflows/run endpoint with the workflow ID. Check the API documentation for detailed parameters and examples. For more details, visit <a href="https://x.ai/api" className="text-blue-600 hover:underline">xAI API Documentation</a>.'
                },
                {
                  id: 'faq-7',
                  title: 'How do I configure notifications for workflow events?',
                  content: 'On the Profile page, view your notification preferences under "Preferences." Currently, email notifications are enabled by default for critical events (e.g., run failures). Contact your administrator to enable Slack notifications or modify settings, as this feature is admin-controlled.'
                }
              ].map((faq) => (
                <div key={faq.id} className="sg-workflow-card">
                  <button
                    onClick={() => toggleExpand(faq.id)}
                    className="flex items-center justify-between w-full p-4 rounded-lg"
                  >
                    <h3 className="text-sm font-medium text-gray-900">{faq.title}</h3>
                    {expandedId === faq.id ? (
                      <ChevronUp className="h-6 w-6 text-gray-700" />
                    ) : (
                      <ChevronDown className="h-6 w-6 text-gray-700" />
                    )}
                  </button>
                  <div
                    className={`p-4 transition-all duration-300 ease-in-out ${
                      expandedId === faq.id ? 'block' : 'hidden'
                    }`}
                  >
                    <p className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: faq.content }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Contact Support Section */}
          <section id="contact" className="sg-workflow-card-simple">
            <h2 className="sg-workflow-title">Contact Support</h2>
            <p className="sg-workflow-description mb-6">
              Need further assistance? Our support team is here to help with your Dagster workflows.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center bg-gray-50 w-12 h-12 border border-gray-200 rounded-lg">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Contact Us
                </Link>
                <p className="text-sm text-gray-600 mt-2">
                  Reach out to our support team for personalized assistance or to report issues.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Help;