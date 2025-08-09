import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, HelpCircle, Mail } from 'lucide-react';

const Help = () => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState(null);
  const [activeSection, setActiveSection] = useState('faq');

  // Set document title
  useEffect(() => {
    document.title = "Jade | Help & Support";
  }, []);

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
    <div className="min-h-screen bg-white">
      <style jsx>{`
        :root {
          --sg-blue: #0065bd;
          --sg-blue-dark: #005eb8;
          --sg-blue-darker: #00437d;
          --sg-blue-light: #d9eeff;
          --sg-blue-lighter: #f0f8ff;
          --sg-blue-lightest: #e6f3ff;
          --sg-blue-border: rgba(0,101,189,0.64);
          --sg-blue-text: #00437d;
          --sg-blue-hover: #004a9f;
          --sg-gray: #5e5e5e;
          --sg-gray-dark: #333333;
          --sg-gray-light: #ebebeb;
          --sg-gray-lighter: #f8f8f8;
          --sg-gray-border: #b3b3b3;
          --sg-gray-bg: #f8f8f8;
          --sg-text-primary: #333333;
          --sg-text-secondary: #5e5e5e;
          --sg-text-inverse: #ffffff;
          --sg-space-xs: 4px;
          --sg-space-sm: 8px;
          --sg-space-md: 16px;
          --sg-space-lg: 24px;
          --sg-space-xl: 32px;
          --sg-space-xxl: 48px;
          --sg-font-family: 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          --radius: 8px;
        }

        .sg-page-header {
          background: var(--sg-blue-dark);
          color: var(--sg-text-inverse);
          padding: var(--sg-space-xl) 0;
          padding-bottom: var(--sg-space-lg);
        }

        .sg-page-header-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 var(--sg-space-lg);
        }

        .sg-page-header-breadcrumb {
          margin-bottom: var(--sg-space-md);
        }

        .sg-page-header-title {
          font-family: var(--sg-font-family);
          font-size: 2.25rem;
          font-weight: 700;
          line-height: 1.25;
          color: var(--sg-text-inverse);
          margin-bottom: var(--sg-space-md);
        }

        .sg-page-header-description {
          font-family: var(--sg-font-family);
          font-size: 1rem;
          line-height: 1.5;
          color: var(--sg-text-inverse);
          margin-bottom: var(--sg-space-lg);
        }

        .sg-contents-sticky {
          position: sticky;
          top: var(--sg-space-lg);
          align-self: flex-start;
          background: white;
          border-radius: var(--radius);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: var(--sg-space-lg);
          max-height: calc(100vh - var(--sg-space-xl));
          overflow-y: auto;
        }

        .sg-contents-nav {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .sg-contents-item {
          margin: 0;
          padding: 0;
        }

        .sg-contents-link {
          display: flex;
          align-items: center;
          padding: var(--sg-space-sm) var(--sg-space-md);
          text-decoration: none;
          color: var(--sg-blue);
          font-family: var(--sg-font-family);
          font-size: 1rem;
          font-weight: 400;
          line-height: 1.5;
          border-left: 4px solid transparent;
          transition: all 0.2s ease-in-out;
          cursor: pointer;
          margin: 2px 0;
        }

        .sg-contents-link::before {
          content: '–';
          margin-right: var(--sg-space-sm);
          color: var(--sg-blue);
          font-weight: 400;
        }

        .sg-contents-link:hover {
          background-color: var(--sg-blue-light);
          border-left-color: var(--sg-blue);
          text-decoration: none;
        }

        .sg-contents-link-active {
          background-color: var(--sg-blue-lightest);
          border-left-color: var(--sg-blue);
          font-weight: 500;
          color: var(--sg-blue);
        }

        .sg-contents-link-active::before {
          font-weight: 700;
        }

        .sg-section-separator {
          border-bottom: 1px solid var(--sg-gray-border);
          padding-bottom: var(--sg-space-sm);
          margin-bottom: var(--sg-space-lg);
        }

        .sg-dataset-tile {
          background: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          border: 1px solid var(--sg-gray-light);
          border-radius: var(--radius);
          padding: var(--sg-space-lg);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .sg-dataset-tile::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--sg-blue), var(--sg-blue-hover));
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
        }

        .sg-dataset-tile:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 101, 189, 0.15);
          border-color: var(--sg-blue-light);
        }

        .sg-dataset-tile:hover::before {
          transform: scaleX(1);
        }

        .sg-dataset-title {
          font-family: var(--sg-font-family);
          font-size: 1.375rem;
          font-weight: 700;
          line-height: 2rem;
          letter-spacing: 0.15px;
          color: var(--sg-blue);
          margin-bottom: var(--sg-space-sm);
          transition: color 0.2s ease-in-out;
        }

        .sg-dataset-tile:hover .sg-dataset-title {
          color: var(--sg-blue-hover);
        }

        .sg-dataset-description {
          font-family: var(--sg-font-family);
          font-size: 1.1875rem;
          line-height: 2rem;
          letter-spacing: 0.15px;
          color: var(--sg-text-primary);
          margin-bottom: var(--sg-space-sm);
        }

        .sg-faq-content {
          font-family: var(--sg-font-family);
          font-size: 1rem;
          line-height: 1.5;
          color: var(--sg-text-secondary);
        }

        .sg-faq-button {
          transition: background-color 0.2s ease, transform 0.2s ease;
        }

        .sg-faq-button:hover {
          background-color: var(--sg-blue-lightest);
          transform: translateY(-1px);
        }

        .sg-contact-button {
          background-color: var(--sg-blue);
          border-color: var(--sg-blue);
          transition: all 0.2s ease-in-out;
        }

        .sg-contact-button:hover {
          background-color: var(--sg-blue-hover);
          border-color: var(--sg-blue-hover);
          transform: translateY(-1px);
        }

        .sg-contact-button:active {
          transform: translateY(0);
        }
      `}</style>

      {/* Blue page header section */}
      <div className="sg-page-header">
        <div className="sg-page-header-container">
          {/* Breadcrumb */}
          <nav className="sg-page-header-breadcrumb">
            <div className="flex items-center gap-2 text-base">
              <button 
                onClick={() => navigate('/workflows')}
                className="text-white hover:text-[#d9eeff] hover:no-underline underline cursor-pointer transition-colors duration-200"
              >
                Workflows
              </button>
              <span className="text-white">&gt;</span>
              <span className="text-white">Help & Support</span>
            </div>
          </nav>

          {/* Page title */}
          <h1 className="sg-page-header-title">
            Help & Support
          </h1>

          {/* Page description - constrained to 75% width */}
          <div className="w-3/4">
            <p className="sg-page-header-description">
              Find answers to common questions and get support for managing your workflows in Jade
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar - 25% width with sticky contents */}
        <div className="w-1/4 shrink-0">
          <div className="sg-contents-sticky">
            <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-4">
              Contents
            </h2>
            <nav>
              <ul className="sg-contents-nav">
                {[
                  { id: 'faq', label: 'Frequently Asked Questions' },
                  { id: 'contact', label: 'Contact Support' }
                ].map(section => (
                  <li key={section.id} className="sg-contents-item">
                    <button
                      onClick={() => handleJumpLinkClick(section.id)}
                      className={`sg-contents-link w-full text-left ${activeSection === section.id ? 'sg-contents-link-active' : ''}`}
                    >
                      {section.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {/* Main content - 75% width */}
        <div className="w-3/4 space-y-12">
          {/* FAQ Section */}
          <section id="faq">
            <div className="sg-section-separator">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                Frequently Asked Questions
              </h2>
            </div>
            <div className="prose prose-lg max-w-none">
              <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                Answers to common questions about using Jade for managing your workflows
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
                  <div key={faq.id} className="sg-dataset-tile">
                    <button
                      onClick={() => toggleExpand(faq.id)}
                      className="sg-faq-button flex items-center justify-between w-full p-4 rounded-lg"
                    >
                      <h3 className="text-sm font-medium text-gray-900">{faq.title}</h3>
                      {expandedId === faq.id ? (
                        <ChevronUp className="h-6 w-6 text-gray-700" />
                      ) : (
                        <ChevronDown className="h-6 w-6 text-gray-700" />
                      )}
                    </button>
                    <div
                      className={`p-4 sg-faq-content transition-all duration-300 ease-in-out ${
                        expandedId === faq.id ? 'block' : 'hidden'
                      }`}
                    >
                      <p dangerouslySetInnerHTML={{ __html: faq.content }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Contact Support Section */}
          <section id="contact">
            <div className="sg-section-separator">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                Contact Support
              </h2>
            </div>
            <div className="prose prose-lg max-w-none">
              <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                Need further assistance? Our support team is here to help with your Dagster workflows.
              </p>
              <div className="sg-dataset-tile">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center bg-gray-50 w-12 h-12 border border-gray-200 rounded-lg">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <Link
                      to="/contact"
                      className="sg-contact-button inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 px-4 py-2 rounded-lg"
                    >
                      Contact Us
                    </Link>
                    <p className="sg-faq-content mt-2">
                      Reach out to our support team for personalized assistance or to report issues.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Help;