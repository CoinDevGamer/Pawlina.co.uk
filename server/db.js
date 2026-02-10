import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ALWAYS use absolute path inside /server/data
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const configuredDbPath = (process.env.DB_PATH || "").trim();
// Fully absolute DB path (supports external persistent volume via DB_PATH)
const dbPath = configuredDbPath
  ? (path.isAbsolute(configuredDbPath)
      ? configuredDbPath
      : path.join(__dirname, configuredDbPath))
  : path.join(dataDir, "farmbarn.db");
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
console.log("📦 USING DATABASE:", dbPath);

const db = new Database(dbPath);

// ---------- CORE SCHEMA ----------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'user',
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  postcode TEXT,
  country TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  slug TEXT UNIQUE,
  species TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  species TEXT DEFAULT '',
  price_cents INTEGER DEFAULT 0,
  image_url TEXT DEFAULT '',
  in_stock INTEGER DEFAULT 1,
  special_offer INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  items_json TEXT,
  address_json TEXT,
  delivery_method TEXT DEFAULT 'collect',
  total_cents INTEGER,
  status TEXT DEFAULT 'placed',
  admin_status TEXT DEFAULT 'awaiting',
  delivery_date TEXT,
  admin_note TEXT,
  stripe_session_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS species (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE,
  label TEXT,
  icon TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT,
  code_hash TEXT,
  expires_at TEXT,
  attempts INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

// ---------- SAFE MIGRATIONS ----------
try { db.prepare("ALTER TABLE items ADD COLUMN image_url TEXT DEFAULT ''").run(); } catch {}
try { db.prepare("ALTER TABLE items ADD COLUMN species TEXT DEFAULT ''").run(); } catch {}
try { db.prepare("ALTER TABLE categories ADD COLUMN species TEXT DEFAULT ''").run(); } catch {}

// ---------- FIX EXISTING CATEGORY SLUGS ----------
const catRows = db.prepare("SELECT id,name,slug FROM categories").all();

for (const c of catRows) {
  if (!c.slug || c.slug.trim() === "") {
    const slug = c.name.toLowerCase().trim().replace(/\s+/g, "-");
    db.prepare("UPDATE categories SET slug=? WHERE id=?").run(slug, c.id);
    console.log(`🔧 Updated category slug: ${c.name} → ${slug}`);
  }
}

// ---------- SEED DEFAULT DATA ----------
export function seedIfNeeded() {
  const autoSeedEnv = (process.env.AUTO_SEED || "").trim().toLowerCase();
  const autoSeedEnabled = autoSeedEnv === "true";
  if (!autoSeedEnabled) return;

  const seeded = db
    .prepare("SELECT value FROM app_meta WHERE key='seeded_v1'")
    .get()?.value;
  if (seeded === "1") return;

  const itemCount = db.prepare("SELECT COUNT(*) AS c FROM items").get().c;
  if (itemCount > 0) {
    db.prepare(
      "INSERT INTO app_meta (key, value) VALUES ('seeded_v1','1') ON CONFLICT(key) DO UPDATE SET value=excluded.value"
    ).run();
    return;
  }

  console.log("🐾 Seeding Pawlina categories & items...");

  const baseCategories = [
    { name: "Accessories", slug: "accessories", species: "" },
    { name: "Natural Chews", slug: "natural-chews", species: "" },
    { name: "Supplements", slug: "supplements", species: "" },
    { name: "Treats", slug: "treats", species: "" },
  ];

  const baseItems = [
    {
      categorySlug: "accessories",
      name: "Dog Collar",
      description: "Durable collar.",
      species: "dog",
      price_cents: 1299,
      image_url: "/images/dog_acc1.jpg",
      in_stock: 1,
      special_offer: 0,
    },
    {
      categorySlug: "natural-chews",
      name: "Beef Chew Bone",
      description: "Chew bone.",
      species: "dog",
      price_cents: 799,
      image_url: "/images/dog_chew1.jpg",
      in_stock: 1,
      special_offer: 1,
    },
    {
      categorySlug: "accessories",
      name: "Cat Collar",
      description: "Soft collar.",
      species: "cat",
      price_cents: 899,
      image_url: "/images/cat_acc1.jpg",
      in_stock: 1,
      special_offer: 0,
    },
    {
      categorySlug: "treats",
      name: "Salmon Treats",
      description: "Tasty treats.",
      species: "cat",
      price_cents: 499,
      image_url: "/images/cat_treat1.jpg",
      in_stock: 1,
      special_offer: 1,
    },
  ];

  const tx = db.transaction(() => {
    for (const c of baseCategories) {
      db.prepare(
        "INSERT OR IGNORE INTO categories (name, slug, species) VALUES (?, ?, ?)"
      ).run(c.name, c.slug, c.species);
    }

    for (const it of baseItems) {
      const cat = db
        .prepare("SELECT id FROM categories WHERE slug=?")
        .get(it.categorySlug);
      if (!cat?.id) continue;

      const existing = db
        .prepare(
          "SELECT id FROM items WHERE name=? AND species=? AND category_id=? LIMIT 1"
        )
        .get(it.name, it.species, cat.id);
      if (existing) continue;

      db.prepare(
        `
        INSERT INTO items (category_id, name, description, species, price_cents, image_url, in_stock, special_offer)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run(
        cat.id,
        it.name,
        it.description,
        it.species,
        it.price_cents,
        it.image_url,
        it.in_stock,
        it.special_offer
      );
    }

    db.prepare(
      "INSERT INTO app_meta (key, value) VALUES ('seeded_v1','1') ON CONFLICT(key) DO UPDATE SET value=excluded.value"
    ).run();
  });

  tx();

  console.log("✅ Seed complete!");
}

// ---------- IMAGE URL FIXUPS ----------
const imageFixups = [
  { from: "/images/dog_collar.jpg", to: "/images/dog_acc1.jpg" },
  { from: "/images/dog_chew.jpg", to: "/images/dog_chew1.jpg" },
  { from: "/images/cat_collar.jpg", to: "/images/cat_acc1.jpg" },
  { from: "/images/cat_treats.jpg", to: "/images/cat_treat1.jpg" },
];

for (const { from, to } of imageFixups) {
  try {
    db.prepare("UPDATE items SET image_url=? WHERE image_url=?").run(to, from);
  } catch {}
}

// ---------- BASE SPECIES ----------
const baseSpecies = [
  { slug: "dog", label: "Dogs", icon: "🐶" },
  { slug: "cat", label: "Cats", icon: "🐱" },
];

for (const s of baseSpecies) {
  try {
    db.prepare("INSERT INTO species (slug, label, icon) VALUES (?, ?, ?)").run(s.slug, s.label, s.icon);
  } catch {}
}

export default db;
