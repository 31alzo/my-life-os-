
/* =========================================
   MY LIFE OS — 90 DAY PLAN MANAGER
   File: plan90.js
========================================= */

const Plan90Manager = (() => {
    "use strict";

    const STORAGE_KEY = "plan-90-days";

    const PHASES = [
        {
            id: "phase-1",
            name: "المرحلة الأولى",
            days: "1–30",
            focus: "التأسيس وبناء العادات"
        },
        {
            id: "phase-2",
            name: "المرحلة الثانية",
            days: "31–60",
            focus: "التطوير والاستمرار"
        },
        {
            id: "phase-3",
            name: "المرحلة الثالثة",
            days: "61–90",
            focus: "التثبيت والتقييم"
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

    function readPlan() {
        try {
            const plan = AppStorage.get(STORAGE_KEY);

            if (
                plan &&
                typeof plan === "object" &&
                Array.isArray(plan.goals)
            ) {
                return plan;
            }
        } catch (error) {
            console.error("Plan90Manager: read failed.", error);
        }

        return {
            title: "خطة تطوير الذات لمدة 90 يومًا",
            startDate: null,
            goals: [],
            dailyLog: [],
            weeklyReviews: [],
            createdAt: null,
            updatedAt: null
        };
    }

    function savePlan(plan) {
        plan.updatedAt = new Date().toISOString();

        try {
            const saved = AppStorage.set(STORAGE_KEY, plan);

            return saved !== false;
        } catch (error) {
            console.error("Plan90Manager: save failed.", error);
            return false;
        }
    }

    function getPlan() {
        return readPlan();
    }

    function start(startDate = new Date().toISOString().slice(0, 10)) {
        const plan = readPlan();

        if (plan.startDate) {
            return {
                success: false,
                message: "الخطة بدأت بالفعل. لا يمكن تغيير تاريخها بهذه العملية."
            };
        }

        if (!isValidDate(startDate)) {
            return {
                success: false,
                message: "تاريخ البداية غير صحيح."
            };
        }

        plan.startDate = startDate;
        plan.createdAt = new Date().toISOString();

        if (!savePlan(plan)) {
            return {
                success: false,
                message: "تعذر حفظ بداية الخطة."
            };
        }

        return {
            success: true,
            message: "تم بدء خطة التسعين يومًا.",
            plan: plan
        };
    }

    function isValidDate(value) {
        if (typeof value !== "string") {
            return false;
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return false;
        }

        const date = new Date(value + "T00:00:00");

        return (
            !Number.isNaN(date.getTime()) &&
            date.toISOString().slice(0, 10) === value
        );
    }

    function getDayNumber(referenceDate = new Date()) {
        const plan = readPlan();

        if (!plan.startDate) {
            return 0;
        }

        const startDate = new Date(plan.startDate + "T00:00:00");
        const currentDate = new Date(referenceDate);

        if (Number.isNaN(currentDate.getTime())) {
            return 0;
        }

        currentDate.setHours(0, 0, 0, 0);

        const difference = Math.floor(
            (currentDate.getTime() - startDate.getTime()) /
            86400000
        );

        if (difference < 0) {
            return 0;
        }

        return Math.min(difference + 1, 90);
    }

    function getCurrentPhase(referenceDate = new Date()) {
        const day = getDayNumber(referenceDate);

        if (day === 0) {
            return null;
        }

        if (day <= 30) {
            return PHASES[0];
        }

        if (day <= 60) {
            return PHASES[1];
        }

        return PHASES[2];
    }

    function addGoal(title, description = "", phaseId = "phase-1") {
        const cleanTitle = String(title || "").trim();

        if (!cleanTitle) {
            return {
                success: false,
                message: "اكتب اسم الهدف أولًا."
            };
        }

        if (!PHASES.some(phase => phase.id === phaseId)) {
            return {
                success: false,
                message: "المرحلة المحددة غير صحيحة."
            };
        }

        const plan = readPlan();

        const goal = {
            id: createId(),
            title: cleanTitle,
            description: String(description || "").trim(),
            phaseId: phaseId,
            status: "not_started",
            progress: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        plan.goals.push(goal);

        if (!savePlan(plan)) {
            return {
                success: false,
                message: "تعذر حفظ الهدف."
            };
        }

        return {
            success: true,
            goal: goal
        };
    }

    function updateGoal(id, changes = {}) {
        const plan = readPlan();
        const goal = plan.goals.find(item => item.id === id);

        if (!goal) {
            return {
                success: false,
                message: "الهدف غير موجود."
            };
        }

        if (typeof changes.title === "string") {
            if (!changes.title.trim()) {
                return {
                    success: false,
                    message: "اسم الهدف لا يمكن أن يكون فارغًا."
                };
            }

            goal.title = changes.title.trim();
        }

        if (typeof changes.description === "string") {
            goal.description = changes.description.trim();
        }

        if (typeof changes.phaseId === "string") {
            if (!PHASES.some(phase => phase.id === changes.phaseId)) {
                return {
                    success: false,
                    message: "المرحلة المحددة غير صحيحة."
                };
            }

            goal.phaseId = changes.phaseId;
        }

        if (typeof changes.progress === "number") {
            if (
                !Number.isFinite(changes.progress) ||
                changes.progress < 0 ||
                changes.progress > 100
            ) {
                return {
                    success: false,
                    message: "نسبة التقدم يجب أن تكون بين 0 و100."
                };
            }

            goal.progress = Math.round(changes.progress);

            if (goal.progress === 100) {
                goal.status = "completed";
            } else if (goal.progress > 0) {
                goal.status = "in_progress";
            } else {
                goal.status = "not_started";
            }
        }

        if (
            typeof changes.status === "string" &&
            ["not_started", "in_progress", "completed", "paused"].includes(
                changes.status
            )
        ) {
            goal.status = changes.status;
        }

        goal.updatedAt = new Date().toISOString();

        if (!savePlan(plan)) {
            return {
                success: false,
                message: "تعذر تحديث الهدف."
            };
        }

        return {
            success: true,
            goal: goal
        };
    }

    function removeGoal(id) {
        const plan = readPlan();
        const previousLength = plan.goals.length;

        plan.goals = plan.goals.filter(goal => goal.id !== id);

        if (plan.goals.length === previousLength) {
            return {
                success: false,
                message: "الهدف غير موجود."
            };
        }

        if (!savePlan(plan)) {
            return {
                success: false,
                message: "تعذر حذف الهدف."
            };
        }

        return {
            success: true,
            message: "تم حذف الهدف."
        };
    }

    function addDailyLog(entry = {}) {
        const plan = readPlan();
        const date = entry.date ||
            new Date().toISOString().slice(0, 10);

        if (!isValidDate(date)) {
            return {
                success: false,
                message: "تاريخ السجل غير صحيح."
            };
        }

        const log = {
            id: createId(),
            date: date,
            achievements: String(entry.achievements || "").trim(),
            obstacles: String(entry.obstacles || "").trim(),
            lessons: String(entry.lessons || "").trim(),
            tomorrowFocus: String(entry.tomorrowFocus || "").trim(),
            createdAt: new Date().toISOString()
        };

        plan.dailyLog.push(log);

        if (!savePlan(plan)) {
            return {
                success: false,
                message: "تعذر حفظ السجل اليومي."
            };
        }

        return {
            success: true,
            log: log
        };
    }

    function addWeeklyReview(review = {}) {
        const plan = readPlan();

        const score = Number(review.score);

        if (
            !Number.isFinite(score) ||
            score < 0 ||
            score > 10
        ) {
            return {
                success: false,
                message: "التقييم الأسبوعي يجب أن يكون من 0 إلى 10."
            };
        }

        const item = {
            id: createId(),
            week: String(review.week || "").trim(),
            score: score,
            wins: String(review.wins || "").trim(),
            challenges: String(review.challenges || "").trim(),
            nextSteps: String(review.nextSteps || "").trim(),
            createdAt: new Date().toISOString()
        };

        plan.weeklyReviews.push(item);

        if (!savePlan(plan)) {
            return {
                success: false,
                message: "تعذر حفظ التقييم الأسبوعي."
            };
        }

        return {
            success: true,
            review: item
        };
    }

    function getProgress() {
        const plan = readPlan();
        const total = plan.goals.length;

        const completed = plan.goals.filter(
            goal => goal.status === "completed"
        ).length;

        const average = total
            ? Math.round(
                plan.goals.reduce(
                    (sum, goal) => sum + goal.progress,
                    0
                ) / total
            )
            : 0;

        return {
            day: getDayNumber(),
            phase: getCurrentPhase(),
            totalGoals: total,
            completedGoals: completed,
            averageProgress: average,
            dailyEntries: plan.dailyLog.length,
            weeklyReviews: plan.weeklyReviews.length,
            isStarted: Boolean(plan.startDate),
            isFinished: getDayNumber() === 90
        };
    }

    return {
        PHASES,
        getPlan,
        start,
        getDayNumber,
        getCurrentPhase,
        addGoal,
        updateGoal,
        removeGoal,
        addDailyLog,
        addWeeklyReview,
        getProgress
    };
})();
