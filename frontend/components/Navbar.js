// components/Navbar.js
import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, logout, isAdmin } = useAuth();

  return (
    // Keep navbar background white for contrast, or use a light accent like sky blue
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo/Brand Name - Use primary color */}
        <Link href="/" className="text-2xl font-bold text-indigo-600 hover:text-indigo-800">
            המכולת שלי
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center space-x-6 rtl:space-x-reverse">
          {/* Standard links */}
          <Link href="/products" className="text-gray-700 hover:text-indigo-600">
              כל המוצרים
          </Link>

          {/* Conditional Links */}
          {isAuthenticated ? (
            <>
              <Link href="/basket" className="text-gray-700 hover:text-indigo-600">הסל שלי</Link>
              <Link href="/my-orders" className="text-gray-700 hover:text-indigo-600">ההזמנות שלי</Link>

              {/* Admin links - maybe use a different color? Or keep consistent */}
              {isAdmin && (
                <>
                  <Link href="/admin/orders" className="text-purple-700 hover:text-purple-900 font-semibold">ניהול הזמנות</Link>
                  <Link href="/admin/products" className="text-purple-700 hover:text-purple-900 font-semibold">ניהול מוצרים</Link>
                  <Link href="/admin/settings" className="text-purple-700 hover:text-purple-900 font-semibold">הגדרות</Link>
                </>
              )}

              <span className="text-gray-600">שלום, {user?.name}</span>
              {/* Logout button - Use secondary (lime) or a neutral color */}
              <button onClick={() => logout()} className="bg-gray-200 text-gray-800 hover:bg-gray-300 text-sm px-3 py-1 rounded-lg font-semibold transition duration-150 ease-in-out">
                התנתקות
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-700 hover:text-indigo-600">כניסה</Link>
              {/* Register button uses btn-primary */}
              <Link href="/register" className="btn-primary text-sm px-3 py-1">הרשמה</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
