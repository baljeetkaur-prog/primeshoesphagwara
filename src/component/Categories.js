import React, { useEffect, useState } from "react";
import "./Categories.css";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

const Categories = () => {
  const [current, setCurrent] = useState(0);
  const [imageRatios, setImageRatios] = useState({});

  const images = [
    "/img/imgnew.png",
    "/img/bannerimg2.png",
    "/img/bannerimg3.jpg",
  ];

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + images.length) % images.length);
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % images.length);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [images.length]);

  const handleImageLoad = (index, event) => {
    const image = event.currentTarget;

    if (image.naturalWidth && image.naturalHeight) {
      const ratio = image.naturalWidth / image.naturalHeight;

      setImageRatios((prev) => ({
        ...prev,
        [index]: ratio,
      }));
    }
  };

  const currentRatio = imageRatios[current];

  return (
    <div>
      <div
        className="categories-slider"
        style={{
          "--bg-image": `url(${images[current]})`,
          "--mobile-ratio": currentRatio
            ? `${currentRatio}`
            : "1.5",
        }}
      >
        {images.map((img, i) => (
          <img
            key={img}
            src={img}
            alt={`Prime Shoes banner ${i + 1}`}
            className={`categories-image ${
              i === current ? "active" : ""
            }`}
            onLoad={(event) => handleImageLoad(i, event)}
          />
        ))}

        <button
          onClick={prevSlide}
          className="categories-btn left-btn"
          aria-label="Previous banner"
        >
          <FiChevronLeft />
        </button>

        <button
          onClick={nextSlide}
          className="categories-btn right-btn"
          aria-label="Next banner"
        >
          <FiChevronRight />
        </button>

        <div className="categories-dots">
          {images.map((_, index) => (
            <button
              key={index}
              aria-label={`Go to banner ${index + 1}`}
              className={`dot ${
                current === index ? "active-dot" : ""
              }`}
              onClick={() => setCurrent(index)}
            />
          ))}
        </div>
      </div>

      <div className="ticker">
        <div className="ticker__wrap">
          {Array.from({ length: 4 }, (_, index) => (
            <span className="ticker__item" key={index}>
              Prime Shoes, 6QCC+PRR, Gaushala Bazar In Rd,
              Phagwara, Punjab 144401
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Categories;