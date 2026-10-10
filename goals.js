
/* ========================================
   MY LIFE OS — GOALS MANAGER
   نظام إدارة الأهداف
======================================== */

"use strict";

(function (window) {
  if (window.GoalsManager) {
    console.warn("[MY LIFE OS] GoalsManager موجود مسبقًا.");
    return;
  }

  const STORAGE_KEY = "goals";

  const VALID_STATUSES = [
    "not-started",
    "active",
    "completed",
    "paused",
    "cancelled"
  ];

  const VALID_PRIORITIES = [
    "low",
    "medium",
    "high",
    "urgent"
  ];

  let goals = [];
  let initialized = false;

  function createId() {
    if (
      window.AppUtils &&
      typeof window.AppUtils.createId === "function"
    ) {
      return window.AppUtils.createId();
    }

    return "goal-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 9);
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function now() {
    return new Date().toISOString();
  }

  function getStorage() {
    return window.AppStorage || null;
  }

  function emit(name, detail) {
    if (
      window.AppEvents &&
      typeof window.AppEvents.emit === "function"
    ) {
      window.AppEvents.emit(name, detail);
    }
  }

  function normalizeText(value, maxLength = 500) {
    if (typeof value !== "string") {
      return "";
    }

    return value.trim().slice(0, maxLength);
  }

  function normalizeDate(value) {
    if (value === "" || value == null) {
      return null;
    }

    if (
      typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      return undefined;
    }

    const date = new Date(value + "T00:00:00Z");

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      return undefined;
    }

    return value;
  }

  function normalizeProgress(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round(number)));
  }

  function normalizeGoal(goal) {
    if (!goal || typeof goal !== "object") {
      return null;
    }

    const title = normalizeText(goal.title, 200);

    if (!title) {
      return null;
    }

    return {
      id: typeof goal.id === "string" && goal.id
        ? goal.id
        : createId(),

      title,

      description: normalizeText(
        goal.description,
        3000
      ),

      category: normalizeText(
        goal.category || "personal",
        100
      ),

      domainId: normalizeText(
        goal.domainId,
        100
      ) || null,

      priority: VALID_PRIORITIES.includes(goal.priority)
        ? goal.priority
        : "medium",

      status: VALID_STATUSES.includes(goal.status)
        ? goal.status
        : "not-started",

      progress: goal.status === "completed"
        ? 100
        : normalizeProgress(goal.progress),

      startDate: normalizeDate(goal.startDate) || null,

      dueDate: normalizeDate(goal.dueDate) || null,

      parentGoalId: typeof goal.parentGoalId === "string"
        ? goal.parentGoalId
        : null,

      source: goal.source && typeof goal.source === "object"
        ? {
            type: normalizeText(goal.source.type, 50),
            id: normalizeText(goal.source.id, 200)
          }
        : null,

      notes: normalizeText(goal.notes, 5000),

      createdAt: goal.createdAt || now(),
      updatedAt: now(),
      completedAt: goal.status === "completed"
        ? goal.completedAt || now()
        : null
    };
  }

  function load() {
    const storage = getStorage();

    if (!storage || typeof storage.get !== "function") {
      goals = [];
      return;
    }

    try {
      const saved = storage.get(STORAGE_KEY);

      goals = Array.isArray(saved)
        ? saved.map(normalizeGoal).filter(Boolean)
        : [];
    } catch (error) {
      console.error(
        "[MY LIFE OS] تعذر تحميل الأهداف.",
        error
      );

      goals = [];
    }
  }

  function save() {
    const storage = getStorage();

    if (!storage || typeof storage.set !== "function") {
      return false;
    }

    try {
      return storage.set(STORAGE_KEY, goals) !== false;
    } catch (error) {
      console.error(
        "[MY LIFE OS] تعذر حفظ الأهداف.",
        error
      );

      return false;
    }
  }

  function initialize() {
    if (initialized) {
      return getAll();
    }

    load();
    initialized = true;

    emit("goals:initialized", getAll());

    console.info("[MY LIFE OS] تمت تهيئة نظام الأهداف.");

    return getAll();
  }

  function getAll(filters = {}) {
    let result = [...goals];

    if (filters.status) {
      result = result.filter(
        (goal) => goal.status === filters.status
      );
    }

    if (filters.category) {
      result = result.filter(
        (goal) => goal.category === filters.category
      );
    }

    if (filters.domainId) {
      result = result.filter(
        (goal) => goal.domainId === filters.domainId
      );
    }

    if (filters.priority) {
      result = result.filter(
        (goal) => goal.priority === filters.priority
      );
    }

    if (filters.search) {
      const query = String(filters.search)
        .trim()
        .toLowerCase();

      result = result.filter((goal) =>
        (goal.title + " " + goal.description)
          .toLowerCase()
          .includes(query)
      );
    }

    const priorityWeight = {
      low: 1,
      medium: 2,
      high: 3,
      urgent: 4
    };

    result.sort((a, b) => {
      const priorityDifference =
        priorityWeight[b.priority] -
        priorityWeight[a.priority];

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return b.updatedAt.localeCompare(a.updatedAt);
    });

    return result;
  }

  function getById(id) {
    return goals.find((goal) => goal.id === id) || null;
  }

  function validateDates(startDate, dueDate) {
    const start = normalizeDate(startDate);
    const due = normalizeDate(dueDate);

    if (start === undefined || due === undefined) {
      return {
        valid: false,
        message: "أحد التواريخ غير صالح."
      };
    }

    if (start && due && due < start) {
      return {
        valid: false,
        message: "موعد الإنجاز لا يمكن أن يسبق تاريخ البداية."
      };
    }

    return { valid: true };
  }

  function create(input = {}) {
    if (!initialized) {
      initialize();
    }

    if (!input || typeof input !== "object") {
      return {
        success: false,
        message: "بيانات الهدف غير صالحة."
      };
    }

    const title = normalizeText(input.title, 200);

    if (!title) {
      return {
        success: false,
        message: "اكتب عنوان الهدف أولًا."
      };
    }

    if (
      input.priority &&
      !VALID_PRIORITIES.includes(input.priority)
    ) {
      return {
        success: false,
        message: "الأولوية المحددة غير صالحة."
      };
    }

    if (
      input.status &&
      !VALID_STATUSES.includes(input.status)
    ) {
      return {
        success: false,
        message: "حالة الهدف غير صالحة."
      };
    }

    const dates = validateDates(
      input.startDate,
      input.dueDate
    );

    if (!dates.valid) {
      return {
        success: false,
        message: dates.message
      };
    }

    if (input.domainId) {
      const manager = window.LifeDomainsManager;

      if (
        manager &&
        !manager.getById(input.domainId)
      ) {
        return {
          success: false,
          message: "مجال الحياة المحدد غير موجود."
        };
      }
    }

    if (input.parentGoalId) {
      const parent = getById(input.parentGoalId);

      if (!parent) {
        return {
          success: false,
          message: "الهدف الرئيسي غير موجود."
        };
      }
    }

    const normalized = normalizeGoal({
      ...input,
      title,
      id: createId(),
      createdAt: now(),
      updatedAt: now()
    });

    if (!normalized) {
      return {
        success: false,
        message: "تعذر إنشاء الهدف."
      };
    }

    goals.push(normalized);

    const saved = save();

    emit("goals:created", {
      goal: { ...normalized },
      saved
    });

    return {
      success: true,
      saved,
      goal: { ...normalized }
    };
  }

  function update(id, changes = {}) {
    if (!initialized) {
      initialize();
    }

    const index = goals.findIndex(
      (goal) => goal.id === id
    );

    if (index === -1) {
      return {
        success: false,
        message: "الهدف غير موجود."
      };
    }

    if (
      !changes ||
      typeof changes !== "object" ||
      Array.isArray(changes)
    ) {
      return {
        success: false,
        message: "التغييرات غير صالحة."
      };
    }

    const allowed = [
      "title",
      "description",
      "category",
      "domainId",
      "priority",
      "status",
      "progress",
      "startDate",
      "dueDate",
      "parentGoalId",
      "notes"
    ];

    for (const key of Object.keys(changes)) {
      if (!allowed.includes(key)) {
        return {
          success: false,
          message: "لا يمكن تعديل الحقل: " + key
        };
      }
    }

    const current = goals[index];
    const candidate = {
      ...current,
      ...changes
    };

    if (
      typeof candidate.title !== "string" ||
      !candidate.title.trim()
    ) {
      return {
        success: false,
        message: "عنوان الهدف مطلوب."
      };
    }

    if (!VALID_PRIORITIES.includes(candidate.priority)) {
      return {
        success: false,
        message: "الأولوية غير صالحة."
      };
    }

    if (!VALID_STATUSES.includes(candidate.status)) {
      return {
        success: false,
        message: "حالة الهدف غير صالحة."
      };
    }

    const dates = validateDates(
      candidate.startDate,
      candidate.dueDate
    );

    if (!dates.valid) {
      return {
        success: false,
        message: dates.message
      };
    }

    if (candidate.parentGoalId === id) {
      return {
        success: false,
        message: "لا يمكن جعل الهدف تابعًا لنفسه."
      };
    }

    if (
      candidate.parentGoalId &&
      !getById(candidate.parentGoalId)
    ) {
      return {
        success: false,
        message: "الهدف الرئيسي غير موجود."
      };
    }

    if (
      candidate.domainId &&
      window.LifeDomainsManager &&
      !window.LifeDomainsManager.getById(candidate.domainId)
    ) {
      return {
        success: false,
        message: "مجال الحياة المحدد غير موجود."
      };
    }

    const updated = normalizeGoal({
      ...candidate,
      id,
      createdAt: current.createdAt,
      updatedAt: now(),
      completedAt: candidate.status === "completed"
        ? current.completedAt || now()
        : null
    });

    if (!updated) {
      return {
        success: false,
        message: "تعذر تحديث الهدف."
      };
    }

    goals[index] = updated;

    const saved = save();

    emit("goals:updated", {
      goal: { ...updated },
      saved
    });

    return {
      success: true,
      saved,
      goal: { ...updated }
    };
  }

  function setProgress(id, progress) {
    const value = Number(progress);

    if (
      !Number.isFinite(value) ||
      value < 0 ||
      value > 100
    ) {
      return {
        success: false,
        message: "يجب أن يكون التقدم بين 0 و100."
      };
    }

    const goal = getById(id);

    if (!goal) {
      return {
        success: false,
        message: "الهدف غير موجود."
      };
    }

    return update(id, {
      progress: Math.round(value),
      status: value === 100
        ? "completed"
        : goal.status === "completed"
          ? "active"
          : goal.status
    });
  }

  function complete(id) {
    return update(id, {
      status: "completed",
      progress: 100
    });
  }

  function remove(id) {
    if (!initialized) {
      initialize();
    }

    const goal = getById(id);

    if (!goal) {
      return {
        success: false,
        message: "الهدف غير موجود."
      };
    }

    /*
     * منع حذف هدف رئيسي له أهداف فرعية.
     */
    const children = goals.filter(
      (item) => item.parentGoalId === id
    );

    if (children.length > 0) {
      return {
        success: false,
        message: "انقل الأهداف الفرعية أو احذفها أولًا."
      };
    }

    goals = goals.filter((item) => item.id !== id);

    const saved = save();

    emit("goals:deleted", {
      goal: { ...goal },
      saved
    });

    return {
      success: true,
      saved,
      goal
    };
  }

  function getSummary() {
    if (!initialized) {
      initialize();
    }

    const total = goals.length;

    const completed = goals.filter(
      (goal) => goal.status === "completed"
    ).length;

    const active = goals.filter(
      (goal) => goal.status === "active"
    ).length;

    const notStarted = goals.filter(
      (goal) => goal.status === "not-started"
    ).length;

    const paused = goals.filter(
      (goal) => goal.status === "paused"
    ).length;

    const averageProgress = total
      ? Math.round(
          goals.reduce(
            (sum, goal) => sum + goal.progress,
            0
          ) / total
        )
      : 0;

    const overdue = goals.filter(
      (goal) =>
        goal.dueDate &&
        goal.dueDate < today() &&
        goal.status !== "completed" &&
        goal.status !== "cancelled"
    ).length;

    return {
      total,
      completed,
      active,
      notStarted,
      paused,
      overdue,
      averageProgress,
      completionRate: total
        ? Math.round((completed / total) * 100)
        : 0
    };
  }

  function reset() {
    goals = [];

    const saved = save();

    emit("goals:reset", { saved });

    return {
      success: true,
      saved
    };
  }

  window.GoalsManager = Object.freeze({
    initialize,
    getAll,
    getById,
    create,
    update,
    setProgress,
    complete,
    remove,
    getSummary,
    reset
  });

})(window);
