import React from 'react';

const FileStructurePreview = ({ parsedFileStructure, handleTypeChange }) => {
  return (
    <div className="border border-gray-100 rounded-lg">
      <div className="bg-gray-50 px-4 py-3 font-medium text-sm">
        Detected File Structure (First 3 Samples)
      </div>
      <div className="p-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Column</th>
              <th className="border p-2 text-left">Type</th>
              <th className="border p-2 text-left">Format</th>
              <th className="border p-2 text-left">Samples</th>
            </tr>
          </thead>
          <tbody>
            {parsedFileStructure.map((col) => {
              const samples = col.samples || ['No samples available'];
              const typeOptions = ['string', 'integer', 'float', 'datetime', 'boolean'];

              return (
                <tr key={col.column} className="border-b">
                  <td className="border p-2 font-medium">{col.column}</td>
                  <td className="border p-2">
                    <select
                      className="w-full border rounded px-2 py-1"
                      value={col.type}
                      onChange={(e) => handleTypeChange(col.column, e.target.value)}
                    >
                      {typeOptions.map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border p-2">{col.format}</td>
                  <td className="border p-2">
                    <div className="space-y-1">
                      {samples.map((sample, idx) => (
                        <div key={idx} className="text-sm truncate">
                          {typeof sample === 'object' ? JSON.stringify(sample) : String(sample)}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FileStructurePreview;
