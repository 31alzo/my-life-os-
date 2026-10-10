
/* ========================================
   MY LIFE OS — TASKS MANAGER
   إدارة المهام اليومية
======================================== */

"use strict";

(function (window) {
  if (window.TasksManager) {
    console.warn("[MY LIFE OS] TasksManager موجود مسبقًا.");
    return;
  }

  const STORAGE_KEY = "tasks";

  const STATUSES = [
    "pending",
    "in-progress",
    "completed",
    "deferred",
    "cancelled"
  ];

  const PRIORITIES = [
    "low",
    "medium",
    "high",
    "urgent"
  ];

  let tasks = [];
  let initialized = false;

  function createId() {
    if (
      window.AppUtils &&
      typeof window.AppUtils.createId === "function"
    ) {
      return window.AppUtils.createId();
    }

    return "task-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 9);
  }

  function now() {
    return new Date().toISOString();
  }

  function today() {
    const date = new Date();

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
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

  function cleanText(value, maxLength = 1000) {
    return typeof value === "string"
      ? value.trim().slice(0, maxLength)
      : "";
  }

  function normalizeDate(value) {
    if (value == null || value === "") {
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

  function normalizeTask(input) {
    if (!input || typeof input !== "object") {
      return null;
    }

    const title = cleanText(input.title, 200);

    if (!title) {
      return null;
    }

    const dueDate = normalizeDate(input.dueDate);
    const scheduledDate = normalizeDate(input.scheduledDate);

    if (dueDate === undefined || scheduledDate === undefined) {
      return null;
    }

    const duration = Number(input.durationMinutes);

    return {
      id: typeof input.id === "string" && input.id
        ? input.id
        : createId(),

      title,

      description: cleanText(input.description, 3000),

      status: STATUSES.includes(input.status)
        ? input.status
        : "pending",

      priority: PRIORITIES.includes(input.priority)
        ? input.priority
        : "medium",

      goalId: typeof input.goalId === "string"
        ? input.goalId
        : null,

      domainId: typeof input.domainId === "string"
        ? input.domainId
        : null,

      scheduledDate: scheduledDate || null,
      dueDate: dueDate || null,

      startTime: typeof input.startTime === "string" &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(input.startTime)
          ? input.startTime
          : null,

      durationMinutes: Number.isFinite(duration)
        ? Math.max(0, Math.min(1440, Math.round(duration)))
        : 0,

      completedAt: input.status === "completed"
        ? input.completedAt || now()
        : null,

      notes: cleanText(input.notes, 5000),

      source: input.source && typeof input.source === "object"
        ? {
            type: cleanText(input.source.type, 50),
            id: cleanText(input.source.id, 200)
          }
        : null,

      createdAt: input.createdAt || now(),
      updatedAt: now()
    };
  }

  function load() {
    const storage = getStorage();

    if (!storage || typeof storage.get !== "function") {
      tasks = [];
      return;
    }

    try {
      const saved = storage.get(STORAGE_KEY);

      tasks = Array.isArray(saved)
        ? saved.map(normalizeTask).filter(Boolean)
        : [];
    } catch (error) {
      console.error(
        "[MY LIFE OS] تعذر تحميل المهام.",
        error
      );

      tasks = [];
    }
  }

  function save() {
    const storage = getStorage();

    if (!storage || typeof storage.set !== "function") {
      return false;
    }

    try {
      return storage.set(STORAGE_KEY, tasks) !== false;
    } catch (error) {
      console.error(
        "[MY LIFE OS] تعذر حفظ المهام.",
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

    emit("tasks:initialized", getAll());

    console.info("[MY LIFE OS] تمت تهيئة المهام.");

    return getAll();
  }

  function getAll(filters = {}) {
    if (!initialized) {
      initialize();
    }

    let result = [...tasks];

    if (filters.status) {
      result = result.filter(
        (task) => task.status === filters.status
      );
    }

    if (filters.priority) {
      result = result.filter(
        (task) => task.priority === filters.priority
      );
    }

    if (filters.goalId) {
      result = result.filter(
        (task) => task.goalId === filters.goalId
      );
    }

    if (filters.domainId) {
      result = result.filter(
        (task) => task.domainId === filters.domainId
      );
    }

    if (filters.date) {
      result = result.filter(
        (task) =>
          task.scheduledDate === filters.date ||
          task.dueDate === filters.date
      );
    }

    if (filters.search) {
      const query = String(filters.search).toLowerCase();

      result = result.filter((task) =>
        (task.title + " " + task.description)
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

      if (a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }

      if (a.startTime) return -1;
      if (b.startTime) return 1;

      return b.updatedAt.localeCompare(a.updatedAt);
    });

    return result;
  }

  function getById(id) {
    if (!initialized) {
      initialize();
    }

    return tasks.find((task) => task.id === id) || null;
  }

  function validateLinks(input) {
    if (
      input.goalId &&
      window.GoalsManager &&
      !window.GoalsManager.getById(input.goalId)
    ) {
      return {
        valid: false,
        message: "الهدف المرتبط بهذه المهمة غير موجود."
      };
    }

    if (
      input.domainId &&
      window.LifeDomainsManager &&
      !window.LifeDomainsManager.getById(input.domainId)
    ) {
      return {
        valid: false,
        message: "مجال الحياة المحدد غير موجود."
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
        message: "بيانات المهمة غير صالحة."
      };
    }

    if (!cleanText(input.title, 200)) {
      return {
        success: false,
        message: "عنوان المهمة مطلوب."
      };
    }

    if (
      input.status &&
      !STATUSES.includes(input.status)
    ) {
      return {
        success: false,
        message: "حالة المهمة غير صالحة."
      };
    }

    if (
      input.priority &&
      !PRIORITIES.includes(input.priority)
    ) {
      return {
        success: false,
        message: "أولوية المهمة غير صالحة."
      };
    }

    const dates = [
      normalizeDate(input.scheduledDate),
      normalizeDate(input.dueDate)
    ];

    if (dates.includes(undefined)) {
      return {
        success: false,
        message: "تاريخ المهمة غير صالح."
      };
    }

    const links = validateLinks(input);

    if (!links.valid) {
      return {
        success: false,
        message: links.message
      };
    }

    const task = normalizeTask({
      ...input,
      id: createId(),
      createdAt: now(),
      updatedAt: now()
    });

    if (!task) {
      return {
        success: false,
        message: "تعذر إنشاء المهمة."
      };
    }

    tasks.push(task);

    const saved = save();

    emit("tasks:created", {
      task: { ...task },
      saved
    });

    return {
      success: true,
      saved,
      task: { ...task }
    };
  }

  function update(id, changes = {}) {
    if (!initialized) {
      initialize();
    }

    const index = tasks.findIndex(
      (task) => task.id === id
    );

    if (index === -1) {
      return {
        success: false,
        message: "المهمة غير موجودة."
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
      "status",
      "priority",
      "goalId",
      "domainId",
      "scheduledDate",
      "dueDate",
      "startTime",
      "durationMinutes",
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

    const candidate = {
      ...tasks[index],
      ...changes
    };

    if (!cleanText(candidate.title, 200)) {
      return {
        success: false,
        message: "عنوان المهمة مطلوب."
      };
    }

    if (!STATUSES.includes(candidate.status)) {
      return {
        success: false,
        message: "حالة المهمة غير صالحة."
      };
    }

    if (!PRIORITIES.includes(candidate.priority)) {
      return {
        success: false,
        message: "أولوية المهمة غير صالحة."
      };
    }

    const dates = [
      normalizeDate(candidate.scheduledDate),
      normalizeDate(candidate.dueDate)
    ];

    if (dates.includes(undefined)) {
      return {
        success: false,
        message: "أحد التواريخ غير صالح."
      };
    }

    const links = validateLinks(candidate);

    if (!links.valid) {
      return {
        success: false,
        message: links.message
      };
    }

    const updated = normalizeTask({
      ...candidate,
      id,
      createdAt: tasks[index].createdAt,
      updatedAt: now(),
      completedAt: candidate.status === "completed"
        ? tasks[index].completedAt || now()
        : null
    });

    if (!updated) {
      return {
        success: false,
        message: "تعذر تحديث المهمة."
      };
    }

    tasks[index] = updated;

    const saved = save();

    emit("tasks:updated", {
      task: { ...updated },
      saved
    });

    return {
      success: true,
      saved,
      task: { ...updated }
    };
  }

  function complete(id) {
    return update(id, { status: "completed" });
  }

  function defer(id, scheduledDate) {
    const date = normalizeDate(scheduledDate);

    if (date === undefined) {
      return {
        success: false,
        message: "التاريخ الجديد غير صالح."
      };
    }

    return update(id, {
      status: "deferred",
      scheduledDate: date
    });
  }

  function remove(id) {
    if (!initialized) {
      initialize();
    }

    const task = getById(id);

    if (!task) {
      return {
        success: false,
        message: "المهمة غير موجودة."
      };
    }

    tasks = tasks.filter((item) => item.id !== id);

    const saved = save();

    emit("tasks:deleted", {
      task: { ...task },
      saved
    });

    return {
      success: true,
      saved,
      task
    };
  }

  function getTodayTasks() {
    return getAll({ date: today() }).filter(
      (task) => task.status !== "cancelled"
    );
  }

  function getSummary() {
    if (!initialized) {
      initialize();
    }

    const total = tasks.length;

    const completed = tasks.filter(
      (task) => task.status === "completed"
    ).length;

    const pending = tasks.filter(
      (task) => task.status === "pending"
    ).length;

    const inProgress = tasks.filter(
      (task) => task.status === "in-progress"
    ).length;

    const deferred = tasks.filter(
      (task) => task.status === "deferred"
    ).length;

    const overdue = tasks.filter(
      (task) =>
        task.dueDate &&
        task.dueDate < today() &&
        !["completed", "cancelled"].includes(task.status)
    ).length;

    const todayTasks = getTodayTasks();

    const todayCompleted = todayTasks.filter(
      (task) => task.status === "completed"
    ).length;

    return {
      total,
      completed,
      pending,
      inProgress,
      deferred,
      overdue,
      todayTotal: todayTasks.length,
      todayCompleted,
      completionRate: total
        ? Math.round((completed / total) * 100)
        : 0
    };
  }

  function reset() {
    tasks = [];

    const saved = save();

    emit("tasks:reset", { saved });

    return {
      success: true,
      saved
    };
  }

  window.TasksManager = Object.freeze({
    initialize,
    getAll,
    getById,
    create,
    update,
    complete,
    defer,
    remove,
    getTodayTasks,
    getSummary,
    reset
  });

})(window);
