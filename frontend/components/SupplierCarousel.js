// components/SupplierCarousel.js
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

// Placeholder data for suppliers (replace with real data/API call)
const placeholderImg = 'https://res.cloudinary.com/dkfiohdyn/image/upload/w_1000,ar_1:1,c_fill,g_auto,e_art:hokusai/v1745856568/no_image_q68ugl.svg';

const suppliers = [
  {
    id: 1,
    name: "חקלאי הדרום",
    description: "ירקות ופירות טריים מהשדות שטופי השמש של הנגב.",
    // Use placeholder images or your actual supplier logos/images
    imageUrl: "https://res.cloudinary.com/dkfiohdyn/image/upload/v1744734492/samples/food/fish-vegetables.jpg" // Lime background
  },
  {
    id: 2,
    name: "מחלבות גליל",
    description: "מוצרי חלב איכותיים מחלב טרי, בטעמים של פעם.",
    imageUrl: "https://res.cloudinary.com/dkfiohdyn/image/upload/v1744734492/samples/food/dessert.jpg" // Sky blue background
  },
  {
    id: 3,
    name: "מאפיית הבוקר",
    description: "לחמים, מאפים ועוגות הנאפים במקום מדי בוקר.",
    imageUrl: "https://res.cloudinary.com/dkfiohdyn/image/upload/v1744734503/samples/coffee.jpg" // Amber background
  },
  {
    id: 4,
    name: "קצביית האחים",
    description: "בשרים טריים ועופות מגידול מקומי, בחיתוך אישי.",
    imageUrl: "https://res.cloudinary.com/dkfiohdyn/image/upload/v1744734492/samples/people/kitchen-bar.jpg" // Red background
  },
   {
    id: 5,
    name: "יבואני פרימיום",
    description: "מוצרים מיוחדים ואיכותיים מכל רחבי העולם.",
    imageUrl: "https://res.cloudinary.com/dkfiohdyn/image/upload/w_1000,ar_1:1,c_fill,g_auto,e_art:hokusai/v1745856568/no_image_q68ugl.svg" // Purple background
  }
];

// Fallback image in case of loading errors
const fallbackImg = 'https://res.cloudinary.com/dkfiohdyn/image/upload/w_1000,ar_1:1,c_fill,g_auto,e_art:hokusai/v1745856568/no_image_q68ugl.svg';


const SupplierCarousel = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const slideInterval = 7000;
  
    // Memoized navigation functions
    const nextSlide = useCallback(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % suppliers.length);
    }, []);
  
    const prevSlide = useCallback(() => {
      setCurrentIndex((prevIndex) => (prevIndex - 1 + suppliers.length) % suppliers.length);
    }, []);
  
    const goToSlide = useCallback((index) => {
      setCurrentIndex(index);
    }, []);
  
    //Auto-slide effect
    useEffect(() => {
     const intervalId = setInterval(nextSlide, slideInterval);
     return () => clearInterval(intervalId);
    }, [nextSlide]);
  
    return (
      // Main container: relative positioning for absolute children
      <div className="relative w-full max-w-4xl mx-auto rounded-lg shadow-lg bg-gray-100"> {/* Light background */}
        {/* Overflow hidden is crucial */}
        <div className="overflow-hidden rounded-lg">
          {/* Slides Container: Uses flex and transform */}
          <div
            className="flex flex-nowrap transition-transform ease-in-out duration-700"
            style={{
                width: `${suppliers.length * 100}%`,
                transform: `translateX(${currentIndex * (100 / suppliers.length)}%)`
              }}
          >
            {/* Map through suppliers to create slides */}
            {suppliers.map((supplier, index) => (
              // Each slide takes full width and doesn't shrink. Added explicit height.
              <div
                key={supplier.id}
                className="w-full flex-shrink-0 relative h-64 md:h-96 bg-gray-200 rounded-lg"
                style={{ flex: `0 0 ${100 / suppliers.length}%` }}
              >
                {/* Image container: Positioned to fill the slide div */}
                <div className="absolute inset-0 w-full h-full">
                   <Image
                      src={supplier.imageUrl || fallbackImg}
                      alt={supplier.name}
                      fill
                      //sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover rounded-lg" // Apply rounding here
                      // sizes removed temporarily for debugging - add back if needed
                      priority={index <= 2}
                      // Log error and use fallback
                      onError={(e) => { console.error(`Image failed to load: ${supplier.imageUrl}`); e.target.src = fallbackImg; }}
                   />
                </div>
                {/* Text positioning reverted to bottom overlay */}
                {/* Added z-10 to ensure text is above image, gradient added for readability */}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-white text-right bg-gradient-to-t from-black via-black/70 to-transparent z-10 rounded-b-lg">
                  <h3 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">{supplier.name}</h3>
                  <p className="text-sm md:text-md">{supplier.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
  
        {/* Navigation Arrows - Increased z-index */}
        <button onClick={nextSlide} className="absolute top-1/2 left-2 md:left-4 transform -translate-y-1/2 bg-black bg-opacity-40 text-white p-2 rounded-full hover:bg-opacity-60 focus:outline-none z-20" aria-label="הקודם">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={prevSlide} className="absolute top-1/2 right-2 md:right-4 transform -translate-y-1/2 bg-black bg-opacity-40 text-white p-2 rounded-full hover:bg-opacity-60 focus:outline-none z-20" aria-label="הבא">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
  
        {/* Navigation Dots - Increased z-index */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center space-x-3">
          {suppliers.map((_, index) => (
            <button key={index} onClick={() => goToSlide(index)} className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${ currentIndex === index ? 'bg-indigo-600' : 'bg-white bg-opacity-50 hover:bg-opacity-75' }`} aria-label={`עבור לשקופית ${index + 1}`} />
          ))}
        </div>
      </div>
    );
  };
  
  export default SupplierCarousel;