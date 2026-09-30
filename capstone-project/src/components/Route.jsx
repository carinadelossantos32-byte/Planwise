import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router';
import { auth, onAuthStateChanged } from '../firebase-config';

const ProtectedRoute = ({ allowedRole }) => {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        const storedRole = localStorage.getItem('userRole');
        setUserRole(storedRole);
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
        localStorage.removeItem('userRole');
      }
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  if (checkingAuth) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <p style={{ color: '#091F7A', fontWeight: 600, fontSize: '15px' }}>Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Logged in, but trying to access the wrong dashboard role
  if (allowedRole && userRole !== allowedRole) {
    const redirectPath = userRole === 'cpd' ? '/dashboard/cpd' : '/dashboard/health';
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;