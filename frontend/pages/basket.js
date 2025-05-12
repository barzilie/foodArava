// pages/basket.js
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useBasket } from '../context/BasketContext';
import Image from 'next/image'; // For product images

// Define the API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
const placeholderImg = 'https://res.cloudinary.com/dkfiohdyn/image/upload/w_1000,ar_1:1,c_fill,g_auto,e_art:hokusai/v1745856568/no_image_q68ugl.svg';

const BasketPage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const {
    basketItems,
    removeFromBasket,
    updateItemQuantity,
    clearBasket,
    getBasketTotal,
    getBasketItemCount,
  } = useBasket();
  const router = useRouter();

  // State for delivery address (now just the details part for the input) and note
  const [deliveryAddressDetails, setDeliveryAddressDetails] = useState('');
  const [deliveryArea, setDeliveryArea] = useState(''); // Store area separately if needed
  const [deliverySettlement, setDeliverySettlement] = useState(''); // Store settlement separately if needed
  const [note, setNote] = useState('');
  const [itemPacketCounts, setItemPacketCounts] = useState({});
  const [expectedCompletionDate, setExpectedCompletionDate] = useState(null);
  const [isLoadingCompletionDate, setIsLoadingCompletionDate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

    // Pre-fill address details from user profile
    useEffect(() => {
      if (isAuthenticated && user?.address) {
        // Set the details part for the input field
        setDeliveryAddressDetails(user.address.details || '');
        // Store area/settlement if you need to reconstruct the full address later
        setDeliveryArea(user.address.area || '');
        setDeliverySettlement(user.address.settlement || '');
      }
    }, [isAuthenticated, user]);

  // Initialize local packet counts when basket items load/change
  useEffect(() => {
    const initialCounts = {};
    basketItems.forEach(item => {
        // Only track if product allows packets (defaultPacketCount > 0)
        if (item.product?.defaultPacketCount > 0) {
            const key = `${item.product._id}-${item.selectedServingOption || 'null'}`;
            // Use existing packet count if available (e.g., if user navigated away and back)
            // Otherwise, default to 1 or the product default? Let's default to 1 if applicable.
            initialCounts[key] = itemPacketCounts[key] || 1; // Default to 1 packet if applicable
        }
    });
    setItemPacketCounts(initialCounts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [basketItems]);

  // Fetch expected completion date using the NEW public route
  useEffect(() => {
    const fetchCompletionDate = async () => {
        if (isAuthenticated) { // Still only fetch if logged in
            setIsLoadingCompletionDate(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                     console.warn("No token found, cannot fetch completion date.");
                     setIsLoadingCompletionDate(false);
                     return; // Exit if no token
                }

                // --- Use the new, non-admin route ---
                const response = await axios.get(`${API_URL}/settings/completion-date`, {
                     headers: { Authorization: `Bearer ${token}` } // Still need auth token
                });
                // --- End of change ---

                setExpectedCompletionDate(new Date(response.data.defaultCompletionDate));
            } catch (error) {
                console.error("Error fetching completion date:", error.response?.data || error.message);
                setExpectedCompletionDate(null);
            } finally {
                setIsLoadingCompletionDate(false);
            }
        }
    };


    fetchCompletionDate();
  }, [isAuthenticated]); // Re-fetch if auth state changes (though unlikely needed here)


  const handleQuantityChange = (productId, newQuantityStr, selectedServingOption) => {
    const newQuantity = parseInt(newQuantityStr, 10);
    if (!isNaN(newQuantity)) {
      updateItemQuantity(productId, newQuantity, selectedServingOption);
    }
  };

    // --- Handler for Packet Count Change ---
  const handlePacketCountChange = (productId, packetCountStr, selectedServingOption) => {
      const count = parseInt(packetCountStr, 10);
      const key = `${productId}-${selectedServingOption || 'null'}`;
      if (!isNaN(count) && count >= 1) {
           setItemPacketCounts(prev => ({ ...prev, [key]: count }));
      } else if (packetCountStr === '') {
           // Allow clearing the input, maybe default back to 1 or handle validation on submit
           setItemPacketCounts(prev => ({ ...prev, [key]: '' })); // Store empty string temporarily
      }
};

  const handleConfirmOrder = async () => {
    setSubmitError('');
    setSubmitSuccess('');

        // --- Construct the full delivery address string for confirmation and API ---
    // Use the details from the input field, and area/settlement stored from user profile
    // Or, if you want the user to be able to change Area/Settlement in the basket,
    // you would need dropdowns here similar to the registration page.
    // For now, assuming only details are editable here:
    const fullDeliveryAddressString = `${deliverySettlement}, ${deliveryAddressDetails} (${deliveryArea})`; // Example format

    // Basic validation
    if (!deliveryAddressDetails.trim()) { // Validate the details input
      setSubmitError('יש להזין פרטי כתובת למשלוח (רחוב, בית).');
      return;
    }

    if (basketItems.length === 0) {
      setSubmitError('הסל ריק, לא ניתן לבצע הזמנה.');
      return;
    }
    let packetError = false;
    basketItems.forEach(item => {
        if (item.product?.defaultPacketCount > 0) {
            const key = `${item.product._id}-${item.selectedServingOption || 'null'}`;
            const count = itemPacketCounts[key];
            if (count === '' || isNaN(Number(count)) || Number(count) < 1) {
                setSubmitError(`יש להזין מספר אריזות תקין (לפחות 1) עבור ${item.product.name}`);
                packetError = true;
            }
        }
    });
    if (packetError) return;


    // Confirmation Dialog
    const completionDateString = expectedCompletionDate
        ? expectedCompletionDate.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : 'לא ידוע (שגיאה בטעינה)';

    const confirmationMessage = `האם לאשר את ההזמנה?\nסה"כ: ₪${getBasketTotal().toFixed(2)}\nכתובת למשלוח: ${fullDeliveryAddressString}\nתאריך השלמה משוער: ${completionDateString}`;

    if (window.confirm(confirmationMessage)) {
      setIsSubmitting(true);
      try {
        // Prepare order data for API
        const orderData = {
          products: basketItems.map(item => ({
            productId: item.product._id,
            quantity: item.quantity,
            selectedServingOption: item.selectedServingOption,
            packetCount: item.product?.defaultPacketCount > 0 ? (itemPacketCounts[`${item.product._id}-${item.selectedServingOption || 'null'}`] || 1) : 1 // Default to 1 if somehow missing? Or use validation above.
          })),
          deliveryAddress: fullDeliveryAddressString,
          note: note.trim() || null, // Send null if note is empty
        };

        // Get token for API call
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error("User not authenticated"); // Should not happen if button is shown only to logged-in users
        }

        // Make API call to create order
        const response = await axios.post(`${API_URL}/orders`, orderData, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 201) {
          setSubmitSuccess('הזמנתך התקבלה בהצלחה! תודה.');
          clearBasket(); // Clear the basket upon successful order
          // Redirect to products page after a delay
          setTimeout(() => {
            router.push('/products?order=success'); // Add query param for potential success message on products page
          }, 2000);
        } else {
          throw new Error(response.data.message || 'Failed to create order');
        }

      } catch (error) {
        console.error("Order submission failed:", error);
        setSubmitError(error.response?.data?.message || error.message || 'אירעה שגיאה בשליחת ההזמנה.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Redirect guest users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/basket'); // Redirect to login, then back to basket
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || !isAuthenticated) {
    return (
      <Layout title="טוען סל קניות...">
        <div className="text-center py-10">טוען נתונים...</div>
      </Layout>
    );
  }

  return (
    <Layout title="הסל שלי">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">סל הקניות שלך</h1>

      {submitError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{submitError}</div>}
      {submitSuccess && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{submitSuccess}</div>}

      {basketItems.length === 0 ? (
        <div className="text-center py-10 bg-white rounded shadow p-6">
          <p className="text-gray-600 mb-4">סל הקניות שלך ריק.</p>
          <Link href="/products" className="btn-primary">
            להתחלת קניות
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Basket Items List */}
          <div className="lg:col-span-2 bg-white rounded shadow p-6">
            <h2 className="text-xl font-semibold mb-4">פירוט ההזמנה</h2>
            <ul className="divide-y divide-gray-200">
              {basketItems.map((item, index) => {
                 // Check if packet input should be shown
                 const showPacketInput = item.product?.defaultPacketCount > 0;
                 const itemKey = `${item.product._id}-${item.selectedServingOption || 'null'}`;
                 const currentPacketCount = itemPacketCounts[itemKey] || ''; // Use local state

                 return (
                    <li key={itemKey} className="py-4 flex flex-wrap items-start space-x-4 rtl:space-x-reverse">
                      {/* Image */}
                      <div className="flex-shrink-0">
                          <Image src={item.product.photo || placeholderImg} alt={item.product.name} width={80} height={80} objectFit="cover" className="rounded" onError={(e) => { e.target.src = placeholderImg; }}/>
                      </div>
                      {/* Details & Quantity */}
                      <div className="flex-grow min-w-[150px]">
                        <h3 className="font-semibold">{item.product.name}</h3>
                        {item.selectedServingOption && (<p className="text-sm text-gray-500">אפשרות: {item.selectedServingOption}</p>)}
                        <p className="text-sm text-gray-500">מחיר ליח': ₪{item.product.pricePerUnit.toFixed(2)}</p>
                         {/* Quantity Control */}
                         <div className="flex items-center mt-2">
                            <label htmlFor={`qty-${itemKey}`} className="text-sm mr-2 rtl:ml-2 rtl:mr-0">כמות:</label>
                            <input
                              type="number"
                              id={`qty-${itemKey}`}
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.product._id, e.target.value, item.selectedServingOption)}
                              className="w-16 border border-gray-300 rounded px-2 py-1 text-center"
                              aria-label={`כמות עבור ${item.product.name}`}
                            />
                            <button
                              onClick={() => removeFromBasket(item.product._id, Infinity, item.selectedServingOption)}
                              className="text-red-500 hover:text-red-700 text-sm mr-3 rtl:ml-3 rtl:mr-0"
                              aria-label={`הסר ${item.product.name} מהסל`}
                            >
                              הסר
                            </button>
                         </div>
                      </div>
                       {/* Packet Count Input (Conditional) */}
                       {showPacketInput && (
                           <div className="mt-2 sm:mt-0 sm:ml-4 rtl:mr-4 rtl:ml-0 flex-shrink-0 w-full sm:w-auto">
                               <label htmlFor={`packet-${itemKey}`} className="block text-sm font-medium text-gray-700 mb-1">מספר אריזות:</label>
                               <input
                                   type="number"
                                   id={`packet-${itemKey}`}
                                   min="1"
                                   max={(item.quantity || 1) * 4}
                                   step="1"
                                   value={currentPacketCount}
                                   onChange={(e) => handlePacketCountChange(item.product._id, e.target.value, item.selectedServingOption)}
                                   required // Make required if applicable
                                   className="w-20 border border-gray-300 rounded px-2 py-1 text-center"
                                   placeholder="כמה?"
                               />
                               <p className="text-xs text-gray-500 mt-1">ארוז ב- {currentPacketCount || '?'} מגשים</p>
                           </div>
                       )}
                      {/* Total Price */}
                      <div className="font-semibold w-full sm:w-20 text-left rtl:text-right mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-none">
                        סה"כ: ₪{(item.product.pricePerUnit * item.quantity).toFixed(2)}
                      </div>
                    </li>
                 );
              })}
            </ul>
          </div>
          
          {/* Order Summary and Checkout */}
          <div className="lg:col-span-1 bg-white rounded shadow p-6 h-fit sticky top-24"> {/* Sticky summary */}
            <h2 className="text-xl font-semibold mb-4">סיכום וביצוע הזמנה</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span>סה"כ פריטים:</span>
                <span>{getBasketItemCount()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>סה"כ לתשלום:</span>
                <span>₪{getBasketTotal().toFixed(2)}</span>
              </div>
            </div>

            {/* Delivery Address - Only show details input */}
            <div className="mb-4">
              <label htmlFor="deliveryAddressDetails" className="block text-sm font-bold text-gray-700 mb-1">
                פרטי כתובת למשלוח (רחוב, בית) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="deliveryAddressDetails"
                value={deliveryAddressDetails} // Bind to the details state
                onChange={(e) => setDeliveryAddressDetails(e.target.value)} // Update details state
                required
                className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="רחוב, מספר בית/דירה"
              />
              {/* Display the non-editable Area/Settlement */}
              {(deliveryArea || deliverySettlement) && (
                 <p className="text-xs text-gray-500 mt-1">
                    יישוב: {deliverySettlement || 'לא צוין'}, אזור: {deliveryArea || 'לא צוין'} (נקבע בהרשמה)
                 </p>
              )}
            </div>

            {/* Order Note */}
            <div className="mb-6">
              <label htmlFor="note" className="block text-sm font-bold text-gray-700 mb-1">
                הערות להזמנה (אופציונלי)
              </label>
              <textarea
                id="note"
                rows="3"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="הערות מיוחדות לשליח או להזמנה..."
              ></textarea>
            </div>

            {/* Confirm Button */}
            <button
              onClick={handleConfirmOrder}
              disabled={isSubmitting || isLoadingCompletionDate}
              className={`w-full btn-primary ${isSubmitting || isLoadingCompletionDate ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'שולח הזמנה...' : (isLoadingCompletionDate ? 'טוען תאריך...' : 'אישור ושליחת הזמנה')}
            </button>
            {isLoadingCompletionDate && <p className="text-xs text-center mt-2 text-gray-500">טוען תאריך השלמה משוער...</p>}
             {!isLoadingCompletionDate && expectedCompletionDate && (
                <p className="text-xs text-center mt-2 text-gray-500">
                    תאריך השלמה משוער: {expectedCompletionDate.toLocaleDateString('he-IL')}
                </p>
             )}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default BasketPage;
