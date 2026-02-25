import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Checkout } from "../lib/api.js";

export default function CartDrawer({
  open,
  onClose,
  cart,
  setCart,
  totalCents,
  delivery,
  user,
  onRequireAddress,
  setDelivery,
  push,
}) {
  const MAX_ITEM_QTY = 10;

  const updateQty = (id, d) =>
    setCart((c) =>
      c.map((x) => {
        if (x.id !== id) return x;
        const nextQty = Math.max(1, Math.min(MAX_ITEM_QTY, x.qty + d));
        if (d > 0 && x.qty >= MAX_ITEM_QTY) {
          push(`⚠️ Max quantity per item is ${MAX_ITEM_QTY}.`);
        }
        return { ...x, qty: nextQty };
      })
    );

  const remove = (id) => setCart((c) => c.filter((x) => x.id !== id));

  const handleCheckout = async () => {
    if (!user) {
      push("⚠️ Please sign in before placing an order.");
      onRequireAddress();
      return;
    }

    const { name, address_line1, city, postcode, country } = user || {};

    if (!name || !address_line1 || !city || !postcode || !country) {
      push("⚠️ Please complete your address first.");
      onRequireAddress();
      return;
    }

    if (delivery === "deliver" && totalCents < 2000) {
      push("⚠️ Delivery requires a minimum order of £20.");
      return;
    }

    try {
      const safeCart = cart.map((i) => ({
        ...i,
        qty: Math.max(1, Math.min(MAX_ITEM_QTY, Number(i.qty) || 1)),
      }));

      const snapshotItems = safeCart.map((i) => ({
        id: i.id,
        name: i.name,
        price_cents: i.price_cents,
        qty: i.qty,
      }));

      const pending = {
        items: snapshotItems,
        delivery_method: delivery,
        total_cents: totalCents,
        created_at: Date.now(),
      };

      const stripeItems = safeCart.map((i) => ({
        id: i.id,
        qty: i.qty,
      }));

      const session = await Checkout.createSession({
        items: stripeItems,
        delivery_method: delivery,
      });

      localStorage.setItem(
        "pendingOrder",
        JSON.stringify({
          ...pending,
          stripe_session_id: session?.session_id || "",
        })
      );

      if (session?.url) {
        window.location.href = session.url;
      } else {
        push("❌ Checkout failed. Try again.");
      }
    } catch (err) {
      console.error("Checkout error:", {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
      });
      push(
        err.response?.data?.error ||
          "❌ Could not create checkout session."
      );
    }
  };

  const checkoutDisabled = (delivery === "deliver" && totalCents < 2000) || cart.length === 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[9998]"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%", opacity: 0, scale: 0.95 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-[100dvh] w-full sm:w-[500px] bg-surface-50 shadow-[-20px_0_40px_rgba(44,37,32,0.1)] z-[10000] flex flex-col overflow-hidden"
          >
            {/* HEADER */}
            <div className="flex items-center justify-between px-8 py-6 bg-white border-b border-surface-200 sticky top-0 z-10">
              <div className="text-3xl font-black font-heading tracking-tight text-ink flex items-center gap-3">
                <span className="text-3xl">🛒</span> Your Basket
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-surface-200 text-ink hover:text-brand-600 hover:bg-brand-50 hover:border-brand-200 transition-colors shadow-sm"
              >
                ✕
              </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <div className="space-y-4">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center bg-white rounded-3xl border border-surface-200 p-8 shadow-sm">
                    <div className="text-4xl opacity-50 mb-4">🛒</div>
                    <div className="text-xl font-bold font-heading text-ink">Your basket is empty</div>
                    <p className="text-ink-muted text-sm mt-2">Looks like you haven't added anything yet.</p>
                  </div>
                ) : (
                  cart.map((i, index) => (
                    <motion.div
                      key={i.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: index * 0.05, type: "spring", stiffness: 300 }}
                      className="card-surface p-5 flex flex-col relative group"
                    >
                      <button
                        onClick={() => remove(i.id)}
                        className="absolute top-4 right-4 text-ink-muted hover:text-red-500 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50"
                      >
                        ✕
                      </button>

                      <div className="font-bold text-lg font-heading text-ink tracking-tight pr-10">
                        {i.name}
                      </div>

                      <div className="flex items-center justify-between mt-6">
                        <div className="flex items-center gap-3 bg-surface-50 border border-surface-200 rounded-xl p-1">
                          <button
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white text-ink shadow-sm hover:text-brand-600 border border-surface-100 transition-colors"
                            onClick={() => updateQty(i.id, -1)}
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-bold text-ink">
                            {i.qty}
                          </span>
                          <button
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white text-ink shadow-sm hover:text-brand-600 border border-surface-100 transition-colors"
                            onClick={() => updateQty(i.id, 1)}
                          >
                            +
                          </button>
                        </div>

                        <div className="font-black text-xl text-brand-600">
                          £{((i.price_cents * i.qty) / 100).toFixed(2)}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* FOOTER - DELIVERY & CHECKOUT */}
            <div className="bg-white border-t border-surface-200 p-6 md:p-8 space-y-6 shadow-[0_-10px_30px_rgba(44,37,32,0.05)] sticky bottom-0 z-20">
              
              <div>
                <div className="text-[11px] font-bold tracking-widest uppercase text-brand-600 mb-3 ml-1">
                  Delivery Method
                </div>
                <div className="relative flex bg-surface-50 rounded-2xl p-1.5 border border-surface-200 shadow-inner">
                  <motion.div
                    className="absolute top-[6px] bottom-[6px] w-[calc(50%-6px)] rounded-xl bg-white shadow-sm border border-surface-100"
                    animate={{ x: delivery === "collect" ? 0 : "100%" }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />

                  <button
                    onClick={() => setDelivery("collect")}
                    className={`relative z-10 flex-1 py-3 text-center font-bold text-sm transition-colors ${
                      delivery === "collect" ? "text-ink" : "text-ink-muted hover:text-ink/70"
                    }`}
                  >
                    🏪 Collect in store
                  </button>

                  <button
                    onClick={() => setDelivery("deliver")}
                    className={`relative z-10 flex-1 py-3 text-center font-bold text-sm transition-colors ${
                      delivery === "deliver" ? "text-ink" : "text-ink-muted hover:text-ink/70"
                    }`}
                  >
                    🚚 Local Delivery
                  </button>
                </div>

                <AnimatePresence>
                  {delivery === "deliver" && totalCents < 2000 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="text-red-600 text-[13px] font-medium bg-red-50 rounded-xl px-4 py-3 border border-red-100"
                    >
                      ⚠️ Delivery requires a minimum order of <b>£20</b>.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="pt-2 border-t border-surface-100">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-ink-muted font-medium">Subtotal</span>
                  <span className="text-3xl font-black font-heading text-ink">
                    £{(totalCents / 100).toFixed(2)}
                  </span>
                </div>

                <motion.button
                  disabled={checkoutDisabled}
                  onClick={handleCheckout}
                  whileHover={!checkoutDisabled ? { scale: 1.02 } : {}}
                  whileTap={!checkoutDisabled ? { scale: 0.98 } : {}}
                  className={`w-full py-4 text-lg btn-primary ${checkoutDisabled ? "opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-float shadow-soft bg-surface-200 border-surface-300 text-ink-muted" : "shadow-float"}`}
                  style={checkoutDisabled ? { background: "none" } : {}}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Checkout securely 🔒
                  </span>
                </motion.button>
              </div>
            </div>
            
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
