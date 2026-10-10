
/* ========================================
   MY LIFE OS — Notes & Journal
   الملاحظات والمذكرات والمراجعات
======================================== */

"use strict";

const NotesManager = (() => {
  const STORAGE_KEY = "notes";

  const TYPES = [
    "daily",
    "weekly",
    "monthly",
    "quick",
    "reflection"
  ];

  function getAll() {
    const notes = AppStorage.get(STORAGE_KEY, []);
    return Array.isArray(notes) ? notes : [];
  }

  function getById(id) {
    return getAll().find(note => note.id === id) || null;
  }

  function create(data = {}) {
    const title =
      typeof data.title === "string"
        ? data.title.trim()
        : "";

    const content =
      typeof data.content === "string"
        ? data.content.trim()
        : "";

    if (!title && !content) {
      return {
        success: false,
        message: "أضف عنوانًا أو اكتب محتوى الملاحظة."
      };
    }

    const note = {
      id: AppUtils.createId(),
      title,
      content,
      type: TYPES.includes(data.type) ? data.type : "quick",
      date:
        typeof data.date === "string"
          ? data.date
          : AppUtils.getToday(),
      goalId:
        typeof data.goalId === "string"
          ? data.goalId
          : null,
      taskId:
        typeof data.taskId === "string"
          ? data.taskId
          : null,
      reflection: {
        achievements:
          typeof data.achievements === "string"
            ? data.achievements
            : "",
        obstacles:
          typeof data.obstacles === "string"
            ? data.obstacles
            : "",
        lessons:
          typeof data.lessons === "string"
            ? data.lessons
            : "",
        nextStep:
          typeof data.nextStep === "string"
            ? data.nextStep
            : ""
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = AppStorage.set(
      STORAGE_KEY,
      [...getAll(), note]
    );

    return result.success
      ? { success: true, note }
      : result;
  }

  function update(id, changes = {}) {
    const notes = getAll();
    const index = notes.findIndex(note => note.id === id);

    if (index === -1) {
      return {
        success: false,
        message: "لم يتم العثور على الملاحظة."
      };
    }

    const note = { ...notes[index] };

    if (typeof changes.title === "string") {
      note.title = changes.title.trim();
    }

    if (typeof changes.content === "string") {
      note.content = changes.content;
    }

    if (TYPES.includes(changes.type)) {
      note.type = changes.type;
    }

    if (typeof changes.date === "string") {
      note.date = changes.date;
    }

    if (
      changes.goalId === null ||
      typeof changes.goalId === "string"
    ) {
      note.goalId = changes.goalId;
    }

    if (
      changes.taskId === null ||
      typeof changes.taskId === "string"
    ) {
      note.taskId = changes.taskId;
    }

    if (
      changes.reflection &&
      typeof changes.reflection === "object"
    ) {
      note.reflection = {
        ...note.reflection,
        ...changes.reflection
      };
    }

    note.updatedAt = new Date().toISOString();
    notes[index] = note;

    const result = AppStorage.set(STORAGE_KEY, notes);

    return result.success
      ? { success: true, note }
      : result;
  }

  function remove(id) {
    const notes = getAll();

    if (!notes.some(note => note.id === id)) {
      return {
        success: false,
        message: "لم يتم العثور على الملاحظة."
      };
    }

    const result = AppStorage.set(
      STORAGE_KEY,
      notes.filter(note => note.id !== id)
    );

    return result.success
      ? { success: true }
      : result;
  }

  function getByDate(date) {
    return getAll().filter(note => note.date === date);
  }

  function getByType(type) {
    return getAll().filter(note => note.type === type);
  }

  return Object.freeze({
    getAll,
    getById,
    create,
    update,
    remove,
    getByDate,
    getByType
  });
})();
