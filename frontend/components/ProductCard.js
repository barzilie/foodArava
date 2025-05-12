// components/ProductCard.js
import React, { useState } from 'react';
import Image from 'next/image'; // Use Next.js Image component for optimization
import { useAuth } from '../context/AuthContext';
import { useBasket } from '../context/BasketContext';

// Fallback image placeholder
const placeholderImg = 'https://res.cloudinary.com/dkfiohdyn/image/upload/w_1000,ar_1:1,c_fill,g_auto,e_art:hokusai/v1745856568/no_image_q68ugl.svg';

const ProductCard = ({ product }) => {
  const { isAuthenticated } = useAuth();
  const { addToBasket, removeFromBasket, getItemQuantity } = useBasket();
  const [selectedServingOption, setSelectedServingOption] = useState(
    // Set default selected option if only one exists
    product.servingOptions && product.servingOptions.length === 1 ? product.servingOptions[0] : null
  );
  const [quantityError, setQuantityError] = useState('');

  // Determine the current quantity in the basket for this specific product/option combination
  const currentQuantityInBasket = getItemQuantity(product._id, selectedServingOption);

  const handleAddToBasket = () => {
    if (product.servingOptions && product.servingOptions.length > 0 && !selectedServingOption) {
      setQuantityError('יש לבחור אפשרות הגשה');
      return;
    }
    setQuantityError('');
    addToBasket(product, 1, selectedServingOption);
  };

  const handleRemoveFromBasket = () => {
    setQuantityError(''); // Clear error on removal attempt
    removeFromBasket(product._id, 1, selectedServingOption);
  };

  const handleServingOptionChange = (event) => {
    const newOption = event.target.value === "" ? null : event.target.value;
    setSelectedServingOption(newOption);
    setQuantityError(''); // Clear error when option changes
    // Note: Quantity controls now affect the item with the NEWLY selected option
  };


    // --- Updated Return Statement ---
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col transition-shadow duration-300 hover:shadow-lg">
        {/* Product Image - Updated Image Props */}
        <div className="relative w-full h-48">
          <Image
            src={product.photo || placeholderImg}
            alt={product.name}
            fill // Use fill instead of layout="fill"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // Responsive sizes
            className="object-cover" // Use className instead of objectFit
            onError={(e) => { e.target.src = placeholderImg; }}
            // Optionally add priority if this image is likely LCP
            // priority={/* boolean */}
          />
          {product.isSpecialOffer && (
            <span className="absolute top-2 right-2 bg-lime-500 text-white text-xs font-bold px-2 py-1 rounded shadow"> {/* Updated color */}
              מבצע!
            </span>
          )}
        </div>
  
        {/* Product Details */}
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">{product.name}</h3>
          {product.manufacturer && (
            <p className="text-xs text-gray-500 mb-2">יצרן: {product.manufacturer}</p>
          )}
          <p className="text-sm text-gray-600 mb-3 flex-grow">{product.description || 'אין תיאור זמין'}</p>
  
          {/* Serving Options Dropdown (if applicable) */}
          {product.servingOptions && product.servingOptions.length > 0 && (
            <div className="mb-3">
              <label htmlFor={`serving-${product._id}`} className="block text-sm font-medium text-gray-700 mb-1">
                אפשרות הגשה:
              </label>
              <select
                id={`serving-${product._id}`}
                value={selectedServingOption ?? ""} // Use empty string for 'select' placeholder
                onChange={handleServingOptionChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                {/* Conditionally render placeholder */}
                {(selectedServingOption === null || product.servingOptions.length > 1) &&
                  <option value="" disabled>בחר אפשרות...</option>
                }
                {product.servingOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          )}
  
          {/* Price - Use primary color */}
          <p className="text-lg font-bold text-indigo-600 mb-3">
            ₪{product.pricePerUnit.toFixed(2)}
          </p>
  
          {/* Action Buttons (only if logged in) */}
          {isAuthenticated && (
            <div className="mt-auto pt-3 border-t border-gray-200">
              {quantityError && <p className="text-red-500 text-xs mb-2">{quantityError}</p>}
              {currentQuantityInBasket === 0 ? (
                <button
                  onClick={handleAddToBasket}
                  disabled={product.servingOptions && product.servingOptions.length > 0 && !selectedServingOption} // Disable if options exist but none selected
                  className={`w-full btn-primary ${product.servingOptions && product.servingOptions.length > 0 && !selectedServingOption ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  הוספה לסל
                </button>
              ) : (
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleRemoveFromBasket}
                    className="bg-red-500 text-white rounded-full p-1 w-8 h-8 flex items-center justify-center hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                    aria-label="הסר אחד"
                  >
                    -
                  </button>
                  <span className="text-lg font-semibold mx-3">
                    {currentQuantityInBasket}
                  </span>
                  <button
                    onClick={handleAddToBasket}
                    className="bg-lime-500 text-white rounded-full p-1 w-8 h-8 flex items-center justify-center hover:bg-lime-600 focus:outline-none focus:ring-2 focus:ring-lime-400" // Updated color
                    aria-label="הוסף עוד אחד"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
    // --- End Updated Return Statement ---
  };

export default ProductCard;
