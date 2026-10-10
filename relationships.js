
/* =========================================
   MY LIFE OS — RELATIONSHIPS MODULE
   File: relationships.js
========================================= */

const RelationshipsManager = (() => {
    "use strict";

    const STORAGE_KEY = "relationships-data";

    // ترتيب الأولويات المعتمد في مشروع القمة
    const RELATIONSHIP_TYPES = [
        {
            id: "faith",
            order: 1,
            name: "العلاقة بالله",
            description: "العبادة والإخلاص والأخلاق ومراجعة النفس"
        },
        {
            id: "parents",
            order: 2,
            name: "العلاقة بالوالدين",
            description: "البر والاحترام والمساعدة والتواصل"
        },
        {
            id: "partner",
            order: 3,
            name: "العلاقة بشريكة الحياة",
            description: "المودة والثقة والصراحة والوفاء والاحترام"
        },
        {
            id: "family",
            order: 4,
            name: "العلاقة بالإخوة وأفراد الأسرة",
            description: "صلة الرحم والتعاون والدعم وحل الخلافات"
        },
        {
            id: "social",
            order: 5,
            name: "العلاقة بالمحيط الاجتماعي",
            description: "الأصدقاء والزملاء والجيران والتواصل والحدود"
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
            "rel-" +
            Date.now().toString(36) +
            "-" +
            Math.random().toString(36).slice(2, 9)
        );
    }

    function requireStorage() {
        if (
            typeof AppStorage === "undefined" ||
            typeof AppStorage.get !== "function" ||
            typeof AppStorage.set !== "function"
        ) {
            throw new Error(
                "يجب تحميل storage.js قبل relationships.js"
            );
        }
    }

    function getData() {
        requireStorage();

        const data = AppStorage.get(STORAGE_KEY, {});

        return {
            goals: Array.isArray(data.goals)
                ? data.goals
                : [],
            reviews: Array.isArray(data.reviews)
                ? data.reviews
                : [],
            updatedAt: data.updatedAt || null
        };
    }

    function saveData(data) {
        requireStorage();

        data.updatedAt = new Date().toISOString();
        AppStorage.set(STORAGE_KEY, data);

        return data;
    }

    function getRelationshipType(typeId) {
        return RELATIONSHIP_TYPES.find(
            item => item.id === typeId
        ) || null;
    }

    function validateType(typeId) {
        const type = getRelationshipType(typeId);

        if (!type) {
            throw new Error(
                "نوع العلاقة غير صالح. اختر أحد المجالات الخمسة."
            );
        }

        return type;
    }

    function validateText(value, fieldName) {
        if (
            typeof value !== "string" ||
            !value.trim()
        ) {
            throw new Error(fieldName + " مطلوب.");
        }

        return value.trim();
    }

    function validateRating(value) {
        const rating = Number(value);

        if (
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5
        ) {
            throw new Error(
                "التقييم يجب أن يكون عددًا صحيحًا من 1 إلى 5."
            );
        }

        return rating;
    }

    function validateDate(value) {
        const date = value
            ? new Date(value)
            : new Date();

        if (Number.isNaN(date.getTime())) {
            throw new Error("التاريخ غير صالح.");
        }

        return date.toISOString();
    }

    // المجالات مرتبة دائمًا حسب الأولوية
    function getTypes() {
        return RELATIONSHIP_TYPES.map(
            type => ({ ...type })
        );
    }

    function getType(typeId) {
        const type = validateType(typeId);
        return { ...type };
    }

    // إنشاء هدف شخصي داخل أحد مجالات العلاقات
    function addGoal(input = {}) {
        const type = validateType(input.typeId);
        const data = getData();

        const goal = {
            id: createId(),
            typeId: type.id,
            title: validateText(
                input.title,
                "عنوان الهدف"
            ),
            description: String(
                input.description || ""
            ).trim(),
            frequency: [
                "daily",
                "weekly",
                "monthly",
                "once"
            ].includes(input.frequency)
                ? input.frequency
                : "weekly",
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

        if (options.typeId) {
            validateType(options.typeId);

            goals = goals.filter(
                goal => goal.typeId === options.typeId
            );
        }

        if (options.activeOnly) {
            goals = goals.filter(
                goal => goal.active
            );
        }

        return goals
            .slice()
            .sort((a, b) => {
                const typeA = getRelationshipType(a.typeId);
                const typeB = getRelationshipType(b.typeId);

                return (
                    (typeA ? typeA.order : 99) -
                    (typeB ? typeB.order : 99)
                );
            })
            .map(goal => ({ ...goal }));
    }

    function updateGoal(id, changes = {}) {
        const data = getData();

        const goal = data.goals.find(
            item => item.id === id
        );

        if (!goal) {
            throw new Error("الهدف غير موجود.");
        }

        if (changes.typeId !== undefined) {
            validateType(changes.typeId);
            goal.typeId = changes.typeId;
        }

        if (changes.title !== undefined) {
            goal.title = validateText(
                changes.title,
                "عنوان الهدف"
            );
        }

        if (changes.description !== undefined) {
            goal.description = String(
                changes.description
            ).trim();
        }

        if (changes.frequency !== undefined) {
            const allowed = [
                "daily",
                "weekly",
                "monthly",
                "once"
            ];

            if (!allowed.includes(changes.frequency)) {
                throw new Error("تكرار الهدف غير صالح.");
            }

            goal.frequency = changes.frequency;
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
            goal => goal.id !== id
        );

        if (data.goals.length === oldLength) {
            return false;
        }

        saveData(data);
        return true;
    }

    // تسجيل مراجعة شخصية لعلاقة معينة
    function addReview(input = {}) {
        const type = validateType(input.typeId);
        const data = getData();

        const review = {
            id: createId(),
            typeId: type.id,
            rating: validateRating(input.rating),
            date: validateDate(input.date),
            positive: String(
                input.positive || ""
            ).trim(),
            improvement: String(
                input.improvement || ""
            ).trim(),
            nextStep: String(
                input.nextStep || ""
            ).trim(),
            createdAt: new Date().toISOString()
        };

        data.reviews.push(review);
        saveData(data);

        return { ...review };
    }

    function getReviews(options = {}) {
        const data = getData();

        let reviews = data.reviews;

        if (options.typeId) {
            validateType(options.typeId);

            reviews = reviews.filter(
                review => review.typeId === options.typeId
            );
        }

        if (options.from) {
            const from = new Date(options.from);

            if (Number.isNaN(from.getTime())) {
                throw new Error("تاريخ البداية غير صالح.");
            }

            reviews = reviews.filter(
                review => new Date(review.date) >= from
            );
        }

        if (options.to) {
            const to = new Date(options.to);

            if (Number.isNaN(to.getTime())) {
                throw new Error("تاريخ النهاية غير صالح.");
            }

            reviews = reviews.filter(
                review => new Date(review.date) <= to
            );
        }

        return reviews
            .slice()
            .sort(
                (a, b) =>
                    new Date(b.date) - new Date(a.date)
            )
            .map(review => ({ ...review }));
    }

    function deleteReview(id) {
        const data = getData();
        const oldLength = data.reviews.length;

        data.reviews = data.reviews.filter(
            review => review.id !== id
        );

        if (data.reviews.length === oldLength) {
            return false;
        }

        saveData(data);
        return true;
    }

    // ملخص تطور كل علاقة دون إصدار أحكام أخلاقية
    function getSummary(typeId) {
        const type = validateType(typeId);
        const reviews = getReviews({ typeId });

        const latest = reviews[0] || null;

        const average = reviews.length
            ? Math.round(
                (
                    reviews.reduce(
                        (sum, review) => sum + review.rating,
                        0
                    ) / reviews.length
                ) * 100
            ) / 100
            : null;

        let change = null;

        if (reviews.length >= 2) {
            // reviews مرتبة من الأحدث إلى الأقدم
            change =
                reviews[0].rating -
                reviews[reviews.length - 1].rating;
        }

        return {
            type: { ...type },
            reviewCount: reviews.length,
            averageRating: average,
            latestReview: latest
                ? { ...latest }
                : null,
            ratingChange: change,
            activeGoals: getGoals({
                typeId,
                activeOnly: true
            }).length
        };
    }

    function getDashboard() {
        return getTypes().map(type => ({
            ...getSummary(type.id)
        }));
    }

    return {
        getTypes,
        getType,
        addGoal,
        getGoals,
        updateGoal,
        deleteGoal,
        addReview,
        getReviews,
        deleteReview,
        getSummary,
        getDashboard
    };
})();

/* End of relationships.js */
