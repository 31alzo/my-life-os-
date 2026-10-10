
/* =========================================
   MY LIFE OS — AFFIRMATIONS MANAGER
   File: affirmations.js
========================================= */

const AffirmationsManager = (() => {
    "use strict";

    const STORAGE_KEY = "affirmations";

    const DEFAULT_AFFIRMATIONS = [
        {
            text: "أركز اليوم على خطوة واحدة مهمة، ثم أنتقل إلى التالية.",
            category: "discipline"
        },
        {
            text: "التقدم المستمر أهم من انتظار الكمال.",
            category: "growth"
        },
        {
            text: "أتعلم من أخطائي وأستخدمها لتحسين خطتي.",
            category: "growth"
        },
        {
            text: "أحترم وقتي ووقتي الآخرين.",
            category: "discipline"
        },
        {
            text: "أبني مستقبلي بالأفعال الصغيرة التي أكررها كل يوم.",
            category: "future"
        }
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
            const saved = AppStorage.get(STORAGE_KEY);

            return Array.isArray(saved) ? saved : [];
        } catch (error) {
            console.error(
                "AffirmationsManager: read failed.",
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
                "AffirmationsManager: save failed.",
                error
            );

            return false;
        }
    }

    function initializeDefaults() {
        const existing = readAll();

        if (existing.length > 0) {
            return {
                success: true,
                created: false,
                affirmations: existing
            };
        }

        const now = new Date().toISOString();

        const defaults = DEFAULT_AFFIRMATIONS.map(item => ({
            id: createId(),
            text: item.text,
            category: item.category,
            favorite: false,
            createdAt: now,
            updatedAt: now
        }));

        if (!writeAll(defaults)) {
            return {
                success: false,
                message: "تعذر حفظ العبارات الافتراضية."
            };
        }

        return {
            success: true,
            created: true,
            affirmations: defaults
        };
    }

    function getAll(options = {}) {
        let items = readAll();

        if (options.favoritesOnly === true) {
            items = items.filter(item => item.favorite === true);
        }

        if (options.category) {
            items = items.filter(
                item => item.category === options.category
            );
        }

        return items;
    }

    function add(text, category = "personal") {
        const cleanText = String(text || "").trim();

        if (!cleanText) {
            return {
                success: false,
                message: "اكتب العبارة التحفيزية أولًا."
            };
        }

        const now = new Date().toISOString();

        const item = {
            id: createId(),
            text: cleanText,
            category: String(category || "personal").trim(),
            favorite: false,
            createdAt: now,
            updatedAt: now
        };

        const items = readAll();
        items.unshift(item);

        if (!writeAll(items)) {
            return {
                success: false,
                message: "تعذر حفظ العبارة."
            };
        }

        return {
            success: true,
            affirmation: item
        };
    }

    function update(id, changes = {}) {
        const items = readAll();
        const item = items.find(entry => entry.id === id);

        if (!item) {
            return {
                success: false,
                message: "العبارة غير موجودة."
            };
        }

        if (
            Object.prototype.hasOwnProperty.call(changes, "text")
        ) {
            const cleanText = String(changes.text || "").trim();

            if (!cleanText) {
                return {
                    success: false,
                    message: "لا يمكن أن تكون العبارة فارغة."
                };
            }

            item.text = cleanText;
        }

        if (
            Object.prototype.hasOwnProperty.call(changes, "category")
        ) {
            item.category = String(
                changes.category || "personal"
            ).trim();
        }

        if (
            Object.prototype.hasOwnProperty.call(changes, "favorite")
        ) {
            if (typeof changes.favorite !== "boolean") {
                return {
                    success: false,
                    message: "قيمة المفضلة غير صحيحة."
                };
            }

            item.favorite = changes.favorite;
        }

        item.updatedAt = new Date().toISOString();

        if (!writeAll(items)) {
            return {
                success: false,
                message: "تعذر تحديث العبارة."
            };
        }

        return {
            success: true,
            affirmation: item
        };
    }

    function remove(id) {
        const items = readAll();
        const remaining = items.filter(item => item.id !== id);

        if (remaining.length === items.length) {
            return {
                success: false,
                message: "العبارة غير موجودة."
            };
        }

        if (!writeAll(remaining)) {
            return {
                success: false,
                message: "تعذر حذف العبارة."
            };
        }

        return {
            success: true,
            message: "تم حذف العبارة."
        };
    }

    function getDaily(date = new Date()) {
        const items = readAll();

        if (items.length === 0) {
            return null;
        }

        const day = Math.floor(
            new Date(date).setHours(0, 0, 0, 0) / 86400000
        );

        if (!Number.isFinite(day)) {
            return items[0];
        }

        const index = ((day % items.length) + items.length) % items.length;

        return items[index];
    }

    return {
        DEFAULT_AFFIRMATIONS,
        initializeDefaults,
        getAll,
        add,
        update,
        remove,
        getDaily
    };
})();
