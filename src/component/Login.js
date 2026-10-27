import React, { useState, useContext, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Login.css';
import { FaEye, FaEyeSlash, FaHome } from 'react-icons/fa';
import axios from 'axios';

import { encodePayload } from '../utils/encode';
import { encryptToken } from '../utils/securetoken';
import { UserContext } from '../App';
import { toast } from 'react-toastify';
import ReCAPTCHA from 'react-google-recaptcha';
import { Helmet } from 'react-helmet';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useContext(UserContext);

  const API = process.env.REACT_APP_APIURL;
  const recaptchaRef = useRef(null);

  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captchaValue, setCaptchaValue] = useState(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [resetData, setResetData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const resetToken = new URLSearchParams(location.search).get('resetToken');

  // If the user opens a password-reset email link, show the reset form.
  useEffect(() => {
    if (resetToken) {
      setMode('reset');
    }
  }, [resetToken]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleResetChange = (e) => {
    setResetData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // LOGIN
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!captchaValue) {
      toast.error('Please verify captcha');
      return;
    }

    setLoading(true);

    try {
      const encoded = encodePayload(formData);

      const res = await axios.post(`${API}/api/auth/login`, {
        payload: encoded,
        captcha: captchaValue,
      });

      toast.success(res.data.message || 'Login successful');

      const rawToken = atob(res.data.token);
      const encrypted = await encryptToken(rawToken);

      localStorage.setItem('token', encrypted);

      setUser({
        name: res.data.user.name,
        email: res.data.user.email,
        phone: res.data.user.phone,
        usertype: 'user',
      });

      setFormData({ email: '', password: '' });

      const redirectPath = location.state?.from || '/';
      navigate(redirectPath);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          'Unable to login. Please try again.'
      );
    } finally {
      setLoading(false);
      setCaptchaValue(null);
      recaptchaRef.current?.reset();
    }
  };

  // FORGOT PASSWORD
  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!formData.email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(
        `${API}/api/auth/forgot-password`,
        {
          email: formData.email.trim().toLowerCase(),
        }
      );

      toast.success(
        res.data.message ||
          'If an account exists for this email, a reset link will be sent.'
      );

      setMode('login');
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          'Unable to process your request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // RESET PASSWORD
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!resetToken) {
      toast.error('Invalid or missing password reset link');
      return;
    }

    if (resetData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (resetData.newPassword !== resetData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(
        `${API}/api/auth/reset-password`,
        {
          token: resetToken,
          newPassword: resetData.newPassword,
        }
      );

      toast.success(
        res.data.message || 'Password reset successfully'
      );

      setResetData({
        newPassword: '',
        confirmPassword: '',
      });

      setFormData({
        email: '',
        password: '',
      });

      setMode('login');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          'Password reset failed. Your link may have expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  const pageTitle =
    mode === 'forgot'
      ? 'Forgot Password | Prime Shoes'
      : mode === 'reset'
      ? 'Reset Password | Prime Shoes'
      : 'Login | Prime Shoes';

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content="Sign in to your Prime Shoes account, recover your password, and manage your shopping account."
        />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="login-page">
        <div className="login-breadcrumb">
          <div className="container">
            <Link to="/">
              <FaHome
                style={{
                  marginRight: '8px',
                  color: 'rgb(236, 108, 29)',
                }}
              />
              Home
            </Link>
            <span>
              {' '}
              /{' '}
              {mode === 'forgot'
                ? 'Forgot Password'
                : mode === 'reset'
                ? 'Reset Password'
                : 'Login'}
            </span>
          </div>
        </div>

        <section className="login-section">
          <div className="container login-container">
            <div className="login-card only-form">
              <div className="login-form">
                <div className="login-logo">
                  <img
                    src="/img/prime-logo.png"
                    alt="Prime Shoes Logo"
                  />
                </div>

                {/* LOGIN FORM */}
                {mode === 'login' && (
                  <>
                    <h5>Login to Your Account</h5>

                    <form onSubmit={handleSubmit}>
                      <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        value={formData.email}
                        onChange={handleChange}
                        autoComplete="email"
                        required
                      />

                      <div
                        style={{
                          position: 'relative',
                          marginBottom: '15px',
                        }}
                      >
                        <input
                          type={
                            showPassword ? 'text' : 'password'
                          }
                          name="password"
                          placeholder="Password"
                          value={formData.password}
                          onChange={handleChange}
                          autoComplete="current-password"
                          required
                          style={{
                            width: '100%',
                            padding: '12px 45px 12px 12px',
                            border: '1px solid #ddd',
                            height: '48px',
                            boxSizing: 'border-box',
                          }}
                        />

                        <button
                          type="button"
                          aria-label={
                            showPassword
                              ? 'Hide password'
                              : 'Show password'
                          }
                          onClick={() =>
                            setShowPassword((prev) => !prev)
                          }
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {showPassword ? (
                            <FaEyeSlash />
                          ) : (
                            <FaEye />
                          )}
                        </button>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          marginBottom: '15px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setMode('forgot')}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#ec6c1d',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          Forgot password?
                        </button>
                      </div>

                      <div
                        style={{
                          marginTop: '15px',
                          marginBottom: '15px',
                        }}
                      >
                        <ReCAPTCHA
                          ref={recaptchaRef}
                          sitekey={
                            process.env
                              .REACT_APP_RECAPTCHA_SITE_KEY
                          }
                          onChange={(value) =>
                            setCaptchaValue(value)
                          }
                        />
                      </div>

                      <button
                        type="submit"
                        className="login-btn"
                        disabled={loading}
                      >
                        {loading ? 'Logging in...' : 'Login'}
                      </button>

                      <p className="login-privacy-note">
                        By logging in, you agree to our{' '}
                        <Link to="/termsconditions">
                          Terms &amp; Conditions
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacypolicy">
                          Privacy Policy
                        </Link>
                        .
                      </p>
                    </form>

                    <p>
                      Don’t have an account?{' '}
                      <Link to="/register">Register here</Link>
                    </p>
                  </>
                )}

                {/* FORGOT PASSWORD FORM */}
                {mode === 'forgot' && (
                  <>
                    <h5>Forgot Your Password?</h5>

                    <p>
                      Enter the email address associated with your
                      account. If the account exists, we will send
                      you a password reset link.
                    </p>

                    <form onSubmit={handleForgotPassword}>
                      <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        value={formData.email}
                        onChange={handleChange}
                        autoComplete="email"
                        required
                      />

                      <button
                        type="submit"
                        className="login-btn"
                        disabled={loading}
                      >
                        {loading
                          ? 'Sending...'
                          : 'Send Reset Link'}
                      </button>
                    </form>

                    <p>
                      Remember your password?{' '}
                      <button
                        type="button"
                        onClick={() => setMode('login')}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: '#ec6c1d',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Back to Login
                      </button>
                    </p>
                  </>
                )}

                {/* RESET PASSWORD FORM */}
                {mode === 'reset' && (
                  <>
                    <h5>Set a New Password</h5>

                    <p>
                      Enter your new password below. It must be at
                      least 8 characters long.
                    </p>

                    <form onSubmit={handleResetPassword}>
                      <div
                        style={{
                          position: 'relative',
                          marginBottom: '15px',
                        }}
                      >
                        <input
                          type={
                            showNewPassword ? 'text' : 'password'
                          }
                          name="newPassword"
                          placeholder="New Password"
                          value={resetData.newPassword}
                          onChange={handleResetChange}
                          autoComplete="new-password"
                          minLength={8}
                          required
                          style={{
                            width: '100%',
                            padding: '12px 45px 12px 12px',
                            border: '1px solid #ddd',
                            height: '48px',
                            boxSizing: 'border-box',
                          }}
                        />

                        <button
                          type="button"
                          aria-label={
                            showNewPassword
                              ? 'Hide new password'
                              : 'Show new password'
                          }
                          onClick={() =>
                            setShowNewPassword((prev) => !prev)
                          }
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          {showNewPassword ? (
                            <FaEyeSlash />
                          ) : (
                            <FaEye />
                          )}
                        </button>
                      </div>

                      <div
                        style={{
                          position: 'relative',
                          marginBottom: '15px',
                        }}
                      >
                        <input
                          type={
                            showConfirmPassword
                              ? 'text'
                              : 'password'
                          }
                          name="confirmPassword"
                          placeholder="Confirm New Password"
                          value={resetData.confirmPassword}
                          onChange={handleResetChange}
                          autoComplete="new-password"
                          minLength={8}
                          required
                          style={{
                            width: '100%',
                            padding: '12px 45px 12px 12px',
                            border: '1px solid #ddd',
                            height: '48px',
                            boxSizing: 'border-box',
                          }}
                        />

                        <button
                          type="button"
                          aria-label={
                            showConfirmPassword
                              ? 'Hide confirm password'
                              : 'Show confirm password'
                          }
                          onClick={() =>
                            setShowConfirmPassword((prev) => !prev)
                          }
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          {showConfirmPassword ? (
                            <FaEyeSlash />
                          ) : (
                            <FaEye />
                          )}
                        </button>
                      </div>

                      <button
                        type="submit"
                        className="login-btn"
                        disabled={loading}
                      >
                        {loading
                          ? 'Resetting Password...'
                          : 'Reset Password'}
                      </button>
                    </form>

                    <p>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          navigate('/login', { replace: true });
                        }}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: '#ec6c1d',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Back to Login
                      </button>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Login;