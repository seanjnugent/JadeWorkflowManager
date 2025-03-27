import React, { useState } from 'react';

function SearchBar() {
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    alert(`Searching for: ${query}`);
  };

  return (
    <form onSubmit={handleSearch} style={styles.searchContainer}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search datasets..."
        style={styles.searchInput}
      />
      <button type="submit" style={styles.searchButton}>
        Search
      </button>
    </form>
  );
}

const styles = {
  searchContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  searchInput: {
    padding: '10px',
    fontSize: '1rem',
    width: '300px',
    border: '1px solid #ccc',
    borderRadius: '4px 0 0 4px',
  },
  searchButton: {
    padding: '10px 20px',
    fontSize: '1rem',
    backgroundColor: '#0065bd',
    color: '#fff',
    border: 'none',
    borderRadius: '0 4px 4px 0',
    cursor: 'pointer',
  },
};

export default SearchBar;