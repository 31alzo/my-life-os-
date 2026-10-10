
/* ========================================
   MY LIFE OS — مشروع القمة
   DATA CORE — البيانات المركزية
   الإصدار: 1.0.0
======================================== */

"use strict";

(function (window) {
  if (window.AppData) {
    console.warn("[MY LIFE OS] AppData موجود مسبقًا.");
    return;
  }

  const deepFreeze = (value) => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }

    Object.freeze(value);

    Object.keys(value).forEach((key) => {
      deepFreeze(value[key]);
    });

    return value;
  };

  const DATA = {
    app: {
      id: "my-life-os",
      name: "MY LIFE OS",
      nameAr: "مشروع القمة",
      version: "1.0.0",
      language: "ar",
      direction: "rtl",
      storagePrefix: "my-life-os:"
    },

    lifeDomains: [
      {
        id: "faith",
        title: "علاقتي بالله",
        description: "العبادات والتأمل والالتزام الروحي",
        icon: "🤲",
        color: "gold",
        order: 1
      },
      {
        id: "health",
        title: "صحتي ومظهري",
        description: "النوم والرياضة والعناية بالنفس",
        icon: "💪",
        color: "green",
        order: 2
      },
      {
        id: "learning",
        title: "تعليمي وتطوري",
        description: "الدراسة والمعرفة والمهارات والشهادات",
        icon: "📚",
        color: "blue",
        order: 3
      },
      {
        id: "career",
        title: "مساري المهني",
        description: "العمل والخبرة والمشاريع والفرص المهنية",
        icon: "🎓",
        color: "blue",
        order: 4
      },
      {
        id: "finance",
        title: "مالي واستقلالي",
        description: "الدخل والمصروفات والادخار والتخطيط المالي",
        icon: "💰",
        color: "gold",
        order: 5
      },
      {
        id: "relationships",
        title: "علاقاتي",
        description: "العائلة والتواصل والثقة والحدود الصحية",
        icon: "🤝",
        color: "purple",
        order: 6
      },
      {
        id: "discipline",
        title: "الانضباط والعادات",
        description: "إدارة الوقت وبناء العادات وتقليل المشتتات",
        icon: "🧭",
        color: "orange",
        order: 7
      },
      {
        id: "digital-life",
        title: "حياتي الرقمية",
        description: "إدارة الهاتف والإنترنت والمحتوى الرقمي",
        icon: "📱",
        color: "blue",
        order: 8
      },
      {
        id: "personal",
        title: "شخصيتي وحياتي",
        description: "الوعي الذاتي والثقة والأولويات وجودة الحياة",
        icon: "🌱",
        color: "green",
        order: 9
      }
    ],

    goalCategories: [
      { id: "personal", title: "شخصي", icon: "🌱" },
      { id: "education", title: "تعليمي", icon: "📚" },
      { id: "career", title: "مهني", icon: "🎓" },
      { id: "finance", title: "مالي", icon: "💰" },
      { id: "health", title: "صحي", icon: "💪" },
      { id: "faith", title: "روحي", icon: "🤲" },
      { id: "social", title: "اجتماعي", icon: "🤝" },
      { id: "discipline", title: "انضباط وعادات", icon: "🧭" },
      { id: "digital", title: "رقمي", icon: "📱" }
    ],

    priorities: [
      { id: "low", title: "منخفضة", weight: 1 },
      { id: "medium", title: "متوسطة", weight: 2 },
      { id: "high", title: "عالية", weight: 3 },
      { id: "urgent", title: "عاجلة", weight: 4 }
    ],

    goalStatuses: [
      { id: "not-started", title: "لم يبدأ" },
      { id: "active", title: "قيد التنفيذ" },
      { id: "completed", title: "مكتمل" },
      { id: "paused", title: "متوقف مؤقتًا" },
      { id: "cancelled", title: "ملغي" }
    ],

    taskStatuses: [
      { id: "pending", title: "معلقة" },
      { id: "in-progress", title: "قيد التنفيذ" },
      { id: "completed", title: "مكتملة" },
      { id: "deferred", title: "مؤجلة" },
      { id: "cancelled", title: "ملغاة" }
    ],

    habitFrequencies: [
      { id: "daily", title: "يوميًا" },
      { id: "weekly", title: "أسبوعيًا" },
      { id: "custom", title: "أيام محددة" }
    ],

    reviewPeriods: [
      { id: "daily", title: "مراجعة يومية" },
      { id: "weekly", title: "مراجعة أسبوعية" },
      { id: "monthly", title: "مراجعة شهرية" },
      { id: "quarterly", title: "مراجعة فصلية" }
    ],

    ninetyDayPhases: [
      {
        id: 1,
        title: "المرحلة الأولى",
        startDay: 1,
        endDay: 30,
        focus: "فهم العادات والمحفزات وتنظيم البيئة"
      },
      {
        id: 2,
        title: "المرحلة الثانية",
        startDay: 31,
        endDay: 60,
        focus: "تقوية البدائل والعادات المفيدة"
      },
      {
        id: 3,
        title: "المرحلة الثالثة",
        startDay: 61,
        endDay: 90,
        focus: "تثبيت التقدم ووضع خطة للاستمرار"
      }
    ],

    careerCredentials: [
      {
        id: "concours",
        title: "شهادة الكونكور",
        category: "education",
        status: "not-started"
      },
      {
        id: "brevet",
        title: "شهادة البريفيه",
        category: "education",
        status: "not-started"
      },
      {
        id: "baccalaureate",
        title: "شهادة البكالوريا",
        category: "education",
        status: "not-started"
      },
      {
        id: "higher-education",
        title: "الدراسة الجامعية",
        category: "education",
        status: "not-started"
      },
      {
        id: "technical-training",
        title: "التكوين والشهادات التقنية",
        category: "training",
        status: "not-started"
      },
      {
        id: "languages",
        title: "شهادات اللغات",
        category: "language",
        status: "not-started"
      },
      {
        id: "digital-skills",
        title: "المهارات الرقمية والذكاء الاصطناعي",
        category: "digital",
        status: "not-started"
      },
      {
        id: "experience",
        title: "التدريب والخبرة والمشاريع العملية",
        category: "experience",
        status: "not-started"
      }
    ],

    textWorkspace: {
      supportedTypes: [
        "goal",
        "task",
        "habit",
        "note",
        "information",
        "instruction",
        "idea",
        "step",
        "other"
      ],

      statuses: [
        { id: "pending", title: "بانتظار المراجعة" },
        { id: "approved", title: "تمت الموافقة" },
        { id: "edited", title: "تم التعديل" },
        { id: "converted", title: "تم التحويل" },
        { id: "rejected", title: "مرفوض" }
      ],

      conversionTargets: [
        { id: "goal", title: "هدف" },
        { id: "task", title: "مهمة" },
        { id: "habit", title: "عادة" },
        { id: "note", title: "ملاحظة" }
      ],

      preserveOriginal: true,
      requireApprovalBeforeConversion: true
    },

    settings: {
      language: "ar",
      direction: "rtl",
      theme: "dark",
      accentColor: "gold",
      startPage: "dashboard",
      weekStartsOn: 6,
      notificationsEnabled: true,
      confirmBeforeDelete: true
    },

    storage: {
      version: 1,
      keys: {
        settings: "settings",
        goals: "goals",
        tasks: "tasks",
        habits: "habits",
        notes: "notes",
        memos: "memos",
        schedule: "schedule",
        reviews: "reviews",
        lifeDomains: "life-domains",
        plan90: "plan90",
        finance: "finance",
        health: "health",
        sport: "sport",
        relationships: "relationships",
        learning: "learning",
        career: "career",
        digitalLife: "digital-life",
        notifications: "notifications",
        affirmations: "affirmations",
        textWorkspace: "text-workspace",
        backupHistory: "backup-history"
      }
    }
  };

  deepFreeze(DATA);

  const AppData = {
    all: DATA,

    get(section) {
      if (!section || typeof section !== "string") {
        return null;
      }

      return Object.prototype.hasOwnProperty.call(DATA, section)
        ? DATA[section]
        : null;
    },

    getDomain(id) {
      return DATA.lifeDomains.find((item) => item.id === id) || null;
    },

    getGoalCategory(id) {
      return DATA.goalCategories.find((item) => item.id === id) || null;
    },

    getPriority(id) {
      return DATA.priorities.find((item) => item.id === id) || null;
    },

    getTaskStatus(id) {
      return DATA.taskStatuses.find((item) => item.id === id) || null;
    },

    getGoalStatus(id) {
      return DATA.goalStatuses.find((item) => item.id === id) || null;
    },

    getNinetyDayPhase(day) {
      const number = Number(day);

      if (!Number.isFinite(number) || number < 1 || number > 90) {
        return null;
      }

      return DATA.ninetyDayPhases.find(
        (phase) =>
          number >= phase.startDay &&
          number <= phase.endDay
      ) || null;
    },

    getStorageKey(name) {
      const key = DATA.storage.keys[name];

      return typeof key === "string" ? key : null;
    }
  };

  window.AppData = Object.freeze(AppData);

  console.info("[MY LIFE OS] تم تحميل البيانات الأساسية.");

})(window);
