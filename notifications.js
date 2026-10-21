/* =========================================================
MY LIFE OS — NOTIFICATION MANAGER
File: Notification.js
Version: 2.0.0

الوظائف:

- إنشاء الإشعارات وإدارتها.
- تحديد المقروء وغير المقروء.
- إدارة الأولوية والتصنيف.
- جدولة التذكيرات أثناء تشغيل الصفحة.
- البحث والتصفية والإحصاءات.
- تصدير البيانات واستيرادها والتحقق منها.
- دعم إشعارات المتصفح عند توفرها.
- استخدام AppStorage عند توفره.
- التوافق مع مفتاح التخزين القديم.
- التحقق من البيانات واستعادة الحالة عند فشل الحفظ.

تنبيه:
التذكيرات المجدولة تعتمد على تشغيل الصفحة.
إشعارات الخلفية بعد إغلاق الصفحة تحتاج إلى
Service Worker وتكامل إضافي.
========================================================= */

(function (global) {
"use strict";

if (global.NotificationManager) {
return;
}

const VERSION = "2.0.0";
const STORAGE_KEY = "my_life_os_notifications_v1";
const APP_STORAGE_KEY = "notifications";

const FORMAT = "MY_LIFE_OS_NOTIFICATIONS";
const MAX_TITLE_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_NOTIFICATIONS = 5000;
const MAX_METADATA_DEPTH = 8;

const TYPES = Object.freeze([
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
]);

const PRIORITIES = Object.freeze([
"low",
"normal",
"high",
"urgent"
]);

const timers = new Map();

/* =======================================================
UTILITIES
======================================================= */

function nowISO() {
return new Date().toISOString();
}

function createId() {
return (
"notification_" +
Date.now().toString(36) +
"_" +
Math.random().toString(36).slice(2, 10)
);
}

function cleanText(value, maxLength) {
if (value === null || value === undefined) {
return "";
}

if (
  typeof value !== "string" &&
  typeof value !== "number"
) {
  return "";
}

return String(value)
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
if (!allowed.includes(value)) {
throw new Error(
"قيمة غير صالحة للحقل: " + field
);
}

return value;

}

function isValidDate(value) {
return (
typeof value === "string" &&
value.length > 0 &&
Number.isFinite(Date.parse(value))
);
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
      new global.CustomEvent(
        "my-life-os:notification",
        { detail: payload }
      )
    );
  }
} catch (error) {
  // دعم البيئات التي لا تدعم CustomEvent.
}

}

function safePersist() {
if (
global.AppStorage &&
typeof global.AppStorage.set === "function"
) {
const result = global.AppStorage.set(
APP_STORAGE_KEY,
data
);

  if (
    result === false ||
    (result && result.success === false)
  ) {
    throw new Error(
      result.message || "تعذر حفظ الإشعارات."
    );
  }

  return true;
}

try {
  if (!global.localStorage) {
    throw new Error(
      "التخزين المحلي غير متاح."
    );
  }

  global.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(data)
  );

  return true;
} catch (error) {
  throw new Error(
    "تعذر حفظ الإشعارات: " +
    (error.message || "خطأ في التخزين.")
  );
}

}

function persist() {
const previousUpdatedAt = data.updatedAt;

data.updatedAt = nowISO();

try {
  safePersist();
  return true;
} catch (error) {
  data.updatedAt = previousUpdatedAt;
  throw error;
}

}

/* =======================================================
DATA MODEL
======================================================= */

function createEmptyData() {
const timestamp = nowISO();

return {
  schemaVersion: 2,
  createdAt: timestamp,
  updatedAt: timestamp,

  settings: {
    enabled: true,
    browserNotifications: false,
    keepReadNotifications: true,
    maxNotifications: MAX_NOTIFICATIONS
  },

  items: []
};

}

function normalizeSettings(settings) {
const defaults = createEmptyData().settings;

const source = isPlainObject(settings)
  ? settings
  : {};

const requestedMax = Number(
  source.maxNotifications
);

return {
  enabled:
    source.enabled === undefined
      ? defaults.enabled
      : source.enabled === true,

  browserNotifications:
    source.browserNotifications === true,

  keepReadNotifications:
    source.keepReadNotifications === undefined
      ? defaults.keepReadNotifications
      : source.keepReadNotifications === true,

  maxNotifications:
    Number.isFinite(requestedMax)
      ? Math.min(
          MAX_NOTIFICATIONS,
          Math.max(1, Math.floor(requestedMax))
        )
      : defaults.maxNotifications
};

}

function normalizeStoredItem(input) {
if (!isPlainObject(input)) {
return null;
}

const id = cleanText(input.id, 200);
const title = cleanText(
  input.title,
  MAX_TITLE_LENGTH
);

if (!id || !title) {
  return null;
}

const type = TYPES.includes(input.type)
  ? input.type
  : "general";

const priority = PRIORITIES.includes(input.priority)
  ? input.priority
  : "normal";

const createdAt = isValidDate(input.createdAt)
  ? new Date(input.createdAt).toISOString()
  : nowISO();

const scheduledAt =
  input.scheduledAt &&
  isValidDate(input.scheduledAt)
    ? new Date(input.scheduledAt).toISOString()
    : "";

const metadata = isPlainObject(input.metadata)
  ? clone(input.metadata)
  : {};

return {
  id,
  title,
  message: cleanText(
    input.message,
    MAX_MESSAGE_LENGTH
  ),
  type,
  priority,
  scheduledAt,
  source: cleanText(input.source, 200),
  actionUrl: cleanText(input.actionUrl, 2000),
  relatedId: cleanText(input.relatedId, 200),
  metadata,

  read: input.read === true,

  createdAt,

  readAt: isValidDate(input.readAt)
    ? new Date(input.readAt).toISOString()
    : null,

  deliveredAt: isValidDate(input.deliveredAt)
    ? new Date(input.deliveredAt).toISOString()
    : null,

  dismissed: input.dismissed === true
};

}

function normalizeData(input) {
if (!isPlainObject(input)) {
throw new Error(
"بنية بيانات الإشعارات غير صالحة."
);
}

const defaults = createEmptyData();

const seenIds = new Set();

const items = Array.isArray(input.items)
  ? input.items
      .map(normalizeStoredItem)
      .filter(function (item) {
        if (!item || seenIds.has(item.id)) {
          return false;
        }

        seenIds.add(item.id);
        return true;
      })
      .slice(0, MAX_NOTIFICATIONS)
  : [];

return {
  schemaVersion: 2,

  createdAt: isValidDate(input.createdAt)
    ? new Date(input.createdAt).toISOString()
    : defaults.createdAt,

  updatedAt: isValidDate(input.updatedAt)
    ? new Date(input.updatedAt).toISOString()
    : defaults.updatedAt,

  settings: normalizeSettings(input.settings),

  items
};

}

function loadData() {
let raw = null;
let loadedFromAppStorage = false;

try {
  if (
    global.AppStorage &&
    typeof global.AppStorage.has === "function" &&
    global.AppStorage.has(APP_STORAGE_KEY)
  ) {
    const stored = global.AppStorage.get(
      APP_STORAGE_KEY,
      null
    );

    if (stored !== null) {
      raw = JSON.stringify(stored);
      loadedFromAppStorage = true;
    }
  }

  if (raw === null && global.localStorage) {
    raw = global.localStorage.getItem(
      STORAGE_KEY
    );
  }
} catch (error) {
  throw new Error(
    "تعذر الوصول إلى بيانات الإشعارات المحفوظة."
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
    "بيانات الإشعارات المحفوظة غير صالحة. " +
    "لم يتم حذف البيانات الأصلية."
  );
}

if (
  !isPlainObject(parsed) ||
  !Array.isArray(parsed.items)
) {
  throw new Error(
    "بنية بيانات الإشعارات غير صالحة. " +
    "لم يتم حذف البيانات الأصلية."
  );
}

const normalized = normalizeData(parsed);

// الترحيل إلى AppStorage لا يحذف النسخة القديمة.
if (!loadedFromAppStorage && global.AppStorage) {
  try {
    global.AppStorage.set(
      APP_STORAGE_KEY,
      normalized
    );
  } catch (error) {
    // تبقى البيانات القديمة قابلة للقراءة.
  }
}

return normalized;

}

let data = loadData();

/* =======================================================
NOTIFICATION CREATION
======================================================= */

function normalizeNotification(input) {
if (!isPlainObject(input)) {
throw new Error(
"بيانات الإشعار غير صالحة."
);
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
  throw new Error(
    "عنوان الإشعار مطلوب."
  );
}

const type = input.type || "general";
const priority = input.priority || "normal";

validateEnum(type, TYPES, "type");
validateEnum(priority, PRIORITIES, "priority");

let scheduledAt = "";

if (input.scheduledAt) {
  if (!isValidDate(input.scheduledAt)) {
    throw new Error(
      "موعد الإشعار غير صالح."
    );
  }

  scheduledAt = new Date(
    input.scheduledAt
  ).toISOString();
}

const actionUrl = cleanText(
  input.actionUrl,
  2000
);

return {
  title,
  message,
  type,
  priority,
  scheduledAt,
  source: cleanText(input.source, 200),
  actionUrl,
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

const previousItems = data.items;

data.items = [
  item,
  ...previousItems
].slice(
  0,
  Math.min(
    MAX_NOTIFICATIONS,
    data.settings.maxNotifications
  )
);

try {
  persist();
} catch (error) {
  data.items = previousItems;
  throw error;
}

if (item.scheduledAt) {
  schedule(item.id);
} else {
  deliver(item);
}

emit("created", {
  id: item.id,
  type: item.type,
  priority: item.priority
});

return clone(item);

}

/* =======================================================
DELIVERY AND SCHEDULING
======================================================= */

function deliver(item) {
const current = findItem(item.id);

if (!current || current.dismissed) {
  return false;
}

if (current.deliveredAt) {
  return true;
}

const previous = current.deliveredAt;
current.deliveredAt = nowISO();

try {
  persist();
} catch (error) {
  current.deliveredAt = previous;
  return false;
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
    // يظل الإشعار محفوظًا داخل التطبيق.
  }
}

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

function schedule(id) {
cancelTimer(id);

const item = findItem(id);

if (
  !item ||
  !item.scheduledAt ||
  item.dismissed ||
  item.deliveredAt
) {
  return false;
}

const target = Date.parse(item.scheduledAt);

if (!Number.isFinite(target)) {
  return false;
}

const delay = target - Date.now();

if (delay <= 0) {
  const previous = item.scheduledAt;
  item.scheduledAt = "";

  try {
    persist();
  } catch (error) {
    item.scheduledAt = previous;
    return false;
  }

  return deliver(item);
}

const maxDelay = 2147483647;

const timer = global.setTimeout(function () {
  timers.delete(id);

  const latest = findItem(id);

  if (
    !latest ||
    latest.dismissed ||
    latest.deliveredAt
  ) {
    return;
  }

  const remaining =
    Date.parse(latest.scheduledAt) - Date.now();

  if (remaining > 0) {
    schedule(id);
    return;
  }

  const previous = latest.scheduledAt;
  latest.scheduledAt = "";

  try {
    persist();
  } catch (error) {
    latest.scheduledAt = previous;
    schedule(id);
    return;
  }

  deliver(latest);
}, Math.min(delay, maxDelay));

timers.set(id, timer);

return true;

}

function restoreScheduledTimers() {
data.items.forEach(function (item) {
if (
item.scheduledAt &&
!item.dismissed &&
!item.deliveredAt
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

function updateItem(id, updater, eventName) {
const item = findItem(id);

if (!item) {
  return false;
}

const previous = clone(item);

updater(item);

try {
  persist();
} catch (error) {
  Object.assign(item, previous);
  throw error;
}

if (eventName) {
  emit(eventName, { id });
}

return clone(item);

}

function markRead(id) {
const item = findItem(id);

if (!item) {
  return false;
}

if (item.read) {
  return clone(item);
}

return updateItem(
  id,
  function (entry) {
    entry.read = true;
    entry.readAt = nowISO();
  },
  "read"
);

}

function markUnread(id) {
return updateItem(
id,
function (item) {
item.read = false;
item.readAt = null;
},
"unread"
);
}

function markAllRead() {
const previous = clone(data.items);
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
  data.items = previous;
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

const result = updateItem(
  id,
  function (entry) {
    entry.dismissed = true;
  },
  "dismissed"
);

if (result) {
  cancelTimer(id);
}

return result;

}

function deleteNotification(id) {
const index = data.items.findIndex(
function (item) {
return item.id === id;
}
);

if (index === -1) {
  return false;
}

const removed = data.items[index];

data.items.splice(index, 1);

try {
  persist();
} catch (error) {
  data.items.splice(index, 0, removed);
  throw error;
}

cancelTimer(id);

emit("deleted", { id });

return true;

}

function clearRead() {
const previous = data.items;

const removedIds = previous
  .filter(function (item) {
    return item.read;
  })
  .map(function (item) {
    return item.id;
  });

data.items = previous.filter(
  function (item) {
    return !item.read;
  }
);

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

function clearAll(options) {
if (
!options ||
options.confirmed !== true
) {
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

let items = data.items.slice();

if (config.includeDismissed !== true) {
  items = items.filter(function (item) {
    return !item.dismissed;
  });
}

if (config.read === true) {
  items = items.filter(function (item) {
    return item.read;
  });
} else if (config.read === false) {
  items = items.filter(function (item) {
    return !item.read;
  });
}

if (config.type) {
  validateEnum(config.type, TYPES, "type");

  items = items.filter(function (item) {
    return item.type === config.type;
  });
}

if (config.priority) {
  validateEnum(
    config.priority,
    PRIORITIES,
    "priority"
  );

  items = items.filter(function (item) {
    return item.priority === config.priority;
  });
}

items.sort(function (a, b) {
  return Date.parse(b.createdAt) -
    Date.parse(a.createdAt);
});

if (
  Number.isFinite(config.limit) &&
  config.limit >= 0
) {
  items = items.slice(
    0,
    Math.floor(config.limit)
  );
}

return clone(items);

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
const visible = data.items.filter(
function (item) {
return !item.dismissed;
}
);

const byType = {};
const byPriority = {};

TYPES.forEach(function (type) {
  byType[type] = visible.filter(
    function (item) {
      return item.type === type;
    }
  ).length;
});

PRIORITIES.forEach(function (priority) {
  byPriority[priority] = visible.filter(
    function (item) {
      return item.priority === priority;
    }
  ).length;
});

const readCount = visible.filter(
  function (item) {
    return item.read;
  }
).length;

return {
  total: visible.length,
  unread: visible.length - readCount,
  read: readCount,

  scheduled: visible.filter(
    function (item) {
      return Boolean(
        item.scheduledAt &&
        !item.deliveredAt
      );
    }
  ).length,

  byType,
  byPriority,
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
throw new Error(
"إعدادات الإشعارات غير صالحة."
);
}

const previous = clone(data.settings);

data.settings = normalizeSettings(
  Object.assign({}, data.settings, changes)
);

const previousItems = data.items;

if (
  data.items.length >
  data.settings.maxNotifications
) {
  data.items = data.items.slice(
    0,
    data.settings.maxNotifications
  );
}

try {
  persist();
} catch (error) {
  data.settings = previous;
  data.items = previousItems;
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
  permission
};

}

/* =======================================================
EXPORT
======================================================= */

function exportData() {
return {
format: FORMAT,
version: VERSION,
schemaVersion: 2,
exportedAt: nowISO(),
data: clone(data)
};
}

/* =======================================================
IMPORT VALIDATION
======================================================= */

function validateImport(payload) {
if (
!isPlainObject(payload) ||
payload.format !== FORMAT ||
!isPlainObject(payload.data) ||
!Array.isArray(payload.data.items)
) {
return {
success: false,
message: "ملف استيراد الإشعارات غير صالح."
};
}

if (payload.data.items.length > MAX_NOTIFICATIONS) {
  return {
    success: false,
    message: "تحتوي النسخة على عدد إشعارات يتجاوز الحد المسموح."
  };
}

try {
  const normalized = normalizeData(payload.data);

  return {
    success: true,
    message: "تم التحقق من بيانات الاستيراد.",
    data: normalized
  };
} catch (error) {
  return {
    success: false,
    message: error.message
  };
}

}

function importData(payload, options) {
const config = options || {};

if (config.confirmed !== true) {
  throw new Error(
    "يجب تأكيد استيراد الإشعارات قبل استبدال البيانات."
  );
}

const validated = validateImport(payload);

if (!validated.success) {
  throw new Error(validated.message);
}

const previous = data;
const next = validated.data;

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
Preserve the existing public method names.
======================================================= */

const NotificationManager = Object.freeze({
version: VERSION,

types: TYPES.slice(),
priorities: PRIORITIES.slice(),

add: addNotification,
create: addNotification,

getAll,
getById,
search,

markRead,
markUnread,
markAllRead,

dismiss,
delete: deleteNotification,
clearRead,
clearAll,

getUnreadCount,
getStatistics,

schedule,
cancelTimer,
restoreScheduledTimers,

getSettings,
updateSettings,
requestBrowserPermission,

exportData,
importData,
validateImport

});

global.NotificationManager = NotificationManager;

restoreScheduledTimers();

emit("ready", {
version: VERSION
});

})(window);
