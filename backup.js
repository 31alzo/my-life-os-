/* =========================================================
MY LIFE OS — BACKUP MANAGER
File: backup.js
Version: 1.0.0

الوظائف:

- تصدير نسخة احتياطية بصيغة JSON.
- استيراد نسخة احتياطية والتحقق منها.
- معاينة معلومات النسخة قبل الاستعادة.
- التحقق من حجم الملف وبنيته.
- طلب تأكيد قبل استبدال البيانات.
- دعم AppStorage مع بديل localStorage.
- توفير واجهة عامة باسم window.BackupManager.

ملاحظة:
يجب اختبار تكامل واجهة التخزين مع Storage.js
قبل اعتبار الاستعادة متوافقة نهائيًا مع التطبيق.
========================================================= */

(function (global) {
"use strict";

if (global.BackupManager) {
return;
}

const VERSION = "1.0.0";
const FORMAT = "MY_LIFE_OS_BACKUP";
const MAX_IMPORT_SIZE = 20 * 1024 * 1024;

const DEFAULT_OPTIONS = {
filePrefix: "my-life-os-backup",
prettyPrint: true,
maxImportSize: MAX_IMPORT_SIZE
};

let options = Object.assign({}, DEFAULT_OPTIONS);

let pendingImport = null;

/* =======================================================
ERRORS
======================================================= */

function createError(code, message) {
const error = new Error(message);
error.code = code;
return error;
}

/* =======================================================
UTILITIES
======================================================= */

function getTimestamp() {
return new Date().toISOString();
}

function safeString(value) {
return String(value == null ? "" : value);
}

function cloneJSON(value) {
return JSON.parse(JSON.stringify(value));
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

function getStorage() {
if (global.AppStorage) {
return global.AppStorage;
}

if (global.localStorage) {
  return global.localStorage;
}

throw createError(
  "STORAGE_UNAVAILABLE",
  "لم يتم العثور على وسيلة تخزين متاحة."
);

}

function notify(type, message, details) {
const payload = {
type: type,
message: message,
details: details || null,
timestamp: getTimestamp()
};

try {
  if (global.AppEvents &&
      typeof global.AppEvents.emit === "function") {
    global.AppEvents.emit("backup:" + type, payload);
  }
} catch (error) {
  // لا نوقف العملية بسبب فشل نظام الأحداث.
}

try {
  if (typeof global.dispatchEvent === "function" &&
      typeof global.CustomEvent === "function") {
    global.dispatchEvent(
      new CustomEvent("my-life-os:backup", {
        detail: payload
      })
    );
  }
} catch (error) {
  // قد لا تكون بيئة التشغيل تدعم CustomEvent.
}

return payload;

}

/* =======================================================
STORAGE ADAPTER
======================================================= */

function readLocalStorage() {
const result = {};

const storage = global.localStorage;

if (!storage) {
  throw createError(
    "STORAGE_UNAVAILABLE",
    "التخزين المحلي غير متاح."
  );
}

for (let index = 0; index < storage.length; index++) {
  const key = storage.key(index);

  if (key === null) {
    continue;
  }

  const value = storage.getItem(key);

  result[key] = value;
}

return result;

}

function readAppStorage() {
const storage = global.AppStorage;

if (!storage) {
  return readLocalStorage();
}

/*
  نستخدم واجهة تصدير معروفة فقط إن كانت موجودة.
  لا نفترض أن getAll أو export متاحة في كل تنفيذ.
*/

if (typeof storage.exportAll === "function") {
  return storage.exportAll();
}

if (typeof storage.getAll === "function") {
  return storage.getAll();
}

if (typeof storage.export === "function") {
  return storage.export();
}

/*
  إن كان AppStorage مجرد غلاف غير موثق،
  نتجنب افتراض طريقة قراءة بياناته.
*/

if (global.localStorage) {
  return readLocalStorage();
}

throw createError(
  "STORAGE_API_UNKNOWN",
  "واجهة AppStorage لا توفر دالة تصدير معروفة."
);

}

function collectApplicationData() {
let data;

if (global.AppStorage) {
  data = readAppStorage();
} else {
  data = readLocalStorage();
}

if (data && typeof data.then === "function") {
  throw createError(
    "ASYNC_STORAGE_UNSUPPORTED",
    "واجهة التخزين غير متزامنة؛ يلزم استخدام التصدير غير المتزامن."
  );
}

if (!isPlainObject(data) && !Array.isArray(data)) {
  throw createError(
    "INVALID_STORAGE_DATA",
    "أعادت واجهة التخزين بيانات بتنسيق غير مدعوم."
  );
}

return cloneJSON(data);

}

/* =======================================================
BACKUP CREATION
======================================================= */

function createBackup(optionsOverride) {
const custom = Object.assign({}, options, optionsOverride || {});

const data = collectApplicationData();

const backup = {
  format: FORMAT,
  version: VERSION,
  application: "MY LIFE OS",
  createdAt: getTimestamp(),
  metadata: {
    platform: safeString(
      global.navigator && global.navigator.platform
    ),
    language: safeString(
      global.navigator && global.navigator.language
    ),
    storageType: global.AppStorage
      ? "AppStorage"
      : "localStorage"
  },
  data: data
};

if (custom.includeChecksum === true) {
  /*
    لا يُفعّل checksum إلا إذا أضيفت آلية تحقق
    تشفيرية مستقلة؛ لا نضع بصمة شكلية.
  */
  throw createError(
    "CHECKSUM_NOT_IMPLEMENTED",
    "التحقق التشفيري من البصمة غير مفعّل في هذا الإصدار."
  );
}

return backup;

}

function serializeBackup(backup, prettyPrint) {
return JSON.stringify(
backup,
null,
prettyPrint === false ? 0 : 2
);
}

function buildFilename() {
const date = new Date();
const pad = function (value) {
return String(value).padStart(2, "0");
};

const stamp =
  date.getFullYear() +
  "-" +
  pad(date.getMonth() + 1) +
  "-" +
  pad(date.getDate()) +
  "_" +
  pad(date.getHours()) +
  "-" +
  pad(date.getMinutes()) +
  "-" +
  pad(date.getSeconds());

return options.filePrefix + "-" + stamp + ".json";

}

function downloadTextFile(content, filename) {
if (!global.document ||
typeof global.Blob !== "function" ||
!global.URL ||
typeof global.URL.createObjectURL !== "function") {
throw createError(
"DOWNLOAD_UNAVAILABLE",
"تنزيل الملفات غير متاح في بيئة التشغيل الحالية."
);
}

const blob = new Blob(
  [content],
  { type: "application/json;charset=utf-8" }
);

const url = global.URL.createObjectURL(blob);
const link = global.document.createElement("a");

link.href = url;
link.download = filename;
link.style.display = "none";

global.document.body.appendChild(link);

try {
  link.click();
} finally {
  link.remove();

  global.setTimeout(function () {
    global.URL.revokeObjectURL(url);
  }, 1000);
}

return {
  filename: filename,
  size: blob.size,
  mimeType: blob.type
};

}

function exportBackup(optionsOverride) {
const custom = Object.assign({}, options, optionsOverride || {});
const backup = createBackup(custom);

const content = serializeBackup(
  backup,
  custom.prettyPrint
);

const result = downloadTextFile(
  content,
  custom.filename || buildFilename()
);

notify(
  "exported",
  "تم إنشاء ملف النسخة الاحتياطية.",
  result
);

return {
  success: true,
  backup: backup,
  file: result
};

}

/* =======================================================
BACKUP VALIDATION
======================================================= */

function validateBackupObject(backup) {
const errors = [];
const warnings = [];

if (!isPlainObject(backup)) {
  return {
    valid: false,
    errors: ["يجب أن تكون النسخة كائن JSON صالحًا."],
    warnings: []
  };
}

if (backup.format !== FORMAT) {
  errors.push("صيغة الملف ليست صيغة MY LIFE OS المعتمدة.");
}

if (typeof backup.version !== "string") {
  errors.push("إصدار النسخة مفقود أو غير صالح.");
}

if (!backup.data ||
    (!isPlainObject(backup.data) &&
     !Array.isArray(backup.data))) {
  errors.push("بيانات النسخة مفقودة أو غير صالحة.");
}

if (typeof backup.createdAt !== "string") {
  warnings.push("لا يحتوي الملف على تاريخ إنشاء صالح.");
} else if (Number.isNaN(Date.parse(backup.createdAt))) {
  warnings.push("تعذر قراءة تاريخ إنشاء النسخة.");
}

if (backup.version && backup.version !== VERSION) {
  warnings.push(
    "إصدار النسخة يختلف عن إصدار مدير النسخ الاحتياطي الحالي."
  );
}

return {
  valid: errors.length === 0,
  errors: errors,
  warnings: warnings
};

}

function parseBackupText(text) {
if (typeof text !== "string" || !text.trim()) {
throw createError(
"EMPTY_BACKUP",
"ملف النسخة الاحتياطية فارغ."
);
}

if (text.length > options.maxImportSize) {
  throw createError(
    "BACKUP_TOO_LARGE",
    "حجم ملف النسخة الاحتياطية أكبر من الحد المسموح."
  );
}

let backup;

try {
  backup = JSON.parse(text);
} catch (error) {
  throw createError(
    "INVALID_JSON",
    "تعذر قراءة الملف؛ تأكد أنه ملف JSON صالح."
  );
}

const validation = validateBackupObject(backup);

if (!validation.valid) {
  throw createError(
    "INVALID_BACKUP",
    validation.errors.join(" ")
  );
}

return {
  backup: backup,
  validation: validation
};

}

/* =======================================================
FILE SELECTION
======================================================= */

function selectBackupFile() {
return new Promise(function (resolve, reject) {
if (!global.document) {
reject(
createError(
"FILE_PICKER_UNAVAILABLE",
"اختيار الملفات غير متاح."
)
);
return;
}

  const input = global.document.createElement("input");

  input.type = "file";
  input.accept = ".json,application/json";
  input.style.display = "none";

  let settled = false;

  function cleanup() {
    input.remove();
  }

  input.addEventListener("change", function () {
    if (settled) {
      return;
    }

    const file = input.files && input.files[0];

    if (!file) {
      settled = true;
      cleanup();
      reject(
        createError(
          "NO_FILE_SELECTED",
          "لم يتم اختيار ملف."
        )
      );
      return;
    }

    if (file.size > options.maxImportSize) {
      settled = true;
      cleanup();
      reject(
        createError(
          "BACKUP_TOO_LARGE",
          "حجم الملف يتجاوز الحد المسموح."
        )
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = function () {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();

      try {
        const parsed = parseBackupText(
          safeString(reader.result)
        );

        resolve({
          file: {
            name: file.name,
            size: file.size,
            type: file.type
          },
          backup: parsed.backup,
          validation: parsed.validation
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = function () {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();

      reject(
        createError(
          "FILE_READ_FAILED",
          "حدث خطأ أثناء قراءة الملف."
        )
      );
    };

    reader.readAsText(file);
  });

  global.document.body.appendChild(input);
  input.click();
});

}

/* =======================================================
IMPORT PREVIEW
======================================================= */

async function previewImport() {
const result = await selectBackupFile();

pendingImport = {
  backup: result.backup,
  validation: result.validation,
  file: result.file,
  previewedAt: getTimestamp()
};

const preview = {
  success: true,
  file: result.file,
  format: result.backup.format,
  version: result.backup.version,
  application: result.backup.application || "غير محدد",
  createdAt: result.backup.createdAt || null,
  dataKeys: isPlainObject(result.backup.data)
    ? Object.keys(result.backup.data)
    : [],
  warnings: result.validation.warnings.slice(),
  message: "تم التحقق من بنية الملف. لم تتم استعادة البيانات بعد."
};

notify("import-previewed", preview.message, preview);

return preview;

}

/* =======================================================
RESTORE STRATEGY
======================================================= */

function replaceLocalStorageData(data) {
if (!global.localStorage) {
throw createError(
"STORAGE_UNAVAILABLE",
"التخزين المحلي غير متاح."
);
}

if (!isPlainObject(data)) {
  throw createError(
    "UNSUPPORTED_RESTORE_FORMAT",
    "لا يمكن استعادة هذه البنية إلى localStorage مباشرة."
  );
}

const storage = global.localStorage;
const snapshot = {};

for (let index = 0; index < storage.length; index++) {
  const key = storage.key(index);

  if (key !== null) {
    snapshot[key] = storage.getItem(key);
  }
}

try {
  storage.clear();

  Object.keys(data).forEach(function (key) {
    const value = data[key];

    storage.setItem(
      key,
      typeof value === "string"
        ? value
        : JSON.stringify(value)
    );
  });

  return {
    success: true,
    restoredKeys: Object.keys(data).length
  };
} catch (error) {
  /*
    محاولة استعادة لقطة التخزين السابقة إذا فشلت
    عملية الاستعادة الجديدة.
  */

  try {
    storage.clear();

    Object.keys(snapshot).forEach(function (key) {
      storage.setItem(key, snapshot[key]);
    });
  } catch (rollbackError) {
    throw createError(
      "RESTORE_AND_ROLLBACK_FAILED",
      "فشلت الاستعادة وفشلت محاولة إعادة البيانات السابقة. تحقق من التخزين فورًا."
    );
  }

  throw createError(
    "RESTORE_FAILED",
    "فشلت الاستعادة؛ تمت محاولة إعادة البيانات السابقة."
  );
}

}

function replaceAppStorageData(data) {
const storage = global.AppStorage;

if (!storage) {
  return replaceLocalStorageData(data);
}

/*
  لا نفترض أسماء دوال الاستبدال في AppStorage.
  نستخدم فقط واجهة صريحة إذا كانت متوفرة.
*/

if (typeof storage.importAll === "function") {
  return storage.importAll(data);
}

if (typeof storage.replaceAll === "function") {
  return storage.replaceAll(data);
}

if (typeof storage.restore === "function") {
  return storage.restore(data);
}

/*
  لا نمسح localStorage تلقائيًا عند وجود AppStorage
  غير معروف؛ فقد يكون مصدر البيانات مختلفًا.
*/

throw createError(
  "RESTORE_API_UNKNOWN",
  "واجهة AppStorage لا توفر دالة استعادة معروفة. لم يتم تغيير البيانات."
);

}

async function restorePendingImport(optionsOverride) {
const custom = optionsOverride || {};

if (!pendingImport || !pendingImport.backup) {
  throw createError(
    "NO_PENDING_IMPORT",
    "يجب اختيار ملف والتحقق منه قبل الاستعادة."
  );
}

if (custom.confirmed !== true) {
  throw createError(
    "CONFIRMATION_REQUIRED",
    "يجب تأكيد الاستعادة صراحة قبل استبدال البيانات."
  );
}

const validation = validateBackupObject(
  pendingImport.backup
);

if (!validation.valid) {
  pendingImport = null;

  throw createError(
    "INVALID_BACKUP",
    "لم تعد النسخة صالحة للاستعادة."
  );
}

const data = cloneJSON(pendingImport.backup.data);

/*
  نحتفظ بالنسخة في الذاكرة حتى تنتهي العملية.
  يجب التأكد من توافق البنية مع Storage.js
  قبل تفعيل الاستعادة في النسخة النهائية.
*/

const result = replaceAppStorageData(data);

if (result && typeof result.then === "function") {
  await result;
}

const restored = {
  success: true,
  restoredAt: getTimestamp(),
  sourceFile: pendingImport.file.name,
  sourceCreatedAt: pendingImport.backup.createdAt,
  restoredKeys: isPlainObject(data)
    ? Object.keys(data).length
    : data.length
};

pendingImport = null;

notify(
  "restored",
  "اكتملت عملية استعادة البيانات.",
  restored
);

return restored;

}

function cancelImport() {
pendingImport = null;

notify(
  "import-cancelled",
  "تم إلغاء عملية الاستعادة."
);

return {
  success: true,
  message: "تم إلغاء الاستعادة."
};

}

/* =======================================================
EXPORT RAW DATA
======================================================= */

function getBackupJSON(optionsOverride) {
const custom = Object.assign({}, options, optionsOverride || {});
const backup = createBackup(custom);

return serializeBackup(
  backup,
  custom.prettyPrint
);

}

function getPendingImportInfo() {
if (!pendingImport) {
return null;
}

return {
  file: Object.assign({}, pendingImport.file),
  validation: cloneJSON(pendingImport.validation),
  previewedAt: pendingImport.previewedAt
};

}

/* =======================================================
CONFIGURATION
======================================================= */

function configure(newOptions) {
if (!isPlainObject(newOptions)) {
throw createError(
"INVALID_OPTIONS",
"إعدادات النسخ الاحتياطي يجب أن تكون كائنًا صالحًا."
);
}

options = Object.assign({}, options, newOptions);

if (
  !Number.isFinite(options.maxImportSize) ||
  options.maxImportSize < 1024
) {
  options.maxImportSize = MAX_IMPORT_SIZE;
}

if (typeof options.filePrefix !== "string" ||
    !options.filePrefix.trim()) {
  options.filePrefix = DEFAULT_OPTIONS.filePrefix;
}

return getConfig();

}

function getConfig() {
return Object.assign({}, options);
}

/* =======================================================
PUBLIC API
======================================================= */

const BackupManager = {
version: VERSION,

createBackup: createBackup,
exportBackup: exportBackup,
getBackupJSON: getBackupJSON,

validateBackup: validateBackupObject,
parseBackupText: parseBackupText,

previewImport: previewImport,
restorePendingImport: restorePendingImport,
cancelImport: cancelImport,
getPendingImportInfo: getPendingImportInfo,

configure: configure,
getConfig: getConfig

};

global.BackupManager = BackupManager;

notify(
"ready",
"تم تحميل مدير النسخ الاحتياطي."
);

})(window);