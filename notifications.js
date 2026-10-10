/* =========================================================
MY LIFE OS — NOTIFICATION MANAGER
File: Notification.js
Version: 1.0.0

الوظائف:

- إنشاء الإشعارات وإدارتها.
- تحديد المقروء وغير المقروء.
- تحديد الأولوية والتصنيف.
- جدولة تذكيرات محلية.
- البحث والتصفية.
- إحصاءات الإشعارات.
- تصدير البيانات واستيرادها.
- دعم إشعارات المتصفح عند توفرها.

ملاحظة:
التذكيرات تعمل أثناء تشغيل الصفحة فقط.
الإشعارات في الخلفية تتطلب تكاملًا إضافيًا.
========================================================= */

(function (global) {
"use strict";

if (global.NotificationManager) {
return;
}

const VERSION = "1.0.0";
const STORAGE_KEY = "my_life_os_notifications_v1";

const TYPES = [
"general",
"task",
"goal",
"habit",
"schedule",
"health",
"finance",
"learning",
"career",
"system"
];

const PRIORITIES = [
"low",
"normal",
"high",
"urgent"
];

const MAX_TITLE_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_NOTIFICATIONS = 5000;

let timers = new Map();

/* =======================================================
UTILITIES
======================================================= */

function createId() {
return (
"notification_" +
Date.now().toString(36) +
"_" +
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

function validateEnum(value, allowed, field) {
if (allowed.indexOf(value) === -1) {
throw new Error("قيمة غير صالحة للحقل: " + field);
}
}

function emit(eventName, details) {
const payload = {
module: "notifications",
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
      "notification:" + eventName,
      payload
    );
  }
} catch (error) {
  // لا نوقف العمليات عند فشل نظام الأحداث.
}

try {
  if (
    typeof global.dispatchEvent === "function" &&
    typeof global.CustomEvent === "function"
  ) {
    global.dispatchEvent(
      new CustomEvent("my-life-os:notification", {
        detail: payload
      })
    );
  }
} catch (error) {
  // التوافق مع البيئات التي لا تدعم CustomEvent.
}

}

/* =======================================================
DATA
======================================================= */

function createEmptyData() {
return {
schemaVersion: 1,
createdAt: nowISO(),
updatedAt: nowISO(),
settings: {
enabled: true,
browserNotifications: false,
keepReadNotifications: true,
maxNotifications: 5000
},
items: []
};
}

function loadData() {
let raw;

try {
  raw = global.localStorage
    ? global.localStorage.getItem(STORAGE_KEY)
    : null;
} catch (error) {
  throw new Error(
    "تعذر الوصول إلى التخزين المحلي للإشعارات."
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
    "بيانات الإشعارات المحفوظة غير صالحة."
  );
}

if (!isPlainObject(parsed)) {
  throw new Error("بنية بيانات الإشعارات غير صالحة.");
}

const defaults = createEmptyData();

return {
  schemaVersion: 1,
  createdAt: parsed.createdAt || defaults.createdAt,
  updatedAt: parsed.updatedAt || defaults.updatedAt,
  settings: Object.assign(
    {},
    defaults.settings,
    isPlainObject(parsed.settings)
      ? parsed.settings
      : {}
  ),
  items: Array.isArray(parsed.items)
    ? parsed.items.filter(isPlainObject)
    : []
};

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
    "تعذر حفظ الإشعارات: " + error.message
  );
}

return true;

}

/* =======================================================
NOTIFICATION CREATION
======================================================= */

function normalizeNotification(input) {
if (!isPlainObject(input)) {
throw new Error("بيانات الإشعار غير صالحة.");
}

const title = cleanText(
  input.title,
  MAX_TITLE_LENGTH
);

const message = cleanText(
  input.message,
  MAX_MESSAGE_LENGTH
);

if (!title) {
  throw new Error("عنوان الإشعار مطلوب.");
}

const type = input.type || "general";
const priority = input.priority || "normal";

validateEnum(type, TYPES, "type");
validateEnum(priority, PRIORITIES, "priority");

let scheduledAt = "";

if (input.scheduledAt) {
  const date = new Date(input.scheduledAt);

  if (Number.isNaN(date.getTime())) {
    throw new Error("موعد الإشعار غير صالح.");
  }

  scheduledAt = date.toISOString();
}

return {
  title: title,
  message: message,
  type: type,
  priority: priority,
  scheduledAt: scheduledAt,
  source: cleanText(input.source, 200),
  actionUrl: "",
  relatedId: cleanText(input.relatedId, 200),
  metadata: isPlainObject(input.metadata)
    ? clone(input.metadata)
    : {}
};

}

function addNotification(input) {
if (!data.settings.enabled) {
return {
success: false,
disabled: true,
message: "الإشعارات معطلة من الإعدادات."
};
}

const normalized = normalizeNotification(input);

const item = Object.assign({}, normalized, {
  id: createId(),
  read: false,
  createdAt: nowISO(),
  readAt: null,
  deliveredAt: null,
  dismissed: false
});

data.items.unshift(item);

const maxItems = Math.min(
  MAX_NOTIFICATIONS,
  Math.max(
    1,
    Number(data.settings.maxNotifications) ||
      MAX_NOTIFICATIONS
  )
);

if (data.items.length > maxItems) {
  data.items = data.items.slice(0, maxItems);
}

try {
  persist();
} catch (error) {
  data.items = data.items.filter(function (entry) {
    return entry.id !== item.id;
  });

  throw error;
}

if (!item.scheduledAt) {
  deliver(item);
} else {
  schedule(item.id);
}

emit("created", {
  id: item.id,
  type: item.type,
  priority: item.priority
});

return clone(item);

}

/* =======================================================
DELIVERY
======================================================= */

function deliver(item) {
const current = data.items.find(function (entry) {
return entry.id === item.id;
});

if (!current || current.dismissed) {
  return false;
}

current.deliveredAt = nowISO();

try {
  persist();
} catch (error) {
  // يبقى الإشعار محفوظًا حتى إن تعذر تحديث وقت التسليم.
}

emit("delivered", {
  id: current.id
});

if (
  data.settings.browserNotifications &&
  global.Notification &&
  global.Notification.permission === "granted"
) {
  try {
    new global.Notification(current.title, {
      body: current.message,
      tag: current.id
    });
  } catch (error) {
    // يظل الإشعار متاحًا داخل التطبيق.
  }
}

return true;

}

function schedule(id) {
cancelTimer(id);

const item = data.items.find(function (entry) {
  return entry.id === id;
});

if (!item || !item.scheduledAt || item.dismissed) {
  return false;
}

const target = Date.parse(item.scheduledAt);
const delay = target - Date.now();

if (!Number.isFinite(target)) {
  return false;
}

if (delay <= 0) {
  item.scheduledAt = "";
  persist();
  deliver(item);
  return true;
}

/*
  setTimeout له حد أقصى عملي. نعيد جدولة
  المواعيد البعيدة عند الحاجة.
*/

const maxDelay = 2147483647;

const timer = global.setTimeout(function () {
  timers.delete(id);

  const latest = data.items.find(function (entry) {
    return entry.id === id;
  });

  if (!latest || latest.dismissed) {
    return;
  }

  if (Date.parse(latest.scheduledAt) > Date.now()) {
    schedule(id);
    return;
  }

  latest.scheduledAt = "";

  try {
    persist();
  } catch (error) {
    // لا نمنع التسليم بسبب مشكلة تخزين مؤقتة.
  }

  deliver(latest);
}, Math.min(delay, maxDelay));

timers.set(id, timer);

return true;

}

function cancelTimer(id) {
if (!timers.has(id)) {
return false;
}

global.clearTimeout(timers.get(id));
timers.delete(id);

return true;

}

function restoreScheduledTimers() {
data.items.forEach(function (item) {
if (
item.scheduledAt &&
!item.dismissed
) {
schedule(item.id);
}
});

return timers.size;

}

/* =======================================================
READ / DISMISS / DELETE
======================================================= */

function findItem(id) {
return data.items.find(function (item) {
return item.id === id;
}) || null;
}

function markRead(id) {
const item = findItem(id);

if (!item) {
  return false;
}

if (!item.read) {
  item.read = true;
  item.readAt = nowISO();
  persist();

  emit("read", { id: id });
}

return clone(item);

}

function markUnread(id) {
const item = findItem(id);

if (!item) {
  return false;
}

item.read = false;
item.readAt = null;

persist();

emit("unread", { id: id });

return clone(item);

}

function markAllRead() {
const previous = data.items.map(function (item) {
return {
id: item.id,
read: item.read,
readAt: item.readAt
};
});

const timestamp = nowISO();

data.items.forEach(function (item) {
  if (!item.read && !item.dismissed) {
    item.read = true;
    item.readAt = timestamp;
  }
});

try {
  persist();
} catch (error) {
  previous.forEach(function (entry) {
    const item = findItem(entry.id);

    if (item) {
      item.read = entry.read;
      item.readAt = entry.readAt;
    }
  });

  throw error;
}

emit("all-read");

return {
  success: true,
  unreadCount: getUnreadCount()
};

}

function dismiss(id) {
const item = findItem(id);

if (!item) {
  return false;
}

item.dismissed = true;
cancelTimer(id);

persist();

emit("dismissed", { id: id });

return clone(item);

}

function deleteNotification(id) {
const index = data.items.findIndex(function (item) {
return item.id === id;
});

if (index === -1) {
  return false;
}

const removed = data.items[index];

data.items.splice(index, 1);
cancelTimer(id);

try {
  persist();
} catch (error) {
  data.items.splice(index, 0, removed);
  throw error;
}

emit("deleted", { id: id });

return true;

}

function clearRead() {
const previous = data.items;

data.items = data.items.filter(function (item) {
  return !item.read;
});

const removedIds = previous
  .filter(function (item) {
    return item.read;
  })
  .map(function (item) {
    return item.id;
  });

try {
  persist();
} catch (error) {
  data.items = previous;
  throw error;
}

removedIds.forEach(cancelTimer);

emit("read-cleared", {
  count: removedIds.length
});

return removedIds.length;

}

function clearAll(settings) {
if (!settings || settings.confirmed !== true) {
throw new Error(
"يجب تأكيد حذف جميع الإشعارات."
);
}

const previous = data.items;

data.items = [];

try {
  persist();
} catch (error) {
  data.items = previous;
  throw error;
}

timers.forEach(function (timer) {
  global.clearTimeout(timer);
});

timers.clear();

emit("all-cleared");

return {
  success: true,
  clearedAt: nowISO()
};

}

/* =======================================================
QUERIES
======================================================= */

function getAll(options) {
const config = options || {};

let result = data.items.slice();

if (config.includeDismissed !== true) {
  result = result.filter(function (item) {
    return !item.dismissed;
  });
}

if (config.read === true) {
  result = result.filter(function (item) {
    return item.read;
  });
} else if (config.read === false) {
  result = result.filter(function (item) {
    return !item.read;
  });
}

if (config.type) {
  validateEnum(config.type, TYPES, "type");

  result = result.filter(function (item) {
    return item.type === config.type;
  });
}

if (config.priority) {
  validateEnum(
    config.priority,
    PRIORITIES,
    "priority"
  );

  result = result.filter(function (item) {
    return item.priority === config.priority;
  });
}

result.sort(function (a, b) {
  return Date.parse(b.createdAt) -
    Date.parse(a.createdAt);
});

if (Number.isFinite(config.limit)) {
  result = result.slice(
    0,
    Math.max(0, config.limit)
  );
}

return clone(result);

}

function getById(id) {
const item = findItem(id);

return item ? clone(item) : null;

}

function getUnreadCount() {
return data.items.filter(function (item) {
return !item.read && !item.dismissed;
}).length;
}

function getStatistics() {
const visible = data.items.filter(function (item) {
return !item.dismissed;
});

const unread = visible.filter(function (item) {
  return !item.read;
});

const byType = {};

TYPES.forEach(function (type) {
  byType[type] = visible.filter(function (item) {
    return item.type === type;
  }).length;
});

return {
  total: visible.length,
  unread: unread.length,
  read: visible.length - unread.length,
  scheduled: visible.filter(function (item) {
    return Boolean(item.scheduledAt);
  }).length,
  byType: byType,
  updatedAt: data.updatedAt
};

}

function search(query) {
const term = cleanText(query, 300)
.toLocaleLowerCase();

if (!term) {
  return [];
}

return getAll({
  includeDismissed: true
}).filter(function (item) {
  return (
    item.title.toLocaleLowerCase().includes(term) ||
    item.message.toLocaleLowerCase().includes(term) ||
    item.type.toLocaleLowerCase().includes(term) ||
    item.source.toLocaleLowerCase().includes(term)
  );
});

}

/* =======================================================
SETTINGS
======================================================= */

function getSettings() {
return clone(data.settings);
}

function updateSettings(changes) {
if (!isPlainObject(changes)) {
throw new Error("إعدادات الإشعارات غير صالحة.");
}

const previous = clone(data.settings);

data.settings = Object.assign(
  {},
  data.settings,
  changes
);

data.settings.enabled =
  Boolean(data.settings.enabled);

data.settings.browserNotifications =
  Boolean(data.settings.browserNotifications);

data.settings.keepReadNotifications =
  Boolean(data.settings.keepReadNotifications);

const max = Number(data.settings.maxNotifications);

data.settings.maxNotifications =
  Number.isFinite(max)
    ? Math.min(
        MAX_NOTIFICATIONS,
        Math.max(1, Math.floor(max))
      )
    : MAX_NOTIFICATIONS;

try {
  persist();
} catch (error) {
  data.settings = previous;
  throw error;
}

emit("settings-updated");

return getSettings();

}

async function requestBrowserPermission() {
if (!global.Notification) {
return {
supported: false,
permission: "unsupported"
};
}

if (global.Notification.permission === "granted") {
  return {
    supported: true,
    permission: "granted"
  };
}

if (global.Notification.permission === "denied") {
  return {
    supported: true,
    permission: "denied"
  };
}

const permission =
  await global.Notification.requestPermission();

return {
  supported: true,
  permission: permission
};

}

/* =======================================================
EXPORT / IMPORT
======================================================= */

function exportData() {
return {
format: "MY_LIFE_OS_NOTIFICATIONS",
version: VERSION,
exportedAt: nowISO(),
data: clone(data)
};
}

function importData(payload, options) {
const config = options || {};

if (config.confirmed !== true) {
  throw new Error(
    "يجب تأكيد استيراد الإشعارات قبل استبدال البيانات."
  );
}

if (
  !isPlainObject(payload) ||
  payload.format !== "MY_LIFE_OS_NOTIFICATIONS" ||
  !isPlainObject(payload.data) ||
  !Array.isArray(payload.data.items)
) {
  throw new Error("ملف استيراد الإشعارات غير صالح.");
}

const previous = data;

const next = {
  schemaVersion: 1,
  createdAt: payload.data.createdAt || nowISO(),
  updatedAt: nowISO(),
  settings: Object.assign(
    {},
    createEmptyData().settings,
    isPlainObject(payload.data.settings)
      ? payload.data.settings
      : {}
  ),
  items: payload.data.items
    .filter(isPlainObject)
    .map(function (item) {
      return clone(item);
    })
    .slice(0, MAX_NOTIFICATIONS)
};

data = next;

try {
  persist();
} catch (error) {
  data = previous;
  throw error;
}

timers.forEach(function (timer) {
  global.clearTimeout(timer);
});

timers.clear();
restoreScheduledTimers();

emit("data-imported");

return {
  success: true,
  importedAt: nowISO(),
  statistics: getStatistics()
};

}

/* =======================================================
PUBLIC API
======================================================= */

const NotificationManager = {
version: VERSION,

add: addNotification,
create: addNotification,

getAll: getAll,
getById: getById,
search: search,

markRead: markRead,
markUnread: markUnread,
markAllRead: markAllRead,

dismiss: dismiss,
delete: deleteNotification,
clearRead: clearRead,
clearAll: clearAll,

getUnreadCount: getUnreadCount,
getStatistics: getStatistics,

schedule: schedule,
cancelTimer: cancelTimer,
restoreScheduledTimers: restoreScheduledTimers,

getSettings: getSettings,
updateSettings: updateSettings,
requestBrowserPermission: requestBrowserPermission,

exportData: exportData,
importData: importData

};

global.NotificationManager = NotificationManager;

/*
إعادة تشغيل التذكيرات المحفوظة عند تحميل الصفحة.
هذه الآلية لا تعمل بعد إغلاق الصفحة أو المتصفح.
*/
restoreScheduledTimers();

emit("ready", {
version: VERSION
});

})(window);