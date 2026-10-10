الملف: "learning.js"

استبدل محتوى الملف بالكامل بالكود التالي:

/* =========================================================
   MY LIFE OS — LEARNING MANAGER
   File: learning.js
   Purpose: Manage learning paths, resources, sessions,
            lesson progress, skills, goals and reviews.
   ========================================================= */

(function (window) {
  "use strict";

  const STORAGE_KEY = "learning-records";
  const VERSION = 1;

  const STATUS = Object.freeze({
    PLANNED: "planned",
    IN_PROGRESS: "in-progress",
    COMPLETED: "completed",
    PAUSED: "paused",
    ARCHIVED: "archived"
  });

  const VALID_STATUSES = Object.values(STATUS);

  let initialized = false;
  let records = [];
  let sessions = [];
  let sequence = 0;

  /* ---------------------------------------------------------
     UTILITIES
  --------------------------------------------------------- */

  function makeId(prefix) {
    sequence += 1;

    const randomPart =
      Math.random().toString(36).slice(2, 10);

    return [
      prefix,
      Date.now().toString(36),
      sequence.toString(36),
      randomPart
    ].join("-");
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function cleanText(value, maxLength) {
    if (typeof value !== "string") {
      return "";
    }

    return value.trim().slice(0, maxLength || 500);
  }

  function cleanStringArray(value, maxItems, maxLength) {
    if (!Array.isArray(value)) {
      return [];
    }

    return Array.from(
      new Set(
        value
          .filter(function (item) {
            return typeof item === "string";
          })
          .map(function (item) {
            return cleanText(item, maxLength || 100);
          })
          .filter(Boolean)
      )
    ).slice(0, maxItems || 100);
  }

  function normalizeDate(value) {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date.toISOString();
  }

  function normalizeNumber(value, min, max) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return min;
    }

    return Math.min(max, Math.max(min, number));
  }

  function requireId(id) {
    const normalized = cleanText(id, 150);

    if (!normalized) {
      throw new Error("معرّف سجل التعلم مطلوب.");
    }

    return normalized;
  }

  function requireTitle(title) {
    const normalized = cleanText(title, 200);

    if (!normalized) {
      throw new Error("عنوان مسار التعلم مطلوب.");
    }

    return normalized;
  }

  function findRecord(id) {
    const normalized = requireId(id);

    return records.find(function (record) {
      return record.id === normalized;
    }) || null;
  }

  function ensureInitialized() {
    if (!initialized) {
      initialize();
    }
  }

  /* ---------------------------------------------------------
     STORAGE ADAPTER
     Supports common AppStorage method shapes.
     The exact project storage API will be verified later.
  --------------------------------------------------------- */

  function readStorage(key, fallback) {
    const storage = window.AppStorage;

    if (storage) {
      try {
        if (typeof storage.get === "function") {
          const value = storage.get(key);

          if (value !== undefined && value !== null) {
            return value;
          }
        }

        if (typeof storage.getItem === "function") {
          const value = storage.getItem(key);

          if (value !== undefined && value !== null) {
            return typeof value === "string"
              ? JSON.parse(value)
              : value;
          }
        }

        if (typeof storage.load === "function") {
          const value = storage.load(key);

          if (value !== undefined && value !== null) {
            return value;
          }
        }
      } catch (error) {
        console.error(
          "[LearningManager] Storage read failed:",
          error
        );
      }
    }

    try {
      const value = window.localStorage.getItem(key);

      return value === null
        ? fallback
        : JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    const storage = window.AppStorage;
    const payload = clone(value);

    if (storage) {
      try {
        if (typeof storage.set === "function") {
          storage.set(key, payload);
          return true;
        }

        if (typeof storage.setItem === "function") {
          storage.setItem(key, JSON.stringify(payload));
          return true;
        }

        if (typeof storage.save === "function") {
          storage.save(key, payload);
          return true;
        }
      } catch (error) {
        console.error(
          "[LearningManager] Storage write failed:",
          error
        );
      }
    }

    try {
      window.localStorage.setItem(
        key,
        JSON.stringify(payload)
      );

      return true;
    } catch (error) {
      console.error(
        "[LearningManager] Local storage write failed:",
        error
      );

      return false;
    }
  }

  function persist() {
    const savedRecords = writeStorage(
      STORAGE_KEY,
      {
        version: VERSION,
        records: records
      }
    );

    const savedSessions = writeStorage(
      STORAGE_KEY + "-sessions",
      {
        version: VERSION,
        sessions: sessions
      }
    );

    return savedRecords && savedSessions;
  }

  /* ---------------------------------------------------------
     EVENTS
  --------------------------------------------------------- */

  function emit(eventName, detail) {
    const payload = {
      module: "learning",
      event: eventName,
      timestamp: nowISO(),
      detail: detail || {}
    };

    const events = window.AppEvents;

    if (events) {
      try {
        if (typeof events.emit === "function") {
          events.emit("learning:" + eventName, payload);
        } else if (typeof events.publish === "function") {
          events.publish("learning:" + eventName, payload);
        } else if (typeof events.dispatch === "function") {
          events.dispatch("learning:" + eventName, payload);
        }
      } catch (error) {
        console.error(
          "[LearningManager] Event dispatch failed:",
          error
        );
      }
    }

    try {
      window.dispatchEvent(
        new CustomEvent("lifeos:learning:" + eventName, {
          detail: payload
        })
      );
    } catch (error) {
      // Event notifications are optional.
    }
  }

  function saveOrThrow() {
    if (!persist()) {
      throw new Error(
        "تعذر حفظ بيانات التعلم. تحقق من مساحة التخزين."
      );
    }
  }

  /* ---------------------------------------------------------
     RECORD NORMALIZATION
  --------------------------------------------------------- */

  function normalizeRecord(input, existing) {
    const source = isObject(input) ? input : {};
    const previous = existing || {};
    const timestamp = nowISO();

    const requestedStatus =
      source.status !== undefined
        ? source.status
        : previous.status;

    const status = VALID_STATUSES.includes(requestedStatus)
      ? requestedStatus
      : STATUS.PLANNED;

    const targetMinutes = normalizeNumber(
      source.targetMinutes !== undefined
        ? source.targetMinutes
        : previous.targetMinutes,
      0,
      10000000
    );

    const progress = normalizeNumber(
      source.progress !== undefined
        ? source.progress
        : previous.progress,
      0,
      100
    );

    const completed =
      status === STATUS.COMPLETED || progress >= 100;

    return {
      id: previous.id || makeId("learn"),

      title: requireTitle(
        source.title !== undefined
          ? source.title
          : previous.title
      ),

      description: cleanText(
        source.description !== undefined
          ? source.description
          : previous.description,
        5000
      ),

      category: cleanText(
        source.category !== undefined
          ? source.category
          : previous.category,
        100
      ),

      subject: cleanText(
        source.subject !== undefined
          ? source.subject
          : previous.subject,
        150
      ),

      skills: cleanStringArray(
        source.skills !== undefined
          ? source.skills
          : previous.skills,
        100,
        100
      ),

      goals: cleanStringArray(
        source.goals !== undefined
          ? source.goals
          : previous.goals,
        100,
        300
      ),

      resources: Array.isArray(
        source.resources !== undefined
          ? source.resources
          : previous.resources
      )
        ? (
            source.resources !== undefined
              ? source.resources
              : previous.resources
          )
            .filter(isObject)
            .slice(0, 200)
            .map(function (resource) {
              return {
                id: cleanText(resource.id, 150) ||
                  makeId("resource"),

                title: cleanText(resource.title, 200),

                type: cleanText(resource.type, 50) ||
                  "other",

                url: cleanText(resource.url, 2000),

                notes: cleanText(resource.notes, 2000),

                completed: resource.completed === true,

                createdAt:
                  normalizeDate(resource.createdAt) ||
                  timestamp
              };
            })
        : [],

      lessons: Array.isArray(
        source.lessons !== undefined
          ? source.lessons
          : previous.lessons
      )
        ? (
            source.lessons !== undefined
              ? source.lessons
              : previous.lessons
          )
            .filter(isObject)
            .slice(0, 1000)
            .map(function (lesson, index) {
              return {
                id: cleanText(lesson.id, 150) ||
                  makeId("lesson"),

                title: cleanText(lesson.title, 200) ||
                  "درس " + (index + 1),

                notes: cleanText(lesson.notes, 5000),

                progress: normalizeNumber(
                  lesson.progress,
                  0,
                  100
                ),

                completed: lesson.completed === true,

                completedAt:
                  normalizeDate(lesson.completedAt),

                updatedAt:
                  normalizeDate(lesson.updatedAt) ||
                  timestamp
              };
            })
        : [],

      progress: completed ? 100 : progress,

      status: completed
        ? STATUS.COMPLETED
        : status,

      targetMinutes: targetMinutes,

      totalMinutes: normalizeNumber(
        previous.totalMinutes,
        0,
        100000000
      ),

      startedAt:
        normalizeDate(source.startedAt) ||
        normalizeDate(previous.startedAt) ||
        (
          status === STATUS.IN_PROGRESS
            ? timestamp
            : null
        ),

      targetDate:
        normalizeDate(source.targetDate) ||
        normalizeDate(previous.targetDate),

      completedAt: completed
        ? (
            normalizeDate(previous.completedAt) ||
            timestamp
          )
        : null,

      lastStudiedAt:
        normalizeDate(previous.lastStudiedAt),

      reviewNotes: Array.isArray(
        source.reviewNotes !== undefined
          ? source.reviewNotes
          : previous.reviewNotes
      )
        ? (
            source.reviewNotes !== undefined
              ? source.reviewNotes
              : previous.reviewNotes
          )
            .filter(isObject)
            .slice(0, 500)
            .map(function (review) {
              return {
                id: cleanText(review.id, 150) ||
                  makeId("review"),

                text: cleanText(review.text, 5000),

                rating: normalizeNumber(
                  review.rating,
                  0,
                  5
                ),

                createdAt:
                  normalizeDate(review.createdAt) ||
                  timestamp
              };
            })
        : [],

      tags: cleanStringArray(
        source.tags !== undefined
          ? source.tags
          : previous.tags,
        100,
        100
      ),

      notes: cleanText(
        source.notes !== undefined
          ? source.notes
          : previous.notes,
        10000
      ),

      createdAt:
        normalizeDate(previous.createdAt) ||
        timestamp,

      updatedAt: timestamp
    };
  }

  /* ---------------------------------------------------------
     INITIALIZATION
  --------------------------------------------------------- */

  function initialize() {
    if (initialized) {
      return getAll();
    }

    const storedRecords = readStorage(
      STORAGE_KEY,
      []
    );

    const storedSessions = readStorage(
      STORAGE_KEY + "-sessions",
      []
    );

    const recordList = Array.isArray(storedRecords)
      ? storedRecords
      : (
          isObject(storedRecords) &&
          Array.isArray(storedRecords.records)
            ? storedRecords.records
            : []
        );

    const sessionList = Array.isArray(storedSessions)
      ? storedSessions
      : (
          isObject(storedSessions) &&
          Array.isArray(storedSessions.sessions)
            ? storedSessions.sessions
            : []
        );

    records = recordList
      .filter(isObject)
      .map(function (record) {
        try {
          return normalizeRecord(record, record);
        } catch (error) {
          console.warn(
            "[LearningManager] Skipped invalid record:",
            error
          );

          return null;
        }
      })
      .filter(Boolean);

    sessions = sessionList
      .filter(isObject)
      .map(function (session) {
        return {
          id: cleanText(session.id, 150) ||
            makeId("session"),

          learningId: cleanText(
            session.learningId,
            150
          ),

          date:
            normalizeDate(session.date) ||
            nowISO(),

          minutes: normalizeNumber(
            session.minutes,
            1,
            1440
          ),

          lessonId: cleanText(session.lessonId, 150),

          notes: cleanText(session.notes, 5000),

          rating: normalizeNumber(
            session.rating,
            0,
            5
          ),

          createdAt:
            normalizeDate(session.createdAt) ||
            nowISO()
        };
      })
      .filter(function (session) {
        return session.learningId;
      });

    initialized = true;

    emit("initialized", {
      recordsCount: records.length,
      sessionsCount: sessions.length
    });

    return getAll();
  }

  /* ---------------------------------------------------------
     CREATE / READ / UPDATE / DELETE
  --------------------------------------------------------- */

  function create(input) {
    ensureInitialized();

    if (!isObject(input)) {
      throw new Error("بيانات مسار التعلم غير صالحة.");
    }

    const record = normalizeRecord(input, null);

    if (
      records.some(function (item) {
        return item.id === record.id;
      })
    ) {
      throw new Error("معرّف مسار التعلم مستخدم مسبقًا.");
    }

    records.unshift(record);

    try {
      saveOrThrow();
    } catch (error) {
      records.shift();
      throw error;
    }

    emit("created", {
      id: record.id,
      title: record.title
    });

    return clone(record);
  }

  function getAll(filters) {
    ensureInitialized();

    const options = isObject(filters) ? filters : {};

    let result = records.slice();

    if (options.status) {
      result = result.filter(function (record) {
        return record.status === options.status;
      });
    }

    if (options.category) {
      const category = cleanText(
        options.category,
        100
      ).toLowerCase();

      result = result.filter(function (record) {
        return record.category.toLowerCase() === category;
      });
    }

    if (options.subject) {
      const subject = cleanText(
        options.subject,
        150
      ).toLowerCase();

      result = result.filter(function (record) {
        return record.subject.toLowerCase() === subject;
      });
    }

    if (options.query) {
      const query = cleanText(
        options.query,
        300
      ).toLowerCase();

      result = result.filter(function (record) {
        const searchable = [
          record.title,
          record.description,
          record.category,
          record.subject,
          record.notes,
          record.skills.join(" "),
          record.tags.join(" ")
        ].join(" ").toLowerCase();

        return searchable.includes(query);
      });
    }

    if (options.tag) {
      const tag = cleanText(options.tag, 100);

      result = result.filter(function (record) {
        return record.tags.includes(tag);
      });
    }

    return clone(result);
  }

  function getById(id) {
    ensureInitialized();

    const record = findRecord(id);

    return record ? clone(record) : null;
  }

  function update(id, changes) {
    ensureInitialized();

    const record = findRecord(id);

    if (!record) {
      throw new Error("مسار التعلم غير موجود.");
    }

    if (!isObject(changes)) {
      throw new Error("التعديلات غير صالحة.");
    }

    const forbidden = [
      "id",
      "createdAt",
      "updatedAt",
      "totalMinutes",
      "completedAt",
      "lastStudiedAt"
    ];

    const safeChanges = {};

    Object.keys(changes).forEach(function (key) {
      if (!forbidden.includes(key)) {
        safeChanges[key] = changes[key];
      }
    });

    const index = records.findIndex(function (item) {
      return item.id === record.id;
    });

    const previous = clone(record);

    const updated = normalizeRecord(
      Object.assign({}, record, safeChanges),
      record
    );

    records[index] = updated;

    try {
      saveOrThrow();
    } catch (error) {
      records[index] = previous;
      throw error;
    }

    emit("updated", {
      id: updated.id
    });

    return clone(updated);
  }

  function remove(id) {
    ensureInitialized();

    const record = findRecord(id);

    if (!record) {
      return false;
    }

    const previousRecords = records.slice();
    const previousSessions = sessions.slice();

    records = records.filter(function (item) {
      return item.id !== record.id;
    });

    sessions = sessions.filter(function (session) {
      return session.learningId !== record.id;
    });

    try {
      saveOrThrow();
    } catch (error) {
      records = previousRecords;
      sessions = previousSessions;
      throw error;
    }

    emit("removed", {
      id: record.id
    });

    return true;
  }

  /* ---------------------------------------------------------
     STATUS AND PROGRESS
  --------------------------------------------------------- */

  function setStatus(id, status) {
    ensureInitialized();

    if (!VALID_STATUSES.includes(status)) {
      throw new Error("حالة التعلم غير صالحة.");
    }

    const record = findRecord(id);

    if (!record) {
      throw new Error("مسار التعلم غير موجود.");
    }

    const changes = {
      status: status
    };

    if (
      status === STATUS.IN_PROGRESS &&
      !record.startedAt
    ) {
      changes.startedAt = nowISO();
    }

    if (status === STATUS.COMPLETED) {
      changes.progress = 100;
    } else if (record.status === STATUS.COMPLETED) {
      changes.progress = Math.min(
        record.progress,
        99
      );
    }

    const updated = update(id, changes);

    emit("status-changed", {
      id: id,
      status: updated.status
    });

    return updated;
  }

  function markProgress(id, progress, lessonId) {
    ensureInitialized();

    const record = findRecord(id);

    if (!record) {
      throw new Error("مسار التعلم غير موجود.");
    }

    const value = normalizeNumber(progress, 0, 100);

    let updated = update(id, {
      progress: value,
      status: value >= 100
        ? STATUS.COMPLETED
        : (
            record.status === STATUS.PLANNED ||
            record.status === STATUS.PAUSED
              ? STATUS.IN_PROGRESS
              : record.status
          )
    });

    if (lessonId) {
      const lesson = updated.lessons.find(function (item) {
        return item.id === lessonId;
      });

      if (!lesson) {
        throw new Error("الدرس غير موجود في هذا المسار.");
      }

      updated = update(id, {
        lessons: updated.lessons.map(function (item) {
          if (item.id !== lessonId) {
            return item;
          }

          return Object.assign({}, item, {
            progress: value,
            completed: value >= 100,
            completedAt: value >= 100
              ? nowISO()
              : null,
            updatedAt: nowISO()
          });
        })
      });
    }

    emit("progress-changed", {
      id: id,
      progress: updated.progress
    });

    return updated;
  }

  function complete(id) {
    return setStatus(id, STATUS.COMPLETED);
  }

  /* ---------------------------------------------------------
     LESSONS
  --------------------------------------------------------- */

  function addLesson(id, lessonInput) {
    ensureInitialized();

    const record = findRecord(id);

    if (!record) {
      throw new Error("مسار التعلم غير موجود.");
    }

    if (!isObject(lessonInput)) {
      throw new Error("بيانات الدرس غير صالحة.");
    }

    const title = cleanText(lessonInput.title, 200);

    if (!title) {
      throw new Error("عنوان الدرس مطلوب.");
    }

    const lesson = {
      id: makeId("lesson"),
      title: title,
      notes: cleanText(lessonInput.notes, 5000),
      progress: 0,
      completed: false,
      completedAt: null,
      updatedAt: nowISO()
    };

    const updated = update(id, {
      lessons: record.lessons.concat([lesson])
    });

    emit("lesson-added", {
      id: id,
      lessonId: lesson.id
    });

    return clone({
      record: updated,
      lesson: lesson
    });
  }

  function updateLesson(id, lessonId, changes) {
    ensureInitialized();

    const record = findRecord(id);

    if (!record) {
      throw new Error("مسار التعلم غير موجود.");
    }

    const lesson = record.lessons.find(function (item) {
      return item.id === lessonId;
    });

    if (!lesson) {
      throw new Error("الدرس غير موجود.");
    }

    if (!isObject(changes)) {
      throw new Error("تعديلات الدرس غير صالحة.");
    }

    const safeLesson = Object.assign({}, lesson);

    if (changes.title !== undefined) {
      safeLesson.title = cleanText(changes.title, 200);

      if (!safeLesson.title) {
        throw new Error("عنوان الدرس مطلوب.");
      }
    }

    if (changes.notes !== undefined) {
      safeLesson.notes = cleanText(changes.notes, 5000);
    }

    if (changes.progress !== undefined) {
      safeLesson.progress = normalizeNumber(
        changes.progress,
        0,
        100
      );
    }

    if (changes.completed !== undefined) {
      safeLesson.completed = changes.completed === true;
    }

    safeLesson.completed =
      safeLesson.completed ||
      safeLesson.progress >= 100;

    safeLesson.progress = safeLesson.completed
      ? 100
      : safeLesson.progress;

    safeLesson.completedAt = safeLesson.completed
      ? (
          normalizeDate(safeLesson.completedAt) ||
          nowISO()
        )
      : null;

    safeLesson.updatedAt = nowISO();

    const lessons = record.lessons.map(function (item) {
      return item.id === lessonId
        ? safeLesson
        : item;
    });

    const updated = update(id, {
      lessons: lessons
    });

    const totalLessons = updated.lessons.length;

    if (totalLessons > 0) {
      const average = updated.lessons.reduce(
        function (sum, item) {
          return sum + item.progress;
        },
        0
      ) / totalLessons;

      markProgress(id, average);
    }

    emit("lesson-updated", {
      id: id,
      lessonId: lessonId
    });

    return getById(id);
  }

  /* ---------------------------------------------------------
     LEARNING RESOURCES
  --------------------------------------------------------- */

  function addResource(id, resourceInput) {
    ensureInitialized();

    const record = findRecord(id);

    if (!record) {
      throw new Error("مسار التعلم غير موجود.");
    }

    if (!isObject(resourceInput)) {
      throw new Error("بيانات المصدر غير صالحة.");
    }

    const title = cleanText(resourceInput.title, 200);

    if (!title) {
      throw new Error("عنوان المصدر مطلوب.");
    }

    const resource = {
      id: makeId("resource"),
      title: title,
      type: cleanText(resourceInput.type, 50) || "other",
      url: cleanText(resourceInput.url, 2000),
      notes: cleanText(resourceInput.notes, 2000),
      completed: false,
      createdAt: nowISO()
    };

    const updated = update(id, {
      resources: record.resources.concat([resource])
    });

    emit("resource-added", {
      id: id,
      resourceId: resource.id
    });

    return clone({
      record: updated,
      resource: resource
    });
  }

  function markResourceCompleted(id, resourceId, completed) {
    ensureInitialized();

    const record = findRecord(id);

    if (!record) {
      throw new Error("مسار التعلم غير موجود.");
    }

    const exists = record.resources.some(function (item) {
      return item.id === resourceId;
    });

    if (!exists) {
      throw new Error("المصدر غير موجود.");
    }

    return update(id, {
      resources: record.resources.map(function (item) {
        if (item.id !== resourceId) {
          return item;
        }

        return Object.assign({}, item, {
          completed: completed !== false
        });
      })
    });
  }

  /* ---------------------------------------------------------
     STUDY SESSIONS
  --------------------------------------------------------- */

  function addSession(id, sessionInput) {
    ensureInitialized();

    const record = findRecord(id);

    if (!record) {
      throw new Error("مسار التعلم غير موجود.");
    }

    const input = isObject(sessionInput)
      ? sessionInput
      : {};

    const minutes = Number(input.minutes);

    if (
      !Number.isFinite(minutes) ||
      minutes <= 0 ||
      minutes > 1440
    ) {
      throw new Error(
        "مدة جلسة التعلم يجب أن تكون بين دقيقة و1440 دقيقة."
      );
    }

    const session = {
      id: makeId("session"),
      learningId: record.id,
      date: normalizeDate(input.date) || nowISO(),
      minutes: Math.round(minutes),
      lessonId: cleanText(input.lessonId, 150),
      notes: cleanText(input.notes, 5000),
      rating: normalizeNumber(input.rating, 0, 5),
      createdAt: nowISO()
    };

    if (
      session.lessonId &&
      !record.lessons.some(function (lesson) {
        return lesson.id === session.lessonId;
      })
    ) {
      throw new Error("الدرس المرتبط بالجلسة غير موجود.");
    }

    const previousSessions = sessions.slice();
    const previousRecord = clone(record);

    sessions.unshift(session);

    const index = records.findIndex(function (item) {
      return item.id === record.id;
    });

    records[index] = Object.assign({}, record, {
      totalMinutes: record.totalMinutes + session.minutes,
      lastStudiedAt: session.date,
      status: record.status === STATUS.PLANNED ||
        record.status === STATUS.PAUSED
          ? STATUS.IN_PROGRESS
          : record.status,
      startedAt: record.startedAt || session.date,
      updatedAt: nowISO()
    });

    try {
      saveOrThrow();
    } catch (error) {
      sessions = previousSessions;
      records[index] = previousRecord;
      throw error;
    }

    emit("session-added", {
      id: record.id,
      sessionId: session.id,
      minutes: session.minutes
    });

    return clone(session);
  }

  function getSessions(id, filters) {
    ensureInitialized();

    const normalizedId = requireId(id);
    const options = isObject(filters) ? filters : {};

    let result = sessions.filter(function (session) {
      return session.learningId === normalizedId;
    });

    if (options.from) {
      const from = normalizeDate(options.from);

      if (from) {
        result = result.filter(function (session) {
          return session.date >= from;
        });
      }
    }

    if (options.to) {
      const to = normalizeDate(options.to);

      if (to) {
        result = result.filter(function (session) {
          return session.date <= to;
        });
      }
    }

    return clone(result);
  }

  function removeSession(sessionId) {
    ensureInitialized();

    const normalizedId = requireId(sessionId);

    const session = sessions.find(function (item) {
      return item.id === normalizedId;
    });

    if (!session) {
      return false;
    }

    const record = findRecord(session.learningId);

    const previousSessions = sessions.slice();
    const previousRecords = records.slice();

    sessions = sessions.filter(function (item) {
      return item.id !== normalizedId;
    });

    if (record) {
      const index = records.findIndex(function (item) {
        return item.id === record.id;
      });

      records[index] = Object.assign({}, record, {
        totalMinutes: Math.max(
          0,
          record.totalMinutes - session.minutes
        ),
        updatedAt: nowISO()
      });
    }

    try {
      saveOrThrow();
    } catch (error) {
      sessions = previousSessions;
      records = previousRecords;
      throw error;
    }

    emit("session-removed", {
      sessionId: normalizedId,
      learningId: session.learningId
    });

    return true;
  }

  /* ---------------------------------------------------------
     REVIEWS
  --------------------------------------------------------- */

  function addReview(id, reviewInput) {
    ensureInitialized();

    const record = findRecord(id);

    if (!record) {
      throw new Error("مسار التعلم غير موجود.");
    }

    if (!isObject(reviewInput)) {
      throw new Error("بيانات المراجعة غير صالحة.");
    }

    const text = cleanText(reviewInput.text, 5000);

    if (!text) {
      throw new Error("اكتب ملاحظة المراجعة أولًا.");
    }

    const review = {
      id: makeId("review"),
      text: text,
      rating: normalizeNumber(reviewInput.rating, 0, 5),
      createdAt: nowISO()
    };

    const updated = update(id, {
      reviewNotes: record.reviewNotes.concat([review])
    });

    emit("review-added", {
      id: id,
      reviewId: review.id
    });

    return clone({
      record: updated,
      review: review
    });
  }

  /* ---------------------------------------------------------
     SUMMARY AND ANALYTICS
  --------------------------------------------------------- */

  function getSummary() {
    ensureInitialized();

    const summary = {
      totalPaths: records.length,
      planned: 0,
      inProgress: 0,
      completed: 0,
      paused: 0,
      archived: 0,
      totalMinutes: 0,
      totalHours: 0,
      totalSessions: sessions.length,
      totalLessons: 0,
      completedLessons: 0,
      totalResources: 0,
      completedResources: 0,
      averageProgress: 0,
      activePaths: 0
    };

    let progressSum = 0;

    records.forEach(function (record) {
      if (Object.prototype.hasOwnProperty.call(
        summary,
        record.status
      )) {
        summary[record.status] += 1;
      }

      summary.totalMinutes += record.totalMinutes;
      summary.totalLessons += record.lessons.length;
      summary.totalResources += record.resources.length;

      summary.completedLessons += record.lessons.filter(
        function (lesson) {
          return lesson.completed;
        }
      ).length;

      summary.completedResources += record.resources.filter(
        function (resource) {
          return resource.completed;
        }
      ).length;

      progressSum += record.progress;

      if (record.status === STATUS.IN_PROGRESS) {
        summary.activePaths += 1;
      }
    });

    summary.totalHours = Math.round(
      summary.totalMinutes / 60 * 100
    ) / 100;

    summary.averageProgress = records.length
      ? Math.round(progressSum / records.length)
      : 0;

    return clone(summary);
  }

  function getRecentSessions(limit) {
    ensureInitialized();

    const count = normalizeNumber(
      limit === undefined ? 10 : limit,
      1,
      100
    );

    return clone(
      sessions
        .slice()
        .sort(function (a, b) {
          return b.date.localeCompare(a.date);
        })
        .slice(0, count)
        .map(function (session) {
          const record = findRecord(session.learningId);

          return Object.assign({}, session, {
            learningTitle: record
              ? record.title
              : "مسار محذوف"
          });
        })
    );
  }

  /* ---------------------------------------------------------
     EXPORT / RESET
  --------------------------------------------------------- */

  function exportData() {
    ensureInitialized();

    return {
      version: VERSION,
      exportedAt: nowISO(),
      records: clone(records),
      sessions: clone(sessions)
    };
  }

  function importData(data, options) {
    ensureInitialized();

    if (
      !isObject(data) ||
      !Array.isArray(data.records) ||
      !Array.isArray(data.sessions)
    ) {
      throw new Error("ملف بيانات التعلم غير صالح.");
    }

    const settings = isObject(options) ? options : {};
    const replace = settings.replace === true;

    const importedRecords = data.records.map(function (item) {
      if (!isObject(item)) {
        throw new Error("يحتوي الملف على سجل غير صالح.");
      }

      return normalizeRecord(item, item);
    });

    const importedSessions = data.sessions.map(function (item) {
      if (!isObject(item)) {
        throw new Error("تحتوي البيانات على جلسة غير صالحة.");
      }

      return {
        id: cleanText(item.id, 150) || makeId("session"),
        learningId: requireId(item.learningId),
        date: normalizeDate(item.date) || nowISO(),
        minutes: normalizeNumber(item.minutes, 1, 1440),
        lessonId: cleanText(item.lessonId, 150),
        notes: cleanText(item.notes, 5000),
        rating: normalizeNumber(item.rating, 0, 5),
        createdAt: normalizeDate(item.createdAt) || nowISO()
      };
    });

    const nextRecords = replace
      ? importedRecords
      : records.concat(importedRecords);

    const nextSessions = replace
      ? importedSessions
      : sessions.concat(importedSessions);

    const ids = new Set();

    nextRecords.forEach(function (record) {
      if (ids.has(record.id)) {
        throw new Error(
          "توجد معرّفات مكررة في مسارات التعلم."
        );
      }

      ids.add(record.id);
    });

    nextSessions.forEach(function (session) {
      if (!ids.has(session.learningId)) {
        throw new Error(
          "توجد جلسة مرتبطة بمسار غير موجود."
        );
      }
    });

    const oldRecords = records;
    const oldSessions = sessions;

    records = nextRecords;
    sessions = nextSessions;

    try {
      saveOrThrow();
    } catch (error) {
      records = oldRecords;
      sessions = oldSessions;
      throw error;
    }

    emit("imported", {
      recordsCount: importedRecords.length,
      sessionsCount: importedSessions.length
    });

    return getSummary();
  }

  function reset() {
    ensureInitialized();

    const oldRecords = records;
    const oldSessions = sessions;

    records = [];
    sessions = [];

    try {
      saveOrThrow();
    } catch (error) {
      records = oldRecords;
      sessions = oldSessions;
      throw error;
    }

    emit("reset", {});

    return true;
  }

  /* ---------------------------------------------------------
     PUBLIC API
  --------------------------------------------------------- */

  const LearningManager = {
    version: VERSION,

    STATUS: STATUS,

    initialize: initialize,

    create: create,
    getAll: getAll,
    getById: getById,
    update: update,
    remove: remove,

    setStatus: setStatus,
    markProgress: markProgress,
    complete: complete,

    addLesson: addLesson,
    updateLesson: updateLesson,

    addResource: addResource,
    markResourceCompleted: markResourceCompleted,

    addSession: addSession,
    getSessions: getSessions,
    removeSession: removeSession,

    addReview: addReview,

    getSummary: getSummary,
    getRecentSessions: getRecentSessions,

    exportData: exportData,
    importData: importData,
    reset: reset
  };

  window.LearningManager = LearningManager;

})(window);

ما الذي يوفره الملف؟

- إنشاء مسارات تعلم وتعديلها والبحث فيها وتصنيفها.
- تنظيم الدروس والمصادر والمهارات والأهداف.
- تسجيل جلسات الدراسة وحساب الدقائق والساعات.
- متابعة التقدم والحالات الخمس: مخطط، جارٍ، مكتمل، متوقف مؤقتًا، مؤرشف.
- إضافة مراجعات وملاحظات وملخصات إحصائية.
- تصدير البيانات واستيرادها وإعادة ضبط بيانات وحدة التعلم.

ملاحظة تقنية: هذا الملف لم يُختبر تكامليًا بعد. سنراجع لاحقًا توافق واجهة التخزين والأحداث مع الملفات الفعلية في المشروع، ونتحقق من سلوك الحفظ والتحديث قبل اعتبار الوحدة جاهزة.

بعد استبدال "learning.js" وحفظه، اكتب تم لننتقل إلى الملف التالي: "finance.js".