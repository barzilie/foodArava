// pages/_app.js
import '../styles/globals.css'; // Import global styles
import { AuthProvider } from '../context/AuthContext'; // AuthProvider
import { BasketProvider } from '../context/BasketContext'; // BasketProvider



function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      {/* Wrap with BasketProvider INSIDE AuthProvider */}
      <BasketProvider>
        <Component {...pageProps} />
      </BasketProvider>
    </AuthProvider>
  );
}

export default MyApp;
