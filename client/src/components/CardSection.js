import React from 'react';

function CardSection() {
  const cards = [
    { title: 'Dataset 1', description: 'Description of dataset 1.' },
    { title: 'Dataset 2', description: 'Description of dataset 2.' },
    { title: 'Dataset 3', description: 'Description of dataset 3.' },
  ];

  return (
    <div style={styles.cardContainer}>
      {cards.map((card, index) => (
        <div key={index} style={styles.card}>
          <h3 style={styles.cardTitle}>{card.title}</h3>
          <p style={styles.cardDescription}>{card.description}</p>
        </div>
      ))}
    </div>
  );
}

const styles = {
  cardContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: '#fff',
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  cardTitle: {
    fontSize: '1.2rem',
    marginBottom: '10px',
    color: '#0065bd',
  },
  cardDescription: {
    fontSize: '1rem',
    color: '#333',
  },
};

export default CardSection;