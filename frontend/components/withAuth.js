// components/withAuth.js
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import Layout from './Layout'; // Optional: Wrap protected pages in Layout

const withAuth = (WrappedComponent) => {
  const Wrapper = (props) => {
    const { isAuthenticated, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      // If auth loading is finished and user is not authenticated, redirect
      if (!loading && !isAuthenticated) {
        // Redirect to login, passing the current path as a query parameter
        // so the login page can redirect back after successful login.
        router.replace(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      }
    }, [loading, isAuthenticated, router]);

    // Show loading state or null while checking auth
    if (loading || !isAuthenticated) {
       return (
        <Layout title="טוען...">
            <div className="text-center py-10">טוען נתונים...</div>
        </Layout>
      );
      // return null;
    }

    // If authenticated, render the wrapped component
    return <WrappedComponent {...props} />;
  };

  Wrapper.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return Wrapper;
};

export default withAuth;
