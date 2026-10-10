
/* =========================================
   MY LIFE OS — PERSONAL FINANCE
   File: finance.js
========================================= */

const FinanceManager = (() => {
    "use strict";

    const STORAGE_KEY = "finance-data";

    const TRANSACTION_TYPES = [
        "income",
        "expense"
    ];

    const EXPENSE_CATEGORIES = [
        "الطعام",
        "السكن",
        "المواصلات",
        "التعليم",
        "الصحة",
        "الملابس والعناية الشخصية",
        "الاتصالات والإنترنت",
        "الأسرة",
        "الترفيه",
        "المشاريع",
        "أخرى"
    ];

    function createId() {
        if (
            typeof AppUtils !== "undefined" &&
            typeof AppUtils.createId === "function"
        ) {
            return AppUtils.createId();
        }

        return (
            "finance-" +
            Date.now().toString(36) +
            "-" +
            Math.random().toString(36).slice(2, 9)
        );
    }

    function getData() {
        if (
            typeof AppStorage === "undefined" ||
            typeof AppStorage.get !== "function"
        ) {
            throw new Error(
                "يجب تحميل storage.js قبل finance.js"
            );
        }

        const data = AppStorage.get(STORAGE_KEY, {});

        return {
            transactions: Array.isArray(data.transactions)
                ? data.transactions
                : [],
            goals: Array.isArray(data.goals)
                ? data.goals
                : [],
            currency: data.currency || "MRU",
            updatedAt: data.updatedAt || null
        };
    }

    function saveData(data) {
        if (
            typeof AppStorage === "undefined" ||
            typeof AppStorage.set !== "function"
        ) {
            throw new Error(
                "يجب تحميل storage.js قبل finance.js"
            );
        }

        data.updatedAt = new Date().toISOString();
        AppStorage.set(STORAGE_KEY, data);

        return data;
    }

    function validateText(value, label) {
        if (
            typeof value !== "string" ||
            !value.trim()
        ) {
            throw new Error(label + " مطلوب.");
        }

        return value.trim();
    }

    function validateAmount(value) {
        const amount = Number(value);

        if (
            !Number.isFinite(amount) ||
            amount <= 0 ||
            amount > 1_000_000_000_000
        ) {
            throw new Error(
                "أدخل مبلغًا صحيحًا أكبر من صفر."
            );
        }

        return Math.round(amount * 100) / 100;
    }

    function validateDate(value) {
        const date = value ? new Date(value) : new Date();

        if (Number.isNaN(date.getTime())) {
            throw new Error("التاريخ غير صالح.");
        }

        return date.toISOString();
    }

    function addTransaction(input = {}) {
        const data = getData();

        if (!TRANSACTION_TYPES.includes(input.type)) {
            throw new Error(
                "نوع العملية يجب أن يكون income أو expense."
            );
        }

        const transaction = {
            id: createId(),
            type: input.type,
            amount: validateAmount(input.amount),
            category: validateText(
                input.category,
                "التصنيف"
            ),
            description: String(
                input.description || ""
            ).trim(),
            date: validateDate(input.date),
            createdAt: new Date().toISOString()
        };

        data.transactions.push(transaction);
        saveData(data);

        return { ...transaction };
    }

    function getTransactions(options = {}) {
        const data = getData();

        let transactions = data.transactions;

        if (options.type) {
            if (!TRANSACTION_TYPES.includes(options.type)) {
                throw new Error("نوع العملية غير صالح.");
            }

            transactions = transactions.filter(
                item => item.type === options.type
            );
        }

        if (options.category) {
            transactions = transactions.filter(
                item => item.category === options.category
            );
        }

        if (options.from) {
            const from = new Date(options.from);

            if (Number.isNaN(from.getTime())) {
                throw new Error("تاريخ البداية غير صالح.");
            }

            transactions = transactions.filter(
                item => new Date(item.date) >= from
            );
        }

        if (options.to) {
            const to = new Date(options.to);

            if (Number.isNaN(to.getTime())) {
                throw new Error("تاريخ النهاية غير صالح.");
            }

            transactions = transactions.filter(
                item => new Date(item.date) <= to
            );
        }

        return transactions
            .slice()
            .sort(
                (a, b) =>
                    new Date(b.date) - new Date(a.date)
            )
            .map(item => ({ ...item }));
    }

    function updateTransaction(id, changes = {}) {
        const data = getData();

        const transaction = data.transactions.find(
            item => item.id === id
        );

        if (!transaction) {
            throw new Error("العملية المالية غير موجودة.");
        }

        if (changes.type !== undefined) {
            if (!TRANSACTION_TYPES.includes(changes.type)) {
                throw new Error("نوع العملية غير صالح.");
            }

            transaction.type = changes.type;
        }

        if (changes.amount !== undefined) {
            transaction.amount = validateAmount(
                changes.amount
            );
        }

        if (changes.category !== undefined) {
            transaction.category = validateText(
                changes.category,
                "التصنيف"
            );
        }

        if (changes.description !== undefined) {
            transaction.description = String(
                changes.description || ""
            ).trim();
        }

        if (changes.date !== undefined) {
            transaction.date = validateDate(changes.date);
        }

        saveData(data);

        return { ...transaction };
    }

    function deleteTransaction(id) {
        const data = getData();
        const oldLength = data.transactions.length;

        data.transactions = data.transactions.filter(
            item => item.id !== id
        );

        if (data.transactions.length === oldLength) {
            return false;
        }

        saveData(data);
        return true;
    }

    function addGoal(input = {}) {
        const data = getData();

        const goal = {
            id: createId(),
            title: validateText(
                input.title,
                "اسم الهدف المالي"
            ),
            targetAmount: validateAmount(
                input.targetAmount
            ),
            savedAmount: 0,
            deadline: input.deadline || null,
            notes: String(input.notes || "").trim(),
            active: true,
            createdAt: new Date().toISOString()
        };

        data.goals.push(goal);
        saveData(data);

        return { ...goal };
    }

    function getGoals(options = {}) {
        const data = getData();

        let goals = data.goals;

        if (options.activeOnly) {
            goals = goals.filter(goal => goal.active);
        }

        return goals.map(goal => ({ ...goal }));
    }

    function updateGoal(id, changes = {}) {
        const data = getData();

        const goal = data.goals.find(
            item => item.id === id
        );

        if (!goal) {
            throw new Error("الهدف المالي غير موجود.");
        }

        if (changes.title !== undefined) {
            goal.title = validateText(
                changes.title,
                "اسم الهدف المالي"
            );
        }

        if (changes.targetAmount !== undefined) {
            goal.targetAmount = validateAmount(
                changes.targetAmount
            );
        }

        if (changes.savedAmount !== undefined) {
            const saved = Number(changes.savedAmount);

            if (
                !Number.isFinite(saved) ||
                saved < 0 ||
                saved > 1_000_000_000_000
            ) {
                throw new Error(
                    "مبلغ الادخار غير صالح."
                );
            }

            goal.savedAmount = Math.round(saved * 100) / 100;
        }

        if (changes.deadline !== undefined) {
            goal.deadline = changes.deadline || null;
        }

        if (changes.notes !== undefined) {
            goal.notes = String(changes.notes || "").trim();
        }

        if (changes.active !== undefined) {
            goal.active = Boolean(changes.active);
        }

        saveData(data);

        return { ...goal };
    }

    function deleteGoal(id) {
        const data = getData();
        const oldLength = data.goals.length;

        data.goals = data.goals.filter(
            item => item.id !== id
        );

        if (data.goals.length === oldLength) {
            return false;
        }

        saveData(data);
        return true;
    }

    function getGoalProgress(id) {
        const goal = getGoals().find(
            item => item.id === id
        );

        if (!goal) {
            throw new Error("الهدف المالي غير موجود.");
        }

        const percentage = Math.min(
            100,
            Math.round(
                goal.savedAmount / goal.targetAmount * 100
            )
        );

        return {
            id: goal.id,
            title: goal.title,
            targetAmount: goal.targetAmount,
            savedAmount: goal.savedAmount,
            remainingAmount: Math.max(
                0,
                goal.targetAmount - goal.savedAmount
            ),
            percentage,
            completed: goal.savedAmount >= goal.targetAmount
        };
    }

    function getSummary(options = {}) {
        const transactions = getTransactions(options);

        const income = transactions
            .filter(item => item.type === "income")
            .reduce((sum, item) => sum + item.amount, 0);

        const expenses = transactions
            .filter(item => item.type === "expense")
            .reduce((sum, item) => sum + item.amount, 0);

        const expensesByCategory = {};

        transactions
            .filter(item => item.type === "expense")
            .forEach(item => {
                expensesByCategory[item.category] =
                    (expensesByCategory[item.category] || 0) +
                    item.amount;
            });

        return {
            transactionCount: transactions.length,
            income: Math.round(income * 100) / 100,
            expenses: Math.round(expenses * 100) / 100,
            balance: Math.round((income - expenses) * 100) / 100,
            expensesByCategory
        };
    }

    function getCategories() {
        return [...EXPENSE_CATEGORIES];
    }

    function getCurrency() {
        return getData().currency;
    }

    function setCurrency(currency) {
        const data = getData();

        data.currency = validateText(
            currency,
            "العملة"
        );

        saveData(data);

        return data.currency;
    }

    return {
        addTransaction,
        getTransactions,
        updateTransaction,
        deleteTransaction,
        addGoal,
        getGoals,
        updateGoal,
        deleteGoal,
        getGoalProgress,
        getSummary,
        getCategories,
        getCurrency,
        setCurrency
    };
})();

/* End of finance.js */
