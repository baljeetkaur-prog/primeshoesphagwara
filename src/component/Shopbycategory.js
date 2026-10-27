import React from "react";
import { Link } from "react-router-dom";
import "./Shopbycategory.css";

const categoryImages = {
  Women: "/img/women1.jpg",
  Men: "/img/men1.jpg",
  Kids: "/img/kids1.jpg",
  Handbags: "/img/handbags1.jpg",
  Accessories: "/img/accessories1.jpg",
};

const categories = ["Women", "Men", "Kids", "Handbags", "Accessories"];

const Shopbycategory = () => {
  return (
    <section className="shop-by-category">
      <div className="section-title">
        <h4>SHOP BY CATEGORY</h4>
      </div>
      <div className="category-grid">
        {categories.map((cat) => (
          <Link
            key={cat}
            to={`/products?category=${cat.toLowerCase()}&page=1`}
            className="category-card"
          >
            <img src={categoryImages[cat]} alt={cat} />
            <h4>{cat}</h4>
            <span className="shop-now-btn">SHOP NOW +</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default Shopbycategory;
