import React, { useEffect, useState } from 'react';
import { Share2, Download, FileText, Table, Calendar, Clock, ChevronDown, Check, X, Search } from 'lucide-react';
import { useParams } from 'react-router-dom';

const Dataset = () => {
  const { id } = useParams();
  const [dataset, setDataset] = useState(null);
  const [selectedDimensions, setSelectedDimensions] = useState({});
  const [openDimension, setOpenDimension] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchDataset = async () => {
      const response = await fetch('https://ws.cso.ie/public/api.jsonrpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'PxStat.Data.Cube_API.ReadMetadata',
          params: {
            matrix: id,
            format: { type: 'JSON-stat', version: '2.0' },
            language: 'en',
            m2m: false,
          },
          id: 193280692,
        }),
      });
      const data = await response.json();
      setDataset(data.result);
    };

    fetchDataset();
    document.title = 'Emerald | Dataset';
  }, [id]);

  if (!dataset) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-2 border-t-blue-600 border-gray-200 rounded-full animate-spin"></div>
      </div>
    );
  }

  const {
    label,
    dimension,
    extension,
    href,
    link,
    updated,
    note,
  } = dataset;

  const handleDimensionToggle = (dimensionKey) => {
    setOpenDimension(openDimension === dimensionKey ? null : dimensionKey);
    setSearchQuery(''); // Reset search query when toggling dimensions
  };

  const handleDimensionSelect = (dimensionKey, value, isSelected) => {
    setSelectedDimensions((prev) => {
      const currentSelected = prev[dimensionKey] || [];
      if (isSelected) {
        return {
          ...prev,
          [dimensionKey]: [...currentSelected, value]
        };
      } else {
        return {
          ...prev,
          [dimensionKey]: currentSelected.filter(v => v !== value)
        };
      }
    });
  };

  const handleSelectAll = (dimensionKey, categories) => {
    setSelectedDimensions((prev) => ({
      ...prev,
      [dimensionKey]: Object.keys(categories)
    }));
  };

  const handleClearAll = (dimensionKey) => {
    setSelectedDimensions((prev) => ({
      ...prev,
      [dimensionKey]: []
    }));
  };

  const filteredCategories = (categories) => {
    return Object.entries(categories || {}).filter(([code, label]) =>
      label.toLowerCase().includes(searchQuery.toLowerCase())
    );
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
            <span className="hover:text-white cursor-pointer transition-colors duration-200">
              <a href="/datasets">Datasets</a>
            </span>
            <span className="mx-2 text-blue-100/40">/</span>
            <span className="text-white">{label}</span>
          </nav>
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="md:w-3/4">
              <h1 className="text-4xl font-medium text-white leading-tight">{label}</h1>
              <p className="mt-6 text-blue-100 text-lg leading-relaxed">
                {extension?.product?.value || 'No description available'}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <div className="flex items-center text-blue-100">
                  <Calendar size={16} className="mr-2" />
                  <span className="text-sm">{new Date(updated).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center text-blue-100">
                  <Clock size={16} className="mr-2" />
                  <span className="text-sm">Updated on {new Date(updated).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {[
                { icon: Share2, label: 'API' },
                { icon: Download, label: 'Download' },
              ].map((item, i) => (
                <button
                  key={i}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white flex items-center space-x-2 transition-all duration-200"
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-2/3">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-xl font-medium text-gray-900 mb-6">Description</h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  {note?.[1]?.replace(/\[url=(.*?)\](.*?)\[\/url\]/g, '[$2]($1)') || 'No additional notes available'}
                </p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-8 mt-8">
              <h2 className="text-xl font-medium text-gray-900 mb-6">Select Dimensions</h2>
              <div className="space-y-4">
                {Object.entries(dimension || {}).map(([key, value]) => {
                  const hasLongDescription = value.label.split(' ').length > 10;
                  const hasManyRecords = Object.keys(value.category?.label || {}).length > 100;

                  return (
                    <div key={key} className="border border-gray-100 overflow-hidden">
                      <button
                        onClick={() => handleDimensionToggle(key)}
                        className="w-full px-6 py-4 bg-white hover:bg-gray-50 transition-colors duration-150 flex justify-between items-center"
                      >
                        <div>
                          <div className="text-left text-gray-800 font-medium">{value.label}</div>
                          {selectedDimensions[key]?.length > 0 && (
                            <div className="text-sm text-gray-500 mt-1">{selectedDimensions[key]?.length} selected</div>
                          )}
                        </div>
                        <ChevronDown
                          size={20}
                          className={`text-gray-400 transition-transform duration-200 ${openDimension === key ? 'transform rotate-180' : ''}`}
                        />
                      </button>
                      
                      {openDimension === key && (
                        <div className="border-t border-gray-100">
                          <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <div className="text-sm text-gray-500">
                              {selectedDimensions[key]?.length || 0} of {Object.keys(value.category?.label || {}).length} selected
                            </div>
                            <div className="flex items-center space-x-4">
                              <button
                                onClick={() => handleSelectAll(key, value.category?.label)}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Select all
                              </button>
                              <button
                                onClick={() => handleClearAll(key)}
                                className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                              >
                                Clear all
                              </button>
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {hasManyRecords && (
                              <div className="p-4 border-b border-gray-100">
                                <div className="relative">
                                  <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
                                </div>
                              </div>
                            )}
                           <div className={`grid ${
  filteredCategories(value.category?.label).some(([_, label]) => 
    label.split(' ').length > 10 || label.length > 60
  ) ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
} gap-2 p-4`}>
  {filteredCategories(value.category?.label).map(([code, label]) => {
    const isSelected = selectedDimensions[key]?.includes(code);
    return (
      <div key={code} className="flex items-center">
        <button
          onClick={() => handleDimensionSelect(key, code, !isSelected)}
          className={`flex items-center w-full p-2 rounded hover:bg-gray-100 transition-colors duration-150 ${isSelected ? 'bg-blue-50' : ''}`}
        >
          <div className={`w-5 h-5 rounded flex items-center justify-center ${isSelected ? 'bg-blue-600' : 'border border-gray-300'}`}>
            {isSelected && <Check size={14} className="text-white" />}
          </div>
          <span className="ml-3 text-gray-700 text-sm whitespace-normal text-left">
            {label}
          </span>
        </button>
      </div>
    );
  })}
</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="lg:w-1/3">
            <div className="sticky top-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Downloads</h3>
                {link?.alternate?.map((item, index) => (
                  <a
                    key={index}
                    href={item.href}
                    className="w-full mb-4 p-4 bg-gray-50 hover:bg-gray-100 transition-colors duration-150 flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      {item.type === 'text/csv' ? (
                        <FileText size={20} className="text-blue-600 mr-3" />
                      ) : (
                        <Table size={20} className="text-green-600 mr-3" />
                      )}
                      <div className="text-left">
                        <h4 className="font-medium text-gray-900">
                          {item.type === 'text/csv' ? 'CSV Data' : 'Supporting Data'}
                        </h4>
                        <p className="text-sm text-gray-500">{item.type.split('/')[1].toUpperCase()} • {item.href.split('/').pop().split('.').pop().toUpperCase()}</p>
                      </div>
                    </div>
                    <Download size={18} className="text-gray-400" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dataset;