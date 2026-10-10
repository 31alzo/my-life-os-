
/* =========================================
   MY LIFE OS — NOTIFICATION MANAGER
   File: notifications.js
========================================= */

const NotificationsManager = (() => {
    "use strict";

    const STORAGE_KEY = "notifications";

    const TYPES = [
        "task",
        "schedule",
        "habit",
        "daily_review",
        "weekly_review",
        "custom"
    ];

    function createId() {
        if (
            typeof AppUtils !== "undefined" &&
            typeof AppUtils.createId === "function"
        ) {
            return AppUtils.createId();
        }

        return (
            Date.now().toString(36) +
            Math.random().toString(36).slice(2, 10)
        );
    }

    function readAll() {
        try {
            const result = AppStorage.get(STORAGE_KEY);

            return Array.isArray(result) ? result : [];
        } catch (error) {
            console.error(
                "NotificationsManager: read failed.",
                error
            );

            return [];
        }
    }

    function writeAll(items) {
        try {
            return AppStorage.set(STORAGE_KEY, items) !== false;
        } catch (error) {
            console.error(
                "NotificationsManager: save failed.",
                error
            );

            return false;
        }
    }

    function isValidDate(value) {
        if (typeof value !== "string" || !value.trim()) {
            return false;
        }

        return !Number.isNaN(new Date(value).getTime());
    }

    function add(notification = {}) {
        const title = String(notification.title || "").trim();
        const message = String(notification.message || "").trim();
        const dueAt = notification.dueAt;

        if (!title) {
            return {
                success: false,
                message: "اكتب عنوان التذكير."
            };
        }

        if (!isValidDate(dueAt)) {
            return {
                success: false,
                message: "حدد تاريخًا ووقتًا صحيحين للتذكير."
            };
        }

        const type = TYPES.includes(notification.type)
            ? notification.type
            : "custom";

        const now = new Date().toISOString();

        const item = {
            id: createId(),
            title,
            message,
            type,
            dueAt: new Date(dueAt).toISOString(),
            completed: false,
            enabled: notification.enabled !== false,
            createdAt: now,
            updatedAt: now
        };

        const items = readAll();
        items.push(item);

        if (!writeAll(items)) {
            return {
                success: false,
                message: "تعذر حفظ التذكير."
            };
        }

        return {
            success: true,
            notification: item
        };
    }

    function getAll(options = {}) {
        let items = readAll();

        if (options.enabledOnly === true) {
            items = items.filter(item => item.enabled);
        }

        if (options.pendingOnly === true) {
            items = items.filter(item => !item.completed);
        }

        return items.sort(
            (a, b) =>
                new Date(a.dueAt).getTime() -
                new Date(b.dueAt).getTime()
        );
    }

    function getDue(referenceDate = new Date()) {
        const referenceTime = new Date(referenceDate).getTime();

        if (Number.isNaN(referenceTime)) {
            return [];
        }

        return getAll({
            enabledOnly: true,
            pendingOnly: true
        }).filter(item =>
            new Date(item.dueAt).getTime() <= referenceTime
        );
    }

    function update(id, changes = {}) {
        const items = readAll();
        const item = items.find(entry => entry.id === id);

        if (!item) {
            return {
                success: false,
                message: "التذكير غير موجود."
            };
        }

        if (
            Object.prototype.hasOwnProperty.call(changes, "title")
        ) {
            const title = String(changes.title || "").trim();

            if (!title) {
                return {
                    success: false,
                    message: "عنوان التذكير لا يمكن أن يكون فارغًا."
                };
            }

            item.title = title;
        }

        if (
            Object.prototype.hasOwnProperty.call(changes, "message")
        ) {
            item.message = String(changes.message || "").trim();
        }

        if (
            Object.prototype.hasOwnProperty.call(changes, "dueAt")
        ) {
            if (!isValidDate(changes.dueAt)) {
                return {
                    success: false,
                    message: "تاريخ التذكير غير صحيح."
                };
            }

            item.dueAt = new Date(changes.dueAt).toISOString();
        }

        if (
            Object.prototype.hasOwnProperty.call(changes, "enabled")
        ) {
            if (typeof changes.enabled !== "boolean") {
                return {
                    success: false,
                    message: "قيمة التفعيل غير صحيحة."
                };
            }

            item.enabled = changes.enabled;
        }

        if (
            Object.prototype.hasOwnProperty.call(changes, "completed")
        ) {
            if (typeof changes.completed !== "boolean") {
                return {
                    success: false,
                    message: "حالة التذكير غير صحيحة."
                };
            }

            item.completed = changes.completed;
        }

        item.updatedAt = new Date().toISOString();

        if (!writeAll(items)) {
            return {
                success: false,
                message: "تعذر تحديث التذكير."
            };
        }

        return {
            success: true,
            notification: item
        };
    }

    function remove(id) {
        const items = readAll();
        const remaining = items.filter(item => item.id !== id);

        if (remaining.length === items.length) {
            return {
                success: false,
                message: "التذكير غير موجود."
            };
        }

        if (!writeAll(remaining)) {
            return {
                success: false,
                message: "تعذر حذف التذكير."
            };
        }

        return {
            success: true,
            message: "تم حذف التذكير."
        };
    }

    function requestBrowserPermission() {
        if (
            typeof window === "undefined" ||
            !("Notification" in window)
        ) {
            return {
                success: false,
                message: "هذا المتصفح لا يدعم إشعارات الويب."
            };
        }

        return window.Notification.requestPermission()
            .then(permission => ({
                success: permission === "granted",
                permission,
                message:
                    permission === "granted"
                        ? "تم السماح بإشعارات المتصفح."
                        : "لم يتم السماح بإشعارات المتصفح."
            }))
            .catch(() => ({
                success: false,
                message: "تعذر طلب إذن الإشعارات."
            }));
    }

    function showBrowserNotification(id) {
        if (
            typeof window === "undefined" ||
            !("Notification" in window)
        ) {
            return {
                success: false,
                message: "إشعارات المتصفح غير مدعومة."
            };
        }

        if (Notification.permission !== "granted") {
            return {
                success: false,
                message: "اسمح بالإشعارات أولًا."
            };
        }

        const item = readAll().find(entry => entry.id === id);

        if (!item) {
            return {
                success: false,
                message: "التذكير غير موجود."
            };
        }

        try {
            new Notification(item.title, {
                body: item.message || "حان موعد التذكير."
            });

            return {
                success: true,
                message: "تم عرض إشعار المتصفح."
            };
        } catch (error) {
            return {
                success: false,
                message: "تعذر عرض إشعار المتصفح."
            };
        }
    }

    return {
        TYPES,
        add,
        getAll,
        getDue,
        update,
        remove,
        requestBrowserPermission,
        showBrowserNotification
    };
})();
