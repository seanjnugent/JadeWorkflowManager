import React, { useState } from 'react';

function NestedMenu() {
  const [activeMenu, setActiveMenu] = useState(null);

  const toggleMenu = (index) => {
    setActiveMenu(activeMenu === index ? null : index);
  };

  const menuItems = [
    { title: 'Economy', subItems: ['GDP', 'Inflation', 'Employment'] },
    { title: 'Environment', subItems: ['Air Quality', 'Water Usage', 'Waste Management'] },
    { title: 'Health', subItems: ['Hospitals', 'Vaccinations', 'Public Health'] },
  ];

  return (
    <div style={styles.menuContainer}>
      {menuItems.map((item, index) => (
        <div key={index}>
          <div
            onClick={() => toggleMenu(index)}
            style={{
              ...styles.menuItem,
              backgroundColor: activeMenu === index ? '#0065bd' : '#fff',
              color: activeMenu === index ? '#fff' : '#000',
            }}
          >
            {item.title}
          </div>
          {activeMenu === index && (
            <ul style={styles.subMenu}>
              {item.subItems.map((subItem, idx) => (
                <li key={idx} style={styles.subMenuItem}>
                  {subItem}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

const styles = {
  menuContainer: {
    marginBottom: '20px',
  },
  menuItem: {
    padding: '10px',
    cursor: 'pointer',
    border: '1px solid #ccc',
    borderTop: 'none',
    textAlign: 'left',
  },
  subMenu: {
    listStyleType: 'none',
    padding: '0',
    margin: '0',
    backgroundColor: '#f9f9f9',
    borderBottom: '1px solid #ccc',
  },
  subMenuItem: {
    padding: '10px',
    cursor: 'pointer',
    borderBottom: '1px solid #ccc',
  },
};

export default NestedMenu;