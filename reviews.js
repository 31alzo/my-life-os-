
/* =========================================
   MY LIFE OS
   REVIEWS MANAGER
   File: reviews.js
   ========================================= */

(function (window) {
  "use strict";

  if (window.ReviewsManager) return;

  const STORAGE_KEY = "reviews";

  const VALID_PERIODS = [
    "daily",
    "weekly",
    "monthly",
    "ninety-day"
  ];

  const VALID_STATUSES = [
    "draft",
    "completed"
  ];

  let reviews = [];
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
      "review-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 9)
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

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
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

  function cleanText(value, limit) {
    if (typeof value !== "string") return "";

    return value.trim().slice(0, limit || 5000);
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

  function emit(name, detail) {
    if (
      window.AppEvents &&
      typeof window.AppEvents.emit === "function"
    ) {
      window.AppEvents.emit(name, detail);
      return;
    }

    try {
      window.dispatchEvent(
        new CustomEvent("my-life-os:" + name, {
          detail: detail
        })
      );
    } catch (error) {
      // Event delivery must not interrupt review operations.
    }
  }

  function ensureInitialized() {
    if (!initialized) initialize();
  }

  function save() {
    if (
      !window.AppStorage ||
      typeof window.AppStorage.set !== "function"
    ) {
      throw new Error("وحدة التخزين غير متاحة.");
    }

    window.AppStorage.set(STORAGE_KEY, reviews);
  }

  function findIndex(id) {
    return reviews.findIndex(review => review.id === id);
  }

  function findOrThrow(id) {
    const review = reviews.find(item => item.id === id);

    if (!review) {
      throw new Error("المراجعة غير موجودة.");
    }

    return review;
  }

  /* =========================================
     NORMALIZATION
  ========================================= */

  function normalizeRatings(input) {
    const ratings = isObject(input) ? input : {};
    const result = {};

    Object.keys(ratings).forEach(key => {
      const value = Number(ratings[key]);

      if (
        key.length <= 80 &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 10
      ) {
        result[key] = value;
      }
    });

    return result;
  }

  function normalizeList(value, maxItems) {
    if (!Array.isArray(value)) return [];

    return value
      .filter(item => typeof item === "string")
      .map(item => cleanText(item, 500))
      .filter(Boolean)
      .slice(0, maxItems || 100);
  }

  function normalizeReview(input, existing) {
    if (!isObject(input)) {
      throw new Error("بيانات المراجعة غير صالحة.");
    }

    const old = existing || {};

    const period =
      input.period !== undefined
        ? input.period
        : old.period || "daily";

    if (!VALID_PERIODS.includes(period)) {
      throw new Error("نوع المراجعة غير صالح.");
    }

    const date =
      input.date !== undefined
        ? input.date
        : old.date || today();

    if (!isValidDate(date)) {
      throw new Error("تاريخ المراجعة غير صالح.");
    }

    const status =
      input.status !== undefined
        ? input.status
        : old.status || "draft";

    if (!VALID_STATUSES.includes(status)) {
      throw new Error("حالة المراجعة غير صالحة.");
    }

    const title =
      cleanText(
        input.title !== undefined ? input.title : old.title,
        160
      ) || getDefaultTitle(period, date);

    return {
      id: old.id || input.id || createId(),

      title: title,
      period: period,
      date: date,
      status: status,

      summary: cleanText(
        input.summary !== undefined
          ? input.summary
          : old.summary,
        5000
      ),

      achievements: normalizeList(
        input.achievements !== undefined
          ? input.achievements
          : old.achievements
      ),

      difficulties: normalizeList(
        input.difficulties !== undefined
          ? input.difficulties
          : old.difficulties
      ),

      lessons: normalizeList(
        input.lessons !== undefined
          ? input.lessons
          : old.lessons
      ),

      improvements: normalizeList(
        input.improvements !== undefined
          ? input.improvements
          : old.improvements
      ),

      nextActions: normalizeList(
        input.nextActions !== undefined
          ? input.nextActions
          : old.nextActions
      ),

      ratings: normalizeRatings(
        input.ratings !== undefined
          ? input.ratings
          : old.ratings
      ),

      mood: cleanText(
        input.mood !== undefined ? input.mood : old.mood,
        80
      ),

      energy: cleanText(
        input.energy !== undefined ? input.energy : old.energy,
        80
      ),

      gratitude: cleanText(
        input.gratitude !== undefined
          ? input.gratitude
          : old.gratitude,
        2000
      ),

      goalIds: Array.isArray(
        input.goalIds !== undefined ? input.goalIds : old.goalIds
      )
        ? [
            ...new Set(
              (input.goalIds !== undefined
                ? input.goalIds
                : old.goalIds || []
              ).filter(id => typeof id === "string" && id.trim())
            )
          ]
        : [],

      notes: cleanText(
        input.notes !== undefined ? input.notes : old.notes,
        5000
      ),

      createdAt: old.createdAt || now(),
      updatedAt: now(),

      completedAt: status === "completed"
        ? old.completedAt || now()
        : null
    };
  }

  function getDefaultTitle(period, date) {
    const labels = {
      daily: "المراجعة اليومية",
      weekly: "المراجعة الأسبوعية",
      monthly: "المراجعة الشهرية",
      "ninety-day": "مراجعة خطة 90 يومًا"
    };

    return (labels[period] || "مراجعة") + " - " + date;
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

    const stored = window.AppStorage.get(STORAGE_KEY, []);

    reviews = Array.isArray(stored)
      ? stored.filter(isObject)
      : [];

    initialized = true;

    save();

    emit("reviews:initialized", {
      count: reviews.length
    });

    return getSummary();
  }

  /* =========================================
     CREATE
  ========================================= */

  function create(input) {
    ensureInitialized();

    const review = normalizeReview(input);

    if (reviews.some(item => item.id === review.id)) {
      throw new Error("معرّف المراجعة مستخدم بالفعل.");
    }

    reviews.push(review);

    try {
      save();
    } catch (error) {
      reviews.pop();
      throw error;
    }

    emit("reviews:created", clone(review));

    return clone(review);
  }

  /* =========================================
     READ
  ========================================= */

  function getAll(filters) {
    ensureInitialized();

    filters = isObject(filters) ? filters : {};

    let result = reviews.slice();

    if (filters.period) {
      result = result.filter(
        review => review.period === filters.period
      );
    }

    if (filters.status) {
      result = result.filter(
        review => review.status === filters.status
      );
    }

    if (filters.date) {
      if (!isValidDate(filters.date)) {
        throw new Error("تاريخ البحث غير صالح.");
      }

      result = result.filter(
        review => review.date === filters.date
      );
    }

    if (filters.fromDate) {
      if (!isValidDate(filters.fromDate)) {
        throw new Error("تاريخ البداية غير صالح.");
      }

      result = result.filter(
        review => review.date >= filters.fromDate
      );
    }

    if (filters.toDate) {
      if (!isValidDate(filters.toDate)) {
        throw new Error("تاريخ النهاية غير صالح.");
      }

      result = result.filter(
        review => review.date <= filters.toDate
      );
    }

    if (filters.search) {
      const query = cleanText(
        filters.search,
        200
      ).toLowerCase();

      result = result.filter(review =>
        review.title.toLowerCase().includes(query) ||
        review.summary.toLowerCase().includes(query) ||
        review.notes.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) =>
      b.date.localeCompare(a.date) ||
      b.updatedAt.localeCompare(a.updatedAt)
    );

    return clone(result);
  }

  function getById(id) {
    ensureInitialized();

    const review = reviews.find(item => item.id === id);

    return review ? clone(review) : null;
  }

  function getLatest(period) {
    const items = getAll(
      period ? { period: period } : {}
    );

    return items.length ? items[0] : null;
  }

  /* =========================================
     UPDATE
  ========================================= */

  function update(id, changes) {
    ensureInitialized();

    const index = findIndex(id);

    if (index === -1) {
      throw new Error("المراجعة غير موجودة.");
    }

    if (!isObject(changes)) {
      throw new Error("التعديلات غير صالحة.");
    }

    const previous = reviews[index];

    const updated = normalizeReview(
      Object.assign({}, previous, changes, {
        id: previous.id
      }),
      previous
    );

    reviews[index] = updated;

    try {
      save();
    } catch (error) {
      reviews[index] = previous;
      throw error;
    }

    emit("reviews:updated", {
      review: clone(updated),
      previous: clone(previous)
    });

    return clone(updated);
  }

  /* =========================================
     COMPLETE / REOPEN
  ========================================= */

  function complete(id) {
    const review = update(id, {
      status: "completed"
    });

    emit("reviews:completed", clone(review));

    return review;
  }

  function reopen(id) {
    return update(id, {
      status: "draft",
      completedAt: null
    });
  }

  /* =========================================
     NEXT ACTIONS
  ========================================= */

  function addNextAction(id, action) {
    ensureInitialized();

    const review = findOrThrow(id);
    const value = cleanText(action, 500);

    if (!value) {
      throw new Error("اكتب الإجراء التالي أولًا.");
    }

    return update(id, {
      nextActions: review.nextActions.concat(value)
    });
  }

  function removeNextAction(id, index) {
    ensureInitialized();

    const review = findOrThrow(id);

    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= review.nextActions.length
    ) {
      return false;
    }

    const nextActions = review.nextActions.slice();

    nextActions.splice(index, 1);

    update(id, {
      nextActions: nextActions
    });

    return true;
  }

  /* =========================================
     CONVERT ACTION TO TASK
     This creates a task only when explicitly called.
  ========================================= */

  function convertActionToTask(reviewId, actionIndex, options) {
    ensureInitialized();

    const review = findOrThrow(reviewId);

    if (
      !Number.isInteger(actionIndex) ||
      actionIndex < 0 ||
      actionIndex >= review.nextActions.length
    ) {
      throw new Error("الإجراء المطلوب غير موجود.");
    }

    if (
      !window.TasksManager ||
      typeof window.TasksManager.create !== "function"
    ) {
      throw new Error("وحدة إدارة المهام غير متاحة.");
    }

    options = isObject(options) ? options : {};

    const title = review.nextActions[actionIndex];

    const task = window.TasksManager.create({
      title: title,
      description: "إجراء ناتج عن: " + review.title,
      scheduledDate: options.scheduledDate || today(),
      priority: options.priority || "medium",
      source: {
        type: "review",
        reviewId: review.id
      }
    });

    emit("reviews:action-converted", {
      reviewId: review.id,
      action: title,
      taskId: task.id
    });

    return task;
  }

  /* =========================================
     DELETE
  ========================================= */

  function remove(id) {
    ensureInitialized();

    const index = findIndex(id);

    if (index === -1) return false;

    const previous = reviews[index];

    reviews.splice(index, 1);

    try {
      save();
    } catch (error) {
      reviews.splice(index, 0, previous);
      throw error;
    }

    emit("reviews:removed", {
      id: id
    });

    return true;
  }

  /* =========================================
     SUMMARY
  ========================================= */

  function getSummary(filters) {
    ensureInitialized();

    const items = getAll(filters || {});

    const completed = items.filter(
      review => review.status === "completed"
    );

    const drafts = items.filter(
      review => review.status === "draft"
    );

    const actions = items.reduce(
      (sum, review) => sum + review.nextActions.length,
      0
    );

    const periods = {};

    VALID_PERIODS.forEach(period => {
      periods[period] = items.filter(
        review => review.period === period
      ).length;
    });

    return {
      total: items.length,
      completed: completed.length,
      drafts: drafts.length,
      completionRate: items.length
        ? Math.round((completed.length / items.length) * 100)
        : 0,
      nextActions: actions,
      byPeriod: periods
    };
  }

  /* =========================================
     RESET
  ========================================= */

  function reset() {
    ensureInitialized();

    const previous = reviews.slice();

    reviews = [];

    try {
      save();
    } catch (error) {
      reviews = previous;
      throw error;
    }

    emit("reviews:reset", {});

    return getSummary();
  }

  /* =========================================
     PUBLIC API
  ========================================= */

  window.ReviewsManager = Object.freeze({
    initialize: initialize,

    create: create,
    getAll: getAll,
    getById: getById,
    getLatest: getLatest,
    update: update,

    complete: complete,
    reopen: reopen,

    addNextAction: addNextAction,
    removeNextAction: removeNextAction,
    convertActionToTask: convertActionToTask,

    remove: remove,
    getSummary: getSummary,
    reset: reset
  });

})(window);
