
/* ========================================
   MY LIFE OS — SETTINGS MANAGER
   إدارة إعدادات التطبيق
======================================== */

"use strict";

(function (window) {
  if (window.SettingsManager) {
    console.warn("[MY LIFE OS] SettingsManager موجود مسبقًا.");
    return;
  }

  const DEFAULT_SETTINGS = {
    language: "ar",
    direction: "rtl",
    theme: "dark",
    accentColor: "gold",
    startPage: "dashboard",
    weekStartsOn: 6,
    notificationsEnabled: true,
    confirmBeforeDelete: true,
    compactMode: false,
    showCompletedTasks: true,
    dailyReminderEnabled: false,
    dailyReminderTime: "20:00"
  };

  const ALLOWED_THEMES = ["dark", "light", "system"];

  const ALLOWED_ACCENTS = [
    "gold",
    "blue",
    "green",
    "purple",
    "rose"
  ];

  const ALLOWED_START_PAGES = [
    "dashboard",
    "goals",
    "tasks",
    "schedule",
    "habits",
    "plan90",
    "reviews",
    "health",
    "sport",
    "learning",
    "career",
    "finance",
    "relationships",
    "digital-life",
    "notes",
    "memo",
    "analytics",
    "settings"
  ];

  let settings = { ...DEFAULT_SETTINGS };
  let initialized = false;

  function getStorage() {
    return window.AppStorage || null;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readSavedSettings() {
    const storage = getStorage();

    if (!storage || typeof storage.get !== "function") {
      return {};
    }

    try {
      const saved = storage.get("settings");

      if (
        !saved ||
        typeof saved !== "object" ||
        Array.isArray(saved)
      ) {
        return {};
      }

      return saved;
    } catch (error) {
      console.error(
        "[MY LIFE OS] تعذرت قراءة الإعدادات.",
        error
      );

      return {};
    }
  }

  function normalizeSettings(saved) {
    const result = {
      ...DEFAULT_SETTINGS,
      ...saved
    };

    result.language = "ar";
    result.direction = "rtl";

    if (!ALLOWED_THEMES.includes(result.theme)) {
      result.theme = DEFAULT_SETTINGS.theme;
    }

    if (!ALLOWED_ACCENTS.includes(result.accentColor)) {
      result.accentColor = DEFAULT_SETTINGS.accentColor;
    }

    if (!ALLOWED_START_PAGES.includes(result.startPage)) {
      result.startPage = DEFAULT_SETTINGS.startPage;
    }

    if (
      !Number.isInteger(result.weekStartsOn) ||
      result.weekStartsOn < 0 ||
      result.weekStartsOn > 6
    ) {
      result.weekStartsOn = DEFAULT_SETTINGS.weekStartsOn;
    }

    [
      "notificationsEnabled",
      "confirmBeforeDelete",
      "compactMode",
      "showCompletedTasks",
      "dailyReminderEnabled"
    ].forEach((key) => {
      result[key] = Boolean(result[key]);
    });

    if (
      typeof result.dailyReminderTime !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(
        result.dailyReminderTime
      )
    ) {
      result.dailyReminderTime =
        DEFAULT_SETTINGS.dailyReminderTime;
    }

    return result;
  }

  function saveSettings() {
    const storage = getStorage();

    if (!storage || typeof storage.set !== "function") {
      return false;
    }

    try {
      return storage.set("settings", clone(settings)) !== false;
    } catch (error) {
      console.error(
        "[MY LIFE OS] تعذر حفظ الإعدادات.",
        error
      );

      return false;
    }
  }

  function emitChange(key, value) {
    if (
      window.AppEvents &&
      typeof window.AppEvents.emit === "function"
    ) {
      window.AppEvents.emit("settings:changed", {
        key,
        value,
        settings: getAll()
      });
    }
  }

  function applyAppearance() {
    const appearance = window.AppearanceManager;

    if (!appearance) {
      return;
    }

    if (typeof appearance.setTheme === "function") {
      /*
       * setTheme تحفظ إعدادات المظهر بنفسها.
       * لذلك نطبقها فقط عند اختلاف القيمة الحالية.
       */
      const current = appearance.getSettings();

      if (current.theme !== settings.theme) {
        appearance.setTheme(settings.theme);
      }
    }

    if (typeof appearance.setAccentColor === "function") {
      const current = appearance.getSettings();

      if (current.accentColor !== settings.accentColor) {
        appearance.setAccentColor(settings.accentColor);
      }
    }
  }

  function initialize() {
    if (initialized) {
      return getAll();
    }

    settings = normalizeSettings(readSavedSettings());

    /*
     * حفظ القيم الافتراضية والقيم المصححة
     * دون حذف بقية بيانات التطبيق.
     */
    saveSettings();

    initialized = true;

    if (window.AppearanceManager) {
      applyAppearance();
    }

    if (window.AppEvents) {
      window.AppEvents.emit("settings:initialized", getAll());
    }

    console.info("[MY LIFE OS] تمت تهيئة الإعدادات.");

    return getAll();
  }

  function get(key) {
    if (
      typeof key !== "string" ||
      !Object.prototype.hasOwnProperty.call(settings, key)
    ) {
      return undefined;
    }

    return settings[key];
  }

  function getAll() {
    return clone(settings);
  }

  function set(key, value) {
    if (
      typeof key !== "string" ||
      !Object.prototype.hasOwnProperty.call(
        DEFAULT_SETTINGS,
        key
      )
    ) {
      return {
        success: false,
        message: "الإعداد المطلوب غير معروف."
      };
    }

    const candidate = normalizeSettings({
      ...settings,
      [key]: value
    });

    /*
     * منع القيم غير المقبولة بدل حفظها.
     */
    if (
      key === "theme" &&
      !ALLOWED_THEMES.includes(value)
    ) {
      return {
        success: false,
        message: "الوضع المحدد غير صالح."
      };
    }

    if (
      key === "accentColor" &&
      !ALLOWED_ACCENTS.includes(value)
    ) {
      return {
        success: false,
        message: "لون التمييز غير صالح."
      };
    }

    if (
      key === "startPage" &&
      !ALLOWED_START_PAGES.includes(value)
    ) {
      return {
        success: false,
        message: "صفحة البداية غير معروفة."
      };
    }

    if (
      key === "weekStartsOn" &&
      (!Number.isInteger(value) || value < 0 || value > 6)
    ) {
      return {
        success: false,
        message: "يجب أن يكون أول يوم في الأسبوع رقمًا من 0 إلى 6."
      };
    }

    if (
      [
        "notificationsEnabled",
        "confirmBeforeDelete",
        "compactMode",
        "showCompletedTasks",
        "dailyReminderEnabled"
      ].includes(key) &&
      typeof value !== "boolean"
    ) {
      return {
        success: false,
        message: "هذه القيمة يجب أن تكون منطقية."
      };
    }

    if (
      key === "dailyReminderTime" &&
      (
        typeof value !== "string" ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)
      )
    ) {
      return {
        success: false,
        message: "صيغة الوقت غير صحيحة."
      };
    }

    settings = candidate;

    const saved = saveSettings();

    if (
      key === "theme" ||
      key === "accentColor"
    ) {
      applyAppearance();
    }

    emitChange(key, settings[key]);

    return {
      success: true,
      key,
      value: settings[key],
      saved
    };
  }

  function update(values) {
    if (
      !values ||
      typeof values !== "object" ||
      Array.isArray(values)
    ) {
      return {
        success: false,
        message: "يجب تقديم مجموعة إعدادات صحيحة."
      };
    }

    const previous = getAll();

    for (const key of Object.keys(values)) {
      if (
        !Object.prototype.hasOwnProperty.call(
          DEFAULT_SETTINGS,
          key
        )
      ) {
        return {
          success: false,
          message: "إعداد غير معروف: " + key
        };
      }

      const result = set(key, values[key]);

      if (!result.success) {
        settings = previous;
        saveSettings();
        applyAppearance();

        return result;
      }
    }

    return {
      success: true,
      settings: getAll()
    };
  }

  function reset() {
    settings = { ...DEFAULT_SETTINGS };

    const saved = saveSettings();

    applyAppearance();

    if (window.AppEvents) {
      window.AppEvents.emit("settings:reset", getAll());
    }

    return {
      success: true,
      saved,
      settings: getAll()
    };
  }

  function getDefaults() {
    return { ...DEFAULT_SETTINGS };
  }

  window.SettingsManager = Object.freeze({
    initialize,
    get,
    getAll,
    set,
    update,
    reset,
    getDefaults
  });

})(window);
