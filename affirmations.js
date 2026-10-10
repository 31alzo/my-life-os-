/* =========================================================
   MY LIFE OS — AFFIRMATION MANAGER
   File: Affirmation.js
   Purpose: Personal affirmations and daily reminders
========================================================= */

(function (window) {
  "use strict";

  const STORAGE_KEY = "affirmations";
  const DAILY_KEY = "affirmation-daily-state";

  const EVENTS = {
    changed: "affirmations:changed",
    created: "affirmations:created",
    updated: "affirmations:updated",
    deleted: "affirmations:deleted",
    viewed: "affirmations:viewed",
    completed: "affirmations:completed"
  };

  const CATEGORIES = [
    "discipline",
    "confidence",
    "learning",
    "career",
    "health",
    "relationships",
    "finance",
    "personal",
    "other"
  ];

  function createId() {
    if (
      window.AppUtils &&
      typeof window.AppUtils.createId === "function"
    ) {
      return window.AppUtils.createId();
    }

    return "affirmation-" +
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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
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
      console.error("[AffirmationsManager] Read failed:", error);
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
      console.error("[AffirmationsManager] Save failed:", error);
      throw new Error("تعذر حفظ البيانات في مساحة التخزين.");
    }
  }

  function normalizeCategory(category) {
    return CATEGORIES.includes(category)
      ? category
      : "personal";
  }

  function normalizeItem(item) {
    return {
      id: cleanString(item.id) || createId(),
      text: typeof item.text === "string" ? item.text : "",
      category: normalizeCategory(item.category),
      active: item.active !== false,
      favorite: item.favorite === true,
      sortOrder: Number.isFinite(Number(item.sortOrder))
        ? Number(item.sortOrder)
        : 0,
      createdAt: item.createdAt || now(),
      updatedAt: item.updatedAt || now()
    };
  }

  function getAll(options) {
    const settings = options || {};
    let items = read(STORAGE_KEY, []);

    if (!Array.isArray(items)) {
      items = [];
    }

    items = items.filter(isObject).map(normalizeItem);

    if (settings.activeOnly !== false) {
      items = items.filter(item => item.active);
    }

    if (settings.category) {
      items = items.filter(
        item => item.category === settings.category
      );
    }

    if (settings.favoritesOnly === true) {
      items = items.filter(item => item.favorite);
    }

    if (settings.search) {
      const query = cleanString(settings.search).toLowerCase();

      items = items.filter(item =>
        item.text.toLowerCase().includes(query)
      );
    }

    items.sort((a, b) => {
      if (a.favorite !== b.favorite) {
        return Number(b.favorite) - Number(a.favorite);
      }

      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }

      return a.createdAt.localeCompare(b.createdAt);
    });

    return clone(items);
  }

  function getById(id) {
    const item = getAll({ activeOnly: false }).find(
      entry => entry.id === id
    );

    return item ? clone(item) : null;
  }

  function create(input) {
    if (!isObject(input)) {
      throw new Error("بيانات العبارة غير صحيحة.");
    }

    const text = cleanString(input.text);

    if (!text) {
      throw new Error("اكتب العبارة أولاً.");
    }

    if (text.length > 1000) {
      throw new Error("يجب ألا تتجاوز العبارة 1000 حرف.");
    }

    const items = read(STORAGE_KEY, []);
    const safeItems = Array.isArray(items) ? items : [];

    const duplicate = safeItems.some(
      item =>
        item &&
        typeof item.text === "string" &&
        item.text.trim().toLowerCase() === text.toLowerCase()
    );

    if (duplicate) {
      throw new Error("هذه العبارة موجودة بالفعل.");
    }

    const timestamp = now();

    const item = {
      id: createId(),
      text: text,
      category: normalizeCategory(input.category),
      active: input.active !== false,
      favorite: input.favorite === true,
      sortOrder: safeItems.length,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    safeItems.push(item);
    write(STORAGE_KEY, safeItems);

    emit(EVENTS.created, clone(item));
    emit(EVENTS.changed, { action: "created", id: item.id });

    return clone(item);
  }

  function update(id, changes) {
    if (!isObject(changes)) {
      throw new Error("التعديلات غير صحيحة.");
    }

    const items = read(STORAGE_KEY, []);
    const safeItems = Array.isArray(items) ? items : [];
    const index = safeItems.findIndex(item => item.id === id);

    if (index === -1) {
      throw new Error("العبارة غير موجودة.");
    }

    const current = safeItems[index];
    const updated = Object.assign({}, current);

    if (Object.prototype.hasOwnProperty.call(changes, "text")) {
      const text = cleanString(changes.text);

      if (!text) {
        throw new Error("لا يمكن حفظ عبارة فارغة.");
      }

      if (text.length > 1000) {
        throw new Error("يجب ألا تتجاوز العبارة 1000 حرف.");
      }

      const duplicate = safeItems.some(
        (item, i) =>
          i !== index &&
          item &&
          typeof item.text === "string" &&
          item.text.trim().toLowerCase() === text.toLowerCase()
      );

      if (duplicate) {
        throw new Error("توجد عبارة أخرى بالنص نفسه.");
      }

      updated.text = text;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "category")) {
      if (!CATEGORIES.includes(changes.category)) {
        throw new Error("تصنيف العبارة غير صالح.");
      }

      updated.category = changes.category;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "active")) {
      updated.active = changes.active === true;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "favorite")) {
      updated.favorite = changes.favorite === true;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "sortOrder")) {
      const order = Number(changes.sortOrder);

      if (!Number.isFinite(order)) {
        throw new Error("ترتيب العبارة غير صالح.");
      }

      updated.sortOrder = order;
    }

    updated.updatedAt = now();
    safeItems[index] = updated;

    write(STORAGE_KEY, safeItems);

    emit(EVENTS.updated, clone(updated));
    emit(EVENTS.changed, { action: "updated", id: id });

    return clone(updated);
  }

  function remove(id) {
    const items = read(STORAGE_KEY, []);
    const safeItems = Array.isArray(items) ? items : [];
    const index = safeItems.findIndex(item => item.id === id);

    if (index === -1) {
      return false;
    }

    safeItems.splice(index, 1);
    write(STORAGE_KEY, safeItems);

    emit(EVENTS.deleted, { id: id });
    emit(EVENTS.changed, { action: "deleted", id: id });

    return true;
  }

  function setActive(id, active) {
    return update(id, { active: active === true });
  }

  function setFavorite(id, favorite) {
    return update(id, { favorite: favorite === true });
  }

  function getDailyState() {
    const state = read(DAILY_KEY, {});

    if (!isObject(state) || state.date !== today()) {
      return {
        date: today(),
        viewedIds: [],
        completedIds: []
      };
    }

    return {
      date: state.date,
      viewedIds: Array.isArray(state.viewedIds)
        ? state.viewedIds
        : [],
      completedIds: Array.isArray(state.completedIds)
        ? state.completedIds
        : []
    };
  }

  function recordViewed(id) {
    const item = getById(id);

    if (!item) {
      throw new Error("العبارة غير موجودة.");
    }

    const state = getDailyState();

    if (!state.viewedIds.includes(id)) {
      state.viewedIds.push(id);
    }

    write(DAILY_KEY, state);

    emit(EVENTS.viewed, {
      id: id,
      date: state.date
    });

    return clone(state);
  }

  function markCompleted(id) {
    const item = getById(id);

    if (!item) {
      throw new Error("العبارة غير موجودة.");
    }

    const state = getDailyState();

    if (!state.completedIds.includes(id)) {
      state.completedIds.push(id);
    }

    if (!state.viewedIds.includes(id)) {
      state.viewedIds.push(id);
    }

    write(DAILY_KEY, state);

    emit(EVENTS.completed, {
      id: id,
      date: state.date
    });

    return clone(state);
  }

  function getDailyProgress() {
    const state = getDailyState();
    const activeItems = getAll({ activeOnly: true });
    const total = activeItems.length;

    const viewed = activeItems.filter(
      item => state.viewedIds.includes(item.id)
    ).length;

    const completed = activeItems.filter(
      item => state.completedIds.includes(item.id)
    ).length;

    return {
      date: state.date,
      total: total,
      viewed: viewed,
      completed: completed,
      remaining: Math.max(0, total - completed),
      percentage: total === 0
        ? 0
        : Math.round((completed / total) * 100)
    };
  }

  function getRandom(options) {
    const items = getAll(options);

    if (items.length === 0) {
      return null;
    }

    const index = Math.floor(Math.random() * items.length);
    const selected = items[index];

    recordViewed(selected.id);

    return clone(selected);
  }

  function getSummary() {
    const all = getAll({ activeOnly: false });

    const summary = {
      total: all.length,
      active: 0,
      inactive: 0,
      favorites: 0,
      byCategory: {},
      dailyProgress: getDailyProgress()
    };

    CATEGORIES.forEach(category => {
      summary.byCategory[category] = 0;
    });

    all.forEach(item => {
      if (item.active) {
        summary.active += 1;
      } else {
        summary.inactive += 1;
      }

      if (item.favorite) {
        summary.favorites += 1;
      }

      summary.byCategory[item.category] += 1;
    });

    return summary;
  }

  function initializeDefaults() {
    const existing = read(STORAGE_KEY, []);

    if (Array.isArray(existing) && existing.length > 0) {
      return {
        initialized: true,
        seeded: false,
        count: existing.length
      };
    }

    const defaults = [
      {
        text: "أركّز اليوم على ما أستطيع فعله، لا على ما لا أستطيع التحكم فيه.",
        category: "discipline"
      },
      {
        text: "التقدم الصغير المستمر أفضل من انتظار الكمال.",
        category: "learning"
      },
      {
        text: "أتعلم من أخطائي وأستخدمها لتحسين خطواتي القادمة.",
        category: "confidence"
      },
      {
        text: "أحترم وقتي وأختار ما يخدم أهدافي طويلة المدى.",
        category: "discipline"
      },
      {
        text: "أستطيع طلب المساعدة والتعلم من الآخرين دون أن أقلل من نفسي.",
        category: "relationships"
      }
    ];

    const timestamp = now();

    const items = defaults.map((item, index) => ({
      id: createId(),
      text: item.text,
      category: item.category,
      active: true,
      favorite: false,
      sortOrder: index,
      createdAt: timestamp,
      updatedAt: timestamp
    }));

    write(STORAGE_KEY, items);

    emit(EVENTS.changed, {
      action: "defaults-created",
      count: items.length
    });

    return {
      initialized: true,
      seeded: true,
      count: items.length
    };
  }

  function initialize() {
    const existing = read(STORAGE_KEY, []);

    if (!Array.isArray(existing)) {
      write(STORAGE_KEY, []);
    }

    const state = read(DAILY_KEY, null);

    if (!isObject(state) || state.date !== today()) {
      write(DAILY_KEY, {
        date: today(),
        viewedIds: [],
        completedIds: []
      });
    }

    return {
      initialized: true,
      count: getAll({ activeOnly: false }).length
    };
  }

  function reset() {
    write(STORAGE_KEY, []);
    write(DAILY_KEY, {
      date: today(),
      viewedIds: [],
      completedIds: []
    });

    emit(EVENTS.changed, { action: "reset" });

    return true;
  }

  window.AffirmationsManager = Object.freeze({
    initialize: initialize,
    initializeDefaults: initializeDefaults,
    create: create,
    getAll: getAll,
    getById: getById,
    update: update,
    remove: remove,
    setActive: setActive,
    setFavorite: setFavorite,
    getRandom: getRandom,
    recordViewed: recordViewed,
    markCompleted: markCompleted,
    getDailyProgress: getDailyProgress,
    getSummary: getSummary,
    getCategories: function () {
      return CATEGORIES.slice();
    },
    reset: reset,
    EVENTS: Object.freeze(Object.assign({}, EVENTS))
  });

})(window);