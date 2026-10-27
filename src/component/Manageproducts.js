import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import axios from 'axios';
import Instagram from './Instagram';
import './Manageproducts.css';
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode'; 
import Adminsidebar from './Adminsidebar';
import { decryptToken } from '../utils/securetoken';
import Admintopnav from './Admintopnav';

const API = process.env.REACT_APP_APIURL;
const iconStyle = { marginRight: '8px', color: '#ca1515' };

const Manageproducts = () => {
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [adminName, setAdminName] = useState("Admin User");
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const mainImageRef = useRef(null);
  const otherImageRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const [productData, setProductData] = useState({
    title: '',
    brand: '',
    description: '',
    originalPrice: '',
    discountedPrice: '',
    variants: [
      {
        color: '',
        size: '',
        quantity: ''
      }
    ],

    label: '',
    specifications: '',
    mainImage: null,
    otherImages: [null, null, null, null],
    previewImage: '',
    previewOtherImages: []
  });

  useEffect(() => {
    fetchCategories();
  }, []);

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

  const fetchCategories = async () => {
    setLoadingCategories(true);

    try {
      const res = await axios.get(`${API}/api/admincategories`);
      setCategories(res.data);
    } catch {
      toast.error('Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchProductsByCategory = async (cat) => {
    setLoadingProducts(true);
    setProducts([]);

    try {
      const res = await axios.get(`${API}/api/products/category/${cat}`);
      setProducts(res.data);
    } catch {
      console.log('Failed to fetch products in this category');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleProductChange = (e) => {
    setProductData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();

    setSubmitting(true);

    if (!productData.mainImage) {
      toast.error("Main image is required");
      setSubmitting(false);
      return;
    }

    const formData = new FormData();

    formData.append("title", productData.title);
    formData.append("brand", productData.brand);
    formData.append("category", category);
    formData.append("description", productData.description);
    formData.append("originalPrice", Number(productData.originalPrice));
    formData.append("discountedPrice", Number(productData.discountedPrice));

    formData.append("variants", JSON.stringify(
      productData.variants.map(v => ({
        color: v.color,
        size: v.size,
        quantity: Number(v.quantity)
      }))
    ));

    formData.append("label", productData.label);
    formData.append("specifications", productData.specifications);
    formData.append("mainImage", productData.mainImage);

    productData.otherImages.forEach((img) => {
      if (img) {
        formData.append("otherImages", img);
      }
    });

    try {
      await axios.post(`${API}/api/products`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Product added successfully!");

      if (mainImageRef.current) {
        mainImageRef.current.value = "";
      }

      otherImageRefs.forEach(ref => {
        if (ref.current) {
          ref.current.value = "";
        }
      });

      setProductData({
        title: '',
        brand: '',
        description: '',
        originalPrice: '',
        discountedPrice: '',

        variants: [
          {
            color: '',
            size: '',
            quantity: ''
          }
        ],

        label: '',
        specifications: '',
        mainImage: null,
        otherImages: [null, null, null, null],
        previewImage: '',
        previewOtherImages: []
      });

      await fetchProductsByCategory(category);

    } catch (err) {
      console.error(err);
      toast.error("Failed to add product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await axios.delete(`${API}/api/deleteproduct/${id}`);

      toast.success('Product deleted');

      fetchProductsByCategory(category);

    } catch {
      toast.error('Failed to delete product');
    }
  };

const startEditing = (prod) => {
  setIsEditing(true);
  setEditingProductId(prod._id);
  setCategory(prod.category);

  setProductData({
    title: prod.title || '',
    brand: prod.brand || '',
    description: prod.description || '',
    originalPrice: prod.originalPrice || '',
    discountedPrice: prod.discountedPrice || '',

    variants: prod.variants?.length 
      ? prod.variants.map(v => ({
          color: v.color || '',
          size: v.size || '',
          quantity: v.quantity || 0
        }))
      : [{ color: '', size: '', quantity: '' }],

    label: prod.label || '',
    specifications: prod.specifications || '',
    mainImage: null,
    otherImages: [null, null, null, null],
    previewImage: prod.mainImage || '',
    previewOtherImages: prod.otherImages || []
  });
};

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();

    setSubmitting(true);

    if (!editingProductId) {
      toast.error("No product selected for update.");
      setSubmitting(false);
      return;
    }

    const formData = new FormData();

    formData.append("title", productData.title);
    formData.append("brand", productData.brand);
    formData.append("category", category);
    formData.append("description", productData.description);
    formData.append("originalPrice", Number(productData.originalPrice));
    formData.append("discountedPrice", Number(productData.discountedPrice));

    formData.append("variants", JSON.stringify(
      productData.variants.map(v => ({
        color: v.color,
        size: v.size,
        quantity: Number(v.quantity)
      }))
    ));

    formData.append("label", productData.label);
    formData.append("specifications", productData.specifications);

    if (productData.mainImage) {
      formData.append("mainImage", productData.mainImage);
    }

    productData.otherImages.forEach((img) => {
      if (img) {
        formData.append("otherImages", img);
      }
    });

    try {
      await axios.put(`${API}/api/products/${editingProductId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        },
      });

      toast.success("Product updated successfully!");

      setIsEditing(false);
      setEditingProductId(null);

      if (mainImageRef.current) {
        mainImageRef.current.value = "";
      }

      otherImageRefs.forEach(ref => {
        if (ref.current) {
          ref.current.value = "";
        }
      });

      setProductData({
        title: '',
        brand: '',
        description: '',
        originalPrice: '',
        discountedPrice: '',

        variants: [
          {
            color: '',
            size: '',
            quantity: ''
          }
        ],

        label: '',
        specifications: '',
        mainImage: null,
        otherImages: [null, null, null, null],
        previewImage: '',
        previewOtherImages: []
      });

      fetchProductsByCategory(category);

    } catch (err) {
      console.error(err);
      toast.error("Failed to update product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    toast.success("Logged out");
    window.location.href = "/adminlogin";
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (category) {
      fetchProductsByCategory(category);
    }
  }, [category]);

  return (
    <div className="admin-layout">

      <Admintopnav
        adminName={adminName}
        handleLogout={handleLogout}
      />

      <div className="formadmin-container">

        <Adminsidebar
          adminName={adminName}
          handleLogout={handleLogout}
        />

        <div className="formadmin-main">

          <section
            className="contact spad"
            style={{
              paddingTop: '0px',
              marginTop: '30px'
            }}
          >

            <div className="container">

              <div className="d-flex justify-content-center">

                <div className="col-lg-8">

                  <div className="contact__form bg-light p-4 rounded shadow">

                    <h5 className="text-center mb-4">
                      MANAGE PRODUCTS
                    </h5>

                    <select
                      name="category"
                      value={category}
                      disabled={isEditing || loadingCategories}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #ccc',
                        fontSize: '16px',
                        fontFamily: 'inherit',
                        backgroundColor: '#fff',
                        color: '#333',
                        marginBottom: '16px',
                        width: '100%'
                      }}
                    >
                      {loadingCategories ? (
                        <option>Loading categories...</option>
                      ) : (
                        <>
                          <option value="">
                            Select Product Category
                          </option>

                          {categories.map((cat, idx) => (
                            <option
                              key={idx}
                              value={cat}
                            >
                              {cat}
                            </option>
                          ))}
                        </>
                      )}
                    </select>

                    <form
                      onSubmit={isEditing ? handleUpdateSubmit : handleAddProduct}
                      encType="multipart/form-data"
                    >

                      <input
                        type="text"
                        name="title"
                        placeholder="Product Title"
                        style={{ backgroundColor: 'white' }}
                        value={productData.title}
                        onChange={handleProductChange}
                        required
                      />

                      <input
                        type="text"
                        name="brand"
                        placeholder="Brand"
                        style={{ backgroundColor: 'white' }}
                        value={productData.brand}
                        onChange={handleProductChange}
                      />

                      <textarea
                        name="description"
                        placeholder="Description"
                        value={productData.description}
                        onChange={handleProductChange}
                        required
                      />

                      <input
                        type="text"
                        name="originalPrice"
                        placeholder="Original Price"
                        style={{ backgroundColor: 'white' }}
                        value={productData.originalPrice}
                        onChange={handleProductChange}
                        required
                      />

                      <input
                        type="text"
                        name="discountedPrice"
                        placeholder="Discounted Price"
                        style={{ backgroundColor: 'white' }}
                        value={productData.discountedPrice}
                        onChange={handleProductChange}
                        required
                      />

                      <div className="variants-section">

                        <h6 className="mb-3">
                          Product Variants
                        </h6>

                        {productData.variants.map((variant, index) => (

                          <div
                            key={index}
                            className="mb-3"
                          >

                            <input
                              type="text"
                              placeholder="Color"
                              value={variant.color}
                              style={{ backgroundColor: 'white' }}
                          onChange={(e) => {
  const updatedVariants = [...productData.variants];
  updatedVariants[index] = {
    ...updatedVariants[index],
    [e.target.placeholder.toLowerCase()]: e.target.value   // or better: use name attribute
  };
  setProductData(prev => ({ ...prev, variants: updatedVariants }));
}}
                            />

                            <input
                              type="text"
                              placeholder="Size"
                              value={variant.size}
                              style={{ backgroundColor: 'white' }}
                              onChange={(e) => {

                                const updatedVariants = [...productData.variants];

                                updatedVariants[index].size = e.target.value;

                                setProductData(prev => ({
                                  ...prev,
                                  variants: updatedVariants
                                }));

                              }}
                            />

                           <input
  type="text"
  placeholder="Quantity"
  value={variant.quantity}
  style={{ backgroundColor: 'white' }}
  onChange={(e) => {
    const value = e.target.value;

    // Allow only digits
    if (!/^\d*$/.test(value)) return;

    const updatedVariants = [...productData.variants];

    updatedVariants[index].quantity = value;

    setProductData(prev => ({
      ...prev,
      variants: updatedVariants
    }));
  }}
/>

                            <button
                              type="button"
                              className="btn btn-danger btn-sm mt-2"
                              onClick={() => {

                                const updatedVariants =
                                  productData.variants.filter(
                                    (_, i) => i !== index
                                  );

                                setProductData(prev => ({
                                  ...prev,
                                  variants: updatedVariants
                                }));

                              }}
                            >
                              Remove Variant
                            </button>

                          </div>

                        ))}

                        <button
                          type="button"
                          className="btn btn-dark btn-sm"
                          onClick={() => {

                            setProductData(prev => ({

                              ...prev,

                              variants: [
                                ...prev.variants,

                                {
                                  color: '',
                                  size: '',
                                  quantity: ''
                                }
                              ]

                            }));

                          }}
                        >
                          Add Variant
                        </button>

                      </div>

                      <input
                        type="text"
                        name="label"
                        style={{ backgroundColor: 'white' }}
                        placeholder="Label (e.g., New, Sale)"
                        value={productData.label}
                        onChange={handleProductChange}
                      />

                      <input
                        type="text"
                        name="specifications"
                        style={{ backgroundColor: 'white' }}
                        placeholder="Specifications"
                        value={productData.specifications}
                        onChange={handleProductChange}
                      />

                      <input
                        type="file"
                        accept="image/*"
                        name="mainImage"
                        ref={mainImageRef}
                        style={{ backgroundColor: 'white' }}
                        onChange={(e) =>
                          setProductData((prev) => ({
                            ...prev,
                            mainImage: e.target.files[0]
                          }))
                        }
                        {...(!isEditing ? { required: true } : {})}
                      />

                      {isEditing && productData.previewImage && (
                        <img
                          src={
                            productData.previewImage?.url
                              ? productData.previewImage.url
                              : `/uploads/${productData.previewImage}`
                          }
                          alt="Current"
                          className="img-thumbnail mb-2"
                          style={{
                            maxHeight: '150px',
                            objectFit: 'cover'
                          }}
                        />
                      )}

                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="mb-2">

                          <input
                            type="file"
                            accept="image/*"
                            ref={otherImageRefs[i]}
                            style={{ backgroundColor: 'white' }}
                            onChange={(e) => {

                              const file = e.target.files[0];

                              const newImages = [...productData.otherImages];
                              newImages[i] = file;

                              const newPreviews = [...productData.previewOtherImages];

                              newPreviews[i] =
                                file
                                  ? URL.createObjectURL(file)
                                  : newPreviews[i];

                              setProductData((prev) => ({
                                ...prev,
                                otherImages: newImages,
                                previewOtherImages: newPreviews,
                              }));

                            }}
                          />

                          {isEditing && productData.previewOtherImages[i] && (
                            <img
                              src={
                                productData.previewOtherImages[i]?.url
                                  ? productData.previewOtherImages[i].url
                                  : typeof productData.previewOtherImages[i] === "string"
                                    ? `/uploads/${productData.previewOtherImages[i]}`
                                    : productData.previewOtherImages[i]
                              }
                              alt={`Preview ${i}`}
                              className="img-thumbnail mt-1"
                              style={{
                                maxHeight: '100px',
                                objectFit: 'cover'
                              }}
                            />
                          )}

                        </div>
                      ))}

                      <button
                        type="submit"
                        className="site-btn w-100 mt-3 mb-mobile-gap"
                        disabled={submitting}
                      >
                        {submitting
                          ? (isEditing ? "Updating..." : "Adding...")
                          : (isEditing ? "Update Product" : "Add Product")
                        }
                      </button>

                      {isEditing && (

                        <button
                          type="button"
                          className="btn btn-secondary w-100 mt-2"
                          onClick={() => {

                            setIsEditing(false);

                            setEditingProductId(null);

                            setProductData({
                              title: '',
                              brand: '',
                              description: '',
                              originalPrice: '',
                              discountedPrice: '',

                              variants: [
                                {
                                  color: '',
                                  size: '',
                                  quantity: ''
                                }
                              ],

                              label: '',
                              specifications: '',
                              mainImage: null,
                              otherImages: [null, null, null, null],
                              previewImage: '',
                              previewOtherImages: []
                            });

                          }}
                        >
                          Cancel Edit
                        </button>

                      )}

                    </form>

                  </div>

                </div>

              </div>

              <div className="mt-5">

                <div className="admin-contact__content">

                  <h5 className="text-center admin-product-title">
                    PRODUCTS IN CATEGORY
                  </h5>

                  {loadingProducts ? (

                    <p className="text-center">
                      Loading products...
                    </p>

                  ) : products.length === 0 ? (

                    <p className="text-center">
                      No products found in this category.
                    </p>

                  ) : (

                    <div className="row no-gutters">

                      {products.map((prod) => (

                        <div
                          className="col-sm-6 col-md-4 mb-4"
                          key={prod._id}
                        >

                          <div className="card h-100 shadow-sm border-0 admin-product-card">

                            <Link
                              to={`/adminproduct/${prod._id}`}
                              className="text-decoration-none text-dark"
                            >

                              <img
                                src={
                                  prod.mainImage?.url
                                    ? prod.mainImage.url
                                    : `/uploads/${prod.mainImage}`
                                }
                                alt={prod.title}
                                className="card-img-top"
                              />

                            </Link>

                            <div className="admin-product-card-body">

                              <Link
                                to={`/adminproduct/${prod._id}`}
                                className="text-decoration-none text-dark"
                              >

                                <h6
                                  className="admin-product-name"
                                  style={{ textAlign: 'left' }}
                                >
                                  {prod.title}
                                </h6>

                              </Link>

                              <p className="admin-product-price-group">

                                <span className="admin-discounted-price">
                                  ₹{prod.discountedPrice}
                                </span>

                                <span className="admin-original-price">
                                  ₹{prod.originalPrice}
                                </span>

                              </p>

                              <p className="admin-product-stock">

                                <span className="admin-product-label">
                                  Stock:
                                </span>

                                <span
                                  className={
                                    prod.stockStatus === 'In Stock'
                                      ? 'stock-in'
                                      : 'stock-out'
                                  }
                                >
                                  {prod.stockStatus}
                                </span>

                              </p>

                              {expandedId !== prod._id ? (

                                <div className="d-flex flex-wrap gap-2">

                                  <div className="admin-product-buttons">

                                    <button
                                      className="btn btn-sm btn-outline-dark"
                                      onClick={() => setExpandedId(prod._id)}
                                    >
                                      Read More
                                    </button>

                                    <button
                                      className="btn btn-sm btn-outline-dark"
                                      onClick={() => startEditing(prod)}
                                    >
                                      Update
                                    </button>

                                    <button
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => handleDelete(prod._id)}
                                    >
                                      Delete
                                    </button>

                                  </div>

                                </div>

                              ) : (

                                <>

                                  <div
                                    className="mt-2 admin-product-details"
                                    style={{ textAlign: 'left' }}
                                  >

                                    {prod.brand && (
                                      <p>
                                        <strong>Brand:</strong> {prod.brand}
                                      </p>
                                    )}

                                    {prod.label && (
                                      <p>
                                        <strong>Label:</strong> {prod.label}
                                      </p>
                                    )}

                                    {prod.variants?.length > 0 && (
                                      <div>
                                        <strong>Variants:</strong>

                                        {prod.variants.map((variant, index) => (
                                          <div
                                            key={index}
                                            style={{
                                              borderBottom: '1px solid #ddd',
                                              paddingBottom: '8px',
                                              marginBottom: '8px'
                                            }}
                                          >
                                            <p>
                                              Color: {variant.color}
                                            </p>

                                            <p>
                                              Size: {variant.size}
                                            </p>

                                            <p>
                                              Quantity: {variant.quantity}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                              

                                    {prod.specifications && (
                                      <p>
                                        <strong>Specs:</strong> {prod.specifications}
                                      </p>
                                    )}

                                    <p>
                                      <strong>Description:</strong>
                                      <br />
                                      {prod.description}
                                    </p>

                                  </div>

                                  <button
                                    className="btn btn-sm btn-danger mt-2"
                                    onClick={() => setExpandedId(null)}
                                  >
                                    Show Less
                                  </button>

                                </>

                              )}

                            </div>

                          </div>

                        </div>

                      ))}

                    </div>

                  )}

                </div>

              </div>

            </div>

          </section>

        </div>

      </div>

    </div>
  );
};

export default Manageproducts;