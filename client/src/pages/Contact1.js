import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, AlertCircle, Github, MessageSquare, FileQuestion, Bug } from 'lucide-react';

const Contact = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [activeSection, setActiveSection] = useState('contact-form');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Simulate API call - replace with actual endpoint
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSubmitStatus('success');
      setFormData({
        name: '',
        email: '',
        subject: '',
        category: 'general',
        message: ''
      });
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactMethods = [
    {
      icon: <Mail className="h-6 w-6" />,
      title: 'Email Support',
      description: 'Get in touch with support via email',
      action: 'Send Email',
      href: 'mailto:support@workflows.gov.scot'
    },
    {
      icon: <Github className="h-6 w-6" />,
      title: 'GitHub Issues',
      description: 'Report bugs or request features',
      action: 'View Repository',
      href: 'https://github.com/seanjnugent/DataWorkflowTool'
    }
  ];

  const supportCategories = [
    {
      icon: <MessageSquare className="h-8 w-8" />,
      title: 'General Enquiry',
      description: 'Questions about the platform or getting started',
      value: 'general'
    },
    {
      icon: <FileQuestion className="h-8 w-8" />,
      title: 'Workflow Help',
      description: 'Need assistance with creating or running workflows',
      value: 'workflow'
    },
    {
      icon: <Bug className="h-8 w-8" />,
      title: 'Technical Issue',
      description: 'Report bugs, errors, or technical problems',
      value: 'technical'
    },
    {
      icon: <Github className="h-8 w-8" />,
      title: 'Feature Request',
      description: 'Suggest improvements or new features',
      value: 'feature'
    }
  ];

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
          --radius: 4px;
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
          border-bottom: 1px solid #b3b3b3;
          padding-bottom: var(--sg-space-sm);
          margin-bottom: var(--sg-space-lg);
        }

        .sg-dataset-tile {
          background: white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--sg-gray-light);
          border-radius: var(--radius);
          padding: var(--sg-space-lg);
          display: block;
          text-decoration: none;
          cursor: pointer;
          transition: box-shadow 0.2s ease-in-out;
        }

        .sg-dataset-tile:hover {
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .sg-dataset-title {
          font-family: var(--sg-font-family);
          font-size: 1.375rem;
          font-weight: 700;
          line-height: 2rem;
          letter-spacing: 0.15px;
          color: var(--sg-blue);
          margin-bottom: 8px;
          text-decoration: none;
          transition: color 0.2s ease-in-out;
        }

        .sg-dataset-tile:hover .sg-dataset-title {
          color: var(--sg-blue-hover);
          text-decoration: underline;
        }

        .sg-dataset-description {
          font-family: var(--sg-font-family);
          font-size: 1.1875rem;
          line-height: 2rem;
          letter-spacing: 0.15px;
          color: var(--sg-text-primary);
          margin-bottom: 8px;
          text-decoration: none;
        }

        .sg-form-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid var(--sg-gray-border);
          border-radius: var(--radius);
          font-family: var(--sg-font-family);
          font-size: 1rem;
          line-height: 1.5;
          color: var(--sg-text-primary);
          background-color: white;
          transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }

        .sg-form-input:focus {
          outline: none;
          border-color: var(--sg-blue);
          box-shadow: 0 0 0 3px rgba(0, 101, 189, 0.1);
        }

        .sg-form-label {
          display: block;
          font-family: var(--sg-font-family);
          font-size: 1rem;
          font-weight: 500;
          color: var(--sg-text-primary);
          margin-bottom: var(--sg-space-sm);
        }

        .sg-button-primary {
          display: inline-flex;
          align-items: center;
          gap: var(--sg-space-sm);
          padding: 12px 24px;
          background-color: var(--sg-blue);
          color: var(--sg-text-inverse);
          border: 2px solid var(--sg-blue);
          border-radius: var(--radius);
          font-family: var(--sg-font-family);
          font-size: 1rem;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }

        .sg-button-primary:hover {
          background-color: var(--sg-blue-hover);
          border-color: var(--sg-blue-hover);
        }

        .sg-button-primary:disabled {
          background-color: var(--sg-gray-light);
          border-color: var(--sg-gray-light);
          color: var(--sg-gray);
          cursor: not-allowed;
        }

        .sg-alert-success {
          background-color: #d1f2eb;
          border: 1px solid #a7f3d0;
          border-radius: var(--radius);
          padding: var(--sg-space-md);
          color: #064e3b;
        }

        .sg-alert-error {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: var(--radius);
          padding: var(--sg-space-md);
          color: #991b1b;
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
              <span className="text-white">Contact</span>
            </div>
          </nav>

          {/* Page title */}
          <h1 className="sg-page-header-title">
            Contact Support
          </h1>

          {/* Page description - constrained to 75% width */}
          <div className="w-3/4">
            <p className="sg-page-header-description">
              Get help with workflows, report issues, or provide feedback. Our support team is here to assist you with any questions about the Scottish Government Workflow Management Platform.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar - 25% width with sticky contents */}
          <div className="w-1/4 shrink-0">
            <div className="sg-contents-sticky">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-4">
                Contents
              </h2>
              
              <nav>
                <ul className="sg-contents-nav">
                  <li className="sg-contents-item">
                    <button
                      onClick={() => setActiveSection('contact-form')}
                      className={`sg-contents-link w-full text-left ${activeSection === 'contact-form' ? 'sg-contents-link-active' : ''}`}
                    >
                      Contact form
                    </button>
                  </li>
                  <li className="sg-contents-item">
                    <button
                      onClick={() => setActiveSection('contact-methods')}
                      className={`sg-contents-link w-full text-left ${activeSection === 'contact-methods' ? 'sg-contents-link-active' : ''}`}
                    >
                      Contact methods
                    </button>
                  </li>
                  <li className="sg-contents-item">
                    <button
                      onClick={() => setActiveSection('support-hours')}
                      className={`sg-contents-link w-full text-left ${activeSection === 'support-hours' ? 'sg-contents-link-active' : ''}`}
                    >
                      Support hours
                    </button>
                  </li>
                  <li className="sg-contents-item">
                    <button
                      onClick={() => setActiveSection('office-locations')}
                      className={`sg-contents-link w-full text-left ${activeSection === 'office-locations' ? 'sg-contents-link-active' : ''}`}
                    >
                      Office locations
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>

          {/* Main content - 75% width */}
          <div className="w-3/4">
            {/* Contact Form Section */}
            <section id="contact-form" className="mb-12 pt-6">
              <div className="sg-section-separator">
                <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                  Contact form
                </h2>
              </div>
              
              <div className="prose prose-lg max-w-none">
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                  Use this form to get in touch with our support team. We'll respond to your enquiry as soon as possible.
                </p>

                {submitStatus === 'success' && (
                  <div className="sg-alert-success mb-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Message sent successfully!</span>
                    </div>
                    <p className="mt-2">Thank you for contacting us. We'll get back to you within 24 hours.</p>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="sg-alert-error mb-6">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">Failed to send message</span>
                    </div>
                    <p className="mt-2">Please try again or contact us using the alternative methods below.</p>
                  </div>
                )}

                {/* Support Categories */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">What do you need help with?</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {supportCategories.map((category) => (
                      <label
                        key={category.value}
                        className={`cursor-pointer p-4 rounded-lg border-2 transition-all duration-200 ${
                          formData.category === category.value
                            ? 'border-[#0065bd] bg-[#e6f3ff]'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="category"
                          value={category.value}
                          checked={formData.category === category.value}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className="flex items-start gap-3">
                          <div className={`${formData.category === category.value ? 'text-[#0065bd]' : 'text-gray-400'}`}>
                            {category.icon}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{category.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Contact Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="sg-form-label">
                        Full name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="sg-form-input"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="sg-form-label">
                        Email address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="sg-form-input"
                        placeholder="Enter your email address"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="sg-form-label">
                      Subject *
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="sg-form-input"
                      placeholder="Brief description of your enquiry"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="sg-form-label">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={6}
                      className="sg-form-input resize-vertical"
                      placeholder="Please provide details about your enquiry, including any error messages or workflow names if relevant..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="sg-button-primary"
                  >
                    {isSubmitting ? (
                      <div className="h-5 w-5 animate-spin border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              </div>
            </section>

            {/* Contact Methods Section */}
            <section id="contact-methods" className="mb-12">
              <div className="sg-section-separator">
                <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                  Contact methods
                </h2>
              </div>
              
              <div className="prose prose-lg max-w-none">
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                  Choose the contact method that works best for you. Our team is available to help through multiple channels.
                </p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {contactMethods.map((method, index) => (
                    <div key={index} className="sg-dataset-tile text-center">
                      <div className="flex justify-center mb-4">
                        <div className="p-3 bg-[#e6f3ff] rounded-full text-[#0065bd]">
                          {method.icon}
                        </div>
                      </div>
                      <h3 className="sg-dataset-title text-center">
                        {method.title}
                      </h3>
                      <p className="sg-dataset-description text-center mb-4">
                        {method.description}
                      </p>
                      <p className="text-sm text-gray-600 mb-4 font-mono">
                        {method.contact}
                      </p>
                      <a
                        href={method.href}
                        className="sg-button-primary w-full justify-center"
                        target={method.href.startsWith('http') ? '_blank' : undefined}
                        rel={method.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      >
                        {method.action}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </section>


          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;