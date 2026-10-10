
/* =========================================
   MY LIFE OS — LIFE DOMAINS MANAGER
   File: life-domains.js
========================================= */

const LifeDomainsManager = (() => {
    "use strict";

    const STORAGE_KEY = "life-domain-reviews";

    const DEFAULT_DOMAINS = [
        {
            id: "education",
            name: "التعليم والتعلم",
            description: "الدراسة والمعرفة وتطوير المهارات"
        },
        {
            id: "career",
            name: "المسار المهني",
            description: "الشهادات والخبرة والعمل"
        },
        {
            id: "finance",
            name: "المال والاستقلال المالي",
            description: "الدخل والادخار وإدارة المصروفات"
        },
        {
            id: "health",
            name: "الصحة والطاقة",
            description: "النوم والنشاط والعناية بالنفس"
        },
        {
            id: "discipline",
            name: "الانضباط وإدارة الوقت",
            description: "الالتزام وتقليل المشتتات"
        },
        {
            id: "relationships",
            name: "العلاقات والتواصل",
            description: "الأسرة والأصدقاء والحدود الشخصية"
        },
        {
            id: "personal_growth",
            name: "التطور الشخصي",
            description: "الثقة بالنفس والتعلم من التجارب"
        },
        {
            id: "meaning",
            name: "القيم والمعنى",
            description: "القيم والمبادئ وما يمنح الحياة معنى"
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
            const data = AppStorage.get(STORAGE_KEY);

            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error(
                "LifeDomainsManager: read failed.",
                error
            );

            return [];
        }
    }

    function writeAll(reviews) {
        try {
            return AppStorage.set(STORAGE_KEY, reviews) !== false;
        } catch (error) {
            console.error(
                "LifeDomainsManager: save failed.",
                error
            );

            return false;
        }
    }

    function getDomains() {
        return DEFAULT_DOMAINS.map(domain => ({ ...domain }));
    }

    function addReview(domainId, score, reflection = "", date) {
        const domain = DEFAULT_DOMAINS.find(
            item => item.id === domainId
        );

        if (!domain) {
            return {
                success: false,
                message: "مجال الحياة غير معروف."
            };
        }

        const numericScore = Number(score);

        if (
            !Number.isFinite(numericScore) ||
            numericScore < 1 ||
            numericScore > 10
        ) {
            return {
                success: false,
                message: "يجب أن يكون التقييم بين 1 و10."
            };
        }

        const reviewDate = date ||
            new Date().toISOString().slice(0, 10);

        if (
            typeof reviewDate !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(reviewDate) ||
            Number.isNaN(
                new Date(reviewDate + "T00:00:00").getTime()
            ) ||
            new Date(reviewDate + "T00:00:00")
                .toISOString()
                .slice(0, 10) !== reviewDate
        ) {
            return {
                success: false,
                message: "تاريخ التقييم غير صحيح."
            };
        }

        const reviews = readAll();

        const review = {
            id: createId(),
            domainId: domain.id,
            domainName: domain.name,
            score: Math.round(numericScore),
            reflection: String(reflection || "").trim(),
            date: reviewDate,
            createdAt: new Date().toISOString()
        };

        reviews.push(review);

        if (!writeAll(reviews)) {
            return {
                success: false,
                message: "تعذر حفظ التقييم."
            };
        }

        return {
            success: true,
            review: review
        };
    }

    function getReviews(options = {}) {
        let reviews = readAll();

        if (options.domainId) {
            reviews = reviews.filter(
                review => review.domainId === options.domainId
            );
        }

        if (options.fromDate) {
            reviews = reviews.filter(
                review => review.date >= options.fromDate
            );
        }

        if (options.toDate) {
            reviews = reviews.filter(
                review => review.date <= options.toDate
            );
        }

        return reviews.sort((a, b) =>
            b.date.localeCompare(a.date)
        );
    }

    function getLatestReview(domainId) {
        return getReviews({ domainId })[0] || null;
    }

    function getOverview() {
        const reviews = readAll();

        return DEFAULT_DOMAINS.map(domain => {
            const domainReviews = reviews
                .filter(review => review.domainId === domain.id)
                .sort((a, b) => b.date.localeCompare(a.date));

            const latest = domainReviews[0] || null;

            const average = domainReviews.length
                ? Math.round(
                    domainReviews.reduce(
                        (sum, review) => sum + review.score,
                        0
                    ) / domainReviews.length * 10
                ) / 10
                : null;

            return {
                ...domain,
                latestScore: latest ? latest.score : null,
                latestDate: latest ? latest.date : null,
                averageScore: average,
                reviewCount: domainReviews.length
            };
        });
    }

    function removeReview(id) {
        const reviews = readAll();
        const remaining = reviews.filter(
            review => review.id !== id
        );

        if (remaining.length === reviews.length) {
            return {
                success: false,
                message: "التقييم غير موجود."
            };
        }

        if (!writeAll(remaining)) {
            return {
                success: false,
                message: "تعذر حذف التقييم."
            };
        }

        return {
            success: true,
            message: "تم حذف التقييم."
        };
    }

    return {
        DEFAULT_DOMAINS: getDomains(),
        getDomains,
        addReview,
        getReviews,
        getLatestReview,
        getOverview,
        removeReview
    };
})();
