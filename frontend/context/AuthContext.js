// context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios'; // Using axios for API calls

// Define the API base URL (replace with your actual backend URL)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// Create the context
const AuthContext = createContext();

// Create a provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Holds user data { id, name, phone, address, isAdmin }
  const [token, setToken] = useState(null); // Holds JWT token
  const [loading, setLoading] = useState(true); // Loading state for initial auth check
  const router = useRouter();

  // Function to load user and token from localStorage on initial load
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        // Set default auth header for axios
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false); // Finished initial loading
  }, []);

// --- Helper function to set auth state ---
const setAuthState = (receivedToken, receivedUser) => {
  setToken(receivedToken);
  setUser(receivedUser);
  localStorage.setItem('token', receivedToken);
  localStorage.setItem('user', JSON.stringify(receivedUser));
  axios.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;
  console.log("Auth state updated:", receivedUser);
};

// Login function - Step 1 (Name/Phone)
const login = async (name, phone) => {
   console.log("Attempting login step 1:", { name, phone });
   try {
      const response = await axios.post(`${API_URL}/auth/login`, { name, phone });

      // --- Check for Admin Login Required ---
      if (response.data && response.data.adminLoginRequired) {
          console.log("Admin login detected, password required.");
          return {
              success: false, // Not fully logged in yet
              adminLoginRequired: true,
              userId: response.data.userId,
              message: response.data.message || 'נדרשת סיסמת מנהל'
          };
      }
      // --- Regular User Login Success ---
      else if (response.data && response.data.token && response.data.user) {
          console.log("Regular user login successful.");
          setAuthState(response.data.token, response.data.user);
          return { success: true, user: response.data.user };
      }
      // --- Unexpected response ---
      else {
           console.error("Unexpected login response:", response.data);
           throw new Error("תגובת שרת לא תקינה בתהליך ההתחברות");
      }
   } catch (error) {
      console.error("Login step 1 failed:", error.response ? error.response.data : error.message);
      logout(false); // Clear any potentially stale data on error
      return {
          success: false,
          adminLoginRequired: false, // Ensure this is false on error
          message: error.response?.data?.message || 'שגיאה בתהליך ההתחברות'
      };
   }
};

// --- NEW Function: Verify Admin Password - Step 2 ---
const verifyAdminPassword = async (userId, password) => {
    console.log("Attempting login step 2 (admin password):", { userId });
    try {
        const response = await axios.post(`${API_URL}/auth/login/admin-password`, { userId, password });

        if (response.data && response.data.token && response.data.user) {
            console.log("Admin password verification successful.");
            setAuthState(response.data.token, response.data.user);
            return { success: true, user: response.data.user };
        } else {
            console.error("Unexpected admin password verification response:", response.data);
            throw new Error("תגובת שרת לא תקינה באימות סיסמת מנהל");
        }
    } catch (error) {
        console.error("Admin password verification failed:", error.response ? error.response.data : error.message);
        // Don't necessarily log out here, just report the password error
        return {
            success: false,
            message: error.response?.data?.message || 'שגיאה באימות סיסמת מנהל'
        };
    }
};



   // Register function (doesn't automatically log in here, can be changed)
   const register = async (name, phone, address) => {
     setLoading(true);
     try {
        const response = await axios.post(`${API_URL}/auth/register`, { name, phone, address });
        setLoading(false);
        return { success: true, message: response.data.message || 'ההרשמה בוצעה בהצלחה!' };
     } catch (error) {
        console.error("Registration failed:", error.response ? error.response.data : error.message);
        setLoading(false);
        return { success: false, message: error.response?.data?.message || 'שגיאה בתהליך ההרשמה' };
     }
   };


  // Logout function
  const logout = (redirect = true) => {
    // Clear state
    setUser(null);
    setToken(null);

    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Remove default auth header
    delete axios.defaults.headers.common['Authorization'];

    // Redirect to home page (optional)
    if (redirect) {
        router.push('/');
    }
  };

  // Value provided to consuming components
  // Value provided to consuming components
  const value = {
    user, token,
    isAuthenticated: !!token,
    isAdmin: user?.isAdmin || false,
    loading,
    login, // Step 1
    verifyAdminPassword, // Step 2 (Admin)
    logout, register
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};
