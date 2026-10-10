
/* =========================================
   MY LIFE OS — HEALTH MODULE
   File: health.js
========================================= */

const HealthManager = (() => {
    "use strict";

    const STORAGE_KEY = "health-data";

    const TRACKED_AREAS = [
        {
            id: "sleep",
            name: "النوم",
            description: "مدة النوم وجودته"
        },
        {
            id: "nutrition",
            name: "التغذية",
            description: "الوجبات والماء والعادات الغذائية"
        },
        {
            id: "energy",
            name: "الطاقة",
            description: "مستوى النشاط والشعور العام"
        },
        {
            id: "wellbeing",
            name: "العافية العامة",
            description: "ملاحظات عن الحالة اليومية"
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
            "health-" +
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
                "يجب تحميل storage.js قبل health.js"
            );
        }

        const data = AppStorage.get(STORAGE_KEY, {});

        return {
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
                "يجب تحميل storage.js قبل health.js"
            );
        }

        data.updatedAt = new Date().toISOString();
        AppStorage.set(STORAGE_KEY, data);

        return data;
    }

    function validateDate(value) {
        const date = value ? new Date(value) : new Date();

        if (Number.isNaN(date.getTime())) {
            throw new Error("التاريخ غير صالح.");
        }

        return date.toISOString();
    }

    function optionalNumber(value, label, min, max) {
        if (
            value === undefined ||
            value === null ||
            value === ""
        ) {
            return null;
        }

        const number = Number(value);

        if (
            !Number.isFinite(number) ||
            number < min ||
            number > max
        ) {
            throw new Error(
                label + " يجب أن يكون بين " + min + " و" + max + "."
            );
        }

        return number;
    }

    function validateRating(value, label) {
        if (
            value === undefined ||
            value === null ||
            value === ""
        ) {
            return null;
        }

        const rating = Number(value);

        if (
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5
        ) {
            throw new Error(
                label + " يجب أن يكون عددًا صحيحًا من 1 إلى 5."
            );
        }

        return rating;
    }

    function getAreas() {
        return TRACKED_AREAS.map(area => ({ ...area }));
    }

    function addRecord(input = {}) {
        const data = getData();

        const sleepHours = optionalNumber(
            input.sleepHours,
            "ساعات النوم",
            0,
            24
        );

        const waterLiters = optionalNumber(
            input.waterLiters,
            "كمية الماء باللتر",
            0,
            20
        );

        const energy = validateRating(
            input.energy,
            "تقييم الطاقة"
        );

        const sleepQuality = validateRating(
            input.sleepQuality,
            "جودة النوم"
        );

        const mood = validateRating(
            input.mood,
            "تقييم المزاج"
        );

        const record = {
            id: createId(),
            date: validateDate(input.date),
            sleepHours,
            sleepQuality,
            waterLiters,
            energy,
            mood,
            mealsNote: String(input.mealsNote || "").trim(),
            activityNote: String(input.activityNote || "").trim(),
            generalNote: String(input.generalNote || "").trim(),
            createdAt: new Date().toISOString()
        };

        data.records.push(record);
        saveData(data);

        return { ...record };
    }

    function getRecords(options = {}) {
        const data = getData();

        let records = data.records;

        if (options.from) {
            const from = new Date(options.from);

            if (Number.isNaN(from.getTime())) {
                throw new Error("تاريخ البداية غير صالح.");
            }

            records = records.filter(
                record => new Date(record.date) >= from
            );
        }

        if (options.to) {
            const to = new Date(options.to);

            if (Number.isNaN(to.getTime())) {
                throw new Error("تاريخ النهاية غير صالح.");
            }

            records = records.filter(
                record => new Date(record.date) <= to
            );
        }

        return records
            .slice()
            .sort(
                (a, b) =>
                    new Date(b.date) - new Date(a.date)
            )
            .map(record => ({ ...record }));
    }

    function updateRecord(id, changes = {}) {
        const data = getData();

        const record = data.records.find(
            item => item.id === id
        );

        if (!record) {
            throw new Error("السجل الصحي غير موجود.");
        }

        if (changes.date !== undefined) {
            record.date = validateDate(changes.date);
        }

        const numberFields = {
            sleepHours: ["ساعات النوم", 0, 24],
            waterLiters: ["كمية الماء باللتر", 0, 20]
        };

        Object.keys(numberFields).forEach(field => {
            if (changes[field] !== undefined) {
                const [label, min, max] = numberFields[field];

                record[field] = optionalNumber(
                    changes[field],
                    label,
                    min,
                    max
                );
            }
        });

        const ratingFields = [
            ["sleepQuality", "جودة النوم"],
            ["energy", "تقييم الطاقة"],
            ["mood", "تقييم المزاج"]
        ];

        ratingFields.forEach(([field, label]) => {
            if (changes[field] !== undefined) {
                record[field] = validateRating(
                    changes[field],
                    label
                );
            }
        });

        const textFields = [
            "mealsNote",
            "activityNote",
            "generalNote"
        ];

        textFields.forEach(field => {
            if (changes[field] !== undefined) {
                record[field] = String(
                    changes[field] || ""
                ).trim();
            }
        });

        saveData(data);

        return { ...record };
    }

    function deleteRecord(id) {
        const data = getData();
        const oldLength = data.records.length;

        data.records = data.records.filter(
            record => record.id !== id
        );

        if (data.records.length === oldLength) {
            return false;
        }

        saveData(data);
        return true;
    }

    function average(values) {
        const valid = values.filter(
            value =>
                typeof value === "number" &&
                Number.isFinite(value)
        );

        if (!valid.length) {
            return null;
        }

        return Math.round(
            valid.reduce((sum, value) => sum + value, 0) /
            valid.length * 100
        ) / 100;
    }

    function getStats(options = {}) {
        const records = getRecords(options);

        return {
            recordCount: records.length,
            averageSleepHours: average(
                records.map(record => record.sleepHours)
            ),
            averageSleepQuality: average(
                records.map(record => record.sleepQuality)
            ),
            averageWaterLiters: average(
                records.map(record => record.waterLiters)
            ),
            averageEnergy: average(
                records.map(record => record.energy)
            ),
            averageMood: average(
                records.map(record => record.mood)
            )
        };
    }

    function getTodayRecord(date = new Date()) {
        const target = new Date(date);

        if (Number.isNaN(target.getTime())) {
            throw new Error("التاريخ غير صالح.");
        }

        const key = [
            target.getFullYear(),
            String(target.getMonth() + 1).padStart(2, "0"),
            String(target.getDate()).padStart(2, "0")
        ].join("-");

        return getRecords().find(record => {
            const current = new Date(record.date);

            const currentKey = [
                current.getFullYear(),
                String(current.getMonth() + 1).padStart(2, "0"),
                String(current.getDate()).padStart(2, "0")
            ].join("-");

            return currentKey === key;
        }) || null;
    }

    return {
        getAreas,
        addRecord,
        getRecords,
        updateRecord,
        deleteRecord,
        getStats,
        getTodayRecord
    };
})();

/* End of health.js */
