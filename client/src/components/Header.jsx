import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Catalog, publicUrl } from "../lib/api";

export default function Header({ user, onOrders, onBasket, onAccount }) {
  const [speciesList, setSpeciesList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [navLoading, setNavLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const reduceMotion = useReducedMotion();

  const particles = useMemo(
    () =>
      Array.from({ length: 18 }).map(() => ({
        size: Math.random() * 8 + 4,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        duration: 6 + Math.random() * 6,
        delay: Math.random() * 2,
      })),
    []
  );

  useEffect(() => {
    let alive = true;
    Promise.all([Catalog.species(), Catalog.categories()])
      .then(([species, cats]) => {
        if (!alive) return;
        setSpeciesList(species);
        setCategories(cats);
      })
      .catch(() => {})
      .finally(() => {
        if (!alive) return;
        setNavLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setShowParticles(mq.matches);
    update();
    if (mq.addEventListener) {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);

  const getCatsFor = (slug) =>
    categories.filter((c) => c.species === slug || c.species == null);

  return (
    <header
      className="
        sticky top-0 z-50
        bg-white/90 backdrop-blur-xl border-b border-surface-200
        shadow-soft
      "
    >
      {/* PARTICLES */}
      {showParticles && !reduceMotion && (
        <div className="absolute inset-0 -z-10 pointer-events-none">
          {particles.map((p, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-brand-400"
              style={{
                width: p.size,
                height: p.size,
                top: p.top,
                left: p.left,
                opacity: 0.1,
                filter: "blur(2px)",
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.05, 0.2, 0.05],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">

        {/* BRAND LEFT */}
        <motion.div
          className="flex items-center gap-4 cursor-pointer shrink-0"
          whileHover={{ y: -2 }}
        >
          <motion.div
            className="w-12 h-12 rounded-2xl border bg-white border-surface-200 shadow-sm overflow-hidden flex items-center justify-center"
            whileHover={{ rotate: 5, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <img
              src={publicUrl("/images/pawlina-logo.png")}
              alt="Pawlina’s Pet Shop"
              className="w-[85%] h-[85%] object-contain scale-[1.1]"
            />
          </motion.div>

          <div className="flex flex-col leading-tight select-none mt-0.5">
            <span className="text-2xl font-black font-heading tracking-tight text-ink">
              Pawlina's
            </span>
            <span className="text-xs font-medium tracking-widest uppercase text-brand-600">
              Pet Shop
            </span>
          </div>
        </motion.div>

        {/* NAV */}
        <nav className="hidden md:flex items-center gap-2 flex-wrap text-sm font-semibold text-ink-muted">
          <GoldBtn to="/">Home</GoldBtn>

          {navLoading && (
            <div className="flex items-center gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="h-10 w-24 rounded-xl bg-surface-100 border border-surface-200 animate-pulse"
                />
              ))}
            </div>
          )}

          {speciesList.map((s) => (
            <div key={s.slug} className="relative">
              <button
                onClick={() =>
                  setOpenMenu(openMenu === s.slug ? null : s.slug)
                }
                className="px-5 py-2.5 rounded-xl hover:bg-surface-100 hover:text-ink transition-colors flex items-center justify-center gap-2 relative overflow-hidden focus:outline-none"
              >
                <span className="relative z-10 flex items-center gap-2 leading-none font-medium">
                  {s.icon} {s.label}
                  <svg className={`w-3.5 h-3.5 transition-transform opacity-60 ${openMenu === s.slug ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>

              {/* DROPDOWN */}
              <AnimatePresence>
                {openMenu === s.slug && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.98, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: 8, scale: 0.98, filter: "blur(4px)" }}
                    transition={{ duration: 0.2 }}
                    className="
                      absolute left-0 mt-3 w-64
                      bg-white
                      border border-surface-200 shadow-float rounded-[1.5rem] p-3 z-[999]
                    "
                  >
                    <div className="text-ink font-bold pb-3 pt-2 px-3 border-b border-surface-100 uppercase tracking-widest text-xs">
                      Shop {s.label}
                    </div>

                    <div className="flex flex-col gap-1 mt-2">
                      {getCatsFor(s.slug).map((cat) => (
                        <Link
                          key={cat.id}
                          to={`/${s.slug}/${cat.slug}`} 
                          className="px-4 py-3 rounded-xl hover:bg-surface-50 hover:text-brand-700
                                     transition-colors text-ink font-medium flex items-center gap-3"
                          onClick={() => setOpenMenu(null)}
                        >
                          <span className="text-xl">🐾</span> {cat.name}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {user?.role === "admin" && <GoldBtn to="/admin">Admin</GoldBtn>}
        </nav>

        {/* ACTIONS RIGHT */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <RoundGoldBtn icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>} onClick={onOrders} />
          <RoundGoldBtn icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} onClick={onBasket} />
          <RoundGoldBtn icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} onClick={onAccount} />
        </div>

        {/* MOBILE ICON */}
        <motion.button
          onClick={() => setMobileOpen(!mobileOpen)}
          whileTap={{ scale: 0.9 }}
          className="md:hidden p-3 text-ink bg-surface-50 rounded-xl"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </motion.button>
      </div>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-white px-6 pb-6 text-ink border-t border-surface-200 shadow-soft overflow-hidden"
          >
            <div className="mt-4 space-y-2 font-medium">
              <MobileLink to="/" label="Home" closeMenu={() => setMobileOpen(false)} />

              {speciesList.map((s) => (
                <div key={s.slug} className="pt-4 border-t border-surface-100 mt-2">
                  <div className="text-sm uppercase tracking-widest text-brand-600 font-bold mb-3 pl-2">{s.icon} {s.label}</div>

                  <div className="grid grid-cols-2 gap-2">
                    {getCatsFor(s.slug).map((cat) => (
                      <MobileLink
                        key={cat.id}
                        to={`/${s.slug}/${cat.slug}`} 
                        label={cat.name}
                        closeMenu={() => setMobileOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              <div className="h-[1px] bg-surface-200 my-6"></div>

              <div className="grid grid-cols-2 gap-2">
                <MobileLink label="Orders" click={onOrders} closeMenu={() => setMobileOpen(false)} />
                <MobileLink label="Basket" click={onBasket} closeMenu={() => setMobileOpen(false)} />
                <MobileLink label="Account" click={onAccount} closeMenu={() => setMobileOpen(false)} />

                {user?.role === "admin" && (
                  <MobileLink to="/admin" label="Admin" closeMenu={() => setMobileOpen(false)} />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ----------------------------------------------------------- */
/* COMPONENTS */
/* ----------------------------------------------------------- */

function GoldBtn({ to, children }) {
  return (
    <Link
      to={to}
      className="px-5 py-2.5 rounded-xl hover:bg-surface-100 transition-colors font-medium flex items-center justify-center text-ink"
    >
      <span className="relative z-10 leading-none">{children}</span>
    </Link>
  );
}

function RoundGoldBtn({ icon, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="w-11 h-11 rounded-[14px] bg-surface-50 border border-surface-200 text-ink hover:text-brand-600 hover:bg-white hover:border-brand-200 shadow-sm transition-colors flex items-center justify-center"
    >
      {icon}
    </motion.button>
  );
}

function MobileLink({ to, label, click, closeMenu }) {
  const Element = to ? Link : "button";
  return (
    <Element
      to={to}
      onClick={() => {
        if (click) click();
        if (closeMenu) closeMenu();
      }}
      className="block w-full text-left px-4 py-3 rounded-lg bg-[#5f3a20] hover:bg-[#7a4a29] transition-all shadow-sm mb-2"
    >
      {label}
    </Element>
  );
}
