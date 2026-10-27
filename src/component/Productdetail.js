import React, { useContext, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import axios from 'axios';
import { toast } from 'react-toastify';
import { encryptToken } from '../utils/securetoken';
import { decryptToken } from '../utils/securetoken';
import { dataContext } from '../App'; 
import { useNavigate, useLocation } from 'react-router-dom';


import 'swiper/css';
import 'swiper/css/navigation';
import './Productdetail.css'; // Your custom CSS
import Instagram from './Instagram';
import { FaShareAlt } from 'react-icons/fa';
import { Helmet } from 'react-helmet';

const ProductDetail = () => {
const { slug } = useParams();
 const location = useLocation();
  const [product, setProduct] = useState(
  location.state?.product || null
);
  const API = process.env.REACT_APP_APIURL;
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(null);
const [selectedSize, setSelectedSize] = useState(null);
const { fetchCartCount } = useContext(dataContext);
const navigate = useNavigate();
 const [modalImage, setModalImage] = useState(null);
 const [relatedProducts, setRelatedProducts] = useState([]);
 const availableColors = [
  ...new Set(
    product?.variants
      ?.map(v => v.color?.trim())
      ?.filter(Boolean)
  )
];

const availableSizes = [
  ...new Set(
    product?.variants
      ?.filter(v => !selectedColor || v.color === selectedColor)
      ?.map(v => v.size?.trim())
      ?.filter(Boolean)
  )
];

const selectedVariant = product?.variants?.find(
  v => v.color === selectedColor && v.size === selectedSize
);

const availableQuantity = selectedVariant?.quantity ?? 0;
const isVariantSelected = !!selectedVariant;

const totalQuantity =
  product?.variants?.reduce(
    (sum, v) => sum + Number(v.quantity || 0),
    0
  ) || 0;
 useEffect(() => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}, []);
const formatPrice = (price) => {
  if (!price && price !== 0) return '';
  return Number(price) % 1 === 0 ? Number(price) : price.toFixed(2);
};
useEffect(() => {
  setQuantity(1);
}, [selectedColor, selectedSize]);



useEffect(() => {
  const fetchProduct = async () => {
    try {
      let currentProduct = location.state?.product;

      if (!currentProduct) {
        const res = await axios.get(
          `${API}/api/products/slug/${slug}`
        );

        currentProduct = res.data;
        setProduct(currentProduct);
      }

      if (currentProduct?.category) {
        const relatedRes = await axios.get(
          `${API}/api/products/category/${encodeURIComponent(
            currentProduct.category
          )}`
        );

        setRelatedProducts(
          relatedRes.data
            .filter(p => p._id !== currentProduct._id)
            .slice(0, 9)
        );
      }
    } catch (err) {
      console.error("Product not found", err);
    }
  };

  fetchProduct();
}, [slug, location.state]);


const handleAddToCart = async () => {
  if (!selectedColor || !selectedSize) {
  toast.warn("Please select color and size");
  return;
}

if (!selectedVariant) {
  toast.error("Invalid variant selected");
  return;
}

if (quantity > availableQuantity) {
  toast.error(`Only ${availableQuantity} left in stock`);
  return;
}
 if (availableColors.length > 0 && !selectedColor) {
    toast.warn("Please select a color before adding to cart.");
    return;
  }
 if (availableSizes.length > 0 && !selectedSize) {
    toast.warn("Please select a size before adding to cart.");
    return;
  }

  const uinfo = JSON.parse(localStorage.getItem("uinfo"));
  const tokenObj = localStorage.getItem("token");

  if (!uinfo || !tokenObj) {
    toast.warning("Please login to add items to cart.");
    navigate("/login", { state: { from: window.location.pathname } });
    return;
  }

  try {
    const token = await decryptToken(tokenObj);
    const selectedQty = quantity;
const availableQty = availableQuantity;

if (selectedQty > availableQty) {
  toast.error(`Only ${availableQty} item(s) available in stock.`);
  return;
}

    const payload = {
       variantId: selectedVariant?._id || null,
      email: uinfo.email,
      productId: product._id,
      title: product.title,
      image: product.mainImage,
      quantity,
      discountPrice: product.discountedPrice,
      color: selectedColor || null,
      size: selectedSize || null
    };

    const res = await axios.post(`${API}/api/addtocart`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      }
    });

    if (res.data.success) {
      fetchCartCount(uinfo.email);
      navigate("/cart");
    } else {
      toast.error(res.data.message || "Failed to add to cart.");
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    toast.error("Something went wrong. Please try again.");
  }
};

const handleBuyNow = () => {
  if (availableColors.length > 0 && !selectedColor) {
    toast.warn("Please select a color before adding to cart.");
    return;
  }
 if (availableSizes.length > 0 && !selectedSize) {
    toast.warn("Please select a size before adding to cart.");
    return;
  }

  const uinfo = JSON.parse(localStorage.getItem("uinfo"));
  const tokenObj = localStorage.getItem("token");

  if (!uinfo || !tokenObj) {
    toast.warning("Please login to continue.");
    navigate("/login", { state: { from: window.location.pathname } });
    return;
  }

const selectedItem = {
  productId: product._id,
  variantId: selectedVariant?._id, // IMPORTANT

  title: product.title,
  image: product.mainImage,

  quantity,

  color: selectedColor || null,
  size: selectedSize || null,

  originalPrice: product.originalPrice,
  discountPrice: product.discountedPrice
};

  sessionStorage.setItem("buyNowItem", JSON.stringify(selectedItem));
  sessionStorage.setItem("buyNowMode", "true");
  navigate("/checkout");
};
const isSizeOutOfStock = (size) => {

  // If no color selected yet,
  // check stock across ALL colors
  if (!selectedColor) {
    return !product?.variants?.some(
      v =>
        v.size === size &&
        Number(v.quantity) > 0
    );
  }

  // If color selected,
  // check only that color
  return !product?.variants?.some(
    v =>
      v.color === selectedColor &&
      v.size === size &&
      Number(v.quantity) > 0
  );
};
useEffect(() => {
  if (availableColors.length === 1 && !selectedColor) {
    setSelectedColor(availableColors[0]);
  }
}, [availableColors, selectedColor]);






  return (
    <>
    <Helmet>
    <title>{product && typeof product.title === "string" ? product.title : "Prime Shoes"} | Prime Shoes Phagwara</title>
     <meta
      name="description"
      content={
        product?.title && typeof product.title === "string"
          ? `${product.title} – Buy premium quality footwear, handbags, and accessories at Prime Shoes. Shop the latest designs for men, women, and kids in Phagwara.`
          : "Shop premium footwear, handbags, and accessories for men, women, and kids at Prime Shoes Phagwara. Trendy designs, great comfort, and top quality."
      }
    />

    <meta
      name="keywords"
      content={
        product?.title && typeof product.title === "string"
          ? `${product.title}, Prime Shoes, footwear, handbags, accessories, online shopping, men shoes, women heels, kids sandals, fashion store, Phagwara`
          : "Prime Shoes, footwear, handbags, accessories, online shopping, men shoes, women heels, kids sandals, fashion store, Phagwara"
      }
    />
  </Helmet>



      {/* Breadcrumb */}
<div className="custom-breadcrumb">
  <div className="breadcrumb-container">
    <div className="breadcrumb-links">
      <Link to="/"><i className="fa fa-home"></i> Home</Link>
      <span>{product ? product.title : "Product Details"}</span>
    </div>
  </div>
</div>



      {/* Product Details Section */}
    <section className="product-details spad product-compact" style={{borderBottom: '1px solid #000'}}>
         <div className="product-container-full"> 
           <div className="row no-gutters" style={{borderBottom: '1px solid #ddd'}}>
            {/* Left Column - Images */}
            <div className="col-lg-6">
              {product && (
             <div className="product__details__pic">

  {/* MAIN IMAGE */}
  <div className="product-main-image">
    <Swiper
      modules={[Navigation]}
      navigation={product.otherImages?.length > 0}
      className="custom-product-swiper"
      loop={product.otherImages?.length > 0}
    >
      {[product.mainImage, ...(product.otherImages || [])].map((img, i) => (
        <SwiperSlide key={i}>
          <img
            className="product__big__img"
            src={img?.url ? img.url : `/uploads/${img}`}
            alt=""
          />
        </SwiperSlide>
      ))}
    </Swiper>
  </div>

  {/* THUMBNAILS ROW */}
  <div className="product-thumbs-row">
    {[product.mainImage, ...(product.otherImages || [])].map((img, i) => (
      <img
        key={i}
        src={img?.url ? img.url : `/uploads/${img}`}
        className="thumb-img"
        onClick={() => {
          const swiper = document.querySelector('.custom-product-swiper')?.swiper;
          if (swiper) swiper.slideToLoop(i);
        }}
      />
    ))}
  </div>

</div>
              )}
            </div>

            {/* Right Column - Info */}
            <div className="col-lg-6">
              {product ? (
                <div className="product__details__text">
<h3 style={{ borderBottom: "1px solid #ddd", paddingBottom: "10px" }}>
  {product.title}
  <span> Brand: {product.brand?.trim() || "Prime Shoes"}</span>
  
 <button
  onClick={() => {
    if (navigator.share) {
      navigator.share({
        title: product.title,
        text: "Check out this product!",
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Product link copied to clipboard!");
    }
  }}
  style={{
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "rgb(236, 108, 29)",
    fontSize: "16px",
    display: "inline-flex",
    alignItems: "center",
    padding: 0, // removes any extra button padding
  }}
>
  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
    Share: <FaShareAlt />
  </span>
</button>

</h3>


                {typeof product.rating === 'number' && typeof product.numReviews === 'number' && (
  <div className="rating" style={{borderBottom: "1px solid #ddd",  paddingBottom: '10px'}}>
    {[...Array(5)].map((_, i) => (
      <i
        key={i}
        className={`fa fa-star${i < (product.rating || 5) ? '' : '-o'}`}
        style={{ color: '#FFD700' }}
      ></i>
    ))}
   {product.numReviews > 0 && (
  <span>({product.numReviews} reviews)</span>
)}
  </div>
)}


               <div className="product__details__price" style={{borderBottom: "1px solid #ddd",  paddingBottom: '10px'}}>
 ₹{formatPrice(product.discountedPrice)}
  {product.originalPrice > product.discountedPrice && (
   <span>₹{formatPrice(product.originalPrice)}</span>

  )}
</div>
                  {product.promoCode && product.promoDiscountPercent > 0 && (
  <div className="promo-code-info" style={{ fontSize: '14px', color: 'rgb(35, 187, 117)', fontWeight: 500}}>
    Eligible for an exclusive discount at checkout!
  </div>
)}

                {product.description && (
  <p className="product__details__description" style={{borderBottom: "1px solid #ddd",  paddingBottom: '10px'}}>
    {product.description
      .split('.')
      .slice(0, 3)
      .map((line, index) =>
        line.trim() ? (
          <span key={index}>
            • {line.trim()}.
            <br />
          </span>
        ) : null
      )}
  </p>
)}

<div className="product__details__button" >
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      rowGap: '20px',
    }}
  >
    {/* Quantity Section */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <span><strong>Quantity:</strong></span>
      <div className="pro-qty">
        <button
          className="qty-btn"
          onClick={() => {
  if (!isVariantSelected) {
    toast.warn("Select color and size first");
    return;
  }

  setQuantity(prev => Math.max(1, prev - 1));
}}
        >
          -
        </button>
        <input type="text" value={quantity} readOnly />
        <button
          className="qty-btn"
         onClick={() => {
  if (!selectedColor) {
    toast.warn("Select color first");
    return;
  }

  if (!selectedSize) {
    toast.warn("Select size first");
    return;
  }

  if (quantity >= availableQuantity) {
    toast.error("No more stock available for this variant");
    return;
  }

  setQuantity(prev => prev + 1);
}}
        >
          +
        </button>
      </div>
    </div>

    {/* Color Selector */}
{availableColors.length > 1 && (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
    <strong style={{ fontSize: '14px', display: 'flex', alignItems: 'center' }}>
      Colors:
    </strong>

    {availableColors.map((color, idx) => (
      <label
        key={idx}
       onClick={() => {
  setSelectedColor(color);
  setSelectedSize(null);
  setQuantity(1);
}}
        className={selectedColor === color ? 'active' : ''}
        style={{
          textTransform: 'capitalize',
          fontSize: '14px',
          lineHeight: '14px',
          color: selectedColor === color ? 'rgb(236, 108, 29)' : '#666',
          fontWeight: selectedColor === color ? '600' : '400',
          marginRight: '10px',
          cursor: 'pointer',
          display: 'inline-block',
        }}
      >
        <input type="radio" name="color" value={color} hidden />
        {color}
      </label>
    ))}
  </div>
)}


    {/* Size Selector */}
{availableSizes.length > 0 && (
 <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
  <strong style={{ fontSize: '14px', display: 'flex', alignItems: 'center' }}>Sizes:</strong>
{availableSizes.map((size, idx) => {
  const outOfStock = isSizeOutOfStock(size);

  return (
    <label
  key={idx}
onClick={() => {
  if (!selectedColor) {
    toast.warn("Please select color first");
    return;
  }

  if (!outOfStock) {
    setSelectedSize(size);
    setQuantity(1);
  }
}}
style={{
  position: 'relative',
  minWidth: '32px',
  height: '32px',
  padding: '0 6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',

  border:
    selectedSize === size
      ? '1px solid rgb(236, 108, 29)'
      : '1px solid #ddd',

  background:
    selectedSize === size
      ? 'rgba(236,108,29,0.08)'
      : '#fff',

  color:
    selectedSize === size
      ? 'rgb(236, 108, 29)'
      : '#333',

  fontWeight:
    selectedSize === size
      ? '500'
      : '400',

  cursor: outOfStock ? 'not-allowed' : 'pointer',
  opacity: outOfStock ? 0.45 : 1,
  overflow: 'hidden',
  transition: 'all 0.2s ease',
}}
>
  <input
    type="radio"
    name="size"
    value={size}
    hidden
    disabled={outOfStock}
  />

  {size}

{outOfStock && (
  <span
    style={{
      position: 'absolute',
      top: '50%',
      left: '-20%',
      width: '140%',
      height: '1px',
      background: '#000',
      transform: 'rotate(-35deg)',
      pointerEvents: 'none',
    }}
  />
)}
</label>
  );
})}
</div>

)}


    {/* Buttons Section */}
 {/* Buttons Section */}
<div
  style={{
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  }}
>
  {totalQuantity > 0 ? (
    <>
      <a
        href="#"
        className="cart-btn"
        style={{ minWidth: '140px', textAlign: 'center' }}
        onClick={(e) => {
          e.preventDefault();
          handleAddToCart();
        }}
      >
        <span className="icon_bag_alt"></span> Add to cart
      </a>

      <a
        href="#"
        className="cart-btn"
        style={{ minWidth: '140px', textAlign: 'center' }}
        onClick={(e) => {
          e.preventDefault();
          handleBuyNow();
        }}
      >
        <span className="icon_bag_alt"></span> Buy Now
      </a>
    </>
  ) : (
    <p style={{ color: 'rgb(236, 108, 29)', fontWeight: '600' }}>
      This product is currently out of stock.
    </p>
  )}
</div>
  </div>
</div>





                  <div className="product__details__widget">
  <ul>
    {/* Availability */}
    <li>
      <span>Availability:</span>
      <p style={{ display: 'inline-block', marginLeft: '8px', fontWeight: '600' }}>
        {totalQuantity > 0 ? "In Stock" : "Out of Stock"}
      </p>
    </li>






  </ul>
</div>

                </div>
              ) : (
                <p>Loading product details...</p>
              )}
            </div>

            {/* Tabs Section */}
            <div className="col-lg-12">
              <div className="product__details__tab">
                <ul className="nav nav-tabs" role="tablist">
                  {['Description', 'Specification', 'Reviews'].map((tab, index) => (
                    <li key={index} className="nav-item">
                      <a
                        className={`nav-link ${index === 0 ? 'active' : ''}`}
                        data-toggle="tab"
                        href={`#tabs-${index + 1}`}
                        role="tab"
                      >
                        {tab}
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="tab-content">
                 <div className="tab-content">
  {/* Description Tab */}
  <div className="tab-pane active" id="tabs-1" role="tabpanel">
    <h6>Description</h6>
    <p>{product?.description || 'No description available.'}</p>
  </div>

  {/* Specification Tab */}
  <div className="tab-pane" id="tabs-2" role="tabpanel">
    <h6>Specifications</h6>
    {product?.specifications ? (
<p className="product__details__description">
  {product.specifications
    .split(',')
    .map((spec, index) =>
      spec.trim() ? (
        <span key={index}>
          • {spec.trim()}
          <br />
        </span>
      ) : null
    )}
</p>


    ) : (
      <p>No specifications provided.</p>
    )}
  </div>

  {/* Reviews Tab */}
 <div className="tab-pane" id="tabs-3" role="tabpanel">
        <h6>Reviews</h6>
        {product?.reviews && product.reviews.length > 0 ? (
          <div className="reviews-list">
            {product.reviews.map((review, index) => (
              <div key={index} className="single-review" style={{ borderBottom: '1px solid #ddd', padding: '12px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* User picture if available */}
{review.image && (
<img
  src={review.image?.url ? review.image.url : `/uploads/reviews/${review.image}`}
  alt={review.name}
  style={{
    width: '70px',
    height: '80px',
    borderRadius: '4px',
    objectFit: 'cover',
    cursor: 'pointer',
  }}
  onClick={() =>
    setModalImage(
      review.image?.url ? review.image.url : `/uploads/reviews/${review.image}`
    )
  }
/>

)}

                  <div>
                    <strong>{review.name}</strong>
                    <br />
                    <small style={{ color: '#666' }}>{new Date(review.createdAt).toLocaleDateString()}</small>
                  </div>
                </div>

                {/* Star rating */}
                <div style={{ marginTop: '8px' }}>
                  {[...Array(5)].map((_, i) => (
                    <i
                      key={i}
                      className={`fa fa-star${i < review.rating ? '' : '-o'}`}
                      style={{ color: '#FFD700', marginRight: '2px' }}
                    />
                  ))}
                </div>

                {/* Comment */}
                <p style={{ marginTop: '8px' }}>{review.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No reviews yet.</p>
        )}

        {/* Modal Overlay for review image */}
        {modalImage && (
          <div
            onClick={() => setModalImage(null)} // clicking outside closes modal
            style={{
              position: 'fixed',
              top: 0, left: 0,
              width: '100vw', height: '100vh',
              backgroundColor: 'rgba(0,0,0,0.7)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999,
              cursor: 'pointer',
            }}
          >
            <img
              src={modalImage}
              alt="Review Large"
              onClick={e => e.stopPropagation()} // prevent closing modal when clicking image
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                borderRadius: '8px',
                boxShadow: '0 0 10px rgba(255,255,255,0.5)',
              }}
            />
            {/* Close button */}
            <button
              onClick={() => setModalImage(null)}
              style={{
                position: 'fixed',
                top: '20px',
                right: '30px',
                fontSize: '24px',
                color: '#fff',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                zIndex: 10000,
              }}
              aria-label="Close modal"
            >
              &times;
            </button>
          </div>
        )}
      </div>

</div>

                </div>
              </div>
            </div>
          </div>

          {/* Related Products */}
         {/* Related Products */}
<div className="row">
  <div className="col-lg-12 text-center">
    <div className="related__title">
      <h5>RELATED PRODUCTS</h5>
    </div>
  </div>

  {/* Related Products */}
  {relatedProducts.length > 0 ? (
    relatedProducts.map((prod) => (
      <div key={prod._id} className="col-lg-3 col-md-4 col-sm-6 mb-3 px-2">
        <div className="product__item">
          <div className="product__item__pic">
            {/* Wrap image with Link */}
            <Link to={`/product/${prod.slug}`}>
       <img
  src={prod.mainImage?.url ? prod.mainImage.url : `/uploads/${prod.mainImage}`}
  alt={prod.title}
  style={{
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  }}
/>

            </Link>

            {/* Optional Labels */}
            {prod.isNew && <div className="label new">New</div>}
          {prod.variants?.reduce(
  (sum, variant) => sum + Number(variant.quantity || 0),
  0
) === 0 && (
  <div className="label stockout">Out of Stock</div>
)}

            <ul className="product__hover">
              <li>
                <Link to={`/product/${prod.slug}`}>
                  <span className="arrow_expand"></span>
                </Link>
              </li>
              <li>
                <Link to={`/product/${prod.slug}`}>
                  <span className="icon_bag_alt"></span>
                  </Link>
              </li>
            </ul>
          </div>

          <div className="product__item__text">
            <h6>
             <Link to={`/product/${prod.slug}`} title={prod.title}>
  {prod.title.length > 35 ? prod.title.substring(0, 35) + '...' : prod.title}
</Link>
            </h6>
          <div className="rating">
  {[...Array(5)].map((_, star) => (
    <i
      key={star}
      className={`fa fa-star${star < (typeof prod.rating === 'number' && prod.numReviews > 0 ? prod.rating : 5) ? '' : '-o'}`}
      style={{ color: '#FFD700' }}
    ></i>
  ))}
</div>

           <div className="product__price" style={{fontSize: '16px'}}>
  ₹{formatPrice(prod.discountedPrice)}
</div>

          </div>
        </div>
      </div>
    ))
  ) : (
    <p className="text-center w-100">No related products found.</p>
  )}
</div>


        </div>
      </section>
    </>
  );
};

export default ProductDetail;
