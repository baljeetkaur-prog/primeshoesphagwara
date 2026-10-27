import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Productsection.css'

const filters = ['All', 'Women’s', 'Men’s', 'Kid’s', 'Handbags', 'Accessories'];

const categoryMap = {
  'All': '*',
  'Women’s': 'women',
  'Men’s': 'men',
  'Kid’s': 'kids',
  'Handbags': 'handbags',
  'Accessories': 'accessories'
};

const Productsection = () => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [products, setProducts] = useState([]);
  const [modalImage, setModalImage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const API = process.env.REACT_APP_APIURL;

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const selectedKey = categoryMap[activeFilter];
        const categoryParam = selectedKey && selectedKey !== '*' ? `?category=${selectedKey}` : '';
        const res = await axios.get(`${API}/api/latest${categoryParam}`);
        setProducts(res.data || []);
      } catch (err) {
        console.error('Error fetching products:', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [API, activeFilter]);

  // Set background images for products
  useEffect(() => {
    const timeout = setTimeout(() => {
      const elements = document.querySelectorAll('.set-bg');
      elements.forEach((el) => {
        const bg = el.getAttribute('data-setbg');
        el.style.backgroundImage = `url(${bg})`;
      });
    }, 0);

    return () => clearTimeout(timeout);
  }, [products]);
  const getTotalStock = (product) => {
  return (
    product?.variants?.reduce(
      (total, variant) => total + (variant.quantity || 0),
      0
    ) || 0
  );
};

  return (
    <section className="product spad" style={{ paddingLeft: '20px', paddingRight: '20px' }}>
      <div className="row">
        <div className="col-lg-4 col-md-4">
          <div className="section-title" style={{ marginBottom: '4px' }}>
            <h4>New Products</h4>
            <div style={{ marginTop: '8px', marginBottom: '10px' }}>
              <Link to="/products" className="view-more-btn">
                View More
              </Link>
            </div>
          </div>
        </div>

        <div className="col-lg-8 col-md-8">
          <ul className="filter__controls">
            {filters.map((filter) => (
              <li
                key={filter}
                className={activeFilter === filter ? 'active' : ''}
                onClick={() => setActiveFilter(filter)}
                style={{ cursor: 'pointer' }}
              >
                {filter}
              </li>
            ))}
          </ul>
        </div>
      </div>

    <div className="row property__gallery">
  {loading ? (
    // Skeleton loader
    Array.from({ length: 8 }).map((_, idx) => (
      <div key={idx} className="col-lg-3 col-md-4 col-sm-6">
        <div className="skeleton-card">
          <div className="skeleton skeleton-image"></div>
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-price"></div>
        </div>
      </div>
    ))
  ) : products.length === 0 ? (
    <div className="col-12 text-center mt-4">
      <p>No products found in this category.</p>
    </div>
  ) : (
    products.slice(0, 12).map((product) => (
      <div
        key={product._id}
        className={`col-lg-3 col-md-4 col-sm-6 mix ${product.category}`}
      >
        <div className={`product__item ${product.label === 'Sale' ? 'sale' : ''}`}>
       <Link
  to={`/product/${product.slug}`}
  state={{ product }}
>
            <div
              className="product__item__pic set-bg"
              data-setbg={
                product?.mainImage?.url
                  ? product.mainImage.url
                  : `/uploads/${product.mainImage}`
              }
            >
          {(getTotalStock(product) <= 0 || product.label === 'Out Of Stock') ? (
  <div className="label stockout stockblue">Out Of Stock</div>
) : (
  product.label && (
    <div className={`label ${product.label.toLowerCase().replace(/ /g, '')}`}>
      {product.label}
    </div>
  )
)}

              <ul className="product__hover">
                <li>
                  <a
                    href="#!"
                    onClick={(e) => {
                      e.preventDefault();
                      setModalImage(
                        product?.mainImage?.url
                          ? product.mainImage.url
                          : `/uploads/${product.mainImage}`
                      );
                      setShowModal(true);
                    }}
                  >
                    <span className="arrow_expand"></span>
                  </a>
                </li>
        {getTotalStock(product) > 0 && product.label !== 'Out Of Stock' && (
  <li>
    <a href="#"><span className="icon_bag_alt"></span></a>
  </li>
)}
              </ul>
            </div>
          </Link>

          <div className="product__item__text">
            <h6>
             <Link
  to={`/product/${product.slug}`}
  state={{ product }}
>
                {product.title.length > 35
                  ? product.title.substring(0, 35) + '...'
                  : product.title}
              </Link>
            </h6>
            <div className="rating">
              {[...Array(5)].map((_, i) => (
                <i
                  key={i}
                  className={`fa fa-star${i < (product.rating || 5) ? '' : '-o'}`}
                ></i>
              ))}
            </div>
            <div className="product__price">
              ₹{product.discountedPrice}
              {product.originalPrice > product.discountedPrice && (
                <span>₹{product.originalPrice}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    ))
  )}
</div>


      {showModal && (
        <div className="image-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={modalImage} alt="Zoomed" />
            <button className="close-modal" onClick={() => setShowModal(false)}>×</button>
          </div>
        </div>
      )}
    </section>
  );
};

export default Productsection;
