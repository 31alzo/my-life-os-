
/* ========================================
   MY LIFE OS — APPEARANCE MANAGER
   إدارة المظهر العام
======================================== */

"use strict";

(function (window) {
  if (window.AppearanceManager) {
    console.warn("[MY LIFE OS] AppearanceManager موجود مسبقًا.");
    return;
  }

  const THEMES = ["dark", "light", "system"];

  const ACCENT_COLORS = {
    gold: {
      title: "ذهبي",
      value: "#d6ad60"
    },
    blue: {
      title: "أزرق",
      value: "#5795e8"
    },
    green: {
      title: "أخضر",
      value: "#48a985"
    },
    purple: {
      title: "بنفسجي",
      value: "#a78bfa"
    },
    rose: {
      title: "وردي",
      value: "#e879a9"
    }
  };

  const DEFAULTS = {
    theme: "dark",
    accentColor: "gold"
  };

  let currentSettings = { ...DEFAULTS };
  let initialized = false;

  function getStorage() {
    return window.AppStorage || null;
  }

  function readSettings() {
    const storage = getStorage();

    if (!storage || typeof storage.get !== "function") {
      return { ...DEFAULTS };
    }

    try {
      const saved = storage.get("settings");

      if (!saved || typeof saved !== "object") {
        return { ...DEFAULTS };
      }

      return {
        theme: THEMES.includes(saved.theme)
          ? saved.theme
          : DEFAULTS.theme,

        accentColor: Object.prototype.hasOwnProperty.call(
          ACCENT_COLORS,
          saved.accentColor
        )
          ? saved.accentColor
          : DEFAULTS.accentColor
      };
    } catch (error) {
      console.error(
        "[MY LIFE OS] تعذرت قراءة إعدادات المظهر.",
        error
      );

      return { ...DEFAULTS };
    }
  }

  function getEffectiveTheme(theme) {
    if (theme !== "system") {
      return theme;
    }

    try {
      return window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    } catch (error) {
      return "dark";
    }
  }

  function applyTheme(theme) {
    const selectedTheme = THEMES.includes(theme)
      ? theme
      : DEFAULTS.theme;

    const effectiveTheme = getEffectiveTheme(selectedTheme);
    const root = document.documentElement;

    root.dataset.theme = effectiveTheme;
    root.style.colorScheme = effectiveTheme;

    return effectiveTheme;
  }

  function applyAccentColor(color) {
    const selectedColor = Object.prototype.hasOwnProperty.call(
      ACCENT_COLORS,
      color
    )
      ? color
      : DEFAULTS.accentColor;

    const root = document.documentElement;
    const value = ACCENT_COLORS[selectedColor].value;

    root.dataset.accent = selectedColor;
    root.style.setProperty("--accent", value);
    root.style.setProperty("--color-accent", value);

    return selectedColor;
  }

  function notifyChange() {
    if (
      window.AppEvents &&
      typeof window.AppEvents.emit === "function"
    ) {
      window.AppEvents.emit("appearance:changed", {
        ...currentSettings
      });
    }
  }

  function applyAll(options = {}) {
    const theme = applyTheme(currentSettings.theme);

    const accentColor = applyAccentColor(
      currentSettings.accentColor
    );

    if (options.notify !== false) {
      notifyChange();
    }

    return {
      theme,
      selectedTheme: currentSettings.theme,
      accentColor
    };
  }

  function persistSettings() {
    const storage = getStorage();

    if (!storage || typeof storage.set !== "function") {
      return false;
    }

    try {
      const existing = storage.get("settings");
      const settings =
        existing && typeof existing === "object"
          ? existing
          : {};

      return storage.set("settings", {
        ...settings,
        theme: currentSettings.theme,
        accentColor: currentSettings.accentColor
      }) !== false;
    } catch (error) {
      console.error(
        "[MY LIFE OS] تعذر حفظ إعدادات المظهر.",
        error
      );

      return false;
    }
  }

  function setTheme(theme) {
    if (!THEMES.includes(theme)) {
      return {
        success: false,
        message: "اختيار الوضع غير صالح."
      };
    }

    currentSettings.theme = theme;

    applyAll();
    const saved = persistSettings();

    return {
      success: true,
      theme,
      saved
    };
  }

  function setAccentColor(color) {
    if (!Object.prototype.hasOwnProperty.call(
      ACCENT_COLORS,
      color
    )) {
      return {
        success: false,
        message: "لون التمييز غير صالح."
      };
    }

    currentSettings.accentColor = color;

    applyAll();
    const saved = persistSettings();

    return {
      success: true,
      accentColor: color,
      saved
    };
  }

  function getSettings() {
    return { ...currentSettings };
  }

  function getAvailableThemes() {
    return [
      { id: "dark", title: "داكن" },
      { id: "light", title: "فاتح" },
      { id: "system", title: "حسب الجهاز" }
    ];
  }

  function getAvailableAccentColors() {
    return Object.keys(ACCENT_COLORS).map((id) => ({
      id,
      title: ACCENT_COLORS[id].title,
      value: ACCENT_COLORS[id].value
    }));
  }

  function initialize() {
    if (initialized) {
      return getSettings();
    }

    currentSettings = readSettings();

    applyAll({ notify: false });

    if (window.matchMedia) {
      try {
        const media = window.matchMedia(
          "(prefers-color-scheme: light)"
        );

        const handleSystemChange = () => {
          if (currentSettings.theme === "system") {
            applyTheme("system");
            notifyChange();
          }
        };

        if (typeof media.addEventListener === "function") {
          media.addEventListener("change", handleSystemChange);
        } else if (typeof media.addListener === "function") {
          media.addListener(handleSystemChange);
        }
      } catch (error) {
        console.warn(
          "[MY LIFE OS] تعذر متابعة مظهر الجهاز.",
          error
        );
      }
    }

    initialized = true;

    console.info("[MY LIFE OS] تمت تهيئة المظهر.");

    return getSettings();
  }

  window.AppearanceManager = Object.freeze({
    initialize,
    setTheme,
    setAccentColor,
    getSettings,
    getAvailableThemes,
    getAvailableAccentColors,
    apply: applyAll
  });

})(window);
