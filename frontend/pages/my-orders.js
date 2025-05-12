// pages/my-orders.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import withAuth from '../components/withAuth'; // Import the general auth HOC
import { format } from 'date-fns';
import Link from 'next/link'; // For linking to update page (if implemented)

// Define the API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMyOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("User token not found");

      const response = await axios.get(`${API_URL}/orders/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOrders(response.data || []);

    } catch (err) {
      console.error("Error fetching user orders:", err);
      setError(err.response?.data?.message || err.message || 'שגיאה בטעינת ההזמנות שלך');
      setOrders([]); // Clear orders on error
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed here as it fetches based on stored token

  // Fetch orders on initial load
  useEffect(() => {
    fetchMyOrders();
  }, [fetchMyOrders]);

  const editableStatuses = ['Pending', 'Confirmed'];

  return (
    <Layout title="ההזמנות שלי">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">ההזמנות שלי</h1>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {loading ? (
        <div className="text-center py-10">טוען הזמנות...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-10 bg-white rounded shadow p-6">
          <p className="text-gray-600 mb-4">עדיין לא ביצעת הזמנות.</p>
          <Link href="/products" className="btn-primary">
            להתחלת קניות
          </Link>
        </div>
      ) : (
        <div className="bg-white p-4 rounded shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">מספר הזמנה</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך הזמנה</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">כתובת למשלוח</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">מוצרים</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סה"כ</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ת. השלמה משוער</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סטטוס</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">הערות</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => {
                const canEdit = editableStatuses.includes(order.status);
                return (
                  <tr key={order._id}>
                    {/* Displaying last 6 chars of ID as order number */}
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-500" title={order._id}>...{order._id.slice(-6)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{format(new Date(order.orderDate), 'dd/MM/yyyy HH:mm')}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate" title={order.deliveryAddress}>{order.deliveryAddress}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      <ul className="list-disc list-inside">
                        {order.products.map((p, i) => (
                          <li key={i} title={p.selectedServingOption ? `${p.name} [${p.selectedServingOption}] x ${p.quantity}` : `${p.name} x ${p.quantity}`} className="truncate max-w-[150px]">
                            {p.name} ({p.quantity}) {p.selectedServingOption ? `[...]` : ''}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">₪{order.totalPrice.toFixed(2)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(order.completionDate), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{order.status}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate" title={order.note || ''}>{order.note || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2 rtl:space-x-reverse">
                      {/* View Details Link */}
                      <Link href={`/order/${order._id}`} className="!text-lime-600 hover:text-lime-900">
                        צפה
                      </Link>
                      {/* Edit Link (Conditional) */}
                      {canEdit && (
                        <Link href={`/edit-order/${order._id}`} className="!text-red-600 hover:text-indigo-900 rtl:mr-2">
                          ערוך
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
};

// Wrap the component with the HOC for logged-in users
export default withAuth(MyOrdersPage);
