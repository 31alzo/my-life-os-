
/* ========================================
   MY LIFE OS — Local Storage
   مسؤولية الملف: حفظ واسترجاع البيانات
======================================== */

"use strict";

const AppStorage = (() => {
  const PREFIX = "my-life-os:";
  const VERSION = 1;

  function makeKey(name) {
    return `${PREFIX}v${VERSION}:${name}`;
  }

  function isAvailable() {
    try {
      const testKey = `${PREFIX}storage-test`;
      localStorage.setItem(testKey, "ok");
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  function get(name, fallback = null) {
    if (!isAvailable()) {
      return fallback;
    }

    try {
      const value = localStorage.getItem(makeKey(name));

      if (value === null) {
        return fallback;
      }

      return JSON.parse(value);
    } catch (error) {
      console.error("تعذر قراءة البيانات:", name);
      return fallback;
    }
  }

  function set(name, value) {
    if (!isAvailable()) {
      return {
        success: false,
        message: "التخزين المحلي غير متاح."
      };
    }

    try {
      localStorage.setItem(
        makeKey(name),
        JSON.stringify(value)
      );

      return {
        success: true,
        message: "تم حفظ البيانات."
      };
    } catch (error) {
      return {
        success: false,
        message: "تعذر الحفظ. قد تكون مساحة التخزين ممتلئة."
      };
    }
  }

  function remove(name) {
    if (!isAvailable()) {
      return false;
    }

    try {
      localStorage.removeItem(makeKey(name));
      return true;
    } catch (error) {
      return false;
    }
  }

  return Object.freeze({
    get,
    set,
    remove,
    isAvailable
  });
})();
