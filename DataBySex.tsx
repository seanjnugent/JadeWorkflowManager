import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { DataTable } from "./DataTable";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";

export function DataBySex() {
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [showSexFilter, setShowSexFilter] = useState(false);
  const [showIndicatorFilter, setShowIndicatorFilter] = useState(false);
  const [showYearFilter, setShowYearFilter] = useState(false);
  const [selectedSex, setSelectedSex] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<string>('metadata'); // Start with 'metadata' as default
  const [appliedSexFilter, setAppliedSexFilter] = useState<string[]>([]);
  const [showFilterDownloadDropdown, setShowFilterDownloadDropdown] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showFullScreenFilterDownload, setShowFullScreenFilterDownload] = useState(false);
  
  const sexDropdownRef = useRef<HTMLDivElement>(null);
  const indicatorDropdownRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);
  const downloadDropdownRef = useRef<HTMLDivElement>(null);
  const filterDownloadDropdownRef = useRef<HTMLDivElement>(null);
  const fullScreenFilterDownloadRef = useRef<HTMLDivElement>(null);

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
    // Skip scroll spy when in full screen mode
    if (isFullScreen) return;

    const sections = [
      'metadata',
      'filter-data',
      'data-dictionary',
      'view-metadata',
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

    // Handle scroll to top - ensure 'View data' is highlighted when at top
    const handleScroll = () => {
      const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
      
      // If we're at the top of the page (within 100px), highlight the first section
      if (scrollPosition < 100) {
        setActiveSection('metadata');
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
  }, [isFullScreen]);

  const toggleDownloadDropdown = () => {
    setShowDownloadDropdown(!showDownloadDropdown);
  };

  const toggleFilterDownloadDropdown = () => {
    setShowFilterDownloadDropdown(!showFilterDownloadDropdown);
  };

  const toggleFullScreenFilterDownload = () => {
    setShowFullScreenFilterDownload(!showFullScreenFilterDownload);
  };

  const toggleSexFilter = () => {
    setShowSexFilter(!showSexFilter);
  };

  const toggleIndicatorFilter = () => {
    setShowIndicatorFilter(!showIndicatorFilter);
  };

  const toggleYearFilter = () => {
    setShowYearFilter(!showYearFilter);
  };

  const handleSexSelection = (value: string) => {
    if (value === 'All') {
      setSelectedSex(selectedSex.length === 3 ? [] : ['All', 'Male', 'Female']);
    } else {
      const newSelection = selectedSex.includes(value)
        ? selectedSex.filter(item => item !== value && item !== 'All')
        : [...selectedSex.filter(item => item !== 'All'), value];
      
      if (newSelection.length === 2) {
        setSelectedSex(['All', 'Male', 'Female']);
      } else {
        setSelectedSex(newSelection);
      }
    }
  };

  const handleSelectAll = () => {
    setSelectedSex(['All', 'Male', 'Female']);
  };

  const handleClearAll = () => {
    setSelectedSex([]);
  };

  const handleClearSexFilter = () => {
    setSelectedSex([]);
  };

  const handleDownload = (format: string) => {
    console.log(`Downloading in ${format} format`);
    setShowDownloadDropdown(false);
  };

  const handleFilterDownload = (format: string) => {
    console.log(`Downloading filtered selection in ${format} format`);
    setShowFilterDownloadDropdown(false);
  };

  const handleFullScreenFilterDownload = (format: string) => {
    console.log(`Downloading filtered selection in ${format} format`);
    setShowFullScreenFilterDownload(false);
  };

  const handleViewSelection = () => {
    console.log('Viewing selection:', selectedSex);
    // Apply the sex filter
    setAppliedSexFilter(selectedSex);
    // Scroll to the View data section
    handleJumpLinkClick('metadata');
  };

  const handleDownloadSelection = () => {
    console.log('Downloading selection:', selectedSex);
  };

  const handleDataApi = () => {
    console.log('Data API accessed');
  };

  const handleClearFilter = () => {
    // Clear applied filter
    setAppliedSexFilter([]);
    // Clear selected sex values
    setSelectedSex([]);
  };

  const handleFullScreenToggle = () => {
    if (isFullScreen) {
      // Exiting full screen - set active section to 'metadata' (View data)
      setActiveSection('metadata');
      // Scroll to the View data section
      setTimeout(() => {
        handleJumpLinkClick('metadata');
      }, 100);
    }
    // Note: No longer clearing filters when entering full screen mode
    setIsFullScreen(!isFullScreen);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sexDropdownRef.current && !sexDropdownRef.current.contains(event.target as Node)) {
        setShowSexFilter(false);
      }
      if (indicatorDropdownRef.current && !indicatorDropdownRef.current.contains(event.target as Node)) {
        setShowIndicatorFilter(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
        setShowYearFilter(false);
      }
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target as Node)) {
        setShowDownloadDropdown(false);
      }
      if (filterDownloadDropdownRef.current && !filterDownloadDropdownRef.current.contains(event.target as Node)) {
        setShowFilterDownloadDropdown(false);
      }
      if (fullScreenFilterDownloadRef.current && !fullScreenFilterDownloadRef.current.contains(event.target as Node)) {
        setShowFullScreenFilterDownload(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const hasSelections = selectedSex.length > 0;

  // Helper function to determine if a section is active
  const isActiveSection = (sectionId: string) => {
    return activeSection === sectionId;
  };

  // Helper function to get Sex dropdown button text
  const getSexDropdownText = () => {
    return 'Sex';
  };

  // Helper function to get filter status text for View data section
  const getFilterStatusText = () => {
    if (appliedSexFilter.length === 0) {
      return null;
    }
    
    if (appliedSexFilter.length === 3 || appliedSexFilter.includes('All')) {
      return "Showing data for all sex categories";
    }
    
    if (appliedSexFilter.length === 1) {
      return `Showing data filtered by Sex: ${appliedSexFilter[0]}`;
    }
    
    return `Showing data filtered by Sex: ${appliedSexFilter.join(', ')}`;
  };

  // Helper function to get filter status text for Filter data section
  const getSexSelectionStatusText = () => {
    if (selectedSex.length === 0) {
      return null;
    }
    
    if (selectedSex.length === 3 || selectedSex.includes('All')) {
      return "Selected: All sex categories";
    }
    
    if (selectedSex.length === 1) {
      return `Selected: ${selectedSex[0]}`;
    }
    
    return `Selected: ${selectedSex.join(', ')}`;
  };

  // Helper component for rendering selection buttons with tooltips
  const SelectionButton = ({ onClick, disabled, children, className }: {
    onClick: () => void;
    disabled: boolean;
    children: React.ReactNode;
    className: string;
  }) => {
    const button = (
      <button 
        onClick={onClick}
        className={className}
        disabled={disabled}
      >
        {children}
      </button>
    );

    if (disabled) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-[#333333] text-white text-sm max-w-[200px]">
            Select filters above to view or download
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
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
              <a 
                href="#/health-survey" 
                className="text-white hover:text-[#d9eeff] hover:no-underline underline cursor-pointer transition-colors duration-200"
              >
                Scottish Health Survey
              </a>
              <span className="text-white">&gt;</span>
              <span className="text-white">Scotland Level Data by Sex</span>
            </div>
          </nav>

          {/* Page title */}
          <h1 className="sg-page-header-title">
            Scottish Health Survey - Scotland Level Data by Sex
          </h1>

          {/* Page description - shortened and constrained to 75% width */}
          <div className="w-3/4">
            <p className="sg-page-header-description">
              This dataset contains Scotland-level data broken down by sex, covering the period from 2008 to 2023. More details on the Scottish Health Survey can be found on the survey webpages on the <a 
                href="https://www.gov.scot/collections/scottish-health-survey/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white hover:text-[#d9eeff] hover:no-underline underline cursor-pointer transition-colors duration-200"
              >
                Scottish Government website
              </a>.
            </p>
          </div>

          {/* Hero tiles removed */}
        </div>
      </div>

      {/* Conditional rendering based on full screen state */}
      {isFullScreen ? (
        /* Full screen layout - only show the table with filter status */
        <div className="w-full px-6 py-8">
          {/* Filter status text for full screen mode */}
          {getFilterStatusText() && (
            <div className="mb-4 p-3 bg-[#f0f8ff] border border-[#d9eeff] rounded flex items-center justify-between">
              <p className="text-[16px] text-[#333333] mb-0">
                {getFilterStatusText()}
              </p>
              <div className="flex items-center gap-2">
                <div className="relative" ref={fullScreenFilterDownloadRef}>
                  <button
                    onClick={toggleFullScreenFilterDownload}
                    className="text-[#0065bd] hover:text-[#004a9f] underline hover:no-underline text-[14px] font-medium transition-colors duration-200"
                  >
                    Download selection
                  </button>
                  {showFullScreenFilterDownload && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-[#b3b3b3] rounded shadow-lg z-1000 min-w-[120px]">
                      <button 
                        onClick={() => handleFullScreenFilterDownload('CSV')}
                        className="block w-full px-3 py-2 text-left text-sm text-[#333333] hover:bg-[#f8f8f8] transition-colors duration-200 border-none bg-none cursor-pointer"
                      >
                        CSV
                      </button>
                      <button 
                        onClick={() => handleFullScreenFilterDownload('JSON')}
                        className="block w-full px-3 py-2 text-left text-sm text-[#333333] hover:bg-[#f8f8f8] transition-colors duration-200 border-none bg-none cursor-pointer"
                      >
                        JSON
                      </button>
                      <button 
                        onClick={() => handleFullScreenFilterDownload('XML')}
                        className="block w-full px-3 py-2 text-left text-sm text-[#333333] hover:bg-[#f8f8f8] transition-colors duration-200 border-none bg-none cursor-pointer"
                      >
                        XML
                      </button>
                      <button 
                        onClick={() => handleFullScreenFilterDownload('TSV')}
                        className="block w-full px-3 py-2 text-left text-sm text-[#333333] hover:bg-[#f8f8f8] transition-colors duration-200 border-none bg-none cursor-pointer"
                      >
                        TSV
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleClearFilter}
                  className="text-[#0065bd] hover:text-[#004a9f] underline hover:no-underline text-[14px] font-medium transition-colors duration-200"
                >
                  Clear filter
                </button>
              </div>
            </div>
          )}
          
          <DataTable 
            sexFilter={appliedSexFilter} // Keep the applied filter in full screen mode
            isFullScreen={isFullScreen}
            onFullScreenToggle={handleFullScreenToggle}
          />
        </div>
      ) : (
        /* Normal layout with sidebar and sections */
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
                        onClick={() => handleJumpLinkClick('metadata')}
                        className={`sg-contents-link w-full text-left ${isActiveSection('metadata') ? 'sg-contents-link-active' : ''}`}
                      >
                        View data
                      </button>
                    </li>
                    <li className="sg-contents-item">
                      <button
                        onClick={() => handleJumpLinkClick('filter-data')}
                        className={`sg-contents-link w-full text-left ${isActiveSection('filter-data') ? 'sg-contents-link-active' : ''}`}
                      >
                        Filter data
                      </button>
                    </li>
                    <li className="sg-contents-item">
                      <button
                        onClick={() => handleJumpLinkClick('data-dictionary')}
                        className={`sg-contents-link w-full text-left ${isActiveSection('data-dictionary') ? 'sg-contents-link-active' : ''}`}
                      >
                        Data dictionary
                      </button>
                    </li>
                    <li className="sg-contents-item">
                      <button
                        onClick={() => handleJumpLinkClick('view-metadata')}
                        className={`sg-contents-link w-full text-left ${isActiveSection('view-metadata') ? 'sg-contents-link-active' : ''}`}
                      >
                        View metadata
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
              {/* View data Section with added top spacing to match About this data section */}
              <section id="metadata" className="mb-12 pt-6">
                <div className="sg-section-separator">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px]">
                      View data
                    </h2>
                    <div className="flex gap-2">
                      <div className="relative" ref={downloadDropdownRef}>
                        <button 
                          onClick={toggleDownloadDropdown}
                          className="sg-data-action-button sg-data-action-button-dropdown"
                          style={{ width: '120px' }}
                        >
                          Download
                          <ChevronDown className="w-5 h-5 ml-2" />
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
                      <button 
                        onClick={handleDataApi}
                        className="sg-data-action-button"
                        style={{ width: '120px' }}
                      >
                        Data API
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="prose prose-lg max-w-none">
                  {/* Filter status text */}
                  {getFilterStatusText() && (
                    <div className="mb-4 p-3 bg-[#f0f8ff] border border-[#d9eeff] rounded flex items-center justify-between">
                      <p className="text-[16px] text-[#333333] mb-0">
                        {getFilterStatusText()}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="relative" ref={filterDownloadDropdownRef}>
                          <button
                            onClick={toggleFilterDownloadDropdown}
                            className="text-[#0065bd] hover:text-[#004a9f] underline hover:no-underline text-[14px] font-medium transition-colors duration-200"
                          >
                            Download selection
                          </button>
                          {showFilterDownloadDropdown && (
                            <div className="absolute top-full right-0 mt-1 bg-white border border-[#b3b3b3] rounded shadow-lg z-1000 min-w-[120px]">
                              <button 
                                onClick={() => handleFilterDownload('CSV')}
                                className="block w-full px-3 py-2 text-left text-sm text-[#333333] hover:bg-[#f8f8f8] transition-colors duration-200 border-none bg-none cursor-pointer"
                              >
                                CSV
                              </button>
                              <button 
                                onClick={() => handleFilterDownload('JSON')}
                                className="block w-full px-3 py-2 text-left text-sm text-[#333333] hover:bg-[#f8f8f8] transition-colors duration-200 border-none bg-none cursor-pointer"
                              >
                                JSON
                              </button>
                              <button 
                                onClick={() => handleFilterDownload('XML')}
                                className="block w-full px-3 py-2 text-left text-sm text-[#333333] hover:bg-[#f8f8f8] transition-colors duration-200 border-none bg-none cursor-pointer"
                              >
                                XML
                              </button>
                              <button 
                                onClick={() => handleFilterDownload('TSV')}
                                className="block w-full px-3 py-2 text-left text-sm text-[#333333] hover:bg-[#f8f8f8] transition-colors duration-200 border-none bg-none cursor-pointer"
                              >
                                TSV
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={handleClearFilter}
                          className="text-[#0065bd] hover:text-[#004a9f] underline hover:no-underline text-[14px] font-medium transition-colors duration-200"
                        >
                          Clear filter
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Data table viewer */}
                  <div className="mb-8">
                    <DataTable 
                      sexFilter={appliedSexFilter} 
                      isFullScreen={isFullScreen}
                      onFullScreenToggle={handleFullScreenToggle}
                    />
                  </div>
                </div>
              </section>

              {/* Filter data Section - now H2 */}
              <section id="filter-data" className="mb-12">
                <div className="sg-section-separator">
                  <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                    Filter data
                  </h2>
                </div>
                <div className="prose prose-lg max-w-none">
                  <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                    Select only the specific data you want from the entire dataset to view or download.
                  </p>
                  
                  {/* Filter dropdowns */}
                  <div className="space-y-4 mb-6">
                    {/* Scottish Health Survey Indicator Filter */}
                    <div className="relative" ref={indicatorDropdownRef}>
                      <button 
                        onClick={toggleIndicatorFilter}
                        className="sg-filter-dropdown"
                      >
                        <span className="text-[#333333] font-medium">Scottish Health Survey Indicator</span>
                        <ChevronDown className="w-5 h-5 text-[#5e5e5e]" />
                      </button>
                      {showIndicatorFilter && (
                        <div className="sg-filter-dropdown-content">
                          <div className="p-4 text-[#5e5e5e]">
                            Select indicators to filter by...
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sex Filter */}
                    <div className="space-y-2">
                      <div className="relative" ref={sexDropdownRef}>
                        <button 
                          onClick={toggleSexFilter}
                          className={`sg-filter-dropdown ${showSexFilter ? 'border-[#0065bd] shadow-[0_0_0_1px_#0065bd]' : ''}`}
                        >
                          <span className="text-[#333333] font-medium">{getSexDropdownText()}</span>
                          {showSexFilter ? (
                            <ChevronUp className="w-5 h-5 text-[#5e5e5e]" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-[#5e5e5e]" />
                          )}
                        </button>
                        {showSexFilter && (
                          <div className="sg-filter-dropdown-content">
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-[#5e5e5e] text-sm">
                                  {selectedSex.length} of 3 selected
                                </span>
                                <div className="flex gap-4">
                                  <button 
                                    onClick={handleSelectAll}
                                    className="text-[#0065bd] text-sm hover:text-[#004a9f] hover:underline"
                                  >
                                    Select all
                                  </button>
                                  <button 
                                    onClick={handleClearAll}
                                    className="text-[#333333] text-sm hover:underline"
                                  >
                                    Clear all
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedSex.includes('All')}
                                    onChange={() => handleSexSelection('All')}
                                    className="w-4 h-4"
                                  />
                                  <span className="text-[#333333]">All</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedSex.includes('Male')}
                                    onChange={() => handleSexSelection('Male')}
                                    className="w-4 h-4"
                                  />
                                  <span className="text-[#333333]">Male</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedSex.includes('Female')}
                                    onChange={() => handleSexSelection('Female')}
                                    className="w-4 h-4"
                                  />
                                  <span className="text-[#333333]">Female</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Sex selection status display */}
                      {getSexSelectionStatusText() && (
                        <div className="p-3 bg-[#f0f8ff] border border-[#d9eeff] rounded flex items-center justify-between">
                          <p className="text-[16px] text-[#333333] mb-0">
                            {getSexSelectionStatusText()}
                          </p>
                          <button
                            onClick={handleClearSexFilter}
                            className="text-[#0065bd] hover:text-[#004a9f] underline hover:no-underline text-[14px] font-medium transition-colors duration-200"
                          >
                            Clear filter
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Year Filter */}
                    <div className="relative" ref={yearDropdownRef}>
                      <button 
                        onClick={toggleYearFilter}
                        className="sg-filter-dropdown"
                      >
                        <span className="text-[#333333] font-medium">Year</span>
                        <ChevronDown className="w-5 h-5 text-[#5e5e5e]" />
                      </button>
                      {showYearFilter && (
                        <div className="sg-filter-dropdown-content">
                          <div className="p-4 text-[#5e5e5e]">
                            Select years to filter by...
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selection action buttons */}
                  <div className="flex gap-2">
                    <SelectionButton
                      onClick={handleViewSelection}
                      disabled={!hasSelections}
                      className={`sg-selection-button sg-selection-button-equal ${hasSelections ? 'sg-selection-button-active' : 'sg-selection-button-disabled'}`}
                    >
                      View selection
                    </SelectionButton>
                    <SelectionButton
                      onClick={handleDownloadSelection}
                      disabled={!hasSelections}
                      className={`sg-selection-button sg-selection-button-equal ${hasSelections ? 'sg-selection-button-active' : 'sg-selection-button-disabled'}`}
                    >
                      Download selection
                    </SelectionButton>
                  </div>
                </div>
              </section>

              {/* Data dictionary Section - now H2 */}
              <section id="data-dictionary" className="mb-12">
                <div className="sg-section-separator">
                  <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                    Data dictionary
                  </h2>
                </div>
                <div className="prose prose-lg max-w-none">
                  <table className="sg-table mb-8">
                    <thead>
                      <tr>
                        <th className="w-1/4 font-bold">Variable</th>
                        <th className="w-1/6 font-bold">Data type</th>
                        <th className="font-bold">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th className="w-1/4">Scottish Health Survey Indicator</th>
                        <td className="w-1/6">Categorical</td>
                        <td>Categorical variable containing health indicators measured in the survey including physical activity levels, Body Mass Index classifications, smoking status, alcohol consumption patterns, mental wellbeing scores, and prevalence of chronic conditions such as diabetes, cardiovascular disease, and respiratory conditions.</td>
                      </tr>
                      <tr>
                        <th className="w-1/4">Sex</th>
                        <td className="w-1/6">Categorical</td>
                        <td>Categorical variable representing biological sex as recorded in the survey. Values include 'All' (aggregated data for all participants), 'Male' (data for male participants), and 'Female' (data for female participants). Based on self-reported responses during survey interviews.</td>
                      </tr>
                      <tr>
                        <th className="w-1/4">Year</th>
                        <td className="w-1/6">Integer</td>
                        <td>Numerical variable indicating the calendar year when the survey data was collected. Dataset covers the period from 2008 to 2023, representing annual cross-sectional surveys conducted by the Scottish Government to monitor population health trends over time.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* View metadata Section - now H2 */}
              <section id="view-metadata" className="mb-12">
                <div className="sg-section-separator">
                  <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                    View metadata
                  </h2>
                </div>
                <div className="prose prose-lg max-w-none">
                  <table className="sg-table">
                    <tbody>
                      <tr>
                        <th className="w-1/3">Author</th>
                        <td>Scottish Government</td>
                      </tr>
                      <tr>
                        <th>Organisation</th>
                        <td>Scottish Government</td>
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
                        <th>Published</th>
                        <td>29 May 2025</td>
                      </tr>
                      <tr>
                        <th>Last Updated</th>
                        <td>29 May 2025</td>
                      </tr>
                      <tr>
                        <th>Update Frequency</th>
                        <td>Not specified</td>
                      </tr>
                      <tr>
                        <th>Geographic Coverage</th>
                        <td>Not specified</td>
                      </tr>
                      <tr>
                        <th>Temporal Coverage</th>
                        <td>Not specified</td>
                      </tr>
                      <tr>
                        <th>Contact</th>
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
      )}
    </div>
  );
}