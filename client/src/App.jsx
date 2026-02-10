// src/App.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";

import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import CookieBanner from "./components/CookieBanner.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import AccountDrawer from "./components/AccountDrawer.jsx";
import Orders from "./components/Orders.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import Success from "./components/Success.jsx"; // ✅ use real success component
import Cancel from "./components/Cancel.jsx";

import useToast from "./hooks/useToast.jsx";
import { Auth, Orders as OrdersApi } from "./lib/api";

// Pages
import Home from "./pages/Home.jsx";
import CategoryPage from "./pages/CategoryPage.jsx"; // ✅ NEW DYNAMIC PAGE
import Privacy from "./pages/Privacy.jsx";
import Terms from "./pages/Terms.jsx";
import Cookies from "./pages/Cookies.jsx";
import Returns from "./pages/Returns.jsx";

const MAX_ITEM_QTY = 10;
const sanitizeCart = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((i) => ({
      id: Number(i?.id),
      name: String(i?.name || ""),
      price_cents: Number(i?.price_cents) || 0,
      qty: Math.max(1, Math.min(MAX_ITEM_QTY, Number(i?.qty) || 1)),
    }))
    .filter((i) => Number.isInteger(i.id) && i.id > 0 && i.price_cents >= 0);
};

export default function App() {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState(() => {
    try {
      return sanitizeCart(JSON.parse(localStorage.getItem("cart") || "[]"));
    } catch {
      return [];
    }
  });
  const [delivery, setDelivery] = useState("collect");
  const [showCart, setShowCart] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const { push, Toasts } = useToast();
  const navigate = useNavigate();

  // Load logged-in user
  useEffect(() => {
    if (!user) {
      (async () => {
        try {
          const me = await Auth.me();
          setUser(me);
        } catch {
          setUser(null);
        }
      })();
    }
  }, [user]);

  // Save cart
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  // Add to cart handler
  const addToCart = (it) => {
    if (!it.in_stock) {
      push("⚠️ This item is out of stock.");
      return;
    }
    setCart((c) => {
      const existing = c.find((x) => x.id === it.id);
      if (existing) {
        if (existing.qty >= MAX_ITEM_QTY) {
          push(`⚠️ Max quantity per item is ${MAX_ITEM_QTY}.`);
          return c;
        }
        return c.map((x) =>
          x.id === it.id ? { ...x, qty: x.qty + 1 } : x
        );
      }
      return [
        ...c,
        { id: it.id, name: it.name, price_cents: it.price_cents, qty: 1 },
      ];
    });
    push("✅ Added to basket!");
    setShowCart(true);
  };

  // Expose addToCart globally
  useEffect(() => {
    window.addToCart = addToCart;
    return () => delete window.addToCart;
  }, [cart]);

  // Basket total
  const totalCents = useMemo(
    () => cart.reduce((s, i) => s + i.price_cents * i.qty, 0),
    [cart]
  );

  // Checkout (manual / non-Stripe path – kept as-is)
  const placeOrder = async () => {
    try {
      if (cart.length === 0) {
        push("🛒 Your basket is empty.");
        return;
      }

      if (!user) {
        push("⚠️ Please sign in to place an order.");
        setShowAccount(true);
        return;
      }

      const { address_line1, city, postcode, country, name } = user || {};
      if (!name || !address_line1 || !city || !postcode || !country) {
        push("⚠️ Please complete your address.");
        setShowAccount(true);
        return;
      }

      if (delivery === "deliver" && totalCents < 2000) {
        push("⚠️ Delivery requires a minimum of £20.");
        return;
      }

      await OrdersApi.create({
        items: cart,
        total_cents: totalCents,
        delivery_method: delivery,
      });

      push("✅ Order placed successfully!");
      setCart([]);
      setShowCart(false);
    } catch (e) {
      push("❌ Failed to place order.");
    }
  };

  // Login
  const onLogin = async (payload, isRegister) => {
    try {
      if (isRegister) await Auth.register(payload);
      else await Auth.login(payload);

      setUser(await Auth.me());
      push("✅ Welcome!");
    } catch (e) {
      push(e?.response?.data?.error || "Auth error");
    }
  };

  // Logout
  const onLogout = async () => {
    await Auth.logout();
    setUser(null);
    push("👋 Logged out");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Header
        user={user}
        onOrders={() => setShowOrders(true)}
        onBasket={() => setShowCart(true)}
        onAccount={() => setShowAccount(true)}
      />

      {/* Routes */}
      <main className="flex-1">
        <Routes>
          {/* Home */}
          <Route path="/" element={<Home />} />

          {/* ⭐ UNIVERSAL DYNAMIC ROUTE */}
          <Route path="/:species/:category" element={<CategoryPage />} />

          {/* Admin Panel */}
          <Route
            path="/admin"
            element={
              user?.role === "admin" ? (
                <AdminPanel />
              ) : (
                <div className="p-10 text-center text-red-600 text-xl">
                  Admin only. Please log in.
                </div>
              )
            }
          />

          {/* Stripe result pages */}
          <Route path="/success" element={<Success />} />
          <Route path="/cancel" element={<Cancel />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="/returns" element={<Returns />} />

        </Routes>
      </main>
      <Footer />

      {/* Drawers */}
      <CartDrawer
        open={showCart}
        onClose={() => setShowCart(false)}
        cart={cart}
        setCart={setCart}
        totalCents={totalCents}
        onCheckout={placeOrder}
        setDelivery={setDelivery} 
        delivery={delivery}
        user={user}
        onRequireAddress={() => setShowAccount(true)}
        push={push}
      />
      <AccountDrawer
        open={showAccount}
        onClose={() => setShowAccount(false)}
        user={user}
        setUser={setUser}
        onLogin={onLogin}
        onLogout={onLogout}
      />

      <Orders open={showOrders} onClose={() => setShowOrders(false)} />
      <CookieBanner />

      {/* Toasts */}
      <Toasts />
    </div>
  );
}
