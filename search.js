
/* =========================================
   MY LIFE OS — GLOBAL SEARCH
   File: search.js
========================================= */

const SearchManager = (() => {
    "use strict";

    function normalize(value) {
        return String(value ?? "")
            .toLowerCase()
            .normalize("NFKC")
            .trim();
    }

    function matchesQuery(values, query) {
        const normalizedQuery = normalize(query);

        if (!normalizedQuery) {
            return false;
        }

        const searchableText = values
            .filter(value =>
                value !== null &&
                value !== undefined
            )
            .map(value => {
                if (typeof value === "object") {
                    return JSON.stringify(value);
                }

                return String(value);
            })
            .join(" ");

        return normalize(searchableText).includes(normalizedQuery);
    }

    function safeCall(callback) {
        try {
            if (typeof callback !== "function") {
                return [];
            }

            const result = callback();

            return Array.isArray(result) ? result : [];
        } catch (error) {
            console.warn("SearchManager: a data source failed.", error);
            return [];
        }
    }

    function collectSources() {
        const sources = [];

        if (typeof GoalsManager !== "undefined") {
            sources.push({
                type: "goal",
                label: "الأهداف",
                getItems: () => GoalsManager.getAll()
            });
        }

        if (typeof TasksManager !== "undefined") {
            sources.push({
                type: "task",
                label: "المهام",
                getItems: () => TasksManager.getAll()
            });
        }

        if (typeof NotesManager !== "undefined") {
            sources.push({
                type: "note",
                label: "الملاحظات",
                getItems: () => NotesManager.getAll()
            });
        }

        if (typeof HabitsManager !== "undefined") {
            sources.push({
                type: "habit",
                label: "العادات",
                getItems: () => HabitsManager.getAll()
            });
        }

        if (typeof ScheduleManager !== "undefined") {
            sources.push({
                type: "schedule",
                label: "الجدول",
                getItems: () => ScheduleManager.getAll()
            });
        }

        if (typeof MemoManager !== "undefined") {
            sources.push({
                type: "memo",
                label: "المذكرات",
                getItems: () => MemoManager.getAll()
            });
        }

        if (typeof Plan90Manager !== "undefined") {
            sources.push({
                type: "plan90-goal",
                label: "أهداف خطة 90 يومًا",
                getItems: () => Plan90Manager.getPlan().goals
            });
        }

        return sources;
    }

    function search(query, options = {}) {
        const normalizedQuery = normalize(query);

        if (!normalizedQuery) {
            return {
                success: true,
                query: "",
                total: 0,
                results: []
            };
        }

        const allowedTypes = Array.isArray(options.types)
            ? options.types
            : null;

        const limit = Number.isInteger(options.limit) &&
            options.limit > 0
            ? Math.min(options.limit, 200)
            : 50;

        const results = [];

        for (const source of collectSources()) {
            if (
                allowedTypes &&
                !allowedTypes.includes(source.type)
            ) {
                continue;
            }

            const items = safeCall(source.getItems);

            for (const item of items) {
                if (!item || typeof item !== "object") {
                    continue;
                }

                const values = [
                    item.title,
                    item.name,
                    item.description,
                    item.text,
                    item.originalText,
                    item.content,
                    item.category,
                    item.status,
                    item.achievements,
                    item.obstacles,
                    item.lessons,
                    item.tomorrowFocus
                ];

                if (!matchesQuery(values, normalizedQuery)) {
                    continue;
                }

                results.push({
                    type: source.type,
                    typeLabel: source.label,
                    id: item.id ?? null,
                    title:
                        item.title ||
                        item.name ||
                        item.originalText?.slice(0, 70) ||
                        source.label,
                    description:
                        item.description ||
                        item.text ||
                        item.content ||
                        item.originalText ||
                        "",
                    status: item.status ?? null,
                    createdAt: item.createdAt ?? null
                });

                if (results.length >= limit) {
                    return {
                        success: true,
                        query: query,
                        total: results.length,
                        limited: true,
                        results: results
                    };
                }
            }
        }

        return {
            success: true,
            query: query,
            total: results.length,
            limited: false,
            results: results
        };
    }

    function getAvailableTypes() {
        return collectSources().map(source => ({
            type: source.type,
            label: source.label
        }));
    }

    return {
        search,
        getAvailableTypes
    };
})();
