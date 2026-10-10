/* =========================================================
MY LIFE OS — CAREER MANAGER
File: Career.js
Version: 1.0.0

إدارة المسار المهني:

- الأهداف المهنية.
- المهارات والشهادات.
- الخبرات والمشاريع.
- طلبات التوظيف.
- جهات العمل المستهدفة.
- المقابلات والمواعيد النهائية.
- الإنجازات المهنية.
- الإحصاءات والتصدير.
  ========================================================= */

(function (global) {
"use strict";

if (global.CareerManager) {
return;
}

const VERSION = "1.0.0";
const STORAGE_KEY = "my_life_os_career_v1";

const APPLICATION_STATUSES = [
"interested",
"preparing",
"applied",
"interview",
"offer",
"rejected",
"withdrawn",
"accepted"
];

const SKILL_LEVELS = [
"beginner",
"basic",
"intermediate",
"advanced",
"expert"
];

const PRIORITIES = [
"low",
"medium",
"high",
"urgent"
];

const ALLOWED_COLLECTIONS = [
"goals",
"skills",
"certificates",
"experiences",
"projects",
"applications",
"achievements"
];

/* =======================================================
UTILITIES
======================================================= */

function createId(prefix) {
return (
prefix +
"" +
Date.now().toString(36) +
"" +
Math.random().toString(36).slice(2, 10)
);
}

function nowISO() {
return new Date().toISOString();
}

function cleanText(value, maxLength) {
return String(value == null ? "" : value)
.trim()
.slice(0, maxLength || 500);
}

function isPlainObject(value) {
if (
value === null ||
typeof value !== "object" ||
Array.isArray(value)
) {
return false;
}

const prototype = Object.getPrototypeOf(value);

return (
  prototype === Object.prototype ||
  prototype === null
);

}

function clone(value) {
return JSON.parse(JSON.stringify(value));
}

function assertValidDate(value, fieldName) {
if (value === "" || value == null) {
return;
}

if (
  typeof value !== "string" ||
  Number.isNaN(Date.parse(value))
) {
  throw new Error(
    "التاريخ غير صالح في الحقل: " + fieldName
  );
}

}

function normalizeDate(value) {
if (!value) {
return "";
}

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
  return "";
}

return date.toISOString();

}

function emit(eventName, details) {
const payload = {
module: "career",
event: eventName,
details: details || null,
timestamp: nowISO()
};

try {
  if (
    global.AppEvents &&
    typeof global.AppEvents.emit === "function"
  ) {
    global.AppEvents.emit(
      "career:" + eventName,
      payload
    );
  }
} catch (error) {
  // لا نوقف عمليات المسار المهني بسبب نظام الأحداث.
}

try {
  if (
    typeof global.dispatchEvent === "function" &&
    typeof global.CustomEvent === "function"
  ) {
    global.dispatchEvent(
      new CustomEvent("my-life-os:career", {
        detail: payload
      })
    );
  }
} catch (error) {
  // دعم البيئات التي لا توفر CustomEvent.
}

}

function validateCollectionName(name) {
if (ALLOWED_COLLECTIONS.indexOf(name) === -1) {
throw new Error(
"مجموعة مهنية غير معروفة: " + name
);
}
}

function validateStatus(status) {
if (
status != null &&
status !== "" &&
APPLICATION_STATUSES.indexOf(status) === -1
) {
throw new Error("حالة طلب التوظيف غير صالحة.");
}
}

function validateSkillLevel(level) {
if (
level != null &&
level !== "" &&
SKILL_LEVELS.indexOf(level) === -1
) {
throw new Error("مستوى المهارة غير صالح.");
}
}

function validatePriority(priority) {
if (
priority != null &&
priority !== "" &&
PRIORITIES.indexOf(priority) === -1
) {
throw new Error("الأولوية المحددة غير صالحة.");
}
}

/* =======================================================
DEFAULT DATA
======================================================= */

function createEmptyData() {
return {
schemaVersion: 1,
createdAt: nowISO(),
updatedAt: nowISO(),

  profile: {
    desiredTitle: "",
    summary: "",
    preferredIndustry: "",
    preferredLocation: "",
    portfolioUrl: "",
    linkedInUrl: "",
    targetSalary: null,
    currency: ""
  },

  goals: [],
  skills: [],
  certificates: [],
  experiences: [],
  projects: [],
  applications: [],
  achievements: []
};

}

/* =======================================================
STORAGE
======================================================= */

function readStoredData() {
let raw;

try {
  if (global.AppStorage) {
    const storage = global.AppStorage;

    /*
      لا نفترض أسماء واجهات غير موثقة.
      نستخدم الواجهة المعروفة عند توفرها،
      ثم localStorage كمصدر بديل.
    */

    if (typeof storage.get === "function") {
      raw = storage.get(STORAGE_KEY);
    } else if (global.localStorage) {
      raw = global.localStorage.getItem(STORAGE_KEY);
    } else {
      raw = null;
    }
  } else if (global.localStorage) {
    raw = global.localStorage.getItem(STORAGE_KEY);
  } else {
    raw = null;
  }
} catch (error) {
  raw = null;
}

if (raw && typeof raw.then === "function") {
  throw new Error(
    "التخزين غير متزامن؛ يلزم مواءمة CareerManager معه."
  );
}

if (raw == null || raw === "") {
  return createEmptyData();
}

if (typeof raw === "string") {
  try {
    raw = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      "تعذر قراءة بيانات المسار المهني المحفوظة."
    );
  }
}

if (!isPlainObject(raw)) {
  throw new Error(
    "بيانات المسار المهني المحفوظة غير صالحة."
  );
}

const defaults = createEmptyData();

const result = Object.assign({}, defaults, raw);

ALLOWED_COLLECTIONS.forEach(function (name) {
  if (!Array.isArray(result[name])) {
    result[name] = [];
  }
});

result.profile = Object.assign(
  {},
  defaults.profile,
  isPlainObject(result.profile)
    ? result.profile
    : {}
);

return result;

}

let data = readStoredData();

function persist() {
data.updatedAt = nowISO();

const serialized = JSON.stringify(data);

try {
  if (
    global.AppStorage &&
    typeof global.AppStorage.set === "function"
  ) {
    const result = global.AppStorage.set(
      STORAGE_KEY,
      serialized
    );

    if (result && typeof result.then === "function") {
      throw new Error(
        "التخزين غير المتزامن غير مدعوم في هذه النسخة."
      );
    }
  } else if (global.localStorage) {
    global.localStorage.setItem(
      STORAGE_KEY,
      serialized
    );
  } else {
    throw new Error("لا توجد وسيلة تخزين متاحة.");
  }
} catch (error) {
  throw new Error(
    "تعذر حفظ بيانات المسار المهني: " +
    error.message
  );
}

emit("updated", {
  updatedAt: data.updatedAt
});

return true;

}

/* =======================================================
COLLECTION HELPERS
======================================================= */

function getCollection(name) {
validateCollectionName(name);

return clone(data[name]);

}

function findItem(name, id) {
validateCollectionName(name);

return data[name].find(function (item) {
  return item.id === id;
}) || null;

}

function addItem(name, input) {
validateCollectionName(name);

if (!isPlainObject(input)) {
  throw new Error("يجب تقديم بيانات صالحة.");
}

const item = Object.assign({}, input);

delete item.id;
delete item.createdAt;
delete item.updatedAt;

if (name === "applications") {
  validateStatus(item.status || "interested");

  item.status = item.status || "interested";
  item.company = cleanText(item.company, 200);
  item.position = cleanText(item.position, 200);
  item.location = cleanText(item.location, 200);
  item.url = cleanText(item.url, 1000);
  item.notes = cleanText(item.notes, 5000);

  assertValidDate(item.appliedAt, "appliedAt");
  assertValidDate(item.deadline, "deadline");
  assertValidDate(item.interviewAt, "interviewAt");

  item.appliedAt = normalizeDate(item.appliedAt);
  item.deadline = normalizeDate(item.deadline);
  item.interviewAt = normalizeDate(item.interviewAt);
}

if (name === "skills") {
  validateSkillLevel(item.level || "beginner");

  item.name = cleanText(item.name, 200);
  item.level = item.level || "beginner";
  item.category = cleanText(item.category, 100);
  item.notes = cleanText(item.notes, 2000);
}

if (name === "goals") {
  validatePriority(item.priority || "medium");

  item.title = cleanText(item.title, 300);
  item.description = cleanText(item.description, 3000);
  item.status = item.status || "active";
  item.priority = item.priority || "medium";
  item.progress = Number(item.progress || 0);

  if (
    !Number.isFinite(item.progress) ||
    item.progress < 0 ||
    item.progress > 100
  ) {
    throw new Error(
      "نسبة إنجاز الهدف يجب أن تكون بين 0 و100."
    );
  }

  assertValidDate(item.deadline, "deadline");
  item.deadline = normalizeDate(item.deadline);
}

if (name === "certificates") {
  item.name = cleanText(item.name, 300);
  item.issuer = cleanText(item.issuer, 200);
  item.credentialId = cleanText(item.credentialId, 200);
  item.credentialUrl = cleanText(item.credentialUrl, 1000);

  assertValidDate(item.issuedAt, "issuedAt");
  assertValidDate(item.expiresAt, "expiresAt");

  item.issuedAt = normalizeDate(item.issuedAt);
  item.expiresAt = normalizeDate(item.expiresAt);
}

if (name === "experiences") {
  item.organization = cleanText(item.organization, 250);
  item.position = cleanText(item.position, 250);
  item.description = cleanText(item.description, 5000);
  item.location = cleanText(item.location, 200);

  assertValidDate(item.startDate, "startDate");
  assertValidDate(item.endDate, "endDate");

  item.startDate = normalizeDate(item.startDate);
  item.endDate = normalizeDate(item.endDate);
}

if (name === "projects") {
  item.title = cleanText(item.title, 300);
  item.description = cleanText(item.description, 5000);
  item.url = cleanText(item.url, 1000);
  item.status = item.status || "planned";
}

if (name === "achievements") {
  item.title = cleanText(item.title, 300);
  item.description = cleanText(item.description, 3000);
  item.category = cleanText(item.category, 100);
  assertValidDate(item.date, "date");
  item.date = normalizeDate(item.date);
}

const created = Object.assign({}, item, {
  id: createId(name),
  createdAt: nowISO(),
  updatedAt: nowISO()
});

data[name].push(created);

try {
  persist();
} catch (error) {
  data[name] = data[name].filter(function (entry) {
    return entry.id !== created.id;
  });

  throw error;
}

emit("item-added", {
  collection: name,
  id: created.id
});

return clone(created);

}

function updateItem(name, id, changes) {
validateCollectionName(name);

if (!isPlainObject(changes)) {
  throw new Error("التعديلات المقدمة غير صالحة.");
}

const index = data[name].findIndex(function (item) {
  return item.id === id;
});

if (index === -1) {
  throw new Error("لم يتم العثور على العنصر المطلوب.");
}

const original = data[name][index];

const protectedChanges = Object.assign({}, changes);

delete protectedChanges.id;
delete protectedChanges.createdAt;
delete protectedChanges.updatedAt;

const candidate = Object.assign(
  {},
  original,
  protectedChanges,
  { updatedAt: nowISO() }
);

if (name === "applications") {
  validateStatus(candidate.status);
  assertValidDate(candidate.appliedAt, "appliedAt");
  assertValidDate(candidate.deadline, "deadline");
  assertValidDate(candidate.interviewAt, "interviewAt");
}

if (name === "skills") {
  validateSkillLevel(candidate.level);
}

if (name === "goals") {
  validatePriority(candidate.priority);

  const progress = Number(candidate.progress);

  if (
    !Number.isFinite(progress) ||
    progress < 0 ||
    progress > 100
  ) {
    throw new Error(
      "نسبة إنجاز الهدف يجب أن تكون بين 0 و100."
    );
  }

  candidate.progress = progress;
  assertValidDate(candidate.deadline, "deadline");
}

data[name][index] = candidate;

try {
  persist();
} catch (error) {
  data[name][index] = original;
  throw error;
}

emit("item-updated", {
  collection: name,
  id: id
});

return clone(candidate);

}

function deleteItem(name, id) {
validateCollectionName(name);

const index = data[name].findIndex(function (item) {
  return item.id === id;
});

if (index === -1) {
  return false;
}

const removed = data[name][index];

data[name].splice(index, 1);

try {
  persist();
} catch (error) {
  data[name].splice(index, 0, removed);
  throw error;
}

emit("item-deleted", {
  collection: name,
  id: id
});

return true;

}

/* =======================================================
PROFILE
======================================================= */

function getProfile() {
return clone(data.profile);
}

function updateProfile(changes) {
if (!isPlainObject(changes)) {
throw new Error("بيانات الملف المهني غير صالحة.");
}

const previous = data.profile;

const allowedFields = [
  "desiredTitle",
  "summary",
  "preferredIndustry",
  "preferredLocation",
  "portfolioUrl",
  "linkedInUrl",
  "targetSalary",
  "currency"
];

const next = Object.assign({}, previous);

allowedFields.forEach(function (field) {
  if (Object.prototype.hasOwnProperty.call(changes, field)) {
    next[field] = changes[field];
  }
});

[
  "desiredTitle",
  "summary",
  "preferredIndustry",
  "preferredLocation",
  "portfolioUrl",
  "linkedInUrl",
  "currency"
].forEach(function (field) {
  next[field] = cleanText(
    next[field],
    field === "summary" ? 5000 : 1000
  );
});

if (next.targetSalary !== null &&
    next.targetSalary !== "") {
  next.targetSalary = Number(next.targetSalary);

  if (
    !Number.isFinite(next.targetSalary) ||
    next.targetSalary < 0
  ) {
    throw new Error(
      "الراتب المستهدف يجب أن يكون رقمًا موجبًا."
    );
  }
} else {
  next.targetSalary = null;
}

data.profile = next;

try {
  persist();
} catch (error) {
  data.profile = previous;
  throw error;
}

emit("profile-updated");

return getProfile();

}

/* =======================================================
APPLICATION WORKFLOW
======================================================= */

function updateApplicationStatus(id, status, notes) {
validateStatus(status);

const changes = {
  status: status
};

if (notes !== undefined) {
  changes.notes = cleanText(notes, 5000);
}

if (status === "interview") {
  changes.interviewStatus = "scheduled";
}

if (status === "accepted") {
  changes.outcome = "accepted";
}

if (status === "rejected") {
  changes.outcome = "rejected";
}

return updateItem("applications", id, changes);

}

function getApplicationsByStatus(status) {
validateStatus(status);

return getCollection("applications").filter(function (item) {
  return item.status === status;
});

}

function getUpcomingDeadlines(daysAhead) {
const days = Number.isFinite(Number(daysAhead))
? Math.max(0, Number(daysAhead))
: 30;

const now = Date.now();
const end = now + days * 24 * 60 * 60 * 1000;

return getCollection("applications")
  .filter(function (item) {
    if (!item.deadline) {
      return false;
    }

    const time = Date.parse(item.deadline);

    return (
      Number.isFinite(time) &&
      time >= now &&
      time <= end &&
      item.status !== "accepted" &&
      item.status !== "rejected" &&
      item.status !== "withdrawn"
    );
  })
  .sort(function (a, b) {
    return Date.parse(a.deadline) -
      Date.parse(b.deadline);
  });

}

/* =======================================================
GOAL WORKFLOW
======================================================= */

function setGoalProgress(id, progress) {
return updateItem("goals", id, {
progress: Number(progress)
});
}

function completeGoal(id) {
return updateItem("goals", id, {
status: "completed",
progress: 100,
completedAt: nowISO()
});
}

/* =======================================================
SEARCH
======================================================= */

function search(query) {
const term = cleanText(query, 300).toLocaleLowerCase();

if (!term) {
  return [];
}

const results = [];

ALLOWED_COLLECTIONS.forEach(function (name) {
  data[name].forEach(function (item) {
    const content = JSON.stringify(item)
      .toLocaleLowerCase();

    if (content.indexOf(term) !== -1) {
      results.push({
        collection: name,
        item: clone(item)
      });
    }
  });
});

return results;

}

/* =======================================================
ANALYTICS
======================================================= */

function getStatistics() {
const applications = data.applications;
const goals = data.goals;

const applicationCounts = {};

APPLICATION_STATUSES.forEach(function (status) {
  applicationCounts[status] = 0;
});

applications.forEach(function (application) {
  if (applicationCounts[application.status] !== undefined) {
    applicationCounts[application.status] += 1;
  }
});

const completedGoals = goals.filter(function (goal) {
  return goal.status === "completed" ||
    Number(goal.progress) >= 100;
}).length;

const averageGoalProgress = goals.length
  ? Math.round(
      goals.reduce(function (total, goal) {
        return total + (Number(goal.progress) || 0);
      }, 0) / goals.length
    )
  : 0;

return {
  goals: {
    total: goals.length,
    completed: completedGoals,
    active: goals.filter(function (goal) {
      return goal.status === "active";
    }).length,
    averageProgress: averageGoalProgress
  },

  skills: {
    total: data.skills.length
  },

  certificates: {
    total: data.certificates.length
  },

  experiences: {
    total: data.experiences.length
  },

  projects: {
    total: data.projects.length
  },

  applications: {
    total: applications.length,
    byStatus: applicationCounts
  },

  achievements: {
    total: data.achievements.length
  },

  updatedAt: data.updatedAt
};

}

/* =======================================================
EXPORT / IMPORT
======================================================= */

function exportData() {
return {
format: "MY_LIFE_OS_CAREER_DATA",
version: VERSION,
exportedAt: nowISO(),
data: clone(data)
};
}

function importData(payload, settings) {
const config = settings || {};

if (config.confirmed !== true) {
  throw new Error(
    "يجب تأكيد استيراد البيانات قبل استبدال السجل المهني."
  );
}

if (!isPlainObject(payload)) {
  throw new Error("ملف الاستيراد غير صالح.");
}

if (payload.format !== "MY_LIFE_OS_CAREER_DATA") {
  throw new Error("صيغة بيانات المسار المهني غير معروفة.");
}

if (!isPlainObject(payload.data)) {
  throw new Error("بيانات الاستيراد غير صالحة.");
}

const incoming = payload.data;

const next = createEmptyData();

if (isPlainObject(incoming.profile)) {
  next.profile = Object.assign(
    {},
    next.profile,
    incoming.profile
  );
}

ALLOWED_COLLECTIONS.forEach(function (name) {
  if (incoming[name] !== undefined) {
    if (!Array.isArray(incoming[name])) {
      throw new Error(
        "مجموعة البيانات غير صالحة: " + name
      );
    }

    next[name] = clone(incoming[name]);
  }
});

const previous = data;

data = next;

try {
  persist();
} catch (error) {
  data = previous;
  throw error;
}

emit("data-imported");

return {
  success: true,
  importedAt: nowISO(),
  statistics: getStatistics()
};

}

/* =======================================================
RESET
======================================================= */

function clearAll(settings) {
const config = settings || {};

if (config.confirmed !== true) {
  throw new Error(
    "يجب تأكيد حذف جميع بيانات المسار المهني."
  );
}

const previous = data;

data = createEmptyData();

try {
  persist();
} catch (error) {
  data = previous;
  throw error;
}

emit("cleared");

return {
  success: true,
  clearedAt: nowISO()
};

}

/* =======================================================
PUBLIC API
======================================================= */

const CareerManager = {
version: VERSION,

getProfile: getProfile,
updateProfile: updateProfile,

getCollection: getCollection,
findItem: function (name, id) {
  const item = findItem(name, id);
  return item ? clone(item) : null;
},

addItem: addItem,
updateItem: updateItem,
deleteItem: deleteItem,

addGoal: function (item) {
  return addItem("goals", item);
},
addSkill: function (item) {
  return addItem("skills", item);
},
addCertificate: function (item) {
  return addItem("certificates", item);
},
addExperience: function (item) {
  return addItem("experiences", item);
},
addProject: function (item) {
  return addItem("projects", item);
},
addApplication: function (item) {
  return addItem("applications", item);
},
addAchievement: function (item) {
  return addItem("achievements", item);
},

updateApplicationStatus: updateApplicationStatus,
getApplicationsByStatus: getApplicationsByStatus,
getUpcomingDeadlines: getUpcomingDeadlines,

setGoalProgress: setGoalProgress,
completeGoal: completeGoal,

search: search,
getStatistics: getStatistics,

exportData: exportData,
importData: importData,
clearAll: clearAll

};

global.CareerManager = CareerManager;

emit("ready", {
version: VERSION
});

})(window);