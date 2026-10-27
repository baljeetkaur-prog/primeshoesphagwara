import React, { useEffect, useState, useContext } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaHome, FaCheckCircle } from 'react-icons/fa';
import axios from 'axios';
import Instagram from './Instagram';
import { UserContext } from '../App';
import { toast } from 'react-toastify';

const bulletStyle = { marginRight: '6px', color: '#EC6C1D', fontSize: '12px' };

const RateProd = () => {
  const { user } = useContext(UserContext);
  const email = user?.email;
  const [submitting, setSubmitting] = useState(false); 

  const [formData, setFormData] = useState({
    rating: '',
    comment: '',
    image: null,
  });

  const { id: productId } = useParams();
  const API = process.env.REACT_APP_APIURL;
  const [existingReview, setExistingReview] = useState(null);
  const [loading, setLoading] = useState(false); // 🔹 Loading state

  useEffect(() => {
    const fetchExistingReview = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API}/api/rate/${productId}/${email}`);
        setExistingReview(res.data.review);
      } catch (err) {
        setExistingReview(null);
      } finally {
        setLoading(false);
      }
    };

    if (email && productId) fetchExistingReview();
  }, [email, productId]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      setFormData((prev) => ({ ...prev, image: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!formData.rating || !formData.comment) {
    toast.error('Rating and comment are required');
    return;
  }

  if (!email) {
    toast.error('You must be logged in to submit a review.');
    return;
  }

  try {
    setSubmitting(true);
    const payload = new FormData();
    payload.append('rating', formData.rating);
    payload.append('comment', formData.comment);
    if (formData.image) payload.append('image', formData.image); // only append if exists
    payload.append('email', email);

    const res = await axios.post(`${API}/api/rate/${productId}`, payload);
    toast.success(res.data.message || 'Review submitted successfully');
    setFormData({ rating: '', comment: '', image: null });
    setExistingReview(res.data.review);
  } catch (err) {
    const msg = err.response?.data?.message || 'Something went wrong';
    toast.error(msg);
  } finally {
    setSubmitting(false);
  }
};


  return (
    <div>
      {/* Breadcrumb */}
      <div className="custom-breadcrumb">
        <div className="breadcrumb-container">
          <div className="breadcrumb-links">
            <Link to="/"><FaHome style={{ marginRight: '6px', color: '#EC6C1D' }} /> Home</Link>
            <span>Rate Product</span>
          </div>
        </div>
      </div>

      {/* Rating Section */}
      <section className="contact spad" style={{ borderBottom: '1px solid #000' }}>
        <div className="container">
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border text-warning" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3">Please wait...</p>
            </div>
          ) : (
            <div className="row">
              {/* Left column: Previous review or message */}
              <div className="col-lg-6 col-md-6">
                <div className="contact__content">
                  <div className="contact__address p-4 rounded-4 shadow-sm bg-white">
                    {existingReview ? (
                      <>
                        <h5 className="mb-4 text-dark fw-bold">Your Previous Review</h5>
                        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                          <li>
                            <strong>Rating:</strong>{' '}
                            <span className="text-warning">{existingReview.rating} / 5</span>
                          </li>
                          <li>
                            <strong>Comment:</strong><br />
                            <span className="text-muted">{existingReview.comment}</span>
                          </li>
                          {existingReview.createdAt && (
                            <li>
                              <strong>Uploaded On:</strong>{' '}
                              <span className="text-secondary">
                                {new Date(existingReview.createdAt).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </span>
                            </li>
                          )}
                        </ul>
                        {existingReview.image && (
                          <div className="text-start">
                            <img
                              src={
                                existingReview?.image?.url
                                  ? existingReview.image.url
                                  : `/uploads/reviews/${existingReview.image}`
                              }
                              alt="Review"
                              className="img-fluid rounded shadow-sm"
                              style={{ maxHeight: '200px', objectFit: 'cover', marginTop: '10px' }}
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <h5 className="mb-4 text-dark fw-bold">Why Your Review Matters</h5>
                        <ul>
                          <li>
                            <FaCheckCircle style={bulletStyle} />
                            Your ratings help others make better buying decisions.
                          </li>
                          <li>
                            <FaCheckCircle style={bulletStyle} />
                            Even a short comment goes a long way in improving our quality.
                          </li>
                          <li>
                            <FaCheckCircle style={bulletStyle} />
                            Optionally, upload an image to help showcase real feedback!
                          </li>
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right column: Review form */}
              <div className="col-lg-6 col-md-6">
                <div className="contact__form p-4 rounded-4 shadow-sm bg-white">
                  <h5 className="mb-4">RATE THIS PRODUCT</h5>
                  <form onSubmit={handleSubmit}>
                    <input
                      type="number"
                      name="rating"
                      placeholder="Rating (1 to 5)"
                      min="1"
                      max="5"
                      value={formData.rating}
                      onChange={handleChange}
                      required
                    />
                    <textarea
                      name="comment"
                      placeholder="Write your review"
                      value={formData.comment}
                      onChange={handleChange}
                      required
                    />
                    <input
                      type="file"
                      name="image"
                      accept="image/*"
                      onChange={handleChange}
                    />
                 <button type="submit" className="site-btn mt-3" disabled={submitting}>
  {submitting ? 'Submitting...' : 'Submit Review'}
</button>

                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default RateProd;
