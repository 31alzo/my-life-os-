/* =========================================================
   MY LIFE OS — MEMO MANAGER
   File: Memo.js
   Purpose: Quick capture, inbox processing, approved conversion
========================================================= */

(function (window) {
  "use strict";

  const STORAGE_KEY = "memos";
  const EVENTS = {
    changed: "memos:changed",
    created: "memos:created",
    updated: "memos:updated",
    deleted: "memos:deleted",
    processed: "memos:processed",
    converted: "memos:converted"
  };

  const TYPES = [
    "idea",
    "thought",
    "reminder",
    "information",
    "question",
    "other"
  ];

  const STATUSES = [
    "inbox",
    "reviewing",
    "approved",
    "processed",
    "archived"
  ];

  const CONVERSION_TARGETS = [
    "goal",
    "task",
    "habit",
    "note"
  ];

  function createId() {
    if (
      window.AppUtils &&
      typeof window.AppUtils.createId === "function"
    ) {
      return window.AppUtils.createId();
    }

    return "memo-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 10);
  }

  function now() {
    return new Date().toISOString();
  }

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function cleanString(value) {
    return typeof value === "string"
      ? value.trim()
      : "";
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

    if (typeof window.dispatchEvent === "function") {
      window.dispatchEvent(
        new CustomEvent(name, { detail: detail })
      );
    }
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

      if (raw === null) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("[MemoManager] Read failed:", error);
      return [];
    }
  }

  function writeStorage(items) {
    try {
      if (
        window.AppStorage &&
        typeof window.AppStorage.set === "function"
      ) {
        return window.AppStorage.set(STORAGE_KEY, items) !== false;
      }

      window.localStorage.setItem(
        "my-life-os:v1:" + STORAGE_KEY,
        JSON.stringify(items)
      );

      return true;
    } catch (error) {
      console.error("[MemoManager] Save failed:", error);
      throw new Error(
        "تعذر حفظ المذكرات. تحقق من مساحة التخزين وإعدادات المتصفح."
      );
    }
  }

  function getAll(options) {
    const settings = options || {};
    let items = readStorage();

    if (settings.status) {
      items = items.filter(
        item => item.status === settings.status
      );
    } else if (settings.includeArchived !== true) {
      items = items.filter(
        item => item.status !== "archived"
      );
    }

    if (settings.type) {
      items = items.filter(
        item => item.type === settings.type
      );
    }

    if (settings.tag) {
      const tag = cleanString(settings.tag).toLowerCase();

      items = items.filter(item =>
        item.tags.some(
          value => value.toLowerCase() === tag
        )
      );
    }

    if (settings.search) {
      const query = cleanString(settings.search).toLowerCase();

      items = items.filter(item =>
        (
          item.originalText +
          " " +
          item.title +
          " " +
          item.content +
          " " +
          item.tags.join(" ")
        ).toLowerCase().includes(query)
      );
    }

    items.sort((a, b) => {
      const aPinned = a.pinned ? 1 : 0;
      const bPinned = b.pinned ? 1 : 0;

      if (aPinned !== bPinned) {
        return bPinned - aPinned;
      }

      return (
        new Date(b.updatedAt).getTime() -
        new Date(a.updatedAt).getTime()
      );
    });

    return clone(items);
  }

  function getById(id) {
    const item = readStorage().find(
      memo => memo.id === id
    );

    return item ? clone(item) : null;
  }

  function normalizeTags(tags) {
    if (typeof tags === "string") {
      tags = tags.split(",");
    }

    if (!Array.isArray(tags)) {
      return [];
    }

    const result = [];

    tags.forEach(tag => {
      const value = cleanString(tag);

      if (
        value &&
        !result.some(
          existing =>
            existing.toLowerCase() === value.toLowerCase()
        )
      ) {
        result.push(value);
      }
    });

    return result;
  }

  function validateType(type) {
    return TYPES.includes(type) ? type : "other";
  }

  function validateStatus(status) {
    return STATUSES.includes(status) ? status : "inbox";
  }

  function initialize() {
    const items = readStorage();
    let changed = false;

    const normalized = items
      .filter(isObject)
      .map(item => {
        const originalText =
          typeof item.originalText === "string"
            ? item.originalText
            : (
                typeof item.content === "string"
                  ? item.content
                  : ""
              );

        const result = {
          id: cleanString(item.id) || createId(),
          title: cleanString(item.title),
          originalText: originalText,
          content: typeof item.content === "string"
            ? item.content
            : originalText,
          type: validateType(item.type),
          status: validateStatus(item.status),
          tags: normalizeTags(item.tags),
          pinned: item.pinned === true,
          approvedAt: item.approvedAt || null,
          processedAt: item.processedAt || null,
          conversion: isObject(item.conversion)
            ? item.conversion
            : null,
          linkedItemId: item.linkedItemId || null,
          notes: cleanString(item.notes),
          createdAt: item.createdAt || now(),
          updatedAt: item.updatedAt || now()
        };

        if (
          !item.id ||
          !Array.isArray(item.tags) ||
          typeof item.originalText !== "string"
        ) {
          changed = true;
        }

        return result;
      });

    if (changed) {
      writeStorage(normalized);
    }

    return {
      initialized: true,
      count: normalized.length
    };
  }

  function create(input) {
    if (!isObject(input)) {
      throw new Error("بيانات المذكرة غير صحيحة.");
    }

    const originalText =
      typeof input.originalText === "string"
        ? input.originalText
        : (
            typeof input.content === "string"
              ? input.content
              : ""
          );

    if (!originalText.trim()) {
      throw new Error("اكتب الفكرة أو المعلومة أولاً.");
    }

    const timestamp = now();

    const item = {
      id: createId(),
      title: cleanString(input.title),
      originalText: originalText,
      content: originalText,
      type: validateType(input.type || "idea"),
      status: "inbox",
      tags: normalizeTags(input.tags),
      pinned: input.pinned === true,
      approvedAt: null,
      processedAt: null,
      conversion: null,
      linkedItemId: null,
      notes: "",
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const items = readStorage();
    items.push(item);
    writeStorage(items);

    emit(EVENTS.created, clone(item));
    emit(EVENTS.changed, { action: "created", id: item.id });

    return clone(item);
  }

  function update(id, changes) {
    if (!isObject(changes)) {
      throw new Error("التعديلات غير صحيحة.");
    }

    const items = readStorage();
    const index = items.findIndex(item => item.id === id);

    if (index === -1) {
      throw new Error("المذكرة غير موجودة.");
    }

    const current = items[index];

    if (
      current.status === "processed" &&
      (
        Object.prototype.hasOwnProperty.call(changes, "originalText") ||
        Object.prototype.hasOwnProperty.call(changes, "content")
      )
    ) {
      throw new Error(
        "لا يمكن تعديل نص مذكرة معالجة. أنشئ مذكرة جديدة إذا احتجت إلى ذلك."
      );
    }

    const updated = Object.assign({}, current);

    if (Object.prototype.hasOwnProperty.call(changes, "title")) {
      updated.title = cleanString(changes.title);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "content")) {
      updated.content =
        typeof changes.content === "string"
          ? changes.content
          : current.content;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "originalText")) {
      if (typeof changes.originalText !== "string") {
        throw new Error("النص الأصلي يجب أن يكون نصاً.");
      }

      updated.originalText = changes.originalText;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "type")) {
      if (!TYPES.includes(changes.type)) {
        throw new Error("نوع المذكرة غير صالح.");
      }

      updated.type = changes.type;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "tags")) {
      updated.tags = normalizeTags(changes.tags);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "notes")) {
      updated.notes = cleanString(changes.notes);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "pinned")) {
      updated.pinned = changes.pinned === true;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "status")) {
      const nextStatus = changes.status;

      if (!STATUSES.includes(nextStatus)) {
        throw new Error("حالة المذكرة غير صالحة.");
      }

      if (
        nextStatus === "processed" &&
        current.status !== "processed"
      ) {
        if (!current.approvedAt) {
          throw new Error(
            "يجب اعتماد المذكرة قبل وضع علامة المعالجة عليها."
          );
        }

        updated.processedAt = now();
      }

      if (
        nextStatus === "approved" &&
        current.status !== "approved"
      ) {
        updated.approvedAt = now();
      }

      updated.status = nextStatus;
    }

    updated.updatedAt = now();
    items[index] = updated;

    writeStorage(items);

    emit(EVENTS.updated, clone(updated));
    emit(EVENTS.changed, { action: "updated", id: id });

    return clone(updated);
  }

  function approve(id, review) {
    const current = getById(id);

    if (!current) {
      throw new Error("المذكرة غير موجودة.");
    }

    if (current.status === "processed") {
      throw new Error("هذه المذكرة تمت معالجتها بالفعل.");
    }

    const changes = {
      status: "approved"
    };

    if (isObject(review)) {
      if (typeof review.title === "string") {
        changes.title = review.title;
      }

      if (typeof review.content === "string") {
        changes.content = review.content;
      }

      if (Array.isArray(review.tags)) {
        changes.tags = review.tags;
      }

      if (typeof review.notes === "string") {
        changes.notes = review.notes;
      }
    }

    const updated = update(id, changes);

    emit(EVENTS.processed, {
      id: id,
      action: "approved"
    });

    return updated;
  }

  function beginReview(id) {
    const current = getById(id);

    if (!current) {
      throw new Error("المذكرة غير موجودة.");
    }

    if (
      current.status === "processed" ||
      current.status === "archived"
    ) {
      throw new Error("لا يمكن مراجعة هذه المذكرة في حالتها الحالية.");
    }

    return update(id, { status: "reviewing" });
  }

  function createLinkedItem(target, memo, options) {
    const settings = options || {};
    const text = cleanString(
      settings.title || memo.title || memo.content || memo.originalText
    );

    const description = cleanString(
      settings.description || memo.content || memo.originalText
    );

    if (!text) {
      throw new Error("لا يوجد نص كافٍ لإنشاء العنصر.");
    }

    switch (target) {
      case "goal":
        if (
          !window.GoalsManager ||
          typeof window.GoalsManager.create !== "function"
        ) {
          throw new Error("مدير الأهداف غير متاح حالياً.");
        }

        return window.GoalsManager.create({
          title: text,
          description: description,
          notes: memo.originalText,
          source: {
            type: "memo",
            id: memo.id
          },
          domainId: settings.domainId || undefined,
          category: settings.category || undefined,
          priority: settings.priority || "medium"
        });

      case "task":
        if (
          !window.TasksManager ||
          typeof window.TasksManager.create !== "function"
        ) {
          throw new Error("مدير المهام غير متاح حالياً.");
        }

        return window.TasksManager.create({
          title: text,
          description: description,
          notes: memo.originalText,
          source: {
            type: "memo",
            id: memo.id
          },
          goalId: settings.goalId || undefined,
          domainId: settings.domainId || undefined,
          priority: settings.priority || "medium",
          scheduledDate: settings.scheduledDate || undefined,
          dueDate: settings.dueDate || undefined
        });

      case "habit":
        if (
          !window.HabitsManager ||
          typeof window.HabitsManager.create !== "function"
        ) {
          throw new Error("مدير العادات غير متاح حالياً.");
        }

        return window.HabitsManager.create({
          title: text,
          description: description,
          notes: memo.originalText,
          source: {
            type: "memo",
            id: memo.id
          },
          goalId: settings.goalId || undefined,
          domainId: settings.domainId || undefined,
          frequency: settings.frequency || "daily"
        });

      case "note":
        if (
          !window.NotesManager ||
          typeof window.NotesManager.create !== "function"
        ) {
          throw new Error("مدير الملاحظات غير متاح حالياً.");
        }

        return window.NotesManager.create({
          title: text,
          content: memo.originalText,
          category: settings.category || "general",
          tags: memo.tags,
          source: {
            type: "memo",
            id: memo.id
          },
          domainId: settings.domainId || undefined,
          goalId: settings.goalId || undefined
        });

      default:
        throw new Error("وجهة التحويل غير مدعومة.");
    }
  }

  function convert(id, target, options) {
    if (!CONVERSION_TARGETS.includes(target)) {
      throw new Error("نوع التحويل غير صالح.");
    }

    const memo = getById(id);

    if (!memo) {
      throw new Error("المذكرة غير موجودة.");
    }

    if (memo.status !== "approved") {
      throw new Error(
        "يجب مراجعة المذكرة واعتمادها أولاً قبل تحويلها."
      );
    }

    if (memo.conversion || memo.status === "processed") {
      throw new Error("تم تحويل هذه المذكرة من قبل.");
    }

    /*
      Do not change the memo's status until the target
      manager successfully creates the linked item.
    */
    const created = createLinkedItem(target, memo, options);

    if (!created || !created.id) {
      throw new Error(
        "لم يؤكد المدير إنشاء العنصر. لم يتم تعليم المذكرة كمعالجة."
      );
    }

    const items = readStorage();
    const index = items.findIndex(item => item.id === id);

    if (index === -1) {
      throw new Error(
        "تم إنشاء العنصر، لكن تعذر تحديث المذكرة. راجع العنصر الجديد قبل إعادة التحويل."
      );
    }

    items[index] = Object.assign({}, items[index], {
      status: "processed",
      processedAt: now(),
      linkedItemId: created.id,
      conversion: {
        target: target,
        linkedItemId: created.id,
        convertedAt: now()
      },
      updatedAt: now()
    });

    writeStorage(items);

    emit(EVENTS.converted, {
      memoId: id,
      target: target,
      linkedItemId: created.id
    });

    emit(EVENTS.changed, {
      action: "converted",
      id: id
    });

    return {
      memo: getById(id),
      target: target,
      item: clone(created)
    };
  }

  function archive(id) {
    return update(id, { status: "archived" });
  }

  function restore(id) {
    const memo = getById(id);

    if (!memo) {
      throw new Error("المذكرة غير موجودة.");
    }

    if (memo.status !== "archived") {
      return clone(memo);
    }

    return update(id, {
      status: memo.approvedAt ? "approved" : "inbox"
    });
  }

  function remove(id) {
    const items = readStorage();
    const index = items.findIndex(item => item.id === id);

    if (index === -1) {
      return false;
    }

    const removed = items[index];
    items.splice(index, 1);
    writeStorage(items);

    emit(EVENTS.deleted, {
      id: id,
      originalText: removed.originalText
    });

    emit(EVENTS.changed, {
      action: "deleted",
      id: id
    });

    return true;
  }

  function getTags() {
    const tags = new Map();

    readStorage().forEach(item => {
      item.tags.forEach(tag => {
        const key = tag.toLowerCase();

        if (!tags.has(key)) {
          tags.set(key, tag);
        }
      });
    });

    return Array.from(tags.values()).sort(
      (a, b) => a.localeCompare(b)
    );
  }

  function getSummary() {
    const items = readStorage();

    const summary = {
      total: items.length,
      inbox: 0,
      reviewing: 0,
      approved: 0,
      processed: 0,
      archived: 0,
      pinned: 0,
      byType: {}
    };

    TYPES.forEach(type => {
      summary.byType[type] = 0;
    });

    items.forEach(item => {
      if (STATUSES.includes(item.status)) {
        summary[item.status] += 1;
      }

      if (item.pinned) {
        summary.pinned += 1;
      }

      if (TYPES.includes(item.type)) {
        summary.byType[item.type] += 1;
      }
    });

    return summary;
  }

  function getTypes() {
    return TYPES.slice();
  }

  function getStatuses() {
    return STATUSES.slice();
  }

  function getConversionTargets() {
    return CONVERSION_TARGETS.slice();
  }

  function reset() {
    writeStorage([]);
    emit(EVENTS.changed, { action: "reset" });

    return true;
  }

  window.MemoManager = Object.freeze({
    initialize: initialize,
    create: create,
    getAll: getAll,
    getById: getById,
    update: update,
    beginReview: beginReview,
    approve: approve,
    convert: convert,
    archive: archive,
    restore: restore,
    remove: remove,
    getTags: getTags,
    getSummary: getSummary,
    getTypes: getTypes,
    getStatuses: getStatuses,
    getConversionTargets: getConversionTargets,
    reset: reset,
    EVENTS: Object.freeze(Object.assign({}, EVENTS))
  });

})(window);