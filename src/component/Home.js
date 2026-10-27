import React from 'react';
import Categories from './Categories';
import Productsection from './Productsection';
import Banner from './Banner';
import Trends from './Trends';
import Discountsection from './Discountsection';
import Servicesection from './Servicesection';
import Instagram from './Instagram';
import Shopbycategory from './Shopbycategory';
import Showcaseproduct from './Showcaseproduct';
import Categorydisplay from './Categorydisplay';
import { Helmet } from 'react-helmet';

const Home = () => {
  return (
    <>
    <Helmet>
        <title>Prime Shoes – Shop Footwear, Handbags & Accessories Online</title>
        <meta
          name="description"
          content="Step into style with Prime Shoes — your go-to destination in Phagwara for premium men's, women's, and kids' footwear, trendy handbags, and fashion accessories. Discover the latest trends and exclusive collections today!"
        />
        <meta
          name="keywords"
          content="Prime Shoes, footwear Phagwara, men's shoes, women's heels, kids sandals, handbags, accessories, trendy footwear, casual shoes, formal shoes, leather bags, online shoe store, fashion store Phagwara"
        />
      </Helmet>
      <Categories />
      <Productsection />
      {/* <Banner /> */}
      <Trends />
      <Categorydisplay/>
      <Shopbycategory/>
      <Showcaseproduct/>
      <Instagram/>
      {/* <Discountsection /> */}
      <Servicesection />
      {/* <Instagram /> */}
    </>
  );
};

export default Home;
