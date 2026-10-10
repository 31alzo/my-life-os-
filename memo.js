
/* =========================================
   MY LIFE OS — MEMO MANAGER
   File: memo.js
   Purpose: Save and organize personal memos
========================================= */

const MemoManager = (() => {
    "use strict";

    const STORAGE_KEY = "life-memos";

    const REVIEW_STATUSES = {
        NEW: "new",
        REVIEWED: "reviewed",
        APPROVED: "approved",
        ARCHIVED: "archived"
    };

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
            const memos = AppStorage.get(STORAGE_KEY);
            return Array.isArray(memos) ? memos : [];
        } catch (error) {
            console.error("MemoManager: could not read memos.", error);
            return [];
        }
    }

    function writeAll(memos) {
        try {
            return AppStorage.set(STORAGE_KEY, memos) !== false;
        } catch (error) {
            console.error("MemoManager: could not save memos.", error);
            return false;
        }
    }

    function add(text, title = "") {
        if (typeof text !== "string" || !text.trim()) {
            return {
                success: false,
                message: "اكتب نص المذكرة أولًا."
            };
        }

        const now = new Date().toISOString();

        const memo = {
            id: createId(),
            title: String(title).trim(),
            originalText: text.trim(),
            status: REVIEW_STATUSES.NEW,
            category: "uncategorized",
            createdAt: now,
            updatedAt: now,
            reviewedAt: null,
            approvedAt: null,
            proposedActions: []
        };

        const memos = readAll();
        memos.unshift(memo);

        if (!writeAll(memos)) {
            return {
                success: false,
                message: "تعذر حفظ المذكرة."
            };
        }

        return {
            success: true,
            message: "تم حفظ المذكرة.",
            memo: memo
        };
    }

    function getAll() {
        return readAll();
    }

    function getById(id) {
        return readAll().find(memo => memo.id === id) || null;
    }

    function update(id, changes = {}) {
        const memos = readAll();
        const index = memos.findIndex(memo => memo.id === id);

        if (index === -1) {
            return {
                success: false,
                message: "المذكرة غير موجودة."
            };
        }

        const allowedFields = ["title", "originalText", "category"];

        for (const field of allowedFields) {
            if (
                Object.prototype.hasOwnProperty.call(changes, field) &&
                typeof changes[field] === "string"
            ) {
                if (
                    field === "originalText" &&
                    !changes[field].trim()
                ) {
                    return {
                        success: false,
                        message: "لا يمكن أن يكون نص المذكرة فارغًا."
                    };
                }

                memos[index][field] = changes[field].trim();
            }
        }

        memos[index].updatedAt = new Date().toISOString();

        if (!writeAll(memos)) {
            return {
                success: false,
                message: "تعذر تحديث المذكرة."
            };
        }

        return {
            success: true,
            memo: memos[index]
        };
    }

    function setStatus(id, status) {
        const allowedStatuses = Object.values(REVIEW_STATUSES);

        if (!allowedStatuses.includes(status)) {
            return {
                success: false,
                message: "حالة المراجعة غير صحيحة."
            };
        }

        const memos = readAll();
        const memo = memos.find(item => item.id === id);

        if (!memo) {
            return {
                success: false,
                message: "المذكرة غير موجودة."
            };
        }

        memo.status = status;
        memo.updatedAt = new Date().toISOString();

        if (status === REVIEW_STATUSES.REVIEWED) {
            memo.reviewedAt = memo.updatedAt;
        }

        if (status === REVIEW_STATUSES.APPROVED) {
            memo.approvedAt = memo.updatedAt;
        }

        if (!writeAll(memos)) {
            return {
                success: false,
                message: "تعذر تحديث حالة المذكرة."
            };
        }

        return {
            success: true,
            memo: memo
        };
    }

    function remove(id) {
        const memos = readAll();
        const remaining = memos.filter(memo => memo.id !== id);

        if (remaining.length === memos.length) {
            return {
                success: false,
                message: "المذكرة غير موجودة."
            };
        }

        if (!writeAll(remaining)) {
            return {
                success: false,
                message: "تعذر حذف المذكرة."
            };
        }

        return {
            success: true,
            message: "تم حذف المذكرة."
        };
    }

    function search(query) {
        const term = String(query || "").trim().toLowerCase();

        if (!term) {
            return getAll();
        }

        return readAll().filter(memo =>
            memo.title.toLowerCase().includes(term) ||
            memo.originalText.toLowerCase().includes(term) ||
            memo.category.toLowerCase().includes(term)
        );
    }

    return {
        REVIEW_STATUSES,
        add,
        getAll,
        getById,
        update,
        setStatus,
        remove,
        search
    };
})();
