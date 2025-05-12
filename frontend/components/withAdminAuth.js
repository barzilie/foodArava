// components/withAdminAuth.js
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import Layout from './Layout'; // Optional: Wrap protected pages in Layout

const withAdminAuth = (WrappedComponent) => {
  const Wrapper = (props) => {
    const { isAuthenticated, isAdmin, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      // If auth loading is finished and user is not authenticated or not an admin, redirect
      if (!loading && (!isAuthenticated || !isAdmin)) {
        router.replace('/login?error=Admin%20access%20required'); // Redirect to login
      }
    }, [loading, isAuthenticated, isAdmin, router]);

    // Show loading state or null while checking auth
    if (loading || !isAuthenticated || !isAdmin) {
      return (
        <Layout title="טוען...">
            <div className="text-center py-10">בודק הרשאות...</div>
        </Layout>
      );
      // Alternatively return null or a loading spinner component
      // return null;
    }

    // If authenticated and admin, render the wrapped component
    return <WrappedComponent {...props} />;
  };

  // Set display name for easier debugging
  Wrapper.displayName = `withAdminAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return Wrapper;
};

export default withAdminAuth;
