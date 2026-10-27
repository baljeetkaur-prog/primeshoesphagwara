import { useEffect, useState, createContext } from 'react';
import './App.css';
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { matchPath, useLocation } from "react-router-dom";

import Offcanvas from './component/Offcanvas';
import Header from './component/Header';
import Footer from './component/Footer';
import Searchmodal from './component/Searchmodal';
import SiteRoutes from './component/Siteroutes';
import Scrolltotop from './component/Scrolltotop';
import ScrollToTopButton from './component/ScrollToTopButton';

export const UserContext = createContext(null);
export const dataContext = createContext(null);

function App() {
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();   // ✅ get current path

const getInitialUser = () => {
  try {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("uinfo");

    if (!token || !userData) {
      return null;
    }

    return JSON.parse(userData);
  } catch (error) {
    console.error("Error parsing user data");
    localStorage.removeItem("token");
    localStorage.removeItem("uinfo");
    return null;
  }
};

 const [user, setUser] = useState(() => getInitialUser());
  const [carttotal, setcarttotal] = useState(0);
  const [itemcount, setitemcount] = useState(0);

  const API = process.env.REACT_APP_APIURL;

  // ✅ Define fetchCartCount
  const fetchCartCount = async (email) => {
    try {
      const res = await axios.get(`${API}/api/cart-count/${email}`);
      if (res.data.success) {
        setitemcount(res.data.count || 0);
      } else {
        setitemcount(0);
      }
    } catch (error) {
      console.error("Error fetching cart count:", error);
      setitemcount(0);
    }
  };

useEffect(() => {

  if (user) {

    localStorage.setItem("uinfo", JSON.stringify(user));

    fetchCartCount(user.email);

  } else {

    localStorage.removeItem("uinfo");

    localStorage.removeItem("token");

    setitemcount(0);
  }

}, [user]);

  useEffect(() => {
    AOS.init({
      duration: 700,
      easing: 'ease-in-out',
      once: true,
      mirror: false,
    });
  }, []);

  // ✅ Define routes where Header/Footer should be hidden
const hideLayoutPaths = [
  "/login",
  "/register",
  "/thankyou",
  "/changepassword",
  "/adminlogin",
  "/adminregister",
  "/admindashboard",
  "/manageproducts",
  "/adminorders",
  "/adminsales",
  "/adminreturnsandcancel",
  "/adminlowstock",
  "/adminusers",
  "/adminchangepass",
  "/addadmin",
  "/adminproducts", 
  "/adminproduct/:id"
];

const shouldHideLayout = hideLayoutPaths.some(path => 
  matchPath({ path, end: true }, location.pathname)
);

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      <UserContext.Provider value={{ user, setUser }}>
        <dataContext.Provider value={{ carttotal, setcarttotal, itemcount, setitemcount, fetchCartCount }}>
          <Offcanvas />

          {/* ✅ Hide Header/Footer on login/register */}
          {!shouldHideLayout && <Header onSearchClick={() => setSearchOpen(true)} />}

          <Scrolltotop />
          <SiteRoutes />
          <ScrollToTopButton/>

          {!shouldHideLayout && <Footer />}

          <Searchmodal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        </dataContext.Provider>
      </UserContext.Provider>
    </>
  );
}

export default App;
