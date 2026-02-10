import axios from "axios";

// Backend URL from Vite env variable
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const BASE_URL = import.meta.env.BASE_URL || "/";
const AUTH_TOKEN_KEY = "auth_token";

export const IMAGE_FALLBACK =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='480' viewBox='0 0 640 480'><rect width='100%25' height='100%25' fill='%23f2e7d4'/><rect x='24' y='24' width='592' height='432' rx='24' ry='24' fill='%23f9f4ea' stroke='%23e5d4b5' stroke-width='2'/><text x='50%25' y='50%25' text-anchor='middle' font-family='Arial, sans-serif' font-size='22' fill='%23907145'>Image unavailable</text></svg>";

const withBase = (path) => {
  const base = BASE_URL.replace(/\/$/, "");
  const next = path.replace(/^\//, "");
  return `${base}/${next}`;
};

// Create reusable Axios instance for all backend requests
export const api = axios.create({
  baseURL: API_URL ? `${API_URL}/api` : "/api",
  withCredentials: true,
});

const getAuthToken = () => {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || "";
  } catch {
    return "";
  }
};

const setAuthToken = (token) => {
  try {
    if (!token) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return;
    }
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {}
};

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const full = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("data:") || path.startsWith("blob:")) return path;
  if (path.startsWith("/images/") || path.startsWith("images/")) {
    return withBase(path);
  }
  if (path.startsWith("uploads/")) {
    if (!API_URL) return `/${path}`;
    return `${API_URL}/${path}`;
  }
  if (path.startsWith("/uploads/")) {
    if (!API_URL) return path;
    return `${API_URL}${path}`;
  }
  if (!API_URL) return path;
  return `${API_URL}${path}`;
};

export const publicUrl = (path) => withBase(path);


// ============================
// 🛍️ CATALOG (FINAL MERGED VERSION)
// ============================
export const Catalog = {
  // Species
  species: () => api.get("/species").then((r) => r.data),

  // Categories
  categories: () => api.get("/categories").then((r) => r.data),

  // Items
  items: (params) => api.get("/items", { params }).then((r) => r.data),
};

// ============================
// 🐾 SPECIES (optional helper)
// ============================
export const Species = {
  list: () => api.get("/species").then((r) => r.data),
};

// ============================
// 🔐 AUTH
// ============================
export const Auth = {
  me: () => api.get("/account/me").then((r) => r.data),
  register: (p) =>
  api
    .post("/auth/register", {
      name: p.name,
      email: p.email,
      password: p.password,
      city: p.city,
      postcode: p.postcode,   // REQUIRED
      latitude: p.latitude,   // passed from browser
      longitude: p.longitude, // passed from browser
    })
    .then((r) => {
      if (r.data?.token) setAuthToken(r.data.token);
      return r.data;
    }),

  login: (p) =>
    api.post("/auth/login", p).then((r) => {
      if (r.data?.token) setAuthToken(r.data.token);
      return r.data;
    }),
  logout: () =>
    api.post("/auth/logout").then((r) => {
      setAuthToken("");
      return r.data;
    }),
};

// ============================
// 📦 ORDERS
// ============================
export const Orders = {
  list: () => api.get("/orders").then((r) => r.data),
  create: (p) => api.post("/orders", p).then((r) => r.data),
  save: (p) => api.post("/orders/save", p).then((r) => r.data),
};

// ============================
// ⚙️ ADMIN PANEL
// ============================
export const Admin = {
  upsertUser: (p) => api.post("/admin/users", p).then((r) => r.data),

  // Items
  upsertItem: (p) => api.post("/admin/items", p).then((r) => r.data),
  deleteItem: (id) => api.delete(`/admin/items/${id}`).then((r) => r.data),

  // Categories
  createCategory: (p) => api.post("/admin/categories", p).then((r) => r.data),
  deleteCategory: (id) =>
    api.delete(`/admin/categories/${id}`).then((r) => r.data),

  // Species
  createSpecies: (p) => api.post("/admin/species", p).then((r) => r.data),
  deleteSpecies: (id) =>
    api.delete(`/admin/species/${id}`).then((r) => r.data),

  // Orders
  listOrders: () => api.get("/admin/orders").then((r) => r.data),
  updateOrder: (id, p) => api.put(`/admin/orders/${id}`, p).then((r) => r.data),
  repairImages: () => api.post("/admin/repair-images").then((r) => r.data),
};

// ============================
// 💳 STRIPE CHECKOUT
// ============================
// 🔥 ONLY CHANGE: we now forward the whole payload instead of just items
export const Checkout = {
createSession: ({ items, delivery_method }) =>
  api.post("/checkout", { items, delivery_method }).then((r) => r.data),
};
