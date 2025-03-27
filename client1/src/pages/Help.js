import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const Help = () => {
  useEffect(() => {
    document.title = "Cobalt | Help";
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-800 to-blue-900"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQ0MCIgaGVpZ2h0PSI3NjgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiIGlkPSJhIj48c3RvcCBzdG9wLWNvbG9yPSIjRkZGIiBzdG9wLW9wYWNpdHk9Ii4yNSIgb2Zmc2V0PSIwJSIvPjxzdG9wIHN0b3AtY29sb3I9IiNGRkYiIHN0b3Atb3BhY2l0eT0iMCIgb2Zmc2V0PSIxMDAlIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHBhdGggZD0iTTAgMGgxNDQwdjc2OEgweiIgZmlsbD0idXJsKCNhKSIgZmlsbC1ydWxlPSJldmVub2RkIiBvcGFjaXR5PSIuMiIvPjwvc3ZnPg==')] opacity-30"></div>
        <div className="relative max-w-6xl mx-auto px-8 py-16">
          <nav className="text-sm text-blue-100/80 flex items-center mb-8">
            <span className="hover:text-white cursor-pointer transition-colors duration-200">
              <a href="/home">Home</a>
            </span>
            <span className="mx-2 text-blue-100/40">/</span>
            <span className="text-white">Help & Support</span>
          </nav>
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="md:w-3/4">
              <h1 className="text-4xl font-medium text-white leading-tight">Help & Support</h1>
              <p className="mt-6 text-blue-100 text-lg leading-relaxed">
                Find answers to common questions and get support for the Cobalt Open Data Portal.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-2/3">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-xl font-medium text-gray-900 mb-6">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {[
                  { title: "How do I find data?", body: "You can search for data using keywords in the search boxes or browse the Datasets and Organisations pages." },
                  { title: "How do I download data?", body: "Locate your dataset and download it in CSV format by clicking the download button under the Resources section." },
                  { title: "How do I know if the data is reliable?", body: "Each dataset is accompanied by high-quality metadata and a data dictionary. For more information, contact the data producer." },
                  { title: "How do I use the API?", body: "Datasets with an API endpoint include an API button for easy access to the data programmatically." },
                  { title: "How up to date is the data?", body: "Datasets show their last modification date and update frequency on their respective pages." },
                  { title: "Where else can I find data?", body: "Explore other platforms like Public Health Scotland's Open Data portal or use search engines with relevant keywords." },
                  { title: "How can I share feedback?", body: "We’re always keen to hear from you. Use the Contact Us page to share your thoughts or seek further help." }
                ].map((faq, index) => (
                  <div key={index} className="border-b border-gray-200 pb-4">
                    <h3 className="text-lg font-medium text-gray-900">{faq.title}</h3>
                    <p className="mt-2 text-gray-600">{faq.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-8 mt-8">
              <h2 className="text-xl font-medium text-gray-900 mb-6">Contact Support</h2>
              <p className="text-gray-600">If you can't find the answer to your question, please contact our support team. We're here to help!</p>
              <Link
                to="/contact"
                className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
