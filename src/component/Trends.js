import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './Productsection.css';
import './Trends.css';

const Trends = () => {
  const [trends, setTrends] = useState({
    newArrivals: [],
    trendingNow: []
  });
  const [modalImage, setModalImage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const API = process.env.REACT_APP_APIURL;

  useEffect(() => {
    const fetchTrends = async () => {
      setLoading(true);
      try {
        const [{ data: trendProducts }, { data: trendingData }] = await Promise.all([
          axios.get(`${API}/api/trendproducts`),
          axios.get(`${API}/api/trending`)
        ]);

        const shuffleArray = (arr) =>
          arr
            .map((item) => ({ item, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ item }) => item);

        setTrends({
          newArrivals: shuffleArray(trendProducts.newArrivals || []),
          trendingNow: trendingData || []
        });
      } catch (err) {
        console.error('Error fetching trend data:', err);
        setTrends({ newArrivals: [], trendingNow: [] });
      } finally {
        setLoading(false);
      }
    };
    fetchTrends();
  }, [API]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const elements = document.querySelectorAll('.set-bg');
      elements.forEach((el) => {
        const bg = el.getAttribute('data-setbg');
        el.style.backgroundImage = `url(${bg})`;
      });
    }, 0);
    return () => clearTimeout(timeout);
  }, [trends]);
  const getTotalStock = (product) => {
  return (
    product?.variants?.reduce(
      (total, variant) => total + (variant.quantity || 0),
      0
    ) || 0
  );
};

  const renderTrendItems = (items) =>
    items.map((item) => (
      <div key={item._id} className={`mix ${item.category}`}>
        <div className={`product__item ${item.label === 'Sale' ? 'sale' : ''}`}>
        <Link
  to={`/product/${item.slug}`}
  state={{ product: item }}
>
            <div
              className="product__item__pic set-bg"
              data-setbg={
                item?.mainImage?.url
                  ? item.mainImage.url
                  : `/uploads/${item.mainImage}`
              }
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
                      const imgSrc = item?.mainImage?.url
                        ? item.mainImage.url
                        : `/uploads/${item.mainImage}`;
                      setModalImage(imgSrc);
                      setShowModal(true);
                    }}
                  >
                    <span className="arrow_expand"></span>
                  </a>
                </li>
             {getTotalStock(item) > 0 && item.label !== 'Out Of Stock' && (
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
              {item.originalPrice > item.discountedPrice && (
                <span>₹{item.originalPrice}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    ));

  const renderSkeleton = () =>
    Array.from({ length: 8 }).map((_, idx) => (
      <div key={idx} className="mix">
        <div className="skeleton-card">
          <div className="skeleton skeleton-image"></div>
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-price"></div>
        </div>
      </div>
    ));

  return (
    <section className="trend spad">
      {/* New Arrivals */}
      <div className="trend__content trend-grey no-gap">
        <div className="section-title">
          <h4>New Arrivals</h4>
          <div className="view-more-wrapper">
            <Link to="/products" className="view-more-btn">View More</Link>
          </div>
        </div>
        <div className="trend-container">
          {loading ? renderSkeleton() :
            trends.newArrivals.slice(0, 8).length > 0 
              ? renderTrendItems(trends.newArrivals.slice(0, 8))
              : <p>No new arrivals found.</p>}
        </div>
      </div>

      {/* Trending Now */}
      <div className="trend__content trend-white no-gap">
        <div className="section-title">
          <h4>Trending Now</h4>
          <div className="view-more-wrapper">
            <Link to="/products" className="view-more-btn">View More</Link>
          </div>
        </div>
        <div className="trend-container">
          {loading ? renderSkeleton() :
            trends.trendingNow.slice(0, 8).length > 0
              ? renderTrendItems(trends.trendingNow.slice(0, 8))
              : <p>No trending products found.</p>}
        </div>
      </div>

      {/* Modal */}
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

export default Trends;
