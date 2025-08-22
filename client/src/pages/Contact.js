import React from "react";

const Contact = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div
        style={{ backgroundColor: "#005DC4" }}
        className="bg-blue-600 text-white px-4 py-12"
      >
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-blue-100">
            <button className="text-2xl bg-transparent border-none p-0 text-white hover:text-blue-200 underline transition-colors">
              Home
            </button>
            <span>&gt;</span>
            <span className="text-2xl text-white font-medium">Contact</span>
          </div>

          {/* Hero Content */}
          <h1
            className="text-4xl font-bold mb-6 mt-6"
            style={{ fontFamily: "'Nimbus Sans Arabic', sans-serif" }}
          >
            Contact Us
          </h1>
          <p className="text-base font-semibold leading-6 font-medium font-sans">
            {" "}
            We are always happy to hear from you.
          </p>
          <p className="text-base font-semibold leading-6 font-medium font-sans">
            Please contact us using the form below.
          </p>
        </div>
      </div>

      {/* Contact Form Section */}
      <div
        className="max-w-4xl mx-auto px-4 py-8"
        style={{ backgroundColor: "#F9FAFB" }}
      >
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Form Header */}
          <div className="flex items-center mb-6">
            <svg
              className="w-6 h-6 mr-3 text-gray-700 rotate-[-45deg]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              ></path>
            </svg>
            <h2
              className="mt-1 text-xl font-semibold text-gray-800"
              style={{ fontFamily: "'Nimbus Sans Arabic', sans-serif" }}
            >
              Send Us a Message
            </h2>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Name Field */}
            <div>
              <label
                className="text-lg font-semibold text-gray-800"
                style={{ fontFamily: "'Nimbus Sans Arabic', sans-serif" }}
              >
                Name:
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005DC4] focus:border-transparent hover:border-[#005DC4]"
              />
            </div>

            {/* Email Field */}
            <div>
              <label
                className="text-lg font-semibold text-gray-800"
                style={{ fontFamily: "'Nimbus Sans Arabic', sans-serif" }}
              >
                Email:
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005DC4] focus:border-transparent hover:border-[#005DC4]"
              />
            </div>

            {/* Subject Field */}
            <div>
              <label
                className="text-lg font-semibold text-gray-800"
                style={{ fontFamily: "'Nimbus Sans Arabic', sans-serif" }}
              >
                Subject:
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005DC4] focus:border-transparent hover:border-[#005DC4]"
              />
            </div>
            {/* Type of Query Dropdown */}
            <div>
              <label
                className="text-lg font-semibold text-gray-800"
                style={{ fontFamily: "'Nimbus Sans Arabic', sans-serif" }}
              >
                Type of Query:
              </label>
              <div className="relative">
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005DC4] focus:border-transparent hover:border-[#005DC4] appearance-none bg-white pr-10">
                  <option>Please select...</option>
                  <option>Technical Support</option>
                  <option>General Inquiry</option>
                  <option>Feedback</option>
                  <option>Bug Report</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Message Field */}
            <div>
              <label
                className="text-lg font-semibold text-gray-800"
                style={{ fontFamily: "'Nimbus Sans Arabic', sans-serif" }}
              >
                Your Message:
              </label>
              <textarea
                rows={6}
                placeholder="Tell us how we can help you...."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005DC4] focus:border-transparent hover:border-[#005DC4] resize-vertical"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                style={{ backgroundColor: "#005DC4" }}
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
