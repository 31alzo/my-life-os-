/* =========================================================
MY LIFE OS — DIGITAL LIFE MANAGER
File: digital-life.js
Version: 1.0.0

الوظائف:

- إدارة الحسابات والمنصات الرقمية.
- إدارة الروابط والمواقع المهمة.
- متابعة الاشتراكات الرقمية.
- تسجيل وقت الشاشة.
- إدارة مهام الصيانة الرقمية.
- البحث والإحصاءات والتصدير.
- تخزين محلي مستقل مع إمكانية التصدير والاستيراد.

تنبيه:
لا يخزن هذا الملف كلمات المرور أو بيانات الدخول الحساسة.
========================================================= */

(function (global) {
"use strict";

if (global.DigitalLifeManager) {
return;
}

const VERSION = "1.0.0";
const STORAGE_KEY = "my_life_os_digital_life_v1";

const COLLECTIONS = [
"accounts",
"bookmarks",
"subscriptions",
"screenTime",
"maintenanceTasks"
];

const SUBSCRIPTION_STATUSES = [
"active",
"paused",
"cancelled",
"expired"
];

const TASK_STATUSES = [
"pending",
"in_progress",
"completed",
"cancelled"
];

const PRIORITIES = [
"low",
"medium",
"high",
"urgent"
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

function validDate(value, fieldName) {
if (value === "" || value == null) {
return;
}

if (
  typeof value !== "string" &&
  typeof value !== "number" &&
  !(value instanceof Date)
) {
  throw new Error("التاريخ غير صالح: " + fieldName);
}

if (Number.isNaN(new Date(value).getTime())) {
  throw new Error("التاريخ غير صالح: " + fieldName);
}

}

function normalizeDate(value) {
if (!value) {
return "";
}

const date = new Date(value);

return Number.isNaN(date.getTime())
  ? ""
  : date.toISOString();

}

function validateEnum(value, values, fieldName) {
if (values.indexOf(value) === -1) {
throw new Error("قيمة غير صالحة للحقل: " + fieldName);
}
}

function emit(eventName, details) {
const payload = {
module: "digital-life",
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
      "digital-life:" + eventName,
      payload
    );
  }
} catch (error) {
  // لا نوقف العملية بسبب تعطل نظام الأحداث.
}

try {
  if (
    typeof global.dispatchEvent === "function" &&
    typeof global.CustomEvent === "function"
  ) {
    global.dispatchEvent(
      new CustomEvent("my-life-os:digital-life", {
        detail: payload
      })
    );
  }
} catch (error) {
  // التوافق مع بيئات التشغيل المختلفة.
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

  settings: {
    dailyScreenTimeTargetMinutes: 180,
    currency: "MRU"
  },

  accounts: [],
  bookmarks: [],
  subscriptions: [],
  screenTime: [],
  maintenanceTasks: []
};

}

/* =======================================================
STORAGE
======================================================= */

function loadData() {
let raw = null;

try {
  if (global.localStorage) {
    raw = global.localStorage.getItem(STORAGE_KEY);
  }
} catch (error) {
  throw new Error(
    "تعذر الوصول إلى التخزين المحلي للحياة الرقمية."
  );
}

if (!raw) {
  return createEmptyData();
}

let parsed;

try {
  parsed = JSON.parse(raw);
} catch (error) {
  throw new Error(
    "بيانات الحياة الرقمية المحفوظة ليست JSON صالحًا."
  );
}

if (!isPlainObject(parsed)) {
  throw new Error(
    "بنية بيانات الحياة الرقمية غير صالحة."
  );
}

const defaults = createEmptyData();

const result = Object.assign({}, defaults, parsed);

COLLECTIONS.forEach(function (name) {
  if (!Array.isArray(result[name])) {
    result[name] = [];
  }
});

result.settings = Object.assign(
  {},
  defaults.settings,
  isPlainObject(result.settings)
    ? result.settings
    : {}
);

return result;

}

let data = loadData();

function persist() {
const previousUpdatedAt = data.updatedAt;

data.updatedAt = nowISO();

try {
  if (!global.localStorage) {
    throw new Error("التخزين المحلي غير متاح.");
  }

  global.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(data)
  );
} catch (error) {
  data.updatedAt = previousUpdatedAt;

  throw new Error(
    "تعذر حفظ بيانات الحياة الرقمية: " + error.message
  );
}

emit("updated", {
  updatedAt: data.updatedAt
});

return true;

}

/* =======================================================
URL VALIDATION
======================================================= */

function normalizeUrl(value) {
const text = cleanText(value, 2000);

if (!text) {
  return "";
}

let url;

try {
  url = new URL(text);
} catch (error) {
  throw new Error("الرابط غير صالح.");
}

if (
  url.protocol !== "https:" &&
  url.protocol !== "http:"
) {
  throw new Error(
    "يُسمح فقط بروابط HTTP وHTTPS."
  );
}

return url.href;

}

/* =======================================================
COLLECTION HELPERS
======================================================= */

function validateCollection(name) {
if (COLLECTIONS.indexOf(name) === -1) {
throw new Error("القائمة غير معروفة: " + name);
}
}

function getCollection(name) {
validateCollection(name);
return clone(data[name]);
}

function findIndex(name, id) {
validateCollection(name);

return data[name].findIndex(function (item) {
  return item.id === id;
});

}

function prepareItem(name, input, existing) {
if (!isPlainObject(input)) {
throw new Error("بيانات العنصر غير صالحة.");
}

const item = Object.assign(
  {},
  existing || {},
  input
);

delete item.id;
delete item.createdAt;
delete item.updatedAt;

if (name === "accounts") {
  item.name = cleanText(item.name, 200);
  item.platform = cleanText(item.platform, 150);
  item.category = cleanText(item.category, 100);
  item.username = cleanText(item.username, 200);
  item.profileUrl = normalizeUrl(item.profileUrl);
  item.notes = cleanText(item.notes, 3000);
  item.status = item.status || "active";

  /*
    لا نخزن كلمة المرور أو رمز المصادقة
    أو مفاتيح الوصول داخل سجل الحساب.
  */

  delete item.password;
  delete item.passphrase;
  delete item.accessToken;
  delete item.refreshToken;
  delete item.secret;
  delete item.authCode;

  if (!item.name) {
    throw new Error("اسم الحساب مطلوب.");
  }
}

if (name === "bookmarks") {
  item.title = cleanText(item.title, 300);
  item.url = normalizeUrl(item.url);
  item.category = cleanText(item.category, 100);
  item.notes = cleanText(item.notes, 3000);
  item.favorite = Boolean(item.favorite);

  if (!item.title || !item.url) {
    throw new Error(
      "عنوان الرابط وعنوان الموقع مطلوبان."
    );
  }
}

if (name === "subscriptions") {
  item.name = cleanText(item.name, 250);
  item.provider = cleanText(item.provider, 200);
  item.category = cleanText(item.category, 100);
  item.status = item.status || "active";
  item.currency = cleanText(
    item.currency || data.settings.currency,
    10
  );

  validateEnum(
    item.status,
    SUBSCRIPTION_STATUSES,
    "status"
  );

  item.cost = Number(item.cost || 0);

  if (
    !Number.isFinite(item.cost) ||
    item.cost < 0
  ) {
    throw new Error(
      "تكلفة الاشتراك يجب أن تكون صفرًا أو أكثر."
    );
  }

  item.billingCycle = item.billingCycle || "monthly";

  const allowedCycles = [
    "weekly",
    "monthly",
    "quarterly",
    "yearly",
    "one_time",
    "custom"
  ];

  validateEnum(
    item.billingCycle,
    allowedCycles,
    "billingCycle"
  );

  assertSubscriptionDates(item);
}

if (name === "screenTime") {
  item.date = item.date || nowISO().slice(0, 10);
  item.appName = cleanText(item.appName, 200);
  item.category = cleanText(item.category, 100);
  item.minutes = Number(item.minutes || 0);
  item.notes = cleanText(item.notes, 1000);

  validDate(item.date, "date");

  if (
    !Number.isFinite(item.minutes) ||
    item.minutes < 0 ||
    item.minutes > 1440
  ) {
    throw new Error(
      "وقت الاستخدام يجب أن يكون بين 0 و1440 دقيقة."
    );
  }
}

if (name === "maintenanceTasks") {
  item.title = cleanText(item.title, 300);
  item.description = cleanText(item.description, 3000);
  item.category = cleanText(item.category, 100);
  item.status = item.status || "pending";
  item.priority = item.priority || "medium";

  validateEnum(item.status, TASK_STATUSES, "status");
  validateEnum(item.priority, PRIORITIES, "priority");

  validDate(item.dueDate, "dueDate");

  item.dueDate = normalizeDate(item.dueDate);

  if (!item.title) {
    throw new Error("عنوان مهمة الصيانة مطلوب.");
  }
}

return item;

}

function assertSubscriptionDates(item) {
validDate(item.startDate, "startDate");
validDate(item.renewalDate, "renewalDate");
validDate(item.endDate, "endDate");

item.startDate = normalizeDate(item.startDate);
item.renewalDate = normalizeDate(item.renewalDate);
item.endDate = normalizeDate(item.endDate);

}

function addItem(name, input) {
validateCollection(name);

const prepared = prepareItem(name, input);

const item = Object.assign({}, prepared, {
  id: createId(name),
  createdAt: nowISO(),
  updatedAt: nowISO()
});

data[name].push(item);

try {
  persist();
} catch (error) {
  data[name] = data[name].filter(function (entry) {
    return entry.id !== item.id;
  });

  throw error;
}

emit("item-added", {
  collection: name,
  id: item.id
});

return clone(item);

}

function updateItem(name, id, changes) {
validateCollection(name);

const index = findIndex(name, id);

if (index === -1) {
  throw new Error("العنصر المطلوب غير موجود.");
}

if (!isPlainObject(changes)) {
  throw new Error("التعديلات غير صالحة.");
}

const original = data[name][index];

const candidate = prepareItem(
  name,
  changes,
  original
);

const updated = Object.assign({}, candidate, {
  id: original.id,
  createdAt: original.createdAt,
  updatedAt: nowISO()
});

data[name][index] = updated;

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

return clone(updated);

}

function deleteItem(name, id) {
validateCollection(name);

const index = findIndex(name, id);

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
SETTINGS
======================================================= */

function getSettings() {
return clone(data.settings);
}

function updateSettings(changes) {
if (!isPlainObject(changes)) {
throw new Error("الإعدادات غير صالحة.");
}

const previous = data.settings;
const next = Object.assign({}, previous);

if (
  Object.prototype.hasOwnProperty.call(
    changes,
    "dailyScreenTimeTargetMinutes"
  )
) {
  const target = Number(
    changes.dailyScreenTimeTargetMinutes
  );

  if (
    !Number.isFinite(target) ||
    target < 0 ||
    target > 1440
  ) {
    throw new Error(
      "هدف وقت الشاشة يجب أن يكون بين 0 و1440 دقيقة."
    );
  }

  next.dailyScreenTimeTargetMinutes = target;
}

if (
  Object.prototype.hasOwnProperty.call(
    changes,
    "currency"
  )
) {
  next.currency = cleanText(changes.currency, 10);
}

data.settings = next;

try {
  persist();
} catch (error) {
  data.settings = previous;
  throw error;
}

return getSettings();

}

/* =======================================================
SCREEN TIME
======================================================= */

function getDailyScreenTime(date) {
const targetDate = date ||
nowISO().slice(0, 10);

return getCollection("screenTime")
  .filter(function (entry) {
    return entry.date === targetDate;
  })
  .reduce(function (total, entry) {
    return total + Number(entry.minutes || 0);
  }, 0);

}

function getScreenTimeSummary(date) {
const targetDate = date ||
nowISO().slice(0, 10);

const entries = getCollection("screenTime")
  .filter(function (entry) {
    return entry.date === targetDate;
  });

const total = entries.reduce(function (sum, entry) {
  return sum + Number(entry.minutes || 0);
}, 0);

const target =
  Number(data.settings.dailyScreenTimeTargetMinutes) || 0;

return {
  date: targetDate,
  totalMinutes: total,
  totalHours: Math.round(total / 60 * 100) / 100,
  targetMinutes: target,
  remainingMinutes: Math.max(0, target - total),
  exceededTarget: target > 0 && total > target,
  entries: entries.length
};

}

function getScreenTimeByCategory(date) {
const targetDate = date ||
nowISO().slice(0, 10);

const result = {};

getCollection("screenTime")
  .filter(function (entry) {
    return entry.date === targetDate;
  })
  .forEach(function (entry) {
    const category = entry.category || "غير مصنف";

    result[category] =
      (result[category] || 0) +
      Number(entry.minutes || 0);
  });

return result;

}

/* =======================================================
SUBSCRIPTIONS
======================================================= */

function getUpcomingRenewals(daysAhead) {
const days = Number.isFinite(Number(daysAhead))
? Math.max(0, Number(daysAhead))
: 30;

const now = Date.now();
const end = now + days * 86400000;

return getCollection("subscriptions")
  .filter(function (item) {
    if (
      item.status !== "active" ||
      !item.renewalDate
    ) {
      return false;
    }

    const time = Date.parse(item.renewalDate);

    return (
      Number.isFinite(time) &&
      time >= now &&
      time <= end
    );
  })
  .sort(function (a, b) {
    return Date.parse(a.renewalDate) -
      Date.parse(b.renewalDate);
  });

}

function getMonthlySubscriptionCost() {
return getCollection("subscriptions")
.filter(function (item) {
return item.status === "active";
})
.reduce(function (total, item) {
const cost = Number(item.cost) || 0;

    switch (item.billingCycle) {
      case "weekly":
        return total + cost * 52 / 12;

      case "monthly":
        return total + cost;

      case "quarterly":
        return total + cost / 3;

      case "yearly":
        return total + cost / 12;

      case "one_time":
      case "custom":
      default:
        return total;
    }
  }, 0);

}

/* =======================================================
MAINTENANCE TASKS
======================================================= */

function completeMaintenanceTask(id) {
return updateItem("maintenanceTasks", id, {
status: "completed",
completedAt: nowISO()
});
}

function getPendingMaintenanceTasks() {
return getCollection("maintenanceTasks")
.filter(function (task) {
return (
task.status === "pending" ||
task.status === "in_progress"
);
})
.sort(function (a, b) {
const priorityRank = {
urgent: 0,
high: 1,
medium: 2,
low: 3
};

    return priorityRank[a.priority] -
      priorityRank[b.priority];
  });

}

/* =======================================================
SEARCH
======================================================= */

function search(query) {
const term = cleanText(query, 300)
.toLocaleLowerCase();

if (!term) {
  return [];
}

const results = [];

COLLECTIONS.forEach(function (name) {
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
STATISTICS
======================================================= */

function getStatistics() {
const activeSubscriptions = data.subscriptions.filter(
function (item) {
return item.status === "active";
}
);

const completedTasks = data.maintenanceTasks.filter(
  function (item) {
    return item.status === "completed";
  }
);

const today = nowISO().slice(0, 10);

return {
  accounts: {
    total: data.accounts.length,
    active: data.accounts.filter(function (item) {
      return item.status === "active";
    }).length
  },

  bookmarks: {
    total: data.bookmarks.length,
    favorites: data.bookmarks.filter(function (item) {
      return item.favorite;
    }).length
  },

  subscriptions: {
    total: data.subscriptions.length,
    active: activeSubscriptions.length,
    estimatedMonthlyCost: Math.round(
      getMonthlySubscriptionCost() * 100
    ) / 100,
    upcomingRenewals: getUpcomingRenewals(30).length
  },

  screenTime: getScreenTimeSummary(today),

  maintenanceTasks: {
    total: data.maintenanceTasks.length,
    completed: completedTasks.length,
    pending: data.maintenanceTasks.filter(function (item) {
      return item.status === "pending";
    }).length
  },

  updatedAt: data.updatedAt
};

}

/* =======================================================
EXPORT / IMPORT
======================================================= */

function exportData() {
return {
format: "MY_LIFE_OS_DIGITAL_LIFE",
version: VERSION,
exportedAt: nowISO(),
data: clone(data)
};
}

function importData(payload, settings) {
const config = settings || {};

if (config.confirmed !== true) {
  throw new Error(
    "يجب تأكيد الاستيراد قبل استبدال بيانات الحياة الرقمية."
  );
}

if (
  !isPlainObject(payload) ||
  payload.format !== "MY_LIFE_OS_DIGITAL_LIFE" ||
  !isPlainObject(payload.data)
) {
  throw new Error(
    "ملف استيراد الحياة الرقمية غير صالح."
  );
}

const incoming = payload.data;
const next = createEmptyData();

if (isPlainObject(incoming.settings)) {
  next.settings = Object.assign(
    {},
    next.settings,
    incoming.settings
  );
}

COLLECTIONS.forEach(function (name) {
  if (incoming[name] !== undefined) {
    if (!Array.isArray(incoming[name])) {
      throw new Error(
        "بيانات المجموعة غير صالحة: " + name
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
if (!settings || settings.confirmed !== true) {
throw new Error(
"يجب تأكيد حذف جميع بيانات الحياة الرقمية."
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

const DigitalLifeManager = {
version: VERSION,

getCollection: getCollection,
addItem: addItem,
updateItem: updateItem,
deleteItem: deleteItem,

addAccount: function (item) {
  return addItem("accounts", item);
},

addBookmark: function (item) {
  return addItem("bookmarks", item);
},

addSubscription: function (item) {
  return addItem("subscriptions", item);
},

addScreenTimeEntry: function (item) {
  return addItem("screenTime", item);
},

addMaintenanceTask: function (item) {
  return addItem("maintenanceTasks", item);
},

getSettings: getSettings,
updateSettings: updateSettings,

getDailyScreenTime: getDailyScreenTime,
getScreenTimeSummary: getScreenTimeSummary,
getScreenTimeByCategory: getScreenTimeByCategory,

getUpcomingRenewals: getUpcomingRenewals,
getMonthlySubscriptionCost: getMonthlySubscriptionCost,

completeMaintenanceTask: completeMaintenanceTask,
getPendingMaintenanceTasks: getPendingMaintenanceTasks,

search: search,
getStatistics: getStatistics,

exportData: exportData,
importData: importData,
clearAll: clearAll

};

global.DigitalLifeManager = DigitalLifeManager;

emit("ready", {
version: VERSION
});

})(window);