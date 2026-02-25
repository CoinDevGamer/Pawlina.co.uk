import React from "react";
import { motion } from "framer-motion";
import ParticleBurst from "./ParticleBurst";
import { full, IMAGE_FALLBACK } from "../lib/api";

export default function ItemCard({ item, onAdd }) {
  const [bursts, setBursts] = React.useState([]);

  const img = full(item.image_url) || IMAGE_FALLBACK;

  // Trigger particle explosion
  const triggerBurst = (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    setBursts((prev) => [...prev, { id: Math.random(), x, y }]);
  };

  const handleAdd = (e) => {
    triggerBurst(e);
    onAdd();
  };

  return (
    <>
      <motion.div
        className="
          group relative overflow-hidden card-surface flex flex-col h-full
        "
        whileHover={{ y: -8 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* IMAGE SECTION */}
        <div
          className="
            relative w-full aspect-[4/3]
            overflow-hidden
            bg-brand-50 
            flex items-center justify-center p-6
          "
        >
          <img
            src={img}
            alt={item.name}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = IMAGE_FALLBACK;
            }}
            className="
              max-w-full max-h-full object-contain
              transition-transform duration-700 ease-out
              group-hover:scale-110
              drop-shadow-sm
            "
          />

          {item.special_offer === 1 && (
            <div
              className="
                absolute top-4 left-4 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase
                bg-brand-400 text-white shadow-soft
                animate-pulse-slow
              "
            >
              ⭐ Special
            </div>
          )}

          <div
            className={`
              absolute top-4 right-4 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase shadow-soft border
              ${
                item.in_stock
                  ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                  : "bg-red-50 border-red-100 text-red-600"
              }
            `}
          >
            {item.in_stock ? "In Stock" : "Out of Stock"}
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-6 flex flex-col flex-1 border-t border-surface-100 bg-white">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h2 className="text-xl font-bold font-heading text-ink leading-tight line-clamp-2">
              {item.name}
            </h2>
            <div className="flex flex-col items-end whitespace-nowrap">
              {item.old_price_cents > 0 ? (
                <>
                  <span className="text-xs font-bold text-ink-muted line-through tracking-wider">
                    WAS £{(item.old_price_cents / 100).toFixed(2)}
                  </span>
                  <span className="text-xl font-extrabold text-brand-600">
                    £{(item.price_cents / 100).toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-xl font-extrabold text-brand-600">
                  £{(item.price_cents / 100).toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-ink-muted line-clamp-2 flex-1 mb-6 leading-relaxed">
            {item.description || "A wonderful addition for your pet's wellness routine."}
          </p>

          {/* BUTTON */}
          <div className="mt-auto">
            <motion.button
              onClick={handleAdd}
              disabled={!item.in_stock}
              whileHover={{ scale: item.in_stock ? 1.02 : 1 }}
              whileTap={{ scale: item.in_stock ? 0.98 : 1 }}
              className="w-full btn-primary disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              Add to Basket
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* PARTICLE EXPLOSIONS */}
      {bursts.map((b) => (
        <ParticleBurst
          key={b.id}
          x={b.x}
          y={b.y}
          onDone={() =>
            setBursts((curr) => curr.filter((x) => x.id !== b.id))
          }
        />
      ))}
    </>
  );
}
