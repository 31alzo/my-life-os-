
/* ========================================
   MY LIFE OS — Tasks Manager
   إدارة المهام اليومية
======================================== */

"use strict";

const TasksManager = (() => {
  const STORAGE_KEY = "tasks";

  const STATUSES = [
    "pending",
    "in_progress",
    "completed",
    "postponed",
    "cancelled"
  ];

  const PRIORITIES = [
    "low",
    "medium",
    "high",
    "urgent"
  ];

  function getAll() {
    const tasks = AppStorage.get(STORAGE_KEY, []);
    return Array.isArray(tasks) ? tasks : [];
  }

  function getById(id) {
    return getAll().find(task => task.id === id) || null;
  }

  function create(data) {
    if (!data || typeof data !== "object") {
      return {
        success: false,
        message: "بيانات المهمة غير صحيحة."
      };
    }

    const title =
      typeof data.title === "string"
        ? data.title.trim()
        : "";

    if (!title) {
      return {
        success: false,
        message: "اكتب اسم المهمة أولًا."
      };
    }

    const task = {
      id: AppUtils.createId(),
      title,
      description:
        typeof data.description === "string"
          ? data.description.trim()
          : "",
      goalId:
        typeof data.goalId === "string"
          ? data.goalId
          : null,
      date:
        typeof data.date === "string"
          ? data.date
          : AppUtils.getToday(),
      startTime:
        typeof data.startTime === "string"
          ? data.startTime
          : null,
      endTime:
        typeof data.endTime === "string"
          ? data.endTime
          : null,
      priority: PRIORITIES.includes(data.priority)
        ? data.priority
        : "medium",
      status: "pending",
      recurring:
        typeof data.recurring === "string"
          ? data.recurring
          : "none",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null
    };

    const result = AppStorage.set(
      STORAGE_KEY,
      [...getAll(), task]
    );

    return result.success
      ? { success: true, task }
      : result;
  }

  function update(id, changes) {
    if (!changes || typeof changes !== "object") {
      return {
        success: false,
        message: "التعديلات غير صحيحة."
      };
    }

    const tasks = getAll();
    const index = tasks.findIndex(task => task.id === id);

    if (index === -1) {
      return {
        success: false,
        message: "لم يتم العثور على المهمة."
      };
    }

    const task = { ...tasks[index] };

    if (typeof changes.title === "string") {
      const title = changes.title.trim();

      if (!title) {
        return {
          success: false,
          message: "اسم المهمة لا يمكن أن يكون فارغًا."
        };
      }

      task.title = title;
    }

    if (typeof changes.description === "string") {
      task.description = changes.description.trim();
    }

    if (
      changes.goalId === null ||
      typeof changes.goalId === "string"
    ) {
      task.goalId = changes.goalId;
    }

    if (typeof changes.date === "string") {
      task.date = changes.date;
    }

    if (
      changes.startTime === null ||
      typeof changes.startTime === "string"
    ) {
      task.startTime = changes.startTime;
    }

    if (
      changes.endTime === null ||
      typeof changes.endTime === "string"
    ) {
      task.endTime = changes.endTime;
    }

    if (PRIORITIES.includes(changes.priority)) {
      task.priority = changes.priority;
    }

    if (STATUSES.includes(changes.status)) {
      task.status = changes.status;

      task.completedAt =
        changes.status === "completed"
          ? new Date().toISOString()
          : null;
    }

    if (typeof changes.recurring === "string") {
      task.recurring = changes.recurring;
    }

    task.updatedAt = new Date().toISOString();
    tasks[index] = task;

    const result = AppStorage.set(STORAGE_KEY, tasks);

    return result.success
      ? { success: true, task }
      : result;
  }

  function remove(id) {
    const tasks = getAll();

    if (!tasks.some(task => task.id === id)) {
      return {
        success: false,
        message: "لم يتم العثور على المهمة."
      };
    }

    const result = AppStorage.set(
      STORAGE_KEY,
      tasks.filter(task => task.id !== id)
    );

    return result.success
      ? { success: true }
      : result;
  }

  function getByDate(date) {
    return getAll()
      .filter(task => task.date === date)
      .sort((a, b) => {
        const timeA = a.startTime || "99:99";
        const timeB = b.startTime || "99:99";
        return timeA.localeCompare(timeB);
      });
  }

  function getByGoal(goalId) {
    return getAll().filter(task => task.goalId === goalId);
  }

  function getSummary(date = AppUtils.getToday()) {
    const tasks = getByDate(date);

    return {
      total: tasks.length,
      pending: tasks.filter(task => task.status === "pending").length,
      inProgress: tasks.filter(task => task.status === "in_progress").length,
      completed: tasks.filter(task => task.status === "completed").length,
      postponed: tasks.filter(task => task.status === "postponed").length,
      urgent: tasks.filter(
        task =>
          task.priority === "urgent" &&
          task.status !== "completed" &&
          task.status !== "cancelled"
      ).length
    };
  }

  return Object.freeze({
    getAll,
    getById,
    create,
    update,
    remove,
    getByDate,
    getByGoal,
    getSummary
  });
})();
