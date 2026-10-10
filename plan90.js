
/* =========================================
   MY LIFE OS
   90-DAY PLAN MANAGER
   File: Plan90.js
   ========================================= */

(function (window) {
  "use strict";

  if (window.Plan90Manager) return;

  const STORAGE_KEY = "plan90";

  const PHASES = [
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
  ];

  let plans = [];
  let initialized = false;

  /* =========================================
     UTILITIES
  ========================================= */

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
      Math.random().toString(36).slice(2, 9)
    );
  }

  function today() {
    if (
      window.AppUtils &&
      typeof window.AppUtils.today === "function"
    ) {
      return window.AppUtils.today();
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
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function cleanText(value, limit) {
    if (typeof value !== "string") return "";

    return value.trim().slice(0, limit || 2000);
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

  function shiftDate(dateString, days) {
    const date = new Date(dateString + "T12:00:00");

    date.setDate(date.getDate() + days);

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function emit(name, detail) {
    if (
      window.AppEvents &&
      typeof window.AppEvents.emit === "function"
    ) {
      window.AppEvents.emit(name, detail);
      return;
    }

    try {
      window.dispatchEvent(
        new CustomEvent("my-life-os:" + name, {
          detail: detail
        })
      );
    } catch (error) {
      // Event delivery must not interrupt plan operations.
    }
  }

  function ensureInitialized() {
    if (!initialized) initialize();
  }

  function save() {
    if (
      !window.AppStorage ||
      typeof window.AppStorage.set !== "function"
    ) {
      throw new Error("وحدة التخزين غير متاحة.");
    }

    window.AppStorage.set(STORAGE_KEY, plans);
  }

  function findIndex(id) {
    return plans.findIndex(plan => plan.id === id);
  }

  function findOrThrow(id) {
    const plan = plans.find(item => item.id === id);

    if (!plan) {
      throw new Error("الخطة غير موجودة.");
    }

    return plan;
  }

  /* =========================================
     PLAN NORMALIZATION
  ========================================= */

  function normalizeMilestone(item) {
    if (!isObject(item)) {
      throw new Error("بيانات الإنجاز المرحلي غير صالحة.");
    }

    const title = cleanText(item.title, 160);

    if (!title) {
      throw new Error("عنوان الإنجاز المرحلي مطلوب.");
    }

    const day = Number(item.day);

    if (
      !Number.isInteger(day) ||
      day < 1 ||
      day > 90
    ) {
      throw new Error("يجب أن يقع يوم الإنجاز بين 1 و90.");
    }

    return {
      id: item.id || createId(),
      title: title,
      description: cleanText(item.description, 1000),
      day: day,
      completed: Boolean(item.completed),
      completedAt: item.completed
        ? item.completedAt || now()
        : null
    };
  }

  function normalizePlan(input, existing) {
    if (!isObject(input)) {
      throw new Error("بيانات الخطة غير صالحة.");
    }

    const old = existing || {};

    const title = cleanText(
      input.title !== undefined ? input.title : old.title,
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

    const status =
      input.status !== undefined
        ? input.status
        : old.status || "active";

    if (!["active", "paused", "completed", "cancelled"].includes(status)) {
      throw new Error("حالة الخطة غير صالحة.");
    }

    const milestonesInput =
      input.milestones !== undefined
        ? input.milestones
        : old.milestones || [];

    if (!Array.isArray(milestonesInput)) {
      throw new Error("قائمة الإنجازات المرحلية غير صالحة.");
    }

    const milestones = milestonesInput.map(normalizeMilestone);

    const milestoneIds = milestones.map(item => item.id);

    if (new Set(milestoneIds).size !== milestoneIds.length) {
      throw new Error("توجد معرّفات مكررة للإنجازات المرحلية.");
    }

    const linkedGoalIds =
      input.goalIds !== undefined
        ? input.goalIds
        : old.goalIds || [];

    if (!Array.isArray(linkedGoalIds)) {
      throw new Error("قائمة الأهداف المرتبطة غير صالحة.");
    }

    const goalIds = [...new Set(
      linkedGoalIds.filter(
        id => typeof id === "string" && id.trim()
      )
    )];

    if (
      window.GoalsManager &&
      typeof window.GoalsManager.getById === "function"
    ) {
      goalIds.forEach(id => {
        if (!window.GoalsManager.getById(id)) {
          throw new Error("أحد الأهداف المرتبطة بالخطة غير موجود.");
        }
      });
    }

    return {
      id: old.id || input.id || createId(),

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

      createdAt: old.createdAt || now(),
      updatedAt: now(),
      completedAt: status === "completed"
        ? old.completedAt || now()
        : null
    };
  }

  /* =========================================
     INITIALIZATION
  ========================================= */

  function initialize() {
    if (initialized) return getSummary();

    if (
      !window.AppStorage ||
      typeof window.AppStorage.get !== "function" ||
      typeof window.AppStorage.set !== "function"
    ) {
      return {
        success: false,
        reason: "storage-unavailable"
      };
    }

    const stored = window.AppStorage.get(STORAGE_KEY, []);

    plans = Array.isArray(stored)
      ? stored.filter(isObject)
      : [];

    initialized = true;

    save();

    emit("plan90:initialized", {
      count: plans.length
    });

    return getSummary();
  }

  /* =========================================
     CREATE PLAN
  ========================================= */

  function create(input) {
    ensureInitialized();

    const plan = normalizePlan(input);

    if (plans.some(item => item.id === plan.id)) {
      throw new Error("معرّف الخطة مستخدم بالفعل.");
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

  /* =========================================
     READ PLANS
  ========================================= */

  function getAll(filters) {
    ensureInitialized();

    filters = isObject(filters) ? filters : {};

    let result = plans.slice();

    if (filters.status) {
      result = result.filter(
        plan => plan.status === filters.status
      );
    }

    if (filters.search) {
      const query = cleanText(
        filters.search,
        200
      ).toLowerCase();

      result = result.filter(plan =>
        plan.title.toLowerCase().includes(query) ||
        plan.description.toLowerCase().includes(query) ||
        plan.mainGoal.toLowerCase().includes(query)
      );
    }

    return clone(result);
  }

  function getById(id) {
    ensureInitialized();

    const plan = plans.find(item => item.id === id);

    return plan ? clone(plan) : null;
  }

  function getActivePlan() {
    ensureInitialized();

    const active = plans
      .filter(plan => plan.status === "active")
      .sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      );

    return active.length ? clone(active[0]) : null;
  }

  /* =========================================
     UPDATE PLAN
  ========================================= */

  function update(id, changes) {
    ensureInitialized();

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
        id: previous.id
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

  /* =========================================
     STATUS CONTROLS
  ========================================= */

  function pause(id) {
    return update(id, {
      status: "paused"
    });
  }

  function resume(id) {
    return update(id, {
      status: "active"
    });
  }

  function cancel(id) {
    return update(id, {
      status: "cancelled"
    });
  }

  function complete(id) {
    const plan = update(id, {
      status: "completed"
    });

    emit("plan90:completed", clone(plan));

    return plan;
  }

  /* =========================================
     MILESTONES
  ========================================= */

  function addMilestone(planId, input) {
    ensureInitialized();

    const plan = findOrThrow(planId);

    const milestone = normalizeMilestone(input);

    if (plan.milestones.some(item => item.id === milestone.id)) {
      throw new Error("معرّف الإنجاز المرحلي مستخدم بالفعل.");
    }

    return update(planId, {
      milestones: plan.milestones.concat(milestone)
    });
  }

  function updateMilestone(planId, milestoneId, changes) {
    ensureInitialized();

    const plan = findOrThrow(planId);

    if (!isObject(changes)) {
      throw new Error("التعديلات غير صالحة.");
    }

    const index = plan.milestones.findIndex(
      item => item.id === milestoneId
    );

    if (index === -1) {
      throw new Error("الإنجاز المرحلي غير موجود.");
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
    return updateMilestone(planId, milestoneId, {
      completed: true,
      completedAt: now()
    });
  }

  function reopenMilestone(planId, milestoneId) {
    return updateMilestone(planId, milestoneId, {
      completed: false,
      completedAt: null
    });
  }

  function removeMilestone(planId, milestoneId) {
    ensureInitialized();

    const plan = findOrThrow(planId);

    const milestones = plan.milestones.filter(
      item => item.id !== milestoneId
    );

    if (milestones.length === plan.milestones.length) {
      return false;
    }

    update(planId, {
      milestones: milestones
    });

    return true;
  }

  /* =========================================
     PHASES AND PROGRESS
  ========================================= */

  function getPhase(day) {
    day = Number(day);

    if (!Number.isFinite(day) || day < 1 || day > 90) {
      return null;
    }

    const phase = PHASES.find(item =>
      day >= item.startDay &&
      day <= item.endDay
    );

    return phase ? clone(phase) : null;
  }

  function getPlanProgress(planId, referenceDate) {
    ensureInitialized();

    const plan = findOrThrow(planId);

    referenceDate = referenceDate || today();

    if (!isValidDate(referenceDate)) {
      throw new Error("تاريخ حساب التقدم غير صالح.");
    }

    const start = new Date(plan.startDate + "T12:00:00");
    const current = new Date(referenceDate + "T12:00:00");

    const elapsedDays = Math.floor(
      (current.getTime() - start.getTime()) /
      86400000
    ) + 1;

    const dayNumber = Math.max(
      0,
      Math.min(90, elapsedDays)
    );

    const completedMilestones = plan.milestones.filter(
      item => item.completed
    ).length;

    const milestoneRate = plan.milestones.length
      ? Math.round(
          (completedMilestones / plan.milestones.length) * 100
        )
      : 0;

    const linkedGoals = plan.goalIds
      .map(id =>
        window.GoalsManager &&
        typeof window.GoalsManager.getById === "function"
          ? window.GoalsManager.getById(id)
          : null
      )
      .filter(Boolean);

    const goalProgress = linkedGoals.length
      ? Math.round(
          linkedGoals.reduce(
            (sum, goal) => sum + (Number(goal.progress) || 0),
            0
          ) / linkedGoals.length
        )
      : null;

    return {
      planId: plan.id,
      startDate: plan.startDate,
      endDate: plan.endDate,
      referenceDate: referenceDate,

      dayNumber: dayNumber,
      daysRemaining: Math.max(0, 90 - dayNumber),

      timeProgress: Math.round((dayNumber / 90) * 100),

      completedMilestones: completedMilestones,
      totalMilestones: plan.milestones.length,
      milestoneProgress: milestoneRate,

      linkedGoalsCount: linkedGoals.length,
      linkedGoalsProgress: goalProgress,

      currentPhase: dayNumber > 0
        ? getPhase(dayNumber)
        : null
    };
  }

  /* =========================================
     DELETE PLAN
  ========================================= */

  function remove(id) {
    ensureInitialized();

    const index = findIndex(id);

    if (index === -1) return false;

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

  /* =========================================
     SUMMARY
  ========================================= */

  function getSummary() {
    ensureInitialized();

    const active = plans.filter(
      plan => plan.status === "active"
    );

    const completed = plans.filter(
      plan => plan.status === "completed"
    );

    const totalMilestones = plans.reduce(
      (sum, plan) => sum + plan.milestones.length,
      0
    );

    const completedMilestones = plans.reduce(
      (sum, plan) =>
        sum + plan.milestones.filter(item => item.completed).length,
      0
    );

    return {
      totalPlans: plans.length,
      activePlans: active.length,
      pausedPlans: plans.filter(
        plan => plan.status === "paused"
      ).length,
      completedPlans: completed.length,
      cancelledPlans: plans.filter(
        plan => plan.status === "cancelled"
      ).length,

      totalMilestones: totalMilestones,
      completedMilestones: completedMilestones,

      milestoneProgress: totalMilestones
        ? Math.round(
            (completedMilestones / totalMilestones) * 100
          )
        : 0
    };
  }

  /* =========================================
     RESET
  ========================================= */

  function reset() {
    ensureInitialized();

    const previous = plans.slice();

    plans = [];

    try {
      save();
    } catch (error) {
      plans = previous;
      throw error;
    }

    emit("plan90:reset", {});

    return getSummary();
  }

  /* =========================================
     PUBLIC API
  ========================================= */

  window.Plan90Manager = Object.freeze({
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
