// pages/login.js
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState(''); // For admin password step

  // UI/Flow state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // General loading state
  const [showPasswordInput, setShowPasswordInput] = useState(false); // Control visibility of password field
  const [adminUserId, setAdminUserId] = useState(null); // Store admin user ID for step 2

  const { login, verifyAdminPassword, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { redirect } = router.query; // Get redirect query param if present

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push(redirect || '/products'); // Redirect to intended page or products
    }
  }, [isAuthenticated, authLoading, router, redirect]);

  // --- Handler for Step 1: Name/Phone Submission ---
  const handleNamePhoneSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setShowPasswordInput(false); // Reset password visibility
    setAdminUserId(null);

    if (!name || !phone) {
      setError('יש למלא שם וטלפון');
      setLoading(false);
      return;
    }

    // Call Step 1 login function from context
    const result = await login(name, phone);
    setLoading(false);

    if (result.success) {
      // Regular user login successful
      router.push(redirect || '/products');
    } else if (result.adminLoginRequired) {
      // Admin detected, need password step
      setError(result.message); // Show message like "Password required"
      setAdminUserId(result.userId);
      setShowPasswordInput(true); // Show the password field
      setPassword(''); // Clear password field for input
    } else {
      // General login error (wrong name/phone, server error)
      setError(result.message || 'שם או טלפון אינם נכונים');
    }
  };

  // --- Handler for Step 2: Admin Password Submission ---
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    setLoading(true);

    if (!password) {
        setError('יש להזין סיסמה');
        setLoading(false);
        return;
    }
    if (!adminUserId) { // Safety check
        setError('שגיאה: לא זוהה משתמש מנהל.');
        setLoading(false);
        setShowPasswordInput(false); // Hide password field again
        return;
    }

    // Call Step 2 verification function from context
    const result = await verifyAdminPassword(adminUserId, password);
    setLoading(false);

    if (result.success) {
        // Admin login successful
        // Redirect to admin page or intended page
        router.push(redirect || '/admin/orders');
    } else {
        // Incorrect password or other error during verification
        setError(result.message || 'סיסמת מנהל שגויה');
        // Keep password input visible for retry, but clear the field
        setPassword('');
    }
  };


  // Show loading indicator if auth state is loading or user is already logged in
  if (authLoading || (!authLoading && isAuthenticated)) {
     return (
        <Layout title="טוען...">
            <div className="text-center py-10">טוען נתונים...</div>
        </Layout>
     );
  }

  return (
    <Layout title="כניסה למערכת">
      <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">כניסה</h1>

        {/* Display error message */}
        {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
            </div>
        )}

        {/* --- Render Step 1 Form OR Step 2 Form --- */}

        {!showPasswordInput ? (
            // --- Step 1: Name and Phone Form ---
            <form onSubmit={handleNamePhoneSubmit}>
              {/* Name Field */}
              <div className="mb-4">
                <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">שם מלא</label>
                <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" placeholder="הקלד/י את שמך המלא"/>
              </div>
              {/* Phone Field */}
              <div className="mb-6">
                <label htmlFor="phone" className="block text-gray-700 text-sm font-bold mb-2">מספר טלפון</label>
                <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" placeholder="05X-XXXXXXX"/>
                <p className="text-xs text-gray-500 mt-1">יש להזין מספר ישראלי תקין (10 ספרות, מתחיל ב-05).</p>
              </div>
              {/* Submit Button for Step 1 */}
              <div className="flex items-center justify-between">
                <button type="submit" disabled={loading} className={`btn-primary w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {loading ? 'בודק...' : 'המשך'}
                </button>
              </div>
            </form>
        ) : (
            // --- Step 2: Admin Password Form ---
            <form onSubmit={handlePasswordSubmit}>
                 {/* Display user being verified (optional) */}
                 <p className="text-center text-gray-600 mb-4">אימות מנהל עבור: <strong>{name}</strong></p>
                 {/* Password Field */}
                 <div className="mb-6">
                    <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">סיסמה</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoFocus // Focus on password field when it appears
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        placeholder="הזן סיסמת מנהל"
                    />
                 </div>
                 {/* Submit Button for Step 2 */}
                 <div className="flex items-center justify-between">
                    <button type="submit" disabled={loading} className={`btn-primary w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {loading ? 'מאמת...' : 'כניסה כמנהל'}
                    </button>
                 </div>
                 {/* Option to go back */}
                 <div className="mt-4 text-center">
                     <button type="button" onClick={() => { setShowPasswordInput(false); setError(''); setAdminUserId(null); }} className="text-sm text-gray-500 hover:text-gray-700 underline">
                         חזרה (שינוי שם/טלפון)
                     </button>
                 </div>
            </form>
        )}


        {/* Link to Register Page (Show only in Step 1) */}
        {!showPasswordInput && (
            <div className="mt-6 text-center">
                <p className="text-gray-600 text-sm">
                אין לך חשבון?{' '}
                <Link href="/register" className="btn-link">
                    הרשמה
                </Link>
                </p>
            </div>
        )}
      </div>
    </Layout>
  );
};

export default LoginPage;
