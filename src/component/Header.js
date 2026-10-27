import React, { useContext, useEffect, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { UserContext, dataContext } from "../App";
import { jwtDecode } from "jwt-decode";
import { decryptToken } from "../utils/securetoken";
import { toast } from "react-toastify";
import "./Header.css";
import {
  FiChevronLeft,
  FiChevronRight,
  FiPackage,
  FiLock,
  FiLogOut,
  FiUser
} from "react-icons/fi";

const Header = () => {
  const { user, setUser } = useContext(UserContext);
  const { itemcount, fetchCartCount } = useContext(dataContext);

  const navigate = useNavigate();
  const location = useLocation();
  const hideHeaderOnRoutes = ["/adminlogin", "/adminregister"].includes(location.pathname);

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef();

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const searchRef = useRef();

  useEffect(() => {
    const checkAdminStatus = async () => {
      const token = sessionStorage.getItem("adminToken");
      if (!token) return setIsAdmin(false);
      try {
        const decrypted = await decryptToken(token);
        const decoded = jwtDecode(decrypted);
        setIsAdmin(true);
        setAdminRole(decoded.role);
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
    window.addEventListener("adminLogin", checkAdminStatus);
    window.addEventListener("storage", checkAdminStatus);
    return () => {
      window.removeEventListener("adminLogin", checkAdminStatus);
      window.removeEventListener("storage", checkAdminStatus);
    };
  }, []);

  useEffect(() => {
    if (user?.email) fetchCartCount(user.email);
  }, [user, fetchCartCount]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleLogout = () => {
    setUser(null);
    setIsAdmin(false);
    setAdminRole(null);
    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("uinfo");
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (!value.trim()) return setSuggestions([]);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
      const data = await res.json();
      setSuggestions(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery("");
    setShowSearch(false);
  };

  // 🔹 Check active link
  const isLinkActive = (path, category = null) => {
    if (location.pathname !== path) return false;
    if (!category) return true;
    const params = new URLSearchParams(location.search);
    return params.get("category") === category;
  };

  return (
    <header className="primeheader">
      <div className="primeheader-left">
        <Link to="/" className="primeheader-logo">
          <img src="/img/prime-logo.png" alt="Prime Logo" />
        </Link>
        {!hideHeaderOnRoutes && (
          <button
            className={`primeheader-mobile-toggle ${mobileMenuOpen ? "open" : ""}`}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        )}
      </div>

      {!hideHeaderOnRoutes && (
        <nav className="primeheader-nav">
          <ul>
            {isAdmin ? (
              <li>
                <Link to="/admindashboard" className={isLinkActive("/admindashboard") ? "active" : ""}>
                  Admin Home
                </Link>
              </li>
            ) : (
              <>
                <li>
                  <Link to="/" className={isLinkActive("/") ? "active" : ""}>
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    to="/products?category=women"
                    className={isLinkActive("/products", "women") ? "active" : ""}
                  >
                    Women’s
                  </Link>
                </li>
                <li>
                  <Link
                    to="/products?category=men"
                    className={isLinkActive("/products", "men") ? "active" : ""}
                  >
                    Men’s
                  </Link>
                </li>
                <li>
                  <Link
                    to="/products?category=kids"
                    className={isLinkActive("/products", "kids") ? "active" : ""}
                  >
                    Kids
                  </Link>
                </li>
                <li>
                  <Link
                    to="/products?category=handbags"
                    className={isLinkActive("/products", "handbags") ? "active" : ""}
                  >
                    Handbags
                  </Link>
                </li>
                <li>
                  <Link
                    to="/products?category=accessories"
                    className={isLinkActive("/products", "accessories") ? "active" : ""}
                  >
                    Accessories
                  </Link>
                </li>  
              </>
            )}
          </ul>
        </nav>
      )}

      {!hideHeaderOnRoutes && (
        <div className="primeheader-right">
          {isAdmin ? (
            <div className="primeheader-admin">
              <span>Welcome, {adminRole === "superadmin" ? "Super Admin" : "Admin"}</span>
              <button onClick={handleLogout}>Logout</button>
            </div>
          ) : user ? (
            <div className="primeheader-user" ref={userDropdownRef}>
 <span
  className="primeheader-user-trigger"
  onClick={() => setShowUserDropdown((p) => !p)}
>
  <FiUser />
  <span>Hi, {user.name.split(" ")[0]}!</span>
</span>
              {showUserDropdown && (
              <div className="primeheader-user-dropdown">
  <Link
    to="/orders"
    onClick={() => setShowUserDropdown(false)}
  >
    <FiPackage />
    <span>My Orders</span>
  </Link>

  <Link
    to="/changepassword"
    onClick={() => setShowUserDropdown(false)}
  >
    <FiLock />
    <span>Change Password</span>
  </Link>

  <button onClick={handleLogout}>
    <FiLogOut />
    <span>Logout</span>
  </button>
</div>
              )}
            </div>
          ) : (
            <div className="primeheader-auth">
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </div>
          )}

          {!isAdmin && (
            <div className="primeheader-search" ref={searchRef}>
              <button onClick={() => setShowSearch((p) => !p)}>
                <span className="icon_search"></span>
              </button>
              {showSearch && (
                <form onSubmit={handleSearchSubmit} className="primeheader-search-dropdown">
                  <input
                    type="text"
                    className="headersearch"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search products..."
                    autoFocus
                  />
                  <button type="submit">Go</button>
                  {suggestions.length > 0 && (
                    <ul>
                      {suggestions.map((item) => (
                        <li
                          key={item._id}
                          onClick={() => {
                            navigate(`/products?q=${encodeURIComponent(item.name)}`);
                            setSearchQuery("");
                            setSuggestions([]);
                            setShowSearch(false);
                          }}
                        >
                          {item.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </form>
              )}
            </div>
          )}

          {!isAdmin && (
            <Link to={user ? "/cart" : "/login"} className="primeheader-cart">
              <span className="icon_bag_alt"></span>
              {itemcount > 0 && <div className="primeheader-cart-count">{itemcount}</div>}
            </Link>
          )}
        </div>
      )}

      <div className={`primeheader-mobile-menu ${mobileMenuOpen ? "open" : ""}`}>
        <ul>
          {isAdmin ? (
            <li>
              <Link to="/admindashboard" onClick={() => setMobileMenuOpen(false)}>Admin Home</Link>
            </li>
          ) : (
            <>
              <li><Link to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link></li>
              <li><Link to="/products?category=women" onClick={() => setMobileMenuOpen(false)}>Women’s</Link></li>
              <li><Link to="/products?category=men" onClick={() => setMobileMenuOpen(false)}>Men’s</Link></li>
              <li><Link to="/products?category=kids" onClick={() => setMobileMenuOpen(false)}>Kids</Link></li>
              <li><Link to="/products?category=handbags" onClick={() => setMobileMenuOpen(false)}>Handbags</Link></li>
              <li><Link to="/products?category=accessories" onClick={() => setMobileMenuOpen(false)}>Accessories</Link></li>
           

        

              {!user && (
                <>
                  <li><Link to="/login" onClick={() => setMobileMenuOpen(false)}>Login</Link></li>
                  <li><Link to="/register" onClick={() => setMobileMenuOpen(false)}>Register</Link></li>
                </>
              )}
            </>
          )}
        </ul>
      </div>
    </header>
  );
};

export default Header;
