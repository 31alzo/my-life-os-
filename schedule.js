
/* ========================================
   MY LIFE OS — Schedule & Reminders
   الجدول والمواعيد والتذكيرات
======================================== */

"use strict";

const ScheduleManager = (() => {
  const STORAGE_KEY = "schedule-events";

  const TYPES = [
    "task",
    "appointment",
    "study",
    "exercise",
    "worship",
    "personal",
    "reminder"
  ];

  function getAll() {
    const events = AppStorage.get(STORAGE_KEY, []);
    return Array.isArray(events) ? events : [];
  }

  function getById(id) {
    return getAll().find(event => event.id === id) || null;
  }

  function create(data = {}) {
    const title =
      typeof data.title === "string"
        ? data.title.trim()
        : "";

    if (!title) {
      return {
        success: false,
        message: "اكتب عنوان الموعد أولًا."
      };
    }

    const date =
      typeof data.date === "string"
        ? data.date
        : AppUtils.getToday();

    const event = {
      id: AppUtils.createId(),
      title,
      description:
        typeof data.description === "string"
          ? data.description.trim()
          : "",
      type: TYPES.includes(data.type) ? data.type : "personal",
      date,
      startTime:
        typeof data.startTime === "string"
          ? data.startTime
          : "",
      endTime:
        typeof data.endTime === "string"
          ? data.endTime
          : "",
      reminderAt:
        typeof data.reminderAt === "string"
          ? data.reminderAt
          : null,
      recurring:
        typeof data.recurring === "string"
          ? data.recurring
          : "none",
      relatedTaskId:
        typeof data.relatedTaskId === "string"
          ? data.relatedTaskId
          : null,
      relatedGoalId:
        typeof data.relatedGoalId === "string"
          ? data.relatedGoalId
          : null,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = AppStorage.set(
      STORAGE_KEY,
      [...getAll(), event]
    );

    return result.success
      ? { success: true, event }
      : result;
  }

  function update(id, changes = {}) {
    const events = getAll();
    const index = events.findIndex(event => event.id === id);

    if (index === -1) {
      return {
        success: false,
        message: "لم يتم العثور على الموعد."
      };
    }

    const event = { ...events[index] };

    for (const field of [
      "title",
      "description",
      "date",
      "startTime",
      "endTime",
      "reminderAt",
      "recurring"
    ]) {
      if (typeof changes[field] === "string") {
        event[field] = changes[field].trim();
      }
    }

    if (TYPES.includes(changes.type)) {
      event.type = changes.type;
    }

    if (
      changes.reminderAt === null ||
      changes.reminderAt === ""
    ) {
      event.reminderAt = null;
    }

    if (typeof changes.completed === "boolean") {
      event.completed = changes.completed;
    }

    if (
      changes.relatedTaskId === null ||
      typeof changes.relatedTaskId === "string"
    ) {
      event.relatedTaskId = changes.relatedTaskId;
    }

    if (
      changes.relatedGoalId === null ||
      typeof changes.relatedGoalId === "string"
    ) {
      event.relatedGoalId = changes.relatedGoalId;
    }

    event.updatedAt = new Date().toISOString();
    events[index] = event;

    const result = AppStorage.set(STORAGE_KEY, events);

    return result.success
      ? { success: true, event }
      : result;
  }

  function remove(id) {
    const events = getAll();

    if (!events.some(event => event.id === id)) {
      return {
        success: false,
        message: "لم يتم العثور على الموعد."
      };
    }

    const result = AppStorage.set(
      STORAGE_KEY,
      events.filter(event => event.id !== id)
    );

    return result.success
      ? { success: true }
      : result;
  }

  function getByDate(date) {
    return getAll()
      .filter(event => event.date === date)
      .sort((a, b) =>
        (a.startTime || "99:99").localeCompare(
          b.startTime || "99:99"
        )
      );
  }

  function getUpcoming(limit = 10) {
    const today = AppUtils.getToday();

    return getAll()
      .filter(event => event.date >= today && !event.completed)
      .sort((a, b) => {
        const dateA = `${a.date} ${a.startTime || "23:59"}`;
        const dateB = `${b.date} ${b.startTime || "23:59"}`;
        return dateA.localeCompare(dateB);
      })
      .slice(0, Math.max(0, limit));
  }

  return Object.freeze({
    getAll,
    getById,
    create,
    update,
    remove,
    getByDate,
    getUpcoming
  });
})();
