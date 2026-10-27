import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Instagram from './Instagram';
import noUiSlider from 'nouislider';
import 'nouislider/dist/nouislider.css';
import './Products.css';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaStar, FaAngleLeft, FaAngleRight, FaThLarge, FaTh, FaThList, FaFilter, FaHome } from 'react-icons/fa';
import { Helmet } from 'react-helmet';

const Product = () => {
  const sliderRef = useRef(null);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [page, setPage] = useState(1);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
const [totalPages, setTotalPages] = useState(1);
const [showModal, setShowModal] = useState(false);
const [modalImage, setModalImage] = useState('');
const [showFilterDrawer, setShowFilterDrawer] = useState(false);
const location = useLocation(); 
const navigate = useNavigate();
const sliderRefDesktop = useRef(null);
const sliderRefMobile = useRef(null);
const [availableSizes, setAvailableSizes] = useState([]);
const [availableColors, setAvailableColors] = useState([]);
const [gridColumns, setGridColumns] = useState(3);
const [sortOption, setSortOption] = useState(''); 
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const renderSkeleton = () =>
    Array.from({ length: 8 }).map((_, idx) => (
      <div key={idx} className={`col-lg-${12 / gridColumns} col-md-6`}>
        <div className="skeleton-card">
          <div className="skeleton skeleton-image"></div>
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-price"></div>
        </div>
      </div>
    ));
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
  
  
  

 useEffect(() => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}, []);
useEffect(() => {
  const fetchFilterMeta = async () => {
    try {
      let url = `${API}/api/filters`;

      if (selectedCategory) {
        url += `?category=${selectedCategory}`;
      }

      const res = await axios.get(url);

      setAvailableSizes(res.data.sizes || []);
      setAvailableColors(res.data.colors || []);
    } catch (err) {
      console.error("Failed to fetch filter metadata", err);
    }
  };

  fetchFilterMeta();
}, [selectedCategory]);

useEffect(() => {
  const queryParams = new URLSearchParams(location.search);
  const category = queryParams.get('category') || '';
  const sizes = queryParams.get('sizes')?.split(',') || [];
  const colors = queryParams.get('colors')?.split(',') || [];
  const min = parseInt(queryParams.get('minPrice') || '0');
  const max = parseInt(queryParams.get('maxPrice') || '10000');
  const pg = parseInt(queryParams.get('page') || '1');
  const search = queryParams.get('q') || '';
   const label = queryParams.get('label') || '';


  setSelectedCategory(category);
  setSelectedSizes(sizes);
  setSelectedColors(colors);
  setMinPrice(min);
  setMaxPrice(max);
  setPage(pg);
  setSearchTerm(search);
   setSelectedLabel(label);  // Add this line
}, [location.search]);


  
  const API = process.env.REACT_APP_APIURL;

const fetchFilteredProducts = async () => {
  setLoading(true);
  const controller = new AbortController();
  const signal = controller.signal;

  try {
    let res;
    if (searchTerm) {
      const query = [`q=${encodeURIComponent(searchTerm)}`];
      if (minPrice > 0 || maxPrice < 10000) query.push(`minPrice=${minPrice}&maxPrice=${maxPrice}`);
      if (selectedSizes.length > 0) query.push(`sizes=${selectedSizes.join(',')}`);
      if (selectedColors.length > 0) query.push(`colors=${selectedColors.join(',')}`);

      res = await axios.get(`${API}/api/search?${query.join('&')}`, { signal });
      setProducts(res.data);
      setTotalPages(1);
    } else {
      const query = [];
      if (selectedCategory) query.push(`category=${selectedCategory}`);
      if (selectedSizes.length > 0) query.push(`sizes=${selectedSizes.join(',')}`);
      if (selectedColors.length > 0) query.push(`colors=${selectedColors.join(',')}`);
      if (selectedLabel) query.push(`label=${selectedLabel}`);
      if (minPrice > 0 || maxPrice < 10000) query.push(`minPrice=${minPrice}&maxPrice=${maxPrice}`);
      query.push(`page=${page}`);
      query.push(`limit=9`);

      const queryString = `?${query.join('&')}`;
      res = await axios.get(`${API}/api/products${queryString}`, { signal });
      setProducts(res.data.products);
      setTotalPages(res.data.totalPages);
      setTotalCount(res.data.total);
    }
  } catch (err) {
    if (!axios.isCancel(err)) {
      console.error('Failed to fetch products', err);
      setProducts([]);
    }
  } finally {
    setLoading(false);
  }

  return () => controller.abort(); // cleanup
};
const handleCategoryChange = (catKey) => {
  setSearchTerm('');
  setSelectedCategory(prev => prev === catKey ? '' : catKey);
  setPage(1); // reset page
};
const updateFilter = (type, value) => {
  setPage(1); // Reset page always
  switch(type) {
    case 'category':
      setSearchTerm('');
      setSelectedCategory(prev => prev === value ? '' : value);
      break;
    case 'size':
      handleSizeChange(value);
      break;
    case 'color':
      handleColorChange(value);
      break;
    case 'label':
      setSelectedLabel(value);
      break;
  }
};






  useEffect(() => {
    if (sliderRef.current && !sliderRef.current.noUiSlider) {
      noUiSlider.create(sliderRef.current, {
        start: [minPrice, maxPrice],
        connect: true,
        range: {
          min: 0,
          max: 10000,
        },
        format: {
          to: (value) => Math.round(value),
          from: (value) => Number(value),
        },
      });

      sliderRef.current.noUiSlider.on('update', (values) => {
        setMinPrice(values[0]);
        setMaxPrice(values[1]);
      });
    }
  }, []);

  useEffect(() => {
    fetchFilteredProducts();
  }, [selectedCategory, selectedSizes, selectedColors, selectedLabel, minPrice, maxPrice, page,  searchTerm]);
  // Sync filter/pagination state to the URL
useEffect(() => {
  const query = new URLSearchParams();

  if (searchTerm) query.set('q', searchTerm);
  if (selectedCategory) query.set('category', selectedCategory);
  if (selectedSizes.length > 0) query.set('sizes', selectedSizes.join(','));
  if (selectedColors.length > 0) query.set('colors', selectedColors.join(','));
  if (selectedLabel) query.set('label', selectedLabel);
  if (minPrice > 0 || maxPrice < 10000) {
    query.set('minPrice', minPrice);
    query.set('maxPrice', maxPrice);
  }

  query.set('page', page);

  navigate({ search: query.toString() }, { replace: true });
}, [
  selectedCategory,
  selectedSizes,
  selectedColors,
  selectedLabel,
  minPrice,
  maxPrice,
  page,
  searchTerm,
]);






  const handleSizeChange = (size) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleColorChange = (color) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };
useEffect(() => {
  const initSlider = (ref) => {
    if (ref.current && !ref.current.noUiSlider) {
      noUiSlider.create(ref.current, {
        start: [minPrice, maxPrice],
        connect: true,
        range: { min: 0, max: 10000 },
        format: {
          to: value => Math.round(value),
          from: value => Number(value),
        },
      });

      ref.current.noUiSlider.on('update', (values) => {
        setMinPrice(values[0]);
        setMaxPrice(values[1]);
      });
    }
  };

  // always initialize desktop on load
  initSlider(sliderRefDesktop);
}, []);
useEffect(() => {
  if (showFilterDrawer) {
    const timer = setTimeout(() => {
      if (sliderRefMobile.current && !sliderRefMobile.current.noUiSlider) {
        noUiSlider.create(sliderRefMobile.current, {
          start: [minPrice, maxPrice],
          connect: true,
          range: { min: 0, max: 10000 },
          format: {
            to: value => Math.round(value),
            from: value => Number(value),
          },
        });

        sliderRefMobile.current.noUiSlider.on('update', (values) => {
          setMinPrice(values[0]);
          setMaxPrice(values[1]);
        });
      }
    }, 100); // slight delay ensures DOM is ready

    return () => clearTimeout(timer);
  }
}, [showFilterDrawer]);
useEffect(() => {
  if (!showFilterDrawer && sliderRefMobile.current?.noUiSlider) {
    sliderRefMobile.current.noUiSlider.destroy();
  }
}, [showFilterDrawer]);
useEffect(() => {
  setProducts((prev) => {
    const sorted = [...prev];
    switch (sortOption) {
      case 'alpha-asc':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'alpha-desc':
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'price-asc':
        sorted.sort((a, b) => a.discountedPrice - b.discountedPrice);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.discountedPrice - a.discountedPrice);
        break;
      default:
        break;
    }
    return sorted;
  });
}, [sortOption]);
const getTotalStock = (product) => {
  return product.variants?.reduce(
    (total, variant) => total + variant.quantity,
    0
  ) || 0;
};






  return (
    <>
    <Helmet>
  <title>
    {selectedCategory
      ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Collection | Prime Shoes Phagwara`
      : 'Shop Online – Shoes, Handbags & Accessories | Prime Shoes'}
  </title>
  <meta
    name="description"
    content={
      selectedCategory
        ? `Discover stylish ${selectedCategory} footwear, handbags, and accessories at Prime Shoes. Explore our premium collection and shop online for the latest trends.`
        : 'Explore the latest collection of footwear, handbags, and accessories for men, women, and kids at Prime Shoes. Trendy designs, comfort fit, and great prices await!'
    }
  />
  <meta
    name="keywords"
    content={`Prime Shoes, ${selectedCategory || 'footwear'}, online shoe store, ${selectedCategory || 'handbags'}, accessories, fashion shoes, sandals, sneakers, Phagwara`}
  />
</Helmet>

    {showFilterDrawer && (
  <div className="filter-drawer-overlay" onClick={() => setShowFilterDrawer(false)}>
    <div className="filter-drawer" onClick={(e) => e.stopPropagation()}>
      <button className="close-filter" onClick={() => setShowFilterDrawer(false)}>×</button>
      {/* Reuse the same sidebar JSX here */}
   <div className="shop__sidebar-mobile">
                {/* Categories */}
                <div className="sidebar__categories">
                  <div className="section-title"><h4>Categories</h4></div>
                  <div className="categories__accordion">
                    <div className="accordion" id="accordionExample">
                     {["Women", "Men", "Kids", "Accessories", "Handbags"].map((cat) => {
  const catKey = cat.toLowerCase();
  const isActive = selectedCategory === catKey;

  return (
    <div className="ucard" key={cat}>
      <div className="ucard-heading">
  <a
  href="#!"
  onClick={(e) => {
    e.preventDefault();
    updateFilter('category', catKey);
  }}
  style={{ color: isActive ? '#EC6C1D' : 'inherit', fontWeight: 'bold' }}
>
  {cat}
</a>
      </div>
    </div>
  );
})}

                    </div>
                  </div>
                </div>

                {/* Price Filter */}
    <div className="sidebar__filter">
  <div className="section-title"><h4>Shop by price</h4></div>
  <div className="filter-range-wrap">
    {/* Slider */}
    <div className="price-range" ref={sliderRefMobile}></div>

    {/* Inputs for min/max price */}
    <div className="price-boxes">
      <div className="price-box-wrapper">
        <span className="rupee-sign">₹</span>
        <input
          type="number"
          className="price-box price-box-min"
          min={1}
          max={10000}
          value={minPrice}
          onChange={(e) => {
            let val = Number(e.target.value);
            if (val < 1) val = 1;
            if (val > maxPrice) val = maxPrice;
            setMinPrice(val);
            if (sliderRefMobile.current?.noUiSlider) {
              sliderRefMobile.current.noUiSlider.set([val, maxPrice]);
            }
          }}
        />
      </div>
      <span className="price-box-separator">to</span>
      <div className="price-box-wrapper">
        <span className="rupee-sign">₹</span>
        <input
          type="number"
          className="price-box price-box-max"
          min={minPrice}
          max={10000}
          value={maxPrice}
          onChange={(e) => {
            let val = Number(e.target.value);
            if (val > 10000) val = 10000;
            if (val < minPrice) val = minPrice;
            setMaxPrice(val);
            if (sliderRefMobile.current?.noUiSlider) {
              sliderRefMobile.current.noUiSlider.set([minPrice, val]);
            }
          }}
        />
      </div>
    </div>
  </div>
</div>


                {/* Size Filter */}
                <div className="sidebar__sizes">

                  <div className="section-title"><h4>Shop by size</h4></div>
                  <div className="size__list">
{availableSizes.slice(0, 8).map((size) => (
  <label htmlFor={size} key={size}>
    {size}
    <input
      type="checkbox"
      id={size}
      checked={selectedSizes.includes(size)}
      onChange={() => handleSizeChange(size)}
    />
    <span className="checkmark"></span>
  </label>
))}


                  </div>
                </div>

                {/* Color Filter */}
                <div className="sidebar__color">
                  <div className="section-title"><h4>Shop by color</h4></div>
                  <div className="size__list color__list">
{availableColors
  .filter((color) => color && color.trim() !== "")
  .slice(0, 8)
  .map((color) => (
    <label htmlFor={color} key={color}>
      {color}
      <input
        type="checkbox"
        id={color}
        checked={selectedColors.includes(color)}
        onChange={() => handleColorChange(color)}
      />
      <span className="checkmark"></span>
    </label>
))}

                  </div>
                </div>
              </div>
    </div>
  </div>
)}
<div className="custom-breadcrumb">
  <div className="breadcrumb-container">
    <div className="breadcrumb-links">
      <Link to="/"><i className="fa fa-home"></i> Home</Link>
      <span>Shop</span>
    </div>
  </div>
</div>
<div className="grid-icons-and-count">
  <div className="grid-layout-icons">
    <span
      className={gridColumns === 3 ? 'active' : ''}
      onClick={() => setGridColumns(3)}
      title="3 columns"
    >
      <FaThLarge />
    </span>
    <span
      className={gridColumns === 4 ? 'active' : ''}
      onClick={() => setGridColumns(4)}
      title="4 columns"
    >
      <FaTh />
    </span>
  </div>

<div className="product-count">
  {totalCount} Products
</div>
<div className="sort-select">
  <select
    value={sortOption}
    onChange={(e) => setSortOption(e.target.value)}
    onBlur={() => setDropdownOpen(false)} // still fine without arrow
  >
    <option value="">Sort by</option>
    <option value="alpha-asc">Alphabetically A-Z</option>
    <option value="alpha-desc">Alphabetically Z-A</option>
    <option value="price-asc">Price Low to High</option>
    <option value="price-desc">Price High to Low</option>
  </select>
</div>


</div>











    <section className="shop spad full-width-section">
  <div className="full-width-inner">
          <button
  className="filter-toggle d-lg-none"
  onClick={() => setShowFilterDrawer(true)}
>
  <i className="fa fa-filter"></i> Filters
</button>
          <div className="row">
            {/* Sidebar */}
            <div className="col-lg-3 col-md-3 d-none d-lg-block">

              <div className="shop__sidebar-desktop">
                {/* Categories */}
                <div className="sidebar__categories">
                  <div className="section-title"><h4>Categories</h4></div>
                  <div className="categories__accordion">
                    <div className="accordion" id="accordionExample">
                     {["Women", "Men", "Kids", "Accessories", "Handbags"].map((cat) => {
  const catKey = cat.toLowerCase();
  const isActive = selectedCategory === catKey;

  return (
    <div className="ucard" key={cat}>
      <div className="ucard-heading">
    <a
  href="#!"
  onClick={(e) => {
    e.preventDefault();
    updateFilter('category', catKey);
  }}
  style={{ color: isActive ? 'rgb(236, 108, 29)' : 'inherit', fontWeight: 'bold' }}
>
  {cat}
</a>

      </div>
    </div>
  );
})}

                    </div>
                  </div>
                </div>

                {/* Price Filter */}
<div className="sidebar__filter">
  <div className="section-title"><h4>Shop by price</h4></div>
  <div className="filter-range-wrap">
    {/* Slider */}
    <div className="price-range" ref={sliderRefDesktop}></div>

    {/* Inputs for min/max price */}
    <div className="price-boxes">
      <div className="price-box-wrapper">
        <span className="rupee-sign">₹</span>
        <input
          type="number"
          className="price-box price-box-min"
          min={1}
          max={10000}
          value={minPrice}
          onChange={(e) => {
            let val = Number(e.target.value);
            if (val < 1) val = 1;
            if (val > maxPrice) val = maxPrice;
            setMinPrice(val);
            if (sliderRefDesktop.current?.noUiSlider) {
              sliderRefDesktop.current.noUiSlider.set([val, maxPrice]);
            }
          }}
        />
      </div>
      <span className="price-box-separator">to</span>
      <div className="price-box-wrapper">
        <span className="rupee-sign">₹</span>
        <input
          type="number"
          className="price-box price-box-max"
          min={minPrice}
          max={10000}
          value={maxPrice}
          onChange={(e) => {
            let val = Number(e.target.value);
            if (val > 10000) val = 10000;
            if (val < minPrice) val = minPrice;
            setMaxPrice(val);
            if (sliderRefDesktop.current?.noUiSlider) {
              sliderRefDesktop.current.noUiSlider.set([minPrice, val]);
            }
          }}
        />
      </div>
    </div>
  </div>
</div>




                {/* Size Filter */}
                <div className="sidebar__sizes">
                  <div className="section-title"><h4>Shop by size</h4></div>
                  <div className="size__list">
{availableSizes.slice(0, 8).map((size) => (
  <label htmlFor={size} key={size}>
    {size}
    <input
      type="checkbox"
      id={size}
      checked={selectedSizes.includes(size)}
      onChange={() => handleSizeChange(size)}
    />
    <span className="checkmark"></span>
  </label>
))}


                  </div>
                </div>

                {/* Color Filter */}
                <div className="sidebar__color">
                  <div className="section-title"><h4>Shop by color</h4></div>
                  <div className="size__list color__list">
{availableColors
  .filter((color) => color && color.trim() !== "")
  .slice(0, 8)
  .map((color) => (
    <label htmlFor={color} key={color}>
      {color}
      <input
        type="checkbox"
        id={color}
        checked={selectedColors.includes(color)}
        onChange={() => handleColorChange(color)}
      />
      <span className="checkmark"></span>
    </label>
))}

                  </div>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="col-lg-9 col-md-9">
            <div className="row">
  {loading ? (
    renderSkeleton()
  ) : products.length > 0 ? (
  products.map((product) => (
  <div
    className={`col-lg-${12 / gridColumns} col-md-4 col-sm-6 mix ${product.category}`}
    key={product._id}
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

          {/* LABEL / STOCK */}
          {(() => {
            const totalStock = getTotalStock(product);

            if (totalStock <= 0 || product.label === 'Out Of Stock') {
              return <div className="label stockout stockblue">Out Of Stock</div>;
            }

            if (product.label) {
              return (
                <div className={`label ${product.label.toLowerCase().replace(/ /g, '')}`}>
                  {product.label}
                </div>
              );
            }

            return null;
          })()}

          {/* HOVER ICONS */}
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
                <a href="#">
                  <span className="icon_bag_alt"></span>
                </a>
              </li>
            )}
          </ul>

        </div>
      </Link>

      <div className="product__item__text">
        <h6>
          <Link to={`/product/${product.slug}`} state={{ product }}>
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
          ₹{Number(product.discountedPrice)}
          {product.originalPrice > product.discountedPrice && (
            <span>₹{Number(product.originalPrice)}</span>
          )}
        </div>
      </div>

    </div>
  </div>
))
  ) : (
    <p style={{ padding: '20px', color: '#666' }}>No products found in this category.</p>
  )}

  {/* Pagination */}
  {(totalPages > 1 || page > 1) && (
    <div className="col-lg-12 text-center">
      <div className="pagination__option" style={{marginTop: '30px'}}>
        {page > 1 && (
          <a
            href="#!"
            onClick={(e) => {
              e.preventDefault();
              setPage((prev) => Math.max(prev - 1, 1));
            }}
          >
            <i className="fa fa-angle-left"></i>
          </a>
        )}
        {[...Array(totalPages)].map((_, i) => (
          <a
            href="#!"
            key={i}
            onClick={(e) => {
              e.preventDefault();
              setPage(i + 1);
            }}
            className={page === i + 1 ? 'active' : ''}
          >
            {i + 1}
          </a>
        ))}
        {page < totalPages && (
          <a
            href="#!"
            onClick={(e) => {
              e.preventDefault();
              setPage((prev) => Math.min(prev + 1, totalPages));
            }}
          >
            <i className="fa fa-angle-right"></i>
          </a>
        )}
      </div>
    </div>
  )}
</div>

            </div>
          </div>
        </div>
      </section>
        {showModal && (
  <div className="image-modal-overlay" onClick={() => setShowModal(false)}>
    <div className="image-modal-content"onClick={(e) => e.stopPropagation()}>
      <img src={modalImage} alt="Zoomed" />
      <button className="close-modal" onClick={() => setShowModal(false)}>×</button>
    </div>
  </div>
)}
    </>
  );
};

export default Product;
