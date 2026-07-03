export const COOKIE_PREFERENCES_KEY = "limware-cookie-preferences";
const LEGACY_CONSENT_KEY = "limware-cookie-consent";

export type CookiePreferences = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
};

export const COOKIE_CATEGORIES = [
  {
    id: "necessary" as const,
    title: "Strictly necessary",
    description:
      "Required for the site to work — sign-in, shopping cart, checkout, security, and remembering your cookie choices. Cannot be disabled.",
    required: true,
  },
  {
    id: "functional" as const,
    title: "Functional",
    description:
      "Remembers optional preferences such as an applied coupon code to improve your shopping experience.",
    required: false,
  },
  {
    id: "analytics" as const,
    title: "Analytics",
    description:
      "Helps us understand how visitors use the site. LIMWARE does not currently use analytics cookies.",
    required: false,
  },
  {
    id: "marketing" as const,
    title: "Marketing",
    description:
      "Used for advertising and remarketing. LIMWARE does not currently use marketing cookies.",
    required: false,
  },
];

export function preferencesFromChoice(choice: "all" | "necessary"): CookiePreferences {
  const acceptOptional = choice === "all";
  return {
    necessary: true,
    functional: acceptOptional,
    analytics: acceptOptional,
    marketing: acceptOptional,
    decidedAt: new Date().toISOString(),
  };
}

export function loadCookiePreferences(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CookiePreferences;
      if (parsed && parsed.necessary === true) return parsed;
    }
    if (localStorage.getItem(LEGACY_CONSENT_KEY) === "accepted") {
      return preferencesFromChoice("all");
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveCookiePreferences(prefs: CookiePreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
  localStorage.removeItem(LEGACY_CONSENT_KEY);
  window.dispatchEvent(new CustomEvent("cookie-preferences-updated", { detail: prefs }));
}

export function hasCookieConsentDecision(): boolean {
  return loadCookiePreferences() !== null;
}

export function functionalCookiesAllowed(): boolean {
  return loadCookiePreferences()?.functional ?? false;
}

export function openCookieSettings(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("open-cookie-settings"));
}

export function applyFunctionalCookieRestrictions(): void {
  if (functionalCookiesAllowed()) return;
  try {
    localStorage.removeItem("lim-resale-coupon");
  } catch {
    // ignore
  }
}
