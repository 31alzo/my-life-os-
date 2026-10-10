
/* =========================================
   MY LIFE OS — DIGITAL LIFE MANAGER
   File: digital-life.js
   ========================================= */

const DigitalLifeManager = (() => {
  "use strict";

  const STORAGE_KEY = "digital-life-data";

  const DEFAULT_DATA = {
    usageRecords: [],
    focusSessions: [],
    goals: [],
    distractions: []
  };

  function createId() {
    if (
      typeof AppUtils !== "undefined" &&
      typeof AppUtils.createId === "function"
    ) {
      return AppUtils.createId();
    }

    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 9)
    );
  }

  function getData() {
    const stored =
      typeof AppStorage !== "undefined"
        ? AppStorage.get(STORAGE_KEY, {})
        : {};

    return {
      ...DEFAULT_DATA,
      ...(stored && typeof stored === "object" ? stored : {})
    };
  }

  function saveData(data) {
    if (
      typeof AppStorage === "undefined" ||
      typeof AppStorage.set !== "function"
    ) {
      throw new Error(
        "AppStorage غير متاح. يجب تحميل storage.js أولًا."
      );
    }

    AppStorage.set(STORAGE_KEY, data);
    return data;
  }

  function cleanText(value, maxLength = 500) {
    return String(value ?? "").trim().slice(0, maxLength);
  }

  function validDate(value) {
    if (!value) return false;

    const date = new Date(value);
    return !Number.isNaN(date.getTime());
  }

  function validMinutes(value) {
    const minutes = Number(value);

    return (
      Number.isFinite(minutes) &&
      minutes >= 0 &&
      minutes <= 1440
    );
  }

  function getToday() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  /* =========================================
     1. SCREEN TIME AND DIGITAL USAGE
  ========================================= */

  function addUsageRecord(record = {}) {
    const date = record.date || getToday();
    const minutes = Number(record.minutes);

    if (!validDate(date)) {
      throw new Error("تاريخ التسجيل غير صالح.");
    }

    if (!validMinutes(minutes)) {
      throw new Error("أدخل مدة استخدام صحيحة بالدقائق.");
    }

    const data = getData();

    const item = {
      id: createId(),
      date,
      category: cleanText(record.category || "عام", 80),
      appName: cleanText(record.appName, 100),
      minutes,
      productive: Boolean(record.productive),
      note: cleanText(record.note),
      createdAt: new Date().toISOString()
    };

    data.usageRecords.push(item);
    saveData(data);

    return item;
  }

  function getUsageRecords(filters = {}) {
    let records = getData().usageRecords;

    if (filters.date) {
      records = records.filter(
        item => item.date === filters.date
      );
    }

    if (filters.category) {
      records = records.filter(
        item => item.category === filters.category
      );
    }

    return [...records].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  }

  function updateUsageRecord(id, updates = {}) {
    const data = getData();

    const index = data.usageRecords.findIndex(
      item => item.id === id
    );

    if (index === -1) return null;

    const current = data.usageRecords[index];

    if (
      updates.minutes !== undefined &&
      !validMinutes(updates.minutes)
    ) {
      throw new Error("مدة الاستخدام غير صحيحة.");
    }

    if (
      updates.date !== undefined &&
      !validDate(updates.date)
    ) {
      throw new Error("التاريخ غير صالح.");
    }

    data.usageRecords[index] = {
      ...current,
      ...updates,
      id: current.id,
      category:
        updates.category !== undefined
          ? cleanText(updates.category, 80)
          : current.category,
      appName:
        updates.appName !== undefined
          ? cleanText(updates.appName, 100)
          : current.appName,
      note:
        updates.note !== undefined
          ? cleanText(updates.note)
          : current.note,
      minutes:
        updates.minutes !== undefined
          ? Number(updates.minutes)
          : current.minutes
    };

    saveData(data);
    return data.usageRecords[index];
  }

  function deleteUsageRecord(id) {
    const data = getData();

    const before = data.usageRecords.length;

    data.usageRecords = data.usageRecords.filter(
      item => item.id !== id
    );

    if (data.usageRecords.length === before) {
      return false;
    }

    saveData(data);
    return true;
  }

  /* =========================================
     2. FOCUS SESSIONS
  ========================================= */

  function addFocusSession(session = {}) {
    const minutes = Number(session.minutes);

    if (
      !Number.isFinite(minutes) ||
      minutes < 1 ||
      minutes > 1440
    ) {
      throw new Error("مدة جلسة التركيز يجب أن تكون بين 1 و1440 دقيقة.");
    }

    const data = getData();

    const item = {
      id: createId(),
      date: session.date || getToday(),
      minutes,
      activity: cleanText(
        session.activity || "تركيز عام",
        120
      ),
      completed: session.completed !== false,
      interruptions: Math.max(
        0,
        Number(session.interruptions) || 0
      ),
      note: cleanText(session.note),
      createdAt: new Date().toISOString()
    };

    data.focusSessions.push(item);
    saveData(data);

    return item;
  }

  function getFocusSessions(filters = {}) {
    let sessions = getData().focusSessions;

    if (filters.date) {
      sessions = sessions.filter(
        item => item.date === filters.date
      );
    }

    return [...sessions].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  }

  function deleteFocusSession(id) {
    const data = getData();

    const before = data.focusSessions.length;

    data.focusSessions = data.focusSessions.filter(
      item => item.id !== id
    );

    if (before === data.focusSessions.length) {
      return false;
    }

    saveData(data);
    return true;
  }

  /* =========================================
     3. DIGITAL HABITS AND GOALS
  ========================================= */

  function addGoal(goal = {}) {
    const title = cleanText(goal.title, 150);

    if (!title) {
      throw new Error("اكتب اسم الهدف الرقمي.");
    }

    const targetMinutes =
      goal.targetMinutes === undefined ||
      goal.targetMinutes === ""
        ? null
        : Number(goal.targetMinutes);

    if (
      targetMinutes !== null &&
      (
        !Number.isFinite(targetMinutes) ||
        targetMinutes < 0 ||
        targetMinutes > 1440
      )
    ) {
      throw new Error("المدة المستهدفة غير صحيحة.");
    }

    const data = getData();

    const item = {
      id: createId(),
      title,
      type: cleanText(goal.type || "تقليل الاستخدام", 80),
      targetMinutes,
      deadline: goal.deadline || "",
      status: "active",
      note: cleanText(goal.note),
      createdAt: new Date().toISOString()
    };

    data.goals.push(item);
    saveData(data);

    return item;
  }

  function getGoals(filters = {}) {
    let goals = getData().goals;

    if (filters.status) {
      goals = goals.filter(
        goal => goal.status === filters.status
      );
    }

    return [...goals];
  }

  function updateGoal(id, updates = {}) {
    const data = getData();

    const index = data.goals.findIndex(
      goal => goal.id === id
    );

    if (index === -1) return null;

    const allowedStatuses = [
      "active",
      "completed",
      "paused"
    ];

    if (
      updates.status !== undefined &&
      !allowedStatuses.includes(updates.status)
    ) {
      throw new Error("حالة الهدف غير صحيحة.");
    }

    data.goals[index] = {
      ...data.goals[index],
      ...updates,
      id: data.goals[index].id,
      title:
        updates.title !== undefined
          ? cleanText(updates.title, 150)
          : data.goals[index].title
    };

    saveData(data);
    return data.goals[index];
  }

  function deleteGoal(id) {
    const data = getData();

    const before = data.goals.length;

    data.goals = data.goals.filter(
      goal => goal.id !== id
    );

    if (before === data.goals.length) return false;

    saveData(data);
    return true;
  }

  /* =========================================
     4. DISTRACTIONS
  ========================================= */

  function addDistraction(distraction = {}) {
    const title = cleanText(distraction.title, 150);

    if (!title) {
      throw new Error("اكتب اسم مصدر التشتت.");
    }

    const data = getData();

    const item = {
      id: createId(),
      title,
      date: distraction.date || getToday(),
      category: cleanText(
        distraction.category || "وسائل التواصل",
        80
      ),
      minutesLost: Math.max(
        0,
        Number(distraction.minutesLost) || 0
      ),
      trigger: cleanText(distraction.trigger, 200),
      alternative: cleanText(distraction.alternative, 200),
      note: cleanText(distraction.note),
      createdAt: new Date().toISOString()
    };

    data.distractions.push(item);
    saveData(data);

    return item;
  }

  function getDistractions(filters = {}) {
    let distractions = getData().distractions;

    if (filters.date) {
      distractions = distractions.filter(
        item => item.date === filters.date
      );
    }

    if (filters.category) {
      distractions = distractions.filter(
        item => item.category === filters.category
      );
    }

    return [...distractions].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  }

  function deleteDistraction(id) {
    const data = getData();

    const before = data.distractions.length;

    data.distractions = data.distractions.filter(
      item => item.id !== id
    );

    if (before === data.distractions.length) {
      return false;
    }

    saveData(data);
    return true;
  }

  /* =========================================
     5. STATISTICS
  ========================================= */

  function getStats(date = getToday()) {
    const data = getData();

    const usage = data.usageRecords.filter(
      item => item.date === date
    );

    const sessions = data.focusSessions.filter(
      item => item.date === date
    );

    const distractions = data.distractions.filter(
      item => item.date === date
    );

    const totalUsage = usage.reduce(
      (sum, item) => sum + item.minutes,
      0
    );

    const productiveUsage = usage
      .filter(item => item.productive)
      .reduce((sum, item) => sum + item.minutes, 0);

    const focusMinutes = sessions
      .filter(item => item.completed)
      .reduce((sum, item) => sum + item.minutes, 0);

    const distractionMinutes = distractions.reduce(
      (sum, item) => sum + item.minutesLost,
      0
    );

    return {
      date,
      totalUsageMinutes: totalUsage,
      totalUsageHours: Number((totalUsage / 60).toFixed(2)),
      productiveUsageMinutes: productiveUsage,
      focusSessions: sessions.length,
      focusMinutes,
      completedFocusSessions: sessions.filter(
        item => item.completed
      ).length,
      distractionCount: distractions.length,
      distractionMinutes,
      activeGoals: data.goals.filter(
        goal => goal.status === "active"
      ).length,
      completedGoals: data.goals.filter(
        goal => goal.status === "completed"
      ).length
    };
  }

  function getWeeklyStats() {
    const result = [];
    const today = new Date();

    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(today);

      date.setDate(today.getDate() - offset);

      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
      ].join("-");

      result.push(getStats(key));
    }

    return result;
  }

  /* =========================================
     6. PUBLIC API
  ========================================= */

  return {
    getToday,

    addUsageRecord,
    getUsageRecords,
    updateUsageRecord,
    deleteUsageRecord,

    addFocusSession,
    getFocusSessions,
    deleteFocusSession,

    addGoal,
    getGoals,
    updateGoal,
    deleteGoal,

    addDistraction,
    getDistractions,
    deleteDistraction,

    getStats,
    getWeeklyStats
  };
})();

/* Support module access during integration */
if (typeof window !== "undefined") {
  window.DigitalLifeManager = DigitalLifeManager;
}
