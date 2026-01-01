import React, { useEffect, useState } from "react";
import { Auth, api } from "../lib/api";

export default function AccountDrawer({
  open,
  onClose,
  user,
  setUser,
  onLogin,
  onLogout,
}) {
  const [tab, setTab] = useState("signin");

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
      setAddr((prev) => ({
        name: prev.name || user.name || "",
        address_line1: prev.address_line1 || user.address_line1 || "",
        address_line2: prev.address_line2 || user.address_line2 || "",
        city: prev.city || user.city || "",
        postcode: prev.postcode || user.postcode || "",
        country: prev.country || user.country || "",
      }));
      setTab("account");
    } else {
      // clear fields when logged out
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

  if (!open) return null;

  // Short handlers
  const change = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const changeAddr = (k, v) => setAddr((a) => ({ ...a, [k]: v }));

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

  // Save address
  const save = async () => {
    const error = validateAddress(addr);
    if (error) {
      alert(error);
      return;
    }
    await api.put("/account/me", addr);

    const updated = await Auth.me();
    setUser(updated);
    alert("Saved!");
  };

  // Auth
  const handleAuth = async () => {
    if (tab === "register") {
      if (!form.postcode) {
        alert("Please enter your postcode.");
        return;
      }

      if (!navigator.geolocation) {
        alert("Location access required.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };

          try {
            // include postcode (and other form fields) so backend can radius-check
            await onLogin({ ...form, ...coords }, true);
          } catch (err) {
            alert("You must be within 15 miles of Grange-over-Sands.");
          }
        },
        () => alert("Enable location access to register.")
      );
    } else {
      await onLogin(form, false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="absolute right-0 top-0 h-full w-full sm:w-[440px]
                   bg-[#fff8ef] shadow-2xl p-6 
                   overflow-y-auto animate-slideIn border-l border-[#d4b69c]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-2xl font-semibold text-[#7b4b2a] tracking-tight">
            {user ? "My Account" : "Sign in / Register"}
          </div>

          <button
            onClick={onClose}
            className="text-2xl text-[#c89b63] hover:text-[#7b4b2a] transition"
          >
            ✕
          </button>
        </div>

        {/* SIGN IN / REGISTER */}
        {!user && (
          <div className="space-y-5">
            {/* Tabs */}
            <div className="flex gap-2">
              <button
                className={`px-4 py-2 rounded-lg font-semibold border 
                  ${
                    tab === "signin"
                      ? "bg-[#7b4b2a] text-white border-transparent"
                      : "bg-white text-[#7b4b2a] border-[#d4b69c]"
                  }`}
                onClick={() => setTab("signin")}
              >
                Sign in
              </button>

              <button
                className={`px-4 py-2 rounded-lg font-semibold border 
                  ${
                    tab === "register"
                      ? "bg-[#7b4b2a] text-white border-transparent"
                      : "bg-white text-[#7b4b2a] border-[#d4b69c]"
                  }`}
                onClick={() => setTab("register")}
              >
                Register
              </button>
            </div>

            {/* Email */}
            <input
              className="input-etched"
              placeholder="Email"
              value={form.email}
              name="email"
              autoComplete="email"
              onChange={(e) => change("email", e.target.value)}
            />

            {/* Register-only fields */}
            {tab === "register" && (
              <>
                <input
                  className="input-etched"
                  placeholder="Full Name"
                  value={form.name}
                  name="fullName"
                  autoComplete="name"
                  onChange={(e) => change("name", e.target.value)}
                />

                <input
                  className="input-etched"
                  placeholder="City"
                  value={form.city}
                  name="city"
                  autoComplete="address-level2"
                  onChange={(e) => change("city", e.target.value)}
                />

                <input
                  className="input-etched"
                  placeholder="Postcode"
                  value={form.postcode}
                  name="postcode"
                  autoComplete="postal-code"
                  onChange={(e) => change("postcode", e.target.value)}
                />
              </>
            )}

            {/* Password */}
            <input
              className="input-etched"
              placeholder="Password"
              type="password"
              value={form.password}
              name="password"
              autoComplete={tab === "register" ? "new-password" : "current-password"}
              onChange={(e) => change("password", e.target.value)}
            />

            <button
              className="w-full bg-[#7b4b2a] text-white py-3 rounded-lg font-semibold mt-2 hover:bg-[#5f381d] transition"
              onClick={handleAuth}
            >
              {tab === "register" ? "Create Account" : "Sign In"}
            </button>
          </div>
        )}

        {/* ACCOUNT */}
        {user && (
          <div className="space-y-4">
            <div className="text-xl font-semibold text-[#7b4b2a]">
              Address Details
            </div>

            <input
              className="input-etched"
              placeholder="Full Name"
              value={addr.name}
              maxLength={120}
              name="addr_name"
              autoComplete="name"
              onChange={(e) => changeAddr("name", e.target.value)}
            />

            <input
              className="input-etched"
              placeholder="Address Line 1"
              value={addr.address_line1}
              maxLength={160}
              name="addr_line1"
              autoComplete="address-line1"
              onChange={(e) => changeAddr("address_line1", e.target.value)}
            />

            <input
              className="input-etched"
              placeholder="Address Line 2"
              value={addr.address_line2}
              maxLength={160}
              name="addr_line2"
              autoComplete="address-line2"
              onChange={(e) => changeAddr("address_line2", e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                className="input-etched"
                placeholder="City"
                value={addr.city}
                maxLength={120}
                name="addr_city"
                autoComplete="address-level2"
                onChange={(e) => changeAddr("city", e.target.value)}
              />

              <input
                className="input-etched"
                placeholder="Postcode"
                value={addr.postcode}
                maxLength={12}
                name="addr_postcode"
                autoComplete="postal-code"
                onChange={(e) => changeAddr("postcode", e.target.value)}
              />
            </div>

            <input
              className="input-etched"
              placeholder="Country"
              value={addr.country}
              maxLength={120}
              name="addr_country"
              autoComplete="country-name"
              onChange={(e) => changeAddr("country", e.target.value)}
            />

            <div className="flex gap-3 pt-3">
              <button className="btn-rivet" onClick={save}>
                Save
              </button>
              <button className="btn-rivet" onClick={onLogout}>
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Animations */}
      <style>
        {`
        .animate-fadeIn {
          animation: fadeIn .25s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0 }
          to { opacity: 1 }
        }

        .animate-slideIn {
          animation: slideIn .35s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        @keyframes slideIn {
          from { transform: translateX(100%) }
          to { transform: translateX(0) }
        }

        .input-etched {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid #d4b69c;
          background: #fffdf9;
          outline: none;
          transition: 0.2s border;
        }
        .input-etched:focus {
          border-color: #b7895d;
          background: #fffaf3;
        }
      `}
      </style>
    </div>
  );
}
