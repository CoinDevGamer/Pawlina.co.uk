import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Orders as OrdersApi } from "../lib/api";

export default function Orders({ open, onClose }) {
  const [orders, setOrders] = useState([]);
  const [justUpdatedId, setJustUpdatedId] = useState(null);

  // Fetch orders when opened
  useEffect(() => {
    if (open) {
      OrdersApi.list()
        .then((data) => {
          const parsed = data.map((o) => ({
            ...o,
            items: o.items_json ? JSON.parse(o.items_json) : [],
            address: o.address_json ? JSON.parse(o.address_json) : {},
          }));
          setOrders(parsed);
          if (parsed.length > 0) {
            setJustUpdatedId(parsed[0].id);
          }
        })
        .catch(() => setOrders([]));
    }
  }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* DARK BACKDROP */}
          <motion.div
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[9998]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* DRAWER */}
          <motion.div
            initial={{ x: "100%", opacity: 0, scale: 0.95 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-[100dvh] w-full sm:w-[540px] bg-surface-50 shadow-[-20px_0_40px_rgba(44,37,32,0.1)] z-[10000] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="flex items-center justify-between px-8 py-6 bg-white border-b border-surface-200 sticky top-0 z-10">
              <div>
                <div className="text-3xl font-black font-heading tracking-tight text-ink flex items-center gap-3">
                  <span className="text-3xl">📦</span> My Orders
                </div>
                <div className="text-[11px] font-bold tracking-widest uppercase text-ink-muted mt-2">
                  Beautifully wrapped receipts
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-surface-200 text-ink hover:text-brand-600 hover:bg-brand-50 hover:border-brand-200 transition-colors shadow-sm"
              >
                ✕
              </button>
            </div>


            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-6">
              {/* SUMMARY STRIP */}
              <div className="rounded-2xl bg-white border border-surface-200 shadow-soft px-5 py-4 flex items-center gap-4 text-sm font-medium text-ink">
                <span className="px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 font-bold border border-brand-100">
                  {orders.length} orders
                </span>
                <span className="text-ink-muted">Recent activity and digital receipts</span>
              </div>

              {/* EMPTY STATE */}
              {orders.length === 0 && (
                <div className="card-surface flex flex-col items-center justify-center h-48 text-center bg-white p-8">
                  <div className="text-4xl opacity-50 mb-4">📦</div>
                  <div className="text-xl font-bold font-heading text-ink">No orders yet</div>
                  <p className="text-ink-muted text-sm mt-2">When you place an order, it will appear here.</p>
                </div>
              )}

              {/* ORDER LIST */}
              <div className="space-y-6">
                {orders.map((o, index) => (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.05, type: "spring", stiffness: 300 }}
                    className={`card-surface p-6 relative group ${
                      o.status === "cancelled"
                        ? "opacity-60 grayscale-[0.5]"
                        : "bg-white"
                    }`}
                  >

                    {o.status === "cancelled" ? (
                      <div className="absolute top-5 right-5 text-[10px] font-bold tracking-widest uppercase bg-red-50 text-red-600 px-3 py-1.5 rounded-full border border-red-100 shadow-sm">
                        Cancelled
                      </div>
                    ) : (
                      <div className="absolute top-5 right-5 text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                        {o.status || "placed"}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="font-black text-xl font-heading text-ink flex items-center gap-3">
                        Order #{o.id}
                        <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-surface-100 border border-surface-200 text-ink-muted">
                          {o.delivery_method}
                        </span>
                        {o.admin_status && (
                          <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-brand-50 text-brand-600 border border-brand-100">
                            {o.admin_status}
                          </span>
                        )}
                        {justUpdatedId === o.id && (
                          <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                            Updated
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-ink-muted">
                        📅 {new Date(o.created_at).toLocaleString()}
                      </div>
                      
                      {o.admin_note && (
                        <div className="mt-3 text-sm text-brand-800 bg-brand-50 border border-brand-100 rounded-xl px-4 py-3">
                          <div className="font-bold mb-1 uppercase tracking-widest text-[10px]">Shop Note</div>
                          <div className="leading-relaxed">{o.admin_note}</div>
                        </div>
                      )}
                      
                      {o.delivery_date && (
                        <div className="text-sm font-medium text-ink mt-2">
                          Collection/Delivery on: <strong className="text-brand-600">{o.delivery_date}</strong>
                        </div>
                      )}

                      {o.address && Object.keys(o.address).length > 0 && (
                         <div className="mt-4 pt-4 border-t border-surface-100 text-sm">
                           <div className="font-bold text-[11px] uppercase tracking-widest text-ink-muted mb-2">Delivery Snapshot</div>
                           <div className="text-ink leading-relaxed font-medium">
                             {o.address.name || ""} <br />
                             <span className="text-ink-muted">
                               {o.address.address_line1 || ""} {o.address.address_line2 || ""}, {o.address.city || ""}, {o.address.postcode || ""}, {o.address.country || ""}
                             </span>
                           </div>
                         </div>
                      )}
                    </div>

                    <div className="mt-6 border-t border-surface-200 pt-5">
                      <div className="font-bold text-[11px] uppercase tracking-widest text-ink-muted mb-3">Items</div>
                      <ul className="space-y-3">
                         {o.items.map((i, idx) => (
                           <li key={idx} className="flex items-center justify-between gap-4 text-sm font-medium">
                             <div className="flex items-center gap-3">
                               <span className="w-6 h-6 rounded-md bg-surface-100 flex items-center justify-center text-xs">🐾</span>
                               <span className="font-bold text-ink">{i.qty}×</span> 
                               <span className="text-ink-muted">{i.name}</span>
                             </div>
                             {i.price_cents ? (
                               <span className="font-bold text-ink whitespace-nowrap">
                                 £{((i.price_cents * i.qty) / 100).toFixed(2)}
                               </span>
                             ) : null}
                           </li>
                         ))}
                      </ul>
                    </div>

                    <div className="mt-6 pt-5 flex items-center justify-between border-t border-surface-200">
                       <span className="text-sm font-bold uppercase tracking-widest text-ink-muted">Total Paid</span>
                       <div className="font-black text-2xl text-brand-600">
                         £{(o.total_cents / 100).toFixed(2)}
                       </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
