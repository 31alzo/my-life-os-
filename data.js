
/* ========================================
   MY LIFE OS — مشروع القمة
   DATA CORE — البيانات المركزية
   الإصدار: 2.0.0
   Arabic RTL | Navy & Gold
======================================== */

"use strict";

(function (window) {
  if (window.AppData) {
    console.warn("[MY LIFE OS] AppData موجود مسبقًا.");
    return;
  }

  /* ========================================
     1. HELPERS
  ======================================== */

  const hasOwn = (object, key) =>
    Object.prototype.hasOwnProperty.call(object, key);

  const deepFreeze = (value) => {
    if (
      !value ||
      typeof value !== "object" ||
      Object.isFrozen(value)
    ) {
      return value;
    }

    Object.keys(value).forEach((key) => {
      deepFreeze(value[key]);
    });

    return Object.freeze(value);
  };

  const findById = (items, id) =>
    Array.isArray(items)
      ? items.find((item) => item.id === id) || null
      : null;

  /* ========================================
     2. APPLICATION IDENTITY
  ======================================== */

  const DATA = {
    app: {
      id: "my-life-os",
      name: "MY LIFE OS",
      nameAr: "مشروع القمة",
      subtitle: "نظام إدارة الحياة والتطور الشخصي",
      version: "2.0.0",
      language: "ar",
      direction: "rtl",
      theme: "navy-gold",
      storagePrefix: "my-life-os:"
    },

    /* ========================================
       3. CATEGORY GROUPS
    ======================================== */

    categoryGroups: [
      {
        id: "planning",
        title: "التخطيط والأهداف",
        description: "تحديد الاتجاه وتنظيم الوقت وقياس التقدم",
        icon: "🎯",
        order: 1,
        categories: [
          "daily-goal",
          "weekly-planning",
          "long-term-goal"
        ]
      },
      {
        id: "personal-life",
        title: "الذات والحياة الشخصية",
        description: "بناء الذات والعادات والصحة والتوازن",
        icon: "🌱",
        order: 2,
        categories: [
          "appearance",
          "faith",
          "mental-clarity",
          "health-sleep",
          "fitness",
          "habit-change",
          "digital-life"
        ]
      },
      {
        id: "relationships",
        title: "العلاقات",
        description: "الأسرة والعلاقة العاطفية والمحيط الاجتماعي",
        icon: "🤝",
        order: 3,
        categories: [
          "family",
          "romantic-relationship",
          "social-circle"
        ]
      },
      {
        id: "growth",
        title: "البناء المهني والاقتصادي",
        description: "التعليم والعمل والمشاريع والاستقلال المالي",
        icon: "📈",
        order: 4,
        categories: [
          "learning",
          "career-projects",
          "finance"
        ]
      },
      {
        id: "documentation",
        title: "التوثيق والتقييم",
        description: "حفظ الأفكار ومراجعة المسار واتخاذ القرارات",
        icon: "📖",
        order: 5,
        categories: [
          "general-notes",
          "life-review"
        ]
      }
    ],

    /* ========================================
       4. THE 18 LIFE MEMO CATEGORIES
    ======================================== */

    memoCategories: [
      {
        id: "daily-goal",
        title: "الهدف اليومي",
        shortTitle: "هدفي اليوم",
        description: "التركيز الأساسي والنتيجة المطلوبة اليوم",
        icon: "🎯",
        color: "gold",
        group: "planning",
        order: 1,
        fields: [
          "title",
          "description",
          "date",
          "priority",
          "status",
          "plannedActions",
          "actualResults",
          "reflection"
        ],
        tracking: ["completion", "activity", "reflection"]
      },
      {
        id: "weekly-planning",
        title: "الهدف الأسبوعي والجدول",
        shortTitle: "التخطيط الأسبوعي",
        description: "أهداف الأسبوع ومواعيده وأولوياته",
        icon: "🗓️",
        color: "gold",
        group: "planning",
        order: 2,
        fields: [
          "title",
          "weekStart",
          "weekEnd",
          "weeklyGoals",
          "schedule",
          "completedActions",
          "obstacles",
          "review"
        ],
        tracking: ["planned", "completed", "deferred", "review"]
      },
      {
        id: "long-term-goal",
        title: "الهدف طويل المدى 2032",
        shortTitle: "رؤية 2032",
        description: "الرؤية المستقبلية والأهداف الكبرى ومراحل الوصول",
        icon: "🏔️",
        color: "gold",
        group: "planning",
        order: 3,
        fields: [
          "vision",
          "targetDate",
          "milestones",
          "requiredSkills",
          "resources",
          "risks",
          "progressEvidence",
          "review"
        ],
        targetYear: 2032,
        tracking: ["milestones", "evidence", "review"]
      },
      {
        id: "appearance",
        title: "الملابس والمظهر الشخصي",
        shortTitle: "المظهر",
        description: "الملابس والتنسيق والنظافة والعناية الشخصية",
        icon: "👔",
        color: "gold",
        group: "personal-life",
        order: 4,
        fields: [
          "notes",
          "wardrobe",
          "outfitIdeas",
          "grooming",
          "hygiene",
          "needs",
          "plannedActions",
          "review"
        ],
        tracking: ["care", "plannedActions", "review"]
      },
      {
        id: "faith",
        title: "الدين",
        shortTitle: "علاقتي بالله",
        description: "العبادات والقرآن والأذكار والاستقامة",
        icon: "🤲",
        color: "gold",
        group: "personal-life",
        order: 5,
        fields: [
          "notes",
          "prayer",
          "quran",
          "remembrance",
          "worshipGoals",
          "reflection",
          "nextSteps"
        ],
        tracking: ["personalCommitments", "reflection"]
      },
      {
        id: "mental-clarity",
        title: "نظافة الروح وصفاء الذهن",
        shortTitle: "صفاء الذهن",
        description: "التأمل والوعي الذاتي والهدوء النفسي وتنظيم الأفكار",
        icon: "🧘",
        color: "green",
        group: "personal-life",
        order: 6,
        fields: [
          "thoughts",
          "emotions",
          "triggers",
          "sourcesOfStress",
          "helpfulPractices",
          "reflection",
          "nextSteps"
        ],
        tracking: ["observations", "practices", "reflection"]
      },
      {
        id: "health-sleep",
        title: "الصحة والنوم",
        shortTitle: "الصحة والنوم",
        description: "تنظيم النوم والطاقة والعناية بالصحة العامة",
        icon: "🌙",
        color: "blue",
        group: "personal-life",
        order: 7,
        fields: [
          "sleepTime",
          "wakeTime",
          "sleepQuality",
          "energy",
          "healthNotes",
          "appointments",
          "plannedActions",
          "review"
        ],
        tracking: ["sleepRecords", "observations", "review"]
      },
      {
        id: "fitness",
        title: "الرياضة واللياقة",
        shortTitle: "اللياقة",
        description: "التدريب والقوة والمرونة والوضعية البدنية",
        icon: "💪",
        color: "green",
        group: "personal-life",
        order: 8,
        fields: [
          "trainingPlan",
          "exercise",
          "sets",
          "repetitions",
          "duration",
          "trainingLog",
          "recovery",
          "review"
        ],
        tracking: ["sessions", "duration", "completedWorkouts"]
      },
      {
        id: "habit-change",
        title: "إدارة العادات والتغيير السلوكي",
        shortTitle: "تغيير العادات",
        description: "ترك السلوكيات غير المرغوبة أو تقليلها واستبدالها بعادات نافعة",
        icon: "🧭",
        color: "orange",
        group: "personal-life",
        order: 9,
        fields: [
          "habitName",
          "desiredChange",
          "triggers",
          "frequency",
          "replacementBehavior",
          "copingPlan",
          "dailyLog",
          "setbacks",
          "review"
        ],
        tracking: [
          "occurrences",
          "replacementActions",
          "commitments",
          "review"
        ]
      },
      {
        id: "digital-life",
        title: "الحياة الذكية وإدارة الإنترنت",
        shortTitle: "الحياة الرقمية",
        description: "تنظيم استخدام الهاتف والتطبيقات والشاشات",
        icon: "📱",
        color: "blue",
        group: "personal-life",
        order: 10,
        fields: [
          "appName",
          "usagePurpose",
          "timeLimit",
          "actualUsage",
          "distractions",
          "digitalRules",
          "alternatives",
          "review"
        ],
        tracking: ["plannedLimits", "actualUsage", "review"]
      },
      {
        id: "family",
        title: "الوالدان والأسرة",
        shortTitle: "الأسرة",
        description: "بر الوالدين والتواصل الأسري والمسؤوليات",
        icon: "🏡",
        color: "purple",
        group: "relationships",
        order: 11,
        fields: [
          "notes",
          "familyGoals",
          "plannedActions",
          "sharedActivities",
          "responsibilities",
          "reflection",
          "nextSteps"
        ],
        tracking: ["actions", "commitments", "reflection"]
      },
      {
        id: "romantic-relationship",
        title: "العلاقة العاطفية",
        shortTitle: "العلاقة العاطفية",
        description: "المشاعر والتواصل والاحترام والحدود والتفكير المسؤول",
        icon: "❤️",
        color: "purple",
        group: "relationships",
        order: 12,
        fields: [
          "thoughts",
          "feelings",
          "communication",
          "boundaries",
          "values",
          "concerns",
          "decisions",
          "reflection"
        ],
        tracking: ["reflections", "decisions", "actions"]
      },
      {
        id: "social-circle",
        title: "المحيط الاجتماعي",
        shortTitle: "المحيط الاجتماعي",
        description: "الصداقات والثقة والتواصل والمهارات الاجتماعية",
        icon: "🤝",
        color: "purple",
        group: "relationships",
        order: 13,
        fields: [
          "socialGoals",
          "peopleNotes",
          "plannedInteractions",
          "communicationSkills",
          "socialChallenges",
          "results",
          "review"
        ],
        tracking: ["interactions", "practice", "review"]
      },
      {
        id: "learning",
        title: "الدراسة والتعلم",
        shortTitle: "التعلم",
        description: "الدراسة واللغات والمهارات والدورات والشهادات",
        icon: "📚",
        color: "blue",
        group: "growth",
        order: 14,
        fields: [
          "subject",
          "learningGoal",
          "course",
          "studyPlan",
          "studyHours",
          "skills",
          "certificates",
          "results",
          "review"
        ],
        tracking: ["studySessions", "hours", "completedLessons"]
      },
      {
        id: "career-projects",
        title: "المسار المهني والمشاريع",
        shortTitle: "المسار المهني",
        description: "المؤهلات والخبرة والتدريب والمشاريع وفرص العمل",
        icon: "🎓",
        color: "blue",
        group: "growth",
        order: 15,
        fields: [
          "careerVision",
          "qualifications",
          "certificates",
          "technicalSkills",
          "languages",
          "experience",
          "projects",
          "opportunities",
          "nextSteps"
        ],
        tracking: ["credentials", "projects", "experience", "milestones"]
      },
      {
        id: "finance",
        title: "الأموال والاقتصاد",
        shortTitle: "المال والاستقلال",
        description: "الدخل والمصروفات والادخار والميزانية والاستقلال المالي",
        icon: "💰",
        color: "gold",
        group: "growth",
        order: 16,
        fields: [
          "currency",
          "income",
          "expenses",
          "savings",
          "debts",
          "budget",
          "financialGoals",
          "transactions",
          "review"
        ],
        tracking: ["income", "expenses", "savings", "budget"]
      },
      {
        id: "general-notes",
        title: "المذكرات العامة والأفكار",
        shortTitle: "مذكراتي",
        description: "تدوين الأفكار والمعلومات والملاحظات دون فقدان أصلها",
        icon: "📝",
        color: "blue",
        group: "documentation",
        order: 17,
        fields: [
          "title",
          "content",
          "tags",
          "source",
          "createdAt",
          "linkedCategories",
          "linkedGoals",
          "review"
        ],
        tracking: ["entries", "tags", "links"]
      },
      {
        id: "life-review",
        title: "تقييم المسار ومراجعة الحياة",
        shortTitle: "مراجعة الحياة",
        description: "مراجعة ما حدث فعليًا وتحديد نقاط القوة والعقبات والخطوات التالية",
        icon: "📊",
        color: "gold",
        group: "documentation",
        order: 18,
        fields: [
          "period",
          "achievements",
          "evidence",
          "challenges",
          "lessons",
          "uncompletedActions",
          "nextPeriodGoals",
          "reviewNotes"
        ],
        tracking: ["evidence", "completion", "challenges", "nextSteps"]
      }
    ],

    /* ========================================
       5. LEGACY LIFE DOMAINS
       Retained for backward compatibility.
    ======================================== */

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

    /* ========================================
       6. GOAL CATEGORIES
    ======================================== */

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

    /* ========================================
       7. PRIORITIES
    ======================================== */

    priorities: [
      { id: "low", title: "منخفضة", weight: 1 },
      { id: "medium", title: "متوسطة", weight: 2 },
      { id: "high", title: "عالية", weight: 3 },
      { id: "urgent", title: "عاجلة", weight: 4 }
    ],

    /* ========================================
       8. GOAL STATUSES
    ======================================== */

    goalStatuses: [
      { id: "not-started", title: "لم يبدأ" },
      { id: "active", title: "قيد التنفيذ" },
      { id: "completed", title: "مكتمل" },
      { id: "paused", title: "متوقف مؤقتًا" },
      { id: "cancelled", title: "ملغي" }
    ],

    /* ========================================
       9. TASK STATUSES
    ======================================== */

    taskStatuses: [
      { id: "pending", title: "معلقة" },
      { id: "in-progress", title: "قيد التنفيذ" },
      { id: "completed", title: "مكتملة" },
      { id: "deferred", title: "مؤجلة" },
      { id: "cancelled", title: "ملغاة" }
    ],

    /* ========================================
       10. HABITS
    ======================================== */

    habitFrequencies: [
      { id: "daily", title: "يوميًا" },
      { id: "weekly", title: "أسبوعيًا" },
      { id: "custom", title: "أيام محددة" }
    ],

    habitDirections: [
      { id: "build", title: "بناء عادة نافعة" },
      { id: "reduce", title: "تقليل سلوك" },
      { id: "stop", title: "محاولة ترك سلوك" },
      { id: "replace", title: "استبدال سلوك بعادة أفضل" }
    ],

    /* ========================================
       11. REVIEW PERIODS
    ======================================== */

    reviewPeriods: [
      { id: "daily", title: "مراجعة يومية" },
      { id: "weekly", title: "مراجعة أسبوعية" },
      { id: "monthly", title: "مراجعة شهرية" },
      { id: "quarterly", title: "مراجعة فصلية" },
      { id: "yearly", title: "مراجعة سنوية" }
    ],

    /* ========================================
       12. NINETY-DAY PLAN
    ======================================== */

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

    /* ========================================
       13. CAREER CREDENTIALS
    ======================================== */

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

    /* ========================================
       14. TEXT WORKSPACE
    ======================================== */

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

    /* ========================================
       15. RECORD DEFINITIONS
    ======================================== */

    records: {
      goal: {
        id: "goal",
        title: "هدف",
        requiredFields: ["title"],
        statuses: [
          "not-started",
          "active",
          "completed",
          "paused",
          "cancelled"
        ],
        fields: [
          "title",
          "description",
          "category",
          "memoCategoryId",
          "priority",
          "status",
          "startDate",
          "targetDate",
          "milestones",
          "linkedGoalId",
          "notes",
          "createdAt",
          "updatedAt"
        ]
      },

      task: {
        id: "task",
        title: "مهمة",
        requiredFields: ["title"],
        statuses: [
          "pending",
          "in-progress",
          "completed",
          "deferred",
          "cancelled"
        ],
        fields: [
          "title",
          "description",
          "status",
          "priority",
          "dueDate",
          "scheduledAt",
          "completedAt",
          "goalId",
          "memoCategoryId",
          "notes",
          "createdAt",
          "updatedAt"
        ]
      },

      habit: {
        id: "habit",
        title: "عادة",
        requiredFields: ["title"],
        fields: [
          "title",
          "description",
          "direction",
          "frequency",
          "scheduledDays",
          "startDate",
          "target",
          "triggers",
          "replacementBehavior",
          "goalId",
          "memoCategoryId",
          "createdAt",
          "updatedAt"
        ]
      },

      note: {
        id: "note",
        title: "مذكرة",
        requiredFields: ["content"],
        fields: [
          "title",
          "content",
          "tags",
          "memoCategoryId",
          "linkedGoalIds",
          "linkedTaskIds",
          "source",
          "createdAt",
          "updatedAt"
        ]
      },

      activity: {
        id: "activity",
        title: "سجل نشاط",
        requiredFields: ["type", "date"],
        fields: [
          "type",
          "date",
          "duration",
          "quantity",
          "unit",
          "result",
          "notes",
          "goalId",
          "taskId",
          "habitId",
          "memoCategoryId",
          "createdAt"
        ]
      },

      review: {
        id: "review",
        title: "مراجعة",
        requiredFields: ["period", "startDate", "endDate"],
        fields: [
          "period",
          "startDate",
          "endDate",
          "achievements",
          "evidence",
          "challenges",
          "lessons",
          "nextSteps",
          "createdAt",
          "updatedAt"
        ]
      }
    },

    /* ========================================
       16. DEFAULT SETTINGS
    ======================================== */

    settings: {
      language: "ar",
      direction: "rtl",
      theme: "dark",
      accentColor: "gold",
      startPage: "dashboard",
      weekStartsOn: 6,
      notificationsEnabled: true,
      confirmBeforeDelete: true,
      reducedMotion: false,
      dateFormat: "YYYY-MM-DD",
      timeFormat: "24h"
    },

    /* ========================================
       17. STORAGE SCHEMA
       Keep original keys compatible.
    ======================================== */

    storage: {
      version: 2,

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
        backupHistory: "backup-history",

        /* Additional namespaces */
        memoCategories: "memo-categories",
        categoryGroups: "category-groups",
        activities: "activities",
        habitLogs: "habit-logs",
        weeklyReviews: "weekly-reviews",
        lifeReviews: "life-reviews",
        migrationHistory: "migration-history"
      }
    }
  };

  /* ========================================
     18. FREEZE DATA
  ======================================== */

  deepFreeze(DATA);

  /* ========================================
     19. PUBLIC API
     Keep existing method names.
  ======================================== */

  const AppData = {
    all: DATA,

    get(section) {
      if (!section || typeof section !== "string") {
        return null;
      }

      return hasOwn(DATA, section)
        ? DATA[section]
        : null;
    },

    getDomain(id) {
      return findById(DATA.lifeDomains, id);
    },

    getGoalCategory(id) {
      return findById(DATA.goalCategories, id);
    },

    getPriority(id) {
      return findById(DATA.priorities, id);
    },

    getTaskStatus(id) {
      return findById(DATA.taskStatuses, id);
    },

    getGoalStatus(id) {
      return findById(DATA.goalStatuses, id);
    },

    getMemoCategory(id) {
      return findById(DATA.memoCategories, id);
    },

    getCategoryGroup(id) {
      return findById(DATA.categoryGroups, id);
    },

    getRecordDefinition(type) {
      return findById(
        Object.values(DATA.records),
        type
      );
    },

    getNinetyDayPhase(day) {
      const number = Number(day);

      if (
        !Number.isFinite(number) ||
        number < 1 ||
        number > 90
      ) {
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

      return typeof key === "string"
        ? key
        : null;
    },

    getMemoCategoriesByGroup(groupId) {
      if (typeof groupId !== "string") {
        return [];
      }

      return DATA.memoCategories.filter(
        (category) => category.group === groupId
      );
    },

    getMemoCategoryCount() {
      return DATA.memoCategories.length;
    },

    getAllMemoCategories() {
      return DATA.memoCategories;
    },

    getAllCategoryGroups() {
      return DATA.categoryGroups;
    },

    getCategoriesForSelect() {
      return DATA.memoCategories.map((category) => ({
        id: category.id,
        title: category.title,
        icon: category.icon,
        group: category.group
      }));
    },

    getStatus(type, id) {
      const statusCollections = {
        goal: DATA.goalStatuses,
        task: DATA.taskStatuses,
        textWorkspace: DATA.textWorkspace.statuses
      };

      return findById(statusCollections[type], id);
    },

    getPriorityWeight(id) {
      const priority = findById(DATA.priorities, id);

      return priority ? priority.weight : null;
    }
  };

  window.AppData = Object.freeze(AppData);

  console.info(
    "[MY LIFE OS] تم تحميل البيانات المركزية:",
    DATA.memoCategories.length,
    "صنفًا، ضمن",
    DATA.categoryGroups.length,
    "مجموعات."
  );

})(window);
