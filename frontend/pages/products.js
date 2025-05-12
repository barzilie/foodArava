// pages/products.js
import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
import axios from 'axios';
import Link from 'next/link'; // Import Link
import Layout from '../components/Layout';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext'; // To show basket summary conditionally
import { useBasket } from '../context/BasketContext'; // To show basket summary

// Define the API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// --- Category Definitions ---
// Mapping from category name (Hebrew) to list of manufacturer names
const categoryManufacturerMap = {
  'בשר ועוף': ['קצביית האחים', 'משק חגואל'], // Add more as needed
  'דגים': [], // Add fish suppliers if any
  'מוצרי חלב': ['תנובה', 'שטראוס', 'מחלבות גליל'], // Add more
  'יין ומשקאות': ['יקב טייפון', 'יקב המעפילים'], // Add more
  // Add more categories: 'מאפים', 'ירקות ופירות', 'יבשים' etc.
};
const categories = ["הכל", ...Object.keys(categoryManufacturerMap)]; // Add "All" option

// --- End Category Definitions ---


const ProductsPage = () => {
const [allProducts, setAllProducts] = useState([]); // Store all fetched products
const [specialOffers, setSpecialOffers] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const { isAuthenticated } = useAuth();
const { getBasketTotal, getBasketItemCount, clearBasket } = useBasket();

  // --- State for Category Filter ---
  const [selectedCategory, setSelectedCategory] = useState("הכל"); // Default to "All"

  // Fetching logic
  const fetchProductsData = useCallback(async () => {
    setLoading(true); setError('');
    try {
        // Fetch all products ONCE
        const [productsRes, specialsRes] = await Promise.all([
            axios.get(`${API_URL}/products`), // Get all products
            axios.get(`${API_URL}/products/specials`)
        ]);
        setAllProducts(productsRes.data || []);
        setSpecialOffers(specialsRes.data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError('אירעה שגיאה בטעינת המוצרים. נסו לרענן את העמוד.');
      // Ensure state is arrays on error
      setProducts([]);
      setSpecialOffers([]);
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProductsData(); }, [fetchProductsData]);

  // --- Filter Products Based on Category ---
  const filteredProducts = useMemo(() => {
    const specialIds = specialOffers.map(p => p._id);
    // Always filter out specials from the main list
    const nonSpecialProducts = allProducts.filter(p => !specialIds.includes(p._id));

    if (selectedCategory === "הכל") {
        return nonSpecialProducts; // Show all non-special products
    }
    // Get manufacturers for the selected category
    const manufacturersInCategory = categoryManufacturerMap[selectedCategory] || [];
    // Filter products whose manufacturer is in the list for the category
    return nonSpecialProducts.filter(product =>
        product.manufacturer && manufacturersInCategory.includes(product.manufacturer)
    );
  }, [allProducts, specialOffers, selectedCategory]); // Recalculate when these change

  const basketTotal = getBasketTotal();
  const basketItemCount = getBasketItemCount();

    // --- Handler for Clear Basket ---
    const handleClearBasket = () => {
      if (window.confirm('האם אתה בטוח שברצונך לרוקן את סל הקניות?')) {
          clearBasket();
          console.log("Basket cleared by user.");
      }
  };

  return (
    <Layout title="כל המוצרים">
      {/* Optional: Basket Summary Bar for Logged In Users */}
      {isAuthenticated && basketItemCount > 0 && (
        <div className="sticky top-[68px] z-40 bg-gradient-to-r from-indigo-500 to-indigo-700 text-white p-4 mb-6 rounded-b-lg shadow-lg flex flex-wrap justify-between items-center gap-4"> {/* Added flex-wrap and gap */}
          {/* Basket Summary Text */}
          <span className="font-bold text-lg flex-shrink-0">
            סה"כ בסל: ₪{basketTotal.toFixed(2)} ({basketItemCount} {basketItemCount === 1 ? 'מוצר' : 'מוצרים'})
          </span>
          {/* Action Buttons */}
          <div className="flex items-center space-x-3 rtl:space-x-reverse flex-shrink-0">
            {/* Clear Basket Button */}
            <button
              onClick={handleClearBasket}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow transition duration-150 ease-in-out"
              title="רוקן את הסל" // Tooltip
            >
              רוקן סל
            </button>
             {/* View Basket Button */}
            <Link href="/basket" className="bg-white !text-indigo-700 font-semibold py-2 px-5 rounded-lg shadow hover:bg-gray-100 transition duration-150 ease-in-out">
               לצפייה בסל
            </Link>
          </div>
        </div>
      )}

      {/* --- Category Buttons/Tabs --- */}
      <div className="mb-8 mt-4">
        <div className="flex flex-wrap justify-center gap-2 md:gap-4">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-10 py-4 rounded-full !text-lg font-medium transition-colors duration-200 ease-in-out ${
                selectedCategory === category
                  ? 'bg-indigo-600 text-white shadow' // Active category style
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300' // Inactive style
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      {/* --- End Category Buttons --- */}

      {/* Loading State */}
      {loading && <div className="text-center py-10">טוען מוצרים...</div>}

      {/* Error State */}
      {error && <div className="text-center py-10 text-red-600 bg-red-100 p-4 rounded">{error}</div>}

      {/* Content Area */}
      {!loading && !error && (
        <>
          {/* Special Offers Section (Always shows, not filtered by category) */}
          {specialOffers.length > 0 && (
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 border-lime-500 pb-2">
                מבצעים מיוחדים 🔥
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {specialOffers.map((product) => ( <ProductCard key={product._id} product={product} /> ))}
              </div>
            </section>
          )}

          {/* Filtered Products Section */}
          <section>
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 border-gray-300 pb-2">
              {selectedCategory === "הכל" ? "כל המוצרים" : `קטגוריה: ${selectedCategory}`}
            </h2>
             {filteredProducts.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {/* Render filtered products */}
                    {filteredProducts.map((product) => ( <ProductCard key={product._id} product={product} /> ))}
                 </div>
             ) : (
                 // Show different messages based on context
                 selectedCategory === "הכל" && specialOffers.length === 0 ? (
                     <p className="text-gray-600">לא נמצאו מוצרים כרגע.</p>
                 ) : selectedCategory !== "הכל" ? (
                     <p className="text-gray-600">לא נמצאו מוצרים בקטגוריה זו.</p>
                 ) : (
                      <p className="text-gray-600">לא נמצאו מוצרים נוספים פרט למבצעים.</p>
                 )
             )}
          </section>
        </>
      )}
    </Layout>
  );
};

export default ProductsPage;
