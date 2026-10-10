
/* =========================================
   MY LIFE OS
   NOTES MANAGER
   File: Notes.js
   ========================================= */

(function (window) {
  "use strict";

  if (window.NotesManager) return;

  const STORAGE_KEY = "notes";

  const VALID_STATUSES = [
    "active",
    "archived"
  ];

  let notes = [];
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
      "note-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 9)
    );
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

    return value.trim().slice(0, limit || 10000);
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
      // Event delivery must not interrupt note operations.
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

    window.AppStorage.set(STORAGE_KEY, notes);
  }

  function findIndex(id) {
    return notes.findIndex(note => note.id === id);
  }

  function findOrThrow(id) {
    const note = notes.find(item => item.id === id);

    if (!note) {
      throw new Error("الملاحظة غير موجودة.");
    }

    return note;
  }

  /* =========================================
     NORMALIZATION
  ========================================= */

  function normalizeTags(value) {
    if (!Array.isArray(value)) return [];

    return [...new Set(
      value
        .filter(tag => typeof tag === "string")
        .map(tag => cleanText(tag, 60))
        .filter(Boolean)
    )].slice(0, 50);
  }

  function normalizeNote(input, existing) {
    if (!isObject(input)) {
      throw new Error("بيانات الملاحظة غير صالحة.");
    }

    const old = existing || {};

    const title = cleanText(
      input.title !== undefined
        ? input.title
        : old.title,
      200
    );

    const content = cleanText(
      input.content !== undefined
        ? input.content
        : old.content,
      50000
    );

    if (!title && !content) {
      throw new Error("أضف عنوانًا أو محتوى للملاحظة.");
    }

    const status =
      input.status !== undefined
        ? input.status
        : old.status || "active";

    if (!VALID_STATUSES.includes(status)) {
      throw new Error("حالة الملاحظة غير صالحة.");
    }

    const linkedGoalId =
      input.goalId !== undefined
        ? input.goalId || null
        : old.goalId || null;

    const linkedDomainId =
      input.domainId !== undefined
        ? input.domainId || null
        : old.domainId || null;

    if (
      linkedGoalId &&
      window.GoalsManager &&
      typeof window.GoalsManager.getById === "function" &&
      !window.GoalsManager.getById(linkedGoalId)
    ) {
      throw new Error("الهدف المرتبط بالملاحظة غير موجود.");
    }

    if (
      linkedDomainId &&
      window.LifeDomainsManager &&
      typeof window.LifeDomainsManager.getById === "function" &&
      !window.LifeDomainsManager.getById(linkedDomainId)
    ) {
      throw new Error("مجال الحياة المرتبط بالملاحظة غير موجود.");
    }

    return {
      id: old.id || input.id || createId(),

      title: title,
      content: content,

      category: cleanText(
        input.category !== undefined
          ? input.category
          : old.category || "general",
        100
      ) || "general",

      tags: normalizeTags(
        input.tags !== undefined
          ? input.tags
          : old.tags
      ),

      status: status,

      pinned:
        input.pinned !== undefined
          ? Boolean(input.pinned)
          : Boolean(old.pinned),

      goalId: linkedGoalId,
      domainId: linkedDomainId,

      source: isObject(input.source)
        ? clone(input.source)
        : old.source || null,

      createdAt: old.createdAt || now(),
      updatedAt: now(),

      archivedAt: status === "archived"
        ? old.archivedAt || now()
        : null
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

    const stored = window.AppStorage.get(STORAGE_KEY, []);

    notes = Array.isArray(stored)
      ? stored.filter(isObject)
      : [];

    initialized = true;

    save();

    emit("notes:initialized", {
      count: notes.length
    });

    return getSummary();
  }

  /* =========================================
     CREATE
  ========================================= */

  function create(input) {
    ensureInitialized();

    const note = normalizeNote(input);

    if (notes.some(item => item.id === note.id)) {
      throw new Error("معرّف الملاحظة مستخدم بالفعل.");
    }

    notes.push(note);

    try {
      save();
    } catch (error) {
      notes.pop();
      throw error;
    }

    emit("notes:created", clone(note));

    return clone(note);
  }

  /* =========================================
     READ AND SEARCH
  ========================================= */

  function getAll(filters) {
    ensureInitialized();

    filters = isObject(filters) ? filters : {};

    let result = notes.slice();

    if (filters.status) {
      result = result.filter(
        note => note.status === filters.status
      );
    } else {
      result = result.filter(
        note => note.status === "active"
      );
    }

    if (filters.category) {
      result = result.filter(
        note => note.category === filters.category
      );
    }

    if (filters.goalId) {
      result = result.filter(
        note => note.goalId === filters.goalId
      );
    }

    if (filters.domainId) {
      result = result.filter(
        note => note.domainId === filters.domainId
      );
    }

    if (filters.pinned !== undefined) {
      result = result.filter(
        note => note.pinned === Boolean(filters.pinned)
      );
    }

    if (filters.tag) {
      const tag = cleanText(filters.tag, 60);

      result = result.filter(
        note => note.tags.includes(tag)
      );
    }

    if (filters.search) {
      const query = cleanText(
        filters.search,
        500
      ).toLowerCase();

      result = result.filter(note => {
        const searchable = [
          note.title,
          note.content,
          note.category,
          ...note.tags
        ].join(" ").toLowerCase();

        return searchable.includes(query);
      });
    }

    result.sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }

      return b.updatedAt.localeCompare(a.updatedAt);
    });

    return clone(result);
  }

  function getById(id) {
    ensureInitialized();

    const note = notes.find(item => item.id === id);

    return note ? clone(note) : null;
  }

  function getCategories() {
    ensureInitialized();

    return [...new Set(
      notes.map(note => note.category).filter(Boolean)
    )].sort();
  }

  function getTags() {
    ensureInitialized();

    return [...new Set(
      notes.flatMap(note => note.tags)
    )].sort();
  }

  /* =========================================
     UPDATE
  ========================================= */

  function update(id, changes) {
    ensureInitialized();

    const index = findIndex(id);

    if (index === -1) {
      throw new Error("الملاحظة غير موجودة.");
    }

    if (!isObject(changes)) {
      throw new Error("التعديلات غير صالحة.");
    }

    const previous = notes[index];

    const updated = normalizeNote(
      Object.assign({}, previous, changes, {
        id: previous.id
      }),
      previous
    );

    notes[index] = updated;

    try {
      save();
    } catch (error) {
      notes[index] = previous;
      throw error;
    }

    emit("notes:updated", {
      note: clone(updated),
      previous: clone(previous)
    });

    return clone(updated);
  }

  /* =========================================
     PINNING
  ========================================= */

  function pin(id) {
    return update(id, {
      pinned: true
    });
  }

  function unpin(id) {
    return update(id, {
      pinned: false
    });
  }

  /* =========================================
     ARCHIVE AND RESTORE
  ========================================= */

  function archive(id) {
    return update(id, {
      status: "archived",
      archivedAt: now()
    });
  }

  function restore(id) {
    return update(id, {
      status: "active",
      archivedAt: null
    });
  }

  /* =========================================
     DUPLICATE
  ========================================= */

  function duplicate(id) {
    ensureInitialized();

    const original = findOrThrow(id);

    return create({
      title: original.title
        ? original.title + " - نسخة"
        : "نسخة من الملاحظة",

      content: original.content,
      category: original.category,
      tags: original.tags.slice(),
      goalId: original.goalId,
      domainId: original.domainId,
      source: {
        type: "note-duplicate",
        originalNoteId: original.id
      }
    });
  }

  /* =========================================
     DELETE
  ========================================= */

  function remove(id) {
    ensureInitialized();

    const index = findIndex(id);

    if (index === -1) return false;

    const previous = notes[index];

    notes.splice(index, 1);

    try {
      save();
    } catch (error) {
      notes.splice(index, 0, previous);
      throw error;
    }

    emit("notes:removed", {
      id: id
    });

    return true;
  }

  /* =========================================
     SUMMARY
  ========================================= */

  function getSummary() {
    ensureInitialized();

    const active = notes.filter(
      note => note.status === "active"
    );

    const archived = notes.filter(
      note => note.status === "archived"
    );

    return {
      total: notes.length,
      active: active.length,
      archived: archived.length,
      pinned: active.filter(note => note.pinned).length,
      categories: getCategories().length,
      tags: getTags().length,
      linkedToGoals: active.filter(note => note.goalId).length,
      linkedToDomains: active.filter(note => note.domainId).length
    };
  }

  /* =========================================
     RESET
  ========================================= */

  function reset() {
    ensureInitialized();

    const previous = notes.slice();

    notes = [];

    try {
      save();
    } catch (error) {
      notes = previous;
      throw error;
    }

    emit("notes:reset", {});

    return getSummary();
  }

  /* =========================================
     PUBLIC API
  ========================================= */

  window.NotesManager = Object.freeze({
    initialize: initialize,

    create: create,
    getAll: getAll,
    getById: getById,
    update: update,
    remove: remove,

    getCategories: getCategories,
    getTags: getTags,

    pin: pin,
    unpin: unpin,

    archive: archive,
    restore: restore,

    duplicate: duplicate,

    getSummary: getSummary,
    reset: reset
  });

})(window);
