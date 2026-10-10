
/* =========================================
   MY LIFE OS — APPLICATION ENTRY POINT
   File: app.js
========================================= */

const MyLifeOS = (() => {
    "use strict";

    const APP_INFO = {
        name: "مشروع القمة",
        englishName: "MY LIFE OS",
        version: "1.0.0",
        language: "ar",
        direction: "rtl"
    };

    const MODULES = [
        { name: "AppUtils", label: "الأدوات الأساسية" },
        { name: "AppStorage", label: "التخزين المحلي" },
        { name: "GoalsManager", label: "إدارة الأهداف" },
        { name: "TasksManager", label: "إدارة المهام" },
        { name: "NotesManager", label: "الملاحظات اليومية" },
        { name: "HabitsManager", label: "متابعة العادات" },
        { name: "ReviewsManager", label: "المراجعات" },
        { name: "ScheduleManager", label: "الجدول" },
        { name: "CareerManager", label: "المسار المهني" },
        { name: "MemoManager", label: "المذكرات" },
        { name: "Plan90Manager", label: "خطة 90 يومًا" },
        { name: "BackupManager", label: "النسخ الاحتياطي" },
        { name: "SettingsManager", label: "الإعدادات" },
        { name: "SearchManager", label: "البحث" },
        { name: "AnalyticsManager", label: "تحليل التقدم" },
        { name: "NotificationsManager", label: "التذكيرات" },
        { name: "AffirmationsManager", label: "العبارات التحفيزية" },
        { name: "LifeDomainsManager", label: "مجالات الحياة" }
    ];

    let initialized = false;

    function getGlobalModule(name) {
        try {
            return typeof globalThis !== "undefined"
                ? globalThis[name]
                : undefined;
        } catch (error) {
            return undefined;
        }
    }

    function checkModules() {
        return MODULES.map(module => {
            const value = getGlobalModule(module.name);

            return {
                name: module.name,
                label: module.label,
                available: Boolean(value)
            };
        });
    }

    function getStatus() {
        const modules = checkModules();
        const available = modules.filter(
            module => module.available
        ).length;

        return {
            initialized,
            app: APP_INFO,
            totalModules: modules.length,
            availableModules: available,
            missingModules: modules
                .filter(module => !module.available)
                .map(module => module.name),
            modules
        };
    }

    function initialize(options = {}) {
        if (initialized) {
            return getStatus();
        }

        const root = options.root ||
            (typeof document !== "undefined"
                ? document.documentElement
                : null);

        if (root) {
            root.lang = APP_INFO.language;
            root.dir = APP_INFO.direction;
        }

        const settings = getGlobalModule("SettingsManager");

        if (settings && typeof settings.getAll === "function") {
            try {
                const preferences = settings.getAll();

                if (preferences.language && root) {
                    root.lang = preferences.language;
                }
            } catch (error) {
                console.warn(
                    "MY LIFE OS: could not load preferences.",
                    error
                );
            }
        }

        const affirmations = getGlobalModule("AffirmationsManager");

        if (
            affirmations &&
            typeof affirmations.initializeDefaults === "function"
        ) {
            affirmations.initializeDefaults();
        }

        initialized = true;

        return getStatus();
    }

    function resetInitialization() {
        initialized = false;
    }

    return {
        APP_INFO,
        MODULES,
        initialize,
        getStatus,
        checkModules,
        resetInitialization
    };
})();

/*
 * This file defines the application entry point.
 * We will connect it to the HTML and other scripts
 * during the integration phase.
 */
