import React from "react";
import "./Instagram.css";
import { FaInstagram, FaInstagramSquare } from "react-icons/fa"; // using react-icons

const Instagram = () => {
  const instaImages = [
    "/img/insta1.webp",
    "/img/insta2.webp",
    "/img/insta3.webp",
    "/img/insta4.webp",
    "/img/insta5.webp",
 
  ];

  return (
<section className="instagram-section">
  <div className="insta-container">
    {/* Gradient definition for Instagram icon */}
    <svg width="0" height="0">
      <linearGradient id="instagramGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop stopColor="#feda75" offset="0%" />
        <stop stopColor="#fa7e1e" offset="25%" />
        <stop stopColor="#d62976" offset="50%" />
        <stop stopColor="#962fbf" offset="75%" />
        <stop stopColor="#4f5bd5" offset="100%" />
      </linearGradient>
    </svg>

    <div className="insta-header">
      <h4 className="insta-heading">
        <FaInstagram className="insta-heading-icon" />
        From Prime Shoes to Prime Looks
      </h4>
      <p>Follow us on Instagram for more style inspirations</p>
      <a
        href="https://www.instagram.com/prime.shoes.phagwara/"
        target="_blank"
        rel="noopener noreferrer"
        className="follow-btn"
      >
        @prime.shoes.phagwara
      </a>
    </div>

    <div className="insta-grid">
      {instaImages.map((img, index) => (
        <a
          key={index}
          href="https://www.instagram.com/prime.shoes.phagwara/"
          target="_blank"
          rel="noopener noreferrer"
          className="insta-card"
        >
          <img src={img} alt={`Instagram ${index + 1}`} />
          <div className="insta-overlay">
            <FaInstagram className="insta-icon" />
            <span>@prime.shoes.phagwara</span>
          </div>
        </a>
      ))}
    </div>
  </div>
</section>


  );
};

export default Instagram;
