import { useState, useEffect, useRef } from "react";
import { ChevronDown, FileSpreadsheet } from "lucide-react";

export function HealthSurvey() {
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('summary'); // Start with 'summary' as default
  
  const downloadDropdownRef = useRef<HTMLDivElement>(null);

  const handleJumpLinkClick = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      // Calculate offset to align section header with Contents title
      // Sticky nav top (24px) + Contents title height + some spacing = ~45px offset
      const offset = 45;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
      
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  // Scroll spy functionality
  useEffect(() => {
    const sections = [
      'summary',
      'metadata',
      'data-quality',
      'additional-details'
    ];

    const observerOptions = {
      root: null,
      rootMargin: '-45px 0px -60% 0px', // Adjusted to account for our offset
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    // Observe all sections
    sections.forEach((sectionId) => {
      const element = document.getElementById(sectionId);
      if (element) {
        observer.observe(element);
      }
    });

    // Handle scroll to top - ensure 'About this data' is highlighted when at top
    const handleScroll = () => {
      const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
      
      // If we're at the top of the page (within 100px), highlight the first section
      if (scrollPosition < 100) {
        setActiveSection('summary');
      }
    };

    // Add scroll listener
    window.addEventListener('scroll', handleScroll);
    
    // Check initial scroll position
    handleScroll();

    return () => {
      sections.forEach((sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
          observer.unobserve(element);
        }
      });
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const toggleMoreInfo = () => {
    setShowMoreInfo(!showMoreInfo);
  };

  const toggleDownloadDropdown = () => {
    setShowDownloadDropdown(!showDownloadDropdown);
  };

  const handleDownload = (format: string) => {
    console.log(`Downloading in ${format} format`);
    setShowDownloadDropdown(false);
  };

  const handleViewData = () => {
    console.log('Navigating to data by sex page');
    window.location.hash = '#/data-by-sex';
  };

  const handleTileClick = (e: React.MouseEvent) => {
    // Check if the click was on the download button or its children
    const target = e.target as HTMLElement;
    const downloadButton = downloadDropdownRef.current;
    
    if (downloadButton && (downloadButton.contains(target) || downloadButton === target)) {
      // Click was on download button, don't navigate
      return;
    }
    
    // Navigate to data page
    handleViewData();
  };

  const handleInactiveTileClick = (e: React.MouseEvent) => {
    // Do nothing - inactive tiles have no functionality
    e.preventDefault();
  };

  const handleInactiveButtonClick = (e: React.MouseEvent) => {
    // Do nothing - inactive buttons have no functionality
    e.preventDefault();
    e.stopPropagation();
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target as Node)) {
        setShowDownloadDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Helper function to determine if a section is active
  const isActiveSection = (sectionId: string) => {
    return activeSection === sectionId;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Blue page header section with reduced bottom padding */}
      <div className="sg-page-header" style={{ paddingBottom: '24px' }}>
        <div className="sg-page-header-container">
          {/* Breadcrumb */}
          <nav className="sg-page-header-breadcrumb">
            <div className="flex items-center gap-2 text-base">
              <a 
                href="#/" 
                className="text-white hover:text-[#d9eeff] hover:no-underline underline cursor-pointer transition-colors duration-200"
              >
                Home
              </a>
              <span className="text-white">&gt;</span>
              <a 
                href="#/data" 
                className="text-white hover:text-[#d9eeff] hover:no-underline underline cursor-pointer transition-colors duration-200"
              >
                Data
              </a>
              <span className="text-white">&gt;</span>
              <span className="text-white">Scottish Health Survey</span>
            </div>
          </nav>

          {/* Page title */}
          <h1 className="sg-page-header-title">
            Scottish Health Survey
          </h1>

          {/* Page description - constrained to 75% width */}
          <div className="w-3/4">
            <p className="sg-page-header-description">
              This is a national survey that provides information about the health and health-related behaviors of people living in Scotland. This dataset contains Scotland-level data broken down by sex, covering the period from 2008 to 2023.
            </p>
          </div>

          {/* Hero tiles removed */}
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar - 25% width with sticky contents */}
          <div className="w-1/4 shrink-0">
            {/* Contents */}
            <div className="sg-contents-sticky">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-4">
                Contents
              </h2>
              
              <nav>
                <ul className="sg-contents-nav">
                  <li className="sg-contents-item">
                    <button
                      onClick={() => handleJumpLinkClick('summary')}
                      className={`sg-contents-link w-full text-left ${isActiveSection('summary') ? 'sg-contents-link-active' : ''}`}
                    >
                      About this data
                    </button>
                  </li>
                  <li className="sg-contents-item">
                    <button
                      onClick={() => handleJumpLinkClick('metadata')}
                      className={`sg-contents-link w-full text-left ${isActiveSection('metadata') ? 'sg-contents-link-active' : ''}`}
                    >
                      View data
                    </button>
                  </li>
                  <li className="sg-contents-item">
                    <button
                      onClick={() => handleJumpLinkClick('data-quality')}
                      className={`sg-contents-link w-full text-left ${isActiveSection('data-quality') ? 'sg-contents-link-active' : ''}`}
                    >
                      Data quality
                    </button>
                  </li>
                  <li className="sg-contents-item">
                    <button
                      onClick={() => handleJumpLinkClick('additional-details')}
                      className={`sg-contents-link w-full text-left ${isActiveSection('additional-details') ? 'sg-contents-link-active' : ''}`}
                    >
                      Additional details
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>

          {/* Main content - 75% width */}
          <div className="w-3/4">
            {/* About this data Section - positioned to align with Contents title */}
            <section id="summary" className="mb-12 pt-6">
              <div className="sg-section-separator">
                <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                  About this data
                </h2>
              </div>
              <div className="prose prose-lg max-w-none">
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-4">
                  The survey collects data on a wide range of health topics including physical activity, diet, smoking, alcohol consumption, mental health, and chronic conditions. This aggregated dataset provides valuable insights into population health trends and gender differences in health outcomes across Scotland.
                </p>
                
                {/* Dataset information table */}
                <table className="sg-table mb-8">
                  <tbody>
                    <tr>
                      <th className="w-1/2">Dataset contact</th>
                      <td>
                        <a 
                          href="mailto:scottishhealthsurvey@gov.scot"
                          className="text-[#0065bd] underline hover:text-[#004a9f] hover:no-underline cursor-pointer transition-colors duration-200"
                        >
                          scottishhealthsurvey@gov.scot
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <th>Reference period</th>
                      <td>2008-2023</td>
                    </tr>
                    <tr>
                      <th>Last Published</th>
                      <td>12 November 2024</td>
                    </tr>
                    <tr>
                      <th>Next update</th>
                      <td>November 2025</td>
                    </tr>
                  </tbody>
                </table>
                
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-4">
                  For more information, including summary statistics, please read the <a 
                    href="https://www.gov.scot/publications/scottish-health-survey-2023-volume-1-main-report/pages/6/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#0065bd] underline hover:text-[#004a9f] hover:no-underline cursor-pointer transition-colors duration-200"
                  >
                    Official Publication
                  </a> on the www.gov.scot website.
                </p>
                
                <div>
                  <button 
                    onClick={toggleMoreInfo}
                    className="sg-more-info-button mb-4"
                    data-expanded={showMoreInfo}
                  >
                    {showMoreInfo ? 'Show less information' : 'Show more information'}
                    <ChevronDown className="sg-more-info-chevron" />
                  </button>
                </div>
                
                {showMoreInfo && (
                  <div className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333]">
                    <p className="mb-4">
                      The Scottish Health Survey (SHeS) has been carried out annually since 2008 and prior to this was carried out in 1995, 1998, and 2003.
                    </p>
                    
                    <p className="mb-4">
                      Commissioned by the Scottish Government Health Directorates, the series provides regular information on aspects of the public's health and factors related to health which cannot be obtained from other sources. The SHeS series was designed to:
                    </p>
                    
                    <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                      <li>estimate the prevalence of particular health conditions in Scotland</li>
                      <li>estimate the prevalence of certain risk factors associated with these health conditions and to document the pattern of related health behaviours</li>
                      <li>look at differences between regions and subgroups of the population in the extent of their having these particular health conditions or risk factors, and to make comparisons with other national statistics for Scotland and England</li>
                      <li>monitor trends in the population's health over time</li>
                      <li>make a major contribution to monitoring progress towards health targets.</li>
                    </ul>
                    
                    <p className="mb-4">
                      Each survey in the series includes a set of core questions and measurements (height and weight and, if applicable, blood pressure, waist circumference, and saliva samples), plus modules of questions on specific health conditions and health risk factors that vary from year to year. Each year the main sample has been augmented by an additional boosted sample for children.
                    </p>
                    
                    <p className="mb-0">
                      More details on the Scottish Health Survey can be found on the survey webpages on the Scottish Government website.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* View data Section */}
            <section id="metadata" className="mb-12">
              <div className="sg-section-separator">
                <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                  View data
                </h2>
              </div>
              
              <div className="prose prose-lg max-w-none">
                <div className="space-y-1">
                  {/* First data tile - Active (Scotland Level Data by Sex) */}
                  <div 
                    className="bg-white box-shadow-[0_2px_4px_rgba(0,0,0,0.1)] border border-[#ebebeb] rounded p-4 cursor-pointer hover:shadow-[0_4px_8px_rgba(0,0,0,0.15)] transition-shadow duration-200"
                    onClick={handleTileClick}
                  >
                    <div className="flex items-center gap-4">
                      {/* CSV icon */}
                      <div className="flex-shrink-0">
                        <FileSpreadsheet className="w-10 h-10 text-[#0065bd]" />
                      </div>
                      
                      {/* File info with proper spacing */}
                      <div className="flex-grow pr-4">
                        <h3 className="text-[16px] font-bold leading-[24px] tracking-[0.15px] text-[#0065bd] mb-1 hover:text-[#004a9f] hover:underline transition-colors cursor-pointer">
                          Scottish Health Survey - Scotland Level Data by Sex
                        </h3>
                        <div className="text-[14px] text-[#5e5e5e] leading-[24px] tracking-[0.15px]">
                          2.6MB
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewData();
                          }}
                          className="px-4 py-2 bg-[#0065bd] text-white font-medium rounded hover:bg-[#004a9f] transition-colors duration-200 min-w-[120px]"
                        >
                          View data
                        </button>
                        <div className="relative" ref={downloadDropdownRef}>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDownloadDropdown();
                            }}
                            className="px-4 py-2 bg-[#0065bd] text-white font-medium rounded hover:bg-[#004a9f] transition-colors duration-200 flex items-center gap-2 min-w-[120px]"
                          >
                            Download
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          {showDownloadDropdown && (
                            <div className="sg-download-dropdown">
                              <button 
                                onClick={() => handleDownload('CSV')}
                                className="sg-download-option"
                              >
                                CSV
                              </button>
                              <button 
                                onClick={() => handleDownload('JSON')}
                                className="sg-download-option"
                              >
                                JSON
                              </button>
                              <button 
                                onClick={() => handleDownload('XML')}
                                className="sg-download-option"
                              >
                                XML
                              </button>
                              <button 
                                onClick={() => handleDownload('TSV')}
                                className="sg-download-option"
                              >
                                TSV
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Second data tile - Inactive (Scotland Level Data by Age) */}
                  <div 
                    className="bg-white box-shadow-[0_2px_4px_rgba(0,0,0,0.1)] border border-[#ebebeb] rounded p-4 cursor-pointer hover:shadow-[0_4px_8px_rgba(0,0,0,0.15)] transition-shadow duration-200"
                    onClick={handleInactiveTileClick}
                  >
                    <div className="flex items-center gap-4">
                      {/* CSV icon */}
                      <div className="flex-shrink-0">
                        <FileSpreadsheet className="w-10 h-10 text-[#0065bd]" />
                      </div>
                      
                      {/* File info with proper spacing */}
                      <div className="flex-grow pr-4">
                        <h3 className="text-[16px] font-bold leading-[24px] tracking-[0.15px] text-[#0065bd] mb-1 hover:text-[#004a9f] hover:underline transition-colors cursor-pointer">
                          Scottish Health Survey - Scotland Level Data by Age
                        </h3>
                        <div className="text-[14px] text-[#5e5e5e] leading-[24px] tracking-[0.15px]">
                          8.5MB
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button 
                          type="button"
                          onClick={handleInactiveButtonClick}
                          className="px-4 py-2 bg-[#0065bd] text-white font-medium rounded hover:bg-[#004a9f] transition-colors duration-200 min-w-[120px]"
                        >
                          View data
                        </button>
                        <button 
                          onClick={handleInactiveButtonClick}
                          className="px-4 py-2 bg-[#0065bd] text-white font-medium rounded hover:bg-[#004a9f] transition-colors duration-200 flex items-center gap-2 min-w-[120px]"
                        >
                          Download
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Third data tile - Inactive (Scotland Level Data by SIMD) */}
                  <div 
                    className="bg-white box-shadow-[0_2px_4px_rgba(0,0,0,0.1)] border border-[#ebebeb] rounded p-4 cursor-pointer hover:shadow-[0_4px_8px_rgba(0,0,0,0.15)] transition-shadow duration-200"
                    onClick={handleInactiveTileClick}
                  >
                    <div className="flex items-center gap-4">
                      {/* CSV icon */}
                      <div className="flex-shrink-0">
                        <FileSpreadsheet className="w-10 h-10 text-[#0065bd]" />
                      </div>
                      
                      {/* File info with proper spacing */}
                      <div className="flex-grow pr-4">
                        <h3 className="text-[16px] font-bold leading-[24px] tracking-[0.15px] text-[#0065bd] mb-1 hover:text-[#004a9f] hover:underline transition-colors cursor-pointer">
                          Scottish Health Survey - Scotland Level Data by SIMD
                        </h3>
                        <div className="text-[14px] text-[#5e5e5e] leading-[24px] tracking-[0.15px]">
                          6.5MB
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button 
                          type="button"
                          onClick={handleInactiveButtonClick}
                          className="px-4 py-2 bg-[#0065bd] text-white font-medium rounded hover:bg-[#004a9f] transition-colors duration-200 min-w-[120px]"
                        >
                          View data
                        </button>
                        <button 
                          onClick={handleInactiveButtonClick}
                          className="px-4 py-2 bg-[#0065bd] text-white font-medium rounded hover:bg-[#004a9f] transition-colors duration-200 flex items-center gap-2 min-w-[120px]"
                        >
                          Download
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Data quality Section with View metadata moved to top */}
            <section id="data-quality" className="mb-12">
              <div className="sg-section-separator">
                <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                  Data quality
                </h2>
              </div>
              <div className="prose prose-lg max-w-none">
                {/* View metadata subsection - moved from View data section */}
                <h3 className="text-[20px] font-medium text-black leading-[28px] tracking-[0.15px] mb-4">
                  View metadata about the Scottish Health Survey
                </h3>
                <table className="sg-table mb-8">
                  <tbody>
                    <tr>
                      <th className="w-1/3">Author</th>
                      <td>Scottish Government</td>
                    </tr>
                    <tr>
                      <th>Commissioned by</th>
                      <td>Scottish Government Health Directorates</td>
                    </tr>
                    <tr>
                      <th>License</th>
                      <td>
                        <a 
                          href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0065bd] underline hover:text-[#004a9f] hover:no-underline cursor-pointer transition-colors duration-200"
                        >
                          UK Open Government Licence (OGL)
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <th>Last Published</th>
                      <td>12 November 2024</td>
                    </tr>
                    <tr>
                      <th>Last Updated</th>
                      <td>12 November 2024</td>
                    </tr>
                    <tr>
                      <th>Update Frequency</th>
                      <td>Annual</td>
                    </tr>
                    <tr>
                      <th>Geographic Coverage</th>
                      <td>Scotland</td>
                    </tr>
                    <tr>
                      <th>Reference period</th>
                      <td>2008-2023</td>
                    </tr>
                    <tr>
                      <th>Dataset contact</th>
                      <td>
                        <a 
                          href="mailto:scottishhealthsurvey@gov.scot"
                          className="text-[#0065bd] underline hover:text-[#004a9f] hover:no-underline cursor-pointer transition-colors duration-200"
                        >
                          scottishhealthsurvey@gov.scot
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Accessibility and Clarity */}
                <h3 className="text-[20px] font-medium text-black leading-[28px] tracking-[0.15px] mb-4">
                  Accessibility and Clarity
                </h3>
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                  Detailed survey documentation is available on the Scottish Health Survey webpages. Users may also submit a special dataset request for their own analysis by following the guidance and proforma available online. Disclosure controlled survey microdata are available to registered researchers via the UK Data Service.
                </p>

                {/* Accuracy and Reliability */}
                <h3 className="text-[20px] font-medium text-black leading-[28px] tracking-[0.15px] mb-4">
                  Accuracy and Reliability
                </h3>
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                  The survey is currently designed to yield a representative sample of the general population living in private households in Scotland every year. Those living in institutions, who are likely to be older and, on average, in poorer health than those in private households, were outwith the scope of the survey. This should be borne in mind when interpreting the survey findings. The survey uses a clustered, stratified multi-stage sample design. In addition, weights are applied when obtaining survey estimates.
                </p>

                {/* Coherence and Comparability */}
                <h3 className="text-[20px] font-medium text-black leading-[28px] tracking-[0.15px] mb-4">
                  Coherence and Comparability
                </h3>
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                  A significant number of changes were made to the questionnaire content in advance of the 2018 survey based on the consultation that took place in Autumn 2016, with a summary of responses published in Spring 2017. These changes are discussed in the Scottish Health Survey: Report of Questionnaire Changes published in March 2018. The changes included a number of new questions, removal of some questions, and amendments to some questions. The changes will affect the comparability of some results between the 2018 survey and previous years' surveys.
                </p>

                {/* Concepts and Definitions */}
                <h3 className="text-[20px] font-medium text-black leading-[28px] tracking-[0.15px] mb-4">
                  Concepts and Definitions
                </h3>
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                  The Scottish Health Survey uses concepts and definitions that are consistent with other national surveys where possible. More information about the concepts and definitions used in the survey can be found in the survey reports and supporting documentation.
                </p>

                {/* Timeliness and Punctuality */}
                <h3 className="text-[20px] font-medium text-black leading-[28px] tracking-[0.15px] mb-4">
                  Timeliness and Punctuality
                </h3>
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                  The Scottish Health Survey is conducted annually, with data collection typically taking place between January and December. The survey results are published approximately 12 months after the end of the data collection period. The survey follows a pre-announced publication schedule that is available on the Scottish Government website.
                </p>
              </div>
            </section>

            {/* Additional details Section */}
            <section id="additional-details" className="mb-12">
              <div className="sg-section-separator">
                <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                  Additional details
                </h2>
              </div>
              <div className="prose prose-lg max-w-none">
                {/* Confidentiality Policy */}
                <h3 className="text-[20px] font-medium text-black leading-[28px] tracking-[0.15px] mb-4">
                  Confidentiality Policy
                </h3>

                {/* Quality Management */}
                <h3 className="text-[20px] font-medium text-black leading-[28px] tracking-[0.15px] mb-4">
                  Quality Management
                </h3>

                {/* Revisions */}
                <h3 className="text-[20px] font-medium text-black leading-[28px] tracking-[0.15px] mb-4">
                  Revisions
                </h3>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}