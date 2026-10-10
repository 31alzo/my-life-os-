
/* ========================================
   MY LIFE OS — Habits Manager
   إدارة العادات والانضباط
======================================== */

"use strict";

const HabitsManager = (() => {
  const STORAGE_KEY = "habits";
  const LOG_STORAGE_KEY = "habit-logs";

  const FREQUENCIES = [
    "daily",
    "weekly",
    "custom"
  ];

  function getAll() {
    const habits = AppStorage.get(STORAGE_KEY, []);
    return Array.isArray(habits) ? habits : [];
  }

  function getLogs() {
    const logs = AppStorage.get(LOG_STORAGE_KEY, []);
    return Array.isArray(logs) ? logs : [];
  }

  function getById(id) {
    return getAll().find(habit => habit.id === id) || null;
  }

  function create(data = {}) {
    const title =
      typeof data.title === "string"
        ? data.title.trim()
        : "";

    if (!title) {
      return {
        success: false,
        message: "اكتب اسم العادة أولًا."
      };
    }

    const habit = {
      id: AppUtils.createId(),
      title,
      description:
        typeof data.description === "string"
          ? data.description.trim()
          : "",
      frequency: FREQUENCIES.includes(data.frequency)
        ? data.frequency
        : "daily",
      targetPerWeek:
        Number.isInteger(data.targetPerWeek) &&
        data.targetPerWeek >= 1 &&
        data.targetPerWeek <= 7
          ? data.targetPerWeek
          : 7,
      active: true,
      createdAt: new Date().toISOString()
    };

    const result = AppStorage.set(
      STORAGE_KEY,
      [...getAll(), habit]
    );

    return result.success
      ? { success: true, habit }
      : result;
  }

  function update(id, changes = {}) {
    const habits = getAll();
    const index = habits.findIndex(habit => habit.id === id);

    if (index === -1) {
      return {
        success: false,
        message: "لم يتم العثور على العادة."
      };
    }

    const habit = { ...habits[index] };

    if (typeof changes.title === "string") {
      const title = changes.title.trim();

      if (!title) {
        return {
          success: false,
          message: "اسم العادة لا يمكن أن يكون فارغًا."
        };
      }

      habit.title = title;
    }

    if (typeof changes.description === "string") {
      habit.description = changes.description.trim();
    }

    if (FREQUENCIES.includes(changes.frequency)) {
      habit.frequency = changes.frequency;
    }

    if (
      Number.isInteger(changes.targetPerWeek) &&
      changes.targetPerWeek >= 1 &&
      changes.targetPerWeek <= 7
    ) {
      habit.targetPerWeek = changes.targetPerWeek;
    }

    if (typeof changes.active === "boolean") {
      habit.active = changes.active;
    }

    habits[index] = habit;

    const result = AppStorage.set(STORAGE_KEY, habits);

    return result.success
      ? { success: true, habit }
      : result;
  }

  function log(id, date, status, note = "") {
    const habit = getById(id);

    if (!habit) {
      return {
        success: false,
        message: "لم يتم العثور على العادة."
      };
    }

    const allowedStatuses = [
      "completed",
      "partial",
      "missed",
      "skipped"
    ];

    if (!allowedStatuses.includes(status)) {
      return {
        success: false,
        message: "حالة التسجيل غير صحيحة."
      };
    }

    const logDate =
      typeof date === "string"
        ? date
        : AppUtils.getToday();

    const logs = getLogs();

    const existingIndex = logs.findIndex(
      item => item.habitId === id && item.date === logDate
    );

    const entry = {
      id: existingIndex >= 0
        ? logs[existingIndex].id
        : AppUtils.createId(),
      habitId: id,
      date: logDate,
      status,
      note: typeof note === "string" ? note.trim() : "",
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      logs[existingIndex] = entry;
    } else {
      logs.push(entry);
    }

    const result = AppStorage.set(LOG_STORAGE_KEY, logs);

    return result.success
      ? { success: true, entry }
      : result;
  }

  function getLogsForHabit(id) {
    return getLogs()
      .filter(entry => entry.habitId === id)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  function getLog(id, date = AppUtils.getToday()) {
    return getLogs().find(
      entry => entry.habitId === id && entry.date === date
    ) || null;
  }

  function getSummary(id) {
    const entries = getLogsForHabit(id);

    return {
      totalRecorded: entries.length,
      completed: entries.filter(
        entry => entry.status === "completed"
      ).length,
      partial: entries.filter(
        entry => entry.status === "partial"
      ).length,
      missed: entries.filter(
        entry => entry.status === "missed"
      ).length,
      skipped: entries.filter(
        entry => entry.status === "skipped"
      ).length
    };
  }

  function remove(id) {
    if (!getById(id)) {
      return {
        success: false,
        message: "لم يتم العثور على العادة."
      };
    }

    const habitsResult = AppStorage.set(
      STORAGE_KEY,
      getAll().filter(habit => habit.id !== id)
    );

    if (!habitsResult.success) {
      return habitsResult;
    }

    const logsResult = AppStorage.set(
      LOG_STORAGE_KEY,
      getLogs().filter(entry => entry.habitId !== id)
    );

    return logsResult.success
      ? { success: true }
      : logsResult;
  }

  return Object.freeze({
    getAll,
    getById,
    create,
    update,
    log,
    getLogsForHabit,
    getLog,
    getSummary,
    remove
  });
})();
