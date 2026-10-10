
/* =========================================
   MY LIFE OS
   HABITS MANAGER
   File: habits.js
   ========================================= */

(function (window) {
  "use strict";

  if (window.HabitsManager) return;

  const STORAGE_KEY = "habits";
  const LOGS_KEY = "habit-logs";

  const VALID_FREQUENCIES = [
    "daily",
    "weekly",
    "custom"
  ];

  const VALID_STATUSES = [
    "active",
    "paused"
  ];

  let habits = [];
  let logs = [];
  let initialized = false;

  /* =========================================
     UTILITIES
  ========================================= */

  function createId() {
    if (
      window.AppUtils &&
      typeof window.AppUtils.createId === "function"
    ) {
      return window.AppUtils.createId();
    }

    return (
      "habit-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 10)
    );
  }

  function today() {
    if (
      window.AppUtils &&
      typeof window.AppUtils.today === "function"
    ) {
      return window.AppUtils.today();
    }

    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function now() {
    return new Date().toISOString();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function isValidDate(value) {
    if (
      typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      return false;
    }

    const date = new Date(value + "T12:00:00");

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }

  function normalizeDate(value) {
    if (value === undefined || value === null || value === "") {
      return today();
    }

    if (!isValidDate(value)) {
      throw new Error("تاريخ العادة غير صالح.");
    }

    return value;
  }

  function normalizeText(value, maxLength) {
    if (typeof value !== "string") return "";

    return value.trim().slice(0, maxLength || 2000);
  }

  function normalizeDays(value) {
    if (!Array.isArray(value)) return [];

    return [...new Set(
      value
        .map(Number)
        .filter(day =>
          Number.isInteger(day) &&
          day >= 0 &&
          day <= 6
        )
    )].sort((a, b) => a - b);
  }

  function normalizePositiveNumber(value, fallback) {
    const number = Number(value);

    if (!Number.isFinite(number) || number <= 0) {
      return fallback;
    }

    return number;
  }

  function emit(name, detail) {
    if (window.AppEvents) {
      if (typeof window.AppEvents.emit === "function") {
        window.AppEvents.emit(name, detail);
        return;
      }

      if (typeof window.AppEvents.dispatch === "function") {
        window.AppEvents.dispatch(name, detail);
        return;
      }
    }

    try {
      window.dispatchEvent(
        new CustomEvent("my-life-os:" + name, {
          detail: detail
        })
      );
    } catch (error) {
      // Event delivery must not interrupt habit operations.
    }
  }

  function saveHabits() {
    if (
      !window.AppStorage ||
      typeof window.AppStorage.set !== "function"
    ) {
      throw new Error("وحدة التخزين غير متاحة.");
    }

    window.AppStorage.set(STORAGE_KEY, habits);
  }

  function saveLogs() {
    if (
      !window.AppStorage ||
      typeof window.AppStorage.set !== "function"
    ) {
      throw new Error("وحدة التخزين غير متاحة.");
    }

    window.AppStorage.set(LOGS_KEY, logs);
  }

  function ensureInitialized() {
    if (!initialized) initialize();
  }

  function getIndex(id) {
    return habits.findIndex(habit => habit.id === id);
  }

  function getHabitOrThrow(id) {
    const habit = habits.find(item => item.id === id);

    if (!habit) {
      throw new Error("العادة غير موجودة.");
    }

    return habit;
  }

  /* =========================================
     RELATION VALIDATION
  ========================================= */

  function validateRelations(data) {
    if (
      data.goalId &&
      window.GoalsManager &&
      typeof window.GoalsManager.getById === "function" &&
      !window.GoalsManager.getById(data.goalId)
    ) {
      throw new Error("الهدف المرتبط بالعادة غير موجود.");
    }

    if (
      data.domainId &&
      window.LifeDomainsManager &&
      typeof window.LifeDomainsManager.getById === "function" &&
      !window.LifeDomainsManager.getById(data.domainId)
    ) {
      throw new Error("مجال الحياة المرتبط بالعادة غير موجود.");
    }
  }

  /* =========================================
     HABIT NORMALIZATION
  ========================================= */

  function normalizeHabit(input, existing) {
    if (!isObject(input)) {
      throw new Error("بيانات العادة غير صالحة.");
    }

    const old = existing || {};
    const title = normalizeText(
      input.title !== undefined ? input.title : old.title,
      160
    );

    if (!title) {
      throw new Error("اسم العادة مطلوب.");
    }

    const frequency =
      input.frequency !== undefined
        ? input.frequency
        : old.frequency || "daily";

    if (!VALID_FREQUENCIES.includes(frequency)) {
      throw new Error("تكرار العادة غير صالح.");
    }

    const status =
      input.status !== undefined
        ? input.status
        : old.status || "active";

    if (!VALID_STATUSES.includes(status)) {
      throw new Error("حالة العادة غير صالحة.");
    }

    const daysOfWeek = normalizeDays(
      input.daysOfWeek !== undefined
        ? input.daysOfWeek
        : old.daysOfWeek
    );

    if (
      (frequency === "weekly" || frequency === "custom") &&
      daysOfWeek.length === 0
    ) {
      throw new Error(
        "اختر يومًا واحدًا على الأقل للعادة الأسبوعية أو المخصصة."
      );
    }

    const startDate = normalizeDate(
      input.startDate !== undefined
        ? input.startDate
        : old.startDate || today()
    );

    const endDate =
      input.endDate !== undefined
        ? input.endDate
        : old.endDate || null;

    if (endDate !== null && endDate !== "") {
      if (!isValidDate(endDate)) {
        throw new Error("تاريخ انتهاء العادة غير صالح.");
      }

      if (endDate < startDate) {
        throw new Error(
          "تاريخ انتهاء العادة يجب ألا يسبق تاريخ بدايتها."
        );
      }
    }

    const targetCount = normalizePositiveNumber(
      input.targetCount !== undefined
        ? input.targetCount
        : old.targetCount,
      1
    );

    const reminderTime =
      input.reminderTime !== undefined
        ? input.reminderTime
        : old.reminderTime || "";

    if (
      reminderTime &&
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)
    ) {
      throw new Error("وقت التذكير غير صالح.");
    }

    const result = {
      id: old.id || input.id || createId(),

      title: title,

      description: normalizeText(
        input.description !== undefined
          ? input.description
          : old.description,
        2000
      ),

      frequency: frequency,
      daysOfWeek: daysOfWeek,

      targetCount: targetCount,

      unit: normalizeText(
        input.unit !== undefined
          ? input.unit
          : old.unit || "مرة",
        40
      ) || "مرة",

      status: status,

      goalId:
        input.goalId !== undefined
          ? input.goalId || null
          : old.goalId || null,

      domainId:
        input.domainId !== undefined
          ? input.domainId || null
          : old.domainId || null,

      reminderEnabled:
        input.reminderEnabled !== undefined
          ? Boolean(input.reminderEnabled)
          : Boolean(old.reminderEnabled),

      reminderTime: reminderTime,

      startDate: startDate,
      endDate: endDate || null,

      archived:
        input.archived !== undefined
          ? Boolean(input.archived)
          : Boolean(old.archived),

      notes: normalizeText(
        input.notes !== undefined
          ? input.notes
          : old.notes,
        5000
      ),

      createdAt: old.createdAt || now(),
      updatedAt: now()
    };

    validateRelations(result);

    return result;
  }

  /* =========================================
     SCHEDULE HELPERS
  ========================================= */

  function isScheduledOn(habit, date) {
    if (!isValidDate(date)) return false;

    if (date < habit.startDate) return false;

    if (habit.endDate && date > habit.endDate) {
      return false;
    }

    const day = new Date(
      date + "T12:00:00"
    ).getDay();

    if (habit.frequency === "daily") {
      return true;
    }

    return habit.daysOfWeek.includes(day);
  }

  function getLogEntry(habitId, date) {
    return logs.find(log =>
      log.habitId === habitId &&
      log.date === date
    ) || null;
  }

  function getCompletedCount(habitId, date) {
    const entry = getLogEntry(habitId, date);

    return entry ? entry.count : 0;
  }

  function isCompletedOn(habit, date) {
    return (
      getCompletedCount(habit.id, date) >=
      habit.targetCount
    );
  }

  function normalizeLog(log) {
    if (!isObject(log)) return null;

    if (
      typeof log.habitId !== "string" ||
      !isValidDate(log.date)
    ) {
      return null;
    }

    const count = Number(log.count);

    if (!Number.isFinite(count) || count <= 0) {
      return null;
    }

    return {
      id: log.id || createId(),
      habitId: log.habitId,
      date: log.date,
      count: count,
      notes: normalizeText(log.notes, 2000),
      createdAt: log.createdAt || now(),
      updatedAt: log.updatedAt || now()
    };
  }

  /* =========================================
     INITIALIZATION
  ========================================= */

  function initialize() {
    if (initialized) return getSummary();

    if (
      !window.AppStorage ||
      typeof window.AppStorage.get !== "function" ||
      typeof window.AppStorage.set !== "function"
    ) {
      return {
        success: false,
        reason: "storage-unavailable"
      };
    }

    const storedHabits = window.AppStorage.get(STORAGE_KEY, []);
    const storedLogs = window.AppStorage.get(LOGS_KEY, []);

    habits = Array.isArray(storedHabits)
      ? storedHabits.filter(isObject)
      : [];

    logs = Array.isArray(storedLogs)
      ? storedLogs.map(normalizeLog).filter(Boolean)
      : [];

    // Keep only one completion record per habit and date.
    const uniqueLogs = new Map();

    logs.forEach(log => {
      const key = log.habitId + "|" + log.date;
      const previous = uniqueLogs.get(key);

      if (!previous) {
        uniqueLogs.set(key, log);
      } else {
        previous.count += log.count;
        previous.updatedAt = log.updatedAt;
      }
    });

    logs = Array.from(uniqueLogs.values());

    initialized = true;

    saveHabits();
    saveLogs();

    emit("habits:initialized", {
      count: habits.length
    });

    return getSummary();
  }

  /* =========================================
     GET HABITS
  ========================================= */

  function getAll(filters) {
    ensureInitialized();

    filters = isObject(filters) ? filters : {};

    let result = habits.slice();

    if (filters.status) {
      result = result.filter(
        habit => habit.status === filters.status
      );
    }

    if (filters.archived !== undefined) {
      result = result.filter(
        habit => habit.archived === Boolean(filters.archived)
      );
    } else {
      result = result.filter(habit => !habit.archived);
    }

    if (filters.frequency) {
      result = result.filter(
        habit => habit.frequency === filters.frequency
      );
    }

    if (filters.goalId) {
      result = result.filter(
        habit => habit.goalId === filters.goalId
      );
    }

    if (filters.domainId) {
      result = result.filter(
        habit => habit.domainId === filters.domainId
      );
    }

    if (filters.date) {
      const date = normalizeDate(filters.date);

      result = result.filter(
        habit => isScheduledOn(habit, date)
      );
    }

    if (filters.search) {
      const query = normalizeText(
        filters.search,
        200
      ).toLowerCase();

      result = result.filter(habit =>
        habit.title.toLowerCase().includes(query) ||
        habit.description.toLowerCase().includes(query)
      );
    }

    return clone(result);
  }

  function getById(id) {
    ensureInitialized();

    const habit = habits.find(item => item.id === id);

    return habit ? clone(habit) : null;
  }

  /* =========================================
     CREATE HABIT
  ========================================= */

  function create(input) {
    ensureInitialized();

    const habit = normalizeHabit(input);

    if (habits.some(item => item.id === habit.id)) {
      throw new Error("معرّف العادة مستخدم بالفعل.");
    }

    habits.push(habit);

    try {
      saveHabits();
    } catch (error) {
      habits.pop();
      throw error;
    }

    emit("habits:created", clone(habit));

    return clone(habit);
  }

  /* =========================================
     UPDATE HABIT
  ========================================= */

  function update(id, changes) {
    ensureInitialized();

    const index = getIndex(id);

    if (index === -1) {
      throw new Error("العادة غير موجودة.");
    }

    if (!isObject(changes)) {
      throw new Error("التعديلات غير صالحة.");
    }

    const previous = habits[index];

    const updated = normalizeHabit(
      Object.assign({}, previous, changes, { id: previous.id }),
      previous
    );

    habits[index] = updated;

    try {
      saveHabits();
    } catch (error) {
      habits[index] = previous;
      throw error;
    }

    emit("habits:updated", {
      habit: clone(updated),
      previous: clone(previous)
    });

    return clone(updated);
  }

  /* =========================================
     REMOVE HABIT
     Also removes its completion history.
  ========================================= */

  function remove(id) {
    ensureInitialized();

    const index = getIndex(id);

    if (index === -1) return false;

    const previousHabits = habits.slice();
    const previousLogs = logs.slice();

    habits.splice(index, 1);
    logs = logs.filter(log => log.habitId !== id);

    try {
      saveHabits();
      saveLogs();
    } catch (error) {
      habits = previousHabits;
      logs = previousLogs;

      try {
        saveHabits();
        saveLogs();
      } catch (rollbackError) {
        // Preserve the original error.
      }

      throw error;
    }

    emit("habits:removed", {
      id: id
    });

    return true;
  }

  /* =========================================
     ARCHIVE / RESTORE
  ========================================= */

  function archive(id) {
    return update(id, {
      archived: true
    });
  }

  function restore(id) {
    return update(id, {
      archived: false
    });
  }

  /* =========================================
     LOG COMPLETION
     One record per habit and date.
     Repeated calls increase its count.
  ========================================= */

  function logCompletion(habitId, date, details) {
    ensureInitialized();

    const habit = getHabitOrThrow(habitId);

    date = normalizeDate(date);

    if (habit.archived) {
      throw new Error("لا يمكن تسجيل عادة مؤرشفة.");
    }

    if (habit.status !== "active") {
      throw new Error("العادة ليست نشطة.");
    }

    if (!isScheduledOn(habit, date)) {
      throw new Error("هذا اليوم غير مخصص لهذه العادة.");
    }

    let amount = 1;
    let notes = "";

    if (typeof details === "number") {
      amount = details;
    } else if (isObject(details)) {
      amount = details.count === undefined
        ? 1
        : Number(details.count);

      notes = normalizeText(details.notes, 2000);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("كمية الإنجاز يجب أن تكون أكبر من صفر.");
    }

    const previousLogs = logs.slice();
    let entry = getLogEntry(habitId, date);

    if (entry) {
      entry.count += amount;

      if (notes) {
        entry.notes = notes;
      }

      entry.updatedAt = now();
    } else {
      entry = {
        id: createId(),
        habitId: habitId,
        date: date,
        count: amount,
        notes: notes,
        createdAt: now(),
        updatedAt: now()
      };

      logs.push(entry);
    }

    try {
      saveLogs();
    } catch (error) {
      logs = previousLogs;
      throw error;
    }

    const completed = isCompletedOn(habit, date);

    emit("habits:completion-logged", {
      habitId: habitId,
      date: date,
      count: entry.count,
      targetCount: habit.targetCount,
      completed: completed
    });

    return {
      log: clone(entry),
      completed: completed,
      remaining: Math.max(
        0,
        habit.targetCount - entry.count
      )
    };
  }

  /* =========================================
     UNDO COMPLETION
  ========================================= */

  function undoCompletion(habitId, date, amount) {
    ensureInitialized();

    getHabitOrThrow(habitId);

    date = normalizeDate(date);

    const entry = getLogEntry(habitId, date);

    if (!entry) return false;

    const previousLogs = logs.slice();

    const decrement = amount === undefined
      ? entry.count
      : Number(amount);

    if (!Number.isFinite(decrement) || decrement <= 0) {
      throw new Error("كمية التراجع غير صالحة.");
    }

    entry.count -= decrement;
    entry.updatedAt = now();

    if (entry.count <= 0) {
      logs = logs.filter(log =>
        !(log.habitId === habitId && log.date === date)
      );
    }

    try {
      saveLogs();
    } catch (error) {
      logs = previousLogs;
      throw error;
    }

    emit("habits:completion-undone", {
      habitId: habitId,
      date: date
    });

    return true;
  }

  /* =========================================
     GET COMPLETION LOGS
  ========================================= */

  function getLog(habitId, date) {
    ensureInitialized();

    let result = logs.slice();

    if (habitId) {
      result = result.filter(
        log => log.habitId === habitId
      );
    }

    if (date) {
      date = normalizeDate(date);

      result = result.filter(
        log => log.date === date
      );
    }

    result.sort((a, b) =>
      b.date.localeCompare(a.date)
    );

    return clone(result);
  }

  function getCompletionForDate(habitId, date) {
    ensureInitialized();

    date = normalizeDate(date);

    const habit = getHabitOrThrow(habitId);
    const entry = getLogEntry(habitId, date);

    return {
      habitId: habitId,
      date: date,
      count: entry ? entry.count : 0,
      targetCount: habit.targetCount,
      completed: entry
        ? entry.count >= habit.targetCount
        : false,
      remaining: Math.max(
        0,
        habit.targetCount - (entry ? entry.count : 0)
      )
    };
  }

  /* =========================================
     STREAK
     Counts consecutive scheduled days completed.
  ========================================= */

  function getStreak(habitId, referenceDate) {
    ensureInitialized();

    const habit = getHabitOrThrow(habitId);

    let date = normalizeDate(referenceDate);

    let streak = 0;
    let checkedDays = 0;

    // Look backward across calendar days.
    // Non-scheduled days do not break the streak.
    while (checkedDays < 3660) {
      if (date < habit.startDate) break;

      if (habit.endDate && date > habit.endDate) {
        date = habit.endDate;
      }

      if (isScheduledOn(habit, date)) {
        if (isCompletedOn(habit, date)) {
          streak += 1;
        } else {
          break;
        }
      }

      checkedDays += 1;

      const current = new Date(date + "T12:00:00");
      current.setDate(current.getDate() - 1);

      date = [
        current.getFullYear(),
        String(current.getMonth() + 1).padStart(2, "0"),
        String(current.getDate()).padStart(2, "0")
      ].join("-");

      if (habit.endDate && date > habit.endDate) {
        date = habit.endDate;
      }
    }

    return streak;
  }

  /* =========================================
     SUMMARY
  ========================================= */

  function getSummary(date) {
    ensureInitialized();

    date = normalizeDate(date);

    const activeHabits = habits.filter(habit =>
      !habit.archived &&
      habit.status === "active"
    );

    const scheduled = activeHabits.filter(habit =>
      isScheduledOn(habit, date)
    );

    const completed = scheduled.filter(habit =>
      isCompletedOn(habit, date)
    );

    const totalTarget = scheduled.reduce(
      (sum, habit) => sum + habit.targetCount,
      0
    );

    const totalCompleted = scheduled.reduce(
      (sum, habit) => sum + getCompletedCount(habit.id, date),
      0
    );

    return {
      date: date,
      totalHabits: habits.filter(habit => !habit.archived).length,
      activeHabits: activeHabits.length,
      scheduledToday: scheduled.length,
      completedToday: completed.length,
      remainingToday: scheduled.length - completed.length,
      completionRate: scheduled.length
        ? Math.round(
            (completed.length / scheduled.length) * 100
          )
        : 0,
      totalTarget: totalTarget,
      totalCompleted: totalCompleted,
      totalLogs: logs.length
    };
  }

  function getTodayHabits() {
    return getAll({
      status: "active",
      archived: false,
      date: today()
    }).map(habit => {
      const result = getCompletionForDate(
        habit.id,
        today()
      );

      return Object.assign({}, habit, {
        todayCount: result.count,
        todayTarget: result.targetCount,
        completedToday: result.completed,
        remainingToday: result.remaining
      });
    });
  }

  /* =========================================
     RESET
     Clears habit definitions and logs.
  ========================================= */

  function reset() {
    ensureInitialized();

    const previousHabits = habits.slice();
    const previousLogs = logs.slice();

    habits = [];
    logs = [];

    try {
      saveHabits();
      saveLogs();
    } catch (error) {
      habits = previousHabits;
      logs = previousLogs;

      try {
        saveHabits();
        saveLogs();
      } catch (rollbackError) {
        // Preserve the original error.
      }

      throw error;
    }

    emit("habits:reset", {});

    return getSummary();
  }

  /* =========================================
     PUBLIC API
  ========================================= */

  window.HabitsManager = Object.freeze({
    initialize: initialize,

    getAll: getAll,
    getById: getById,

    create: create,
    update: update,
    remove: remove,

    archive: archive,
    restore: restore,

    logCompletion: logCompletion,
    undoCompletion: undoCompletion,

    getLog: getLog,
    getCompletionForDate: getCompletionForDate,

    getStreak: getStreak,
    getTodayHabits: getTodayHabits,
    getSummary: getSummary,

    isScheduledOn: function (habitId, date) {
      ensureInitialized();
      return isScheduledOn(
        getHabitOrThrow(habitId),
        normalizeDate(date)
      );
    },

    reset: reset
  });

})(window);
