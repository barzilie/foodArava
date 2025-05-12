// pages/edit-order/[orderId].js
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Layout from '../../components/Layout';
import withAuth from '../../components/withAuth'; // Protect route
import { format } from 'date-fns';
import Image from 'next/image';
// Note: We are not using useBasket here as we are editing a specific, existing order's items.

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
const placeholderImg = 'https://res.cloudinary.com/dkfiohdyn/image/upload/w_1000,ar_1:1,c_fill,g_auto,e_art:hokusai/v1745856568/no_image_q68ugl.svg';

// --- Modal Component (can be extracted) ---
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h2 className="text-xl font-semibold">{title}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
};


const EditOrderPage = () => {
    const router = useRouter();
    const { orderId } = router.query;

    const [originalOrder, setOriginalOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [currentItems, setCurrentItems] = useState([]);
    const [deliveryAddressDetails, setDeliveryAddressDetails] = useState('');
    const [deliveryArea, setDeliveryArea] = useState('');
    const [deliverySettlement, setDeliverySettlement] = useState('');
    const [note, setNote] = useState('');
    const [orderDateDisplay, setOrderDateDisplay] = useState(''); // For your display fix

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState('');

    const [productDetailsCache, setProductDetailsCache] = useState({});

    // --- State for Adding New Products ---
    const [availableProducts, setAvailableProducts] = useState([]); // All products from DB
    const [loadingAvailableProducts, setLoadingAvailableProducts] = useState(false);
    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);


    // Fetch ALL available products for the "Add Product" modal
    const fetchAllProductsForModal = useCallback(async () => {
        if (availableProducts.length > 0) return; // Fetch only once
        setLoadingAvailableProducts(true);
        try {
            const response = await axios.get(`${API_URL}/products`);
            setAvailableProducts(response.data || []);
        } catch (err) {
            console.error("Error fetching all products for modal:", err);
            // Handle error (e.g., show a message in the modal)
        } finally {
            setLoadingAvailableProducts(false);
        }
    }, [availableProducts.length]); // Dependency to prevent re-fetch if already loaded

    // Fetch existing order details and then full product details for items
    const fetchOrderAndProductDetails = useCallback(async () => {
        if (!orderId) return;
        // Keep setLoading(true) at the very beginning of the data fetching process
        setLoading(true);
        setError(''); setSubmitError(''); setSubmitSuccess('');

        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error("User token not found");

            const orderResponse = await axios.get(`${API_URL}/orders/my/${orderId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const fetchedOrder = orderResponse.data;
            setOriginalOrder(fetchedOrder);
            setOrderDateDisplay(new Date(fetchedOrder.orderDate).toLocaleString('en-GB', { dateStyle: "short" }));


            const editableStatuses = ['Pending', 'Confirmed'];
            if (!editableStatuses.includes(fetchedOrder.status)) {
                setError(`לא ניתן לערוך הזמנה זו מכיוון שהיא במצב "${fetchedOrder.status}".`);
                // Set loading to false here as we are done with this path
                setLoading(false);
                return;
            }

            const productIdsInOrder = fetchedOrder.products.map(item => item.productId);
            const uniqueProductIds = [...new Set(productIdsInOrder)];
            const newProductDetails = { ...productDetailsCache }; // Use a copy
            const idsToFetch = uniqueProductIds.filter(id => !newProductDetails[id]);

            if (idsToFetch.length > 0) {
                const productDetailPromises = idsToFetch.map(id =>
                    axios.get(`${API_URL}/products/${id}`)
                        .then(res => { newProductDetails[id] = res.data; })
                        .catch(err => console.error(`Failed to fetch product ${id}`, err))
                );
                await Promise.all(productDetailPromises);
                setProductDetailsCache(prevCache => ({ ...prevCache, ...newProductDetails })); // Update cache immutably
            }

            // Initialize currentItems using the potentially updated newProductDetails
            // or the existing cache if all details were already present
            const finalProductDetailsForItems = productDetailsCache; // Use the most up-to-date cache
            // If idsToFetch was not empty, newProductDetails is more up-to-date for those specific items
            // So, merge newProductDetails into finalProductDetailsForItems for the items being processed
            idsToFetch.forEach(id => {
                if (newProductDetails[id]) {
                    finalProductDetailsForItems[id] = newProductDetails[id];
                }
            });


            setCurrentItems(
                fetchedOrder.products.map(item => ({
                    ...item,
                    product: finalProductDetailsForItems[item.productId] || {
                        _id: item.productId, name: item.name, defaultPacketCount: item.defaultPacketCount, servingOptions: [], photo: ''
                    },
                    productId: item.productId
                }))
            );

            const addressParts = fetchedOrder.deliveryAddress.match(/^(.*?), (.*?)\s*\((.*?)\)$/);
            if (addressParts) {
                setDeliverySettlement(addressParts[1]);
                setDeliveryAddressDetails(addressParts[2]);
                setDeliveryArea(addressParts[3]);
            } else {
                setDeliveryAddressDetails(fetchedOrder.deliveryAddress);
            }
            setNote(fetchedOrder.note || '');


        } catch (err) {
            console.error("Error fetching order details:", err);
            setError(err.response?.data?.message || err.message || 'שגיאה בטעינת פרטי ההזמנה');
            if (err.response?.status === 404) {
                setError('הזמנה לא נמצאה או שאינה שייכת לך.');
            }
        } finally {
            setLoading(false);
        }
    }, [orderId]); // Depend on orderId and cache

    useEffect(() => {
        if (orderId) { // Ensure orderId is present before fetching
            fetchOrderAndProductDetails();
        }
        // fetchOrderAndProductDetails is memoized, so it's safe to include
    }, [orderId, fetchOrderAndProductDetails]);


    // Handlers for item modifications
    const handleQuantityChange = (itemProductId, newQuantityStr, itemSelectedServingOption) => {
        const newQuantity = parseInt(newQuantityStr, 10);
        if (!isNaN(newQuantity)) {
            setCurrentItems(prevItems =>
                prevItems.map(item =>
                    item.productId === itemProductId && item.selectedServingOption === itemSelectedServingOption
                        ? { ...item, quantity: Math.max(0, newQuantity) } // Allow 0 for removal intent
                        : item
                )
            );
        }
    };

    const handleRemoveItem = (itemProductId, itemSelectedServingOption) => {
        setCurrentItems(prevItems =>
            prevItems.filter(item =>
                !(item.productId === itemProductId && item.selectedServingOption === itemSelectedServingOption)
            )
        );
    };

    const handlePacketCountChange = (itemProductId, packetCountStr, itemSelectedServingOption) => {
        const count = parseInt(packetCountStr, 10);
        setCurrentItems(prevItems =>
            prevItems.map(item =>
                item.productId === itemProductId && item.selectedServingOption === itemSelectedServingOption
                    ? { ...item, packetCount: (packetCountStr === '' || (Number.isInteger(count) && count >= 1)) ? (packetCountStr === '' ? null : count) : item.packetCount }
                    : item
            )
        );
    };

    // Calculate current total based on potentially modified items
    const getCurrentTotal = () => {
        return currentItems.reduce((total, item) => {
            // Use priceAtOrder from the item, as product price might have changed since order
            return total + (item.priceAtOrder * item.quantity);
        }, 0);
    };

    // Handle Submit Update
    const handleUpdateOrder = async () => {
        setSubmitError(''); setSubmitSuccess('');

        const itemsToSubmit = currentItems.filter(item => item.quantity > 0); // Filter out items with quantity 0

        if (itemsToSubmit.length === 0) {
            setSubmitError('לא ניתן לעדכן להזמנה ריקה. אם ברצונך לבטל, אנא פנה לשירות לקוחות.');
            return;
        }
        if (!deliveryAddressDetails.trim()) {
            setSubmitError('יש להזין פרטי כתובת למשלוח (רחוב, בית).');
            return;
        }

        // Packet count validation for items being submitted
        let packetError = false;
        const finalProductsData = itemsToSubmit.map(item => {
            let finalPacketCount = item.packetCount; // Use the packetCount from currentItems state
            // Validate if the product requires packets and a count is provided
            if (item.product?.defaultPacketCount > 0) {
                if (finalPacketCount === null || finalPacketCount === '' || !Number.isInteger(Number(finalPacketCount)) || Number(finalPacketCount) < 1) {
                    setSubmitError(`יש להזין מספר אריזות תקין (לפחות 1) עבור ${item.name}`);
                    packetError = true;
                }
            } else {
                finalPacketCount = null; // Ensure packetCount is null if product doesn't use it
            }
            return {
                productId: item.productId,
                quantity: item.quantity,
                selectedServingOption: item.selectedServingOption,
                packetCount: finalPacketCount,
                // PriceAtOrder and name are not sent for update, backend uses current prices for new items if any
            };
        });

        if (packetError) return;

        const fullDeliveryAddressString = `${deliverySettlement}, ${deliveryAddressDetails} (${deliveryArea})`;
        setIsSubmitting(true);
        try {
            const orderData = {
                products: finalProductsData,
                deliveryAddress: fullDeliveryAddressString.trim(),
                note: note.trim() || null,
            };
            console.log("Submitting Updated Order Data:", JSON.stringify(orderData, null, 2));

            const token = localStorage.getItem('token');
            if (!token) throw new Error("User not authenticated");

            const response = await axios.put(`${API_URL}/orders/my/${orderId}`, orderData, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.status === 200) {
                setSubmitSuccess('ההזמנה עודכנה בהצלחה!');
                // Update local state with the response from the server
                setOriginalOrder(response.data);
                fetchOrderAndProductDetails(); // Refetch to ensure consistency
                setTimeout(() => { router.push('/my-orders'); }, 2000);
            } else {
                throw new Error(response.data?.message || 'Failed to update order');
            }
        } catch (err) {
            console.error("Order update failed:", err);
            const backendErrorMessage = err.response?.data?.message || err.message || 'אירעה שגיאה בעדכון ההזמנה.';
            console.error("Backend Error Message:", backendErrorMessage);
            setSubmitError(backendErrorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Handler to add a new product to currentItems ---
    const handleAddNewProductToOrder = (productToAdd, quantity, selectedServingOption, packetCountInput) => {
        if (!productToAdd || quantity < 1) return;

        // Check if item (with same product ID AND serving option) already exists
        const existingItemIndex = currentItems.findIndex(
            item => item.productId === productToAdd._id && item.selectedServingOption === selectedServingOption
        );

        let finalPacketCount = null;
        if (productToAdd.defaultPacketCount > 0) {
            const pc = Number(packetCountInput);
            if (Number.isInteger(pc) && pc >= 1) {
                finalPacketCount = pc;
            } else {
                // Default to 1 packet if input is invalid but product requires it
                finalPacketCount = 1;
                console.warn(`Invalid packet count for new item ${productToAdd.name}, defaulting to 1.`);
            }
        }


        if (existingItemIndex > -1) {
            // Increase quantity of existing item
            setCurrentItems(prevItems =>
                prevItems.map((item, index) =>
                    index === existingItemIndex
                        ? { ...item, quantity: item.quantity + quantity, packetCount: finalPacketCount || item.packetCount } // Update packet count too if changed
                        : item
                )
            );
        } else {
            // Add new item
            setCurrentItems(prevItems => [
                ...prevItems,
                {
                    product: productToAdd, // Full product object
                    productId: productToAdd._id,
                    name: productToAdd.name,
                    quantity: quantity,
                    priceAtOrder: productToAdd.pricePerUnit, // Use current price for new items
                    selectedServingOption: selectedServingOption,
                    packetCount: finalPacketCount,
                },
            ]);
        }
        setIsAddProductModalOpen(false); // Close modal after adding
    };

        // --- Render Logic ---
        return (
            <Layout title={`עריכת הזמנה ${orderDateDisplay || orderId?.slice(-6)}`}>
                <h1 className="text-3xl font-bold text-gray-800 mb-6">
                    עריכת הזמנה <span className="font-mono text-2xl text-gray-500">{orderDateDisplay || `...${orderId?.slice(-6)}`}</span>
                </h1>

                {loading && <div className="text-center py-10">טוען פרטי הזמנה לעריכה...</div>}

                {/* Error State */}
                {error && <div className="text-center py-10 text-red-600 bg-red-100 p-4 rounded">{error}</div>}

                {/* Content Area */}
                {submitError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{submitError}</div>}
                {submitSuccess && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{submitSuccess}</div>}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Items List - Allow Editing */}
                        <div className="lg:col-span-2 bg-white rounded shadow p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold">פירוט ההזמנה (ניתן לעריכה)</h2>
                                <button
                                    onClick={() => {
                                        fetchAllProductsForModal(); // Fetch products if not already loaded
                                        setIsAddProductModalOpen(true);
                                    }}
                                    className="btn-secondary text-sm"
                                >
                                    + הוסף מוצר חדש
                                </button>
                            </div>
                            {currentItems.length === 0 ? (
                                <p className="text-gray-500">ההזמנה תהיה ריקה. אם ברצונך לבטל, אנא פנה לשירות הלקוחות.</p>
                            ) : (
                                <ul className="divide-y divide-gray-200">
                                    {currentItems.map((item) => {
                                        // Determine if packet input should be shown based on fetched product detail
                                        const showPacketInput = item.product?.defaultPacketCount > 0;
                                        const itemKey = `${item.productId}-${item.selectedServingOption || 'null'}`;

                                        return (
                                            <li key={itemKey} className="py-4 flex flex-wrap items-start space-x-4 rtl:space-x-reverse">
                                                <div className="flex-shrink-0">
                                                    <Image
                                                        src={item.product?.photo || placeholderImg}
                                                        alt={item.name}
                                                        width={60}
                                                        height={60}
                                                        className="rounded object-cover"
                                                        onError={(e) => { e.target.src = placeholderImg; }}
                                                    />
                                                </div>
                                                <div className="flex-grow min-w-[150px]">
                                                    <h3 className="font-semibold">{item.name}</h3>
                                                    {item.selectedServingOption && (<p className="text-sm text-gray-500">אפשרות: {item.selectedServingOption}</p>)}
                                                    <p className="text-sm text-gray-500">מחיר ליח' (בעת הזמנה): ₪{item.priceAtOrder.toFixed(2)}</p>
                                                    <div className="flex items-center mt-2">
                                                        <label htmlFor={`qty-${itemKey}`} className="text-sm mr-2 rtl:ml-2 rtl:mr-0">כמות:</label>
                                                        <input
                                                            type="number"
                                                            id={`qty-${itemKey}`}
                                                            min="0" // Allow 0 to indicate removal
                                                            value={item.quantity}
                                                            onChange={(e) => handleQuantityChange(item.productId, e.target.value, item.selectedServingOption)}
                                                            className="w-16 border border-gray-300 rounded px-2 py-1 text-center"
                                                        />
                                                        <button
                                                            onClick={() => handleRemoveItem(item.productId, item.selectedServingOption)}
                                                            className="text-red-500 hover:text-red-700 text-sm mr-3 rtl:ml-3 rtl:mr-0"
                                                        >
                                                            הסר
                                                        </button>
                                                    </div>
                                                </div>
                                                {showPacketInput && (
                                                    <div className="mt-2 sm:mt-0 sm:ml-4 rtl:mr-4 rtl:ml-0 flex-shrink-0 w-full sm:w-auto">
                                                        <label htmlFor={`packet-${itemKey}`} className="block text-sm font-medium text-gray-700 mb-1">מספר אריזות:</label>
                                                        <input
                                                            type="number"
                                                            id={`packet-${itemKey}`}
                                                            min="1"
                                                            step="1"
                                                            value={item.packetCount ?? ''} // Use item.packetCount from currentItems
                                                            onChange={(e) => handlePacketCountChange(item.productId, e.target.value, item.selectedServingOption)}
                                                            className="w-20 border border-gray-300 rounded px-2 py-1 text-center"
                                                            placeholder="כמה?"
                                                        />
                                                        <p className="text-xs text-gray-500 mt-1">ארוז ב- {item.packetCount || '?'} מגשים</p>
                                                    </div>
                                                )}
                                                <div className="font-semibold w-full sm:w-20 text-left rtl:text-right mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-none">
                                                    סה"כ: ₪{(item.priceAtOrder * item.quantity).toFixed(2)}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {/* Summary and Update Form */}
                        <div className="lg:col-span-1 bg-white rounded shadow p-6 h-fit sticky top-24">
                            <h2 className="text-xl font-semibold mb-4">סיכום ועדכון הזמנה</h2>
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between font-bold text-lg">
                                    <span>סה"כ לתשלום (מעודכן):</span>
                                    <span>₪{getCurrentTotal().toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="mb-4">
                                <label htmlFor="deliveryAddressDetails" className="block text-sm font-bold text-gray-700 mb-1">פרטי כתובת למשלוח (רחוב, בית) <span className="text-red-500">*</span></label>
                                <input type="text" id="deliveryAddressDetails" value={deliveryAddressDetails} onChange={(e) => setDeliveryAddressDetails(e.target.value)} required className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400" />
                                {(deliveryArea || deliverySettlement) && (<p className="text-xs text-gray-500 mt-1">יישוב: {deliverySettlement}, אזור: {deliveryArea} (לא ניתן לשינוי כאן)</p>)}
                            </div>
                            <div className="mb-6">
                                <label htmlFor="note" className="block text-sm font-bold text-gray-700 mb-1">הערות להזמנה (אופציונלי)</label>
                                <textarea id="note" rows="3" value={note} onChange={(e) => setNote(e.target.value)} className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="הערות מיוחדות..."></textarea>
                            </div>
                            <button onClick={handleUpdateOrder} disabled={isSubmitting || loading} className={`w-full btn-primary ${isSubmitting || loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {isSubmitting ? 'מעדכן...' : 'שמור שינויים בהזמנה'}
                            </button>
                        </div>
                    </div>
                <Modal isOpen={isAddProductModalOpen} onClose={() => setIsAddProductModalOpen(false)} title="הוספת מוצרים להזמנה">
                    {loadingAvailableProducts ? (
                        <p>טוען מוצרים זמינים...</p>
                    ) : availableProducts.length > 0 ? (
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                            {availableProducts
                                // Optional: Filter out products already in the current order to avoid confusion
                                // .filter(p => !currentItems.some(ci => ci.productId === p._id))
                                .map(prod => (
                                    // Simplified card for adding - or reuse ProductCard with an "Add to this Order" action
                                    <div key={prod._id} className="p-3 border rounded-md shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                        <div>
                                            <h4 className="font-semibold">{prod.name}</h4>
                                            <p className="text-sm text-gray-600">₪{prod.pricePerUnit.toFixed(2)}</p>
                                            {prod.manufacturer && <p className="text-xs text-gray-500">יצרן: {prod.manufacturer}</p>}
                                        </div>
                                        {/* Simplified add controls - TODO: Add quantity, serving, packet inputs here */}
                                        <button
                                            onClick={() => handleAddNewProductToOrder(prod, 1, null, null)} // Pass default quantity/options
                                            className="btn-primary text-sm mt-2 sm:mt-0"
                                        >
                                            הוסף להזמנה
                                        </button>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <p>לא נמצאו מוצרים להוספה.</p>
                    )}
                </Modal>
            </Layout>
        );
};

export default withAuth(EditOrderPage);
