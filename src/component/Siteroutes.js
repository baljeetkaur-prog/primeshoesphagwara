import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './Home';
import Register from './Register';
import Login from './Login';
import Product from './Products';
import Productdetail from './Productdetail';
import Cart from './Cart';
import Checkout from './Checkout';
import Orders from './Orders';
import Thankyoupage from './Thankyoupage';
import Rateprod from './Rateprod';
import Contact from './Contact';
import Changepass from './Changepass';
import About from './About';
import FAQ from './FAQ';
import Adminregister from './Adminregister';
import Adminlogin from './Adminlogin';
import Admindashboard from './Admindashboard';
import Adminproddetail from './Adminproddetail';
import Manageproducts from './Manageproducts';
import Adminorders from './Adminorders';
import Adminsales from './Adminsales';
import Adminusers from './Adminusers';
import Adminlowstock from './Adminlowstock';
import Addnewadmin from './Addnewadmin';
import Adminchangepass from './Adminchangepass';
import Adminprivateroutes from './Adminprivateroutes';
import Adminreturns from './Adminreturns';
import Privacypolicy from './Privacypolicy';
import Cancelrefundpolicy from './Cancelrefundpolicy';
import Pricingpolicy from './Pricingpolicy';
import Termsandconditions from './Termsandconditions';
import AdminProducts from './Adminproducts';

// ✅ Import AdminProvider
import { AdminProvider } from './AdminContext';
import ManageCoupons from './ManageCoupons';

const SiteRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/products" element={<Product />} />
      <Route path="/product/:slug" element={<Productdetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/thankyou" element={<Thankyoupage />} />
      <Route path="/rate/:id" element={<Rateprod />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/changepassword" element={<Changepass />} />
      <Route path="/about" element={<About />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/privacypolicy" element={<Privacypolicy />} />
      <Route path="/cancelrefundpolicy" element={<Cancelrefundpolicy />} />
      <Route path="/pricingpolicy" element={<Pricingpolicy />} />
      <Route path="/termsconditions" element={<Termsandconditions />} />

      {/* Admin public routes */}
      <Route path="/adminregister" element={<Adminregister />} />
      <Route path="/adminlogin" element={<Adminlogin />} />

      {/* ✅ Admin private routes wrapped in AdminProvider */}
      <Route
        path="/admindashboard"
        element={
          <AdminProvider>
            <Adminprivateroutes>
              <Admindashboard />
            </Adminprivateroutes>
          </AdminProvider>
        }
      />
      <Route
        path="/adminproduct/:id"
        element={
          <AdminProvider>
            <Adminprivateroutes>
              <Adminproddetail />
            </Adminprivateroutes>
          </AdminProvider>
        }
      />
      <Route
        path="/manageproducts"
        element={
          <AdminProvider>
            <Adminprivateroutes>
              <Manageproducts />
            </Adminprivateroutes>
          </AdminProvider>
        }
      />
         <Route
        path="/managecoupons"
        element={
          <AdminProvider>
            <Adminprivateroutes>
              <ManageCoupons />
            </Adminprivateroutes>
          </AdminProvider>
        }
      />
      <Route
        path="/adminorders"
        element={
          <AdminProvider>
            <Adminprivateroutes>
              <Adminorders />
            </Adminprivateroutes>
          </AdminProvider>
        }
      />
      <Route
        path="/adminsales"
        element={
          <AdminProvider>
            <Adminprivateroutes>
              <Adminsales />
            </Adminprivateroutes>
          </AdminProvider>
        }
      />
      <Route
        path="/adminusers"
        element={
          <AdminProvider>
            <Adminprivateroutes>
              <Adminusers />
            </Adminprivateroutes>
          </AdminProvider>
        }
      />
      <Route
        path="/adminlowstock"
        element={
          <AdminProvider>
            <Adminprivateroutes>
              <Adminlowstock />
            </Adminprivateroutes>
          </AdminProvider>
        }
      />
      <Route
        path="/addadmin"
        element={
          <AdminProvider>
            <Adminprivateroutes>
              <Addnewadmin />
            </Adminprivateroutes>
          </AdminProvider>
        }
      />
      <Route
        path="/adminchangepass"
        element={
          <AdminProvider>
            <Adminprivateroutes>
              <Adminchangepass />
            </Adminprivateroutes>
          </AdminProvider>
        }
      />
      <Route
        path="/adminreturnsandcancel"
        element={
          <AdminProvider>
            <Adminprivateroutes>
              <Adminreturns />
            </Adminprivateroutes>
          </AdminProvider>
        }
      />
      <Route
        path="/adminproducts"
        element={
          <AdminProvider>
            <Adminprivateroutes>
              <AdminProducts />
            </Adminprivateroutes>
          </AdminProvider>
        }
      />
    </Routes>
  );
};

export default SiteRoutes;
