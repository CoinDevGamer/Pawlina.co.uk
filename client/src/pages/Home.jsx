import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import CinematicStarRating from "../components/CinematicStarRating";

const pawBlur = (
  <div className="pointer-events-none absolute inset-0 opacity-40">
    <div className="absolute -top-10 -left-10 w-96 h-96 bg-brand-300 blur-[100px] rounded-full mix-blend-screen" />
    <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-200 blur-[100px] rounded-full mix-blend-screen" />
  </div>
);

// We define highly springy animation variants
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 }
  }
};

const popIn = {
  hidden: { opacity: 0, y: 80, scale: 0.9, rotateX: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    rotateX: 0, 
    transition: { type: "spring", stiffness: 180, damping: 20, mass: 1 } 
  }
};

const card3DHover = {
  rest: { scale: 1, rotateX: 0, rotateY: 0, y: 0, z: 0, boxShadow: "0 4px 20px -2px rgba(94, 84, 74, 0.05)" },
  hover: { 
    scale: 1.02, 
    rotateX: 3, 
    rotateY: -3, 
    y: -10, 
    z: 40,
    boxShadow: "0 25px 50px -12px rgba(94, 84, 74, 0.2), 0 10px 25px -5px rgba(94, 84, 74, 0.1)",
    transition: { type: "spring", stiffness: 400, damping: 20 }
  }
};

export default function Home() {
  const { scrollYProgress } = useScroll();
  const yParallax = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const opacityFade = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div className="w-full bg-surface-50 overflow-hidden" style={{ perspective: "1000px" }}>
      {/* HERO */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center perspective-[1200px]">
        <motion.div style={{ y: yParallax, opacity: opacityFade }} className="absolute inset-0 bg-ink z-0">
          {pawBlur}
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,rgba(223,162,51,0.2),transparent_45%),radial-gradient(circle_at_80%_60%,rgba(214,181,123,0.15),transparent_40%)]" />
        </motion.div>
        
        <div className="max-w-7xl mx-auto px-6 py-20 relative z-10 flex flex-col md:flex-row md:items-center gap-16 w-full">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex-1 space-y-8 text-white preserve-3d"
          >
            <motion.div variants={popIn} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-widest text-brand-200 shadow-glow">
              🐾 Natural • Local • Loved
            </motion.div>
            <motion.h1 variants={popIn} className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight text-white drop-shadow-2xl">
              Nourish Your Pets
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-brand-200 via-brand-300 to-brand-500 pb-2">
                With Honest Goodness
              </span>
            </motion.h1>
            <motion.p variants={popIn} className="text-lg md:text-xl text-white/80 max-w-2xl font-light leading-relaxed drop-shadow-md">
              Craft snacks, chews, and supplements that keep tails wagging. Trusted by the
              Grange-over-Sands community for freshness, care, and sparkle.
            </motion.p>
            <motion.div variants={popIn} className="pt-4 flex flex-wrap gap-4 text-sm text-white/90">
              <div className="px-5 py-3 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-lg shadow-float flex items-center gap-2">
                <span className="text-brand-300 text-lg">★</span> 4.9 Google Rated
              </div>
              <div className="px-5 py-3 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-lg shadow-float flex items-center gap-2">
                <span className="text-brand-300 text-lg">🌿</span> Freshly Sourced
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 100, rotateY: 20, z: -100 }}
            animate={{ opacity: 1, x: 0, rotateY: -5, z: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.3 }}
            whileHover={{ rotateY: 0, scale: 1.05, z: 50 }}
            className="flex-1 w-full max-w-md mx-auto md:ml-auto perspective-[1000px] transform-style-3d cursor-pointer"
          >
            <div className="relative rounded-[2rem] bg-white/10 border border-white/20 backdrop-blur-2xl p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] transform translate-z-[50px]">
              <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-brand-300/30 to-transparent blur-2xl -z-10" />
              <div className="text-white text-3xl font-heading font-bold mb-6 drop-shadow-lg">Loved by pet parents</div>
              <CinematicStarRating value={5} size={32} />
              <p className="text-white/90 text-xl leading-relaxed mt-6 italic font-light drop-shadow-md">
                “These treats are our go-to. The dogs dance when Pawlina arrives, and customer care is
                incredible.”
              </p>
              <div className="text-brand-300 font-medium text-sm mt-8 flex items-center gap-3">
                <div className="w-10 h-[2px] bg-brand-400/80 rounded-full" />
                Local customer, Grange-over-Sands
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* PROMO STRIP (Marquee effect style) */}
      <section className="bg-surface-100 border-b border-surface-200 py-6 overflow-hidden relative shadow-inner">
        <div className="absolute inset-0 bg-gradient-to-r from-surface-100 via-transparent to-surface-100 z-10 pointer-events-none" />
        <motion.div 
          animate={{ x: [0, -1000] }} 
          transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
          className="flex items-center gap-16 text-ink-muted text-base font-semibold whitespace-nowrap px-8"
        >
          {Array.from({length: 4}).map((_, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-3"><span className="text-brand-600 text-xl">🐾</span> 100% Natural ingredients</div>
              <div className="flex items-center gap-3"><span className="text-brand-600 text-xl">🚚</span> Local delivery & collect</div>
              <div className="flex items-center gap-3"><span className="text-brand-600 text-xl">💛</span> Loved by locals</div>
              <div className="flex items-center gap-3"><span className="text-brand-600 text-xl">✨</span> Special offers weekly</div>
            </React.Fragment>
          ))}
        </motion.div>
      </section>

      {/* SIGNATURE EXPERIENCE */}
      <section className="max-w-7xl mx-auto px-6 py-32 space-y-16">
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8"
        >
          <div className="max-w-3xl">
            <motion.div variants={popIn} className="text-sm uppercase tracking-[0.2em] text-brand-600 font-black mb-4 flex items-center gap-3">
              <span className="w-8 h-[2px] bg-brand-600"></span> Signature experience
            </motion.div>
            <motion.h3 variants={popIn} className="text-5xl md:text-6xl font-heading font-black text-ink leading-[1.1]">
              A joyful ritual for you and your pet
            </motion.h3>
            <motion.p variants={popIn} className="text-ink-muted text-xl mt-6 leading-relaxed max-w-2xl font-light">
              Unwrap a box that feels crafted, from the scent of fresh chews to the sparkle of healthy coats.
            </motion.p>
          </div>
          <motion.div variants={popIn} className="flex flex-wrap gap-4 text-sm font-bold">
            <span className="badge-modern px-4 py-2 text-sm shadow-sm backdrop-blur-md">✨ Curated by species</span>
            <span className="badge-modern px-4 py-2 text-sm shadow-sm backdrop-blur-md">🌿 Gentle ingredients</span>
            <span className="badge-modern px-4 py-2 text-sm shadow-sm backdrop-blur-md">🧡 Human grade care</span>
          </motion.div>
        </motion.div>
        
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 perspective-[1000px]"
        >
          {[
            { title: "The welcome sniff", desc: "Open a pack and watch tails wag at the aroma of honest meats.", badge: "Scent-first", icon: "👃" },
            { title: "Shine and vitality", desc: "Omega rich oils and gentle supplements that keep coats glossy.", badge: "Glow", icon: "✨" },
            { title: "Easy, every week", desc: "Order, schedule, and repeat with simple re-stocks for your routine.", badge: "Convenient", icon: "⏱" },
          ].map((card, i) => (
            <motion.div
              key={i}
              variants={popIn}
              initial="rest"
              whileHover="hover"
              style={{ transformStyle: "preserve-3d" }}
              className="card-surface p-10 space-y-6 bg-gradient-to-b from-white to-surface-50 border border-brand-100/50"
            >
              <div className="inline-flex items-center gap-3 p-4 rounded-2xl bg-brand-50 text-brand-700 font-bold shadow-sm transform translate-z-[20px]">
                <span className="text-3xl">{card.icon}</span> 
                <span className="text-sm tracking-wide">{card.badge}</span>
              </div>
              <div className="transform translate-z-[30px]">
                <h4 className="text-3xl font-black font-heading text-ink mb-4">{card.title}</h4>
                <p className="text-ink-muted text-lg leading-relaxed">{card.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* TRUST STRIP 3D */}
      <section className="max-w-7xl mx-auto px-6 pb-32">
        <motion.div 
          initial={{ opacity: 0, rotateX: 20, scale: 0.95 }}
          whileInView={{ opacity: 1, rotateX: 0, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ type: "spring", stiffness: 150, damping: 25 }}
          className="relative overflow-hidden rounded-[3rem] bg-ink text-white shadow-[0_40px_80px_-20px_rgba(44,37,32,0.6)] border border-brand-800/50 transform-style-3d perspective-[1000px]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(223,162,51,0.2),transparent_60%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(223,162,51,0.1),transparent_50%)] pointer-events-none" />
          
          <div className="relative p-12 md:p-16 transform translate-z-[40px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
              {[
                { title: "15-mile delivery", desc: "Local drop-offs around Grange-over-Sands.", icon: "📍" },
                { title: "Collect in store", desc: "Order online, pick up when it suits.", icon: "🏪" },
                { title: "Secure payments", desc: "Stripe checkout with trusted protection.", icon: "🔒" },
                { title: "Local & handmade", desc: "Small-batch care, lovingly prepared.", icon: "🧵" },
              ].map((item, i) => (
                <motion.div 
                  key={i} 
                  whileHover={{ scale: 1.05, y: -10 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="space-y-5 cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-3xl backdrop-blur-md border border-white/20 shadow-glow">
                    {item.icon}
                  </div>
                  <div className="text-brand-300 font-heading font-bold tracking-wide text-2xl">
                    {item.title}
                  </div>
                  <div className="text-white/70 text-base leading-relaxed font-light">{item.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* WHY CHOOSE */}
      <section className="max-w-7xl mx-auto px-6 py-32 border-t border-surface-200">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once:true }} transition={{ type:"spring", duration: 1 }}
          className="text-center max-w-3xl mx-auto space-y-6 mb-20"
        >
          <div className="text-sm uppercase tracking-[0.2em] text-brand-600 font-black flex justify-center items-center gap-4">
            <span className="w-8 h-[2px] bg-brand-600"></span> Why Pawlina <span className="w-8 h-[2px] bg-brand-600"></span>
          </div>
          <h2 className="text-5xl md:text-6xl font-black font-heading text-ink drop-shadow-sm">Made with love, served with care</h2>
          <p className="text-ink-muted text-xl leading-relaxed font-light">
            Premium treats, gentle chews, thoughtful supplements curated for happy, healthy pets.
          </p>
        </motion.div>
        
        <motion.div 
           initial="hidden" whileInView="visible" viewport={{ once:true }} variants={staggerContainer}
           className="grid grid-cols-1 md:grid-cols-3 gap-8 perspective-[1000px]"
        >
          {[
            { title: "Local delivery", desc: "Fast drop-offs within 15 miles, or collect in-store.", icon: "🚚", color: "text-blue-500", bg: "bg-blue-50" },
            { title: "Natural ingredients", desc: "Wholesome recipes with no nasties, just goodness.", icon: "🌱", color: "text-emerald-500", bg: "bg-emerald-50" },
            { title: "Loved by locals", desc: "4.9+ ratings and glowing word of mouth in our community.", icon: "💛", color: "text-brand-500", bg: "bg-brand-50" },
          ].map((f, i) => (
            <motion.div
              key={i}
              variants={popIn}
              initial="rest" whileHover="hover"
              style={{ transformStyle: "preserve-3d" }}
              className="card-surface p-10 text-center flex flex-col items-center bg-white"
            >
              <motion.div className={`w-20 h-20 rounded-full ${f.bg} ${f.color} text-4xl flex items-center justify-center mb-8 shadow-inner`}
                style={{ transform: "translateZ(30px)" }}
              >
                {f.icon}
              </motion.div>
              <h4 className="text-3xl font-black font-heading text-ink mb-4 transform translate-z-[20px]">{f.title}</h4>
              <p className="text-ink-muted text-lg leading-relaxed font-light transform translate-z-[10px]">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>
      
       {/* STORE HOURS */}
      <section className="max-w-7xl mx-auto px-6 pb-32">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 100 }}
          className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-brand-50 to-surface-100 border border-brand-100 p-10 md:p-16 shadow-float-lg"
        >
          <div className="pointer-events-none absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-brand-200/50 blur-[120px]" />
          <div className="pointer-events-none absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-brand-300/30 blur-[120px]" />

          <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-16 items-center">
            <motion.div variants={staggerContainer} initial="hidden" whileInView="visible">
              <motion.div variants={popIn} className="inline-flex items-center gap-3 rounded-full border border-brand-200 bg-white/80 backdrop-blur-xl px-5 py-2 text-sm uppercase tracking-widest text-brand-700 font-black shadow-sm">
                <span className="text-xl">🕒</span>
                <span>In-store info</span>
              </motion.div>
              <motion.h3 variants={popIn} className="text-5xl md:text-6xl font-black font-heading text-ink mt-8 leading-[1.1] drop-shadow-sm">
                Opening Hours
              </motion.h3>
              <motion.p variants={popIn} className="text-ink-muted mt-6 text-xl leading-relaxed max-w-md font-light">
                Pop in during these times for advice, collections, and fresh stock. We love meeting your pets!
              </motion.p>
            </motion.div>

            <motion.div 
               initial={{ x: 50, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{once:true}} transition={{type:"spring", damping: 20}}
               className="card-surface p-8 shadow-[0_20px_50px_-15px_rgba(44,37,32,0.1)] w-full bg-white/60 backdrop-blur-2xl border-white/50"
            >
              <div className="space-y-3">
                {[
                  { day: "Monday", time: "Closed", closed: true },
                  { day: "Tuesday", time: "9:30 AM - 4:30 PM", closed: false },
                  { day: "Wednesday", time: "9:30 AM - 4:30 PM", closed: false },
                  { day: "Thursday", time: "9:30 AM - 4:30 PM", closed: false },
                  { day: "Friday", time: "9:30 AM - 4:30 PM", closed: false },
                  { day: "Saturday", time: "9:00 AM - 1:00 PM", closed: false },
                  { day: "Sunday", time: "Closed", closed: true },
                ].map((row, i) => (
                  <motion.div
                    key={row.day}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05, type: "spring", stiffness: 200 }}
                    whileHover={{ scale: 1.02, x: -5, backgroundColor: "rgba(255,255,255,1)" }}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-surface-200 bg-white/60 px-6 py-4 transition-colors shadow-sm cursor-default"
                  >
                    <div className="text-ink font-bold flex items-center gap-6">
                      <span className="w-28 font-heading text-lg">{row.day}</span>
                      <span className="text-ink-muted font-normal text-base">{row.time}</span>
                    </div>
                    <span
                      className={`text-xs uppercase tracking-[0.15em] font-black rounded-full px-4 py-2 ${
                        row.closed
                          ? "bg-red-50 text-red-600 border border-red-100"
                          : "bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm"
                      }`}
                    >
                      {row.closed ? "Closed" : "Open"}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* REVIEWS */}
      <section className="bg-ink py-32 mt-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(223,162,51,0.1),transparent_50%)]" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once:true }} transition={{ type:"spring", duration: 1 }}
            className="text-center max-w-3xl mx-auto space-y-6 mb-20"
          >
            <div className="text-sm uppercase tracking-[0.2em] text-brand-400 font-black flex justify-center items-center gap-4">
               <span className="w-8 h-[2px] bg-brand-400"></span> Reviews <span className="w-8 h-[2px] bg-brand-400"></span>
            </div>
            <h3 className="text-5xl md:text-6xl font-black font-heading text-white">Pet parents can’t stop talking</h3>
          </motion.div>
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once:true }} variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-10 perspective-[1000px]"
          >
            {[
              "Absolutely amazing pet shop with a wide variety for dogs, cats, birds, rabbits, and more. The owner is incredibly friendly and helpful.",
              "A lovely independent shop with a friendly smile and welcome for customers and pets.",
              "Excellent pet shop with a great selection of products and very friendly staff.",
            ].map((quote, i) => (
              <motion.div
                key={i}
                variants={popIn}
                whileHover={{ y: -12, scale: 1.03, rotateZ: i % 2 === 0 ? 1 : -1 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="rounded-[2.5rem] bg-white/5 border border-white/10 p-10 backdrop-blur-lg shadow-2xl relative cursor-pointer"
              >
                <div className="absolute -top-6 -left-6 text-7xl text-brand-400/30 font-serif">"</div>
                <div className="flex text-brand-400 mb-8 text-2xl drop-shadow-md">★★★★★</div>
                <div className="text-xl text-white/90 leading-relaxed font-light mb-8 relative z-10">“{quote}”</div>
                <div className="text-base text-brand-300 font-bold uppercase tracking-widest flex items-center gap-3">
                  <div className="w-6 h-[2px] bg-brand-300"></div> Local pet parent
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
