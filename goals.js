
/* ========================================
   MY LIFE OS — Goals Manager
   إدارة الأهداف
======================================== */

"use strict";

const GoalsManager = (() => {
  const STORAGE_KEY = "goals";

  const STATUSES = [
    "planned",
    "active",
    "completed",
    "paused",
    "cancelled"
  ];

  function getAll() {
    const goals = AppStorage.get(STORAGE_KEY, []);
    return Array.isArray(goals) ? goals : [];
  }

  function getById(id) {
    return getAll().find(goal => goal.id === id) || null;
  }

  function create(data) {
    if (!data || typeof data !== "object") {
      return {
        success: false,
        message: "بيانات الهدف غير صحيحة."
      };
    }

    const title =
      typeof data.title === "string"
        ? data.title.trim()
        : "";

    if (!title) {
      return {
        success: false,
        message: "اكتب اسم الهدف أولًا."
      };
    }

    const goal = {
      id: AppUtils.createId(),
      title,
      description:
        typeof data.description === "string"
          ? data.description.trim()
          : "",
      category:
        typeof data.category === "string"
          ? data.category
          : "شخصي",
      status: "planned",
      progress: 0,
      targetDate: data.targetDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = AppStorage.set(
      STORAGE_KEY,
      [...getAll(), goal]
    );

    return result.success
      ? { success: true, goal }
      : result;
  }

  function update(id, changes) {
    if (!changes || typeof changes !== "object") {
      return {
        success: false,
        message: "التعديلات غير صحيحة."
      };
    }

    const goals = getAll();
    const index = goals.findIndex(goal => goal.id === id);

    if (index === -1) {
      return {
        success: false,
        message: "لم يتم العثور على الهدف."
      };
    }

    const updated = { ...goals[index] };

    if (typeof changes.title === "string") {
      const title = changes.title.trim();

      if (!title) {
        return {
          success: false,
          message: "اسم الهدف لا يمكن أن يكون فارغًا."
        };
      }

      updated.title = title;
    }

    if (typeof changes.description === "string") {
      updated.description = changes.description.trim();
    }

    if (typeof changes.category === "string") {
      updated.category = changes.category;
    }

    if (STATUSES.includes(changes.status)) {
      updated.status = changes.status;
    }

    if (
      Number.isFinite(changes.progress) &&
      changes.progress >= 0 &&
      changes.progress <= 100
    ) {
      updated.progress = changes.progress;
    }

    if (
      changes.targetDate === null ||
      typeof changes.targetDate === "string"
    ) {
      updated.targetDate = changes.targetDate;
    }

    if (updated.status === "completed") {
      updated.progress = 100;
    }

    updated.updatedAt = new Date().toISOString();

    goals[index] = updated;

    const result = AppStorage.set(STORAGE_KEY, goals);

    return result.success
      ? { success: true, goal: updated }
      : result;
  }

  function remove(id) {
    const goals = getAll();

    if (!goals.some(goal => goal.id === id)) {
      return {
        success: false,
        message: "لم يتم العثور على الهدف."
      };
    }

    const result = AppStorage.set(
      STORAGE_KEY,
      goals.filter(goal => goal.id !== id)
    );

    return result.success
      ? { success: true }
      : result;
  }

  function getSummary() {
    const goals = getAll();

    return {
      total: goals.length,
      active: goals.filter(goal => goal.status === "active").length,
      planned: goals.filter(goal => goal.status === "planned").length,
      completed: goals.filter(goal => goal.status === "completed").length,
      paused: goals.filter(goal => goal.status === "paused").length
    };
  }

  return Object.freeze({
    getAll,
    getById,
    create,
    update,
    remove,
    getSummary
  });
})();
