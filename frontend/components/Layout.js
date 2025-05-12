// components/Layout.js
import React from 'react';
import Head from 'next/head';
import Navbar from './Navbar'; // We'll create this next

const Layout = ({ children, title = "חנות מכולת אונליין" }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50" dir="rtl"> {/* Ensure RTL direction */}
      <Head>
        {/* Set the page title */}
        <title>{title}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        {/* Add other meta tags like description, keywords if needed */}
         <meta name="description" content="הזמנת מוצרי מכולת טריים בקלות ובנוחות." />
      </Head>

      {/* Navigation Bar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* The page content will be rendered here */}
        {children}
      </main>

      {/* Footer (Optional) */}
      <footer className="bg-gray-200 text-center p-4 text-gray-600 text-sm">
        כל הזכויות שמורות © {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default Layout;
