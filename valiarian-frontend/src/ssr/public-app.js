import PropTypes from 'prop-types';
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import AppProviders from 'src/app-providers';
import MainLayout from 'src/layouts/main';
import HomePage from 'src/pages/home';
import AboutPage from 'src/pages/about-us';
import ContactPage from 'src/pages/contact-us';
import FaqsPage from 'src/pages/faqs';
import ProductListPage from 'src/pages/product/list';
import ProductCategoryPage from 'src/pages/product/category';
import ProductDetailsPage from 'src/pages/product/details';

function PublicPage({ children }) {
  return <MainLayout>{children}</MainLayout>;
}

PublicPage.propTypes = {
  children: PropTypes.node,
};

export default function PublicSsrApp() {
  return (
    <AppProviders>
      <Routes>
        <Route path="/" element={<PublicPage><HomePage /></PublicPage>} />
        <Route path="/products" element={<PublicPage><ProductListPage /></PublicPage>} />
        <Route path="/category/:slug" element={<PublicPage><ProductCategoryPage /></PublicPage>} />
        <Route path="/products/:id" element={<PublicPage><ProductDetailsPage /></PublicPage>} />
        <Route path="/about-us" element={<PublicPage><AboutPage /></PublicPage>} />
        <Route path="/contact-us" element={<PublicPage><ContactPage /></PublicPage>} />
        <Route path="/faqs" element={<PublicPage><FaqsPage /></PublicPage>} />
      </Routes>
    </AppProviders>
  );
}
