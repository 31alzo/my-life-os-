/* =========================================================
   MY LIFE OS — SPORT MANAGER
   File: Sport.js
   Purpose: Exercise planning and activity tracking
========================================================= */

(function (window) {
  "use strict";

  const STORAGE_KEY = "sport-sessions";
  const EVENTS = {
    changed: "sport:changed",
    created: "sport:created",
    updated: "sport:updated",
    completed: "sport:completed",
    deleted: "sport:deleted"
  };

  const TYPES = [
    "strength",
    "cardio",
    "walking",
    "running",
    "cycling",
    "stretching",
    "mobility",
    "sport",
    "other"
  ];

  const STATUSES = [
    "planned",
    "completed",
    "skipped",
    "cancelled"
  ];

  function createId() {
    if (
      window.AppUtils &&
      typeof window.AppUtils.createId === "function"
    ) {
      return window.AppUtils.createId();
    }

    return "sport-" + Date.now().toString(36) +
      "-" + Math.random().toString(36).slice(2, 10);
  }

  function now() {
    return new Date().toISOString();
  }

  function today() {
    if (
      window.AppUtils &&
      typeof window.AppUtils.today === "function"
    ) {
      return window.AppUtils.today();
    }

    const date = new Date();

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function cleanString(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function isObject(value) {
    return value !== null &&
      typeof value === "object" &&
      !Array.isArray(value);
  }

  function clone(value) {
    if (
      window.AppUtils &&
      typeof window.AppUtils.clone === "function"
    ) {
      return window.AppUtils.clone(value);
    }

    return JSON.parse(JSON.stringify(value));
  }

  function emit(name, detail) {
    if (
      window.AppEvents &&
      typeof window.AppEvents.emit === "function"
    ) {
      window.AppEvents.emit(name, detail);
      return;
    }

    window.dispatchEvent(
      new CustomEvent(name, { detail: detail })
    );
  }

  function readStorage() {
    try {
      if (
        window.AppStorage &&
        typeof window.AppStorage.get === "function"
      ) {
        const value = window.AppStorage.get(STORAGE_KEY);
        return Array.isArray(value) ? value : [];
      }

      const raw = window.localStorage.getItem(
        "my-life-os:v1:" + STORAGE_KEY
      );

      return raw === null ? [] : JSON.parse(raw);
    } catch (error) {
      console.error("[SportManager] Read failed:", error);
      return [];
    }
  }

  function writeStorage(items) {
    try {
      if (
        window.AppStorage &&
        typeof window.AppStorage.set === "function"
      ) {
        if (window.AppStorage.set(STORAGE_KEY, items) === false) {
          throw new Error("تعذر حفظ البيانات.");
        }

        return true;
      }

      window.localStorage.setItem(
        "my-life-os:v1:" + STORAGE_KEY,
        JSON.stringify(items)
      );

      return true;
    } catch (error) {
      console.error("[SportManager] Save failed:", error);
      throw new Error("تعذر حفظ جلسات النشاط البدني.");
    }
  }

  function validateDate(value) {
    if (typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error("استخدم صيغة التاريخ YYYY-MM-DD.");
    }

    const date = new Date(value + "T00:00:00");

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new Error("التاريخ غير صالح.");
    }

    return value;
  }

  function optionalNumber(value, min, max, label) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const number = Number(value);

    if (
      !Number.isFinite(number) ||
      number < min ||
      number > max
    ) {
      throw new Error(
        label + " يجب أن يكون بين " + min + " و" + max + "."
      );
    }

    return number;
  }

  function normalizeSession(session) {
    return {
      id: cleanString(session.id) || createId(),
      title: cleanString(session.title),
      type: TYPES.includes(session.type) ? session.type : "other",
      date: session.date || today(),
      startTime: cleanString(session.startTime),
      durationMinutes: session.durationMinutes ?? null,
      status: STATUSES.includes(session.status)
        ? session.status
        : "planned",
      intensity: session.intensity ?? null,
      exercises: Array.isArray(session.exercises)
        ? session.exercises
        : [],
      goalId: session.goalId || null,
      notes: typeof session.notes === "string"
        ? session.notes
        : "",
      completedAt: session.completedAt || null,
      createdAt: session.createdAt || now(),
      updatedAt: session.updatedAt || now()
    };
  }

  function getAll(options) {
    const settings = options || {};
    let sessions = readStorage().filter(isObject).map(normalizeSession);

    if (settings.date) {
      sessions = sessions.filter(
        session => session.date === settings.date
      );
    }

    if (settings.from) {
      sessions = sessions.filter(
        session => session.date >= settings.from
      );
    }

    if (settings.to) {
      sessions = sessions.filter(
        session => session.date <= settings.to
      );
    }

    if (settings.type) {
      sessions = sessions.filter(
        session => session.type === settings.type
      );
    }

    if (settings.status) {
      sessions = sessions.filter(
        session => session.status === settings.status
      );
    }

    if (settings.goalId) {
      sessions = sessions.filter(
        session => session.goalId === settings.goalId
      );
    }

    if (settings.search) {
      const query = cleanString(settings.search).toLowerCase();

      sessions = sessions.filter(session =>
        (
          session.title + " " + session.notes
        ).toLowerCase().includes(query)
      );
    }

    sessions.sort((a, b) => {
      const dateComparison = a.date.localeCompare(b.date);

      if (dateComparison !== 0) {
        return settings.ascending
          ? dateComparison
          : -dateComparison;
      }

      return a.startTime.localeCompare(b.startTime);
    });

    return clone(sessions);
  }

  function getById(id) {
    const session = readStorage().find(item => item.id === id);
    return session ? clone(normalizeSession(session)) : null;
  }

  function validateGoal(goalId) {
    if (!goalId) {
      return null;
    }

    if (
      window.GoalsManager &&
      typeof window.GoalsManager.getById === "function" &&
      !window.GoalsManager.getById(goalId)
    ) {
      throw new Error("الهدف المرتبط غير موجود.");
    }

    return goalId;
  }

  function normalizeExercises(exercises) {
    if (exercises === undefined) {
      return [];
    }

    if (!Array.isArray(exercises)) {
      throw new Error("قائمة التمارين يجب أن تكون مصفوفة.");
    }

    return exercises.map(exercise => {
      if (typeof exercise === "string") {
        return {
          id: createId(),
          name: cleanString(exercise),
          sets: null,
          reps: null,
          notes: ""
        };
      }

      if (!isObject(exercise)) {
        throw new Error("بيانات أحد التمارين غير صالحة.");
      }

      return {
        id: cleanString(exercise.id) || createId(),
        name: cleanString(exercise.name),
        sets: optionalNumber(exercise.sets, 1, 100, "عدد المجموعات"),
        reps: optionalNumber(exercise.reps, 1, 10000, "عدد التكرارات"),
        notes: cleanString(exercise.notes)
      };
    }).filter(exercise => exercise.name);
  }

  function create(input) {
    if (!isObject(input)) {
      throw new Error("بيانات الجلسة غير صحيحة.");
    }

    const title = cleanString(input.title);

    if (!title) {
      throw new Error("أدخل اسم النشاط.");
    }

    if (!TYPES.includes(input.type || "other")) {
      throw new Error("نوع النشاط غير صالح.");
    }

    const session = {
      id: createId(),
      title: title,
      type: input.type || "other",
      date: validateDate(input.date || today()),
      startTime: cleanString(input.startTime),
      durationMinutes: optionalNumber(
        input.durationMinutes, 1, 1440, "مدة النشاط بالدقائق"
      ),
      status: STATUSES.includes(input.status)
        ? input.status
        : "planned",
      intensity: optionalNumber(
        input.intensity, 1, 10, "شدة النشاط"
      ),
      exercises: normalizeExercises(input.exercises),
      goalId: validateGoal(input.goalId),
      notes: typeof input.notes === "string" ? input.notes : "",
      completedAt: null,
      createdAt: now(),
      updatedAt: now()
    };

    if (session.status === "completed") {
      session.completedAt = now();
    }

    const sessions = readStorage();
    sessions.push(session);
    writeStorage(sessions);

    emit(EVENTS.created, clone(session));
    emit(EVENTS.changed, { action: "created", id: session.id });

    return clone(session);
  }

  function update(id, changes) {
    if (!isObject(changes)) {
      throw new Error("التعديلات غير صحيحة.");
    }

    const sessions = readStorage();
    const index = sessions.findIndex(item => item.id === id);

    if (index === -1) {
      throw new Error("جلسة النشاط غير موجودة.");
    }

    const updated = Object.assign({}, sessions[index]);

    if (Object.prototype.hasOwnProperty.call(changes, "title")) {
      const title = cleanString(changes.title);

      if (!title) {
        throw new Error("اسم النشاط لا يمكن أن يكون فارغاً.");
      }

      updated.title = title;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "type")) {
      if (!TYPES.includes(changes.type)) {
        throw new Error("نوع النشاط غير صالح.");
      }

      updated.type = changes.type;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "date")) {
      updated.date = validateDate(changes.date);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "startTime")) {
      updated.startTime = cleanString(changes.startTime);
    }

    if (
      Object.prototype.hasOwnProperty.call(changes, "durationMinutes")
    ) {
      updated.durationMinutes = optionalNumber(
        changes.durationMinutes, 1, 1440, "مدة النشاط بالدقائق"
      );
    }

    if (Object.prototype.hasOwnProperty.call(changes, "intensity")) {
      updated.intensity = optionalNumber(
        changes.intensity, 1, 10, "شدة النشاط"
      );
    }

    if (Object.prototype.hasOwnProperty.call(changes, "exercises")) {
      updated.exercises = normalizeExercises(changes.exercises);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "goalId")) {
      updated.goalId = validateGoal(changes.goalId);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "notes")) {
      if (typeof changes.notes !== "string") {
        throw new Error("الملاحظات يجب أن تكون نصاً.");
      }

      updated.notes = changes.notes;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "status")) {
      if (!STATUSES.includes(changes.status)) {
        throw new Error("حالة النشاط غير صالحة.");
      }

      updated.status = changes.status;

      if (changes.status === "completed") {
        updated.completedAt = updated.completedAt || now();
      } else {
        updated.completedAt = null;
      }
    }

    updated.updatedAt = now();
    sessions[index] = updated;
    writeStorage(sessions);

    emit(EVENTS.updated, clone(updated));
    emit(EVENTS.changed, { action: "updated", id: id });

    return clone(updated);
  }

  function complete(id) {
    const session = getById(id);

    if (!session) {
      throw new Error("جلسة النشاط غير موجودة.");
    }

    if (session.status === "completed") {
      return session;
    }

    const updated = update(id, { status: "completed" });

    emit(EVENTS.completed, clone(updated));

    return updated;
  }

  function remove(id) {
    const sessions = readStorage();
    const index = sessions.findIndex(item => item.id === id);

    if (index === -1) {
      return false;
    }

    sessions.splice(index, 1);
    writeStorage(sessions);

    emit(EVENTS.deleted, { id: id });
    emit(EVENTS.changed, { action: "deleted", id: id });

    return true;
  }

  function getToday() {
    return getAll({ date: today() });
  }

  function getUpcoming(days) {
    const count = Number.isInteger(days) && days >= 0 ? days : 7;
    const start = today();
    const endDate = new Date(start + "T00:00:00");

    endDate.setDate(endDate.getDate() + count);

    const end = [
      endDate.getFullYear(),
      String(endDate.getMonth() + 1).padStart(2, "0"),
      String(endDate.getDate()).padStart(2, "0")
    ].join("-");

    return getAll({ from: start, to: end }).filter(
      session => session.status === "planned"
    );
  }

  function getSummary(options) {
    const sessions = getAll(options);
    const summary = {
      total: sessions.length,
      planned: 0,
      completed: 0,
      skipped: 0,
      cancelled: 0,
      totalCompletedMinutes: 0,
      byType: {}
    };

    TYPES.forEach(type => {
      summary.byType[type] = 0;
    });

    sessions.forEach(session => {
      summary[session.status] += 1;
      summary.byType[session.type] += 1;

      if (
        session.status === "completed" &&
        Number.isFinite(session.durationMinutes)
      ) {
        summary.totalCompletedMinutes += session.durationMinutes;
      }
    });

    summary.todayCount = getToday().length;
    summary.todayCompleted = getToday().filter(
      session => session.status === "completed"
    ).length;

    return summary;
  }

  function initialize() {
    const sessions = readStorage();

    if (!Array.isArray(sessions)) {
      writeStorage([]);
    }

    return {
      initialized: true,
      count: getAll().length
    };
  }

  function reset() {
    writeStorage([]);
    emit(EVENTS.changed, { action: "reset" });
    return true;
  }

  window.SportManager = Object.freeze({
    initialize: initialize,
    create: create,
    getAll: getAll,
    getById: getById,
    update: update,
    complete: complete,
    remove: remove,
    getToday: getToday,
    getUpcoming: getUpcoming,
    getSummary: getSummary,
    getTypes: function () {
      return TYPES.slice();
    },
    getStatuses: function () {
      return STATUSES.slice();
    },
    reset: reset,
    EVENTS: Object.freeze(Object.assign({}, EVENTS))
  });

})(window);