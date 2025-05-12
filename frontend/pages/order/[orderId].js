// pages/order/[orderId].js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Layout from '../../components/Layout';
import withAuth from '../../components/withAuth'; // Protect route
import { format } from 'date-fns';
//import Image from 'next/image';
import Link from 'next/link'; // <--- IMPORT LINK HERE


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
const placeholderImg = 'https://res.cloudinary.com/dkfiohdyn/image/upload/w_1000,ar_1:1,c_fill,g_auto,e_art:hokusai/v1745856568/no_image_q68ugl.svg';

const OrderDetailsPage = () => {
  const router = useRouter();
  const { orderId } = router.query; // Get orderId from URL parameter
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) return; // Don't fetch if orderId isn't available yet

      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error("User token not found");

        const response = await axios.get(`${API_URL}/orders/my/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrder(response.data);
      } catch (err) {
        console.error("Error fetching order details:", err);
        setError(err.response?.data?.message || err.message || 'שגיאה בטעינת פרטי ההזמנה');
        if (err.response?.status === 404) {
             setError('הזמנה לא נמצאה או שאינה שייכת לך.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]); // Re-fetch if orderId changes

  if (loading) {
    return <Layout title="טוען הזמנה..."><div className="text-center py-10">טוען פרטי הזמנה...</div></Layout>;
  }

  if (error) {
    return <Layout title="שגיאה"><div className="text-center py-10 text-red-600 bg-red-100 p-4 rounded">{error}</div></Layout>;
  }

  if (!order) {
     return <Layout title="הזמנה לא נמצאה"><div className="text-center py-10">הזמנה לא נמצאה.</div></Layout>;
  }

  // Define which statuses allow editing
  const editableStatuses = ['Pending', 'Confirmed'];
  const canEdit = editableStatuses.includes(order.status);

  return (
    <Layout title={`פרטי הזמנה ${orderId.slice(-6)}`}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
            פרטי הזמנה <span className="font-mono text-2xl text-gray-500">...{orderId.slice(-6)}</span>
        </h1>
         {/* Add Edit button if applicable */}
         {canEdit && (
            <Link href={`/edit-order/${order._id}`} className="btn-secondary">
                ערוך הזמנה
            </Link>
         )}
      </div>


      <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
        {/* Order Summary Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4">
          <div><span className="font-semibold">תאריך הזמנה:</span> {format(new Date(order.orderDate), 'dd/MM/yyyy HH:mm')}</div>
          <div><span className="font-semibold">תאריך השלמה משוער:</span> {format(new Date(order.completionDate), 'dd/MM/yyyy')}</div>
          <div><span className="font-semibold">סטטוס:</span> <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'Delivered' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{order.status}</span></div>
          <div><span className="font-semibold">סה"כ לתשלום:</span> ₪{order.totalPrice.toFixed(2)}</div>
          <div className="md:col-span-2"><span className="font-semibold">כתובת למשלוח:</span> {order.deliveryAddress}</div>
          {order.note && <div className="md:col-span-2"><span className="font-semibold">הערות לקוח:</span> {order.note}</div>}
        </div>

        {/* Product List */}
        <div>
          <h2 className="text-xl font-semibold mb-3">מוצרים בהזמנה</h2>
          <ul className="divide-y divide-gray-200 border rounded-md">
            {order.products.map((item, index) => (
              <li key={`${item.productId}-${index}`} className="p-3 flex items-center space-x-4 rtl:space-x-reverse">
                 {/* Find product details from original order data if needed, or just display name/qty */}
                 {/* Assuming product details might not be fully populated, adjust if needed */}
                 {/* <Image src={placeholderImg} alt={item.name} width={60} height={60} className="rounded"/> */}
                 <div className="flex-grow">
                   <span className="font-medium">{item.name}</span>
                   {item.selectedServingOption && <span className="text-sm text-gray-500"> ({item.selectedServingOption})</span>}
                   {item.packetCount && <span className="text-sm text-gray-500"> | {item.packetCount} אריזות</span>}
                 </div>
                 <div className="text-sm text-gray-600">כמות: {item.quantity}</div>
                 <div className="text-sm text-gray-600 w-25 text-left rtl:text-right">| מחיר: ₪{(item.priceAtOrder * item.quantity).toFixed(2)}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default withAuth(OrderDetailsPage); // Protect route
