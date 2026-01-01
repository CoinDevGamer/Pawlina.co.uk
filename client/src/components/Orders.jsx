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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* DRAWER */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.35 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[520px] bg-gradient-to-b from-[#fff9f2] to-[#f3dfbe] shadow-2xl z-50 p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-3xl font-extrabold text-[#3b2415] flex items-center gap-2">
                  📦 My Orders
                </div>
                <div className="text-xs text-[#7a6140] mt-1">
                  Beautifully wrapped receipts and delivery snapshots.
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-2xl hover:scale-110 transition"
              >
                ✕
              </button>
            </div>

            {/* SUMMARY STRIP */}
            <div className="rounded-2xl bg-white/80 border border-[#ead6b8] shadow-inner px-4 py-3 mb-4 flex items-center gap-2 text-sm text-[#3b2415]">
              <span className="px-2 py-1 rounded-full bg-[#f6d59b] text-[#2f1f13] font-semibold">
                {orders.length} orders
              </span>
              <span>Recent activity with delivery snapshots</span>
            </div>

            {/* EMPTY STATE */}
            {orders.length === 0 && (
              <div className="text-black/60 text-center py-10 text-lg">
                No orders yet.
              </div>
            )}

            {/* ORDER LIST */}
            <div className="space-y-5">
              {orders.map((o) => (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl p-4 shadow-md border relative overflow-hidden transition ${
                    o.status === "cancelled"
                      ? "opacity-60 bg-gray-200/70"
                      : "bg-white hover:shadow-xl hover:-translate-y-1"
                  }`}
                >
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-transparent via-white/30 to-transparent opacity-40" />

                  {o.status === "cancelled" ? (
                    <div className="absolute top-2 right-2 text-xs bg-red-600 text-white px-2 py-1 rounded-full shadow">
                      Cancelled
                    </div>
                  ) : (
                    <div className="absolute top-2 right-2 text-xs px-2 py-1 rounded-full bg-[#e3f8e1] text-[#166534] border border-[#bbf7d0] shadow">
                      {o.status || "placed"}
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-bold text-lg flex items-center gap-2 text-[#3b2415]">
                        Order #{o.id}
                        <span className="text-xs px-2 py-1 rounded-full bg-[#f6d59b] border border-[#e5cda7] text-[#2f1f13]">
                          {o.delivery_method}
                        </span>
                        {o.admin_status && (
                          <span className="text-xs px-2 py-1 rounded-full bg-[#e3f8e1] text-[#166534] border border-[#bbf7d0]">
                            {o.admin_status}
                          </span>
                        )}
                        {justUpdatedId === o.id && (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-[#dbeafe] text-[#1e3a8a] border border-[#bfdbfe]">
                            Updated
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-black/70">
                        📅 {new Date(o.created_at).toLocaleString()}
                      </div>
                  {o.admin_note && (
                    <div className="mt-1 text-xs text-[#7a6140] bg-[#fff4df] border border-[#ead6b8] rounded-lg px-3 py-2">
                      <div className="font-semibold text-[#3f2817]">Note</div>
                      <div>{o.admin_note}</div>
                    </div>
                  )}
                  {o.delivery_date && (
                    <div className="text-xs text-[#3b2415]">
                      Delivery date: <b>{o.delivery_date}</b>
                    </div>
                  )}

                      {o.address && (
                        <div className="text-xs text-black/70 mt-2 leading-tight">
                          <div className="font-semibold text-[#3b2415]">Delivery snapshot</div>
                          <div>
                            {o.address.name || ""} • {o.address.address_line1 || ""}{" "}
                            {o.address.address_line2 || ""}, {o.address.city || ""},{" "}
                            {o.address.postcode || ""}, {o.address.country || ""}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <ul className="mt-3 border-t pt-3 border-black/10 space-y-1 text-sm">
                    {o.items.map((i, idx) => (
                      <li key={idx} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span>🐾</span>
                          {i.qty} × {i.name}
                        </div>
                        {i.price_cents ? (
                          <span className="text-xs text-[#3b2415] font-semibold">
                            £{((i.price_cents * i.qty) / 100).toFixed(2)}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 text-right font-bold text-lg text-[#3b2415]">
                    💷 £{(o.total_cents / 100).toFixed(2)}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
