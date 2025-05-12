// pages/index.js (Welcome Page / Home Page)
import React from 'react';
import Link from 'next/link';
import Layout from '../components/Layout'; // Import the Layout component
import { useAuth } from '../context/AuthContext'; // useAuth hook
import SupplierCarousel from '../components/SupplierCarousel'; // the carousel component


const WelcomePage = () => {
  const { isAuthenticated } = useAuth(); // Get authentication status

  return (
    <Layout title="ברוכים הבאים למכולת שלי">
      {/* Use a gradient with logo colors or a solid accent color */}
      <div className="text-center py-10 md:py-20 bg-gradient-to-b from-sky-100 via-white to-lime-50 rounded-lg shadow-lg">

        {/* Headline - Use primary color */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-4">
          ברוכים הבאים ל<span className="text-indigo-600">מכולת שלי</span>!
        </h1>

        {/* Description */}
        <p className="text-lg md:text-xl text-gray-700 mb-8 max-w-2xl mx-auto px-4">
          הזמינו מוצרי מכולת טריים ואיכותיים בקלות ובנוחות ישירות מהבית. מבצעים מיוחדים כל שבוע!
        </p>

        {/* Call to Action Button - Uses btn-primary */}
        <Link href="/products" className="btn-primary text-lg px-8 py-3 inline-block">
          צפייה בכל המוצרים
        </Link>

        {/* Login/Register links - Use btn-link */}
        {!isAuthenticated && (
          <div className="mt-8 space-x-4 rtl:space-x-reverse">
            <Link href="/login" className="btn-link">כניסה</Link>
            <span className="text-gray-400">|</span>
            <Link href="/register" className="btn-link">הרשמה</Link>
          </div>
        )}

      {/* --- Our Suppliers Section --- */}
      <section className="mb-16">
         <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
           הספקים שלנו
         </h2>
         {/* Render the Carousel Component */}
         <SupplierCarousel />
      </section>
      {/* --- End Suppliers Section --- */}


        {/* Space for extra information */}
        <div className="mt-16 text-gray-600 px-4">
          <p>זמני משלוח: ימים א'-ה', 09:00 - 18:00</p>
          <p>לשאלות ובירורים: 05X-XXXXXXX</p>
        </div>
      </div>
    </Layout>
  );
};

export default WelcomePage;
