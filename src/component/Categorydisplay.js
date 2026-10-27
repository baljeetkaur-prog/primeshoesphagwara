import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './Productsection.css';
import './Trends.css';

const Categorydisplay = () => {
  const [categories, setCategories] = useState({});
  const [modalImage, setModalImage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const API = process.env.REACT_APP_APIURL;

  useEffect(() => {
    const fetchCategoryProducts = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${API}/api/products/categories/all`);
        setCategories(data);
      } catch (err) {
        console.error('Error fetching category products:', err);
        setCategories({});
      } finally {
        setLoading(false);
      }
    };
    fetchCategoryProducts();
  }, [API]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      document.querySelectorAll('.set-bg').forEach((el) => {
        const bg = el.getAttribute('data-setbg');
        if (bg) el.style.backgroundImage = `url(${bg})`;
      });
    }, 0);
    return () => clearTimeout(timeout);
  }, [categories]);
  const getTotalStock = (product) => {
  return (
    product?.variants?.reduce(
      (total, variant) => total + (variant.quantity || 0),
      0
    ) || 0
  );
};
  

  const renderItems = (items) =>
    items?.map((item) => (
      <div key={item._id} className={`mix ${item.category}`}>
        <div className={`product__item ${item.label === 'Sale' ? 'sale' : ''}`}>
         <Link
  to={`/product/${item.slug}`}
  state={{ product: item }}
>
            <div
              className="product__item__pic set-bg"
              data-setbg={item?.mainImage?.url || `/uploads/${item.mainImage}`}
            >
            {(getTotalStock(item) <= 0 || item.label === 'Out Of Stock') ? (
  <div className="label stockout stockblue">Out Of Stock</div>
) : (
  item.label && (
    <div className={`label ${item.label.toLowerCase().replace(/ /g, '')}`}>
      {item.label}
    </div>
  )
)}
              <ul className="product__hover">
                <li>
                  <a
                    href="#!"
                    onClick={(e) => {
                      e.preventDefault();
                      const imgSrc = item?.mainImage?.url || `/uploads/${item.mainImage}`;
                      setModalImage(imgSrc);
                      setShowModal(true);
                    }}
                  >
                    <span className="arrow_expand"></span>
                  </a>
                </li>
            {getTotalStock(item) > 0 && item.label !== 'Out Of Stock' && (
  <li>
    <a href="#!"><span className="icon_bag_alt"></span></a>
  </li>
)}
              </ul>
            </div>
          </Link>
          <div className="product__item__text">
            <h6>
             <Link
  to={`/product/${item.slug}`}
  state={{ product: item }}
>
                {item.title.length > 35 ? item.title.substring(0, 35) + '...' : item.title}
              </Link>
            </h6>
            <div className="rating">
              {[...Array(5)].map((_, i) => (
                <i key={i} className={`fa fa-star${i < (item.rating || 5) ? '' : '-o'}`}></i>
              ))}
            </div>
            <div className="product__price">
              ₹{item.discountedPrice}
              {item.originalPrice > item.discountedPrice && <span>₹{item.originalPrice}</span>}
            </div>
          </div>
        </div>
      </div>
    ));

  const renderSkeleton = () =>
    Array.from({ length: 4 }).map((_, idx) => (
      <div key={idx} className="mix">
        <div className="skeleton-card">
          <div className="skeleton skeleton-image"></div>
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-price"></div>
        </div>
      </div>
    ));

  const categoryNames = [
    { key: 'women', label: 'Women’s Footwear & Apparel' },
    { key: 'men', label: 'Men’s Style Collection' },
    { key: 'kids', label: 'Kids’ Trendy Picks' },
    { key: 'handbags', label: 'Premium Handbags' },
    { key: 'accessories', label: 'Stylish Accessories' }
  ];

  return (
    <section className="trend spad">
    {categoryNames
  .filter((cat) => categories[cat.key]?.length > 0)
  .map((cat, index) => (
        <div
          key={cat.key}
          className={`trend__content no-gap`}
          style={{ backgroundColor: index % 2 === 0 ? '#f5f5f5' : '#ffffff' }}
        >
          <div className="section-title">
            <h4>{cat.label}</h4>
            <div className="view-more-wrapper">
              <Link to={`/products?category=${cat.key}`} className="view-more-btn">View More</Link>
            </div>
          </div>
          <div className="trend-container">
            {loading
              ? renderSkeleton()
              : categories[cat.key]?.length > 0
                ? renderItems(categories[cat.key].slice(0, 4))
                : <p style={{ padding: '20px', color: '#666' }}>No products found in this category.</p>
            }
          </div>
        </div>
      ))}

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

export default Categorydisplay;
