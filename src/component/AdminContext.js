import { createContext, useState, useEffect } from 'react';
import { decryptToken } from '../utils/securetoken';
import {jwtDecode} from 'jwt-decode';
import { toast } from 'react-toastify';

export const AdminContext = createContext(null);

export const AdminProvider = ({ children }) => {
  const [adminName, setAdminName] = useState('Admin User');

  useEffect(() => {
    const encoded = sessionStorage.getItem('adminToken');
    if (encoded) {
      decryptToken(encoded)
        .then((token) => {
          const decoded = jwtDecode(token);
          setAdminName(decoded.adminname || 'Admin User');
        })
        .catch(() => {
          toast.error('Session expired. Please login again.');
          window.location.href = '/adminlogin';
        });
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    toast.success('Logged out');
    window.location.href = '/adminlogin';
  };

  return (
    <AdminContext.Provider value={{ adminName, handleLogout }}>
      {children}
    </AdminContext.Provider>
  );
};
