
/* =========================================
   MY LIFE OS — SPORTS MODULE
   File: sports.js
========================================= */

const SportsManager = (() => {
    "use strict";

    const STORAGE_KEY = "sports-data";

    const ACTIVITY_TYPES = [
        "تمارين القوة",
        "الجري",
        "المشي",
        "ركوب الدراجة",
        "تمارين المرونة",
        "تمارين التحمل",
        "رياضة أخرى"
    ];

    function createId() {
        if (
            typeof AppUtils !== "undefined" &&
            typeof AppUtils.createId === "function"
        ) {
            return AppUtils.createId();
        }

        return (
            "sport-" +
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
                "يجب تحميل storage.js قبل sports.js"
            );
        }

        const data = AppStorage.get(STORAGE_KEY, {});

        return {
            goals: Array.isArray(data.goals) ? data.goals : [],
            sessions: Array.isArray(data.sessions)
                ? data.sessions
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
                "يجب تحميل storage.js قبل sports.js"
            );
        }

        data.updatedAt = new Date().toISOString();
        AppStorage.set(STORAGE_KEY, data);

        return data;
    }

    function validateText(value, fieldName) {
        if (
            typeof value !== "string" ||
            !value.trim()
        ) {
            throw new Error(
                fieldName + " مطلوب."
            );
        }

        return value.trim();
    }

    function validateMinutes(value) {
        const minutes = Number(value);

        if (
            !Number.isFinite(minutes) ||
            minutes <= 0 ||
            minutes > 1440
        ) {
            throw new Error(
                "مدة التمرين يجب أن تكون بين دقيقة و1440 دقيقة."
            );
        }

        return minutes;
    }

    function validateDate(value) {
        const date = value
            ? new Date(value)
            : new Date();

        if (Number.isNaN(date.getTime())) {
            throw new Error("تاريخ غير صالح.");
        }

        return date.toISOString();
    }

    function addGoal(input = {}) {
        const data = getData();

        const goal = {
            id: createId(),
            title: validateText(
                input.title,
                "اسم الهدف"
            ),
            targetSessions: Math.max(
                1,
                Math.floor(Number(input.targetSessions) || 3)
            ),
            targetMinutes: Math.max(
                0,
                Math.floor(Number(input.targetMinutes) || 0)
            ),
            activityType: input.activityType || "رياضة أخرى",
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
        const index = data.goals.findIndex(
            goal => goal.id === id
        );

        if (index === -1) {
            throw new Error("الهدف الرياضي غير موجود.");
        }

        const goal = data.goals[index];

        if (changes.title !== undefined) {
            goal.title = validateText(
                changes.title,
                "اسم الهدف"
            );
        }

        if (changes.targetSessions !== undefined) {
            const count = Number(changes.targetSessions);

            if (!Number.isFinite(count) || count < 1) {
                throw new Error("عدد الجلسات يجب أن يكون 1 على الأقل.");
            }

            goal.targetSessions = Math.floor(count);
        }

        if (changes.targetMinutes !== undefined) {
            const minutes = Number(changes.targetMinutes);

            if (!Number.isFinite(minutes) || minutes < 0) {
                throw new Error("مدة الهدف غير صالحة.");
            }

            goal.targetMinutes = Math.floor(minutes);
        }

        if (changes.activityType !== undefined) {
            goal.activityType = validateText(
                changes.activityType,
                "نوع الرياضة"
            );
        }

        if (changes.deadline !== undefined) {
            goal.deadline = changes.deadline || null;
        }

        if (changes.notes !== undefined) {
            goal.notes = String(changes.notes).trim();
        }

        if (changes.active !== undefined) {
            goal.active = Boolean(changes.active);
        }

        saveData(data);

        return { ...goal };
    }

    function deleteGoal(id) {
        const data = getData();
        const previousLength = data.goals.length;

        data.goals = data.goals.filter(
            goal => goal.id !== id
        );

        if (data.goals.length === previousLength) {
            return false;
        }

        saveData(data);
        return true;
    }

    function addSession(input = {}) {
        const data = getData();

        const session = {
            id: createId(),
            activityType: validateText(
                input.activityType || "رياضة أخرى",
                "نوع الرياضة"
            ),
            activityName: validateText(
                input.activityName || input.activityType || "رياضة أخرى",
                "اسم النشاط"
            ),
            minutes: validateMinutes(input.minutes),
            date: validateDate(input.date),
            intensity: [
                "خفيف",
                "متوسط",
                "مرتفع"
            ].includes(input.intensity)
                ? input.intensity
                : "متوسط",
            notes: String(input.notes || "").trim(),
            completed: input.completed !== false,
            createdAt: new Date().toISOString()
        };

        data.sessions.push(session);
        saveData(data);

        return { ...session };
    }

    function getSessions(options = {}) {
        const data = getData();

        let sessions = data.sessions;

        if (options.from) {
            const from = new Date(options.from);

            if (!Number.isNaN(from.getTime())) {
                sessions = sessions.filter(
                    session => new Date(session.date) >= from
                );
            }
        }

        if (options.to) {
            const to = new Date(options.to);

            if (!Number.isNaN(to.getTime())) {
                sessions = sessions.filter(
                    session => new Date(session.date) <= to
                );
            }
        }

        if (options.activityType) {
            sessions = sessions.filter(
                session =>
                    session.activityType === options.activityType
            );
        }

        return sessions
            .slice()
            .sort(
                (a, b) =>
                    new Date(b.date) - new Date(a.date)
            )
            .map(session => ({ ...session }));
    }

    function deleteSession(id) {
        const data = getData();
        const previousLength = data.sessions.length;

        data.sessions = data.sessions.filter(
            session => session.id !== id
        );

        if (data.sessions.length === previousLength) {
            return false;
        }

        saveData(data);
        return true;
    }

    function getStats(options = {}) {
        const sessions = getSessions(options);
        const completed = sessions.filter(
            session => session.completed
        );

        const totalMinutes = completed.reduce(
            (sum, session) => sum + session.minutes,
            0
        );

        const byActivity = {};

        completed.forEach(session => {
            const key = session.activityType;

            if (!byActivity[key]) {
                byActivity[key] = {
                    sessions: 0,
                    minutes: 0
                };
            }

            byActivity[key].sessions += 1;
            byActivity[key].minutes += session.minutes;
        });

        return {
            totalSessions: completed.length,
            totalMinutes,
            totalHours: Math.round(
                (totalMinutes / 60) * 100
            ) / 100,
            averageMinutes: completed.length
                ? Math.round(totalMinutes / completed.length)
                : 0,
            byActivity
        };
    }

    function getWeeklyStats(date = new Date()) {
        const end = new Date(date);

        if (Number.isNaN(end.getTime())) {
            throw new Error("تاريخ الأسبوع غير صالح.");
        }

        end.setHours(23, 59, 59, 999);

        const start = new Date(end);
        const day = (start.getDay() + 6) % 7;

        start.setDate(start.getDate() - day);
        start.setHours(0, 0, 0, 0);

        const stats = getStats({
            from: start.toISOString(),
            to: end.toISOString()
        });

        return {
            ...stats,
            weekStart: start.toISOString(),
            weekEnd: end.toISOString()
        };
    }

    function getGoalProgress(id) {
        const goal = getGoals().find(
            item => item.id === id
        );

        if (!goal) {
            throw new Error("الهدف الرياضي غير موجود.");
        }

        const sessions = getSessions().filter(
            session =>
                session.completed &&
                session.activityType === goal.activityType &&
                new Date(session.createdAt) >=
                    new Date(goal.createdAt)
        );

        const sessionCount = sessions.length;

        const minutes = sessions.reduce(
            (sum, session) => sum + session.minutes,
            0
        );

        const countProgress = Math.min(
            100,
            Math.round(
                (sessionCount / goal.targetSessions) * 100
            )
        );

        const timeProgress = goal.targetMinutes > 0
            ? Math.min(
                100,
                Math.round(
                    (minutes / goal.targetMinutes) * 100
                )
            )
            : null;

        return {
            goalId: id,
            completedSessions: sessionCount,
            targetSessions: goal.targetSessions,
            completedMinutes: minutes,
            targetMinutes: goal.targetMinutes,
            sessionsProgress: countProgress,
            minutesProgress: timeProgress
        };
    }

    function getActivityTypes() {
        return [...ACTIVITY_TYPES];
    }

    return {
        addGoal,
        getGoals,
        updateGoal,
        deleteGoal,
        addSession,
        getSessions,
        deleteSession,
        getStats,
        getWeeklyStats,
        getGoalProgress,
        getActivityTypes
    };
})();

/* End of sports.js */
