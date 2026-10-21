/* ========================================
   MY LIFE OS — SETTINGS MANAGER
   File: settings.js
   Version: 2.0.0
   إدارة إعدادات التطبيق
======================================== */

"use strict";

(function (window) {
  if (window.SettingsManager) {
    console.warn(
      "[MY LIFE OS] SettingsManager موجود مسبقًا."
    );
    return;
  }

  const STORAGE_KEY = "settings";

  const DEFAULT_SETTINGS = Object.freeze({
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
  });

  const ALLOWED_THEMES = Object.freeze([
    "dark",
    "light",
    "system"
  ]);

  const ALLOWED_ACCENTS = Object.freeze([
    "gold",
    "blue",
    "green",
    "purple",
    "rose"
  ]);

  const ALLOWED_START_PAGES = Object.freeze([
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
  ]);

  const BOOLEAN_KEYS = Object.freeze([
    "notificationsEnabled",
    "confirmBeforeDelete",
    "compactMode",
    "showCompletedTasks",
    "dailyReminderEnabled"
  ]);

  const SETTING_KEYS = Object.freeze(
    Object.keys(DEFAULT_SETTINGS)
  );

  let settings = createDefaults();
  let initialized = false;

  function createDefaults() {
    return { ...DEFAULT_SETTINGS };
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(
      object,
      key
    );
  }

  function isObject(value) {
    return value !== null &&
      typeof value === "object" &&
      !Array.isArray(value);
  }

  function clone(value) {
    if (
      window.AppUtils &&
      typeof window.AppUtils.clone === "function"
    ) {
      return window.AppUtils.clone(value);
    }

    return JSON.parse(JSON.stringify(value));
  }

  function getStorage() {
    return window.AppStorage || null;
  }

  function isValidTime(value) {
    return typeof value === "string" &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  }

  function isValidSettingValue(key, value) {
    switch (key) {
      case "language":
        return value === "ar";

      case "direction":
        return value === "rtl";

      case "theme":
        return ALLOWED_THEMES.includes(value);

      case "accentColor":
        return ALLOWED_ACCENTS.includes(value);

      case "startPage":
        return ALLOWED_START_PAGES.includes(value);

      case "weekStartsOn":
        return Number.isInteger(value) &&
          value >= 0 &&
          value <= 6;

      case "notificationsEnabled":
      case "confirmBeforeDelete":
      case "compactMode":
      case "showCompletedTasks":
      case "dailyReminderEnabled":
        return typeof value === "boolean";

      case "dailyReminderTime":
        return isValidTime(value);

      default:
        return false;
    }
  }

  function validationMessage(key) {
    const messages = {
      language: "اللغة المدعومة حاليًا هي العربية.",
      direction: "اتجاه الواجهة المعتمد هو RTL.",
      theme: "الوضع المحدد غير صالح.",
      accentColor: "لون التمييز غير صالح.",
      startPage: "صفحة البداية غير معروفة.",
      weekStartsOn:
        "يجب أن يكون أول يوم في الأسبوع رقمًا من 0 إلى 6.",
      notificationsEnabled:
        "تفعيل الإشعارات يجب أن يكون قيمة منطقية.",
      confirmBeforeDelete:
        "تأكيد الحذف يجب أن يكون قيمة منطقية.",
      compactMode:
        "الوضع المضغوط يجب أن يكون قيمة منطقية.",
      showCompletedTasks:
        "إظهار المهام المكتملة يجب أن يكون قيمة منطقية.",
      dailyReminderEnabled:
        "التذكير اليومي يجب أن يكون قيمة منطقية.",
      dailyReminderTime:
        "صيغة الوقت غير صحيحة. استخدم HH:MM."
    };

    return messages[key] || "قيمة الإعداد غير صالحة.";
  }

  function readSavedSettings() {
    const storage = getStorage();

    if (!storage || typeof storage.get !== "function") {
      return {};
    }

    try {
      const saved = storage.get(STORAGE_KEY);

      if (!isObject(saved)) {
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
    const result = createDefaults();

    if (!isObject(saved)) {
      return result;
    }

    SETTING_KEYS.forEach(key => {
      if (
        hasOwn(saved, key) &&
        isValidSettingValue(key, saved[key])
      ) {
        result[key] = saved[key];
      }
    });

    /*
     * اللغة العربية واتجاه RTL ثابتان في النسخة الحالية.
     * القيم المحفوظة المخالفة لا تُعتمد.
     */
    result.language = "ar";
    result.direction = "rtl";

    return result;
  }

  function storageWrite(value) {
    const storage = getStorage();

    if (!storage || typeof storage.set !== "function") {
      return {
        success: false,
        message: "خدمة التخزين غير متاحة."
      };
    }

    try {
      const result = storage.set(
        STORAGE_KEY,
        clone(value)
      );

      if (
        result === false ||
        (
          isObject(result) &&
          result.success === false
        )
      ) {
        return {
          success: false,
          message: (
            isObject(result) && result.message
          ) || "تعذر حفظ الإعدادات."
        };
      }

      return {
        success: true,
        message: "تم حفظ الإعدادات."
      };
    } catch (error) {
      console.error(
        "[MY LIFE OS] تعذر حفظ الإعدادات.",
        error
      );

      return {
        success: false,
        message: "حدث خطأ أثناء حفظ الإعدادات."
      };
    }
  }

  function emitEvent(name, detail) {
    try {
      if (
        window.AppEvents &&
        typeof window.AppEvents.emit === "function"
      ) {
        window.AppEvents.emit(name, detail);
        return;
      }

      if (typeof window.CustomEvent === "function") {
        window.dispatchEvent(
          new window.CustomEvent(name, {
            detail: detail
          })
        );
      }
    } catch (error) {
      console.error(
        "[MY LIFE OS] تعذر إرسال الحدث:",
        name,
        error
      );
    }
  }

  function emitChange(key, value) {
    emitEvent("settings:changed", {
      key: key,
      value: value,
      settings: getAll()
    });
  }

  function safeAppearanceSettings(appearance) {
    if (
      !appearance ||
      typeof appearance.getSettings !== "function"
    ) {
      return null;
    }

    try {
      const value = appearance.getSettings();

      return isObject(value) ? value : null;
    } catch (error) {
      console.error(
        "[MY LIFE OS] تعذرت قراءة إعدادات المظهر.",
        error
      );

      return null;
    }
  }

  function applyAppearance() {
    const appearance = window.AppearanceManager;

    if (!appearance) {
      return {
        success: true,
        skipped: true
      };
    }

    const current = safeAppearanceSettings(appearance);

    try {
      if (
        typeof appearance.setTheme === "function" &&
        (
          !current ||
          current.theme !== settings.theme
        )
      ) {
        const result = appearance.setTheme(settings.theme);

        if (
          result === false ||
          (
            isObject(result) &&
            result.success === false
          )
        ) {
          throw new Error("تعذر تطبيق سمة التطبيق.");
        }
      }

      /*
       * أعد قراءة إعدادات المظهر لأن setTheme قد يحدّثها.
       */
      const latest = safeAppearanceSettings(appearance);

      if (
        typeof appearance.setAccentColor === "function" &&
        (
          !latest ||
          latest.accentColor !== settings.accentColor
        )
      ) {
        const result = appearance.setAccentColor(
          settings.accentColor
        );

        if (
          result === false ||
          (
            isObject(result) &&
            result.success === false
          )
        ) {
          throw new Error("تعذر تطبيق لون التمييز.");
        }
      }

      return { success: true };
    } catch (error) {
      console.error(
        "[MY LIFE OS] تعذر تطبيق المظهر.",
        error
      );

      return {
        success: false,
        message: error.message
      };
    }
  }

  function initialize() {
    if (initialized) {
      return getAll();
    }

    settings = normalizeSettings(readSavedSettings());

    /*
     * إذا تعذر الحفظ، نحتفظ بالإعدادات المتاحة في الذاكرة،
     * وتبقى نتيجة التخزين قابلة للفحص من خلال حالة الحفظ.
     */
    const saveResult = storageWrite(settings);

    initialized = true;

    applyAppearance();

    emitEvent("settings:initialized", getAll());

    if (!saveResult.success) {
      console.warn(
        "[MY LIFE OS] الإعدادات جاهزة في الذاكرة، " +
        "لكن تعذر حفظها.",
        saveResult.message
      );
    } else {
      console.info(
        "[MY LIFE OS] تمت تهيئة الإعدادات."
      );
    }

    return getAll();
  }

  function ensureInitialized() {
    if (!initialized) {
      initialize();
    }
  }

  function get(key) {
    ensureInitialized();

    if (
      typeof key !== "string" ||
      !hasOwn(settings, key)
    ) {
      return undefined;
    }

    return settings[key];
  }

  function getAll() {
    return clone(settings);
  }

  function getDefaults() {
    return createDefaults();
  }

  function validateChanges(values) {
    if (!isObject(values)) {
      return {
        success: false,
        message: "يجب تقديم مجموعة إعدادات صحيحة."
      };
    }

    const keys = Object.keys(values);

    for (const key of keys) {
      if (!hasOwn(DEFAULT_SETTINGS, key)) {
        return {
          success: false,
          message: "إعداد غير معروف: " + key
        };
      }

      if (!isValidSettingValue(key, values[key])) {
        return {
          success: false,
          message: validationMessage(key),
          key: key
        };
      }
    }

    return {
      success: true,
      keys: keys
    };
  }

  function commitChanges(candidate, changedKeys) {
    const previous = settings;
    const next = normalizeSettings(candidate);

    /*
     * لا نغيّر الحالة المعتمدة في الذاكرة إلا بعد نجاح الحفظ.
     */
    const saveResult = storageWrite(next);

    if (!saveResult.success) {
      return {
        success: false,
        saved: false,
        message: saveResult.message
      };
    }

    settings = next;

    const appearanceChanged = changedKeys.some(
      key => key === "theme" || key === "accentColor"
    );

    if (appearanceChanged) {
      const appearanceResult = applyAppearance();

      if (!appearanceResult.success) {
        console.warn(
          "[MY LIFE OS] حُفظت الإعدادات، لكن تطبيق المظهر " +
          "لم يكتمل.",
          appearanceResult.message
        );
      }
    }

    changedKeys.forEach(key => {
      if (previous[key] !== settings[key]) {
        emitChange(key, settings[key]);
      }
    });

    return {
      success: true,
      saved: true,
      settings: getAll()
    };
  }

  function set(key, value) {
    ensureInitialized();

    if (
      typeof key !== "string" ||
      !hasOwn(DEFAULT_SETTINGS, key)
    ) {
      return {
        success: false,
        message: "الإعداد المطلوب غير معروف."
      };
    }

    if (!isValidSettingValue(key, value)) {
      return {
        success: false,
        message: validationMessage(key),
        key: key
      };
    }

    const candidate = {
      ...settings,
      [key]: value
    };

    return commitChanges(candidate, [key]);
  }

  function update(values) {
    ensureInitialized();

    const validation = validateChanges(values);

    if (!validation.success) {
      return validation;
    }

    const candidate = {
      ...settings,
      ...values
    };

    /*
     * تحقق من المجموعة كاملة ثم احفظها مرة واحدة.
     * لا تُرسل أحداث تغيير جزئية عند فشل الحفظ.
     */
    return commitChanges(candidate, validation.keys);
  }

  function reset() {
    ensureInitialized();

    const defaults = createDefaults();
    const changedKeys = SETTING_KEYS.filter(
      key => settings[key] !== defaults[key]
    );

    const previous = settings;
    const saveResult = storageWrite(defaults);

    if (!saveResult.success) {
      return {
        success: false,
        saved: false,
        message: saveResult.message,
        settings: getAll()
      };
    }

    settings = defaults;

    applyAppearance();

    changedKeys.forEach(key => {
      emitChange(key, settings[key]);
    });

    emitEvent("settings:reset", getAll());

    return {
      success: true,
      saved: true,
      settings: getAll()
    };
  }

  window.SettingsManager = Object.freeze({
    initialize: initialize,
    get: get,
    getAll: getAll,
    set: set,
    update: update,
    reset: reset,
    getDefaults: getDefaults
  });

})(window);
