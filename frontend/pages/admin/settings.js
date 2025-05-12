// pages/admin/settings.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import withAdminAuth from '../../components/withAdminAuth';
import { format } from 'date-fns'; // For formatting date input

// Define the API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const AdminSettingsPage = () => {
  const [completionDate, setCompletionDate] = useState(''); // Store as YYYY-MM-DD for input
  const [originalDate, setOriginalDate] = useState(null); // Store full Date object
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch current setting on load
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
          setError("Admin token not found.");
          setLoading(false);
          return;
      }
      try {
        const response = await axios.get(`${API_URL}/admin/settings/completion-date`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const dateFromServer = new Date(response.data.defaultCompletionDate);
        setOriginalDate(dateFromServer);
        // Format date for input type="date" (YYYY-MM-DD)
        setCompletionDate(format(dateFromServer, 'yyyy-MM-dd'));
      } catch (err) {
        console.error("Error fetching settings:", err);
        setError(err.response?.data?.message || err.message || 'שגיאה בטעינת ההגדרות');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');
    const token = localStorage.getItem('token');
    if (!token) {
        setError("Admin token not found.");
        setIsSubmitting(false);
        return;
    }

    // Ensure the date string includes a time part if needed, or ensure backend handles date-only correctly
    // Sending YYYY-MM-DD might result in timezone issues if backend expects full ISO string.
    // Let's assume backend can handle YYYY-MM-DD or we adjust it slightly here.
    // For simplicity, we send the date string as is. Backend validation should check it.
    // const dateToSend = new Date(completionDate); // This might be midnight UTC depending on browser

    try {
        const response = await axios.put(`${API_URL}/admin/settings/completion-date`,
            { defaultCompletionDate: completionDate }, // Send the YYYY-MM-DD string
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.status === 200) {
             setSuccessMessage(response.data.message || 'ההגדרות עודכנו בהצלחה!');
             // Update the displayed date based on response
             const updatedDateFromServer = new Date(response.data.defaultCompletionDate);
             setOriginalDate(updatedDateFromServer);
             setCompletionDate(format(updatedDateFromServer, 'yyyy-MM-dd'));
        } else {
             throw new Error(response.data?.message || 'Failed to update settings');
        }

    } catch (err) {
         console.error("Error updating settings:", err);
         setError(err.response?.data?.message || err.message || 'שגיאה בעדכון ההגדרות');
    } finally {
         setIsSubmitting(false);
    }

  };

  return (
    <Layout title="הגדרות מערכת">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">הגדרות מערכת</h1>

      <div className="bg-white p-6 rounded shadow max-w-lg mx-auto">
        <h2 className="text-xl font-semibold mb-4">תאריך השלמת הזמנות דיפולטיבי</h2>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
        {successMessage && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{successMessage}</div>}

        {loading ? (
          <div className="text-center py-5">טוען הגדרות...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="mb-2 text-sm text-gray-600">
              קבע את התאריך הבא שבו כל ההזמנות החדשות יסומנו כברירת מחדל להשלמה.
            </p>
            <div className="mb-4">
              <label htmlFor="completionDate" className="block text-sm font-medium text-gray-700">תאריך השלמה</label>
              <input
                type="date"
                id="completionDate"
                name="completionDate"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                required
                // Optional: Set min date to today
                min={format(new Date(), 'yyyy-MM-dd')}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
             <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full btn-primary ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? 'מעדכן...' : 'שמור שינויים'}
              </button>
          </form>
        )}
      </div>
    </Layout>
  );
};

export default withAdminAuth(AdminSettingsPage);
