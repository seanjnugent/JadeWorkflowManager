import React from 'react';
import { 
  Github, Twitter, Linkedin, Mail 
} from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { title: 'Privacy', href: '/privacy' },
    { title: 'Accessibility', href: '/accessibility' },
    { title: 'Terms of Service', href: '/terms' },
    { title: 'Contact', href: '/contact' }
  ];

  const socialLinks = [
    { 
      icon: <Github className="w-5 h-5" />, 
      href: 'https://github.com/your-company' 
    },
    { 
      icon: <Twitter className="w-5 h-5" />, 
      href: 'https://twitter.com/your-company' 
    },
    { 
      icon: <Linkedin className="w-5 h-5" />, 
      href: 'https://linkedin.com/company/your-company' 
    },
    { 
      icon: <Mail className="w-5 h-5" />, 
      href: 'mailto:support@conduit.com' 
    }
  ];

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <h2 className="text-xl font-bold text-blue-600 mb-4">Conduit</h2>
            <p className="text-gray-600 mb-4">
              Transform your data workflows with intelligent automation and seamless integrations.
            </p>
            <div className="flex space-x-3">
              {socialLinks.map((link, index) => (
                <a 
                  key={index} 
                  href={link.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-blue-600 transition-colors"
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-gray-800 mb-4">Quick Links</h3>
            <div className="grid grid-cols-2 gap-2">
              {footerLinks.map((link, index) => (
                <a 
                  key={index} 
                  href={link.href} 
                  className="text-gray-600 hover:text-blue-600 transition-colors text-sm"
                >
                  {link.title}
                </a>
              ))}
            </div>
          </div>

          {/* Newsletter Signup */}
          <div>
            <h3 className="font-bold text-gray-800 mb-4">Stay Updated</h3>
            <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-4">
                Subscribe to our newsletter for the latest updates and insights.
              </p>
              <div className="flex">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="flex-grow bg-white border border-gray-300 rounded-l-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <button 
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-r-lg text-sm hover:from-blue-700 hover:to-cyan-600 transition-all"
                >
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-200 mt-8 pt-6 text-center">
          <p className="text-sm text-gray-600">
            &copy; {currentYear} Conduit Technologies. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;