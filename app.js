/* =========================================
   MY LIFE OS — APPLICATION ENTRY POINT
   File: App.js

   المسؤوليات:
   - تعريف معلومات التطبيق.
   - تسجيل الوحدات واكتشافها.
   - تهيئة التطبيق مرة واحدة.
   - تحميل التفضيلات عند توفرها.
   - توفير حالة واضحة عن الوحدات المتاحة.
   - تجنب توقف التطبيق بسبب تعطل وحدة اختيارية.
========================================= */

(function (window, document) {
    "use strict";

    const APP_INFO = Object.freeze({
        name: "مشروع القمة",
        englishName: "MY LIFE OS",
        version: "1.0.0",
        language: "ar",
        direction: "rtl"
    });

    /*
     * قائمة الوحدات المركزية.
     * تُحدّث حالة كل وحدة بحسب توفرها الفعلي.
     */
    const MODULES = Object.freeze([
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
        { name: "LifeDomainsManager", label: "مجالات الحياة" },
        { name: "AppearanceManager", label: "المظهر" },
        { name: "SportsManager", label: "الرياضة" },
        { name: "HealthManager", label: "الصحة" },
        { name: "RelationshipsManager", label: "العلاقات" },
        { name: "FinanceManager", label: "المالية" },
        { name: "LearningManager", label: "التعلم" },
        { name: "DigitalLifeManager", label: "الحياة الرقمية" }
    ]);

    /*
     * سجل داخلي للوحدات.
     * يتيح ربط الوحدات حتى عندما لا تكون متاحة
     * مباشرةً عبر window أو globalThis.
     */
    const moduleRegistry = Object.create(null);

    let initialized = false;
    let initializationPromise = null;
    let lastInitializationError = null;

    /*
     * تسجيل وحدة.
     *
     * مثال عند دمج ملف وحدة لاحقًا:
     * window.MyLifeOS.registerModule(
     *     "GoalsManager",
     *     GoalsManager
     * );
     */
    function registerModule(name, value) {
        if (
            typeof name !== "string" ||
            !name.trim() ||
            value === undefined ||
            value === null
        ) {
            return {
                success: false,
                message: "اسم الوحدة أو قيمتها غير صالح."
            };
        }

        moduleRegistry[name] = value;

        return {
            success: true,
            message: "تم تسجيل الوحدة: " + name
        };
    }

    /*
     * الحصول على وحدة من السجل أو النطاق العام.
     * لا يفترض أن جميع الوحدات متاحة منذ البداية.
     */
    function getGlobalModule(name) {
        if (
            Object.prototype.hasOwnProperty.call(
                moduleRegistry,
                name
            )
        ) {
            return moduleRegistry[name];
        }

        try {
            if (
                typeof window !== "undefined" &&
                window[name] !== undefined
            ) {
                return window[name];
            }

            if (
                typeof globalThis !== "undefined" &&
                globalThis[name] !== undefined
            ) {
                return globalThis[name];
            }
        } catch (error) {
            console.warn(
                "MY LIFE OS: تعذر الوصول إلى الوحدة:",
                name,
                error
            );
        }

        return undefined;
    }

    /*
     * التحقق من الوحدات المتوفرة.
     */
    function checkModules() {
        return MODULES.map(function (module) {
            const value = getGlobalModule(module.name);

            return {
                name: module.name,
                label: module.label,
                available: Boolean(value)
            };
        });
    }

    /*
     * تقرير حالة التطبيق.
     */
    function getStatus() {
        const modules = checkModules();

        const availableModules = modules.filter(
            function (module) {
                return module.available;
            }
        ).length;

        return {
            initialized: initialized,
            initializing: Boolean(initializationPromise),
            app: APP_INFO,
            totalModules: modules.length,
            availableModules: availableModules,
            missingModules: modules
                .filter(function (module) {
                    return !module.available;
                })
                .map(function (module) {
                    return module.name;
                }),
            lastInitializationError: lastInitializationError,
            modules: modules
        };
    }

    /*
     * تطبيق اللغة والاتجاه الأساسيين.
     */
    function applyDocumentDefaults(root) {
        if (!root) {
            return;
        }

        root.lang = APP_INFO.language;
        root.dir = APP_INFO.direction;
    }

    /*
     * تحميل إعدادات المستخدم إن كانت الوحدة متاحة.
     */
    function loadUserPreferences(root) {
        const settings = getGlobalModule("SettingsManager");

        if (
            !settings ||
            typeof settings.getAll !== "function"
        ) {
            return;
        }

        try {
            const preferences = settings.getAll();

            if (
                !preferences ||
                typeof preferences !== "object"
            ) {
                return;
            }

            if (
                typeof preferences.language === "string" &&
                preferences.language.trim() &&
                root
            ) {
                root.lang = preferences.language;
            }

            if (
                typeof preferences.direction === "string" &&
                ["rtl", "ltr"].includes(
                    preferences.direction
                ) &&
                root
            ) {
                root.dir = preferences.direction;
            }
        } catch (error) {
            console.warn(
                "MY LIFE OS: تعذر تحميل تفضيلات المستخدم.",
                error
            );
        }
    }

    /*
     * تشغيل التهيئة الافتراضية لوحدة العبارات التحفيزية.
     */
    function initializeAffirmations() {
        const affirmations = getGlobalModule(
            "AffirmationsManager"
        );

        if (
            !affirmations ||
            typeof affirmations.initializeDefaults !== "function"
        ) {
            return;
        }

        try {
            affirmations.initializeDefaults();
        } catch (error) {
            console.warn(
                "MY LIFE OS: تعذرت تهيئة العبارات التحفيزية.",
                error
            );
        }
    }

    /*
     * تهيئة التطبيق.
     *
     * لا يؤدي غياب وحدة اختيارية إلى إيقاف التطبيق.
     */
    function initialize(options) {
        options = options || {};

        if (initialized) {
            return Promise.resolve(getStatus());
        }

        if (initializationPromise) {
            return initializationPromise;
        }

        initializationPromise = Promise.resolve().then(
            function () {
                const root = options.root ||
                    (
                        typeof document !== "undefined"
                            ? document.documentElement
                            : null
                    );

                applyDocumentDefaults(root);
                loadUserPreferences(root);
                initializeAffirmations();

                initialized = true;
                lastInitializationError = null;

                const status = getStatus();

                console.info(
                    "MY LIFE OS: اكتملت تهيئة التطبيق.",
                    {
                        availableModules: status.availableModules,
                        totalModules: status.totalModules
                    }
                );

                return status;
            }
        ).catch(function (error) {
            lastInitializationError =
                error && error.message
                    ? error.message
                    : "حدث خطأ غير معروف أثناء التهيئة.";

            console.error(
                "MY LIFE OS: حدث خطأ أثناء التهيئة.",
                error
            );

            return getStatus();
        }).finally(function () {
            initializationPromise = null;
        });

        return initializationPromise;
    }

    /*
     * إعادة ضبط حالة التهيئة لأغراض الاختبار.
     * لا تحذف البيانات ولا تعيد تحميل الصفحة.
     */
    function resetInitialization() {
        initialized = false;
        initializationPromise = null;
        lastInitializationError = null;

        return getStatus();
    }

    /*
     * الواجهة العامة للتطبيق.
     */
    const MyLifeOS = Object.freeze({
        APP_INFO: APP_INFO,
        MODULES: MODULES,
        registerModule: registerModule,
        getGlobalModule: getGlobalModule,
        checkModules: checkModules,
        getStatus: getStatus,
        initialize: initialize,
        resetInitialization: resetInitialization
    });

    /*
     * إتاحة التطبيق لبقية ملفات JavaScript.
     */
    window.MyLifeOS = MyLifeOS;

    /*
     * بدء التشغيل بعد جاهزية HTML.
     * يعمل سواء حُمّل الملف قبل DOMContentLoaded
     * أو بعده.
     */
    function startApplication() {
        initialize();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            startApplication,
            { once: true }
        );
    } else {
        startApplication();
    }

})(window, document);