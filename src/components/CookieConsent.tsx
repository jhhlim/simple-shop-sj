"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SHOP_NAME } from "@/lib/constants";
import {
  applyFunctionalCookieRestrictions,
  COOKIE_CATEGORIES,
  hasCookieConsentDecision,
  loadCookiePreferences,
  preferencesFromChoice,
  saveCookiePreferences,
  type CookiePreferences,
} from "@/lib/cookie-consent";

export function CookieConsent() {
  const [bannerVisible, setBannerVisible] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [draft, setDraft] = useState<CookiePreferences>(preferencesFromChoice("all"));

  const refreshVisibility = useCallback(() => {
    setBannerVisible(!hasCookieConsentDecision());
  }, []);

  useEffect(() => {
    refreshVisibility();
    const existing = loadCookiePreferences();
    if (existing) setDraft(existing);

    const onSettings = () => {
      const prefs = loadCookiePreferences() ?? preferencesFromChoice("all");
      setDraft(prefs);
      setManageOpen(true);
      setBannerVisible(false);
    };

    const onUpdated = () => {
      applyFunctionalCookieRestrictions();
      refreshVisibility();
    };

    window.addEventListener("open-cookie-settings", onSettings);
    window.addEventListener("cookie-preferences-updated", onUpdated);
    return () => {
      window.removeEventListener("open-cookie-settings", onSettings);
      window.removeEventListener("cookie-preferences-updated", onUpdated);
    };
  }, [refreshVisibility]);

  function saveAndClose(prefs: CookiePreferences) {
    saveCookiePreferences(prefs);
    applyFunctionalCookieRestrictions();
    setDraft(prefs);
    setManageOpen(false);
    setBannerVisible(false);
  }

  function acceptAll() {
    saveAndClose(preferencesFromChoice("all"));
  }

  function acceptNecessaryOnly() {
    saveAndClose(preferencesFromChoice("necessary"));
  }

  function saveCustom() {
    saveAndClose({ ...draft, necessary: true, decidedAt: new Date().toISOString() });
  }

  if (!bannerVisible && !manageOpen) return null;

  return (
    <>
      {manageOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/40"
          aria-hidden
          onClick={() => setManageOpen(false)}
        />
      )}

      <div
        role="dialog"
        aria-label="Cookie preferences"
        className={`fixed inset-x-0 z-[70] border-t border-stone-200 bg-white shadow-lg ${
          manageOpen ? "bottom-0 max-h-[85vh] overflow-y-auto sm:bottom-4 sm:left-4 sm:right-4 sm:mx-auto sm:max-w-2xl sm:rounded-xl sm:border" : "bottom-0"
        }`}
      >
        <div className="mx-auto max-w-6xl p-4 sm:p-6">
          {!manageOpen ? (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-base font-semibold text-stone-900">Cookie preferences</h2>
                <p className="mt-2 text-sm text-stone-600">
                  {SHOP_NAME} uses cookies and similar technologies to run the shop, remember your
                  cart, and — with your permission — save optional preferences. See our{" "}
                  <Link href="/privacy" className="font-medium underline">
                    Privacy Policy
                  </Link>{" "}
                  for details.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={acceptAll}
                  className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
                >
                  Accept all
                </button>
                <button
                  type="button"
                  onClick={acceptNecessaryOnly}
                  className="rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium hover:bg-stone-50"
                >
                  Necessary only
                </button>
                <button
                  type="button"
                  onClick={() => setManageOpen(true)}
                  className="rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium hover:bg-stone-50"
                >
                  Manage preferences
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">Manage cookie preferences</h2>
                  <p className="mt-1 text-sm text-stone-600">
                    Choose which optional cookies we may use. Strictly necessary cookies are always
                    active.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setManageOpen(false)}
                  className="text-sm text-stone-500 hover:text-stone-800"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <ul className="space-y-3">
                {COOKIE_CATEGORIES.map((cat) => {
                  const enabled =
                    cat.id === "necessary" ? true : draft[cat.id as keyof Omit<CookiePreferences, "decidedAt" | "necessary">];
                  return (
                    <li
                      key={cat.id}
                      className="rounded-lg border border-stone-200 p-4 text-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-stone-900">{cat.title}</p>
                          <p className="mt-1 text-stone-600">{cat.description}</p>
                        </div>
                        {cat.required ? (
                          <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                            Always on
                          </span>
                        ) : (
                          <label className="flex shrink-0 items-center gap-2">
                            <span className="sr-only">Enable {cat.title}</span>
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={(e) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  [cat.id]: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 rounded border-stone-300"
                            />
                          </label>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="flex flex-col gap-2 border-t border-stone-200 pt-4 sm:flex-row">
                <button
                  type="button"
                  onClick={saveCustom}
                  className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
                >
                  Save preferences
                </button>
                <button
                  type="button"
                  onClick={acceptAll}
                  className="rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-medium hover:bg-stone-50"
                >
                  Accept all
                </button>
                <button
                  type="button"
                  onClick={acceptNecessaryOnly}
                  className="rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-medium hover:bg-stone-50"
                >
                  Necessary only
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
