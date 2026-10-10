/* =====================================================
   MY LIFE OS — CORE SCRIPT
   File: Script.js

   المسؤوليات:
   1. الأدوات العامة المشتركة.
   2. إدارة حالة التطبيق.
   3. إدارة الأحداث المشتركة.
   4. رسائل النجاح والخطأ والتنبيه.
   5. تهيئة الوحدات المتاحة.
   6. دعم العربية وواجهات RTL.
   7. توفير أساس موحد لبقية ملفات المشروع.

   ملاحظة:
   هذا الملف لا ينشئ الواجهات ولا يستبدل وظائف
   إدارة الأهداف والمهام والتخزين المتخصصة.
===================================================== */

(function (window, document) {
    "use strict";

    const APP_CONFIG = Object.freeze({
        name: "MY LIFE OS",
        title: "مشروع القمة",
        version: "1.0.0",
        language: "ar",
        direction: "rtl",
        defaultPage: "dashboard",
        notificationDuration: 3500,
        debug: false
    });

    /* =================================================
       1. أدوات عامة
    ================================================= */

    const AppUtils = Object.freeze({

        /**
         * البحث عن عنصر في الصفحة.
         */
        $(selector, root) {
            if (typeof selector !== "string") {
                return null;
            }

            return (root || document).querySelector(selector);
        },

        /**
         * البحث عن مجموعة عناصر.
         */
        $$(selector, root) {
            if (typeof selector !== "string") {
                return [];
            }

            return Array.from(
                (root || document).querySelectorAll(selector)
            );
        },

        /**
         * إنشاء معرف فريد نسبيًا للاستخدام داخل التطبيق.
         */
        createId(prefix) {
            const safePrefix =
                typeof prefix === "string" && prefix.trim()
                    ? prefix.trim()
                    : "item";

            if (
                window.crypto &&
                typeof window.crypto.randomUUID === "function"
            ) {
                return safePrefix + "-" +
                    window.crypto.randomUUID();
            }

            return safePrefix + "-" +
                Date.now().toString(36) + "-" +
                Math.random().toString(36).slice(2, 10);
        },

        /**
         * التاريخ الحالي بصيغة YYYY-MM-DD.
         */
        today() {
            const date = new Date();
            const year = date.getFullYear();
            const month = String(
                date.getMonth() + 1
            ).padStart(2, "0");
            const day = String(
                date.getDate()
            ).padStart(2, "0");

            return year + "-" + month + "-" + day;
        },

        /**
         * تاريخ ووقت بصيغة ISO.
         */
        now() {
            return new Date().toISOString();
        },

        /**
         * تنسيق التاريخ حسب اللغة.
         */
        formatDate(value, options) {
            const date = value ? new Date(value) : new Date();

            if (Number.isNaN(date.getTime())) {
                return "";
            }

            try {
                return new Intl.DateTimeFormat(
                    APP_CONFIG.language,
                    options || {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                    }
                ).format(date);
            } catch (error) {
                return date.toLocaleDateString();
            }
        },

        /**
         * تنسيق الأرقام.
         */
        formatNumber(value, options) {
            const number = Number(value);

            if (!Number.isFinite(number)) {
                return "0";
            }

            try {
                return new Intl.NumberFormat(
                    APP_CONFIG.language,
                    options || {}
                ).format(number);
            } catch (error) {
                return String(number);
            }
        },

        /**
         * التحقق من النصوص.
         */
        isNonEmptyString(value) {
            return (
                typeof value === "string" &&
                value.trim().length > 0
            );
        },

        /**
         * التحقق من الأرقام.
         */
        isNumber(value) {
            return (
                typeof value === "number" &&
                Number.isFinite(value)
            );
        },

        /**
         * تحويل القيمة إلى مصفوفة آمنة.
         */
        toArray(value) {
            return Array.isArray(value) ? value : [];
        },

        /**
         * نسخ عميق للبيانات القابلة للتحويل إلى JSON.
         */
        clone(value) {
            if (value === undefined) {
                return undefined;
            }

            try {
                return JSON.parse(JSON.stringify(value));
            } catch (error) {
                console.error(
                    "MY LIFE OS: تعذر نسخ البيانات.",
                    error
                );

                return null;
            }
        },

        /**
         * تأخير تنفيذي بسيط.
         * لا يُستخدم لحفظ البيانات أو جدولة التذكيرات.
         */
        debounce(callback, delay) {
            if (typeof callback !== "function") {
                return function () {};
            }

            let timeoutId = null;

            return function () {
                const context = this;
                const args = arguments;

                window.clearTimeout(timeoutId);

                timeoutId = window.setTimeout(function () {
                    callback.apply(context, args);
                }, Math.max(0, Number(delay) || 0));
            };
        },

        /**
         * التحقق من وجود قيمة داخل كائن.
         */
        hasOwn(object, key) {
            return (
                object !== null &&
                typeof object === "object" &&
                Object.prototype.hasOwnProperty.call(
                    object,
                    key
                )
            );
        },

        /**
         * تنظيف نص قبل عرضه كنص عادي.
         * استخدم textContent عند إدراج النص في الصفحة.
         */
        normalizeText(value) {
            if (value === null || value === undefined) {
                return "";
            }

            return String(value).trim();
        },

        /**
         * سجل تشخيصي لا يعمل إلا عند تفعيل debug.
         */
        debug() {
            if (!APP_CONFIG.debug) {
                return;
            }

            console.log.apply(
                console,
                ["MY LIFE OS:"].concat(
                    Array.from(arguments)
                )
            );
        }
    });

    /* =================================================
       2. حالة التطبيق
    ================================================= */

    const state = {
        ready: false,
        currentPage: APP_CONFIG.defaultPage,
        language: APP_CONFIG.language,
        direction: APP_CONFIG.direction,
        theme: "dark",
        loading: false,
        initializedAt: null,
        lastError: null
    };

    const stateListeners = new Set();

    function getState() {
        return AppUtils.clone(state);
    }

    function setState(updates) {
        if (
            !updates ||
            typeof updates !== "object" ||
            Array.isArray(updates)
        ) {
            return false;
        }

        Object.keys(updates).forEach(function (key) {
            if (AppUtils.hasOwn(state, key)) {
                state[key] = updates[key];
            }
        });

        const snapshot = getState();

        stateListeners.forEach(function (listener) {
            try {
                listener(snapshot);
            } catch (error) {
                console.error(
                    "MY LIFE OS: خطأ في مستمع الحالة.",
                    error
                );
            }
        });

        return true;
    }

    function subscribeState(listener) {
        if (typeof listener !== "function") {
            return function () {};
        }

        stateListeners.add(listener);

        return function unsubscribe() {
            stateListeners.delete(listener);
        };
    }

    const AppState = Object.freeze({
        get: getState,
        set: setState,
        subscribe: subscribeState
    });

    /* =================================================
       3. نظام الأحداث الداخلي
    ================================================= */

    const eventListeners = new Map();

    const AppEvents = Object.freeze({

        /**
         * الاشتراك في حدث.
         * يعيد دالة لإلغاء الاشتراك.
         */
        on(eventName, callback) {
            if (
                !AppUtils.isNonEmptyString(eventName) ||
                typeof callback !== "function"
            ) {
                return function () {};
            }

            if (!eventListeners.has(eventName)) {
                eventListeners.set(eventName, new Set());
            }

            const listeners = eventListeners.get(eventName);
            listeners.add(callback);

            return function unsubscribe() {
                listeners.delete(callback);

                if (listeners.size === 0) {
                    eventListeners.delete(eventName);
                }
            };
        },

        /**
         * إطلاق حدث داخلي.
         */
        emit(eventName, detail) {
            if (!eventListeners.has(eventName)) {
                return;
            }

            Array.from(eventListeners.get(eventName))
                .forEach(function (callback) {
                    try {
                        callback(detail);
                    } catch (error) {
                        console.error(
                            "MY LIFE OS: خطأ أثناء تنفيذ الحدث:",
                            eventName,
                            error
                        );
                    }
                });
        },

        /**
         * الاشتراك لمرة واحدة.
         */
        once(eventName, callback) {
            if (typeof callback !== "function") {
                return function () {};
            }

            let unsubscribe = function () {};

            const wrapped = function (detail) {
                unsubscribe();
                callback(detail);
            };

            unsubscribe = this.on(eventName, wrapped);

            return unsubscribe;
        },

        /**
         * إزالة مستمعي حدث محدد أو جميع الأحداث.
         */
        off(eventName) {
            if (eventName) {
                eventListeners.delete(eventName);
            } else {
                eventListeners.clear();
            }
        }
    });

    /* =================================================
       4. رسائل المستخدم
    ================================================= */

    let toastContainer = null;

    function ensureToastContainer() {
        if (!document.body) {
            return null;
        }

        if (
            toastContainer &&
            document.body.contains(toastContainer)
        ) {
            return toastContainer;
        }

        toastContainer = document.getElementById(
            "my-life-os-toast-container"
        );

        if (toastContainer) {
            return toastContainer;
        }

        toastContainer = document.createElement("div");
        toastContainer.id = "my-life-os-toast-container";
        toastContainer.setAttribute("role", "region");
        toastContainer.setAttribute(
            "aria-label",
            "رسائل التطبيق"
        );
        toastContainer.setAttribute("aria-live", "polite");

        Object.assign(toastContainer.style, {
            position: "fixed",
            top: "16px",
            left: "16px",
            right: "16px",
            zIndex: "9999",
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: "8px",
            maxWidth: "440px",
            marginInline: "auto",
            pointerEvents: "none"
        });

        document.body.appendChild(toastContainer);

        return toastContainer;
    }

    const AppToast = Object.freeze({

        show(message, type, duration) {
            const container = ensureToastContainer();

            if (!container) {
                console.info(
                    "MY LIFE OS:",
                    AppUtils.normalizeText(message)
                );

                return false;
            }

            const safeMessage = AppUtils.normalizeText(message);

            if (!safeMessage) {
                return false;
            }

            const allowedTypes = [
                "success",
                "error",
                "warning",
                "info"
            ];

            const safeType = allowedTypes.includes(type)
                ? type
                : "info";

            const colors = {
                success: "#176b4d",
                error: "#9f3030",
                warning: "#8a6417",
                info: "#233b59"
            };

            const toast = document.createElement("div");

            toast.setAttribute("role", "status");

            Object.assign(toast.style, {
                background: colors[safeType],
                color: "#ffffff",
                padding: "12px 16px",
                borderRadius: "12px",
                boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
                fontSize: "14px",
                lineHeight: "1.7",
                overflowWrap: "anywhere",
                pointerEvents: "auto",
                opacity: "0",
                transform: "translateY(-6px)",
                transition: "opacity 160ms ease, transform 160ms ease"
            });

            // استخدام textContent يمنع تفسير الرسالة كـ HTML.
            toast.textContent = safeMessage;
            container.appendChild(toast);

            window.requestAnimationFrame(function () {
                toast.style.opacity = "1";
                toast.style.transform = "translateY(0)";
            });

            const displayDuration =
                Number.isFinite(Number(duration))
                    ? Math.max(1000, Number(duration))
                    : APP_CONFIG.notificationDuration;

            window.setTimeout(function () {
                toast.style.opacity = "0";
                toast.style.transform = "translateY(-6px)";

                window.setTimeout(function () {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 200);
            }, displayDuration);

            return true;
        },

        success(message, duration) {
            return this.show(message, "success", duration);
        },

        error(message, duration) {
            return this.show(message, "error", duration);
        },

        warning(message, duration) {
            return this.show(message, "warning", duration);
        },

        info(message, duration) {
            return this.show(message, "info", duration);
        }
    });

    /* =================================================
       5. سجل الأخطاء
    ================================================= */

    const AppLogger = Object.freeze({

        info(message, details) {
            console.info(
                "MY LIFE OS:",
                message,
                details === undefined ? "" : details
            );
        },

        warn(message, details) {
            console.warn(
                "MY LIFE OS:",
                message,
                details === undefined ? "" : details
            );
        },

        error(message, error) {
            const errorMessage =
                error && error.message
                    ? error.message
                    : String(message || "خطأ غير معروف");

            setState({
                lastError: errorMessage
            });

            console.error(
                "MY LIFE OS:",
                message,
                error || ""
            );
        },

        debug() {
            AppUtils.debug.apply(null, arguments);
        }
    });

    /* =================================================
       6. تسجيل الوحدات وتهيئتها
    ================================================= */

    const registeredModules = new Map();
    const initializedModules = new Set();

    function registerModule(name, moduleObject, options) {
        if (
            !AppUtils.isNonEmptyString(name) ||
            !moduleObject
        ) {
            return {
                success: false,
                message: "تعذر تسجيل الوحدة: بيانات غير صالحة."
            };
        }

        registeredModules.set(name, {
            instance: moduleObject,
            options: options || {}
        });

        AppEvents.emit("module:registered", {
            name: name
        });

        return {
            success: true,
            name: name
        };
    }

    function findModule(name) {
        if (registeredModules.has(name)) {
            return registeredModules.get(name).instance;
        }

        if (
            window.MyLifeOS &&
            typeof window.MyLifeOS.getGlobalModule === "function"
        ) {
            const value = window.MyLifeOS.getGlobalModule(name);

            if (value) {
                return value;
            }
        }

        return window[name];
    }

    async function initializeModule(name, moduleObject) {
        if (!moduleObject || initializedModules.has(name)) {
            return {
                name: name,
                success: Boolean(moduleObject)
            };
        }

        if (typeof moduleObject.initialize !== "function") {
            // ليس كل مدير بيانات بحاجة إلى initialize().
            initializedModules.add(name);

            return {
                name: name,
                success: true,
                skipped: true
            };
        }

        try {
            await moduleObject.initialize();

            initializedModules.add(name);

            return {
                name: name,
                success: true
            };
        } catch (error) {
            AppLogger.error(
                "تعذرت تهيئة الوحدة: " + name,
                error
            );

            return {
                name: name,
                success: false,
                error: error.message || String(error)
            };
        }
    }

    async function initializeModules() {
        const names = Array.from(registeredModules.keys());

        /*
         * نضيف أسماء الوحدات المعروفة في App.js
         * إذا كان الملف قد حمّلها قبل بدء التهيئة.
         */
        const core = window.MyLifeOS;

        if (core && Array.isArray(core.MODULES)) {
            core.MODULES.forEach(function (item) {
                if (
                    item &&
                    typeof item.name === "string" &&
                    !names.includes(item.name)
                ) {
                    names.push(item.name);
                }
            });
        }

        const results = [];

        for (const name of names) {
            const moduleObject = findModule(name);

            if (!moduleObject) {
                results.push({
                    name: name,
                    success: false,
                    missing: true
                });

                continue;
            }

            results.push(
                await initializeModule(name, moduleObject)
            );
        }

        return results;
    }

    /* =================================================
       7. تطبيق اللغة والاتجاه
    ================================================= */

    function applyDocumentSettings() {
        if (!document.documentElement) {
            return;
        }

        document.documentElement.lang = state.language;
        document.documentElement.dir = state.direction;
    }

    function setLanguage(language, direction) {
        if (
            typeof language !== "string" ||
            !language.trim()
        ) {
            return false;
        }

        const safeDirection =
            direction === "ltr" || direction === "rtl"
                ? direction
                : (
                    language.toLowerCase().startsWith("ar")
                        ? "rtl"
                        : "ltr"
                );

        setState({
            language: language,
            direction: safeDirection
        });

        applyDocumentSettings();

        AppEvents.emit("language:changed", {
            language: language,
            direction: safeDirection
        });

        return true;
    }

    /* =================================================
       8. تهيئة التطبيق
    ================================================= */

    let initializationPromise = null;

    async function initialize() {
        if (state.ready) {
            return getState();
        }

        if (initializationPromise) {
            return initializationPromise;
        }

        initializationPromise = (async function () {
            setState({
                loading: true,
                lastError: null
            });

            try {
                applyDocumentSettings();

                const moduleResults = await initializeModules();

                setState({
                    ready: true,
                    loading: false,
                    initializedAt: AppUtils.now()
                });

                AppEvents.emit("app:ready", {
                    config: APP_CONFIG,
                    modules: moduleResults,
                    state: getState()
                });

                AppLogger.info(
                    "اكتملت مرحلة التشغيل الأساسية.",
                    {
                        available: moduleResults.filter(
                            function (item) {
                                return item.success;
                            }
                        ).length,
                        total: moduleResults.length
                    }
                );

                return getState();
            } catch (error) {
                AppLogger.error(
                    "حدث خطأ أثناء تشغيل التطبيق.",
                    error
                );

                setState({
                    loading: false
                });

                return getState();
            } finally {
                initializationPromise = null;
            }
        })();

        return initializationPromise;
    }

    /* =================================================
       9. التعامل مع تغيّر الصفحة
    ================================================= */

    function setCurrentPage(pageName) {
        if (
            typeof pageName !== "string" ||
            !pageName.trim()
        ) {
            return false;
        }

        const previousPage = state.currentPage;

        setState({
            currentPage: pageName.trim()
        });

        AppEvents.emit("page:changed", {
            previousPage: previousPage,
            currentPage: pageName.trim()
        });

        return true;
    }

    /* =================================================
       10. الواجهة العامة
    ================================================= */

    const publicAPI = Object.freeze({
        config: APP_CONFIG,
        utils: AppUtils,
        state: AppState,
        events: AppEvents,
        toast: AppToast,
        logger: AppLogger,

        registerModule: registerModule,
        findModule: findModule,
        initializeModule: initializeModule,
        initializeModules: initializeModules,
        initialize: initialize,

        setLanguage: setLanguage,
        setCurrentPage: setCurrentPage
    });

    /*
     * إتاحة الخدمات العامة لبقية ملفات المشروع.
     */
    window.APP_CONFIG = APP_CONFIG;
    window.AppUtils = AppUtils;
    window.AppState = AppState;
    window.AppEvents = AppEvents;
    window.AppToast = AppToast;
    window.AppLogger = AppLogger;
    window.AppCore = publicAPI;

    /*
     * تسجيل أخطاء JavaScript غير المعالجة للتشخيص.
     */
    window.addEventListener("error", function (event) {
        AppLogger.error(
            "حدث خطأ في JavaScript.",
            event.error || event.message
        );
    });

    window.addEventListener(
        "unhandledrejection",
        function (event) {
            AppLogger.error(
                "حدث خطأ في عملية غير متزامنة.",
                event.reason
            );
        }
    );

    /*
     * التشغيل بعد جاهزية DOM.
     */
    function startCore() {
        initialize();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            startCore,
            { once: true }
        );
    } else {
        startCore();
    }

})(window, document);