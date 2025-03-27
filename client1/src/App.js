import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; // Import React Router
import routes from './routes'; // Your route configuration
import Footer from './components/Footer'; // Import the footer component
import Header from './components/Header'; // Import the footer component


const App = () => {
  return (
    <Router>
      <div>
        {/* Define the routes */}
        <Header />
        <Routes>
          {routes.map(({ path, element }, index) => (
            <Route key={index} path={path} element={element} />
          ))}
        </Routes>
        
        {/* Add Footer */}
        <Footer />
      </div>
    </Router>
  );
};

export default App;
