
/* =========================================
   MY LIFE OS — BACKUP MANAGER
   File: backup.js
   Export and restore application data
========================================= */

const BackupManager = (() => {
    "use strict";

    const FORMAT_NAME = "MY_LIFE_OS_BACKUP";
    const FORMAT_VERSION = 1;

    /*
     * Keep this list synchronized with the
     * storage keys used by application modules.
     */
    const STORAGE_KEYS = [
        "goals",
        "tasks",
        "notes",
        "habits",
        "reviews",
        "schedule",
        "career-profile",
        "life-memos",
        "plan-90-days"
    ];

    function getStorageKey(key) {
        return "my-life-os:v1:" + key;
    }

    function readValue(key) {
        try {
            const raw = localStorage.getItem(getStorageKey(key));

            if (raw === null) {
                return null;
            }

            return JSON.parse(raw);
        } catch (error) {
            throw new Error("تعذر قراءة بيانات: " + key);
        }
    }

    function createBackup() {
        const data = {};

        try {
            for (const key of STORAGE_KEYS) {
                data[key] = readValue(key);
            }

            return {
                success: true,
                backup: {
                    format: FORMAT_NAME,
                    version: FORMAT_VERSION,
                    createdAt: new Date().toISOString(),
                    data: data
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || "تعذر إنشاء النسخة الاحتياطية."
            };
        }
    }

    function exportJSON() {
        const result = createBackup();

        if (!result.success) {
            return result;
        }

        return {
            success: true,
            json: JSON.stringify(result.backup, null, 2),
            filename:
                "my-life-os-backup-" +
                new Date().toISOString().slice(0, 10) +
                ".json"
        };
    }

    function downloadBackup() {
        const result = exportJSON();

        if (!result.success) {
            return result;
        }

        try {
            const blob = new Blob(
                [result.json],
                { type: "application/json;charset=utf-8" }
            );

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = result.filename;
            link.style.display = "none";

            document.body.appendChild(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(url);

            return {
                success: true,
                message: "تم تجهيز تنزيل النسخة الاحتياطية."
            };
        } catch (error) {
            return {
                success: false,
                message: "تعذر تنزيل النسخة الاحتياطية."
            };
        }
    }

    function validateBackup(backup) {
        if (!backup || typeof backup !== "object") {
            return {
                valid: false,
                message: "ملف النسخة الاحتياطية غير صالح."
            };
        }

        if (backup.format !== FORMAT_NAME) {
            return {
                valid: false,
                message: "الملف ليس نسخة احتياطية من MY LIFE OS."
            };
        }

        if (backup.version !== FORMAT_VERSION) {
            return {
                valid: false,
                message: "إصدار النسخة الاحتياطية غير مدعوم."
            };
        }

        if (!backup.data || typeof backup.data !== "object") {
            return {
                valid: false,
                message: "بيانات النسخة الاحتياطية مفقودة."
            };
        }

        for (const key of Object.keys(backup.data)) {
            if (!STORAGE_KEYS.includes(key)) {
                return {
                    valid: false,
                    message: "تحتوي النسخة على مفتاح بيانات غير معروف: " + key
                };
            }
        }

        return {
            valid: true,
            message: "النسخة الاحتياطية صالحة."
        };
    }

    function restoreJSON(jsonText, options = {}) {
        let backup;

        try {
            backup = JSON.parse(jsonText);
        } catch (error) {
            return {
                success: false,
                message: "تعذر قراءة الملف. تأكد أنه ملف JSON صالح."
            };
        }

        const validation = validateBackup(backup);

        if (!validation.valid) {
            return {
                success: false,
                message: validation.message
            };
        }

        if (options.confirmed !== true) {
            return {
                success: false,
                requiresConfirmation: true,
                message:
                    "استعادة النسخة قد تستبدل بيانات موجودة. " +
                    "أنشئ نسخة احتياطية من بياناتك الحالية أولًا."
            };
        }

        const previousValues = {};

        try {
            for (const key of STORAGE_KEYS) {
                const storageKey = getStorageKey(key);

                previousValues[key] = localStorage.getItem(storageKey);
            }

            for (const key of STORAGE_KEYS) {
                if (
                    Object.prototype.hasOwnProperty.call(
                        backup.data,
                        key
                    )
                ) {
                    const value = backup.data[key];
                    const storageKey = getStorageKey(key);

                    if (value === null) {
                        localStorage.removeItem(storageKey);
                    } else {
                        localStorage.setItem(
                            storageKey,
                            JSON.stringify(value)
                        );
                    }
                }
            }

            return {
                success: true,
                message:
                    "تمت استعادة النسخة الاحتياطية. " +
                    "أعد تحميل الصفحة لتحديث الواجهة."
            };
        } catch (error) {
            /*
             * Best-effort rollback if restoration fails.
             */
            try {
                for (const key of STORAGE_KEYS) {
                    const storageKey = getStorageKey(key);
                    const previous = previousValues[key];

                    if (previous === null || previous === undefined) {
                        localStorage.removeItem(storageKey);
                    } else {
                        localStorage.setItem(storageKey, previous);
                    }
                }
            } catch (rollbackError) {
                console.error(
                    "BackupManager: rollback failed.",
                    rollbackError
                );
            }

            return {
                success: false,
                message:
                    "فشلت الاستعادة. حاول مجددًا بعد التأكد من توفر مساحة تخزين."
            };
        }
    }

    return {
        STORAGE_KEYS,
        createBackup,
        exportJSON,
        downloadBackup,
        validateBackup,
        restoreJSON
    };
})();
