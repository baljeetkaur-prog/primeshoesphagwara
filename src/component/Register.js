
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaHome } from "react-icons/fa";
import axios from "axios";
import { encodePayload } from "../utils/encode";
import { toast } from "react-toastify";
import "./Register.css";
import { Helmet } from "react-helmet";
import ReCAPTCHA from "react-google-recaptcha";

const iconStyle = {
  marginRight: "8px",
  color: "rgb(236, 108, 29)",
};

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [captchaValue, setCaptchaValue] = useState(null);
  const [isAdult, setIsAdult] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Email verification states
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [otp, setOtp] = useState("");

  const API = process.env.REACT_APP_APIURL;
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // STEP 1: Submit registration details
  const handleRegister = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!captchaValue) {
      toast.error("Please verify captcha.");
      return;
    }

    if (!isAdult) {
      toast.error("You must confirm that you are 18 years or older.");
      return;
    }

    if (termsAccepted !== "accept") {
      toast.error("You must accept the Terms & Conditions to register.");
      return;
    }

    setLoading(true);

    try {
      const encoded = encodePayload(formData);

      const res = await axios.post(
        `${API}/api/auth/register`,
        {
          payload: encoded,
          captcha: captchaValue,
        }
      );

      setVerificationEmail(
        res.data.email || formData.email.trim().toLowerCase()
      );

      setVerificationStep(true);
      setOtp("");
      setCaptchaValue(null);

      toast.success(
        res.data.message ||
          "Verification code sent to your email."
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Unable to start registration. Please try again."
      );

      setCaptchaValue(null);
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP and create account
  const handleVerifyEmail = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!/^\d{6}$/.test(otp)) {
      toast.error("Please enter the complete 6-digit code.");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(
        `${API}/api/auth/verify-registration`,
        {
          email: verificationEmail,
          otp: otp.trim(),
        }
      );

      toast.success(
        res.data.message ||
          "Email verified successfully. Please log in."
      );

      // Clear registration details after successful verification.
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
      });

      setOtp("");
      setVerificationStep(false);

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Register | Prime Shoes</title>

        <meta
          name="description"
          content="Create your Prime Shoes account to shop the latest footwear, handbags, and accessories. Enjoy easy checkout, order tracking, and exclusive offers."
        />

        <meta
          name="keywords"
          content="Prime Shoes register, create account, sign up, online footwear store, handbags, accessories, Phagwara shopping, Prime Shoes account"
        />
      </Helmet>

      <div className="register-page">
        {/* Breadcrumb */}
        <div className="register-breadcrumb">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <Link to="/">
                  <FaHome style={iconStyle} /> Home
                </Link>
                <span>
                  {" "}
                  / {verificationStep ? "Verify Email" : "Register"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Registration Section */}
        <section className="register-section">
          <div className="container register-container">
            <div className="register-card only-form">
              <div className="register-form">
                <div className="register-logo">
                  <img
                    src="/img/prime-logo.png"
                    alt="Prime Shoes Logo"
                  />
                </div>

                {!verificationStep ? (
                  <>
                    <h5>Create Account</h5>

                    <form onSubmit={handleRegister}>
                      <input
                        type="text"
                        name="name"
                        placeholder="Full Name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        autoComplete="name"
                        disabled={loading}
                      />

                      <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        autoComplete="email"
                        disabled={loading}
                      />

                      <input
                        type="tel"
                        name="phone"
                        placeholder="Phone Number"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        autoComplete="tel"
                        disabled={loading}
                      />

                      <div className="password-input-wrapper">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          placeholder="Password"
                          value={formData.password}
                          onChange={handleChange}
                          required
                          minLength={8}
                          autoComplete="new-password"
                          disabled={loading}
                        />

                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() =>
                            setShowPassword((prev) => !prev)
                          }
                          aria-label={
                            showPassword
                              ? "Hide password"
                              : "Show password"
                          }
                          disabled={loading}
                        >
                          {showPassword ? (
                            <FaEyeSlash />
                          ) : (
                            <FaEye />
                          )}
                        </button>
                      </div>

                      <div style={{ marginBottom: "15px" }}>
                        <ReCAPTCHA
                          sitekey={
                            process.env.REACT_APP_RECAPTCHA_SITE_KEY
                          }
                          onChange={(value) =>
                            setCaptchaValue(value)
                          }
                          onExpired={() => setCaptchaValue(null)}
                        />
                      </div>

                      <div className="register-consent-section">
                        <label className="register-age-check">
                          <input
                            type="checkbox"
                            checked={isAdult}
                            onChange={(e) =>
                              setIsAdult(e.target.checked)
                            }
                            disabled={loading}
                          />

                          <span>
                            By proceeding, you confirm that you are
                            18 years or older.
                          </span>
                        </label>

                        <div className="register-terms-box">
                          <p className="register-terms-text">
                            Please read our{" "}
                            <Link
                              to="/termsconditions"
                              className="register-link"
                            >
                              Terms &amp; Conditions
                            </Link>{" "}
                            and{" "}
                            <Link
                              to="/privacypolicy"
                              className="register-link"
                            >
                              Privacy Policy
                            </Link>{" "}
                            before proceeding with registration. By
                            continuing, you consent to the processing
                            of your personal information for account
                            creation, order management, customer
                            support, promotional communications, and
                            newsletter subscription in accordance
                            with our policies.
                          </p>

                          <div className="register-radio-group">
                            <label>
                              <input
                                type="radio"
                                name="terms"
                                value="accept"
                                checked={termsAccepted === "accept"}
                                onChange={(e) =>
                                  setTermsAccepted(e.target.value)
                                }
                                disabled={loading}
                              />
                              I Accept
                            </label>

                            <label>
                              <input
                                type="radio"
                                name="terms"
                                value="decline"
                                checked={termsAccepted === "decline"}
                                onChange={(e) =>
                                  setTermsAccepted(e.target.value)
                                }
                                disabled={loading}
                              />
                              I Do Not Accept
                            </label>
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="register-btn"
                        disabled={
                          loading ||
                          !isAdult ||
                          termsAccepted !== "accept"
                        }
                      >
                        {loading
                          ? "Sending verification code..."
                          : "Register"}
                      </button>
                    </form>

                    <p>
                      Already have an account?{" "}
                      <Link to="/login">Login here</Link>
                    </p>
                  </>
                ) : (
                  <>
                    <h5>Verify Your Email</h5>

                    <p>
                      We have sent a 6-digit verification code to:
                    </p>

                    <p
                      style={{
                        fontWeight: "600",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {verificationEmail}
                    </p>

                    <p>
                      Please enter the code below. It expires in
                      10 minutes.
                    </p>

                    <form onSubmit={handleVerifyEmail}>
                      <input
                        type="text"
                        name="otp"
                        placeholder="Enter 6-digit code"
                        value={otp}
                        onChange={(e) =>
                          setOtp(
                            e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 6)
                          )
                        }
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        autoComplete="one-time-code"
                        required
                        disabled={loading}
                        aria-label="Email verification code"
                      />

                      <button
                        type="submit"
                        className="register-btn"
                        disabled={loading || otp.length !== 6}
                      >
                        {loading
                          ? "Verifying..."
                          : "Verify Email"}
                      </button>
                    </form>

                    <p>
                      Entered the wrong email?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationStep(false);
                          setOtp("");
                        }}
                        disabled={loading}
                        style={{
                          border: "none",
                          background: "none",
                          padding: 0,
                          color: "rgb(236, 108, 29)",
                          cursor: "pointer",
                        }}
                      >
                        Go back
                      </button>
                    </p>

                    <p>
                      Already have an account?{" "}
                      <Link to="/login">Login here</Link>
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

export default Register;
