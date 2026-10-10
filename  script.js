
/* ========================================
   مشروع القمة — MY LIFE OS
   الملف الأساسي للوظائف
======================================== */

"use strict";

/* ========================================
   1. إعدادات المشروع
======================================== */

const APP_CONFIG = {
  name: "MY LIFE OS",
  arabicName: "مشروع القمة",
  version: "0.1.0",
  language: "ar",
  direction: "rtl"
};

/* ========================================
   2. أدوات عامة
======================================== */

const AppUtils = {
  getToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  },

  createId() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2)
    );
  },

  isNonEmptyString(value) {
    return (
      typeof value === "string" &&
      value.trim().length > 0
    );
  }
};

/* ========================================
   3. حالة التطبيق
======================================== */

const AppState = {
  initialized: false,
  today: null
};

/* ========================================
   4. تهيئة التطبيق
======================================== */

function initializeApp() {
  if (AppState.initialized) {
    return;
  }

  AppState.today = AppUtils.getToday();
  AppState.initialized = true;

  console.info(
    `${APP_CONFIG.arabicName} — تم تحميل الأساس بنجاح.`
  );
}

/* ========================================
   5. تشغيل التطبيق
======================================== */

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeApp,
    { once: true }
  );
} else {
  initializeApp();
}
