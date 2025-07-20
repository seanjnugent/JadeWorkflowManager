import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronDown } from 'lucide-react';

const Help = () => {
  useEffect(() => {
    document.title = "Cobalt | Help";
  }, []);

  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
            >
              <X className="h-4 w-4" />
              Back
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900">Help & Support</h1>
            <p className="text-gray-600 text-sm mt-1">
              Find answers to common questions and get support for managing your Dagster workflows in Cobalt
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-300 p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Frequently Asked Questions</h2>
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
                content: 'Your API token is available on the Profile page under "Security." Use this token in the Authorization header (Bearer token) to authenticate API requests. To trigger a workflow, send a POST request to the /workflows/run endpoint with the workflow ID. Check the API documentation for detailed parameters and examples.'
              },
              {
                id: 'faq-7',
                title: 'How do I configure notifications for workflow events?',
                content: 'On the Profile page, view your notification preferences under "Preferences." Currently, email notifications are enabled by default for critical events (e.g., run failures). Contact your administrator to enable Slack notifications or modify settings, as this feature is admin-controlled.'
              }
            ].map((faq) => (
              <div key={faq.id} className="border border-gray-200 bg-white">
                <button
                  onClick={() => toggleExpand(faq.id)}
                  className="flex items-center justify-between w-full p-4 cursor-pointer bg-gray-50 hover:bg-gray-100"
                >
                  <h3 className="text-sm font-medium text-gray-900">{faq.title}</h3>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-700 transform transition-transform duration-300 ${
                      expandedId === faq.id ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div className={`p-4 ${expandedId === faq.id ? 'block' : 'hidden'}`}>
                  <p className="text-sm text-gray-600">{faq.content}</p>
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-sm font-medium text-gray-900 mt-8 mb-4">Contact Support</h2>
          <p className="text-sm text-gray-600 mb-4">
            If you can’t find the answer to your question or need assistance with your Dagster workflows, please contact our support team. We’re here to help!
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-900 border border-blue-900 hover:bg-blue-800 px-4 py-2"
          >
            Contact us
          </Link>
        </div>
      </div>
    </main>
  );
};

export default Help;