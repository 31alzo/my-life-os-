
/* ========================================
   مشروع القمة — MY LIFE OS
   البيانات الأساسية للمشروع
======================================== */

"use strict";

const LIFE_DOMAINS = [
  {
    id: "faith",
    title: "علاقتي بالله",
    description: "العبادات والتأمل والالتزام الروحي",
    icon: "🤲"
  },
  {
    id: "career",
    title: "مساري المهني",
    description: "التعليم والشهادات والمهارات والخبرة",
    icon: "🎓"
  },
  {
    id: "health",
    title: "صحتي ومظهري",
    description: "النوم والرياضة والعناية بالنفس",
    icon: "💪"
  },
  {
    id: "relationships",
    title: "علاقاتي",
    description: "العائلة والتواصل والثقة والحدود الصحية",
    icon: "🤝"
  },
  {
    id: "finance",
    title: "مالي واستقلالي",
    description: "الدخل والمصروفات والادخار",
    icon: "💰"
  },
  {
    id: "discipline",
    title: "الانضباط والعادات",
    description: "إدارة الوقت وبناء العادات وتقليل المشتتات",
    icon: "🧭"
  }
];

const GOAL_CATEGORIES = [
  "شخصي",
  "تعليمي",
  "مهني",
  "مالي",
  "صحي",
  "روحي",
  "اجتماعي"
];

const TASK_PRIORITIES = [
  "منخفضة",
  "متوسطة",
  "عالية",
  "عاجلة"
];

const TASK_STATUSES = [
  "معلقة",
  "قيد التنفيذ",
  "مكتملة",
  "مؤجلة"
];

const CV_CREDENTIALS = [
  {
    id: "concours",
    title: "شهادة الكونكور",
    status: "غير محدد"
  },
  {
    id: "brevet",
    title: "شهادة البريفيه",
    status: "غير محدد"
  },
  {
    id: "baccalaureate",
    title: "شهادة البكالوريا",
    status: "غير محدد"
  },
  {
    id: "bts-mechanics",
    title: "BTS في الميكانيكا العامة",
    status: "غير محدد"
  },
  {
    id: "languages",
    title: "شهادات اللغات",
    status: "غير محدد"
  },
  {
    id: "digital-skills",
    title: "المهارات الرقمية والذكاء الاصطناعي",
    status: "غير محدد"
  },
  {
    id: "experience",
    title: "التدريب والخبرة والمشاريع العملية",
    status: "غير محدد"
  }
];

const NINETY_DAY_PHASES = [
  {
    id: 1,
    title: "المرحلة الأولى",
    days: "1–30",
    focus: "فهم العادات والمحفزات وتنظيم البيئة"
  },
  {
    id: 2,
    title: "المرحلة الثانية",
    days: "31–60",
    focus: "تقوية البدائل والعادات المفيدة"
  },
  {
    id: 3,
    title: "المرحلة الثالثة",
    days: "61–90",
    focus: "تثبيت التقدم ووضع خطة للاستمرار"
  }
];
