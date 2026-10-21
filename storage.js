/* ========================================
MY LIFE OS — مشروع القمة
STORAGE CORE — نظام التخزين المركزي
الإصدار: 2.0.0

المسؤوليات:

- حفظ واسترجاع بيانات التطبيق
- التوافق مع AppData في Data.js
- الحفاظ على البيانات القديمة وترحيلها بأمان
- دعم الحفظ الفوري عند استدعاء set()
- النسخ الاحتياطي المحلي
- تصدير البيانات واستيرادها والتحقق منها
- حماية البيانات من الحذف غير المقصود
  ======================================== */

"use strict";

(function (window) {
/* ========================================
1. INITIALIZATION
======================================== */

if (window.AppStorage) {
console.warn(
"[MY LIFE OS] AppStorage موجود مسبقًا."
);
return;
}

const AppData = window.AppData || null;
const DATA = AppData ? AppData.all : null;

const PREFIX =
DATA &&
DATA.app &&
typeof DATA.app.storagePrefix === "string"
? DATA.app.storagePrefix
: "my-life-os:";

const VERSION =
DATA &&
DATA.storage &&
Number.isInteger(DATA.storage.version)
? DATA.storage.version
: 2;

const LEGACY_VERSIONS = [1];

const BACKUP_PREFIX = "${PREFIX}backup:";
const STORAGE_TEST_KEY = "${PREFIX}storage-test";
const FORMAT = "my-life-os-backup";

const MAX_BACKUP_COUNT = 10;

/* ========================================
2. HELPERS
======================================== */

function isValidName(name) {
return (
typeof name === "string" &&
name.trim().length > 0 &&
name === name.trim() &&
!name.startsWith("v") &&
!name.includes("..") &&
!name.includes("\") &&
!name.includes("/") &&
!name.includes("\0") &&
name !== "storage-test"
);
}

function getStorage() {
try {
if (typeof window === "undefined") {
return null;
}

  return window.localStorage || null;
} catch (error) {
  return null;
}

}

function isPlainObject(value) {
if (!value || typeof value !== "object") {
return false;
}

const prototype = Object.getPrototypeOf(value);

return (
  prototype === Object.prototype ||
  prototype === null
);

}

function makeKey(name, version = VERSION) {
return "${PREFIX}v${version}:${name}";
}

function makeLegacyKeys(name) {
const keys = LEGACY_VERSIONS.map(
(version) => makeKey(name, version)
);

keys.push(`${PREFIX}${name}`);

return [...new Set(keys)];

}

function serialize(value) {
try {
const result = JSON.stringify(value);

  return typeof result === "string"
    ? { success: true, value: result }
    : {
        success: false,
        message: "البيانات غير قابلة للتحويل إلى JSON."
      };
} catch (error) {
  return {
    success: false,
    message: "تعذر تحويل البيانات إلى صيغة قابلة للحفظ."
  };
}

}

function parseJSON(rawValue) {
try {
return {
success: true,
value: JSON.parse(rawValue)
};
} catch (error) {
return {
success: false,
message: "البيانات المحفوظة ليست بصيغة JSON صحيحة."
};
}
}

function result(success, message, extra = {}) {
return {
success,
message,
...extra
};
}

function getDefinedNames() {
const keys =
DATA &&
DATA.storage &&
DATA.storage.keys;

if (!keys || typeof keys !== "object") {
  return [];
}

return Object.values(keys).filter(
  (name) => isValidName(name)
);

}

function getKnownNames() {
return [...new Set(getDefinedNames())];
}

/* ========================================
3. STORAGE AVAILABILITY
======================================== */

function isAvailable() {
const storage = getStorage();

if (!storage) {
  return false;
}

try {
  storage.setItem(STORAGE_TEST_KEY, "ok");
  storage.removeItem(STORAGE_TEST_KEY);

  return true;
} catch (error) {
  return false;
}

}

/* ========================================
4. READ DATA
Read the current version first.
Legacy data is migrated without deleting
the original source.
======================================== */

function get(name, fallback = null) {
if (!isValidName(name)) {
return fallback;
}

const storage = getStorage();

if (!storage) {
  return fallback;
}

try {
  const currentValue = storage.getItem(
    makeKey(name)
  );

  if (currentValue !== null) {
    const parsed = parseJSON(currentValue);

    return parsed.success
      ? parsed.value
      : fallback;
  }

  const legacyKeys = makeLegacyKeys(name);

  for (const legacyKey of legacyKeys) {
    const rawValue = storage.getItem(legacyKey);

    if (rawValue === null) {
      continue;
    }

    const parsed = parseJSON(rawValue);

    if (!parsed.success) {
      console.error(
        "[MY LIFE OS] تعذرت قراءة البيانات القديمة:",
        name
      );

      return fallback;
    }

    // ترحيل آمن: نحتفظ بالمصدر القديم.
    try {
      storage.setItem(
        makeKey(name),
        rawValue
      );
    } catch (migrationError) {
      console.warn(
        "[MY LIFE OS] تعذر ترحيل البيانات الآن:",
        name
      );
    }

    return parsed.value;
  }

  return fallback;
} catch (error) {
  console.error(
    "[MY LIFE OS] تعذرت قراءة البيانات:",
    name,
    error
  );

  return fallback;
}

}

/* ========================================
5. SAVE DATA
setItem writes synchronously.
Call set() after each intended change.
======================================== */

function set(name, value) {
if (!isValidName(name)) {
return result(
false,
"اسم مفتاح التخزين غير صالح."
);
}

const storage = getStorage();

if (!storage) {
  return result(
    false,
    "التخزين المحلي غير متاح."
  );
}

const serialized = serialize(value);

if (!serialized.success) {
  return result(false, serialized.message);
}

try {
  storage.setItem(
    makeKey(name),
    serialized.value
  );

  return result(
    true,
    "تم حفظ البيانات بنجاح.",
    { key: name }
  );
} catch (error) {
  console.error(
    "[MY LIFE OS] تعذر حفظ البيانات:",
    name,
    error
  );

  return result(
    false,
    "تعذر الحفظ. تحقق من مساحة التخزين وصلاحيات المتصفح."
  );
}

}

/* ========================================
6. REMOVE ONE KEY
======================================== */

function remove(name) {
if (!isValidName(name)) {
return false;
}

const storage = getStorage();

if (!storage) {
  return false;
}

try {
  storage.removeItem(makeKey(name));

  return true;
} catch (error) {
  console.error(
    "[MY LIFE OS] تعذر حذف البيانات:",
    name,
    error
  );

  return false;
}

}

/* ========================================
7. CHECK EXISTENCE
======================================== */

function has(name) {
if (!isValidName(name)) {
return false;
}

const storage = getStorage();

if (!storage) {
  return false;
}

try {
  if (storage.getItem(makeKey(name)) !== null) {
    return true;
  }

  return makeLegacyKeys(name).some(
    (key) => storage.getItem(key) !== null
  );
} catch (error) {
  return false;
}

}

/* ========================================
8. READ RAW VALUE
======================================== */

function getRaw(name) {
if (!isValidName(name)) {
return null;
}

const storage = getStorage();

if (!storage) {
  return null;
}

try {
  const current = storage.getItem(makeKey(name));

  if (current !== null) {
    return current;
  }

  for (const key of makeLegacyKeys(name)) {
    const value = storage.getItem(key);

    if (value !== null) {
      return value;
    }
  }

  return null;
} catch (error) {
  return null;
}

}

/* ========================================
9. DISCOVER APPLICATION KEYS
======================================== */

function getKeys() {
const storage = getStorage();

if (!storage) {
  return [];
}

const names = new Set(getKnownNames());

try {
  for (let i = 0; i < storage.length; i++) {
    const fullKey = storage.key(i);

    if (
      typeof fullKey !== "string" ||
      !fullKey.startsWith(PREFIX) ||
      fullKey.startsWith(BACKUP_PREFIX) ||
      fullKey === STORAGE_TEST_KEY
    ) {
      continue;
    }

    const versionedMatch = fullKey.match(
      /^.*:v\d+:(.+)$/
    );

    if (versionedMatch) {
      const name = versionedMatch[1];

      if (isValidName(name)) {
        names.add(name);
      }

      continue;
    }

    const unversionedName = fullKey.slice(
      PREFIX.length
    );

    if (isValidName(unversionedName)) {
      names.add(unversionedName);
    }
  }

  return [...names].filter((name) => has(name));
} catch (error) {
  console.error(
    "[MY LIFE OS] تعذر استرجاع مفاتيح التخزين.",
    error
  );

  return [...names];
}

}

/* ========================================
10. MIGRATE LEGACY DATA
Original keys are never deleted.
======================================== */

function migrate() {
const storage = getStorage();

if (!storage) {
  return result(
    false,
    "التخزين المحلي غير متاح."
  );
}

let migrated = 0;
let skipped = 0;
const errors = [];

const names = new Set([
  ...getKnownNames(),
  ...getKeys()
]);

for (const name of names) {
  if (!isValidName(name)) {
    continue;
  }

  try {
    const currentKey = makeKey(name);

    if (storage.getItem(currentKey) !== null) {
      skipped++;
      continue;
    }

    let found = false;

    for (const legacyKey of makeLegacyKeys(name)) {
      const oldValue = storage.getItem(legacyKey);

      if (oldValue === null) {
        continue;
      }

      const parsed = parseJSON(oldValue);

      if (!parsed.success) {
        errors.push(name);
        found = true;
        break;
      }

      storage.setItem(currentKey, oldValue);

      migrated++;
      found = true;
      break;
    }

    if (!found) {
      skipped++;
    }
  } catch (error) {
    errors.push(name);
  }
}

return result(
  errors.length === 0,
  errors.length
    ? "اكتمل الترحيل جزئيًا. البيانات القديمة لم تُحذف."
    : "اكتمل فحص وترحيل البيانات القديمة.",
  {
    migrated,
    skipped,
    errors
  }
);

}

/* ========================================
11. EXPORT DATA
Returns a JSON string.
Does not delete or modify saved records.
======================================== */

function exportData() {
const storage = getStorage();

if (!storage) {
  return result(
    false,
    "التخزين المحلي غير متاح."
  );
}

try {
  const names = new Set([
    ...getKnownNames(),
    ...getKeys()
  ]);

  const data = {};
  const errors = [];

  for (const name of names) {
    if (!isValidName(name) || !has(name)) {
      continue;
    }

    const raw = getRaw(name);

    if (raw === null) {
      continue;
    }

    const parsed = parseJSON(raw);

    if (!parsed.success) {
      errors.push(name);
      continue;
    }

    data[name] = parsed.value;
  }

  if (errors.length > 0) {
    return result(
      false,
      "تعذر التصدير الكامل بسبب بيانات غير سليمة.",
      { errors }
    );
  }

  const backup = {
    format: FORMAT,
    formatVersion: 1,
    app: "MY LIFE OS",
    appVersion: DATA?.app?.version || "unknown",
    storageVersion: VERSION,
    createdAt: new Date().toISOString(),
    data
  };

  const serialized = serialize(backup);

  if (!serialized.success) {
    return result(false, serialized.message);
  }

  return result(
    true,
    "تم تجهيز نسخة التصدير.",
    {
      content: serialized.value,
      count: Object.keys(data).length,
      createdAt: backup.createdAt
    }
  );
} catch (error) {
  return result(
    false,
    "تعذر إنشاء نسخة التصدير."
  );
}

}

/* ========================================
12. LOCAL BACKUPS
Stored separately from normal application
data and preserved by clearAll().
======================================== */

function listBackups() {
const storage = getStorage();

if (!storage) {
  return [];
}

const backups = [];

try {
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);

    if (
      typeof key !== "string" ||
      !key.startsWith(BACKUP_PREFIX)
    ) {
      continue;
    }

    const parsed = parseJSON(
      storage.getItem(key)
    );

    if (!parsed.success) {
      continue;
    }

    const backup = parsed.value;

    backups.push({
      id: key.slice(BACKUP_PREFIX.length),
      createdAt: backup.createdAt || null,
      count:
        backup.data &&
        typeof backup.data === "object"
          ? Object.keys(backup.data).length
          : 0
    });
  }

  return backups.sort((a, b) =>
    String(b.createdAt || "").localeCompare(
      String(a.createdAt || "")
    )
  );
} catch (error) {
  return [];
}

}

function createBackup(label = "manual") {
const storage = getStorage();

if (!storage) {
  return result(
    false,
    "التخزين المحلي غير متاح."
  );
}

const exported = exportData();

if (!exported.success) {
  return exported;
}

const backup = parseJSON(exported.content);

if (!backup.success) {
  return result(
    false,
    "تعذر التحقق من بيانات النسخة الاحتياطية."
  );
}

backup.value.label =
  typeof label === "string"
    ? label.slice(0, 80)
    : "manual";

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");

const key = `${BACKUP_PREFIX}${timestamp}`;

try {
  storage.setItem(
    key,
    JSON.stringify(backup.value)
  );

  // الاحتفاظ بآخر عشر نسخ محلية.
  const backups = listBackups();

  for (
    const oldBackup of backups.slice(MAX_BACKUP_COUNT)
  ) {
    storage.removeItem(
      `${BACKUP_PREFIX}${oldBackup.id}`
    );
  }

  return result(
    true,
    "تم إنشاء النسخة الاحتياطية المحلية.",
    {
      id: timestamp,
      count: exported.count
    }
  );
} catch (error) {
  console.error(
    "[MY LIFE OS] تعذر إنشاء النسخة الاحتياطية.",
    error
  );

  return result(
    false,
    "تعذر إنشاء النسخة الاحتياطية. قد تكون مساحة التخزين غير كافية."
  );
}

}

/* ========================================
13. VALIDATE IMPORT
======================================== */

function validateImport(input) {
let payload = input;

if (typeof input === "string") {
  const parsed = parseJSON(input);

  if (!parsed.success) {
    return result(
      false,
      "ملف النسخة الاحتياطية ليس JSON صالحًا."
    );
  }

  payload = parsed.value;
}

if (!isPlainObject(payload)) {
  return result(
    false,
    "بنية النسخة الاحتياطية غير صحيحة."
  );
}

if (
  payload.format !== FORMAT ||
  payload.formatVersion !== 1 ||
  !isPlainObject(payload.data)
) {
  return result(
    false,
    "تنسيق النسخة الاحتياطية أو إصدارها غير مدعوم."
  );
}

const cleanData = {};

for (const [name, value] of Object.entries(payload.data)) {
  if (!isValidName(name)) {
    return result(
      false,
      "تحتوي النسخة على اسم مفتاح غير صالح.",
      { invalidKey: name }
    );
  }

  const serialized = serialize(value);

  if (!serialized.success) {
    return result(
      false,
      "تحتوي النسخة على بيانات غير قابلة للحفظ.",
      { invalidKey: name }
    );
  }

  cleanData[name] = value;
}

return result(
  true,
  "النسخة الاحتياطية سليمة.",
  {
    data: cleanData,
    count: Object.keys(cleanData).length,
    createdAt: payload.createdAt || null
  }
);

}

/* ========================================
14. IMPORT DATA
Default mode: merge.
Replacement requires explicit confirmation.
======================================== */

function importData(input, options = {}) {
const storage = getStorage();

if (!storage) {
  return result(
    false,
    "التخزين المحلي غير متاح."
  );
}

const validated = validateImport(input);

if (!validated.success) {
  return validated;
}

const mode =
  options && options.mode === "replace"
    ? "replace"
    : "merge";

if (
  mode === "replace" &&
  options.confirmReplace !== true
) {
  return result(
    false,
    "يتطلب استبدال البيانات تأكيدًا صريحًا.",
    { requiresConfirmation: true }
  );
}

// فحص جميع البيانات قبل تغيير أي سجل.
const entries = Object.entries(validated.data);
const prepared = [];

for (const [name, value] of entries) {
  const serialized = serialize(value);

  if (!serialized.success) {
    return result(
      false,
      serialized.message,
      { invalidKey: name }
    );
  }

  prepared.push({
    name,
    value: serialized.value
  });
}

// أخذ نسخة محلية قبل الاستبدال.
if (
  mode === "replace" &&
  options.backupBeforeReplace !== false
) {
  const backupResult = createBackup(
    "before-import-replace"
  );

  if (!backupResult.success) {
    return result(
      false,
      "لم يتم الاستبدال لأن النسخة الاحتياطية السابقة لم تنجح.",
      { backup: backupResult }
    );
  }
}

if (mode === "replace") {
  const cleared = clearAll({ confirm: true });

  if (!cleared.success) {
    return result(
      false,
      "تعذر تجهيز التخزين للاستبدال.",
      { details: cleared }
    );
  }
}

let imported = 0;
const errors = [];

for (const entry of prepared) {
  try {
    storage.setItem(
      makeKey(entry.name),
      entry.value
    );

    imported++;
  } catch (error) {
    errors.push(entry.name);
  }
}

return result(
  errors.length === 0,
  errors.length
    ? "تم الاستيراد جزئيًا. راجع المفاتيح التي تعذر حفظها."
    : "تم استيراد البيانات بنجاح.",
  {
    imported,
    total: prepared.length,
    errors,
    mode
  }
);

}

/* ========================================
15. RESTORE LOCAL BACKUP
======================================== */

function restoreBackup(id, options = {}) {
if (
typeof id !== "string" ||
!id ||
id.includes("/") ||
id.includes("\") ||
id.includes("..")
) {
return result(
false,
"معرّف النسخة الاحتياطية غير صالح."
);
}

const storage = getStorage();

if (!storage) {
  return result(
    false,
    "التخزين المحلي غير متاح."
  );
}

try {
  const raw = storage.getItem(
    `${BACKUP_PREFIX}${id}`
  );

  if (raw === null) {
    return result(
      false,
      "لم يتم العثور على النسخة الاحتياطية."
    );
  }

  const validated = validateImport(raw);

  if (!validated.success) {
    return validated;
  }

  const mode =
    options.mode === "replace"
      ? "replace"
      : "merge";

  return importData(raw, {
    mode,
    confirmReplace: options.confirmReplace === true,
    backupBeforeReplace: true
  });
} catch (error) {
  return result(
    false,
    "تعذرت استعادة النسخة الاحتياطية."
  );
}

}

/* ========================================
16. CLEAR APPLICATION DATA
Requires explicit confirmation.
Local backup files are preserved.
======================================== */

function clearAll(options = {}) {
if (!options || options.confirm !== true) {
return result(
false,
"تأكيد الحذف مطلوب قبل مسح البيانات.",
{ requiresConfirmation: true }
);
}

const storage = getStorage();

if (!storage) {
  return result(
    false,
    "التخزين المحلي غير متاح."
  );
}

const keysToRemove = [];

try {
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);

    if (
      typeof key === "string" &&
      key.startsWith(PREFIX) &&
      !key.startsWith(BACKUP_PREFIX) &&
      key !== STORAGE_TEST_KEY
    ) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    storage.removeItem(key);
  }

  return result(
    true,
    "تم مسح بيانات التطبيق. النسخ الاحتياطية المحلية محفوظة.",
    { count: keysToRemove.length }
  );
} catch (error) {
  console.error(
    "[MY LIFE OS] تعذر مسح البيانات.",
    error
  );

  return result(
    false,
    "تعذر إكمال مسح البيانات."
  );
}

}

/* ========================================
17. STORAGE INFORMATION
======================================== */

function getInfo() {
const storage = getStorage();

return {
  available: isAvailable(),
  prefix: PREFIX,
  version: VERSION,
  backupCount: listBackups().length,
  keyCount: getKeys().length,
  appDataAvailable: Boolean(AppData),
  storageDefinitionAvailable: Boolean(
    DATA &&
    DATA.storage &&
    DATA.storage.keys
  )
};

}

/* ========================================
18. PUBLIC API
Preserve existing method names.
======================================== */

const AppStorage = Object.freeze({
get,
set,
remove,
has,
getRaw,
getKeys,
clearAll,
isAvailable,

// Extended API
migrate,
exportData,
importData,
createBackup,
listBackups,
restoreBackup,
validateImport,
getInfo

});

/* ========================================
19. REGISTER PUBLIC API
======================================== */

window.AppStorage = AppStorage;

console.info(
"[MY LIFE OS] تم تحميل نظام التخزين.",
{
version: VERSION,
appDataAvailable: Boolean(AppData)
}
);

})(window);
