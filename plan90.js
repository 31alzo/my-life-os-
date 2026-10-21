/* =========================================================
MY LIFE OS — 90-DAY PLAN MANAGER
File: Plan90.js
Version: 2.0.0

المسؤوليات:

- إدارة خطط التسعين يومًا.
- إدارة المراحل والإنجازات المرحلية.
- ربط الخطط بالأهداف.
- حساب التقدم الزمني والعملي.
- دعم الإيقاف والاستئناف والإكمال والإلغاء.
- التحقق من البيانات وحماية التعديلات عند فشل الحفظ.
- التوافق مع AppStorage و AppUtils و GoalsManager.
  ========================================================= */

(function (window) {
"use strict";

if (window.Plan90Manager) return;

const VERSION = "2.0.0";
const STORAGE_KEY = "plan90";
const MAX_PLANS = 500;
const MAX_MILESTONES = 500;
const MAX_TEXT_LENGTH = 5000;

const STATUSES = Object.freeze([
"active",
"paused",
"completed",
"cancelled"
]);

const PHASES = Object.freeze([
{
id: "phase-1",
name: "التأسيس",
startDay: 1,
endDay: 30,
description: "تحديد الاتجاه وبناء الأساس."
},
{
id: "phase-2",
name: "التطوير",
startDay: 31,
endDay: 60,
description: "تطوير الأداء والاستمرار في التنفيذ."
},
{
id: "phase-3",
name: "الإنجاز",
startDay: 61,
endDay: 90,
description: "إكمال الأهداف وتقييم النتائج."
}
]);

let plans = [];
let initialized = false;
let initializationError = null;

/* =======================================================
UTILITIES
======================================================= */

function createId() {
if (
window.AppUtils &&
typeof window.AppUtils.createId === "function"
) {
return window.AppUtils.createId();
}

return (
  "plan90-" +
  Date.now().toString(36) +
  "-" +
  Math.random().toString(36).slice(2, 11)
);

}

function today() {
if (
window.AppUtils &&
typeof window.AppUtils.today === "function"
) {
const value = window.AppUtils.today();

  if (isValidDate(value)) {
    return value;
  }
}

const date = new Date();

return [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, "0"),
  String(date.getDate()).padStart(2, "0")
].join("-");

}

function now() {
return new Date().toISOString();
}

function clone(value) {
return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
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

function cleanText(value, limit) {
if (typeof value !== "string") {
return "";
}

return value.trim().slice(
  0,
  limit || MAX_TEXT_LENGTH
);

}

function isValidDate(value) {
if (
typeof value !== "string" ||
!/^\d{4}-\d{2}-\d{2}$/.test(value)
) {
return false;
}

const date = new Date(value + "T12:00:00");

return (
  !Number.isNaN(date.getTime()) &&
  date.toISOString().slice(0, 10) === value
);

}

function isValidTimestamp(value) {
return (
typeof value === "string" &&
value.length > 0 &&
Number.isFinite(Date.parse(value))
);
}

function shiftDate(dateString, days) {
if (!isValidDate(dateString)) {
throw new Error("تاريخ البداية غير صالح.");
}

const date = new Date(
  dateString + "T12:00:00"
);

date.setDate(date.getDate() + days);

return [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, "0"),
  String(date.getDate()).padStart(2, "0")
].join("-");

}

function emit(name, detail) {
try {
if (
window.AppEvents &&
typeof window.AppEvents.emit === "function"
) {
window.AppEvents.emit(name, detail);
}
} catch (error) {
// فشل الأحداث لا يوقف عمليات الخطط.
}

try {
  if (
    typeof window.dispatchEvent === "function" &&
    typeof window.CustomEvent === "function"
  ) {
    window.dispatchEvent(
      new window.CustomEvent(
        "my-life-os:" + name,
        { detail: detail }
      )
    );
  }
} catch (error) {
  // دعم البيئات التي لا توفر CustomEvent.
}

}

function validateStatus(status) {
if (!STATUSES.includes(status)) {
throw new Error("حالة الخطة غير صالحة.");
}

return status;

}

function assertStorage() {
if (
!window.AppStorage ||
typeof window.AppStorage.get !== "function" ||
typeof window.AppStorage.set !== "function"
) {
throw new Error("وحدة التخزين غير متاحة.");
}
}

function save() {
assertStorage();

const result = window.AppStorage.set(
  STORAGE_KEY,
  plans
);

if (
  result === false ||
  (
    result &&
    typeof result === "object" &&
    result.success === false
  )
) {
  throw new Error(
    result.message || "تعذر حفظ خطط التسعين يومًا."
  );
}

return true;

}

function ensureInitialized() {
if (initialized) return;

const summary = initialize();

if (!summary || summary.success === false) {
  throw new Error(
    initializationError ||
    "تعذر تهيئة مدير خطة التسعين يومًا."
  );
}

}

function findIndex(id) {
return plans.findIndex(function (plan) {
return plan.id === id;
});
}

function findOrThrow(id) {
const plan = plans.find(function (item) {
return item.id === id;
});

if (!plan) {
  throw new Error("الخطة غير موجودة.");
}

return plan;

}

function requireId(id) {
if (
typeof id !== "string" ||
!id.trim()
) {
throw new Error("معرّف الخطة مطلوب.");
}
}

/* =======================================================
MILESTONE NORMALIZATION
======================================================= */

function normalizeMilestone(input) {
if (!isObject(input)) {
throw new Error(
"بيانات الإنجاز المرحلي غير صالحة."
);
}

const title = cleanText(input.title, 160);

if (!title) {
  throw new Error(
    "عنوان الإنجاز المرحلي مطلوب."
  );
}

const day = Number(input.day);

if (
  !Number.isInteger(day) ||
  day < 1 ||
  day > 90
) {
  throw new Error(
    "يجب أن يقع يوم الإنجاز بين 1 و90."
  );
}

const id =
  typeof input.id === "string" &&
  input.id.trim()
    ? input.id.trim()
    : createId();

const completed = input.completed === true;

let completedAt = null;

if (completed) {
  completedAt = isValidTimestamp(input.completedAt)
    ? new Date(input.completedAt).toISOString()
    : now();
}

return {
  id: id,

  title: title,

  description: cleanText(
    input.description,
    1000
  ),

  day: day,

  completed: completed,

  completedAt: completedAt
};

}

/* =======================================================
PLAN NORMALIZATION
======================================================= */

function normalizePlan(input, existing) {
if (!isObject(input)) {
throw new Error("بيانات الخطة غير صالحة.");
}

const old = existing || {};

const title = cleanText(
  input.title !== undefined
    ? input.title
    : old.title,
  160
);

if (!title) {
  throw new Error("عنوان الخطة مطلوب.");
}

const startDate =
  input.startDate !== undefined
    ? input.startDate
    : old.startDate || today();

if (!isValidDate(startDate)) {
  throw new Error("تاريخ بداية الخطة غير صالح.");
}

const endDate = shiftDate(startDate, 89);

const status = validateStatus(
  input.status !== undefined
    ? input.status
    : old.status || "active"
);

const milestonesInput =
  input.milestones !== undefined
    ? input.milestones
    : old.milestones || [];

if (!Array.isArray(milestonesInput)) {
  throw new Error(
    "قائمة الإنجازات المرحلية غير صالحة."
  );
}

if (milestonesInput.length > MAX_MILESTONES) {
  throw new Error(
    "عدد الإنجازات المرحلية يتجاوز الحد المسموح."
  );
}

const milestones = milestonesInput.map(
  normalizeMilestone
);

const milestoneIds = milestones.map(
  function (item) {
    return item.id;
  }
);

if (
  new Set(milestoneIds).size !==
  milestoneIds.length
) {
  throw new Error(
    "توجد معرّفات مكررة للإنجازات المرحلية."
  );
}

const linkedGoalIds =
  input.goalIds !== undefined
    ? input.goalIds
    : old.goalIds || [];

if (!Array.isArray(linkedGoalIds)) {
  throw new Error(
    "قائمة الأهداف المرتبطة غير صالحة."
  );
}

const goalIds = [
  ...new Set(
    linkedGoalIds
      .filter(function (id) {
        return (
          typeof id === "string" &&
          id.trim().length > 0
        );
      })
      .map(function (id) {
        return id.trim();
      })
  )
];

if (
  window.GoalsManager &&
  typeof window.GoalsManager.getById === "function"
) {
  goalIds.forEach(function (id) {
    if (!window.GoalsManager.getById(id)) {
      throw new Error(
        "أحد الأهداف المرتبطة بالخطة غير موجود."
      );
    }
  });
}

const oldCreatedAt = isValidTimestamp(old.createdAt)
  ? old.createdAt
  : now();

let completedAt = null;

if (status === "completed") {
  completedAt = isValidTimestamp(old.completedAt)
    ? old.completedAt
    : now();
}

return {
  id:
    old.id ||
    (
      typeof input.id === "string" &&
      input.id.trim()
        ? input.id.trim()
        : createId()
    ),

  title: title,

  description: cleanText(
    input.description !== undefined
      ? input.description
      : old.description,
    5000
  ),

  mainGoal: cleanText(
    input.mainGoal !== undefined
      ? input.mainGoal
      : old.mainGoal,
    1000
  ),

  startDate: startDate,
  endDate: endDate,

  status: status,

  goalIds: goalIds,
  milestones: milestones,

  weeklyFocus: cleanText(
    input.weeklyFocus !== undefined
      ? input.weeklyFocus
      : old.weeklyFocus,
    2000
  ),

  obstacles: cleanText(
    input.obstacles !== undefined
      ? input.obstacles
      : old.obstacles,
    3000
  ),

  lessonsLearned: cleanText(
    input.lessonsLearned !== undefined
      ? input.lessonsLearned
      : old.lessonsLearned,
    3000
  ),

  notes: cleanText(
    input.notes !== undefined
      ? input.notes
      : old.notes,
    5000
  ),

  createdAt: oldCreatedAt,
  updatedAt: now(),
  completedAt: completedAt
};

}

/* =======================================================
INITIALIZATION AND DATA VALIDATION
======================================================= */

function initialize() {
if (initialized) {
return getSummary();
}

try {
  assertStorage();

  const stored = window.AppStorage.get(
    STORAGE_KEY,
    []
  );

  if (!Array.isArray(stored)) {
    throw new Error(
      "بيانات الخطط المحفوظة ليست قائمة صالحة."
    );
  }

  if (stored.length > MAX_PLANS) {
    throw new Error(
      "عدد الخطط المحفوظة يتجاوز الحد المسموح."
    );
  }

  const normalizedPlans = [];
  const ids = new Set();

  stored.forEach(function (item) {
    const plan = normalizePlan(item, item);

    if (ids.has(plan.id)) {
      throw new Error(
        "توجد خطط محفوظة بمعرّفات مكررة."
      );
    }

    ids.add(plan.id);
    normalizedPlans.push(plan);
  });

  // لا نغير الحالة المعتمدة قبل نجاح التحقق.
  const previousPlans = plans;

  plans = normalizedPlans;

  try {
    // حفظ الشكل المنظم والتحقق من نجاح التخزين.
    save();
  } catch (error) {
    plans = previousPlans;
    throw error;
  }

  initialized = true;
  initializationError = null;

  emit("plan90:initialized", {
    count: plans.length,
    version: VERSION
  });

  return getSummary();
} catch (error) {
  initializationError = error.message;

  return {
    success: false,
    reason: "initialization-failed",
    message: error.message
  };
}

}

/* =======================================================
CREATE PLAN
======================================================= */

function create(input) {
ensureInitialized();

if (plans.length >= MAX_PLANS) {
  throw new Error(
    "وصلت إلى الحد الأقصى لعدد الخطط."
  );
}

const plan = normalizePlan(input);

if (
  plans.some(function (item) {
    return item.id === plan.id;
  })
) {
  throw new Error(
    "معرّف الخطة مستخدم بالفعل."
  );
}

plans.push(plan);

try {
  save();
} catch (error) {
  plans.pop();
  throw error;
}

emit("plan90:created", clone(plan));

return clone(plan);

}

/* =======================================================
READ PLANS
======================================================= */

function getAll(filters) {
ensureInitialized();

filters = isObject(filters) ? filters : {};

let result = plans.slice();

if (filters.status) {
  validateStatus(filters.status);

  result = result.filter(function (plan) {
    return plan.status === filters.status;
  });
}

if (filters.search) {
  const query = cleanText(
    filters.search,
    200
  ).toLocaleLowerCase();

  if (query) {
    result = result.filter(function (plan) {
      return (
        plan.title.toLocaleLowerCase().includes(query) ||
        plan.description.toLocaleLowerCase().includes(query) ||
        plan.mainGoal.toLocaleLowerCase().includes(query)
      );
    });
  }
}

result.sort(function (a, b) {
  return b.createdAt.localeCompare(a.createdAt);
});

return clone(result);

}

function getById(id) {
ensureInitialized();

const plan = plans.find(function (item) {
  return item.id === id;
});

return plan ? clone(plan) : null;

}

function getActivePlan() {
ensureInitialized();

const active = plans
  .filter(function (plan) {
    return plan.status === "active";
  })
  .sort(function (a, b) {
    return b.createdAt.localeCompare(a.createdAt);
  });

return active.length ? clone(active[0]) : null;

}

/* =======================================================
UPDATE PLAN
======================================================= */

function update(id, changes) {
ensureInitialized();
requireId(id);

const index = findIndex(id);

if (index === -1) {
  throw new Error("الخطة غير موجودة.");
}

if (!isObject(changes)) {
  throw new Error("التعديلات غير صالحة.");
}

const previous = plans[index];

const updated = normalizePlan(
  Object.assign({}, previous, changes, {
    id: previous.id,
    createdAt: previous.createdAt
  }),
  previous
);

plans[index] = updated;

try {
  save();
} catch (error) {
  plans[index] = previous;
  throw error;
}

emit("plan90:updated", {
  plan: clone(updated),
  previous: clone(previous)
});

return clone(updated);

}

/* =======================================================
STATUS CONTROLS
======================================================= */

function pause(id) {
const plan = findPlanForStatus(id);

if (plan.status !== "active") {
  throw new Error(
    "يمكن إيقاف الخطة النشطة فقط."
  );
}

return update(id, {
  status: "paused"
});

}

function resume(id) {
const plan = findPlanForStatus(id);

if (plan.status !== "paused") {
  throw new Error(
    "يمكن استئناف الخطة المتوقفة مؤقتًا فقط."
  );
}

return update(id, {
  status: "active"
});

}

function cancel(id) {
const plan = findPlanForStatus(id);

if (
  plan.status === "completed" ||
  plan.status === "cancelled"
) {
  throw new Error(
    "لا يمكن إلغاء خطة مكتملة أو ملغاة."
  );
}

return update(id, {
  status: "cancelled"
});

}

function complete(id) {
const plan = findPlanForStatus(id);

if (
  plan.status === "completed" ||
  plan.status === "cancelled"
) {
  throw new Error(
    "لا يمكن إكمال خطة مكتملة أو ملغاة."
  );
}

const completed = update(id, {
  status: "completed"
});

emit("plan90:completed", clone(completed));

return completed;

}

function findPlanForStatus(id) {
ensureInitialized();
requireId(id);
return findOrThrow(id);
}

/* =======================================================
MILESTONES
======================================================= */

function addMilestone(planId, input) {
ensureInitialized();

const plan = findOrThrow(planId);

if (plan.milestones.length >= MAX_MILESTONES) {
  throw new Error(
    "وصلت إلى الحد الأقصى للإنجازات المرحلية."
  );
}

const milestone = normalizeMilestone(input);

if (
  plan.milestones.some(function (item) {
    return item.id === milestone.id;
  })
) {
  throw new Error(
    "معرّف الإنجاز المرحلي مستخدم بالفعل."
  );
}

return update(planId, {
  milestones: plan.milestones.concat(milestone)
});

}

function updateMilestone(
planId,
milestoneId,
changes
) {
ensureInitialized();

const plan = findOrThrow(planId);

if (!isObject(changes)) {
  throw new Error("التعديلات غير صالحة.");
}

const index = plan.milestones.findIndex(
  function (item) {
    return item.id === milestoneId;
  }
);

if (index === -1) {
  throw new Error(
    "الإنجاز المرحلي غير موجود."
  );
}

const oldMilestone = plan.milestones[index];

const updatedMilestone = normalizeMilestone(
  Object.assign({}, oldMilestone, changes, {
    id: oldMilestone.id
  })
);

const milestones = plan.milestones.slice();
milestones[index] = updatedMilestone;

return update(planId, {
  milestones: milestones
});

}

function completeMilestone(planId, milestoneId) {
return updateMilestone(
planId,
milestoneId,
{
completed: true,
completedAt: now()
}
);
}

function reopenMilestone(planId, milestoneId) {
return updateMilestone(
planId,
milestoneId,
{
completed: false,
completedAt: null
}
);
}

function removeMilestone(planId, milestoneId) {
ensureInitialized();

const plan = findOrThrow(planId);

const milestones = plan.milestones.filter(
  function (item) {
    return item.id !== milestoneId;
  }
);

if (milestones.length === plan.milestones.length) {
  return false;
}

update(planId, {
  milestones: milestones
});

return true;

}

/* =======================================================
PHASES AND PROGRESS
======================================================= */

function getPhase(day) {
day = Number(day);

if (
  !Number.isInteger(day) ||
  day < 1 ||
  day > 90
) {
  return null;
}

const phase = PHASES.find(function (item) {
  return (
    day >= item.startDay &&
    day <= item.endDay
  );
});

return phase ? clone(phase) : null;

}

function getPlanProgress(planId, referenceDate) {
ensureInitialized();

const plan = findOrThrow(planId);

referenceDate = referenceDate || today();

if (!isValidDate(referenceDate)) {
  throw new Error(
    "تاريخ حساب التقدم غير صالح."
  );
}

const start = new Date(
  plan.startDate + "T12:00:00"
);

const current = new Date(
  referenceDate + "T12:00:00"
);

const elapsedDays = Math.floor(
  (
    current.getTime() -
    start.getTime()
  ) / 86400000
) + 1;

const dayNumber = Math.max(
  0,
  Math.min(90, elapsedDays)
);

const completedMilestones =
  plan.milestones.filter(function (item) {
    return item.completed;
  }).length;

const milestoneRate = plan.milestones.length
  ? Math.round(
      completedMilestones /
      plan.milestones.length *
      100
    )
  : 0;

const linkedGoals = plan.goalIds
  .map(function (id) {
    if (
      !window.GoalsManager ||
      typeof window.GoalsManager.getById !== "function"
    ) {
      return null;
    }

    return window.GoalsManager.getById(id);
  })
  .filter(Boolean);

const validGoalProgress = linkedGoals
  .map(function (goal) {
    const progress = Number(goal.progress);

    return Number.isFinite(progress)
      ? Math.max(0, Math.min(100, progress))
      : null;
  })
  .filter(function (progress) {
    return progress !== null;
  });

const goalProgress = validGoalProgress.length
  ? Math.round(
      validGoalProgress.reduce(
        function (sum, value) {
          return sum + value;
        },
        0
      ) / validGoalProgress.length
    )
  : null;

const isBeforeStart = referenceDate < plan.startDate;
const isAfterEnd = referenceDate > plan.endDate;

return {
  planId: plan.id,

  startDate: plan.startDate,
  endDate: plan.endDate,
  referenceDate: referenceDate,

  dayNumber: dayNumber,

  daysRemaining: isBeforeStart
    ? 90
    : Math.max(0, 90 - dayNumber),

  timeProgress: Math.round(
    dayNumber / 90 * 100
  ),

  completedMilestones: completedMilestones,
  totalMilestones: plan.milestones.length,
  milestoneProgress: milestoneRate,

  linkedGoalsCount: linkedGoals.length,
  linkedGoalsProgress: goalProgress,

  currentPhase: dayNumber > 0
    ? getPhase(dayNumber)
    : null,

  isBeforeStart: isBeforeStart,
  isAfterEnd: isAfterEnd,

  status: plan.status
};

}

/* =======================================================
DELETE PLAN
======================================================= */

function remove(id) {
ensureInitialized();
requireId(id);

const index = findIndex(id);

if (index === -1) {
  return false;
}

const previous = plans[index];

plans.splice(index, 1);

try {
  save();
} catch (error) {
  plans.splice(index, 0, previous);
  throw error;
}

emit("plan90:removed", {
  id: id
});

return true;

}

/* =======================================================
SUMMARY
======================================================= */

function getSummary() {
ensureInitialized();

const summary = {
  totalPlans: plans.length,

  activePlans: plans.filter(
    function (plan) {
      return plan.status === "active";
    }
  ).length,

  pausedPlans: plans.filter(
    function (plan) {
      return plan.status === "paused";
    }
  ).length,

  completedPlans: plans.filter(
    function (plan) {
      return plan.status === "completed";
    }
  ).length,

  cancelledPlans: plans.filter(
    function (plan) {
      return plan.status === "cancelled";
    }
  ).length,

  totalMilestones: 0,
  completedMilestones: 0,
  milestoneProgress: 0
};

plans.forEach(function (plan) {
  summary.totalMilestones += plan.milestones.length;

  summary.completedMilestones +=
    plan.milestones.filter(
      function (item) {
        return item.completed;
      }
    ).length;
});

summary.milestoneProgress =
  summary.totalMilestones
    ? Math.round(
        summary.completedMilestones /
        summary.totalMilestones *
        100
      )
    : 0;

return summary;

}

/* =======================================================
RESET
Requires explicit confirmation.
======================================================= */

function reset(options) {
ensureInitialized();

if (
  !options ||
  options.confirmed !== true
) {
  throw new Error(
    "يجب تأكيد حذف جميع خطط التسعين يومًا."
  );
}

const previous = plans;

plans = [];

try {
  save();
} catch (error) {
  plans = previous;
  throw error;
}

emit("plan90:reset", {
  removedCount: previous.length
});

return getSummary();

}

/* =======================================================
PUBLIC API
Existing method names are preserved.
======================================================= */

window.Plan90Manager = Object.freeze({
version: VERSION,

initialize: initialize,

getAll: getAll,
getById: getById,
getActivePlan: getActivePlan,

create: create,
update: update,
remove: remove,

pause: pause,
resume: resume,
cancel: cancel,
complete: complete,

addMilestone: addMilestone,
updateMilestone: updateMilestone,
completeMilestone: completeMilestone,
reopenMilestone: reopenMilestone,
removeMilestone: removeMilestone,

getPhase: getPhase,
getPlanProgress: getPlanProgress,
getSummary: getSummary,

getPhases: function () {
  return clone(PHASES);
},

reset: reset

});

})(window);
