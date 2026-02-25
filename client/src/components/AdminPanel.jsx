import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Catalog,
  Admin as AdminApi,
  Species as SpeciesApi,
  api,
  full,
  publicUrl,
  IMAGE_FALLBACK,
  Orders as OrdersApi,
} from "../lib/api";

const woodBtn =
  "px-6 py-2.5 rounded-xl text-white font-medium bg-gradient-to-br from-brand-400 to-brand-600 shadow-float hover:shadow-float-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100";
const ghostBtn =
  "px-4 py-2.5 rounded-xl border border-surface-200 text-sm font-medium bg-surface-50 text-ink hover:bg-white hover:border-brand-200 hover:shadow-soft active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed";
const chip =
  "inline-flex items-center gap-1 text-[11px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full border shadow-sm";
const chipGreen = chip + " bg-emerald-50 border-emerald-100 text-emerald-600";
const chipRed = chip + " bg-red-50 border-red-100 text-red-600";
const chipAmber = chip + " bg-amber-50 border-amber-100 text-amber-600";

const normalizeImageUrl = (val) => {
  if (!val) return "";
  const raw = String(val).trim();
  if (!raw) return "";
  const urlMatch = raw.match(/https?:\/\/\S+/i);
  if (urlMatch) return urlMatch[0];
  if (raw.includes("/uploads/")) {
    return raw.slice(raw.indexOf("/uploads/")).split(/\s/)[0];
  }
  if (raw.startsWith("uploads/")) return `/${raw}`;
  if (raw.startsWith("/images/") || raw.startsWith("images/")) {
    return raw.startsWith("/") ? raw : `/${raw}`;
  }
  return raw;
};

const imgSrc = (it) =>
  full(
    normalizeImageUrl(it?.image_preview || it?.image || it?.image_url)
  ) || IMAGE_FALLBACK;
const previewSrc = (it) => it?.image_preview || imgSrc(it);

export default function AdminPanel() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);

  // 🐾 species state
  const [speciesList, setSpeciesList] = useState([]);
  const [speciesTab, setSpeciesTab] = useState(""); // slug, e.g. "dog"

  const [filter, setFilter] = useState("all"); // all | in | out | special
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(new Map()); // id -> edited item

  // modals
  const [showEdit, setShowEdit] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({
    species: "",
    category_id: "",
    name: "",
    description: "",
    price_cents: 0,
    old_price_cents: 0,
    image: "",
    image_preview: "",
    in_stock: 1,
    special_offer: 0,
  });

  // category manager
  const [newCategory, setNewCategory] = useState("");
  const [newCategorySpecies, setNewCategorySpecies] = useState("");
  const [catBusy, setCatBusy] = useState(false);

  // species manager
  const [newSpeciesName, setNewSpeciesName] = useState("");
  const [newSpeciesIcon, setNewSpeciesIcon] = useState("🐾");
  const [speciesBusy, setSpeciesBusy] = useState(false);

  // orders admin
  const [adminOrders, setAdminOrders] = useState({ active: [], archived: [] });
  const [orderEdits, setOrderEdits] = useState(new Map()); // id -> {admin_status, delivery_date}
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilterTerm, setOrderFilterTerm] = useState("");
  const [orderFilterRange, setOrderFilterRange] = useState("all"); // all | today | week
  const [repairingImages, setRepairingImages] = useState(false);
  const [draftUploadStatus, setDraftUploadStatus] = useState({
    loading: false,
    error: "",
  });
  const [editUploadStatus, setEditUploadStatus] = useState({
    loading: false,
    error: "",
  });

  // ===== LOADERS =====
  const loadCategories = async () => {
    try {
      const cats = await Catalog.categories();
      setCategories(cats);
    } catch (err) {
      console.error("❌ Failed to load categories:", err);
      alert("Failed to load categories from server.");
    }
  };

  const loadSpecies = async () => {
    try {
      const list = await SpeciesApi.list();
      setSpeciesList(list);
      if (!speciesTab && list.length) {
        setSpeciesTab(list[0].slug);
      }
      return list;
    } catch (err) {
      console.error("❌ Failed to load species:", err);
      alert("Failed to load species from server.");
      return [];
    }
  };

  const loadItems = async () => {
    if (!speciesTab) return; // wait until we know which species is active
    try {
      const list = await Catalog.items({
        species: speciesTab,
        sort: "new",
      });
      setItems(list);
    } catch (err) {
      console.error("❌ Failed to load items:", err);
      alert("Failed to load items from server.");
    }
  };

  useEffect(() => {
    loadCategories();
    loadSpecies();
    loadAdminOrders();
  }, []);

  useEffect(() => {
    loadItems();
  }, [speciesTab]);

  useEffect(() => {
    if (!newCategorySpecies && speciesTab) {
      setNewCategorySpecies(speciesTab);
    }
  }, [speciesTab, newCategorySpecies]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (filter === "in") return !!it.in_stock;
      if (filter === "out") return !it.in_stock;
      if (filter === "special") return !!it.special_offer;
      return true;
    });
  }, [items, filter]);

  const stats = useMemo(
    () => [
      {
        label: "Items",
        value: filtered.length || items.length,
        hint: filter === "all" ? "Total live items" : `Filtered by ${filter}`,
      },
      {
        label: "Categories",
        value: categories.length,
        hint: "Organise your catalogue",
      },
      {
        label: "Species",
        value: speciesList.length,
        hint: "Shop audiences",
      },
      {
        label: "Pending changes",
        value: changed.size,
        hint: changed.size ? "Save to publish" : "All synced",
      },
    ],
    [filtered.length, items.length, categories.length, speciesList.length, changed.size, filter]
  );

  const activeSpeciesLabel =
    speciesList.find((s) => s.slug === speciesTab)?.label || "Select a species";

  const categoryMatchesSpecies = (cat, slug) =>
    !cat?.species || cat.species === slug;

  const categoriesForSpecies = (slug) =>
    categories.filter((c) => categoryMatchesSpecies(c, slug));

  const categoryOptionsForItem = (it) =>
    categories.filter(
      (c) =>
        c.id === it.category_id ||
        categoryMatchesSpecies(c, it.species || speciesTab)
    );

  const visibleCategories = useMemo(
    () => categoriesForSpecies(speciesTab),
    [categories, speciesTab]
  );

  // ===== HELPERS FOR ITEMS =====
  const markChanged = (upd) => {
    setItems((list) =>
      list.map((x) => (x.id === upd.id ? { ...x, ...upd } : x))
    );

    setChanged((m) => {
      const copy = new Map(m);
      const original = items.find((x) => x.id === upd.id) || {};
      const merged = { ...original, ...(m.get(upd.id) || {}), ...upd };
      copy.set(upd.id, merged);
      return copy;
    });
  };

  const toggleStock = (row) =>
    markChanged({ id: row.id, in_stock: row.in_stock ? 0 : 1 });

  const toggleSpecial = (row) =>
    markChanged({ id: row.id, special_offer: row.special_offer ? 0 : 1 });

  const onField = (row, key, val) => markChanged({ id: row.id, [key]: val });

  const itemToPayload = (it) => {
    const imageVal = normalizeImageUrl(it.image || it.image_url || "");
    return {
      id: it.id,
      species: it.species || speciesTab,
      category_id: it.category_id,
      name: it.name,
      description: it.description || "",
      price_cents: Number(it.price_cents) || 0,
      old_price_cents: Number(it.old_price_cents) || 0,
      image: imageVal,
      image_url: imageVal,
      in_stock: it.in_stock ? 1 : 0,
      special_offer: it.special_offer ? 1 : 0,
    };
  };

  const saveAll = async () => {
    if (changed.size === 0) return;
    setSaving(true);
    try {
      for (const [, it] of changed) {
        await AdminApi.upsertItem(itemToPayload(it));
      }
      setChanged(new Map());
      await loadItems();
      alert("✅ Changes saved.");
    } catch (err) {
      console.error("❌ Failed to save items:", err);
      alert("Failed to save some items. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  const repairImages = async () => {
    setRepairingImages(true);
    try {
      const res = await AdminApi.repairImages();
      await loadItems();
      alert(`🛠️ Repaired ${res.updated || 0} image URLs.`);
    } catch (err) {
      console.error("❌ Failed to repair images:", err);
      alert("Failed to repair images. Check console for details.");
    } finally {
      setRepairingImages(false);
    }
  };

  const softDelete = async (row) => {
    if (!window.confirm(`Soft-remove "${row.name}" from catalogue?`)) return;
    try {
      await AdminApi.upsertItem(
        itemToPayload({ ...row, in_stock: 0, special_offer: 0 })
      );
      setChanged((prev) => {
        const next = new Map(prev);
        next.delete(row.id);
        return next;
      });
      await loadItems();
      alert("✅ Item soft-removed.");
    } catch (err) {
      console.error("❌ Failed to soft-remove item:", err);
      alert("Failed to soft-remove item.");
    }
  };

  const hardDelete = async (row) => {
    if (
      !window.confirm(
        `This will permanently delete "${row.name}". This cannot be undone. Continue?`
      )
    )
      return;
    try {
      await AdminApi.deleteItem(row.id);
      setChanged((prev) => {
        const next = new Map(prev);
        next.delete(row.id);
        return next;
      });
      await loadItems();
      alert("🗑️ Item deleted.");
    } catch (err) {
      console.error("❌ Failed to delete item:", err);
      alert("Failed to delete item.");
    }
  };

  const openAdd = () => {
    const firstCat = categoriesForSpecies(speciesTab)[0]?.id || categories[0]?.id || "";
    setDraft((prev) => {
      if (prev?.image_preview?.startsWith("blob:")) {
        URL.revokeObjectURL(prev.image_preview);
      }
      return prev;
    });
    setDraft({
      species: speciesTab || "dog",
      category_id: firstCat,
      name: "",
      description: "",
      price_cents: 0,
      old_price_cents: 0,
      image: "",
      image_preview: "",
      in_stock: 1,
      special_offer: 0,
    });
    setDraftUploadStatus({ loading: false, error: "" });
    setShowAdd(true);
  };

  const createItem = async () => {
    if (!draft.name.trim()) {
      alert("Name is required.");
      return;
    }
    if (!draft.category_id) {
      alert("Category is required.");
      return;
    }
    const priceCents = Math.round(Number(draft.price_cents || 0) * 100);
    const oldPriceCents = Math.round(Number(draft.old_price_cents || 0) * 100);
    const imgVal = normalizeImageUrl(draft.image || "");
    if (draftUploadStatus.loading) {
      alert("Please wait for the image upload to finish.");
      return;
    }
    if (!imgVal) {
      alert("Image is required. Please upload an image or paste a URL.");
      return;
    }
    try {
      const createdSpecies = draft.species || speciesTab || "dog";
      await AdminApi.upsertItem({
        species: createdSpecies,
        category_id: draft.category_id,
        name: draft.name.trim(),
        description: draft.description || "",
        price_cents: priceCents,
        old_price_cents: oldPriceCents,
        image_url: imgVal,
        in_stock: draft.in_stock ? 1 : 0,
        special_offer: draft.special_offer ? 1 : 0,
      });
      setShowAdd(false);
      if (createdSpecies !== speciesTab) {
        setSpeciesTab(createdSpecies);
      } else {
        await loadItems();
      }
      alert("✅ Item created.");
    } catch (err) {
      console.error("❌ Failed to create item:", err);
      alert("Failed to create item.");
    }
  };

  const openEdit = (row) => {
    setEditingItem({
      ...row,
      price_display: (Number(row.price_cents) / 100).toFixed(2),
      old_price_display: (Number(row.old_price_cents || 0) / 100).toFixed(2),
      image: row.image || row.image_url || "",
      image_preview: "",
    });
    setEditUploadStatus({ loading: false, error: "" });
    setShowEdit(true);
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    const priceCents = Math.round(
      Number(editingItem.price_display || 0) * 100
    );
    const oldPriceCents = Math.round(
      Number(editingItem.old_price_display || 0) * 100
    );
    const imgVal = normalizeImageUrl(editingItem.image || "");
    if (editUploadStatus.loading) {
      alert("Please wait for the image upload to finish.");
      return;
    }
    if (!imgVal) {
      alert("Image is required. Please upload an image or paste a URL.");
      return;
    }
    try {
      await AdminApi.upsertItem({
        id: editingItem.id,
        species: editingItem.species || speciesTab || "dog",
        category_id: editingItem.category_id,
        name: editingItem.name.trim(),
        description: editingItem.description || "",
        price_cents: priceCents,
        old_price_cents: oldPriceCents,
        image_url: imgVal,
        in_stock: editingItem.in_stock ? 1 : 0,
        special_offer: editingItem.special_offer ? 1 : 0,
      });
      setShowEdit(false);
      setEditingItem(null);
      await loadItems();
      alert("✅ Item updated.");
    } catch (err) {
      console.error("❌ Failed to update item:", err);
      alert("Failed to update item.");
    }
  };

  const onUploadToDraft = async (file, setter, setStatus) => {
    if (!file) return;
    setStatus?.({ loading: true, error: "" });
    const previewUrl = URL.createObjectURL(file);
    setter((prev) => {
      if (prev?.image_preview?.startsWith("blob:")) {
        URL.revokeObjectURL(prev.image_preview);
      }
      return { ...prev, image_preview: previewUrl };
    });
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await api.post("/admin/upload", formData);
      // Prefer relative URL so image links remain valid across env/domain changes.
      const nextUrl = normalizeImageUrl(res.data.url || res.data.absolute_url || "");
      setter((prev) => ({ ...prev, image: nextUrl }));
      setStatus?.({ loading: false, error: "" });
    } catch (err) {
      console.error("❌ Upload failed:", err);
      setStatus?.({
        loading: false,
        error: "Upload failed. Is the server running?",
      });
      alert("Failed to upload image.");
    }
  };

  // ===== CATEGORY MANAGER =====
  const normalisedCategories = useMemo(
    () =>
      categories.map((c) => ({
        ...c,
        nameLower: c.name.toLowerCase(),
        speciesNorm: c.species || "",
      })),
    [categories]
  );

  const targetCategorySpecies =
    newCategorySpecies === "all" ? "" : (newCategorySpecies || "");

  const isDuplicateCategory = newCategory.trim()
    ? normalisedCategories.some(
        (c) =>
          c.nameLower === newCategory.trim().toLowerCase() &&
          c.speciesNorm === targetCategorySpecies
      )
    : false;

  const loadAdminOrders = async () => {
    setOrdersLoading(true);
    try {
      const data = await AdminApi.listOrders();
      const parseAddr = (row) => {
        try {
          return JSON.parse(row.address_json || "{}");
        } catch {
          return {};
        }
      };
      setAdminOrders({
        active: (data.active || []).map((o) => ({ ...o, address: parseAddr(o) })),
        archived: (data.archived || []).map((o) => ({ ...o, address: parseAddr(o) })),
      });
    } catch (err) {
      console.error("❌ Failed to load admin orders:", err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const filteredActiveOrders = useMemo(() => {
    const term = orderFilterTerm.trim().toLowerCase();
    const now = new Date();
    return (adminOrders.active || []).filter((o) => {
      if (orderFilterRange === "today") {
        const created = new Date(o.created_at);
        if (
          created.getDate() !== now.getDate() ||
          created.getMonth() !== now.getMonth() ||
          created.getFullYear() !== now.getFullYear()
        ) {
          return false;
        }
      } else if (orderFilterRange === "week") {
        const created = new Date(o.created_at);
        const diff = (now - created) / (1000 * 60 * 60 * 24);
        if (diff > 7) return false;
      }

      if (!term) return true;
      const haystack = [
        o.id,
        o.user_email,
        o.user_name,
        o.admin_status,
        o.delivery_method,
        o.address?.city,
        o.address?.postcode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [adminOrders.active, orderFilterRange, orderFilterTerm]);

  const onOrderField = (id, key, value) => {
    setOrderEdits((prev) => {
      const next = new Map(prev);
      next.set(id, { ...(next.get(id) || {}), [key]: value });
      return next;
    });
  };

  const saveOrderEdit = async (id) => {
    const payload = orderEdits.get(id) || {};
    const existing = adminOrders.active.find((o) => o.id === id);
    const delivery_date = payload.delivery_date ?? existing?.delivery_date ?? "";

    if (!delivery_date) {
      alert("Please set a delivery/collection date before updating status.");
      return;
    }

    if (existing?.delivery_date && payload.delivery_date && payload.delivery_date !== existing.delivery_date) {
      alert("Delivery/collection date is already set and cannot be changed.");
      return;
    }

    try {
      await AdminApi.updateOrder(id, {
        admin_status: payload.admin_status,
        delivery_date,
        admin_note: payload.admin_note ?? existing?.admin_note ?? "",
      });
      setOrderEdits((m) => {
        const next = new Map(m);
        next.delete(id);
        return next;
      });
      await loadAdminOrders();
      alert("✅ Order updated");
    } catch (err) {
      console.error("❌ Failed to update order:", err);
      alert("Failed to update order.");
    }
  };

  const createCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    if (isDuplicateCategory) {
      alert("❌ Category already exists.");
      return;
    }
    setCatBusy(true);
    try {
      await AdminApi.createCategory({
        name,
        species: targetCategorySpecies,
      });
      setNewCategory("");
      setNewCategorySpecies(speciesTab || "");
      await loadCategories();
      alert("✅ Category created.");
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        "Failed to create category. Check console.";
      console.error("❌ Category create error:", err);
      alert(msg);
    } finally {
      setCatBusy(false);
    }
  };

  const deleteCategory = async (cat) => {
    if (
      !window.confirm(
        `Delete category "${cat.name}"?\nYou must move/delete its items first or this may fail.`
      )
    )
      return;
    try {
      await AdminApi.deleteCategory(cat.id);
      await loadCategories();
      alert("🗑️ Category deleted (if it had no items).");
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        "Failed to delete category. Check console.";
      console.error("❌ Category delete error:", err);
      alert(msg);
    }
  };

  // ===== SPECIES MANAGER =====
  const createSpecies = async () => {
    const label = newSpeciesName.trim();
    if (!label) return;
    setSpeciesBusy(true);
    try {
      await AdminApi.createSpecies({
        label,
        icon: newSpeciesIcon || "",
      });
      setNewSpeciesName("");
      setNewSpeciesIcon("🐾");
      await loadSpecies();
      alert("✅ Species created.");
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        "Failed to create species. Check console.";
      console.error("❌ Species create error:", err);
      alert(msg);
    } finally {
      setSpeciesBusy(false);
    }
  };

  const deleteSpecies = async (sp) => {
    if (
      !window.confirm(
        `Delete species "${sp.label}"?\nYou must delete its items first.`
      )
    )
      return;
    try {
      await AdminApi.deleteSpecies(sp.id);
      const refreshed = await loadSpecies();
      if (speciesTab === sp.slug) {
        setSpeciesTab(refreshed[0]?.slug || "");
      }
      alert("🗑️ Species deleted (if it had no items).");
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        "Failed to delete species. Check console.";
      console.error("❌ Species delete error:", err);
      alert(msg);
    }
  };

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-surface-50 text-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-[2rem] bg-ink text-white shadow-float-lg border border-surface-200">
          <div className="absolute -inset-12 opacity-30 blur-[100px] bg-[radial-gradient(circle_at_20%_20%,rgba(223,162,51,0.35),transparent_50%),radial-gradient(circle_at_80%_40%,rgba(214,181,123,0.3),transparent_45%)]" />
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_30%,#dfa233,transparent_35%),radial-gradient(circle_at_80%_60%,#e5ba55,transparent_30%)]" />
          <div className="relative flex flex-col gap-4 p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold tracking-widest uppercase">
                  🛠 Admin Console
                </div>
                <h1 className="mt-4 text-4xl md:text-5xl font-black font-heading tracking-tight">
                  Inventory & Merchandising
                </h1>
                <p className="mt-3 text-white/80 max-w-2xl text-lg font-light leading-relaxed">
                  Curate your catalogue, keep stock healthy, and publish changes with confidence.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {speciesList.map((sp) => (
                  <button
                    key={sp.id}
                    className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      speciesTab === sp.slug
                        ? "bg-white text-ink border-white shadow-float"
                        : "bg-white/10 border-white/20 text-white/90 hover:bg-white/20 hover:scale-[1.02]"
                    }`}
                    onClick={() => setSpeciesTab(sp.slug)}
                  >
                    <span className="mr-2 text-lg">{sp.icon || "🐾"}</span>
                    {sp.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center mt-4">
              <div className="text-sm text-white/70">
                Active species: <span className="font-semibold text-white">{activeSpeciesLabel}</span>
              </div>
              <div className="hidden sm:block h-6 w-px bg-white/20" />
              <select
                className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm outline-none backdrop-blur focus:ring-2 focus:ring-brand-400 placeholder:text-white/60 appearance-none font-medium"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                title="Filter"
              >
                <option value="all" className="text-ink">All items</option>
                <option value="in" className="text-ink">In stock</option>
                <option value="out" className="text-ink">Out of stock</option>
                <option value="special" className="text-ink">Special offers</option>
              </select>

              <div className="flex-1" />

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-5 py-2.5 rounded-xl font-semibold bg-white text-ink shadow-float border border-surface-200"
                onClick={openAdd}
              >
                ➕ Add Item
              </motion.button>

              <motion.button
                whileHover={{ scale: changed.size ? 1.03 : 1 }}
                whileTap={{ scale: changed.size ? 0.97 : 1 }}
                disabled={!changed.size || saving}
                className={`px-5 py-2.5 rounded-xl font-semibold border shadow-float transition-all ${
                  changed.size
                    ? "bg-brand-400 text-white border-brand-300"
                    : "bg-white/10 border-white/20 text-white/50 cursor-not-allowed"
                }`}
                onClick={saveAll}
              >
                💾 Save {changed.size ? `(${changed.size})` : ""}
              </motion.button>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, type: "spring" }}
              key={s.label}
              className="card-surface px-6 py-5"
            >
              <div className="text-[11px] font-bold uppercase tracking-widest text-brand-600 mb-2">{s.label}</div>
              <div className="text-4xl font-black font-heading text-ink">{s.value}</div>
              <div className="text-sm font-medium text-ink-muted mt-2">{s.hint}</div>
            </motion.div>
          ))}
        </div>

        {/* QUICK ACTIONS */}
        <div className="card-surface px-6 py-5 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-2xl text-brand-600 shadow-sm">
              ✨
            </div>
            <div>
              <div className="text-base font-bold text-ink">Fast lane</div>
              <div className="text-sm text-ink-muted">Add items, publish edits, or filter inventory.</div>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex flex-wrap gap-3">
            <button
              onClick={openAdd}
              className="px-5 py-2.5 rounded-xl bg-brand-50 text-brand-700 font-bold border border-brand-100 hover:bg-brand-100 transition-colors"
            >
              ➕ New item
            </button>
            <button
              onClick={() => setFilter("special")}
              className="px-4 py-2 rounded-xl border border-[#e7d5b5] text-[#3f2817] bg-white hover:bg-[#fff6e5] transition"
            >
              🎁 Specials
            </button>
            <button
              onClick={() => setFilter("out")}
              className="px-4 py-2 rounded-xl border border-[#e7d5b5] text-[#3f2817] bg-white hover:bg-[#fff6e5] transition"
            >
              🚫 Out of stock
            </button>
            <button
              onClick={repairImages}
              disabled={repairingImages}
              className={`px-4 py-2 rounded-xl border border-[#e7d5b5] text-[#3f2817] bg-white hover:bg-[#fff6e5] transition ${
                repairingImages ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              🛠 Repair images
            </button>
            <button
              disabled={!changed.size || saving}
              onClick={saveAll}
              className={`px-4 py-2 rounded-xl font-semibold transition shadow-md ${
                changed.size
                  ? "bg-gradient-to-r from-emerald-400 to-emerald-500 text-white hover:shadow-lg"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              💾 Publish {changed.size ? `(${changed.size})` : ""}
            </button>
          </div>
        </div>

        {/* GRID */}
        <div className="rounded-3xl border border-[#e5d4b5] bg-white shadow-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-[#3f2817] flex items-center gap-2">
                Orders (admin view)
                <span className="text-[11px] px-2 py-1 rounded-full bg-[#f6d59b] border border-[#e5cda7] text-[#2f1f13] shadow-sm">
                  Live feed
                </span>
              </div>
              <div className="text-sm text-[#7a6140]">
                Set status and delivery date. Orders older than 5 days move to archive.
              </div>
            </div>
            <button
              className="px-3 py-2 rounded-xl border border-[#e5d4b5] text-[#3f2817] bg-white hover:bg-[#fff6e5] transition"
              onClick={loadAdminOrders}
              disabled={ordersLoading}
            >
              {ordersLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="input-etched text-sm"
              placeholder="Search email, name, city, status"
              value={orderFilterTerm}
              onChange={(e) => setOrderFilterTerm(e.target.value)}
            />
            <div className="flex items-center gap-2 text-xs text-[#3f2817]">
              <button
                className={`px-3 py-2 rounded-xl border ${orderFilterRange === "all" ? "bg-[#f6d59b] border-[#e5cda7]" : "bg-white border-[#e5d4b5]"}`}
                onClick={() => setOrderFilterRange("all")}
              >
                All
              </button>
              <button
                className={`px-3 py-2 rounded-xl border ${orderFilterRange === "today" ? "bg-[#f6d59b] border-[#e5cda7]" : "bg-white border-[#e5d4b5]"}`}
                onClick={() => setOrderFilterRange("today")}
              >
                Today
              </button>
              <button
                className={`px-3 py-2 rounded-xl border ${orderFilterRange === "week" ? "bg-[#f6d59b] border-[#e5cda7]" : "bg-white border-[#e5d4b5]"}`}
                onClick={() => setOrderFilterRange("week")}
              >
                This week
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-[#3f2817] bg-gradient-to-r from-[#fff4df] via-[#fff8ef] to-[#fdf0d8] border border-[#ead6b8] rounded-2xl p-3 shadow-inner">
            <div>
              <div className="font-semibold">Status guide</div>
              <ul className="list-disc list-inside space-y-1">
                <li><b>awaiting</b>: order received, not started</li>
                <li><b>preparing</b>: packing or readying for delivery/collection</li>
                  <li><b>dispatched</b>: sent out or ready to collect</li>
                  <li><b>delivered</b>: customer received/collected</li>
                </ul>
              </div>
              <div className="space-y-1">
                <div className="font-semibold">Visibility</div>
                <div>• Active: last 5 days, editable.</div>
                <div>• Archive: older than 5 days, read-only (listed below, up to 200).</div>
                <div className="text-[#7a6140]">Use the date field to reassure customers with an ETA.</div>
              </div>
            </div>
          <div className="flex items-center justify-between text-xs text-[#3f2817] font-semibold">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" /> Active (≤5 days): {adminOrders.active.length}
            </span>
            <span className="text-[#7a6140] flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" /> Archive (older than 5 days): {adminOrders.archived.length}
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto space-y-3">
            {filteredActiveOrders.map((o) => (
              <div key={o.id} className="py-3 space-y-2 bg-gradient-to-br from-white via-[#fff9f2] to-[#f7e4c4] rounded-xl px-3 shadow-sm border border-[#f0e3cd]">
                <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                  <div className="font-semibold text-[#3f2817] flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full bg-[#f6d59b] border border-[#e5cda7] text-[#2f1f13]">#{o.id}</span>
                    <span>{o.delivery_method}</span>
                  </div>
                  <div className="text-xs text-[#7a6140]">
                    {new Date(o.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#3f2817] font-semibold">
                  <span className="px-2 py-1 rounded-full bg-[#f6d59b] border border-[#e5cda7] text-[#2f1f13]">
                    {o.user_email || "no email"}
                  </span>
                  {o.user_name && <span className="text-[#7a6140]">{o.user_name}</span>}
                </div>
                <div className="text-xs text-[#5a4535] leading-tight">
                  {o.address?.name || ""} • {o.address?.address_line1 || ""} {o.address?.address_line2 || ""},{" "}
                  {o.address?.city || ""}, {o.address?.postcode || ""}, {o.address?.country || ""}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#7a6140] flex-wrap">
                  <span className="px-2 py-1 rounded-full bg-[#e3f8e1] text-[#166534] border border-[#bbf7d0]">
                    Status: {o.admin_status || "awaiting"}
                  </span>
                  {o.delivery_date && (
                    <span className="px-2 py-1 rounded-full bg-[#fef3c7] text-[#92400e] border border-[#fcd34d]">
                      Date: {o.delivery_date}
                    </span>
                  )}
                  {typeof o.total_cents === "number" && (
                    <span className="px-2 py-1 rounded-full bg-[#e0e7ff] text-[#312e81] border border-[#c7d2fe]">
                      £{(o.total_cents / 100).toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div className="col-span-2 bg-[#fffaf3] border border-[#f0e3cd] rounded-xl p-2 text-[11px] text-[#3b2415]">
                    <div className="font-semibold mb-1">Items</div>
                    <ul className="space-y-1">
                      {(o.items_json ? (() => { try { return JSON.parse(o.items_json); } catch { return []; } })() : []).map((it, idx) => (
                        <li key={idx} className="flex items-center justify-between">
                          <span>{it.qty} × {it.name}</span>
                          {it.price_cents != null && (
                            <span>£{((it.price_cents * it.qty) / 100).toFixed(2)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <label className="text-xs text-[#7a6140]">
                    Status
                    <select
                      className="input-etched"
                      value={orderEdits.get(o.id)?.admin_status ?? o.admin_status ?? "awaiting"}
                      onChange={(e) => onOrderField(o.id, "admin_status", e.target.value)}
                    >
                      {["awaiting", "preparing", "dispatched", "delivered"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-[#7a6140]">
                    Delivery/Collection Date
                    <input
                      className="input-etched"
                      type="date"
                      value={orderEdits.get(o.id)?.delivery_date ?? (o.delivery_date || "")}
                      onChange={(e) => onOrderField(o.id, "delivery_date", e.target.value)}
                      disabled={!!o.delivery_date}
                    />
                  </label>
                  <label className="text-xs text-[#7a6140] col-span-2">
                    Message to customer (notes)
                    <textarea
                      className="input-etched"
                      rows={2}
                      value={orderEdits.get(o.id)?.admin_note ?? (o.admin_note || "")}
                      onChange={(e) => onOrderField(o.id, "admin_note", e.target.value)}
                    />
                  </label>
                </div>
                <div className="text-right">
                  <button
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#f6d59b] to-[#e4b96e] text-[#2f1f13] font-semibold shadow hover:shadow-lg transition"
                    onClick={() => saveOrderEdit(o.id)}
                    disabled={!orderEdits.get(o.id)}
                  >
                    Save update
                  </button>
                </div>
              </div>
            ))}
            {adminOrders.active.length === 0 && (
              <div className="p-3 text-sm text-[#7a6140]">No active orders.</div>
            )}
          </div>
          <div className="text-xs text-[#7a6140]">
            Archive (older than 5 days, up to 200 shown): {adminOrders.archived.length}
          </div>
          <div className="max-h-40 overflow-y-auto divide-y divide-[#f0e3cd]">
            {adminOrders.archived.map((o) => (
              <div key={o.id} className="py-3 space-y-1 bg-white/60 rounded-xl px-3">
                <div className="flex items-center justify-between text-xs text-[#3f2817]">
                  <span className="font-semibold">#{o.id} • {o.delivery_method}</span>
                  <span className="text-[#7a6140]">
                    {new Date(o.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-[11px] text-[#7a6140]">
                  {o.user_email || ""} {o.user_name ? `• ${o.user_name}` : ""}
                </div>
                <div className="text-[11px] text-[#5a4535]">
                  {o.address?.name || ""} • {o.address?.address_line1 || ""} {o.address?.address_line2 || ""},{" "}
                  {o.address?.city || ""}, {o.address?.postcode || ""}, {o.address?.country || ""}
                </div>
                {o.delivery_date && (
                  <div className="text-[11px] text-[#3b2415]">
                    Delivery date: {o.delivery_date}
                  </div>
                )}
                <div className="text-[11px] text-[#7a6140]">
                  Status: {o.admin_status || "awaiting"}
                </div>
              </div>
            ))}
            {adminOrders.archived.length === 0 && (
              <div className="p-2 text-xs text-[#7a6140]">No archived orders.</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-10">
          {/* TABLE (desktop) */}
          <div className="card-surface overflow-hidden hidden md:block">
            <div className="px-6 py-5 border-b border-surface-200 bg-surface-50 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-black font-heading text-ink flex items-center gap-2">
                  <span className="text-3xl">📦</span> Catalogue
                </h2>
                <div className="flex items-center gap-2 mt-1 md:mt-0">
                  <span className="text-xs px-3 py-1.5 rounded-full bg-white border border-surface-200 text-ink-muted shadow-sm">
                    ✨ Inline edits auto-save to draft
                  </span>
                  <span className="text-xs px-3 py-1.5 rounded-full bg-white border border-surface-200 text-ink-muted shadow-sm hidden lg:inline-flex">
                    Tip: click image to edit
                  </span>
                </div>
              </div>
              <div className="text-sm font-bold text-brand-700 px-4 py-2 bg-brand-50 border border-brand-100 rounded-xl shadow-sm">
                {filtered.length} items
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-surface-100 text-ink-muted uppercase tracking-wider text-xs border-b border-surface-200">
                  <tr>
                    <th className="px-6 py-4 font-bold">Item</th>
                    <th className="px-6 py-4 font-bold">Category & Species</th>
                    <th className="px-6 py-4 font-bold text-center">Price (£)</th>
                    <th className="px-6 py-4 font-bold text-center">Status</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                  <AnimatePresence initial={false}>
                    {filtered.map((row) => (
                      <motion.tr
                        key={row.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white hover:bg-surface-50 transition-colors"
                      >
                        <td className="px-6 py-4 align-middle">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => openEdit(row)}
                              className="relative focus:outline-none group block shrink-0"
                              title="Click to edit"
                            >
                              <img
                                src={imgSrc(row)}
                                alt={row.name}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = IMAGE_FALLBACK;
                                }}
                                className="w-16 h-16 rounded-xl border border-surface-200 object-cover bg-surface-100 shadow-sm transition group-hover:scale-105"
                              />
                              <span className="absolute inset-0 rounded-xl bg-ink/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[10px] text-white font-bold backdrop-blur-[2px]">
                                Edit
                              </span>
                            </button>
                            <input
                              className="input-modern py-2.5 min-w-[180px] font-medium"
                              value={row.name || ""}
                              onChange={(e) => onField(row, "name", e.target.value)}
                              placeholder="Item Name"
                            />
                          </div>
                        </td>

                        <td className="px-6 py-4 align-middle">
                          <div className="flex flex-col gap-2 min-w-[140px]">
                            <select
                              className="input-modern py-2 pl-3 pr-8 text-sm"
                              value={row.category_id || ""}
                              onChange={(e) => onField(row, "category_id", Number(e.target.value))}
                            >
                              {categoryOptionsForItem(row).map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                            <select
                              className="input-modern py-2 pl-3 pr-8 text-sm"
                              value={row.species || speciesTab}
                              onChange={(e) => onField(row, "species", e.target.value)}
                            >
                              {speciesList.map((sp) => (
                                <option key={sp.id} value={sp.slug}>
                                  {sp.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        <td className="px-6 py-4 align-middle min-w-[120px]">
                          <div className="flex items-center justify-center">
                            <span className="text-ink-muted font-bold mr-1">£</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="input-modern py-2 w-20 text-center font-bold text-brand-600 px-1"
                              value={(Number(row.price_cents) / 100).toFixed(2)}
                              onChange={(e) =>
                                onField(row, "price_cents", Math.round(Number(e.target.value || 0) * 100))
                              }
                            />
                          </div>
                        </td>

                        <td className="px-6 py-4 align-middle">
                          <div className="flex flex-col gap-2 min-w-[120px] items-center">
                            <button
                              className={`w-full px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                                row.in_stock
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                  : "bg-surface-100 border-surface-200 text-ink-muted hover:bg-surface-200"
                              }`}
                              onClick={() => toggleStock(row)}
                            >
                              {row.in_stock ? "✓ In Stock" : "X Out of Stock"}
                            </button>
                            <button
                              className={`w-full px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                                row.special_offer
                                  ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                                  : "bg-surface-100 border-surface-200 text-ink-muted hover:bg-surface-200"
                              }`}
                              onClick={() => toggleSpecial(row)}
                            >
                              {row.special_offer ? "★ Special Offer" : "— No Special"}
                            </button>
                          </div>
                        </td>

                        <td className="px-6 py-4 align-middle">
                          <div className="flex justify-end gap-2">
                            <div className="flex flex-col gap-2">
                              <button
                                className="px-4 py-2 bg-white hover:bg-surface-50 border border-surface-200 rounded-xl text-sm font-bold text-ink transition-colors shadow-sm"
                                onClick={() => openEdit(row)}
                              >
                                Edit Props
                              </button>
                              <div className="flex gap-2">
                                <button
                                  className="px-3 py-1.5 bg-white hover:bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-ink transition-colors shadow-sm"
                                  onClick={() => softDelete(row)}
                                  title="Hide item"
                                >
                                  Hide
                                </button>
                                <button
                                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold text-red-700 transition-colors shadow-sm"
                                  onClick={() => hardDelete(row)}
                                  title="Delete item"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <div className="p-6 text-center text-black/60">No items match your filter.</div>
            )}
          </div>

          {/* MOBILE CARDS */}
          <div className="md:hidden space-y-3">
            <div className="rounded-2xl border border-surface-200 bg-surface-50/90 shadow-lg p-3">
              <div className="text-lg font-bold text-ink">Catalogue</div>
              <div className="text-xs text-ink-muted">Tap cards to edit quickly.</div>
            </div>
            <AnimatePresence>
              {filtered.map((row) => (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="rounded-2xl border border-surface-200 bg-surface-50/95 shadow-lg p-3 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={imgSrc(row)}
                      alt={row.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = IMAGE_FALLBACK;
                      }}
                      className="w-14 h-14 rounded-xl border border-surface-200 object-cover bg-surface-100"
                    />
                    <input
                      className="input-etched flex-1"
                      value={row.name || ""}
                      onChange={(e) => onField(row, "name", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="input-etched"
                      value={row.category_id || ""}
                      onChange={(e) => onField(row, "category_id", Number(e.target.value))}
                    >
                      {categoryOptionsForItem(row).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="input-etched"
                      value={row.species || speciesTab}
                      onChange={(e) => onField(row, "species", e.target.value)}
                    >
                      {speciesList.map((sp) => (
                        <option key={sp.id} value={sp.slug}>
                          {sp.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input-etched"
                      value={(Number(row.price_cents) / 100).toFixed(2)}
                      onChange={(e) =>
                        onField(row, "price_cents", Math.round(Number(e.target.value || 0) * 100))
                      }
                    />
                    <div className="flex gap-2">
                      <button
                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold ${
                          row.in_stock
                            ? "bg-emerald-50 border border-emerald-100 text-emerald-700"
                            : "bg-surface-100 border border-surface-200 text-ink-muted"
                        }`}
                        onClick={() => toggleStock(row)}
                      >
                        {row.in_stock ? "In stock" : "Out of stock"}
                      </button>
                      <button
                        className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold bg-brand-50 border border-brand-100 text-brand-700"
                        onClick={() => toggleSpecial(row)}
                      >
                        {row.special_offer ? "Special" : "Mark special"}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button
                      className="px-3 py-2 rounded-xl border border-surface-200 bg-surface-50 text-ink shadow-sm"
                      onClick={() => openEdit(row)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="px-3 py-2 rounded-xl border border-surface-200 bg-surface-50 text-ink shadow-sm"
                      onClick={() => softDelete(row)}
                    >
                      Hide now
                    </button>
                    <button
                      className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 shadow-sm"
                      onClick={() => hardDelete(row)}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* BOTTOM COLUMN: species + categories side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Species manager */}
            <div className="card-surface p-6 space-y-4">
              <div className="font-bold text-xl flex items-center gap-2 text-ink font-heading">
                🐾 Manage Species
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {speciesList.map((sp) => (
                  <div
                    key={sp.id}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 border transition cursor-pointer ${
                      speciesTab === sp.slug
                        ? "bg-brand-50 border-brand-200 shadow-sm"
                        : "bg-surface-50 border-surface-200 hover:border-brand-200"
                    }`}
                    onClick={() => setSpeciesTab(sp.slug)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{sp.icon || "🐾"}</span>
                      <span className="text-sm font-bold">{sp.label}</span>
                      <span className="text-xs text-ink-muted bg-surface-200 px-2 py-0.5 rounded-full">/{sp.slug}</span>
                    </div>
                    <button
                      className="text-xs text-red-600 font-bold hover:text-red-700 py-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSpecies(sp);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {speciesList.length === 0 && (
                  <div className="text-sm text-ink-muted italic">No species yet – add one below.</div>
                )}
              </div>

              <div className="border-t border-surface-200 pt-4 space-y-3">
                <div className="text-sm font-bold text-ink">Add new species</div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="input-modern py-2.5"
                    placeholder="Name (e.g. Fish)"
                    value={newSpeciesName}
                    onChange={(e) => setNewSpeciesName(e.target.value)}
                  />
                  <input
                    className="input-modern py-2.5"
                    placeholder="Icon (e.g. 🐟)"
                    value={newSpeciesIcon}
                    onChange={(e) => setNewSpeciesIcon(e.target.value)}
                  />
                </div>
                <button className="btn-primary w-full py-2.5 text-sm" disabled={!newSpeciesName.trim() || speciesBusy} onClick={createSpecies}>
                  + Create Species
                </button>
              </div>
            </div>

            {/* Category manager */}
            <div className="card-surface p-6 space-y-4">
              <div className="font-bold text-xl flex items-center gap-2 text-ink font-heading">
                📂 Manage Categories
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {visibleCategories.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between bg-surface-50 rounded-xl px-4 py-3 border border-surface-200 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold">{c.name}</span>
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 font-bold border border-brand-100 uppercase tracking-widest">
                        {c.species
                          ? speciesList.find((s) => s.slug === c.species)?.label || c.species
                          : "All species"}
                      </span>
                    </div>
                    <button className="text-xs font-bold text-red-600 hover:text-red-700" onClick={() => deleteCategory(c)}>
                      Delete
                    </button>
                  </div>
                ))}
                {visibleCategories.length === 0 && (
                  <div className="text-sm text-ink-muted italic">No categories yet – create one below.</div>
                )}
              </div>

              <div className="border-t border-[#f0e3cd] pt-3 space-y-2">
                <div className="text-sm font-semibold">Add new category</div>
                <select
                  className="input-etched"
                  value={newCategorySpecies || speciesTab || "all"}
                  onChange={(e) => setNewCategorySpecies(e.target.value)}
                >
                  <option value="all">All species</option>
                  {speciesList.map((sp) => (
                    <option key={sp.id} value={sp.slug}>
                      {sp.label}
                    </option>
                  ))}
                </select>
                <input
                  className={`input-etched ${isDuplicateCategory ? "border-red-500" : ""}`}
                  placeholder="e.g. Natural Chews, Treats"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
                {isDuplicateCategory && (
                  <div className="text-xs text-red-600">This name already exists.</div>
                )}
                <button
                  className={woodBtn}
                  disabled={!newCategory.trim() || isDuplicateCategory || catBusy}
                  onClick={createCategory}
                >
                  ➕ Create Category
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add item modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 160, damping: 18 }}
            className="w-full max-w-3xl relative"
          >
            <div className="absolute inset-0 blur-3xl bg-[radial-gradient(circle_at_20%_20%,rgba(255,226,183,0.65),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(216,178,111,0.55),transparent_40%),radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.4),transparent_40%)] pointer-events-none" />

            <div className="absolute -inset-2 bg-[linear-gradient(120deg,rgba(255,255,255,0.2),rgba(247,215,151,0.12),rgba(255,255,255,0.2))] opacity-60 rounded-[32px]" />

            <div className="relative rounded-3xl border border-[#e5d4b5] bg-gradient-to-br from-[#fffaf5] via-[#fff3e2] to-[#f3dab0] shadow-[0_24px_70px_rgba(47,31,19,0.28)] overflow-hidden">
              <div className="absolute top-6 right-6 text-2xl opacity-20 select-none">✨</div>
              <div className="px-6 py-4 border-b border-[#ecdcc3] flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-[#e5d4b5] text-xs font-semibold text-[#a26b2e] tracking-wide shadow-sm">
                    Merchandising • Draft
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#f7d7a7] to-[#d9b26f] flex items-center justify-center text-xl shadow-inner">🧺</div>
                    <div>
                      <div className="text-2xl font-black text-[#3f2817]">Add New Item</div>
                      <div className="text-[11px] text-[#7a6140]">Inclusive, clear, and ready for every shopper.</div>
                    </div>
                  </div>
                  <div className="text-xs text-[#7a6140]">
                    Give it a name, a home, and a hero image.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAdd(false)}
                    className="h-10 w-10 rounded-full bg-white/70 border border-[#e5d4b5] flex items-center justify-center text-lg text-[#3f2817] hover:shadow-md transition"
                    title="Close"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[#edd9b9] bg-white/70 p-3 shadow-sm">
                    <div className="text-xs uppercase text-[#a26b2e] font-semibold">Checklist</div>
                    <div className="text-xs text-[#7a6140] mt-1">Add name, pick species, set a price, and provide an image.</div>
                  </div>
                  <div className="rounded-2xl border border-[#edd9b9] bg-white/70 p-3 shadow-sm">
                    <div className="text-xs uppercase text-[#a26b2e] font-semibold">Tip</div>
                    <div className="text-xs text-[#7a6140] mt-1">Special offer flags boost visibility in the grid.</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="col-span-2">
                    <div className="text-xs font-semibold text-[#7a6140] mb-1">Name</div>
                    <input
                      className="input-etched bg-white"
                      value={draft.name}
                      placeholder="e.g. Beef Chew Bone"
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    />
                  </label>

                  <label>
                    <div className="text-xs font-semibold text-[#7a6140] mb-1">Species</div>
                    <select
                      className="input-etched bg-white"
                      value={draft.species || speciesTab}
                      onChange={(e) => setDraft({ ...draft, species: e.target.value })}
                    >
                      {speciesList.map((sp) => (
                        <option key={sp.id} value={sp.slug}>
                          {sp.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <div className="text-xs font-semibold text-[#7a6140] mb-1">Category</div>
                    <select
                      className="input-etched bg-white"
                      value={draft.category_id}
                      onChange={(e) => setDraft({ ...draft, category_id: Number(e.target.value) })}
                    >
                      {categoriesForSpecies(draft.species || speciesTab).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="col-span-2">
                    <div className="text-xs font-semibold text-[#7a6140] mb-1">Description</div>
                    <textarea
                      className="input-etched bg-white"
                      rows={3}
                      placeholder="Tell shoppers why this is special."
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-4 col-span-2">
                      <label>
                        <div className="text-xs font-semibold text-[#7a6140] mb-1">Price (£)</div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="input-etched bg-white"
                          value={draft.price_cents}
                          onChange={(e) => setDraft({ ...draft, price_cents: e.target.value })}
                        />
                      </label>
                      <label>
                        <div className="text-xs font-semibold text-[#7a6140] mb-1">Old Price (£)</div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="input-etched bg-white"
                          value={draft.old_price_cents}
                          onChange={(e) => setDraft({ ...draft, old_price_cents: e.target.value })}
                        />
                      </label>

                    <label>
                      <div className="text-xs font-semibold text-[#7a6140] mb-1">Upload Image</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            onUploadToDraft(
                              e.target.files[0],
                              setDraft,
                              setDraftUploadStatus
                            )
                          }
                          className="text-sm"
                        />
                      </div>
                      {draftUploadStatus.loading && (
                        <div className="text-xs text-[#7a6140] mt-1">Uploading…</div>
                      )}
                      {draftUploadStatus.error && (
                        <div className="text-xs text-red-700 mt-1">{draftUploadStatus.error}</div>
                      )}
                    </label>
                  </div>

                  <label className="col-span-2">
                    <div className="text-xs font-semibold text-[#7a6140] mb-1">Image URL</div>
                    <input
                      className="input-etched bg-white"
                      placeholder="https://..."
                      value={draft.image}
                      onChange={(e) => setDraft({ ...draft, image: e.target.value })}
                    />
                  </label>

                  {(draft.image || draft.image_preview) && (
                    <div className="col-span-2">
                      <div className="text-xs font-semibold text-[#7a6140] mb-1">Preview</div>
                      <img
                        src={previewSrc(draft)}
                        alt="Preview"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = IMAGE_FALLBACK;
                        }}
                        className="w-40 h-40 object-cover rounded-xl border border-[#e5d4b5] shadow-md"
                      />
                    </div>
                  )}

                  <div className="col-span-2 flex flex-wrap gap-4 items-center">
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#3f2817]">
                      <input
                        type="checkbox"
                        checked={!!draft.in_stock}
                        onChange={(e) => setDraft({ ...draft, in_stock: e.target.checked ? 1 : 0 })}
                      />
                      In stock
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#3f2817]">
                      <input
                        type="checkbox"
                        checked={!!draft.special_offer}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            special_offer: e.target.checked ? 1 : 0,
                          })
                        }
                      />
                      Special offer
                    </label>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-[#f9edd8] border-t border-[#ecdcc3] flex items-center justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-xl border border-[#e5d4b5] text-[#3f2817] bg-white hover:bg-[#fff6e5] transition"
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-[#e0a25d] via-[#c78035] to-[#8c4a1e] shadow-lg hover:shadow-xl transition"
                  onClick={createItem}
                >
                  Create
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit item modal */}
      {showEdit && editingItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 160, damping: 18 }}
            className="w-full max-w-3xl max-h-[90vh] overflow-hidden relative"
          >
            <div className="absolute inset-0 blur-3xl bg-[radial-gradient(circle_at_20%_20%,rgba(255,226,183,0.65),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(216,178,111,0.55),transparent_40%),radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.4),transparent_40%)] pointer-events-none" />
            <div className="absolute -inset-2 bg-[linear-gradient(120deg,rgba(255,255,255,0.2),rgba(247,215,151,0.12),rgba(255,255,255,0.2))] opacity-60 rounded-[32px]" />

            <div className="relative rounded-3xl border border-[#e5d4b5] bg-gradient-to-br from-[#fffaf5] via-[#fff3e2] to-[#f3dab0] shadow-[0_24px_70px_rgba(47,31,19,0.28)] overflow-hidden flex flex-col max-h-[90vh]">
              <div className="absolute top-6 right-6 text-2xl opacity-20 select-none">✨</div>
              <div className="px-6 py-4 border-b border-[#ecdcc3] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#f7d7a7] to-[#d9b26f] flex items-center justify-center text-xl shadow-inner">
                    📝
                  </div>
                  <div>
                    <div className="text-2xl font-black text-[#3f2817]">Edit Item</div>
                    <div className="text-[11px] text-[#7a6140]">
                      Make it shine—name, price, photo, and highlights.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEdit(false);
                    setEditingItem(null);
                  }}
                  className="h-10 w-10 rounded-full bg-white/80 border border-[#e5d4b5] flex items-center justify-center text-lg text-[#3f2817] hover:shadow-md transition"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[#edd9b9] bg-white/70 p-3 shadow-sm">
                    <div className="text-xs uppercase text-[#a26b2e] font-semibold">Comfort edits</div>
                    <div className="text-xs text-[#7a6140] mt-1">Friendly fields, smooth toggles, live preview.</div>
                  </div>
                  <div className="rounded-2xl border border-[#edd9b9] bg-white/70 p-3 shadow-sm">
                    <div className="text-xs uppercase text-[#a26b2e] font-semibold">Tips</div>
                    <div className="text-xs text-[#7a6140] mt-1">Special offers stand out; prices auto-format.</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="col-span-2">
                    <div className="text-xs font-semibold text-[#7a6140] mb-1">Name</div>
                    <input
                      className="input-etched bg-white"
                      value={editingItem.name}
                      placeholder="e.g. Salmon Treats"
                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    />
                  </label>

                  <label>
                    <div className="text-xs font-semibold text-[#7a6140] mb-1">Species</div>
                    <select
                      className="input-etched bg-white"
                      value={editingItem.species || speciesTab}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          species: e.target.value,
                        })
                      }
                    >
                      {speciesList.map((sp) => (
                        <option key={sp.id} value={sp.slug}>
                          {sp.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <div className="text-xs font-semibold text-[#7a6140] mb-1">Category</div>
                    <select
                      className="input-etched bg-white"
                      value={editingItem.category_id}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          category_id: Number(e.target.value),
                        })
                      }
                    >
                      {categoriesForSpecies(editingItem.species || speciesTab).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="col-span-2">
                    <div className="text-xs font-semibold text-[#7a6140] mb-1">Description</div>
                    <textarea
                      className="input-etched bg-white"
                      rows={3}
                      placeholder="What makes this special?"
                      value={editingItem.description || ""}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          description: e.target.value,
                        })
                      }
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-4 col-span-2 items-start">
                    <div className="grid grid-cols-2 gap-2">
                      <label>
                        <div className="text-xs font-semibold text-[#7a6140] mb-1">Price (£)</div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="input-etched bg-white pr-2"
                          value={editingItem.price_display}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              price_display: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        <div className="text-xs font-semibold text-[#7a6140] mb-1">Old Price (£)</div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="input-etched bg-white"
                          value={editingItem.old_price_display}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              old_price_display: e.target.value,
                            })
                          }
                        />
                      </label>
                    </div>

                    <label>
                      <div className="text-xs font-semibold text-[#7a6140] mb-1">Upload Image</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            onUploadToDraft(
                              e.target.files[0],
                              setEditingItem,
                              setEditUploadStatus
                            )
                          }
                          className="text-sm"
                        />
                      </div>
                      {editUploadStatus.loading && (
                        <div className="text-xs text-[#7a6140] mt-1">Uploading…</div>
                      )}
                      {editUploadStatus.error && (
                        <div className="text-xs text-red-700 mt-1">{editUploadStatus.error}</div>
                      )}
                    </label>
                  </div>

                  <label className="col-span-2">
                    <div className="text-xs font-semibold text-[#7a6140] mb-1">Image URL</div>
                    <input
                      className="input-etched bg-white"
                      placeholder="https://..."
                      value={editingItem.image || ""}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          image: e.target.value,
                        })
                      }
                    />
                  </label>

                  {(editingItem.image || editingItem.image_preview) && (
                    <div className="col-span-2">
                      <div className="text-xs font-semibold text-[#7a6140] mb-1">Preview</div>
                      <img
                        src={previewSrc(editingItem)}
                        alt="Preview"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = IMAGE_FALLBACK;
                        }}
                        className="w-40 h-40 object-cover rounded-xl border border-[#e5d4b5] shadow-md"
                      />
                    </div>
                  )}

                  <div className="col-span-2 flex flex-wrap gap-4 items-center">
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#3f2817]">
                      <input
                        type="checkbox"
                        checked={!!editingItem.in_stock}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            in_stock: e.target.checked ? 1 : 0,
                          })
                        }
                      />
                      In stock
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#3f2817]">
                      <input
                        type="checkbox"
                        checked={!!editingItem.special_offer}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            special_offer: e.target.checked ? 1 : 0,
                          })
                        }
                      />
                      Special offer
                    </label>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-[#f9edd8] border-t border-[#ecdcc3] flex items-center justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-xl border border-[#e5d4b5] text-[#3f2817] bg-white hover:bg-[#fff6e5] transition"
                  onClick={() => {
                    setShowEdit(false);
                    setEditingItem(null);
                  }}
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-[#e0a25d] via-[#c78035] to-[#8c4a1e] shadow-lg hover:shadow-xl transition"
                  onClick={saveEdit}
                >
                  Save
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
