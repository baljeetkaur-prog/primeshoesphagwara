// src/components/Banner.jsx
import React from 'react';
import Slider from 'react-slick';
import { Link } from 'react-router-dom';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const Banner = () => {
  const settings = {
    dots: true,
    infinite: true,
    autoplay: true,
    speed: 800,
    autoplaySpeed: 3000,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
  };

  const slides = [
    {
      title: 'Discover Prime Shoes',
      subtitle: 'Get Alluring Sandals Today',
      img: '/img/banner/banner-1.jpg',
    },
    {
      title: 'Welcome to Prime Shoes',
      subtitle: 'Shop Trendy Sneakers',
      img: '/img/banner/banner-1.jpg',
    },
    {
      title: 'Step into Prime Shoes',
      subtitle: 'Where Style Meets Comfort',
      img: '/img/banner/banner-1.jpg',
    },
  ];

  return (
    <section className="banner" style={{ backgroundImage: `url(${slides[0].img})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="container">
        <div className="row">
          <div className="col-xl-7 col-lg-8 m-auto">
            <Slider {...settings} className="banner__slider">
              {slides.map((slide, index) => (
                <div key={index} className="banner__item">
                  <div className="banner__text text-center text-white">
                    <span>{slide.title}</span>
                    <h1>{slide.subtitle}</h1>
                    <Link to="/products" className="btn btn-light mt-3">Shop now</Link>
                  </div>
                </div>
              ))}
            </Slider>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Banner;
