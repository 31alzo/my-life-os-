/* =========================================
   MY LIFE OS — APPLICATION ENTRY POINT
   File: App.js
   Version: 2.0.0

   المسؤوليات:
   - تعريف معلومات التطبيق.
   - تسجيل الوحدات واكتشافها.
   - تهيئة التطبيق مرة واحدة.
   - تحميل الإعدادات عند توفرها.
   - توفير حالة واضحة عن الوحدات المتاحة.
   - عزل أخطاء الوحدات الاختيارية.
========================================= */

(function (window, document) {
    "use strict";

    if (window.MyLifeOS) {
        console.warn(
            "[MY LIFE OS] التطبيق مسجل مسبقًا."
        );
        return;
    }

    const APP_INFO = Object.freeze({
        name: "مشروع القمة",
        englishName: "MY LIFE OS",
        version: "2.0.0",
        language: "ar",
        direction: "rtl"
    });

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

    const moduleRegistry = Object.create(null);
    const initializationErrors = [];

    let initialized = false;
    let initializationPromise = null;
    let lastInitializationError = null;

    function isObject(value) {
        return value !== null &&
            typeof value === "object" &&
            !Array.isArray(value);
    }

    function emit(name, detail) {
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
            console.warn(
                "[MY LIFE OS] تعذر إرسال الحدث:",
                name,
                error
            );
        }
    }

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

        const moduleName = name.trim();

        moduleRegistry[moduleName] = value;

        emit("app:module-registered", {
            name: moduleName
        });

        return {
            success: true,
            message: "تم تسجيل الوحدة: " + moduleName
        };
    }

    function unregisterModule(name) {
        if (
            typeof name !== "string" ||
            !Object.prototype.hasOwnProperty.call(
                moduleRegistry,
                name
            )
        ) {
            return false;
        }

        delete moduleRegistry[name];

        emit("app:module-unregistered", {
            name: name
        });

        return true;
    }

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
                "[MY LIFE OS] تعذر الوصول إلى الوحدة:",
                name,
                error
            );
        }

        return undefined;
    }

    function checkModules() {
        return MODULES.map(function (module) {
            const value = getGlobalModule(module.name);

            return {
                name: module.name,
                label: module.label,
                available: value !== undefined &&
                    value !== null
            };
        });
    }

    function getStatus() {
        const modules = checkModules();

        const availableModules = modules.filter(
            function (module) {
                return module.available;
            }
        ).length;

        return {
            initialized: initialized,
            initializing: initializationPromise !== null,
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
            initializationErrors: initializationErrors.slice(),
            modules: modules
        };
    }

    function applyDocumentDefaults(root) {
        if (!root) {
            return;
        }

        root.lang = APP_INFO.language;
        root.dir = APP_INFO.direction;
    }

    function loadUserPreferences(root) {
        const settings = getGlobalModule("SettingsManager");

        if (!settings) {
            return {
                success: false,
                skipped: true,
                message: "وحدة الإعدادات غير متاحة."
            };
        }

        try {
            /*
             * تهيئة الإعدادات قبل قراءتها عند توفر الدالة.
             */
            if (typeof settings.initialize === "function") {
                settings.initialize();
            }

            if (typeof settings.getAll !== "function") {
                return {
                    success: false,
                    skipped: true,
                    message: "وحدة الإعدادات لا توفر getAll."
                };
            }

            const preferences = settings.getAll();

            if (!isObject(preferences)) {
                return {
                    success: false,
                    message: "بيانات الإعدادات غير صالحة."
                };
            }

            /*
             * هذه النسخة تعتمد العربية وRTL.
             * لا نسمح لإعدادات غير متوقعة بتغيير الاتجاه.
             */
            if (root) {
                root.lang = APP_INFO.language;
                root.dir = APP_INFO.direction;
            }

            return {
                success: true,
                preferences: preferences
            };
        } catch (error) {
            recordError(
                "SettingsManager",
                error
            );

            return {
                success: false,
                message: error.message || "تعذر تحميل الإعدادات."
            };
        }
    }

    function initializeAffirmations() {
        const affirmations = getGlobalModule(
            "AffirmationsManager"
        );

        if (
            !affirmations ||
            typeof affirmations.initializeDefaults !== "function"
        ) {
            return {
                success: true,
                skipped: true
            };
        }

        try {
            affirmations.initializeDefaults();

            return {
                success: true
            };
        } catch (error) {
            recordError(
                "AffirmationsManager",
                error
            );

            return {
                success: false,
                message: error.message ||
                    "تعذرت تهيئة العبارات التحفيزية."
            };
        }
    }

    function recordError(moduleName, error) {
        const message = error && error.message
            ? error.message
            : "حدث خطأ غير معروف.";

        const entry = {
            module: moduleName,
            message: message
        };

        initializationErrors.push(entry);

        /*
         * الاحتفاظ بعدد محدود من الأخطاء لتجنب نمو السجل.
         */
        if (initializationErrors.length > 100) {
            initializationErrors.shift();
        }

        console.warn(
            "[MY LIFE OS] مشكلة في الوحدة:",
            moduleName,
            error
        );
    }

    function initialize(options) {
        const config = isObject(options) ? options : {};

        if (initialized) {
            return Promise.resolve(getStatus());
        }

        if (initializationPromise) {
            return initializationPromise;
        }

        initializationErrors.length = 0;
        lastInitializationError = null;

        let currentPromise;

        currentPromise = Promise.resolve()
            .then(function () {
                const root = config.root ||
                    (
                        typeof document !== "undefined"
                            ? document.documentElement
                            : null
                    );

                applyDocumentDefaults(root);

                /*
                 * خطأ الإعدادات لا يوقف تشغيل بقية التطبيق.
                 */
                loadUserPreferences(root);

                /*
                 * العبارات التحفيزية وحدة اختيارية.
                 */
                initializeAffirmations();

                initialized = true;
                lastInitializationError = null;

                const status = getStatus();

                emit("app:initialized", status);

                console.info(
                    "[MY LIFE OS] اكتملت تهيئة التطبيق.",
                    {
                        availableModules: status.availableModules,
                        totalModules: status.totalModules,
                        initializationErrors:
                            status.initializationErrors.length
                    }
                );

                return status;
            })
            .catch(function (error) {
                lastInitializationError =
                    error && error.message
                        ? error.message
                        : "حدث خطأ غير معروف أثناء التهيئة.";

                recordError("Application", error);

                emit("app:initialization-failed", {
                    message: lastInitializationError
                });

                console.error(
                    "[MY LIFE OS] حدث خطأ أثناء التهيئة.",
                    error
                );

                return getStatus();
            })
            .finally(function () {
                /*
                 * لا تسمح لعملية قديمة بمسح مرجع عملية أحدث.
                 */
                if (initializationPromise === currentPromise) {
                    initializationPromise = null;
                }
            });

        initializationPromise = currentPromise;

        return currentPromise;
    }

    function resetInitialization() {
        /*
         * هذه الدالة لإعادة ضبط حالة التهيئة فقط.
         * لا تحذف البيانات ولا توقف عملية جارية.
         */
        if (initializationPromise) {
            return {
                success: false,
                message: "لا يمكن إعادة الضبط أثناء التهيئة.",
                status: getStatus()
            };
        }

        initialized = false;
        lastInitializationError = null;
        initializationErrors.length = 0;

        emit("app:initialization-reset", {});

        return getStatus();
    }

    const MyLifeOS = Object.freeze({
        APP_INFO: APP_INFO,
        MODULES: MODULES,
        registerModule: registerModule,
        unregisterModule: unregisterModule,
        getGlobalModule: getGlobalModule,
        checkModules: checkModules,
        getStatus: getStatus,
        initialize: initialize,
        resetInitialization: resetInitialization
    });

    window.MyLifeOS = MyLifeOS;

    function startApplication() {
        initialize();
    }

    if (
        typeof document !== "undefined" &&
        document.readyState === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            startApplication,
            { once: true }
        );
    } else {
        startApplication();
    }

})(window, document);
