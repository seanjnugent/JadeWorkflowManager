import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';

const Contact = () => {
  useEffect(() => {
    document.title = "Cobalt | Contact Us";
  }, []);

  const navigate = useNavigate();
  const [showGif, setShowGif] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowGif(true);
    setTimeout(() => {
      setShowGif(false);
      navigate('/home');
    }, 5000);
  };

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
            <span className="text-white">Contact Us</span>
          </nav>
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="md:w-3/4">
              <h1 className="text-4xl font-medium text-white leading-tight">Contact Us</h1>
              <p className="mt-6 text-blue-100 text-lg leading-relaxed">
                The Open Data team values your feedback, questions, or comments. We are always happy to hear from you.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/3">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Ways to Reach Us</h2>
              <div className="flex items-center mb-4">
                <Mail size={24} className="text-blue-600 mr-3" />
                <div>
                  <h3 className="text-gray-900">Email Us</h3>
                  <a href="mailto:statistics.opendata@gov.scot" className="text-blue-600 hover:underline">
                    statistics.opendata@gov.scot
                  </a>
                </div>
              </div>
              <hr className="my-4" />
              <div className="flex items-center mb-4">
                <Phone size={24} className="text-blue-600 mr-3" />
                <div>
                  <h3 className="text-gray-900">Call Us</h3>
                  <a href="tel:+441234567890" className="text-blue-600 hover:underline">
                    +44 123 456 7890
                  </a>
                  <p className="text-sm text-gray-500">Mon-Fri, 9am-5pm</p>
                </div>
              </div>
              <hr className="my-4" />
              <div className="flex items-center mb-4">
                <MapPin size={24} className="text-blue-600 mr-3" />
                <div>
                  <h3 className="text-gray-900">Visit Us</h3>
                  <p className="text-gray-600">
                    Open Data Team<br />
                    Scottish Government<br />
                    Victoria Quay<br />
                    Edinburgh, EH6 6QQ
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:w-2/3">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-xl font-medium text-gray-900 mb-6">Send Us a Message</h2>
              <p className="text-gray-600">We aim to get back to you within 3 days.</p>
              <form onSubmit={handleSubmit} className="mt-6">
                <div className="mb-4">
                  <label htmlFor="name" className="block text-gray-700">Your Name</label>
                  <input type="text" id="name" name="name" className="w-full px-4 py-2 mt-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-gray-700">Your Email</label>
                  <input type="email" id="email" name="email" className="w-full px-4 py-2 mt-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div className="mb-4">
                  <label htmlFor="subject" className="block text-gray-700">Subject</label>
                  <input type="text" id="subject" name="subject" className="w-full px-4 py-2 mt-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div className="mb-4">
                  <label htmlFor="message" className="block text-gray-700">Your Message</label>
                  <textarea id="message" name="message" rows="5" className="w-full px-4 py-2 mt-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required></textarea>
                </div>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200">
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {showGif && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80">
          <img src="https://media1.tenor.com/m/z0NTv7yYBtQAAAAd/oiia-cat.gif" alt="Sending..." className="w-24 h-24" />
        </div>
      )}
    </div>
  );
};

export default Contact;
