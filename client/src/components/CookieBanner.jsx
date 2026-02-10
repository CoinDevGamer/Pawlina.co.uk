import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const COOKIE_PREFS_KEY = "cookie_preferences_v1";

const readPrefs = () => {
  try {
    const raw = localStorage.getItem(COOKIE_PREFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      essential: true,
      analytics: !!parsed.analytics,
      ts: parsed.ts || new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

const savePrefs = (prefs) => {
  localStorage.setItem(
    COOKIE_PREFS_KEY,
    JSON.stringify({
      essential: true,
      analytics: !!prefs.analytics,
      ts: new Date().toISOString(),
    })
  );
};

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const prefs = readPrefs();
    if (prefs) setAnalytics(!!prefs.analytics);
    // Show on every new page visit (new load), per request.
    setVisible(true);
  }, []);

  const acceptAll = () => {
    savePrefs({ analytics: true });
    setAnalytics(true);
    setVisible(false);
  };

  const acceptEssential = () => {
    savePrefs({ analytics: false });
    setAnalytics(false);
    setVisible(false);
  };

  const saveCustom = () => {
    savePrefs({ analytics });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[10000]">
      <div className="mx-auto max-w-3xl rounded-2xl border border-[#d8bf9a] bg-gradient-to-r from-[#fff8ec] via-[#fff3de] to-[#fae8c9] shadow-2xl p-4 md:p-5 text-[#3f2817]">
        <div className="text-lg font-bold">Cookie Notice</div>
        <p className="text-sm mt-1 text-[#5f442b]">
          We use essential cookies to keep sign-in, basket, and checkout working.
          You can optionally allow analytics cookies. See our{" "}
          <Link to="/cookies" className="underline font-semibold">
            Cookie Policy
          </Link>
          .
        </p>

        <div className="mt-3 p-3 rounded-xl border border-[#e6d2af] bg-white/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-sm font-semibold">
            Analytics cookies (optional)
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
            />
            Allow analytics
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          <button
            onClick={acceptEssential}
            className="px-3 py-2 rounded-xl border border-[#d8bf9a] bg-white text-[#3f2817] font-semibold"
          >
            Essential only
          </button>
          <button
            onClick={saveCustom}
            className="px-3 py-2 rounded-xl border border-[#d8bf9a] bg-[#fff4dd] text-[#3f2817] font-semibold"
          >
            Save preferences
          </button>
          <button
            onClick={acceptAll}
            className="px-3 py-2 rounded-xl border border-[#b98a46] bg-gradient-to-r from-[#f4d39a] to-[#d8aa62] text-[#2f1f13] font-semibold"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
