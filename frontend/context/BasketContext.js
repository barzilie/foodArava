// context/BasketContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const BasketContext = createContext();

export const BasketProvider = ({ children }) => {
  const [basketItems, setBasketItems] = useState([]);

  // Load basket from localStorage on initial load
  useEffect(() => {
    console.log("Attempting to load basket from localStorage..."); // Debug log
    const storedBasket = localStorage.getItem('basket');
    if (storedBasket) {
      try {
        const parsedBasket = JSON.parse(storedBasket);
        // Basic validation: Ensure it's an array before setting state
        if (Array.isArray(parsedBasket)) {
            setBasketItems(parsedBasket);
            console.log("Basket loaded:", parsedBasket); // Debug log
        } else {
            console.error("Stored basket data is not an array:", parsedBasket);
            localStorage.removeItem('basket'); // Remove invalid data
        }
      } catch (error) {
        console.error("Error parsing stored basket:", error);
        localStorage.removeItem('basket');
      }
    } else {
        console.log("No basket found in localStorage."); // Debug log
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Save basket to localStorage whenever it changes
  useEffect(() => {
    // Prevent saving the initial empty array before loading from localStorage finishes
    // Check if basketItems is actually different from initial state or if localStorage exists
    const storedBasket = localStorage.getItem('basket');
    if (basketItems.length > 0 || storedBasket) { // Save if items exist OR if something was loaded previously (to allow clearing)
        console.log("Saving basket to localStorage:", basketItems); // Debug log
        localStorage.setItem('basket', JSON.stringify(basketItems));
    }
  }, [basketItems]);

  // --- Basket Actions ---

  const addToBasket = (product, quantity = 1, selectedServingOption = null) => {
    // Basic check for product validity
    if (!product || !product._id) {
        console.error("addToBasket called with invalid product:", product);
        return;
    }
    console.log("addToBasket called:", { product_id: product._id, quantity, selectedServingOption }); // Debug log
    setBasketItems(prevItems => {
      // Ensure prevItems is always an array
      const currentItems = Array.isArray(prevItems) ? prevItems : [];
      const existingItemIndex = currentItems.findIndex(
        item => item.product?._id === product._id && item.selectedServingOption === selectedServingOption
      );

      let updatedItems;
      if (existingItemIndex > -1) {
        updatedItems = [...currentItems];
        updatedItems[existingItemIndex].quantity += quantity;
        console.log("Increased quantity for existing item:", updatedItems[existingItemIndex]); // Debug log
      } else {
        // Ensure product object is included correctly
        updatedItems = [...currentItems, { product: { ...product }, quantity, selectedServingOption }];
        console.log("Added new item:", { product: { ...product }, quantity, selectedServingOption }); // Debug log
      }
       console.log("Basket state after add:", updatedItems); // Debug log
      return updatedItems;
    });
  };

  const removeFromBasket = (productId, quantityToRemove = 1, selectedServingOption = null) => {
     console.log("removeFromBasket called:", { productId, quantityToRemove, selectedServingOption }); // Debug log
     setBasketItems(prevItems => {
        const currentItems = Array.isArray(prevItems) ? prevItems : [];
        const existingItemIndex = currentItems.findIndex(
            item => item.product?._id === productId && item.selectedServingOption === selectedServingOption
        );

        if (existingItemIndex > -1) {
            const updatedItems = [...currentItems];
            const currentQuantity = updatedItems[existingItemIndex].quantity;

            if (currentQuantity - quantityToRemove <= 0) {
                 console.log("Removing item completely."); // Debug log
                updatedItems.splice(existingItemIndex, 1); // Remove item from array
            } else {
                updatedItems[existingItemIndex].quantity -= quantityToRemove;
                 console.log("Decreased quantity for item:", updatedItems[existingItemIndex]); // Debug log
            }
             console.log("Basket state after remove:", updatedItems); // Debug log
            return updatedItems;
        }
        console.log("Item not found for removal."); // Debug log
        return currentItems; // Return currentItems instead of prevItems if it was potentially not an array
     });
  };

  const updateItemQuantity = (productId, newQuantity, selectedServingOption = null) => {
      console.log("updateItemQuantity called:", { productId, newQuantity, selectedServingOption }); // Debug log
     if (newQuantity <= 0) {
         // Use Infinity to ensure complete removal even if quantityToRemove logic changes
         removeFromBasket(productId, Infinity, selectedServingOption);
     } else {
         setBasketItems(prevItems => {
             const currentItems = Array.isArray(prevItems) ? prevItems : [];
             const existingItemIndex = currentItems.findIndex(
                 item => item.product?._id === productId && item.selectedServingOption === selectedServingOption
             );

             if (existingItemIndex > -1) {
                 const updatedItems = [...currentItems];
                 updatedItems[existingItemIndex].quantity = newQuantity;
                  console.log("Updated quantity for item:", updatedItems[existingItemIndex]); // Debug log
                  console.log("Basket state after update:", updatedItems); // Debug log
                 return updatedItems;
             }
             console.log("Item not found for quantity update."); // Debug log
             return currentItems;
         });
     }
  };


  const clearBasket = () => {
    console.log("Clearing basket."); // Debug log
    setBasketItems([]);
    // Also explicitly clear localStorage here for immediate effect
    localStorage.removeItem('basket');
  };

  // --- Basket Calculations (Getters) ---

  const getBasketTotal = () => {
    if (!Array.isArray(basketItems)) return 0; // Safety check
    return basketItems.reduce((total, item) => {
      // Add safety check for price and quantity
      const price = item.product?.pricePerUnit || 0;
      const quantity = item.quantity || 0;
      return total + (price * quantity);
    }, 0);
  };

  const getBasketItemCount = () => {
     if (!Array.isArray(basketItems)) return 0; // Safety check
    return basketItems.reduce((count, item) => {
      const quantity = item.quantity || 0;
      return count + quantity;
    }, 0);
  };

   const getItemQuantity = (productId, selectedServingOption = null) => {
     if (!Array.isArray(basketItems)) return 0; // Safety check
     const item = basketItems.find(
         // Add optional chaining for safety
         i => i.product?._id === productId && i.selectedServingOption === selectedServingOption
     );
     return item ? item.quantity : 0;
   };


  const value = {
    basketItems,
    addToBasket,
    removeFromBasket,
    updateItemQuantity,
    clearBasket,
    getBasketTotal,
    getBasketItemCount,
    getItemQuantity,
  };

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
};

// Custom hook to use the BasketContext
export const useBasket = () => {
  return useContext(BasketContext);
};
