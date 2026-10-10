
/* =========================================
   MY LIFE OS — LEARNING MODULE
   File: learning.js
========================================= */

const LearningManager = (() => {
    "use strict";

    const STORAGE_KEY = "learning-data";

    const LEARNING_TYPES = [
        { id: "study", name: "الدراسة الأكاديمية" },
        { id: "reading", name: "القراءة" },
        { id: "research", name: "البحث والتحليل" },
        { id: "language", name: "تعلم اللغات" },
        { id: "digital", name: "المهارات الرقمية" },
        { id: "professional", name: "المهارات المهنية" },
        { id: "other", name: "تعلم آخر" }
    ];

    function createId() {
        if (
            typeof AppUtils !== "undefined" &&
            typeof AppUtils.createId === "function"
        ) {
            return AppUtils.createId();
        }

        return (
            "learning-" +
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
                "يجب تحميل storage.js قبل learning.js"
            );
        }

        const data = AppStorage.get(STORAGE_KEY, {});

        return {
            subjects: Array.isArray(data.subjects)
                ? data.subjects
                : [],
            sessions: Array.isArray(data.sessions)
                ? data.sessions
                : [],
            skills: Array.isArray(data.skills)
                ? data.skills
                : [],
            knowledge: Array.isArray(data.knowledge)
                ? data.knowledge
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
                "يجب تحميل storage.js قبل learning.js"
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

    function validateMinutes(value) {
        const minutes = Number(value);

        if (
            !Number.isFinite(minutes) ||
            minutes <= 0 ||
            minutes > 1440
        ) {
            throw new Error(
                "مدة التعلم يجب أن تكون بين دقيقة و1440 دقيقة."
            );
        }

        return minutes;
    }

    function validateType(typeId) {
        const type = LEARNING_TYPES.find(
            item => item.id === typeId
        );

        if (!type) {
            throw new Error("نوع التعلم غير صالح.");
        }

        return type;
    }

    function getTypes() {
        return LEARNING_TYPES.map(type => ({ ...type }));
    }

    // إضافة مادة أو مجال تعلم
    function addSubject(input = {}) {
        const data = getData();

        const subject = {
            id: createId(),
            title: validateText(
                input.title,
                "اسم المادة أو المجال"
            ),
            typeId: input.typeId || "study",
            description: String(
                input.description || ""
            ).trim(),
            targetHours: Math.max(
                0,
                Number(input.targetHours) || 0
            ),
            active: true,
            createdAt: new Date().toISOString()
        };

        validateType(subject.typeId);

        data.subjects.push(subject);
        saveData(data);

        return { ...subject };
    }

    function getSubjects(options = {}) {
        const data = getData();

        let subjects = data.subjects;

        if (options.activeOnly) {
            subjects = subjects.filter(
                item => item.active
            );
        }

        if (options.typeId) {
            validateType(options.typeId);

            subjects = subjects.filter(
                item => item.typeId === options.typeId
            );
        }

        return subjects.map(item => ({ ...item }));
    }

    function updateSubject(id, changes = {}) {
        const data = getData();

        const subject = data.subjects.find(
            item => item.id === id
        );

        if (!subject) {
            throw new Error("المادة أو المجال غير موجود.");
        }

        if (changes.title !== undefined) {
            subject.title = validateText(
                changes.title,
                "اسم المادة أو المجال"
            );
        }

        if (changes.typeId !== undefined) {
            validateType(changes.typeId);
            subject.typeId = changes.typeId;
        }

        if (changes.description !== undefined) {
            subject.description = String(
                changes.description || ""
            ).trim();
        }

        if (changes.targetHours !== undefined) {
            const hours = Number(changes.targetHours);

            if (!Number.isFinite(hours) || hours < 0) {
                throw new Error("عدد الساعات المستهدفة غير صالح.");
            }

            subject.targetHours = hours;
        }

        if (changes.active !== undefined) {
            subject.active = Boolean(changes.active);
        }

        saveData(data);

        return { ...subject };
    }

    function deleteSubject(id) {
        const data = getData();
        const oldLength = data.subjects.length;

        data.subjects = data.subjects.filter(
            item => item.id !== id
        );

        if (data.subjects.length === oldLength) {
            return false;
        }

        saveData(data);
        return true;
    }

    // تسجيل جلسة تعلم
    function addSession(input = {}) {
        const data = getData();

        const subject = data.subjects.find(
            item => item.id === input.subjectId
        );

        if (!subject) {
            throw new Error(
                "اختر مادة أو مجال تعلم موجودًا."
            );
        }

        const session = {
            id: createId(),
            subjectId: subject.id,
            subjectTitle: subject.title,
            minutes: validateMinutes(input.minutes),
            date: validateDate(input.date),
            method: String(input.method || "").trim(),
            summary: String(input.summary || "").trim(),
            understood: input.understood === true,
            nextStep: String(input.nextStep || "").trim(),
            createdAt: new Date().toISOString()
        };

        data.sessions.push(session);
        saveData(data);

        return { ...session };
    }

    function getSessions(options = {}) {
        const data = getData();

        let sessions = data.sessions;

        if (options.subjectId) {
            sessions = sessions.filter(
                item => item.subjectId === options.subjectId
            );
        }

        if (options.from) {
            const from = new Date(options.from);

            if (Number.isNaN(from.getTime())) {
                throw new Error("تاريخ البداية غير صالح.");
            }

            sessions = sessions.filter(
                item => new Date(item.date) >= from
            );
        }

        if (options.to) {
            const to = new Date(options.to);

            if (Number.isNaN(to.getTime())) {
                throw new Error("تاريخ النهاية غير صالح.");
            }

            sessions = sessions.filter(
                item => new Date(item.date) <= to
            );
        }

        return sessions
            .slice()
            .sort(
                (a, b) =>
                    new Date(b.date) - new Date(a.date)
            )
            .map(item => ({ ...item }));
    }

    function updateSession(id, changes = {}) {
        const data = getData();

        const session = data.sessions.find(
            item => item.id === id
        );

        if (!session) {
            throw new Error("جلسة التعلم غير موجودة.");
        }

        if (changes.subjectId !== undefined) {
            const subject = data.subjects.find(
                item => item.id === changes.subjectId
            );

            if (!subject) {
                throw new Error("المادة أو المجال غير موجود.");
            }

            session.subjectId = subject.id;
            session.subjectTitle = subject.title;
        }

        if (changes.minutes !== undefined) {
            session.minutes = validateMinutes(
                changes.minutes
            );
        }

        if (changes.date !== undefined) {
            session.date = validateDate(changes.date);
        }

        if (changes.method !== undefined) {
            session.method = String(
                changes.method || ""
            ).trim();
        }

        if (changes.summary !== undefined) {
            session.summary = String(
                changes.summary || ""
            ).trim();
        }

        if (changes.understood !== undefined) {
            session.understood = Boolean(
                changes.understood
            );
        }

        if (changes.nextStep !== undefined) {
            session.nextStep = String(
                changes.nextStep || ""
            ).trim();
        }

        saveData(data);

        return { ...session };
    }

    function deleteSession(id) {
        const data = getData();
        const oldLength = data.sessions.length;

        data.sessions = data.sessions.filter(
            item => item.id !== id
        );

        if (data.sessions.length === oldLength) {
            return false;
        }

        saveData(data);
        return true;
    }

    // المهارات التي يريد المستخدم اكتسابها
    function addSkill(input = {}) {
        const data = getData();

        const skill = {
            id: createId(),
            name: validateText(
                input.name,
                "اسم المهارة"
            ),
            level: ["beginner", "intermediate", "advanced"]
                .includes(input.level)
                ? input.level
                : "beginner",
            targetLevel: String(
                input.targetLevel || ""
            ).trim(),
            nextStep: String(
                input.nextStep || ""
            ).trim(),
            active: true,
            createdAt: new Date().toISOString()
        };

        data.skills.push(skill);
        saveData(data);

        return { ...skill };
    }

    function getSkills(options = {}) {
        const data = getData();

        let skills = data.skills;

        if (options.activeOnly) {
            skills = skills.filter(
                item => item.active
            );
        }

        return skills.map(item => ({ ...item }));
    }

    function updateSkill(id, changes = {}) {
        const data = getData();

        const skill = data.skills.find(
            item => item.id === id
        );

        if (!skill) {
            throw new Error("المهارة غير موجودة.");
        }

        if (changes.name !== undefined) {
            skill.name = validateText(
                changes.name,
                "اسم المهارة"
            );
        }

        if (changes.level !== undefined) {
            const allowed = [
                "beginner",
                "intermediate",
                "advanced"
            ];

            if (!allowed.includes(changes.level)) {
                throw new Error("مستوى المهارة غير صالح.");
            }

            skill.level = changes.level;
        }

        if (changes.targetLevel !== undefined) {
            skill.targetLevel = String(
                changes.targetLevel || ""
            ).trim();
        }

        if (changes.nextStep !== undefined) {
            skill.nextStep = String(
                changes.nextStep || ""
            ).trim();
        }

        if (changes.active !== undefined) {
            skill.active = Boolean(changes.active);
        }

        saveData(data);

        return { ...skill };
    }

    function deleteSkill(id) {
        const data = getData();
        const oldLength = data.skills.length;

        data.skills = data.skills.filter(
            item => item.id !== id
        );

        if (data.skills.length === oldLength) {
            return false;
        }

        saveData(data);
        return true;
    }

    // حفظ معلومة أو خلاصة بحث
    function addKnowledge(input = {}) {
        const data = getData();

        const entry = {
            id: createId(),
            title: validateText(
                input.title,
                "عنوان المعلومة"
            ),
            content: validateText(
                input.content,
                "محتوى المعلومة"
            ),
            source: String(input.source || "").trim(),
            tags: Array.isArray(input.tags)
                ? input.tags
                    .filter(tag => typeof tag === "string")
                    .map(tag => tag.trim())
                    .filter(Boolean)
                : [],
            verified: input.verified === true,
            date: validateDate(input.date),
            createdAt: new Date().toISOString()
        };

        data.knowledge.push(entry);
        saveData(data);

        return { ...entry };
    }

    function getKnowledge(options = {}) {
        const data = getData();

        let entries = data.knowledge;

        if (options.verifiedOnly) {
            entries = entries.filter(
                item => item.verified
            );
        }

        if (options.query) {
            const query = String(
                options.query
            ).trim().toLowerCase();

            entries = entries.filter(item =>
                (
                    item.title + " " +
                    item.content + " " +
                    item.source + " " +
                    item.tags.join(" ")
                ).toLowerCase().includes(query)
            );
        }

        return entries
            .slice()
            .sort(
                (a, b) =>
                    new Date(b.date) - new Date(a.date)
            )
            .map(item => ({
                ...item,
                tags: [...item.tags]
            }));
    }

    function deleteKnowledge(id) {
        const data = getData();
        const oldLength = data.knowledge.length;

        data.knowledge = data.knowledge.filter(
            item => item.id !== id
        );

        if (data.knowledge.length === oldLength) {
            return false;
        }

        saveData(data);
        return true;
    }

    function getStats(options = {}) {
        const sessions = getSessions(options);

        const totalMinutes = sessions.reduce(
            (sum, item) => sum + item.minutes,
            0
        );

        const understoodCount = sessions.filter(
            item => item.understood
        ).length;

        return {
            sessionCount: sessions.length,
            totalMinutes,
            totalHours: Math.round(
                totalMinutes / 60 * 100
            ) / 100,
            understoodSessions: understoodCount,
            knowledgeCount: getKnowledge().length,
            activeSkills: getSkills({
                activeOnly: true
            }).length
        };
    }

    return {
        getTypes,
        addSubject,
        getSubjects,
        updateSubject,
        deleteSubject,
        addSession,
        getSessions,
        updateSession,
        deleteSession,
        addSkill,
        getSkills,
        updateSkill,
        deleteSkill,
        addKnowledge,
        getKnowledge,
        deleteKnowledge,
        getStats
    };
})();

/* End of learning.js */
