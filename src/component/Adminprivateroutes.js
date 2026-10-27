import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { isAdminAuthenticated } from "../utils/adminAuthenticate";

const Adminprivateroutes = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const result = await isAdminAuthenticated();
      setIsAdmin(result);
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return <div>Loading...</div>; // or your loading spinner
  }

  if (!isAdmin) {
    return <Navigate to="/adminlogin" replace />;
  }

  return children;
};

export default Adminprivateroutes;
