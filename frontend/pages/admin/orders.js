// pages/admin/orders.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import withAdminAuth from '../../components/withAdminAuth'; // Import the HOC
import { format } from 'date-fns'; // For formatting dates easily npm install date-fns
import { Parser } from 'json2csv'; // For CSV export

// Define the API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const AdminOrdersPage = () => {
  const [viewMode, setViewMode] = useState('byOrder'); // 'byOrder' or 'byProduct'
  const [orders, setOrders] = useState([]);
  const [productSummary, setProductSummary] = useState([]); // State for product summary data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // State for filters and pagination (mostly for 'byOrder' view)
  const [filters, setFilters] = useState({
    status: '',
    manufacturer: '', // Keep for 'byOrder' view
    orderDateStart: '',
    orderDateEnd: '',
    completionDateStart: '', // Used by both views
    completionDateEnd: '',   // Used by both views
    userArea: '',
    userSettlement: '',
  });

  // State for manufacturer dropdown options
  const [manufacturerOptions, setManufacturerOptions] = useState([]);
  const [loadingManufacturers, setLoadingManufacturers] = useState(false);

  const [sortBy, setSortBy] = useState('orderDate'); // Default for 'byOrder'
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [limit, setLimit] = useState(15);


  // --- Fetch Distinct Manufacturers ---
  const fetchManufacturers = useCallback(async () => {
    setLoadingManufacturers(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("Admin token not found");
      const response = await axios.get(`${API_URL}/products/manufacturers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setManufacturerOptions(response.data || []);
    } catch (err) {
      console.error("Error fetching manufacturers:", err);
      // Handle error silently or show a small indicator
    } finally {
      setLoadingManufacturers(false);
    }
  }, []);

  // Fetch manufacturers on initial load
  useEffect(() => {
    fetchManufacturers();
  }, [fetchManufacturers]);


  // --- Fetch Orders (for 'byOrder' view) ---
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("Admin token not found");

      const params = new URLSearchParams({
        page: currentPage,
        limit: limit,
        sortBy: sortBy,
        sortOrder: sortOrder,
      });
      // Add filters only if they have values
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(`${API_URL}/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` },
        params: params,
      });

      setOrders(response.data.orders || []);
      setCurrentPage(response.data.currentPage || 1);
      setTotalPages(response.data.totalPages || 1);
      setTotalOrders(response.data.totalOrders || 0);
      setProductSummary([]); // Clear summary data when fetching orders

    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(err.response?.data?.message || err.message || 'שגיאה בטעינת ההזמנות');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, sortBy, sortOrder, filters]);

  // --- Fetch Product Summary (for 'byProduct' view) ---
  const fetchProductSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("Admin token not found");

      // Construct query parameters for summary (mainly date and status)
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.completionDateStart) params.append('completionDateStart', filters.completionDateStart);
      if (filters.completionDateEnd) params.append('completionDateEnd', filters.completionDateEnd);
      // Note: Manufacturer filter doesn't apply here directly
      if (filters.manufacturer) params.append('manufacturer', filters.manufacturer);


      const response = await axios.get(`${API_URL}/admin/orders/summary-by-product`, {
        headers: { Authorization: `Bearer ${token}` },
        params: params,
      });

      setProductSummary(response.data || []);
      setOrders([]); // Clear order data when fetching summary

    } catch (err) {
      console.error("Error fetching product summary:", err);
      setError(err.response?.data?.message || err.message || 'שגיאה בטעינת סיכום המוצרים');
      setProductSummary([]);
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.completionDateStart, filters.completionDateEnd, filters.manufacturer]);  // Dependencies for summary fetch


  // Fetch data based on viewMode
  useEffect(() => {
    if (viewMode === 'byOrder') {
      fetchOrders();
    } else {
      fetchProductSummary();
    }
  }, [viewMode, fetchOrders, fetchProductSummary, filters]); // Re-fetch when viewMode changes

  // Handlers for filters and sorting
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    // Reset pagination only if viewing by order
    if (viewMode === 'byOrder') {
      setCurrentPage(1);
    }
    // For 'byProduct' view, changing filters triggers fetch directly via useEffect dependency change
  };

  // Sorting only applies to 'byOrder' view in this implementation
  const handleSortChange = (newSortBy) => {
    if (viewMode !== 'byOrder') return; // Ignore sort clicks in product view

    if (sortBy === newSortBy) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (viewMode !== 'byOrder') return; // Ignore pagination clicks in product view

    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // --- CSV Export (Context-Aware) ---
  const handleExport = async () => {
    setError('');
    setLoading(true); // Indicate loading during export prep
    const token = localStorage.getItem('token');
    if (!token) {
      setError("Admin token not found for export.");
      setLoading(false);
      return;
    }

    try {
      let csvData;
      let fileName;
      let fields;

      if (viewMode === 'byOrder') {
        // --- Export Orders ---
        const exportParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value) exportParams.append(key, value);
        });

        const response = await axios.get(`${API_URL}/admin/orders/export`, {
          headers: { Authorization: `Bearer ${token}` },
          params: exportParams,
          responseType: 'blob',
        });
        csvData = response.data; // This is the CSV string from the dedicated endpoint
        const contentDisposition = response.headers['content-disposition'];
        fileName = `orders_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        if (contentDisposition) { const m = contentDisposition.match(/filename="?(.+)"?/i); if (m && m[1]) fileName = m[1]; }

        // No need for json2csv parsing here as backend already did it
      } else {
        // --- Export Product Summary ---
        // Fetch the summary data again (or use current state if filters haven't changed)
        // Using current state for simplicity here:
        if (productSummary.length === 0) {
          throw new Error("No product summary data available to export.");
        }

        // Flatten data for CSV: one row per user per product
        const flattenedData = [];
        productSummary.forEach(product => {
          product.users.forEach(userOrder => {
            flattenedData.push({
              productId: product.productId,
              productName: product.productName,
              totalQuantity: product.totalQuantity, // This is total for the product
              userName: userOrder.userName,
              userPhone: userOrder.userPhone,
              quantityOrdered: userOrder.quantity,
              orderDate: format(new Date(userOrder.orderDate), 'yyyy-MM-dd'),
              completionDate: format(new Date(userOrder.completionDate), 'yyyy-MM-dd'),
              manufacturer: product.manufacturer,
            });
          });
        });

        fields = [
          { label: 'מזהה מוצר', value: 'productId' },
          { label: 'שם מוצר', value: 'productName' },
          { label: 'כמות כוללת למוצר', value: 'totalQuantity' },
          { label: 'שם לקוח', value: 'userName' },
          { label: 'טלפון לקוח', value: 'userPhone' },
          { label: 'כמות שהוזמנה ע"י הלקוח', value: 'quantityOrdered' },
          { label: 'תאריך הזמנה', value: 'orderDate' },
          { label: 'תאריך השלמה', value: 'completionDate' },
        ];
        const json2csvParser = new Parser({ fields, header: true, excelStrings: true, withBOM: true });
        csvData = json2csvParser.parse(flattenedData); // Generate CSV string
        fileName = `product_summary_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      }

      // Trigger download
      const url = window.URL.createObjectURL(new Blob([csvData], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Error exporting data:", err);
      if (err.response && err.response.status === 404) {
        setError('לא נמצאו נתונים התואמים לקריטריונים לייצוא.');
      } else {
        setError(err.response?.data?.message || err.message || 'שגיאה בייצוא הנתונים');
      }
    } finally {
      setLoading(false);
    }
  };


  // Helper to render sort icons
  const renderSortIcon = (columnName) => {
    if (viewMode !== 'byOrder' || sortBy !== columnName) return <span className="opacity-30">↕</span>;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <Layout title="ניהול הזמנות">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">ניהול הזמנות</h1>

      {/* View Mode Tabs/Buttons */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 rtl:space-x-reverse" aria-label="Tabs">
          <button
            onClick={() => setViewMode('byOrder')}
            className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm ${viewMode === 'byOrder'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            לפי הזמנה
          </button>
          <button
            onClick={() => setViewMode('byProduct')}
            className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm ${viewMode === 'byProduct'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            סיכום לפי מוצר
          </button>
        </nav>
      </div>


      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {/* Filters Section - Adjust visibility based on viewMode */}
      <div className="bg-white p-4 rounded shadow mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Status Filter (Both Views) */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">סטטוס</label>
          <select id="status" name="status" value={filters.status} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            <option value="">הכל</option>
            <option value="Pending">ממתין</option>
            <option value="Confirmed">מאושר</option>
            <option value="Processing">בעיבוד</option>
            <option value="Ready">מוכן</option>
            <option value="Delivered">נמסר</option>
            <option value="Cancelled">בוטל</option>
          </select>
        </div>
        <div>
          <label htmlFor="manufacturer" className="block text-sm font-medium text-gray-700">יצרן</label>
          <select id="manufacturer" name="manufacturer" value={filters.manufacturer} onChange={handleFilterChange} disabled={loadingManufacturers} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100">
            <option value="">כל היצרנים</option>
            {manufacturerOptions.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Completion Date Filters (Both Views) */}
        <div>
          <label htmlFor="completionDateStart" className="block text-sm font-medium text-gray-700">ת. השלמה (מ-)</label>
          <input type="date" id="completionDateStart" name="completionDateStart" value={filters.completionDateStart} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="completionDateEnd" className="block text-sm font-medium text-gray-700">ת. השלמה (עד-)</label>
          <input type="date" id="completionDateEnd" name="completionDateEnd" value={filters.completionDateEnd} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>

        {/* Filters only for 'byOrder' view */}
        {viewMode === 'byOrder' && (
          <>
            {/* Area Filter */}
            <div>
              <label htmlFor="userArea" className="block text-sm font-medium text-gray-700">אזור לקוח</label>
              <select id="userArea" name="userArea" value={filters.userArea} onChange={handleFilterChange} className="mt-1 ...">
                <option value="">כל האזורים</option>
                {/* Assuming Areas is imported or defined */}
                {/* {Areas.map(a => <option key={a} value={a}>{a}</option>)} */}
              </select>
            </div>
            {/* Settlement Filter (Text for now, could be dynamic dropdown) */}
            <div>
              <label htmlFor="userSettlement" className="block text-sm font-medium text-gray-700">יישוב לקוח</label>
              <input type="text" id="userSettlement" name="userSettlement" value={filters.userSettlement} onChange={handleFilterChange} placeholder="סינון לפי יישוב..." className="mt-1 ..." />
            </div>
            <div>
              <label htmlFor="orderDateStart" className="block text-sm font-medium text-gray-700">ת. הזמנה (מ-)</label>
              <input type="date" id="orderDateStart" name="orderDateStart" value={filters.orderDateStart} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="orderDateEnd" className="block text-sm font-medium text-gray-700">ת. הזמנה (עד-)</label>
              <input type="date" id="orderDateEnd" name="orderDateEnd" value={filters.orderDateEnd} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
          </>
        )}
        {/* Export Button */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end items-end">
          <button onClick={handleExport} className="btn-secondary" disabled={loading}>
            {loading ? 'טוען...' : `ייצוא ${viewMode === 'byOrder' ? 'הזמנות' : 'סיכום'} ל-CSV`}
          </button>
        </div>
      </div>


      {/* Conditional Rendering based on viewMode */}
      {loading ? (
        <div className="text-center py-10">טוען נתונים...</div>
      ) : viewMode === 'byOrder' ? (
        // --- Orders Table ---
        orders.length === 0 ? (
          <div className="text-center py-10 bg-white rounded shadow p-6">לא נמצאו הזמנות התואמות לסינון.</div>
        ) : (
          <div className="bg-white p-4 rounded shadow overflow-x-auto">
            {/* Orders Table Structure (same as before) */}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('orderDate')}>ת. הזמנה {renderSortIcon('orderDate')}</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('userName')}>שם לקוח {renderSortIcon('userName')}</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">טלפון</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">כתובת</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">מוצרים</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('totalPrice')}>סה"כ {renderSortIcon('totalPrice')}</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('completionDate')}>ת. השלמה {renderSortIcon('completionDate')}</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('status')}>סטטוס {renderSortIcon('status')}</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">הערות</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order._id}>
                    {/* Order Row Data (same as before) */}
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{format(new Date(order.orderDate), 'dd/MM/yyyy HH:mm')}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{order.userName}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{order.userPhone}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate" title={order.deliveryAddress}>{order.deliveryAddress}</td>
                    <td className="px-4 py-4 text-sm text-gray-500"><ul className="list-disc list-inside">{order.products.map((p, i) => (<li key={i} title={p.selectedServingOption ? `${p.name} [${p.selectedServingOption}] x ${p.quantity}` : `${p.name} x ${p.quantity}`} className="truncate max-w-[150px]">{p.name} ({p.quantity}) {p.selectedServingOption ? `[${p.selectedServingOption.substring(0, 10)}...]` : ''}</li>))}</ul></td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">₪{order.totalPrice.toFixed(2)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(order.completionDate), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{order.status}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate" title={order.note || ''}>{order.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination Controls (only for 'byOrder' view) */}
            {totalPages > 1 && (<div className="mt-6 flex justify-center items-center space-x-2 rtl:space-x-reverse"><button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 border rounded bg-white disabled:opacity-50">&lt; הקודם</button><span className="text-sm text-gray-700">עמוד {currentPage} מתוך {totalPages} (סה"כ {totalOrders} הזמנות)</span><button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 border rounded bg-white disabled:opacity-50">הבא &gt;</button></div>)}
          </div>
        )
      ) : (
        // --- Product Summary Table ---
        productSummary.length === 0 ? (
          <div className="text-center py-10 bg-white rounded shadow p-6">לא נמצאו נתונים לסיכום המוצרים לפי הסינון הנוכחי.</div>
        ) : (
          <div className="bg-white p-4 rounded shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">שם מוצר</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">כמות כוללת</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">לקוחות שהזמינו</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productSummary.map((product) => (
                  <tr key={product.productId}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.productName}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-700">{product.totalQuantity}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {/* Display list of users who ordered this product */}
                      <ul className="list-disc list-inside space-y-1 max-h-40 overflow-y-auto">
                        {product.users.map((userOrder, index) => (
                          <li key={`${userOrder.userId}-${index}`} title={`ת. הזמנה: ${format(new Date(userOrder.orderDate), 'dd/MM/yy')}, טלפון: ${userOrder.userPhone}`}>
                            {userOrder.userName} ({userOrder.quantity})
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </Layout>
  );
};

// Wrap the component with the HOC
export default withAdminAuth(AdminOrdersPage);
