import React from 'react';

function HeroSection() {
  return (
    <div style={styles.heroContainer}>
      <img
        src="https://via.placeholder.com/1200x400"
        alt="Scottish Government Open Data"
        style={styles.heroImage}
      />
      <h1 style={styles.heroTitle}>Scottish Government Open Data</h1>
    </div>
  );
}

const styles = {
  heroContainer: {
    position: 'relative',
    textAlign: 'center',
    color: '#fff',
    marginBottom: '20px',
  },
  heroImage: {
    width: '100%',
    height: 'auto',
  },
  heroTitle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '3rem',
    fontWeight: 'bold',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)',
  },
};

export default HeroSection;