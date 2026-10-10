/* =========================================================
   MY LIFE OS — HEALTH MANAGER
   File: health.js
   Purpose: Personal wellness tracking and self-care
========================================================= */

(function (window) {
  "use strict";

  const STORAGE_KEY = "health-records";
  const DAILY_KEY = "health-daily-logs";
  const EVENTS = {
    changed: "health:changed",
    recordCreated: "health:record-created",
    recordUpdated: "health:record-updated",
    recordDeleted: "health:record-deleted",
    dailyLogSaved: "health:daily-log-saved"
  };

  const RECORD_TYPES = [
    "sleep",
    "water",
    "energy",
    "mood",
    "symptom",
    "appointment",
    "medication",
    "self-care",
    "other"
  ];

  const MOOD_LEVELS = [
    "very-low",
    "low",
    "neutral",
    "good",
    "very-good"
  ];

  function createId() {
    if (
      window.AppUtils &&
      typeof window.AppUtils.createId === "function"
    ) {
      return window.AppUtils.createId();
    }

    return "health-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 10);
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
    return typeof value === "string"
      ? value.trim()
      : "";
  }

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
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

  function read(key, fallback) {
    try {
      if (
        window.AppStorage &&
        typeof window.AppStorage.get === "function"
      ) {
        const value = window.AppStorage.get(key);

        return value === null || value === undefined
          ? fallback
          : value;
      }

      const raw = window.localStorage.getItem(
        "my-life-os:v1:" + key
      );

      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      console.error("[HealthManager] Read failed:", error);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      if (
        window.AppStorage &&
        typeof window.AppStorage.set === "function"
      ) {
        if (window.AppStorage.set(key, value) === false) {
          throw new Error("تعذر حفظ البيانات.");
        }

        return true;
      }

      window.localStorage.setItem(
        "my-life-os:v1:" + key,
        JSON.stringify(value)
      );

      return true;
    } catch (error) {
      console.error("[HealthManager] Save failed:", error);
      throw new Error(
        "تعذر حفظ البيانات الصحية في مساحة التخزين."
      );
    }
  }

  function validateDate(value) {
    if (typeof value !== "string") {
      throw new Error("التاريخ غير صالح.");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
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

  function optionalNumber(value, min, max, fieldName) {
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
        fieldName + " يجب أن يكون بين " + min + " و" + max + "."
      );
    }

    return number;
  }

  function normalizeRecord(record) {
    return {
      id: cleanString(record.id) || createId(),
      type: RECORD_TYPES.includes(record.type)
        ? record.type
        : "other",
      title: cleanString(record.title),
      value: record.value === undefined ? null : record.value,
      unit: cleanString(record.unit),
      date: record.date || today(),
      time: cleanString(record.time),
      notes: typeof record.notes === "string"
        ? record.notes
        : "",
      createdAt: record.createdAt || now(),
      updatedAt: record.updatedAt || now()
    };
  }

  function getAll(options) {
    const settings = options || {};
    let records = read(STORAGE_KEY, []);

    if (!Array.isArray(records)) {
      records = [];
    }

    records = records.filter(isObject).map(normalizeRecord);

    if (settings.type) {
      records = records.filter(
        record => record.type === settings.type
      );
    }

    if (settings.date) {
      records = records.filter(
        record => record.date === settings.date
      );
    }

    if (settings.from) {
      records = records.filter(
        record => record.date >= settings.from
      );
    }

    if (settings.to) {
      records = records.filter(
        record => record.date <= settings.to
      );
    }

    if (settings.search) {
      const query = cleanString(settings.search).toLowerCase();

      records = records.filter(record =>
        (
          record.title +
          " " +
          record.notes +
          " " +
          record.type
        ).toLowerCase().includes(query)
      );
    }

    records.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return b.createdAt.localeCompare(a.createdAt);
    });

    return clone(records);
  }

  function getById(id) {
    const record = getAll().find(item => item.id === id);

    return record ? clone(record) : null;
  }

  function create(input) {
    if (!isObject(input)) {
      throw new Error("بيانات السجل غير صحيحة.");
    }

    if (!RECORD_TYPES.includes(input.type)) {
      throw new Error("نوع السجل الصحي غير صالح.");
    }

    const title = cleanString(input.title);

    if (!title) {
      throw new Error("أدخل عنواناً للسجل.");
    }

    const date = validateDate(input.date || today());

    const record = {
      id: createId(),
      type: input.type,
      title: title,
      value: input.value === undefined ? null : input.value,
      unit: cleanString(input.unit),
      date: date,
      time: cleanString(input.time),
      notes: typeof input.notes === "string"
        ? input.notes
        : "",
      createdAt: now(),
      updatedAt: now()
    };

    const records = read(STORAGE_KEY, []);
    const safeRecords = Array.isArray(records) ? records : [];

    safeRecords.push(record);
    write(STORAGE_KEY, safeRecords);

    emit(EVENTS.recordCreated, clone(record));
    emit(EVENTS.changed, {
      action: "created",
      id: record.id
    });

    return clone(record);
  }

  function update(id, changes) {
    if (!isObject(changes)) {
      throw new Error("التعديلات غير صحيحة.");
    }

    const records = read(STORAGE_KEY, []);
    const safeRecords = Array.isArray(records) ? records : [];
    const index = safeRecords.findIndex(
      record => record.id === id
    );

    if (index === -1) {
      throw new Error("السجل الصحي غير موجود.");
    }

    const updated = Object.assign({}, safeRecords[index]);

    if (Object.prototype.hasOwnProperty.call(changes, "type")) {
      if (!RECORD_TYPES.includes(changes.type)) {
        throw new Error("نوع السجل غير صالح.");
      }

      updated.type = changes.type;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "title")) {
      const title = cleanString(changes.title);

      if (!title) {
        throw new Error("عنوان السجل لا يمكن أن يكون فارغاً.");
      }

      updated.title = title;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "value")) {
      updated.value = changes.value;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "unit")) {
      updated.unit = cleanString(changes.unit);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "date")) {
      updated.date = validateDate(changes.date);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "time")) {
      updated.time = cleanString(changes.time);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "notes")) {
      if (typeof changes.notes !== "string") {
        throw new Error("الملاحظات يجب أن تكون نصاً.");
      }

      updated.notes = changes.notes;
    }

    updated.updatedAt = now();
    safeRecords[index] = updated;

    write(STORAGE_KEY, safeRecords);

    emit(EVENTS.recordUpdated, clone(updated));
    emit(EVENTS.changed, {
      action: "updated",
      id: id
    });

    return clone(updated);
  }

  function remove(id) {
    const records = read(STORAGE_KEY, []);
    const safeRecords = Array.isArray(records) ? records : [];
    const index = safeRecords.findIndex(
      record => record.id === id
    );

    if (index === -1) {
      return false;
    }

    safeRecords.splice(index, 1);
    write(STORAGE_KEY, safeRecords);

    emit(EVENTS.recordDeleted, { id: id });
    emit(EVENTS.changed, {
      action: "deleted",
      id: id
    });

    return true;
  }

  function getDailyLog(date) {
    const targetDate = validateDate(date || today());
    const logs = read(DAILY_KEY, {});
    const log = isObject(logs) ? logs[targetDate] : null;

    if (!isObject(log)) {
      return {
        date: targetDate,
        sleepHours: null,
        waterMl: null,
        energy: null,
        mood: null,
        exerciseMinutes: null,
        selfCare: [],
        notes: "",
        updatedAt: null
      };
    }

    return clone(log);
  }

  function saveDailyLog(input) {
    if (!isObject(input)) {
      throw new Error("بيانات المتابعة اليومية غير صحيحة.");
    }

    const date = validateDate(input.date || today());
    const current = getDailyLog(date);
    const next = Object.assign({}, current);

    if (Object.prototype.hasOwnProperty.call(input, "sleepHours")) {
      next.sleepHours = optionalNumber(
        input.sleepHours,
        0,
        24,
        "ساعات النوم"
      );
    }

    if (Object.prototype.hasOwnProperty.call(input, "waterMl")) {
      next.waterMl = optionalNumber(
        input.waterMl,
        0,
        20000,
        "كمية الماء بالملليلتر"
      );
    }

    if (Object.prototype.hasOwnProperty.call(input, "energy")) {
      next.energy = optionalNumber(
        input.energy,
        1,
        10,
        "مستوى الطاقة"
      );
    }

    if (Object.prototype.hasOwnProperty.call(input, "mood")) {
      if (
        input.mood !== null &&
        input.mood !== "" &&
        !MOOD_LEVELS.includes(input.mood)
      ) {
        throw new Error("اختيار الحالة المزاجية غير صالح.");
      }

      next.mood = input.mood || null;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        input,
        "exerciseMinutes"
      )
    ) {
      next.exerciseMinutes = optionalNumber(
        input.exerciseMinutes,
        0,
        1440,
        "مدة النشاط بالدقائق"
      );
    }

    if (Object.prototype.hasOwnProperty.call(input, "selfCare")) {
      if (!Array.isArray(input.selfCare)) {
        throw new Error("قائمة العناية الذاتية غير صالحة.");
      }

      next.selfCare = input.selfCare
        .filter(value => typeof value === "string")
        .map(value => value.trim())
        .filter(Boolean);
    }

    if (Object.prototype.hasOwnProperty.call(input, "notes")) {
      if (typeof input.notes !== "string") {
        throw new Error("الملاحظات اليومية يجب أن تكون نصاً.");
      }

      next.notes = input.notes;
    }

    next.date = date;
    next.updatedAt = now();

    const logs = read(DAILY_KEY, {});
    const safeLogs = isObject(logs) ? logs : {};

    safeLogs[date] = next;
    write(DAILY_KEY, safeLogs);

    emit(EVENTS.dailyLogSaved, clone(next));
    emit(EVENTS.changed, {
      action: "daily-log-saved",
      date: date
    });

    return clone(next);
  }

  function getDailyHistory(options) {
    const settings = options || {};
    const logs = read(DAILY_KEY, {});
    const safeLogs = isObject(logs) ? logs : {};

    let history = Object.values(safeLogs).filter(isObject);

    if (settings.from) {
      history = history.filter(
        log => log.date >= settings.from
      );
    }

    if (settings.to) {
      history = history.filter(
        log => log.date <= settings.to
      );
    }

    history.sort((a, b) => b.date.localeCompare(a.date));

    if (Number.isInteger(settings.limit) && settings.limit >= 0) {
      history = history.slice(0, settings.limit);
    }

    return clone(history);
  }

  function getSummary(options) {
    const settings = options || {};
    const records = getAll(settings);
    const dailyLog = getDailyLog(settings.date || today());

    return {
      recordCount: records.length,
      todayRecordCount: getAll({ date: today() }).length,
      dailyLog: dailyLog,
      dailyHistoryCount: getDailyHistory().length,
      recordTypes: RECORD_TYPES.slice()
    };
  }

  function reset() {
    write(STORAGE_KEY, []);
    write(DAILY_KEY, {});

    emit(EVENTS.changed, { action: "reset" });

    return true;
  }

  function initialize() {
    const records = read(STORAGE_KEY, []);
    const logs = read(DAILY_KEY, {});

    if (!Array.isArray(records)) {
      write(STORAGE_KEY, []);
    }

    if (!isObject(logs)) {
      write(DAILY_KEY, {});
    }

    return {
      initialized: true,
      recordCount: getAll().length,
      dailyLogCount: getDailyHistory().length
    };
  }

  window.HealthManager = Object.freeze({
    initialize: initialize,
    create: create,
    getAll: getAll,
    getById: getById,
    update: update,
    remove: remove,
    getDailyLog: getDailyLog,
    saveDailyLog: saveDailyLog,
    getDailyHistory: getDailyHistory,
    getSummary: getSummary,
    getRecordTypes: function () {
      return RECORD_TYPES.slice();
    },
    getMoodLevels: function () {
      return MOOD_LEVELS.slice();
    },
    reset: reset,
    EVENTS: Object.freeze(Object.assign({}, EVENTS))
  });

})(window);