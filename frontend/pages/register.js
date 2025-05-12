// pages/register.js
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
// --- Import Areas and settlementMap from the utility file ---
// Adjust the path based on your project structure (e.g., ../utils/locations)
import { Areas, settlementMap } from '../utils/locations';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  // Address state
  const [area, setArea] = useState('');
  const [settlement, setSettlement] = useState('');
  const [addressDetails, setAddressDetails] = useState('');
  // --- End Address State ---
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  // State for dynamic settlement dropdown
  const [availableSettlements, setAvailableSettlements] = useState([]);

  // Update available settlements when area changes
  useEffect(() => {
      if (area && settlementMap[area]) {
          setAvailableSettlements(settlementMap[area]);
          // Reset settlement if the previous one isn't in the new list
          if (!settlementMap[area].includes(settlement)) {
              setSettlement('');
          }
      } else {
          setAvailableSettlements([]);
          setSettlement(''); // Also reset settlement if area is cleared
      }
  // Include settlement in dependency array to handle the reset correctly
  }, [area, settlement]);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/products');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    // Combine address fields into the structure expected by the backend
    const address = { area, settlement, details: addressDetails };

    // Basic validation
    if (!name || !phone || !address.area || !address.settlement || !address.details) {
      setError('יש למלא את כל השדות (שם, טלפון, אזור, יישוב ופרטי כתובת)');
      setLoading(false);
      return;
    }

    // Call register function from context
    const result = await register(name, phone, address); // Pass the structured address object

    setLoading(false);

    if (result.success) {
      setSuccessMessage(result.message || 'ההרשמה בוצעה בהצלחה! ניתן כעת להתחבר.');
       // Clear form fields
       setName('');
       setPhone('');
       setArea('');
       setSettlement('');
       setAddressDetails('');
       setAvailableSettlements([]); // Clear settlements dropdown too
      // Redirect to login after a delay
      setTimeout(() => {
        router.push('/login');
      }, 2500); // Slightly longer delay
    } else {
      // Display error message from context/API
      setError(result.message || 'אירעה שגיאה בתהליך ההרשמה.');
    }
  };

   // Display loading message while auth state is being determined or if user is logged in
   if (authLoading || isAuthenticated) {
     return (
        <Layout title="טוען...">
            <div className="text-center py-10">טוען נתונים...</div>
        </Layout>
     );
   }

  return (
    <Layout title="הרשמה למערכת">
      <div className="max-w-md mx-auto mt-10 mb-10 bg-white p-8 rounded-lg shadow-md"> {/* Added mb-10 */}
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">הרשמה</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error and Success Messages */}
          {error && ( <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert"><span className="block sm:inline">{error}</span></div> )}
          {successMessage && ( <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert"><span className="block sm:inline">{successMessage}</span></div> )}

          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-1">שם מלא <span className="text-red-500">*</span></label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="הקלד/י את שמך המלא"/>
          </div>

          {/* Phone Field */}
          <div>
            <label htmlFor="phone" className="block text-sm font-bold text-gray-700 mb-1">מספר טלפון <span className="text-red-500">*</span></label>
            <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="05X-XXXXXXX"/>
            <p className="text-xs text-gray-500 mt-1">יש להזין מספר ישראלי תקין (10 ספרות, מתחיל ב-05).</p>
          </div>

          {/* --- Address Fields --- */}
          <fieldset className="border p-4 rounded space-y-4">
              <legend className="text-sm font-bold text-gray-700 px-2">כתובת למשלוח</legend>
              {/* Area Dropdown */}
              <div>
                  <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">אזור <span className="text-red-500">*</span></label>
                  <select id="area" name="area" value={area} onChange={(e) => setArea(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                      <option value="" disabled>-- בחר אזור --</option>
                      {/* Use imported Areas */}
                      {Areas.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
              </div>

              {/* Settlement Dropdown (conditional) */}
              <div>
                  <label htmlFor="settlement" className="block text-sm font-medium text-gray-700 mb-1">יישוב <span className="text-red-500">*</span></label>
                  <select id="settlement" name="settlement" value={settlement} onChange={(e) => setSettlement(e.target.value)} required disabled={!area || availableSettlements.length === 0} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100">
                      <option value="" disabled>-- בחר יישוב --</option>
                      {/* Use dynamically generated availableSettlements */}
                      {availableSettlements.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
              </div>

              {/* Address Details Text Input */}
              <div>
                  <label htmlFor="addressDetails" className="block text-sm font-medium text-gray-700 mb-1">פרטי כתובת (רחוב, מס' בית/דירה) <span className="text-red-500">*</span></label>
                  <input type="text" id="addressDetails" name="addressDetails" value={addressDetails} onChange={(e) => setAddressDetails(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="לדוגמה: הרצל 15, דירה 4"/>
              </div>
          </fieldset>
          {/* --- End Address Fields --- */}


          {/* Submit Button */}
          <div className="pt-2">
            <button type="submit" disabled={loading} className={`btn-primary w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {loading ? 'רושם...' : 'הרשמה'}
            </button>
          </div>

          {/* Link to Login Page */}
          <div className="mt-4 text-center">
            <p className="text-gray-600 text-sm">
              יש לך כבר חשבון?{' '}
              <Link href="/login" className="btn-link">
                  כניסה
              </Link>
            </p>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default RegisterPage;
