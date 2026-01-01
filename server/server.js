// -----------------------------------------------------
//                ENV + BASIC IMPORTS
// -----------------------------------------------------
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import dayjs from "dayjs";
import db, { seedIfNeeded } from "./db.js";
import multer from "multer";
import fs from "fs";
import Stripe from "stripe";
import { sendMail } from "./email.js";
import bodyParser from "body-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";


// -----------------------------------------------------
//                INPUT SAFETY HELPERS
// -----------------------------------------------------
const SAFE_TEXT_MAX = 200;
const SAFE_LONG_TEXT_MAX = 2000;

const safeText = (val, max = SAFE_TEXT_MAX) => {
  if (typeof val !== "string") return "";
  return val.trim().slice(0, max);
};

const safeLongText = (val, max = SAFE_LONG_TEXT_MAX) => safeText(val, max);

const safeSlug = (val, max = 80) =>
  safeText(val, max)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const validEmail = (val) =>
  typeof val === "string" &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()) &&
  val.length <= 120;

const safePrice = (val) => {
  const n = Number(val);
  if (isNaN(n) || n < 0 || n > 1_000_000_00) return null; // cap to £1,000,000
  return Math.round(n);
};

const validateItemsPayload = (items = []) => {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50)
    return null;
  const cleaned = [];
  for (const i of items) {
    const id = Number(i.id);
    const qty = Number(i.qty);
    const price = safePrice(i.price_cents ?? 0);
    if (!id || id < 0 || !Number.isInteger(id)) return null;
    if (!qty || qty < 1 || qty > 99) return null;
    cleaned.push({
      id,
      qty,
      name: safeText(i.name, 160),
      price_cents: typeof price === "number" ? price : 0,
    });
  }
  return cleaned;
};


// ---- Delivery Range Utilities ----

// Your shop origin postcode (Grange-over-Sands)
const ORIGIN_POSTCODE = "LA11 7EZ";

// Earth radius in miles
const R = 3958.8;

// Haversine distance formula
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  lat1 = toRad(lat1);
  lat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // miles
}

// Convert postcode → lat/lng using postcodes.io
async function postcodeToCoords(pc) {
  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`
    );
    const data = await res.json();
    if (data.status !== 200) return null;
    return {
      lat: data.result.latitude,
      lng: data.result.longitude,
    };
  } catch {
    return null;
  }
}

// Check if a postcode is within 15 miles
async function withinDeliveryRange(postcode) {
  const origin = await postcodeToCoords(ORIGIN_POSTCODE);
  const target = await postcodeToCoords(postcode);

  if (!origin || !target) return false;

  const dist = haversineDistance(
    origin.lat,
    origin.lng,
    target.lat,
    target.lng
  );

  return dist <= 15;
}



// -----------------------------------------------------
//                 INITIAL VARIABLES
// -----------------------------------------------------
const app = express();
const PORT = process.env.PORT || 4000;
const HOST =
  process.env.HOST ||
  (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");

const normalizeOrigin = (val) => {
  try {
    return new URL(val).origin;
  } catch {
    return val.replace(/\/$/, "");
  }
};
const rawOrigins =
  process.env.CORS_ORIGIN || process.env.CLIENT_ORIGINS || process.env.ORIGIN || "";
const originList = rawOrigins
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const allowedOrigins = new Set(originList.map(normalizeOrigin));
allowedOrigins.add("http://localhost:5173");
allowedOrigins.add("http://127.0.0.1:5173");
const FRONTEND_URL =
  process.env.FRONTEND_URL || originList[0] || "http://localhost:5173";
const FRONTEND_BASE = FRONTEND_URL.replace(/\/$/, "");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
if (!process.env.JWT_SECRET) {
  console.warn("⚠️ Using fallback JWT secret. Set JWT_SECRET in production!");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


// -----------------------------------------------------
//         STRIPE WEBHOOK (MUST BE FIRST ROUTE)
// -----------------------------------------------------
/**
 * Stripe requires raw request body.
 * This MUST be placed BEFORE express.json().
 */
app.post(
  "/api/stripe/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Stripe signature invalid:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle Checkout success
    if (event.type === "checkout.session.completed") {
      const s = event.data.object;

      try {
        const metadata = s.metadata || {};
        const userId = Number(metadata.user_id);
        const delivery = metadata.delivery_method;
        const items = JSON.parse(metadata.items_json || "[]");

        const user = db.prepare("SELECT * FROM users WHERE id=?").get(userId);
        if (!user) throw new Error("User not found during webhook!");

        // Insert PAID order
        const orderId = db
          .prepare(
            `INSERT INTO orders 
             (user_id, items_json, address_json, delivery_method, total_cents, status)
             VALUES (?, ?, ?, ?, ?, 'paid')`
          )
          .run(
            userId,
            JSON.stringify(items),
            JSON.stringify(user),
            delivery,
            s.amount_total
          ).lastInsertRowid;

        // Email admin
        await sendMail({
          subject: `🐾 New Order #${orderId}`,
          html: `
          <h1>New Paid Order #${orderId}</h1>
          <p><b>User:</b> ${user.name} (${user.email})</p>
          <p><b>Delivery:</b> ${delivery}</p>
          <p><b>Address:</b><br>
            ${user.address_line1}<br>
            ${user.city}, ${user.postcode}<br>
            ${user.country}
          </p>
          <h2>Items</h2>
          <ul>
            ${items
              .map(
                (i) =>
                  `<li>${i.qty} × ${i.name} — £${(i.price_cents / 100).toFixed(
                    2
                  )}</li>`
              )
              .join("")}
          </ul>
          <p><b>Total:</b> £${(s.amount_total / 100).toFixed(2)}</p>
        `,
        });

        console.log("✔️ Webhook order saved:", orderId);
      } catch (err) {
        console.error("❌ Webhook processing error:", err);
      }
    }

    res.json({ received: true });
  }
);

app.set("trust proxy", 1);

// -----------------------------------------------------
//                 NORMAL MIDDLEWARE
// -----------------------------------------------------
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const normalized = normalizeOrigin(origin);
      if (allowedOrigins.has(normalized)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(helmet());

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
});
const generalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 300,
});
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
});

app.use(generalLimiter);
app.use("/api/auth", authLimiter);

seedIfNeeded();
try {
  db.prepare("ALTER TABLE orders ADD COLUMN admin_status TEXT DEFAULT 'awaiting'").run();
} catch {}
try {
  db.prepare("ALTER TABLE orders ADD COLUMN delivery_date TEXT").run();
} catch {}
try {
  db.prepare("ALTER TABLE orders ADD COLUMN admin_note TEXT").run();
} catch {}


// -----------------------------------------------------
//                AUTH HELPERS
// -----------------------------------------------------
function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 3600 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: 0,
  });
}

function auth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthenticated" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireAdmin(req, res, next) {
  const u = db.prepare("SELECT role FROM users WHERE id=?").get(req.user.id);
  if (!u || u.role !== "admin")
    return res.status(403).json({ error: "Admin only" });
  next();
}


// -----------------------------------------------------
//           AUTO-CREATE ADMIN USER
// -----------------------------------------------------
(function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const pass = process.env.ADMIN_PASSWORD;

  if (!email || !pass) return;

  const existing = db.prepare("SELECT * FROM users WHERE email=?").get(email);

  if (!existing) {
    const hash = bcrypt.hashSync(pass, 10);
    db.prepare(
      "INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)"
    ).run("Admin", email, hash, "admin");
    console.log("✔ Admin account created");
  } else if (existing.role !== "admin") {
    db.prepare('UPDATE users SET role="admin" WHERE id=?').run(existing.id);
  }
})();


// -----------------------------------------------------
//             AUTH ROUTES — REGISTER (WITH RADIUS CHECK)
// -----------------------------------------------------
app.post("/api/auth/register", async (req, res) => {
  const { postcode } = req.body;
  const name = safeText(req.body.name || "", 120);
  const email = safeText(req.body.email || "", 120);
  const password = req.body.password || "";

  // Basic required fields
  if (!validEmail(email) || typeof password !== "string" || password.length < 6)
    return res.status(400).json({ error: "Missing fields" });

  // Require postcode
  if (!postcode)
    return res.status(400).json({ error: "Postcode required to register." });

  // Must be within delivery radius
  const allowed = await withinDeliveryRange(postcode);
  if (!allowed) {
    return res.status(403).json({
      error: "We only serve customers within 15 miles of Grange-over-Sands.",
    });
  }

  try {
    // Create user
    const id = db
      .prepare(
        "INSERT INTO users (name,email,password_hash,postcode) VALUES (?,?,?,?)"
      )
      .run(name, email, bcrypt.hashSync(password, 10), safeText(postcode, 20))
      .lastInsertRowid;

    // Authenticate new user
    const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: "7d" });
    setAuthCookie(res, token);

    res.json({ id, email, name, postcode });
  } catch (e) {
    if (e.code === "SQLITE_CONSTRAINT_UNIQUE")
      return res.status(409).json({ error: "Email already exists" });

    res.status(500).json({ error: "Server error" });
  }
});


app.post("/api/auth/login", (req, res) => {
  const email = safeText(req.body.email || "", 120);
  const password = req.body.password || "";
  const u = db.prepare("SELECT * FROM users WHERE email=?").get(email);

  if (!u || typeof password !== "string" || !bcrypt.compareSync(password, u.password_hash))
    return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: u.id, email }, JWT_SECRET, { expiresIn: "7d" });
  setAuthCookie(res, token);

  res.json({ id: u.id, email: u.email, name: u.name, role: u.role });
});

app.post("/api/auth/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get("/api/account/me", auth, (req, res) => {
  const row = db
    .prepare(
      "SELECT id,name,email,address_line1,address_line2,city,postcode,country,role FROM users WHERE id=?"
    )
    .get(req.user.id);

  res.json(row);
});


// -----------------------------------------------------
//      CATEGORY + SPECIES (PUBLIC)
// -----------------------------------------------------
app.get("/api/categories", (req, res) => {
  const rows = db
    .prepare("SELECT id, name, slug FROM categories ORDER BY name")
    .all();
  res.json(rows);
});

app.get("/api/species", (req, res) => {
  const rows = db.prepare("SELECT * FROM species ORDER BY id").all();
  res.json(rows);
});


// -----------------------------------------------------
//           ADMIN CATEGORY/SPECIES
// -----------------------------------------------------
app.post("/api/admin/categories", auth, requireAdmin, (req, res) => {
  const { name = "" } = req.body;
  const trimmed = safeText(name, 80);
  if (!trimmed) return res.status(400).json({ error: "Name required" });

  const slug = trimmed.toLowerCase().replace(/\s+/g, "-");

  try {
    const id = db
      .prepare("INSERT INTO categories (name, slug) VALUES (?, ?)")
      .run(trimmed, slug).lastInsertRowid;

    res.json({ id, name: trimmed, slug });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE")
      return res.status(409).json({ error: "Category exists" });

    res.status(500).json({ error: "Failed to create category" });
  }
});


app.delete("/api/admin/categories/:id", auth, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid ID" });

  const count = db
    .prepare("SELECT COUNT(*) AS c FROM items WHERE category_id=?")
    .get(id).c;

  if (count > 0)
    return res.status(400).json({
      error: "Cannot delete category with items",
    });

  db.prepare("DELETE FROM categories WHERE id=?").run(id);
  res.json({ ok: true });
});


app.post("/api/admin/species", auth, requireAdmin, (req, res) => {
  let { label = "", slug = "", icon = "" } = req.body;

  label = safeText(label, 80);
  if (!label) return res.status(400).json({ error: "Label required" });

  if (!slug) slug = label;
  slug = safeSlug(slug, 80);

  try {
    const id = db
      .prepare("INSERT INTO species (slug, label, icon) VALUES (?, ?, ?)")
      .run(slug, label, icon)
      .lastInsertRowid;

    res.json({ id, slug, label, icon });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE")
      return res.status(409).json({ error: "Species exists" });

    res.status(500).json({ error: "Failed to create species" });
  }
});

app.delete("/api/admin/species/:id", auth, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid ID" });

  const row = db.prepare("SELECT slug FROM species WHERE id=?").get(id);
  if (!row) return res.status(404).json({ error: "Not found" });

  const count = db
    .prepare("SELECT COUNT(*) AS c FROM items WHERE species=?")
    .get(row.slug).c;

  if (count > 0)
    return res.status(400).json({
      error: "Cannot delete species with items",
    });

  db.prepare("DELETE FROM species WHERE id=?").run(id);
  res.json({ ok: true });
});


// -----------------------------------------------------
//                 ITEMS (ADMIN CRUD)
// -----------------------------------------------------
app.post("/api/admin/items", auth, requireAdmin, (req, res) => {
  const {
    id,
    category_id,
    in_stock = 1,
    special_offer = 0,
  } = req.body;

  const name = safeText(req.body.name, 160);
  const description = safeLongText(req.body.description, 2000);
  const species = safeSlug(req.body.species || "", 80);
  const image_url = safeText(req.body.image_url || req.body.image || "", 500);

  let { price_cents } = req.body;

  if (!name || !category_id)
    return res.status(400).json({ error: "Missing name/category" });

  // normalise price
  price_cents = safePrice(req.body.price_cents);
  if (price_cents === null) return res.status(400).json({ error: "Bad price" });

  try {
    if (id) {
      db.prepare(
        `
        UPDATE items SET
        name=?, description=?, category_id=?, species=?, price_cents=?, image_url=?, 
        in_stock=?, special_offer=?
        WHERE id=?
        `
      ).run(
        name,
        description,
        category_id,
        species,
        price_cents,
        image_url,
        in_stock ? 1 : 0,
        special_offer ? 1 : 0,
        id
      );
    } else {
      db.prepare(
        `
        INSERT INTO items
        (name, description, category_id, species, price_cents, image_url, in_stock, special_offer)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run(
        name,
        description,
        category_id,
        species,
        price_cents,
        image_url,
        in_stock ? 1 : 0,
        special_offer ? 1 : 0
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Item error:", err);
    res.status(500).json({ error: "Failed to save item" });
  }
});

app.delete("/api/admin/items/:id", auth, requireAdmin, (req, res) => {
  db.prepare("DELETE FROM items WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});


// -----------------------------------------------------
//            PUBLIC ITEM QUERY
// -----------------------------------------------------
app.get("/api/items", (req, res) => {
  const { category, species, q = "" } = req.query;

  let sql = `
    SELECT items.*, categories.name AS category 
    FROM items
    JOIN categories ON items.category_id = categories.id
    WHERE 1=1
  `;

  const params = [];

  // species normalisation (safe)
  if (species) {
    sql += " AND LOWER(items.species)=?";
    params.push(species.toLowerCase());
  }

  // category slug → ID
  if (category) {
    const row = db
      .prepare("SELECT id FROM categories WHERE slug=?")
      .get(category);
    if (!row) return res.json([]);
    sql += " AND items.category_id=?";
    params.push(row.id);
  }

  // search query
  if (q) {
    const safeQ = safeText(q, 80);
    if (safeQ) {
      sql += " AND items.name LIKE ?";
      params.push(`%${safeQ}%`);
    }
  }

  sql += " ORDER BY items.id DESC";

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});


// -----------------------------------------------------
//              ORDERS (MANUAL PLACEMENT)
// -----------------------------------------------------
app.post("/api/orders", auth, async (req, res) => {
  try {
    const { items, total_cents, delivery_method = "collect" } = req.body;

    // Fetch user snapshot for address + email purposes
    const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }

    const cleanedItems = validateItemsPayload(items);
    if (!cleanedItems) return res.status(400).json({ error: "Bad items payload" });

    const safeTotal = safePrice(total_cents);
    if (safeTotal === null) return res.status(400).json({ error: "Bad total" });

    const itemsJson = JSON.stringify(cleanedItems);

    // Deduplicate recent identical orders (within 24h) to avoid double email when webhook also fires
    const existing = db
      .prepare(
        `
        SELECT id FROM orders
        WHERE user_id=? AND total_cents=? AND delivery_method=? AND items_json=?
          AND datetime(created_at) >= datetime('now', '-1 day')
        ORDER BY id DESC LIMIT 1
      `
      )
      .get(req.user.id, safeTotal, delivery_method, itemsJson);

    if (existing) {
      return res.json({ ok: true, orderId: existing.id, deduped: true });
    }

    const orderId = db
      .prepare(
        `INSERT INTO orders 
         (user_id, items_json, address_json, delivery_method, total_cents, status)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.user.id,
        itemsJson,
        JSON.stringify(user),
        delivery_method,
        safeTotal,
        "placed"
      ).lastInsertRowid;

    // Send admin notification (fallback when webhook missing)
    try {
      await sendMail({
        subject: `🐾 Order received #${orderId}`,
        html: `
          <h1>Order #${orderId}</h1>
          <p><b>User:</b> ${user.name || ""} (${user.email || ""})</p>
          <p><b>Delivery:</b> ${delivery_method}</p>
          <p><b>Address:</b><br>
            ${user.address_line1 || ""}<br>
            ${user.city || ""}, ${user.postcode || ""}<br>
            ${user.country || ""}
          </p>
          <h2>Items</h2>
          <ul>
            ${cleanedItems
              .map(
                (i) =>
                  `<li>${i.qty} × ${safeText(i.name, 160)} — £${(
                    (i.price_cents || 0) / 100
                  ).toFixed(2)}</li>`
              )
              .join("")}
          </ul>
          <p><b>Total:</b> £${((safeTotal || 0) / 100).toFixed(2)}</p>
        `,
      });
    } catch (err) {
      console.error("❌ Email send (orders fallback) failed:", err);
    }

    res.json({ ok: true, orderId });
  } catch (err) {
    console.error("Order creation error (orders route):", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});


// -----------------------------------------------------
//             ADDRESS SAVE
// -----------------------------------------------------
app.put("/api/account/me", auth, (req, res) => {
  try {
    const allowed = [
      "name",
      "address_line1",
      "address_line2",
      "city",
      "postcode",
      "country",
    ];

    const incoming = req.body || {};

    const clean = (val) =>
      typeof val === "string" ? val.trim().replace(/\s+/g, " ").slice(0, 200) : "";

    const updates = [];
    const params = [];

    for (const key of allowed) {
      if (key in incoming) {
        const value = clean(incoming[key]);
        if (!value) continue;
        updates.push(`${key}=?`);
        params.push(value);
      }
    }

    if (!updates.length)
      return res.status(400).json({ error: "No valid fields" });

    params.push(req.user.id);

    db.prepare(
      `
      UPDATE users SET
      ${updates.join(", ")}
      WHERE id=?
      `
    ).run(...params);

    const updated = db
      .prepare(
        "SELECT id,name,email,address_line1,address_line2,city,postcode,country,role FROM users WHERE id=?"
      )
      .get(req.user.id);

    res.json(updated);
  } catch (err) {
    console.error("Address update error:", err);
    res.status(500).json({ error: "Failed to update account" });
  }
});


// -----------------------------------------------------
//            IMAGE UPLOAD (ADMIN ONLY)
// -----------------------------------------------------
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// restrict uploads
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const fname = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, fname);
  },
});

// only allow images, cap size ~5MB
function fileFilter(req, file, cb) {
  const allowed = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) return cb(new Error("Invalid file type"));
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.post(
  "/api/admin/upload",
  auth,
  requireAdmin,
  uploadLimiter,
  upload.single("image"),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const proto = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.get("host");
    const base = process.env.PUBLIC_BASE_URL || `${proto}://${host}`;
    const relative = `/uploads/${req.file.filename}`;
    res.json({ url: relative, absolute_url: `${base}${relative}` });
  }
);

app.use("/uploads", express.static(uploadDir));


app.post("/api/checkout", auth, async (req, res) => {
  try {
    const { items, delivery_method } = req.body;

    // Fetch user for address check
    const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);

    // Must have a postcode saved
    if (!user.postcode) {
      return res.status(400).json({
        error: "Please add your address before checking out.",
      });
    }

    // Enforce 15-mile radius
    const allowed = await withinDeliveryRange(user.postcode);
    if (!allowed) {
      return res.status(403).json({
        error: "Your address is outside our 15-mile service area.",
      });
    }

    // ---------------------------------------------------------
    // VALIDATE ITEMS + CREATE SNAPSHOT FOR THE ORDER RECORD
    // ---------------------------------------------------------
    const line_items = [];
    const snapshotItems = []; // ✅ FIX: Save full product info

    for (const i of items) {
      const dbItem = db.prepare("SELECT * FROM items WHERE id=?").get(i.id);

      if (!dbItem)
        return res.status(400).json({ error: "Item not found" });

      // Stripe line item
      line_items.push({
        price_data: {
          currency: "gbp",
          product_data: { name: dbItem.name },
          unit_amount: dbItem.price_cents,
        },
        quantity: i.qty,
      });

      // Snapshot saved to orders table + shown in My Orders
      snapshotItems.push({
        id: dbItem.id,
        name: dbItem.name,
        price_cents: dbItem.price_cents,
        qty: i.qty,
      });
    }

    // ---------------------------------------------------------
    // STRIPE CHECKOUT SESSION
    // ---------------------------------------------------------
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items,

      success_url: `${FRONTEND_BASE}/success`,
      cancel_url: `${FRONTEND_BASE}/cancel`,

      metadata: {
        user_id: req.user.id,
        delivery_method,
        items_json: JSON.stringify(snapshotItems), // ✅ FIXED
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    res.status(500).json({ error: "Checkout failed" });
  }
});


// -----------------------------------------------------
//              ORDERS LIST (for user)
// -----------------------------------------------------
app.get("/api/orders", auth, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM orders WHERE user_id=? ORDER BY id DESC")
    .all(req.user.id);
  res.json(rows);
});

// ADMIN ORDERS
app.get("/api/admin/orders", auth, requireAdmin, (req, res) => {
  const active = db
    .prepare(
      `
      SELECT o.*, u.email AS user_email, u.name AS user_name
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE datetime(o.created_at) >= datetime('now','-5 day')
      ORDER BY o.id DESC
    `
    )
    .all();

  const archived = db
    .prepare(
      `
      SELECT o.*, u.email AS user_email, u.name AS user_name
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE datetime(o.created_at) < datetime('now','-5 day')
      ORDER BY o.id DESC
      LIMIT 200
    `
    )
    .all();

  res.json({ active, archived });
});

app.put("/api/admin/orders/:id", auth, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid ID" });

  const admin_status = safeText(req.body.admin_status || "awaiting", 40);
  const delivery_date = safeText(req.body.delivery_date || "", 40);
  const admin_note = safeLongText(req.body.admin_note || "", 1000);

  db.prepare(
    `UPDATE orders SET admin_status=?, delivery_date=?, admin_note=? WHERE id=?`
  ).run(admin_status, delivery_date, admin_note, id);

  const updated = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
  res.json(updated);
});


// -----------------------------------------------------
//                START SERVER
// -----------------------------------------------------

// -----------------------------------------------------
//             ADMIN REPAIR TOOLS
// -----------------------------------------------------
app.post("/api/admin/repair-images", auth, requireAdmin, (req, res) => {
  const fixups = new Map([
    ["/images/dog_collar.jpg", "/images/dog_acc1.jpg"],
    ["/images/dog_chew.jpg", "/images/dog_chew1.jpg"],
    ["/images/cat_collar.jpg", "/images/cat_acc1.jpg"],
    ["/images/cat_treats.jpg", "/images/cat_treat1.jpg"],
  ]);
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.get("host");
  const base = process.env.PUBLIC_BASE_URL || `${proto}://${host}`;

  const rows = db.prepare("SELECT id, image_url FROM items").all();
  const update = db.prepare("UPDATE items SET image_url=? WHERE id=?");
  let updated = 0;

  for (const row of rows) {
    let next = (row.image_url || "").trim();
    if (!next) continue;

    if (fixups.has(next)) next = fixups.get(next);

    if (!next.startsWith("http")) {
      if (next.startsWith("images/")) next = `/${next}`;
      if (next.startsWith("uploads/")) next = `/${next}`;
      if (next.startsWith("/uploads/")) next = `${base}${next}`;
    }

    if (next !== row.image_url) {
      update.run(next, row.id);
      updated += 1;
    }
  }

  res.json({ ok: true, updated });
});

app.listen(PORT, HOST, () =>
  console.log(`🚀 Server running at http://${HOST}:${PORT}`)
);
