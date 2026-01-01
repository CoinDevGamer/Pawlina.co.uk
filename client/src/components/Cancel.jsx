import React from "react";
import { motion } from "framer-motion";

export default function Cancel() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f9ecce] via-[#f6e3bf] to-[#f3d7a6] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 140, damping: 16 }}
        className="max-w-xl w-full bg-white/95 border border-[#ead6b8] rounded-3xl shadow-2xl p-8 text-center space-y-4"
      >
        <div className="text-5xl">⚠️</div>
        <div className="text-2xl font-black text-[#3b2415]">Payment cancelled</div>
        <p className="text-[#5a4535] text-sm">
          Your payment didn’t complete. No charges were made. You can revisit your basket and try again when ready.
        </p>
        <div className="flex justify-center gap-3">
          <a
            href="/"
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#f9d99b] to-[#e4b96e] text-[#2f1f13] font-semibold shadow-md hover:shadow-lg transition"
          >
            Back to shop
          </a>
          <a
            href="/"
            className="px-5 py-2 rounded-xl border border-[#e5d4b5] text-[#3f2817] bg-white hover:bg-[#fff6e5] transition"
          >
            View basket
          </a>
        </div>
      </motion.div>
    </div>
  );
}
