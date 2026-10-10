
/* ========================================
   MY LIFE OS — Local Storage
   مسؤولية الملف:
   - حفظ واسترجاع بيانات جميع المجالات
   - توحيد مفاتيح التخزين
   - معالجة أخطاء الحفظ والقراءة
   - توفير واجهة مشتركة لبقية الملفات
======================================== */

"use strict";

(function () {
  const PREFIX = "my-life-os:";
  const VERSION = 1;
  const STORAGE_TEST_KEY = `${PREFIX}storage-test`;

  /*
    إنشاء المفتاح الموحد.
    نحافظ على صيغة الإصدار الحالي حتى لا نفقد
    الوصول إلى البيانات المحفوظة سابقًا.
  */
  function makeKey(name) {
    return `${PREFIX}v${VERSION}:${name}`;
  }

  /*
    التحقق من صحة اسم المفتاح.
  */
  function isValidName(name) {
    return (
      typeof name === "string" &&
      name.trim().length > 0
    );
  }

  /*
    التحقق من توفر التخزين المحلي.
  */
  function isAvailable() {
    try {
      if (typeof window === "undefined") {
        return false;
      }

      if (!window.localStorage) {
        return false;
      }

      window.localStorage.setItem(
        STORAGE_TEST_KEY,
        "ok"
      );

      window.localStorage.removeItem(
        STORAGE_TEST_KEY
      );

      return true;
    } catch (error) {
      return false;
    }
  }

  /*
    قراءة البيانات.
    fallback هي القيمة البديلة عند عدم وجود بيانات
    أو تعذر قراءتها.
  */
  function get(name, fallback = null) {
    if (!isValidName(name)) {
      console.warn(
        "MY LIFE OS: اسم مفتاح التخزين غير صالح."
      );

      return fallback;
    }

    if (!isAvailable()) {
      return fallback;
    }

    try {
      const rawValue = window.localStorage.getItem(
        makeKey(name)
      );

      if (rawValue === null) {
        return fallback;
      }

      return JSON.parse(rawValue);
    } catch (error) {
      console.error(
        "MY LIFE OS: تعذرت قراءة البيانات:",
        name,
        error
      );

      return fallback;
    }
  }

  /*
    حفظ البيانات.
    تعاد نتيجة واضحة ليتمكن الملف المستهلك
    من التحقق من نجاح الحفظ.
  */
  function set(name, value) {
    if (!isValidName(name)) {
      return {
        success: false,
        message: "اسم مفتاح التخزين غير صالح."
      };
    }

    if (!isAvailable()) {
      return {
        success: false,
        message: "التخزين المحلي غير متاح."
      };
    }

    try {
      const serializedValue = JSON.stringify(value);

      if (serializedValue === undefined) {
        return {
          success: false,
          message: "تعذر تحويل البيانات إلى صيغة قابلة للحفظ."
        };
      }

      window.localStorage.setItem(
        makeKey(name),
        serializedValue
      );

      return {
        success: true,
        message: "تم حفظ البيانات."
      };
    } catch (error) {
      console.error(
        "MY LIFE OS: تعذر حفظ البيانات:",
        name,
        error
      );

      return {
        success: false,
        message: "تعذر الحفظ. تحقق من مساحة التخزين والبيانات."
      };
    }
  }

  /*
    حذف بيانات مفتاح واحد.
  */
  function remove(name) {
    if (!isValidName(name) || !isAvailable()) {
      return false;
    }

    try {
      window.localStorage.removeItem(
        makeKey(name)
      );

      return true;
    } catch (error) {
      console.error(
        "MY LIFE OS: تعذر حذف البيانات:",
        name,
        error
      );

      return false;
    }
  }

  /*
    التحقق من وجود بيانات محفوظة.
  */
  function has(name) {
    if (!isValidName(name) || !isAvailable()) {
      return false;
    }

    try {
      return (
        window.localStorage.getItem(makeKey(name)) !== null
      );
    } catch (error) {
      return false;
    }
  }

  /*
    قراءة نسخة من البيانات الخام المحفوظة.
    مفيدة للنسخ الاحتياطي والفحص.
    لا تعدل البيانات الأصلية.
  */
  function getRaw(name) {
    if (!isValidName(name) || !isAvailable()) {
      return null;
    }

    try {
      return window.localStorage.getItem(makeKey(name));
    } catch (error) {
      return null;
    }
  }

  /*
    استرجاع أسماء المفاتيح التابعة لهذا التطبيق.
    تُرجع الأسماء المنطقية دون البادئة والإصدار.
  */
  function getKeys() {
    if (!isAvailable()) {
      return [];
    }

    try {
      const keys = [];
      const keyPrefix = `${PREFIX}v${VERSION}:`;
      const storage = window.localStorage;

      for (let i = 0; i < storage.length; i++) {
        const fullKey = storage.key(i);

        if (
          typeof fullKey === "string" &&
          fullKey.startsWith(keyPrefix)
        ) {
          keys.push(
            fullKey.slice(keyPrefix.length)
          );
        }
      }

      return keys;
    } catch (error) {
      console.error(
        "MY LIFE OS: تعذر استرجاع مفاتيح التخزين.",
        error
      );

      return [];
    }
  }

  /*
    مسح بيانات التطبيق فقط.
    لا تُستخدم هذه الوظيفة إلا عند طلب مسح البيانات
    صراحة، ولا تمس بيانات المواقع الأخرى.
  */
  function clearAll() {
    if (!isAvailable()) {
      return {
        success: false,
        message: "التخزين المحلي غير متاح."
      };
    }

    try {
      const keysToRemove = [];
      const keyPrefix = `${PREFIX}v${VERSION}:`;
      const storage = window.localStorage;

      for (let i = 0; i < storage.length; i++) {
        const fullKey = storage.key(i);

        if (
          typeof fullKey === "string" &&
          fullKey.startsWith(keyPrefix)
        ) {
          keysToRemove.push(fullKey);
        }
      }

      keysToRemove.forEach((key) => {
        storage.removeItem(key);
      });

      return {
        success: true,
        message: "تم مسح بيانات MY LIFE OS.",
        count: keysToRemove.length
      };
    } catch (error) {
      console.error(
        "MY LIFE OS: تعذر مسح البيانات.",
        error
      );

      return {
        success: false,
        message: "تعذر إكمال مسح البيانات."
      };
    }
  }

  /*
    الواجهة العامة المشتركة.
  */
  const AppStorage = Object.freeze({
    get,
    set,
    remove,
    has,
    getRaw,
    getKeys,
    clearAll,
    isAvailable
  });

  /*
    إتاحته لبقية الملفات التي تستخدم window.
  */
  if (typeof window !== "undefined") {
    window.AppStorage = AppStorage;
  }
})();
