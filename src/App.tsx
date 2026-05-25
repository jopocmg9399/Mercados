/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "../components/ui/sonner";
import { ThemeProvider } from './context/ThemeContext';
import { CartProvider } from './context/CartContext';
import PlatformHome from './pages/PlatformHome';
import Catalog from './pages/Catalog';
import Dashboard from './pages/Dashboard';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';

export default function App() {
  return (
    <ThemeProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen bg-background text-foreground font-sans antialiased transition-colors duration-300">
            <Routes>
              <Route path="/" element={<PlatformHome />} />
              <Route path="/store/:storeSlug" element={<Catalog />} />
              <Route path="/Cart" element={<Cart />} />
              <Route path="/Checkout" element={<Checkout />} />
              <Route path="/Dashboard/*" element={<Dashboard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster position="top-center" />
          </div>
        </Router>
      </CartProvider>
    </ThemeProvider>
  );
}
