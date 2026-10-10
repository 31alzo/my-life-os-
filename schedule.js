
/* ========================================
   MY LIFE OS — SCHEDULE MANAGER
   إدارة الجدول الزمني
======================================== */

"use strict";

(function (window) {
  if (window.ScheduleManager) {
    console.warn("[MY LIFE OS] ScheduleManager موجود مسبقًا.");
    return;
  }

  const STORAGE_KEY = "schedule";

  const VALID_TYPES = [
    "task",
    "study",
    "work",
    "health",
    "personal",
    "family",
    "rest",
    "appointment",
    "other"
  ];

  let events = [];
  let initialized = false;

  function createId() {
    if (
      window.AppUtils &&
      typeof window.AppUtils.createId === "function"
    ) {
      return window.AppUtils.createId();
    }

    return "event-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 9);
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

  function cleanText(value, maxLength = 500) {
    return typeof value === "string"
      ? value.trim().slice(0, maxLength)
      : "";
  }

  function normalizeDate(value) {
    if (
      typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      return null;
    }

    const date = new Date(value + "T00:00:00Z");

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      return null;
    }

    return value;
  }

  function normalizeTime(value) {
    return typeof value === "string" &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
      ? value
      : null;
  }

  function normalizeEvent(input) {
    if (!input || typeof input !== "object") {
      return null;
    }

    const title = cleanText(input.title, 200);
    const date = normalizeDate(input.date);

    if (!title || !date) {
      return null;
    }

    const startTime = normalizeTime(input.startTime);
    const endTime = normalizeTime(input.endTime);

    if (
      input.startTime &&
      !startTime
    ) {
      return null;
    }

    if (
      input.endTime &&
      !endTime
    ) {
      return null;
    }

    if (
      startTime &&
      endTime &&
      endTime <= startTime
    ) {
      return null;
    }

    const duration = Number(input.durationMinutes);

    return {
      id: typeof input.id === "string" && input.id
        ? input.id
        : createId(),

      title,
      description: cleanText(input.description, 3000),
      date,
      startTime,
      endTime,

      durationMinutes: Number.isFinite(duration)
        ? Math.max(0, Math.min(1440, Math.round(duration)))
        : 0,

      type: VALID_TYPES.includes(input.type)
        ? input.type
        : "other",

      taskId: typeof input.taskId === "string"
        ? input.taskId
        : null,

      goalId: typeof input.goalId === "string"
        ? input.goalId
        : null,

      location: cleanText(input.location, 300),
      completed: Boolean(input.completed),
      notes: cleanText(input.notes, 3000),

      createdAt: input.createdAt || now(),
      updatedAt: now()
    };
  }

  function load() {
    const storage = getStorage();

    if (!storage || typeof storage.get !== "function") {
      events = [];
      return;
    }

    try {
      const saved = storage.get(STORAGE_KEY);

      events = Array.isArray(saved)
        ? saved.map(normalizeEvent).filter(Boolean)
        : [];
    } catch (error) {
      console.error(
        "[MY LIFE OS] تعذر تحميل الجدول الزمني.",
        error
      );

      events = [];
    }
  }

  function save() {
    const storage = getStorage();

    if (!storage || typeof storage.set !== "function") {
      return false;
    }

    try {
      return storage.set(STORAGE_KEY, events) !== false;
    } catch (error) {
      console.error(
        "[MY LIFE OS] تعذر حفظ الجدول الزمني.",
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

    emit("schedule:initialized", getAll());

    console.info("[MY LIFE OS] تمت تهيئة الجدول الزمني.");

    return getAll();
  }

  function getAll(filters = {}) {
    if (!initialized) {
      initialize();
    }

    let result = [...events];

    if (filters.date) {
      result = result.filter(
        (event) => event.date === filters.date
      );
    }

    if (filters.fromDate) {
      result = result.filter(
        (event) => event.date >= filters.fromDate
      );
    }

    if (filters.toDate) {
      result = result.filter(
        (event) => event.date <= filters.toDate
      );
    }

    if (filters.type) {
      result = result.filter(
        (event) => event.type === filters.type
      );
    }

    if (filters.taskId) {
      result = result.filter(
        (event) => event.taskId === filters.taskId
      );
    }

    if (filters.completed !== undefined) {
      result = result.filter(
        (event) => event.completed === filters.completed
      );
    }

    result.sort((a, b) => {
      const dateDifference = a.date.localeCompare(b.date);

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return (a.startTime || "99:99").localeCompare(
        b.startTime || "99:99"
      );
    });

    return result;
  }

  function getById(id) {
    if (!initialized) {
      initialize();
    }

    return events.find((event) => event.id === id) || null;
  }

  function validateLinks(input) {
    if (
      input.taskId &&
      window.TasksManager &&
      !window.TasksManager.getById(input.taskId)
    ) {
      return {
        valid: false,
        message: "المهمة المرتبطة غير موجودة."
      };
    }

    if (
      input.goalId &&
      window.GoalsManager &&
      !window.GoalsManager.getById(input.goalId)
    ) {
      return {
        valid: false,
        message: "الهدف المرتبط غير موجود."
      };
    }

    return { valid: true };
  }

  function hasConflict(candidate, excludeId = null) {
    if (!candidate.startTime || !candidate.endTime) {
      return false;
    }

    return events.some((event) => {
      if (
        event.id === excludeId ||
        event.date !== candidate.date ||
        !event.startTime ||
        !event.endTime
      ) {
        return false;
      }

      return (
        candidate.startTime < event.endTime &&
        candidate.endTime > event.startTime
      );
    });
  }

  function create(input = {}) {
    if (!initialized) {
      initialize();
    }

    const event = normalizeEvent({
      ...input,
      id: createId(),
      createdAt: now(),
      updatedAt: now()
    });

    if (!event) {
      return {
        success: false,
        message: "تحقق من العنوان والتاريخ والأوقات."
      };
    }

    const links = validateLinks(event);

    if (!links.valid) {
      return {
        success: false,
        message: links.message
      };
    }

    if (hasConflict(event)) {
      return {
        success: false,
        conflict: true,
        message: "يتعارض هذا الموعد مع موعد آخر."
      };
    }

    events.push(event);

    const saved = save();

    emit("schedule:created", {
      event: { ...event },
      saved
    });

    return {
      success: true,
      saved,
      event: { ...event }
    };
  }

  function update(id, changes = {}) {
    if (!initialized) {
      initialize();
    }

    const index = events.findIndex(
      (event) => event.id === id
    );

    if (index === -1) {
      return {
        success: false,
        message: "الموعد غير موجود."
      };
    }

    const allowed = [
      "title",
      "description",
      "date",
      "startTime",
      "endTime",
      "durationMinutes",
      "type",
      "taskId",
      "goalId",
      "location",
      "completed",
      "notes"
    ];

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

    for (const key of Object.keys(changes)) {
      if (!allowed.includes(key)) {
        return {
          success: false,
          message: "لا يمكن تعديل الحقل: " + key
        };
      }
    }

    const updated = normalizeEvent({
      ...events[index],
      ...changes,
      id,
      createdAt: events[index].createdAt,
      updatedAt: now()
    });

    if (!updated) {
      return {
        success: false,
        message: "تحقق من بيانات الموعد."
      };
    }

    const links = validateLinks(updated);

    if (!links.valid) {
      return {
        success: false,
        message: links.message
      };
    }

    if (hasConflict(updated, id)) {
      return {
        success: false,
        conflict: true,
        message: "يتعارض الموعد الجديد مع موعد آخر."
      };
    }

    events[index] = updated;

    const saved = save();

    emit("schedule:updated", {
      event: { ...updated },
      saved
    });

    return {
      success: true,
      saved,
      event: { ...updated }
    };
  }

  function complete(id) {
    return update(id, { completed: true });
  }

  function remove(id) {
    if (!initialized) {
      initialize();
    }

    const event = getById(id);

    if (!event) {
      return {
        success: false,
        message: "الموعد غير موجود."
      };
    }

    events = events.filter((item) => item.id !== id);

    const saved = save();

    emit("schedule:deleted", {
      event: { ...event },
      saved
    });

    return {
      success: true,
      saved
    };
  }

  function getToday() {
    const date = new Date();

    const localToday = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");

    return getAll({ date: localToday });
  }

  function getUpcoming(days = 7) {
    const number = Number(days);

    if (!Number.isFinite(number) || number < 1) {
      return [];
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + Math.min(365, Math.floor(number)));

    const toDate = [
      end.getFullYear(),
      String(end.getMonth() + 1).padStart(2, "0"),
      String(end.getDate()).padStart(2, "0")
    ].join("-");

    const fromDate = [
      start.getFullYear(),
      String(start.getMonth() + 1).padStart(2, "0"),
      String(start.getDate()).padStart(2, "0")
    ].join("-");

    return getAll({ fromDate, toDate });
  }

  function getSummary() {
    if (!initialized) {
      initialize();
    }

    const todayEvents = getToday();
    const upcoming = getUpcoming(7);

    return {
      total: events.length,
      today: todayEvents.length,
      todayCompleted: todayEvents.filter(
        (event) => event.completed
      ).length,
      upcomingWeek: upcoming.length,
      upcomingIncomplete: upcoming.filter(
        (event) => !event.completed
      ).length
    };
  }

  function reset() {
    events = [];

    const saved = save();

    emit("schedule:reset", { saved });

    return {
      success: true,
      saved
    };
  }

  window.ScheduleManager = Object.freeze({
    initialize,
    getAll,
    getById,
    create,
    update,
    complete,
    remove,
    getToday,
    getUpcoming,
    getSummary,
    reset
  });

})(window);
