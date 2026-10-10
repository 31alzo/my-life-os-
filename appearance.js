
/* =========================================
   MY LIFE OS — PERSONAL APPEARANCE
   File: appearance.js
========================================= */

const AppearanceManager = (() => {
    "use strict";

    const STORAGE_KEY = "appearance-data";

    const ROUTINES = [
        {
            id: "hygiene",
            name: "النظافة الشخصية",
            tasks: [
                "الاستحمام حسب الحاجة",
                "تنظيف الأسنان",
                "غسل الوجه",
                "العناية بالأظافر",
                "ارتداء ملابس نظيفة"
            ]
        },
        {
            id: "hair",
            name: "الشعر والتسريحة",
            tasks: [
                "تمشيط الشعر",
                "العناية بالشعر",
                "ترتيب التسريحة",
                "تحديد موعد قص الشعر عند الحاجة"
            ]
        },
        {
            id: "clothing",
            name: "الملابس",
            tasks: [
                "اختيار ملابس مناسبة لليوم",
                "التأكد من نظافة الملابس",
                "كي الملابس عند الحاجة",
                "ترتيب الملابس والخزانة"
            ]
        },
        {
            id: "oral-care",
            name: "العناية بالفم والأسنان",
            tasks: [
                "تنظيف الأسنان صباحًا",
                "تنظيف الأسنان مساءً",
                "العناية بنظافة الفم"
            ]
        },
        {
            id: "fragrance",
            name: "الرائحة والعناية بالجسم",
            tasks: [
                "الاهتمام بالنظافة",
                "استخدام مزيل العرق عند الحاجة",
                "استخدام العطر باعتدال"
            ]
        },
        {
            id: "general",
            name: "المظهر العام",
            tasks: [
                "الاهتمام بالوقفة",
                "ترتيب المظهر قبل الخروج",
                "اختيار مظهر مناسب للمناسبة"
            ]
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
            "appearance-" +
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
                "يجب تحميل storage.js قبل appearance.js"
            );
        }

        const data = AppStorage.get(STORAGE_KEY, {});

        return {
            routines: Array.isArray(data.routines)
                ? data.routines
                : [],
            records: Array.isArray(data.records)
                ? data.records
                : [],
            updatedAt: data.updatedAt || null
        };
    }

    function saveData(data) {
        if (
            typeof AppStorage === "undefined" ||
            typeof AppStorage.set !== "function"
        ) {
            throw new Error(
                "يجب تحميل storage.js قبل appearance.js"
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

    function validateDate(value) {
        const date = value ? new Date(value) : new Date();

        if (Number.isNaN(date.getTime())) {
            throw new Error("التاريخ غير صالح.");
        }

        return date.toISOString();
    }

    function getCategories() {
        return ROUTINES.map(category => ({
            id: category.id,
            name: category.name,
            tasks: [...category.tasks]
        }));
    }

    function getDefaultChecklist() {
        return ROUTINES.flatMap(category =>
            category.tasks.map(task => ({
                id: category.id + ":" + task,
                categoryId: category.id,
                categoryName: category.name,
                task,
                completed: false
            }))
        );
    }

    // حفظ نتيجة روتين يومي أو أسبوعي
    function addRecord(input = {}) {
        const data = getData();

        const category = ROUTINES.find(
            item => item.id === input.categoryId
        );

        if (!category) {
            throw new Error("مجال العناية غير صالح.");
        }

        const record = {
            id: createId(),
            categoryId: category.id,
            categoryName: category.name,
            task: validateText(input.task, "اسم المهمة"),
            date: validateDate(input.date),
            completed: input.completed !== false,
            notes: String(input.notes || "").trim(),
            createdAt: new Date().toISOString()
        };

        data.records.push(record);
        saveData(data);

        return { ...record };
    }

    function getRecords(options = {}) {
        const data = getData();

        let records = data.records;

        if (options.categoryId) {
            records = records.filter(
                item => item.categoryId === options.categoryId
            );
        }

        if (options.completedOnly) {
            records = records.filter(
                item => item.completed
            );
        }

        if (options.from) {
            const from = new Date(options.from);

            if (Number.isNaN(from.getTime())) {
                throw new Error("تاريخ البداية غير صالح.");
            }

            records = records.filter(
                item => new Date(item.date) >= from
            );
        }

        if (options.to) {
            const to = new Date(options.to);

            if (Number.isNaN(to.getTime())) {
                throw new Error("تاريخ النهاية غير صالح.");
            }

            records = records.filter(
                item => new Date(item.date) <= to
            );
        }

        return records
            .slice()
            .sort(
                (a, b) =>
                    new Date(b.date) - new Date(a.date)
            )
            .map(item => ({ ...item }));
    }

    function updateRecord(id, changes = {}) {
        const data = getData();

        const record = data.records.find(
            item => item.id === id
        );

        if (!record) {
            throw new Error("سجل العناية غير موجود.");
        }

        if (changes.task !== undefined) {
            record.task = validateText(
                changes.task,
                "اسم المهمة"
            );
        }

        if (changes.categoryId !== undefined) {
            const category = ROUTINES.find(
                item => item.id === changes.categoryId
            );

            if (!category) {
                throw new Error("مجال العناية غير صالح.");
            }

            record.categoryId = category.id;
            record.categoryName = category.name;
        }

        if (changes.date !== undefined) {
            record.date = validateDate(changes.date);
        }

        if (changes.completed !== undefined) {
            record.completed = Boolean(changes.completed);
        }

        if (changes.notes !== undefined) {
            record.notes = String(changes.notes).trim();
        }

        saveData(data);

        return { ...record };
    }

    function deleteRecord(id) {
        const data = getData();
        const oldLength = data.records.length;

        data.records = data.records.filter(
            item => item.id !== id
        );

        if (data.records.length === oldLength) {
            return false;
        }

        saveData(data);
        return true;
    }

    function getStats(options = {}) {
        const records = getRecords(options);
        const completed = records.filter(
            item => item.completed
        );

        const byCategory = {};

        records.forEach(record => {
            if (!byCategory[record.categoryId]) {
                byCategory[record.categoryId] = {
                    name: record.categoryName,
                    total: 0,
                    completed: 0
                };
            }

            byCategory[record.categoryId].total += 1;

            if (record.completed) {
                byCategory[record.categoryId].completed += 1;
            }
        });

        const percentage = records.length
            ? Math.round(
                completed.length / records.length * 100
            )
            : 0;

        return {
            totalRecords: records.length,
            completedRecords: completed.length,
            completionPercentage: percentage,
            byCategory
        };
    }

    return {
        getCategories,
        getDefaultChecklist,
        addRecord,
        getRecords,
        updateRecord,
        deleteRecord,
        getStats
    };
})();

/* End of appearance.js */
