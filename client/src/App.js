import React from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import routes from './routes';
import Footer from './components/Footer';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';

const AppContent = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="flex flex-col min-h-screen">
      {!isLoginPage && <Header />}
      <main className={`flex-grow ${!isLoginPage ? 'pt-16' : ''}`}>
        <Routes>
          {routes.map(({ path, element, protected: isProtected }, index) => (
            <Route
              key={index}
              path={path}
              element={
                isProtected ? (
                  <ProtectedRoute>
                    {element}
                  </ProtectedRoute>
                ) : (
                  element
                )
              }
            />
          ))}
          {/* Catch-all route for undefined paths */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
      {!isLoginPage && <Footer />}
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;