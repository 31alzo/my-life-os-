
/* =========================================
   MY LIFE OS — SETTINGS MANAGER
   File: settings.js
========================================= */

const SettingsManager = (() => {
    "use strict";

    const STORAGE_KEY = "user-settings";

    const DEFAULTS = {
        language: "ar",
        theme: "dark",
        weekStartsOn: "saturday",
        timeFormat: "24h",
        reminderPreference: true,
        dailyReviewEnabled: true,
        weeklyReviewEnabled: true,
        motivationalMessages: true,
        compactLayout: false
    };

    const ALLOWED_VALUES = {
        language: ["ar", "fr", "en"],
        theme: ["dark", "light", "system"],
        weekStartsOn: ["saturday", "sunday", "monday"],
        timeFormat: ["12h", "24h"]
    };

    function cloneDefaults() {
        return { ...DEFAULTS };
    }

    function readSettings() {
        try {
            const stored = AppStorage.get(STORAGE_KEY);

            if (!stored || typeof stored !== "object") {
                return cloneDefaults();
            }

            return {
                ...DEFAULTS,
                ...stored
            };
        } catch (error) {
            console.error("SettingsManager: read failed.", error);
            return cloneDefaults();
        }
    }

    function getAll() {
        return readSettings();
    }

    function get(key) {
        const settings = readSettings();

        if (!Object.prototype.hasOwnProperty.call(settings, key)) {
            return undefined;
        }

        return settings[key];
    }

    function validateSetting(key, value) {
        if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) {
            return {
                valid: false,
                message: "الإعداد غير معروف."
            };
        }

        if (ALLOWED_VALUES[key]) {
            if (!ALLOWED_VALUES[key].includes(value)) {
                return {
                    valid: false,
                    message: "القيمة المحددة غير مدعومة لهذا الإعداد."
                };
            }

            return { valid: true };
        }

        if (typeof DEFAULTS[key] === "boolean") {
            if (typeof value !== "boolean") {
                return {
                    valid: false,
                    message: "يجب أن تكون قيمة الإعداد صحيحة أو خاطئة."
                };
            }

            return { valid: true };
        }

        return {
            valid: false,
            message: "نوع القيمة غير مدعوم."
        };
    }

    function set(key, value) {
        const validation = validateSetting(key, value);

        if (!validation.valid) {
            return {
                success: false,
                message: validation.message
            };
        }

        const settings = readSettings();
        settings[key] = value;

        try {
            const saved = AppStorage.set(STORAGE_KEY, settings);

            if (saved === false) {
                return {
                    success: false,
                    message: "تعذر حفظ الإعداد."
                };
            }

            return {
                success: true,
                settings: settings
            };
        } catch (error) {
            console.error("SettingsManager: save failed.", error);

            return {
                success: false,
                message: "حدث خطأ أثناء حفظ الإعداد."
            };
        }
    }

    function update(changes = {}) {
        if (
            !changes ||
            typeof changes !== "object" ||
            Array.isArray(changes)
        ) {
            return {
                success: false,
                message: "بيانات الإعدادات غير صالحة."
            };
        }

        const current = readSettings();
        const updated = { ...current };

        for (const [key, value] of Object.entries(changes)) {
            const validation = validateSetting(key, value);

            if (!validation.valid) {
                return {
                    success: false,
                    message: validation.message,
                    invalidKey: key
                };
            }

            updated[key] = value;
        }

        try {
            const saved = AppStorage.set(STORAGE_KEY, updated);

            if (saved === false) {
                return {
                    success: false,
                    message: "تعذر حفظ الإعدادات."
                };
            }

            return {
                success: true,
                settings: updated
            };
        } catch (error) {
            console.error("SettingsManager: update failed.", error);

            return {
                success: false,
                message: "حدث خطأ أثناء حفظ الإعدادات."
            };
        }
    }

    function reset() {
        try {
            const saved = AppStorage.set(
                STORAGE_KEY,
                cloneDefaults()
            );

            if (saved === false) {
                return {
                    success: false,
                    message: "تعذر إعادة الإعدادات الافتراضية."
                };
            }

            return {
                success: true,
                message: "تمت إعادة الإعدادات الافتراضية.",
                settings: cloneDefaults()
            };
        } catch (error) {
            return {
                success: false,
                message: "تعذر إعادة الإعدادات."
            };
        }
    }

    return {
        DEFAULTS: cloneDefaults(),
        getAll,
        get,
        set,
        update,
        reset
    };
})();
