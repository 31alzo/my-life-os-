
/* =========================================
   MY LIFE OS — ANALYTICS MANAGER
   File: analytics.js
========================================= */

const AnalyticsManager = (() => {
    "use strict";

    function safelyGet(callback) {
        try {
            if (typeof callback !== "function") {
                return [];
            }

            const result = callback();
            return Array.isArray(result) ? result : [];
        } catch (error) {
            console.warn("AnalyticsManager: data source unavailable.", error);
            return [];
        }
    }

    function getGoals() {
        if (typeof GoalsManager === "undefined") {
            return [];
        }

        return safelyGet(() => GoalsManager.getAll());
    }

    function getTasks() {
        if (typeof TasksManager === "undefined") {
            return [];
        }

        return safelyGet(() => TasksManager.getAll());
    }

    function getHabits() {
        if (typeof HabitsManager === "undefined") {
            return [];
        }

        return safelyGet(() => HabitsManager.getAll());
    }

    function getCompletionRate(items, isComplete) {
        if (items.length === 0) {
            return 0;
        }

        const completed = items.filter(isComplete).length;

        return Math.round((completed / items.length) * 100);
    }

    function getGoalStats() {
        const goals = getGoals();

        return {
            total: goals.length,
            completed: goals.filter(goal =>
                goal.status === "completed" ||
                goal.completed === true
            ).length,
            inProgress: goals.filter(goal =>
                goal.status === "in_progress" ||
                goal.status === "in-progress"
            ).length,
            completionRate: getCompletionRate(
                goals,
                goal =>
                    goal.status === "completed" ||
                    goal.completed === true
            )
        };
    }

    function getTaskStats() {
        const tasks = getTasks();

        const completed = tasks.filter(task =>
            task.status === "completed" ||
            task.status === "done" ||
            task.completed === true
        );

        const pending = tasks.filter(task =>
            task.status !== "completed" &&
            task.status !== "done" &&
            task.completed !== true
        );

        const overdue = pending.filter(task => {
            const dueDate = task.dueDate || task.date;

            if (!dueDate) {
                return false;
            }

            const due = new Date(dueDate);

            if (Number.isNaN(due.getTime())) {
                return false;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            due.setHours(0, 0, 0, 0);

            return due < today;
        });

        return {
            total: tasks.length,
            completed: completed.length,
            pending: pending.length,
            overdue: overdue.length,
            completionRate: getCompletionRate(
                tasks,
                task =>
                    task.status === "completed" ||
                    task.status === "done" ||
                    task.completed === true
            )
        };
    }

    function getHabitStats() {
        const habits = getHabits();

        return {
            total: habits.length,
            active: habits.filter(habit =>
                habit.active !== false &&
                habit.archived !== true
            ).length
        };
    }

    function getPlan90Stats() {
        if (typeof Plan90Manager === "undefined") {
            return null;
        }

        try {
            return Plan90Manager.getProgress();
        } catch (error) {
            console.warn("AnalyticsManager: plan data unavailable.", error);
            return null;
        }
    }

    function getOverview() {
        const goals = getGoalStats();
        const tasks = getTaskStats();
        const habits = getHabitStats();
        const plan90 = getPlan90Stats();

        return {
            generatedAt: new Date().toISOString(),
            goals,
            tasks,
            habits,
            plan90
        };
    }

    function getRecommendations() {
        const stats = getOverview();
        const recommendations = [];

        if (stats.goals.total === 0) {
            recommendations.push({
                priority: "high",
                title: "حدد هدفًا واضحًا",
                message: "ابدأ بإضافة هدف واحد تريد العمل عليه."
            });
        } else if (stats.goals.completionRate < 25) {
            recommendations.push({
                priority: "medium",
                title: "راجع أهدافك",
                message: "اختر خطوة صغيرة قابلة للتنفيذ لأحد أهدافك."
            });
        }

        if (stats.tasks.overdue > 0) {
            recommendations.push({
                priority: "high",
                title: "راجع المهام المتأخرة",
                message:
                    "لديك " + stats.tasks.overdue +
                    " مهمة متأخرة. قرر هل تنفذها أم تعيد جدولتها."
            });
        }

        if (stats.tasks.total === 0) {
            recommendations.push({
                priority: "medium",
                title: "أضف مهمة عملية",
                message: "حوّل أحد أهدافك إلى خطوة محددة تستطيع تنفيذها."
            });
        }

        if (
            stats.plan90 &&
            stats.plan90.isStarted &&
            stats.plan90.totalGoals === 0
        ) {
            recommendations.push({
                priority: "medium",
                title: "أضف أهداف خطة التسعين يومًا",
                message: "حدد ما تريد تغييره خلال هذه الفترة."
            });
        }

        if (recommendations.length === 0) {
            recommendations.push({
                priority: "low",
                title: "واصل المراجعة",
                message: "راجع تقدمك بانتظام وحدد الخطوة التالية."
            });
        }

        return recommendations;
    }

    return {
        getGoalStats,
        getTaskStats,
        getHabitStats,
        getPlan90Stats,
        getOverview,
        getRecommendations
    };
})();
