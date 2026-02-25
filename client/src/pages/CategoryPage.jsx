import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Catalog } from "../lib/api";
import { motion } from "framer-motion";
import ItemCard from "../components/ItemCard.jsx";

// Turn slug into readable text
const pretty = (s) =>
  s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Species normalization
const SPECIES_MAP = {
  dogs: "dog",
  dog: "dog",
  cats: "cat",
  cat: "cat",
  birds: "bird",
  bird: "bird",
  "small-pets": "small-pets",
  "small pets": "small-pets",
  smallpets: "small-pets",
};

export default function CategoryPage() {
  const { species, category: slug } = useParams();
  const speciesSlug = SPECIES_MAP[species?.toLowerCase()] || species;

  const categoryTitle = pretty(slug);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const list = await Catalog.items({
          species: speciesSlug,
          category: slug,
          sort: "new",
        });

        if (active) {
          setItems(list);
          setLoading(false);
        }
      } catch (err) {
        console.error("❌ Failed to load items:", err);
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [speciesSlug, slug]);

  return (
    <div className="min-h-[80vh] bg-surface-50 pb-24">
      <div className="bg-white border-b border-surface-200 shadow-soft mb-12">
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-16 mt-[-1px]">
          <div className="inline-flex flex-col items-start gap-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-100 border border-surface-200 text-[11px] font-bold tracking-widest uppercase text-brand-600"
            >
              {species.toUpperCase()} Collection
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-black font-heading text-ink"
            >
              {categoryTitle}
            </motion.h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card-surface p-6 h-[420px] animate-pulse-slow">
                <div className="w-full h-48 bg-surface-100 rounded-2xl mb-6"></div>
                <div className="w-3/4 h-6 bg-surface-100 rounded mb-4"></div>
                <div className="w-1/2 h-5 bg-surface-100 rounded mb-6"></div>
                <div className="w-full h-12 bg-surface-100 rounded-2xl mt-auto"></div>
              </div>
            ))}
          </div>
        ) : items.length ? (
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
          >
            {items.map((it) => (
              <motion.div 
                key={it.id} 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
                }}
              >
                <ItemCard item={it} onAdd={() => window.addToCart?.(it)} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24 px-6 rounded-[2rem] border border-surface-200 bg-white shadow-soft max-w-2xl mx-auto"
          >
            <div className="text-6xl mb-6">🐾</div>
            <h3 className="text-2xl font-bold font-heading text-ink mb-4">No items found</h3>
            <p className="text-ink-muted leading-relaxed">We're constantly updating our stock. Please check back later or try exploring another category.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
