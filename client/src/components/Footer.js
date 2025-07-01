import React from 'react';

const Footer = () => {
  return (
    <footer className="ds_site-footer">
      <div className="ds_wrapper">
        <div className="ds_site-footer__content">
          {/* Navigation Links */}
          <ul className="ds_site-footer__site-items">
            <li className="ds_site-items__item">
              <a href="/privacy">Privacy</a>
            </li>
            <li className="ds_site-items__item">
              <a href="/accessibility">Accessibility statement</a>
            </li>
            <li className="ds_site-items__item">
              <a href="/contact">Contact</a>
            </li>
            <li className="ds_site-items__item">
              <a href="/help">How to use this site</a>
            </li>
          </ul>


          {/* Organization Info */}
          <div className="ds_site-footer__org">
            <a
              className="ds_site-footer__org-link"
              title="The Scottish Government"
              href="https://www.gov.scot/"
            >
              <img
                loading="lazy"
                width="300"
                height="57"
                className="ds_site-footer__org-logo"
                src="/assets/images/logos/scottish-government--min.svg"
                alt="gov.scot"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
