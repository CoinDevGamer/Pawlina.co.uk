import React, { useEffect, useState } from "react";
import { Auth, api } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";

export default function AccountDrawer({
  open,
  onClose,
  user,
  setUser,
  onLogin,
  onLogout,
}) {
  const [tab, setTab] = useState("signin");
  const [resetStep, setResetStep] = useState(0); // 0=off, 1=request, 2=verify
  const [resetBusy, setResetBusy] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  const [deleteStep, setDeleteStep] = useState(0); // 0=off, 1=warning, 2=password
  const [deletePassword, setDeletePassword] = useState("");
  const [themeMode, setThemeMode] = useState(
    localStorage.getItem("themeMode") || "light"
  );

  useEffect(() => {
    if (themeMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("themeMode", themeMode);
  }, [themeMode]);

  // FORM (sign in / register)
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    city: "",
    postcode: "",
  });

  // ADDRESS (account view)
  const [addr, setAddr] = useState({
    name: "",
    address_line1: "",
    address_line2: "",
    city: "",
    postcode: "",
    country: "",
  });

  // Prefill on user login
  useEffect(() => {
    if (user) {
      setAddr({
        name: user.name || "",
        address_line1: user.address_line1 || "",
        address_line2: user.address_line2 || "",
        city: user.city || "",
        postcode: user.postcode || "",
        country: user.country || "",
      });
      setTab("account");
      setResetStep(0);
    } else {
      setAddr({
        name: "",
        address_line1: "",
        address_line2: "",
        city: "",
        postcode: "",
        country: "",
      });
      setTab("signin");
    }
  }, [user]);

  const change = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const changeAddr = (k, v) => setAddr((a) => ({ ...a, [k]: v }));

  const startReset = () => {
    setResetEmail(form.email || "");
    setResetCode("");
    setResetPassword("");
    setResetStep(1);
  };

  const sendResetCode = async () => {
    if (resetBusy) return;
    setResetBusy(true);
    try {
      await api.post("/auth/forgot-password", { email: resetEmail });
      setResetStep(2);
      alert("If the email exists, a code has been sent.");
    } catch (err) {
      alert("Could not send reset code.");
    } finally {
      setResetBusy(false);
    }
  };

  const submitReset = async () => {
    if (resetBusy) return;
    setResetBusy(true);
    try {
      await api.post("/auth/reset-password", {
        email: resetEmail,
        code: resetCode,
        password: resetPassword,
      });
      alert("Password updated. Please sign in.");
      setForm((f) => ({ ...f, email: resetEmail, password: "" }));
      setResetStep(0);
      setTab("signin");
    } catch (err) {
      alert(err?.response?.data?.error || "Reset failed.");
    } finally {
      setResetBusy(false);
    }
  };

  const validateAddress = (payload) => {
    const fields = [
      ["name", "Full Name"],
      ["address_line1", "Address Line 1"],
      ["city", "City"],
      ["postcode", "Postcode"],
      ["country", "Country"],
    ];
    for (const [key, label] of fields) {
      const val = (payload[key] || "").trim();
      if (val.length < 2) return `${label} must be at least 2 characters.`;
      if (val.length > 120) return `${label} is too long.`;
    }
    const pc = payload.postcode.trim();
    if (pc.length < 4 || pc.length > 12) return "Postcode looks invalid.";
    return null;
  };

  const save = async () => {
    const error = validateAddress(addr);
    if (error) {
      alert(error);
      return;
    }
    try {
      const updated = await api.put("/account/me", addr).then((r) => r.data);
      setUser(updated);
      alert("Saved!");
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to save address.");
    }
  };

  const handleAuth = async () => {
    if (tab === "register") {
      if (!form.postcode) {
        alert("Please enter your postcode.");
        return;
      }

      if (!navigator.geolocation) {
        alert("Location access is required to confirm you are within our delivery area.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };

          try {
            await onLogin({ ...form, ...coords }, true);
          } catch (err) {
            alert("You must be within 15 miles of Grange-over-Sands.");
          }
        },
        () => alert("Enable location access to confirm you are within our delivery area.")
      );
    } else {
      await onLogin(form, false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      if (!deletePassword) {
        alert("Password is required to delete your account.");
        return;
      }
      await api.delete("/account/me", { data: { password: deletePassword } });
      alert("Account successfully deleted.");
      onLogout();
      onClose();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to delete account. Incorrect password?");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[9999]"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%", opacity: 0, scale: 0.95 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-[100dvh] w-full sm:w-[480px] bg-white shadow-[-20px_0_40px_rgba(44,37,32,0.1)] z-[10000] flex flex-col overflow-hidden"
          >
            {/* HEADER */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-surface-200 bg-surface-50 backdrop-blur-md sticky top-0 z-10">
              <div className="text-3xl font-black font-heading tracking-tight text-ink flex items-center gap-3">
                <span className="text-3xl">👤</span> {user ? "My Account" : "Welcome"}
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-surface-200 text-ink hover:text-brand-600 hover:bg-brand-50 hover:border-brand-200 transition-colors shadow-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
              {/* SIGN IN / REGISTER */}
              {!user && (
                <div className="space-y-6">
                  {resetStep > 0 ? (
                    <div className="space-y-5 animate-fade-in">
                      <div className="text-2xl font-bold font-heading text-ink">
                        Reset password
                      </div>

                      {resetStep === 1 && (
                        <>
                          <input
                            className="input-modern"
                            placeholder="Email address"
                            value={resetEmail}
                            name="resetEmail"
                            autoComplete="email"
                            onChange={(e) => setResetEmail(e.target.value)}
                          />
                          <button
                            className="btn-primary w-full shadow-float"
                            onClick={sendResetCode}
                            disabled={resetBusy}
                          >
                            {resetBusy ? "Sending..." : "Send Reset Code"}
                          </button>
                          <div className="text-sm text-ink-muted leading-relaxed font-light bg-surface-50 p-4 rounded-xl border border-surface-200">
                            Check your spam folder. If you don’t receive the email within a few minutes,
                            please contact the shop.
                          </div>
                        </>
                      )}

                      {resetStep === 2 && (
                        <>
                          <input
                            className="input-modern"
                            placeholder="6-digit verification code"
                            value={resetCode}
                            name="resetCode"
                            autoComplete="one-time-code"
                            onChange={(e) => setResetCode(e.target.value)}
                          />
                          <input
                            className="input-modern"
                            placeholder="New password"
                            type="password"
                            value={resetPassword}
                            name="resetPassword"
                            autoComplete="new-password"
                            onChange={(e) => setResetPassword(e.target.value)}
                          />
                          <button
                            className="btn-primary w-full shadow-float"
                            onClick={submitReset}
                            disabled={resetBusy}
                          >
                            {resetBusy ? "Updating..." : "Update Password"}
                          </button>
                          <div className="text-sm text-ink-muted bg-surface-50 p-4 rounded-xl border border-surface-200">
                            If you didn’t get a code, go back and request a new one or contact the shop.
                          </div>
                        </>
                      )}

                      <button
                        className="text-sm font-bold text-brand-600 hover:text-brand-700 transition"
                        onClick={() => setResetStep(0)}
                        type="button"
                      >
                        ← Back to sign in
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-fade-in">
                      {/* Tabs */}
                      <div className="flex bg-surface-100 p-1.5 rounded-2xl">
                        <button
                          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                            tab === "signin"
                              ? "bg-white text-ink shadow-sm"
                              : "text-ink-muted hover:text-ink hover:bg-white/50"
                          }`}
                          onClick={() => setTab("signin")}
                        >
                          Sign in
                        </button>
                        <button
                          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                            tab === "register"
                              ? "bg-white text-ink shadow-sm"
                              : "text-ink-muted hover:text-ink hover:bg-white/50"
                          }`}
                          onClick={() => setTab("register")}
                        >
                          Register
                        </button>
                      </div>

                      <div className="space-y-4">
                        <input
                          className="input-modern"
                          placeholder="Email address"
                          value={form.email}
                          name="email"
                          autoComplete="email"
                          onChange={(e) => change("email", e.target.value)}
                        />

                        {tab === "register" && (
                          <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:"auto"}} className="space-y-4 overflow-hidden">
                            <input
                              className="input-modern"
                              placeholder="Full Name"
                              value={form.name}
                              name="fullName"
                              autoComplete="name"
                              onChange={(e) => change("name", e.target.value)}
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <input
                                className="input-modern"
                                placeholder="City"
                                value={form.city}
                                name="city"
                                autoComplete="address-level2"
                                onChange={(e) => change("city", e.target.value)}
                              />
                              <input
                                className="input-modern"
                                placeholder="Postcode"
                                value={form.postcode}
                                name="postcode"
                                autoComplete="postal-code"
                                onChange={(e) => change("postcode", e.target.value)}
                              />
                            </div>
                            <div className="text-[11px] font-medium text-brand-600 bg-brand-50 px-3 py-2 rounded-lg border border-brand-100">
                              📍 We only use your location to confirm you are within 15 miles of Grange-over-Sands.
                            </div>
                          </motion.div>
                        )}

                        <input
                          className="input-modern"
                          placeholder="Password"
                          type="password"
                          value={form.password}
                          name="password"
                          autoComplete={tab === "register" ? "new-password" : "current-password"}
                          onChange={(e) => change("password", e.target.value)}
                        />

                        {tab === "signin" && (
                          <div className="flex justify-end pt-1">
                            <button
                              className="text-sm font-bold text-brand-600 hover:text-brand-700 transition"
                              onClick={startReset}
                              type="button"
                            >
                              Forgot password?
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        className="btn-primary w-full py-4 text-lg shadow-float mt-2"
                        onClick={handleAuth}
                      >
                        {tab === "register" ? "Create Account" : "Sign In securely"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ACCOUNT VIEW */}
              {user && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex bg-surface-100 p-1.5 rounded-2xl mb-4">
                    <button
                      className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        tab === "account"
                          ? "bg-white text-ink shadow-sm"
                          : "text-ink-muted hover:text-ink hover:bg-white/50"
                      }`}
                      onClick={() => setTab("account")}
                    >
                      Profile
                    </button>
                    <button
                      className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        tab === "settings"
                          ? "bg-white text-ink shadow-sm"
                          : "text-ink-muted hover:text-ink hover:bg-white/50"
                      }`}
                      onClick={() => {
                        setTab("settings");
                        setDeleteStep(0);
                        setDeletePassword("");
                      }}
                    >
                      Settings
                    </button>
                  </div>

                  {tab === "account" && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-6">
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-float mb-8">
                        <div className="text-xl font-bold font-heading">Hello, {user.name?.split(" ")[0] || "Friend"}!</div>
                        <div className="text-white/80 text-sm mt-1">{user.email}</div>
                      </div>

                      <h3 className="text-[11px] font-bold tracking-widest uppercase text-brand-600 border-b border-surface-200 pb-2 mb-4">
                        Delivery & Address Details
                      </h3>

                      <div className="space-y-4">
                        <input
                          className="input-modern"
                          placeholder="Full Name"
                          value={addr.name}
                          maxLength={120}
                          name="addr_name"
                          autoComplete="name"
                          onChange={(e) => changeAddr("name", e.target.value)}
                        />

                        <input
                          className="input-modern"
                          placeholder="Address Line 1"
                          value={addr.address_line1}
                          maxLength={160}
                          name="addr_line1"
                          autoComplete="address-line1"
                          onChange={(e) => changeAddr("address_line1", e.target.value)}
                        />

                        <input
                          className="input-modern"
                          placeholder="Address Line 2 (Optional)"
                          value={addr.address_line2}
                          maxLength={160}
                          name="addr_line2"
                          autoComplete="address-line2"
                          onChange={(e) => changeAddr("address_line2", e.target.value)}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <input
                            className="input-modern"
                            placeholder="City"
                            value={addr.city}
                            maxLength={120}
                            name="addr_city"
                            autoComplete="address-level2"
                            onChange={(e) => changeAddr("city", e.target.value)}
                          />

                          <input
                            className="input-modern"
                            placeholder="Postcode"
                            value={addr.postcode}
                            maxLength={12}
                            name="addr_postcode"
                            autoComplete="postal-code"
                            onChange={(e) => changeAddr("postcode", e.target.value)}
                          />
                        </div>

                        <input
                          className="input-modern"
                          placeholder="Country"
                          value={addr.country}
                          maxLength={120}
                          name="addr_country"
                          autoComplete="country-name"
                          onChange={(e) => changeAddr("country", e.target.value)}
                        />
                      </div>

                      <div className="flex gap-4 pt-6">
                        <button className="flex-1 btn-primary" onClick={save}>
                          Save Address
                        </button>
                        <button className="flex-1 btn-secondary" onClick={onLogout}>
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {tab === "settings" && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-8">
                      <div>
                        <h3 className="text-[11px] font-bold tracking-widest uppercase text-brand-600 border-b border-surface-200 pb-2 mb-4">
                          Preferences
                        </h3>
                        <div className="flex bg-surface-50 rounded-2xl p-1.5 border border-surface-200 shadow-inner">
                          <button
                            onClick={() => setThemeMode("light")}
                            className={`flex-1 py-3 text-center font-bold text-sm transition-colors rounded-xl ${
                              themeMode === "light" ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink/70"
                            }`}
                          >
                            ☀️ Light Mode
                          </button>
                          <button
                            onClick={() => setThemeMode("dark")}
                            className={`flex-1 py-3 text-center font-bold text-sm transition-colors rounded-xl ${
                              themeMode === "dark" ? "bg-ink text-white shadow-sm" : "text-ink-muted hover:text-ink/70"
                            }`}
                          >
                            🌙 Dark Mode
                          </button>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-[11px] font-bold tracking-widest uppercase text-red-600 border-b border-red-200 pb-2 mb-4">
                          Danger Zone
                        </h3>
                        
                        {deleteStep === 0 && (
                          <div className="card-surface p-5 border-red-100 bg-red-50/30">
                            <p className="text-sm text-red-800 font-medium mb-4 leading-relaxed">
                              Deleting your account is permanent. All associated data will be removed.
                            </p>
                            <button
                              className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 font-bold rounded-xl transition-colors text-sm w-full"
                              onClick={() => setDeleteStep(1)}
                            >
                              Delete Account
                            </button>
                          </div>
                        )}

                        {deleteStep === 1 && (
                          <div className="card-surface p-5 border-red-200 bg-red-50">
                            <div className="text-red-600 font-bold mb-2">Are you absolutely sure?</div>
                            <p className="text-sm text-red-800 mb-4 leading-relaxed">
                              This action cannot be undone. You will lose access to your delivery history.
                            </p>
                            <div className="flex gap-3">
                              <button
                                className="flex-1 px-4 py-2 bg-white text-ink hover:bg-surface-100 font-bold rounded-xl transition-colors text-sm border border-surface-200 shadow-sm"
                                onClick={() => setDeleteStep(0)}
                              >
                                Cancel
                              </button>
                              <button
                                className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 font-bold rounded-xl transition-colors text-sm shadow-sm"
                                onClick={() => setDeleteStep(2)}
                              >
                                Yes, delete
                              </button>
                            </div>
                          </div>
                        )}

                        {deleteStep === 2 && (
                          <div className="card-surface p-5 border-red-200 bg-red-50">
                            <div className="text-red-600 font-bold mb-2">Final Verification</div>
                            <p className="text-sm text-red-800 mb-4 leading-relaxed">
                              Please enter your password to permanently delete your account.
                            </p>
                            <input
                              type="password"
                              className="input-modern mb-4 bg-white"
                              placeholder="Your password"
                              value={deletePassword}
                              onChange={(e) => setDeletePassword(e.target.value)}
                            />
                            <div className="flex gap-3">
                              <button
                                className="flex-1 px-4 py-2 bg-white text-ink hover:bg-surface-100 font-bold rounded-xl transition-colors text-sm border border-surface-200 shadow-sm"
                                onClick={() => {
                                  setDeleteStep(0);
                                  setDeletePassword("");
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 font-bold rounded-xl transition-colors text-sm shadow-sm"
                                onClick={handleDeleteAccount}
                              >
                                Confirm Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
