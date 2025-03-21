import React, { useEffect, useRef } from "react";

const Footer = () => {
  const footerRef = useRef(null);

  useEffect(() => {
    if (footerRef.current && !footerRef.current.shadowRoot) {
      const shadowRoot = footerRef.current.attachShadow({ mode: "open" });

      // Create a style element and load the Scottish Government Design System CSS
      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href =
        "https://unpkg.com/@scottish-government/design-system/dist/css/design-system.min.css";

      // Create a wrapper div for the footer content
      const wrapper = document.createElement("div");
      wrapper.innerHTML = `
        <footer class="ds_site-footer">
          <div class="ds_wrapper">
            <div class="ds_site-footer__content">
              <ul class="ds_site-footer__site-items">
                <li class="ds_site-items__item">
                  <a href="/privacy">Privacy</a>
                </li>
                <li class="ds_site-items__item">
                  <a href="/accessibility">Accessibility statement</a>
                </li>
                <li class="ds_site-items__item">
                  <a href="/contact">Contact</a>
                </li>
              </ul>
              <div class="ds_site-footer__copyright">
                <a class="ds_site-footer__copyright-logo" href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/">
                  <img 
                    loading="lazy" 
                    width="300" 
                    height="121" 
                    src="/assets/images/logos/ogl.svg" 
                    alt="Open Government License" 
                  />
                </a>
                <p>All content is available under the <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/">Open Government Licence v3.0</a>, except for graphic assets and where otherwise stated</p>
<p><strong>Powered by <a href="https://github.com/CSOIreland/PxStat" target="_blank" rel="noopener noreferrer">PxStat</strong></a></p>
                <p>&copy; Crown Copyright</p>
              
</div>
              <div class="ds_site-footer__org">
                <a class="ds_site-footer__org-link" title="The Scottish Government" href="https://www.gov.scot/">
                  <img 
                    loading="lazy" 
                    width="300" 
                    height="57" 
                    class="ds_site-footer__org-logo" 
                    src="/assets/images/logos/scottish-government--min.svg" 
                    alt="Scottish Government Logo" 
                  />
                </a>
              </div>
            </div>
          </div>
        </footer>
      `;

      shadowRoot.appendChild(style);
      shadowRoot.appendChild(wrapper);
    }
  }, []);

  return <div ref={footerRef}></div>;
};

export default Footer;
