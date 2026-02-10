import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-[#d9c09a] bg-gradient-to-r from-[#f9edd8] via-[#f6e5ca] to-[#f3dfbc]">
      <div className="max-w-6xl mx-auto px-6 py-8 text-[#4b2f1a]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="font-bold">Pawlina's Pet Shop</div>
            <div className="text-sm text-[#6f5337]">
              Natural products for pets, local and online.
            </div>
          </div>
          <nav className="flex flex-wrap gap-3 text-sm">
            <Link className="hover:underline" to="/privacy">Privacy</Link>
            <Link className="hover:underline" to="/terms">Terms</Link>
            <Link className="hover:underline" to="/cookies">Cookies</Link>
            <Link className="hover:underline" to="/returns">Returns</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
