import React, { useState, useEffect } from "react";
import { FaArrowUp } from "react-icons/fa";  // ✅ use react-icons instead of plain arrow
import "./ScrollToTopButton.css";

const ScrollToTopButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 200);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    visible && (
      <button className="scroll-to-top-btn" onClick={scrollToTop}>
        <FaArrowUp size={18} /> {/* thicker arrow */}
      </button>
    )
  );
};

export default ScrollToTopButton;
