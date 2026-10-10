الملف: "finance.js"

استبدل محتوى الملف بالكامل بالكود التالي:

/* =========================================================
   MY LIFE OS — FINANCE MANAGER
   File: finance.js
   Purpose: Personal income, expenses, budgets, savings,
            debts, financial goals and summaries.
   ========================================================= */

(function (window) {
  "use strict";

  const STORAGE_KEY = "lifeos-finance";
  const VERSION = 1;

  const TRANSACTION_TYPES = Object.freeze({
    INCOME: "income",
    EXPENSE: "expense"
  });

  const GOAL_STATUSES = Object.freeze({
    ACTIVE: "active",
    COMPLETED: "completed",
    PAUSED: "paused",
    ARCHIVED: "archived"
  });

  const VALID_TRANSACTION_TYPES =
    Object.values(TRANSACTION_TYPES);

  const VALID_GOAL_STATUSES =
    Object.values(GOAL_STATUSES);

  let initialized = false;

  let transactions = [];
  let budgets = [];
  let savingsGoals = [];
  let debts = [];

  let sequence = 0;

  /* ---------------------------------------------------------
     UTILITIES
  --------------------------------------------------------- */

  function makeId(prefix) {
    sequence += 1;

    return [
      prefix,
      Date.now().toString(36),
      sequence.toString(36),
      Math.random().toString(36).slice(2, 9)
    ].join("-");
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function cleanText(value, maxLength) {
    if (typeof value !== "string") {
      return "";
    }

    return value.trim().slice(0, maxLength || 300);
  }

  function validDate(value) {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date.toISOString();
  }

  function number(value, min, max) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return min;
    }

    return Math.min(max, Math.max(min, parsed));
  }

  function money(value) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error("المبلغ المالي يجب أن يكون رقمًا غير سالب.");
    }

    return Math.round(parsed * 100) / 100;
  }

  function requireId(value) {
    const id = cleanText(value, 150);

    if (!id) {
      throw new Error("المعرّف مطلوب.");
    }

    return id;
  }

  function requireTitle(value) {
    const title = cleanText(value, 200);

    if (!title) {
      throw new Error("العنوان مطلوب.");
    }

    return title;
  }

  function requireInitialized() {
    if (!initialized) {
      initialize();
    }
  }

  function findById(list, id) {
    const normalizedId = requireId(id);

    return list.find(function (item) {
      return item.id === normalizedId;
    }) || null;
  }

  function replaceById(list, id, replacement) {
    const index = list.findIndex(function (item) {
      return item.id === id;
    });

    if (index < 0) {
      throw new Error("العنصر غير موجود.");
    }

    const previous = list[index];

    list[index] = replacement;

    return {
      index: index,
      previous: previous
    };
  }

  /* ---------------------------------------------------------
     STORAGE
  --------------------------------------------------------- */

  function readStorage() {
    const storage = window.AppStorage;

    if (storage) {
      try {
        if (typeof storage.get === "function") {
          const result = storage.get(STORAGE_KEY);

          if (result !== undefined && result !== null) {
            return result;
          }
        }

        if (typeof storage.getItem === "function") {
          const result = storage.getItem(STORAGE_KEY);

          if (result !== undefined && result !== null) {
            return typeof result === "string"
              ? JSON.parse(result)
              : result;
          }
        }

        if (typeof storage.load === "function") {
          const result = storage.load(STORAGE_KEY);

          if (result !== undefined && result !== null) {
            return result;
          }
        }
      } catch (error) {
        console.error(
          "[FinanceManager] Storage read failed:",
          error
        );
      }
    }

    try {
      const result = window.localStorage.getItem(STORAGE_KEY);

      return result ? JSON.parse(result) : null;
    } catch (error) {
      return null;
    }
  }

  function writeStorage(payload) {
    const storage = window.AppStorage;
    const value = clone(payload);

    if (storage) {
      try {
        if (typeof storage.set === "function") {
          storage.set(STORAGE_KEY, value);
          return true;
        }

        if (typeof storage.setItem === "function") {
          storage.setItem(
            STORAGE_KEY,
            JSON.stringify(value)
          );

          return true;
        }

        if (typeof storage.save === "function") {
          storage.save(STORAGE_KEY, value);
          return true;
        }
      } catch (error) {
        console.error(
          "[FinanceManager] Storage write failed:",
          error
        );
      }
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(value)
      );

      return true;
    } catch (error) {
      console.error(
        "[FinanceManager] Local storage write failed:",
        error
      );

      return false;
    }
  }

  function persist() {
    const success = writeStorage({
      version: VERSION,
      transactions: transactions,
      budgets: budgets,
      savingsGoals: savingsGoals,
      debts: debts
    });

    if (!success) {
      throw new Error(
        "تعذر حفظ البيانات المالية. تحقق من مساحة التخزين."
      );
    }
  }

  /* ---------------------------------------------------------
     EVENTS
  --------------------------------------------------------- */

  function emit(eventName, detail) {
    const payload = {
      module: "finance",
      event: eventName,
      timestamp: nowISO(),
      detail: detail || {}
    };

    const events = window.AppEvents;

    if (events) {
      try {
        if (typeof events.emit === "function") {
          events.emit("finance:" + eventName, payload);
        } else if (typeof events.publish === "function") {
          events.publish("finance:" + eventName, payload);
        } else if (typeof events.dispatch === "function") {
          events.dispatch("finance:" + eventName, payload);
        }
      } catch (error) {
        console.error(
          "[FinanceManager] Event dispatch failed:",
          error
        );
      }
    }

    try {
      window.dispatchEvent(
        new CustomEvent("lifeos:finance:" + eventName, {
          detail: payload
        })
      );
    } catch (error) {
      // Event notifications are optional.
    }
  }

  /* ---------------------------------------------------------
     TRANSACTIONS
  --------------------------------------------------------- */

  function normalizeTransaction(input, existing) {
    const source = isObject(input) ? input : {};
    const previous = existing || {};

    const type = source.type !== undefined
      ? source.type
      : previous.type;

    if (!VALID_TRANSACTION_TYPES.includes(type)) {
      throw new Error("نوع المعاملة يجب أن يكون income أو expense.");
    }

    const amount = money(
      source.amount !== undefined
        ? source.amount
        : previous.amount
    );

    if (amount <= 0) {
      throw new Error("يجب أن يكون مبلغ المعاملة أكبر من صفر.");
    }

    return {
      id: previous.id || makeId("transaction"),

      type: type,

      title: requireTitle(
        source.title !== undefined
          ? source.title
          : previous.title
      ),

      amount: amount,

      currency: cleanText(
        source.currency !== undefined
          ? source.currency
          : previous.currency
      ) || "MRU",

      category: cleanText(
        source.category !== undefined
          ? source.category
          : previous.category
      ) || "غير مصنف",

      account: cleanText(
        source.account !== undefined
          ? source.account
          : previous.account
      ),

      date:
        validDate(source.date) ||
        validDate(previous.date) ||
        nowISO(),

      notes: cleanText(
        source.notes !== undefined
          ? source.notes
          : previous.notes,
        3000
      ),

      tags: Array.isArray(
        source.tags !== undefined
          ? source.tags
          : previous.tags
      )
        ? (
            source.tags !== undefined
              ? source.tags
              : previous.tags
          )
            .filter(function (tag) {
              return typeof tag === "string";
            })
            .map(function (tag) {
              return cleanText(tag, 80);
            })
            .filter(Boolean)
            .slice(0, 50)
        : [],

      createdAt:
        validDate(previous.createdAt) ||
        nowISO(),

      updatedAt: nowISO()
    };
  }

  function createTransaction(input) {
    requireInitialized();

    if (!isObject(input)) {
      throw new Error("بيانات المعاملة غير صالحة.");
    }

    const transaction = normalizeTransaction(input, null);

    if (
      transactions.some(function (item) {
        return item.id === transaction.id;
      })
    ) {
      throw new Error("معرّف المعاملة مستخدم مسبقًا.");
    }

    transactions.unshift(transaction);

    try {
      persist();
    } catch (error) {
      transactions.shift();
      throw error;
    }

    emit("transaction-created", {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount
    });

    return clone(transaction);
  }

  function getTransactions(filters) {
    requireInitialized();

    const options = isObject(filters) ? filters : {};

    let result = transactions.slice();

    if (options.type) {
      result = result.filter(function (item) {
        return item.type === options.type;
      });
    }

    if (options.category) {
      result = result.filter(function (item) {
        return item.category === options.category;
      });
    }

    if (options.currency) {
      result = result.filter(function (item) {
        return item.currency === options.currency;
      });
    }

    if (options.from) {
      const from = validDate(options.from);

      if (from) {
        result = result.filter(function (item) {
          return item.date >= from;
        });
      }
    }

    if (options.to) {
      const to = validDate(options.to);

      if (to) {
        result = result.filter(function (item) {
          return item.date <= to;
        });
      }
    }

    if (options.query) {
      const query = cleanText(options.query, 300)
        .toLowerCase();

      result = result.filter(function (item) {
        return [
          item.title,
          item.category,
          item.notes,
          item.account
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      });
    }

    return clone(
      result.sort(function (a, b) {
        return b.date.localeCompare(a.date);
      })
    );
  }

  function getTransaction(id) {
    requireInitialized();

    const item = findById(transactions, id);

    return item ? clone(item) : null;
  }

  function updateTransaction(id, changes) {
    requireInitialized();

    const previous = findById(transactions, id);

    if (!previous) {
      throw new Error("المعاملة غير موجودة.");
    }

    if (!isObject(changes)) {
      throw new Error("التعديلات غير صالحة.");
    }

    const safeChanges = Object.assign({}, changes);

    delete safeChanges.id;
    delete safeChanges.createdAt;
    delete safeChanges.updatedAt;

    const updated = normalizeTransaction(
      Object.assign({}, previous, safeChanges),
      previous
    );

    const saved = replaceById(
      transactions,
      previous.id,
      updated
    );

    try {
      persist();
    } catch (error) {
      transactions[saved.index] = saved.previous;
      throw error;
    }

    emit("transaction-updated", {
      id: updated.id
    });

    return clone(updated);
  }

  function removeTransaction(id) {
    requireInitialized();

    const item = findById(transactions, id);

    if (!item) {
      return false;
    }

    const oldTransactions = transactions;

    transactions = transactions.filter(function (entry) {
      return entry.id !== item.id;
    });

    try {
      persist();
    } catch (error) {
      transactions = oldTransactions;
      throw error;
    }

    emit("transaction-removed", {
      id: item.id
    });

    return true;
  }

  /* ---------------------------------------------------------
     BUDGETS
  --------------------------------------------------------- */

  function normalizeBudget(input, existing) {
    const source = isObject(input) ? input : {};
    const previous = existing || {};

    const amount = money(
      source.amount !== undefined
        ? source.amount
        : previous.amount
    );

    if (amount <= 0) {
      throw new Error("يجب أن تكون قيمة الميزانية أكبر من صفر.");
    }

    const period = cleanText(
      source.period !== undefined
        ? source.period
        : previous.period
    ) || "monthly";

    if (!["weekly", "monthly", "yearly"].includes(period)) {
      throw new Error("فترة الميزانية غير صالحة.");
    }

    return {
      id: previous.id || makeId("budget"),

      title: requireTitle(
        source.title !== undefined
          ? source.title
          : previous.title
      ),

      category: cleanText(
        source.category !== undefined
          ? source.category
          : previous.category
      ) || "غير مصنف",

      amount: amount,

      currency: cleanText(
        source.currency !== undefined
          ? source.currency
          : previous.currency
      ) || "MRU",

      period: period,

      startDate:
        validDate(source.startDate) ||
        validDate(previous.startDate) ||
        nowISO(),

      endDate:
        validDate(source.endDate) ||
        validDate(previous.endDate),

      createdAt:
        validDate(previous.createdAt) ||
        nowISO(),

      updatedAt: nowISO()
    };
  }

  function createBudget(input) {
    requireInitialized();

    if (!isObject(input)) {
      throw new Error("بيانات الميزانية غير صالحة.");
    }

    const budget = normalizeBudget(input, null);

    budgets.unshift(budget);

    try {
      persist();
    } catch (error) {
      budgets.shift();
      throw error;
    }

    emit("budget-created", {
      id: budget.id
    });

    return clone(budget);
  }

  function getBudgets() {
    requireInitialized();

    return clone(budgets);
  }

  function updateBudget(id, changes) {
    requireInitialized();

    const previous = findById(budgets, id);

    if (!previous) {
      throw new Error("الميزانية غير موجودة.");
    }

    const updated = normalizeBudget(
      Object.assign({}, previous, changes),
      previous
    );

    const saved = replaceById(
      budgets,
      previous.id,
      updated
    );

    try {
      persist();
    } catch (error) {
      budgets[saved.index] = saved.previous;
      throw error;
    }

    emit("budget-updated", {
      id: updated.id
    });

    return clone(updated);
  }

  function removeBudget(id) {
    requireInitialized();

    const budget = findById(budgets, id);

    if (!budget) {
      return false;
    }

    const previous = budgets;

    budgets = budgets.filter(function (item) {
      return item.id !== budget.id;
    });

    try {
      persist();
    } catch (error) {
      budgets = previous;
      throw error;
    }

    emit("budget-removed", {
      id: budget.id
    });

    return true;
  }

  function getBudgetUsage(budgetId) {
    requireInitialized();

    const budget = findById(budgets, budgetId);

    if (!budget) {
      throw new Error("الميزانية غير موجودة.");
    }

    const start = validDate(budget.startDate);
    const end = validDate(budget.endDate);

    const matching = transactions.filter(function (item) {
      if (item.type !== TRANSACTION_TYPES.EXPENSE) {
        return false;
      }

      if (item.category !== budget.category) {
        return false;
      }

      if (item.currency !== budget.currency) {
        return false;
      }

      if (start && item.date < start) {
        return false;
      }

      if (end && item.date > end) {
        return false;
      }

      return true;
    });

    const spent = matching.reduce(function (sum, item) {
      return sum + item.amount;
    }, 0);

    const remaining = budget.amount - spent;

    return {
      budgetId: budget.id,
      title: budget.title,
      category: budget.category,
      currency: budget.currency,
      limit: budget.amount,
      spent: Math.round(spent * 100) / 100,
      remaining: Math.round(remaining * 100) / 100,
      usagePercent: Math.round(
        spent / budget.amount * 100
      ),
      exceeded: spent > budget.amount,
      transactionsCount: matching.length
    };
  }

  /* ---------------------------------------------------------
     SAVINGS GOALS
  --------------------------------------------------------- */

  function normalizeSavingsGoal(input, existing) {
    const source = isObject(input) ? input : {};
    const previous = existing || {};

    const targetAmount = money(
      source.targetAmount !== undefined
        ? source.targetAmount
        : previous.targetAmount
    );

    if (targetAmount <= 0) {
      throw new Error("الهدف المالي يجب أن يكون أكبر من صفر.");
    }

    const status = source.status !== undefined
      ? source.status
      : previous.status || GOAL_STATUSES.ACTIVE;

    if (!VALID_GOAL_STATUSES.includes(status)) {
      throw new Error("حالة الهدف المالي غير صالحة.");
    }

    const currentAmount = money(
      source.currentAmount !== undefined
        ? source.currentAmount
        : previous.currentAmount || 0
    );

    const completed =
      currentAmount >= targetAmount ||
      status === GOAL_STATUSES.COMPLETED;

    return {
      id: previous.id || makeId("saving"),

      title: requireTitle(
        source.title !== undefined
          ? source.title
          : previous.title
      ),

      description: cleanText(
        source.description !== undefined
          ? source.description
          : previous.description,
        3000
      ),

      targetAmount: targetAmount,

      currentAmount: completed
        ? Math.max(currentAmount, targetAmount)
        : currentAmount,

      currency: cleanText(
        source.currency !== undefined
          ? source.currency
          : previous.currency
      ) || "MRU",

      targetDate:
        validDate(source.targetDate) ||
        validDate(previous.targetDate),

      status: completed
        ? GOAL_STATUSES.COMPLETED
        : status,

      createdAt:
        validDate(previous.createdAt) ||
        nowISO(),

      updatedAt: nowISO()
    };
  }

  function createSavingsGoal(input) {
    requireInitialized();

    const goal = normalizeSavingsGoal(input, null);

    savingsGoals.unshift(goal);

    try {
      persist();
    } catch (error) {
      savingsGoals.shift();
      throw error;
    }

    emit("savings-goal-created", {
      id: goal.id
    });

    return clone(goal);
  }

  function getSavingsGoals() {
    requireInitialized();

    return clone(savingsGoals);
  }

  function updateSavingsGoal(id, changes) {
    requireInitialized();

    const previous = findById(savingsGoals, id);

    if (!previous) {
      throw new Error("هدف الادخار غير موجود.");
    }

    const updated = normalizeSavingsGoal(
      Object.assign({}, previous, changes),
      previous
    );

    const saved = replaceById(
      savingsGoals,
      previous.id,
      updated
    );

    try {
      persist();
    } catch (error) {
      savingsGoals[saved.index] = saved.previous;
      throw error;
    }

    emit("savings-goal-updated", {
      id: updated.id
    });

    return clone(updated);
  }

  function contributeToSavingsGoal(id, amount) {
    requireInitialized();

    const goal = findById(savingsGoals, id);

    if (!goal) {
      throw new Error("هدف الادخار غير موجود.");
    }

    const contribution = money(amount);

    if (contribution <= 0) {
      throw new Error("قيمة المساهمة يجب أن تكون أكبر من صفر.");
    }

    return updateSavingsGoal(id, {
      currentAmount: goal.currentAmount + contribution
    });
  }

  function removeSavingsGoal(id) {
    requireInitialized();

    const goal = findById(savingsGoals, id);

    if (!goal) {
      return false;
    }

    const previous = savingsGoals;

    savingsGoals = savingsGoals.filter(function (item) {
      return item.id !== goal.id;
    });

    try {
      persist();
    } catch (error) {
      savingsGoals = previous;
      throw error;
    }

    emit("savings-goal-removed", {
      id: goal.id
    });

    return true;
  }

  /* ---------------------------------------------------------
     DEBTS
  --------------------------------------------------------- */

  function normalizeDebt(input, existing) {
    const source = isObject(input) ? input : {};
    const previous = existing || {};

    const originalAmount = money(
      source.originalAmount !== undefined
        ? source.originalAmount
        : previous.originalAmount
    );

    if (originalAmount <= 0) {
      throw new Error("مبلغ الدين يجب أن يكون أكبر من صفر.");
    }

    const remainingAmount = money(
      source.remainingAmount !== undefined
        ? source.remainingAmount
        : previous.remainingAmount !== undefined
          ? previous.remainingAmount
          : originalAmount
    );

    if (remainingAmount > originalAmount) {
      throw new Error(
        "المبلغ المتبقي لا يمكن أن يتجاوز مبلغ الدين الأصلي."
      );
    }

    return {
      id: previous.id || makeId("debt"),

      title: requireTitle(
        source.title !== undefined
          ? source.title
          : previous.title
      ),

      person: cleanText(
        source.person !== undefined
          ? source.person
          : previous.person
      ),

      direction: (
        source.direction === "receivable" ||
        previous.direction === "receivable"
      )
        ? "receivable"
        : "payable",

      originalAmount: originalAmount,

      remainingAmount: remainingAmount,

      currency: cleanText(
        source.currency !== undefined
          ? source.currency
          : previous.currency
      ) || "MRU",

      dueDate:
        validDate(source.dueDate) ||
        validDate(previous.dueDate),

      notes: cleanText(
        source.notes !== undefined
          ? source.notes
          : previous.notes,
        3000
      ),

      status: remainingAmount <= 0
        ? "settled"
        : "active",

      createdAt:
        validDate(previous.createdAt) ||
        nowISO(),

      updatedAt: nowISO()
    };
  }

  function createDebt(input) {
    requireInitialized();

    const debt = normalizeDebt(input, null);

    debts.unshift(debt);

    try {
      persist();
    } catch (error) {
      debts.shift();
      throw error;
    }

    emit("debt-created", {
      id: debt.id
    });

    return clone(debt);
  }

  function getDebts(filters) {
    requireInitialized();

    const options = isObject(filters) ? filters : {};

    let result = debts.slice();

    if (options.direction) {
      result = result.filter(function (debt) {
        return debt.direction === options.direction;
      });
    }

    if (options.status) {
      result = result.filter(function (debt) {
        return debt.status === options.status;
      });
    }

    return clone(result);
  }

  function updateDebt(id, changes) {
    requireInitialized();

    const previous = findById(debts, id);

    if (!previous) {
      throw new Error("الدين غير موجود.");
    }

    const updated = normalizeDebt(
      Object.assign({}, previous, changes),
      previous
    );

    const saved = replaceById(
      debts,
      previous.id,
      updated
    );

    try {
      persist();
    } catch (error) {
      debts[saved.index] = saved.previous;
      throw error;
    }

    emit("debt-updated", {
      id: updated.id
    });

    return clone(updated);
  }

  function recordDebtPayment(id, amount) {
    requireInitialized();

    const debt = findById(debts, id);

    if (!debt) {
      throw new Error("الدين غير موجود.");
    }

    const payment = money(amount);

    if (payment <= 0) {
      throw new Error("قيمة السداد يجب أن تكون أكبر من صفر.");
    }

    if (payment > debt.remainingAmount) {
      throw new Error("قيمة السداد أكبر من المبلغ المتبقي.");
    }

    return updateDebt(id, {
      remainingAmount: debt.remainingAmount - payment
    });
  }

  function removeDebt(id) {
    requireInitialized();

    const debt = findById(debts, id);

    if (!debt) {
      return false;
    }

    const previous = debts;

    debts = debts.filter(function (item) {
      return item.id !== debt.id;
    });

    try {
      persist();
    } catch (error) {
      debts = previous;
      throw error;
    }

    emit("debt-removed", {
      id: debt.id
    });

    return true;
  }

  /* ---------------------------------------------------------
     FINANCIAL SUMMARY
  --------------------------------------------------------- */

  function getSummary(filters) {
    requireInitialized();

    const options = isObject(filters) ? filters : {};

    const from = validDate(options.from);
    const to = validDate(options.to);
    const currency = cleanText(options.currency, 20);

    const filtered = transactions.filter(function (item) {
      if (from && item.date < from) {
        return false;
      }

      if (to && item.date > to) {
        return false;
      }

      if (currency && item.currency !== currency) {
        return false;
      }

      return true;
    });

    const income = filtered
      .filter(function (item) {
        return item.type === TRANSACTION_TYPES.INCOME;
      })
      .reduce(function (sum, item) {
        return sum + item.amount;
      }, 0);

    const expenses = filtered
      .filter(function (item) {
        return item.type === TRANSACTION_TYPES.EXPENSE;
      })
      .reduce(function (sum, item) {
        return sum + item.amount;
      }, 0);

    const activeGoals = savingsGoals.filter(function (goal) {
      return goal.status === GOAL_STATUSES.ACTIVE;
    });

    const payable = debts
      .filter(function (debt) {
        return debt.direction === "payable";
      })
      .reduce(function (sum, debt) {
        return sum + debt.remainingAmount;
      }, 0);

    const receivable = debts
      .filter(function (debt) {
        return debt.direction === "receivable";
      })
      .reduce(function (sum, debt) {
        return sum + debt.remainingAmount;
      }, 0);

    const savingsTarget = activeGoals.reduce(
      function (sum, goal) {
        return sum + goal.targetAmount;
      },
      0
    );

    const currentSavings = activeGoals.reduce(
      function (sum, goal) {
        return sum + goal.currentAmount;
      },
      0
    );

    return {
      currency: currency || "multiple",

      transactionsCount: filtered.length,

      income: Math.round(income * 100) / 100,

      expenses: Math.round(expenses * 100) / 100,

      net: Math.round((income - expenses) * 100) / 100,

      savingsTarget:
        Math.round(savingsTarget * 100) / 100,

      currentSavings:
        Math.round(currentSavings * 100) / 100,

      remainingSavingsTarget:
        Math.round(
          Math.max(0, savingsTarget - currentSavings) * 100
        ) / 100,

      payableDebts:
        Math.round(payable * 100) / 100,

      receivableDebts:
        Math.round(receivable * 100) / 100,

      budgetsCount: budgets.length,

      savingsGoalsCount: savingsGoals.length,

      debtsCount: debts.length
    };
  }

  function getCategorySummary(filters) {
    requireInitialized();

    const options = isObject(filters) ? filters : {};
    const type = options.type || TRANSACTION_TYPES.EXPENSE;

    if (!VALID_TRANSACTION_TYPES.includes(type)) {
      throw new Error("نوع المعاملة غير صالح.");
    }

    const totals = {};

    getTransactions({
      type: type,
      from: options.from,
      to: options.to,
      currency: options.currency
    }).forEach(function (item) {
      const key = item.category + " [" + item.currency + "]";

      totals[key] = (totals[key] || 0) + item.amount;
    });

    return Object.keys(totals)
      .map(function (category) {
        return {
          category: category,
          amount: Math.round(totals[category] * 100) / 100
        };
      })
      .sort(function (a, b) {
        return b.amount - a.amount;
      });
  }

  /* ---------------------------------------------------------
     EXPORT / IMPORT / RESET
  --------------------------------------------------------- */

  function exportData() {
    requireInitialized();

    return {
      version: VERSION,
      exportedAt: nowISO(),
      transactions: clone(transactions),
      budgets: clone(budgets),
      savingsGoals: clone(savingsGoals),
      debts: clone(debts)
    };
  }

  function importData(data, options) {
    requireInitialized();

    if (!isObject(data)) {
      throw new Error("ملف البيانات المالية غير صالح.");
    }

    const settings = isObject(options) ? options : {};
    const replace = settings.replace === true;

    const incoming = {
      transactions: data.transactions || [],
      budgets: data.budgets || [],
      savingsGoals: data.savingsGoals || [],
      debts: data.debts || []
    };

    Object.keys(incoming).forEach(function (key) {
      if (!Array.isArray(incoming[key])) {
        throw new Error("قائمة البيانات غير صالحة: " + key);
      }
    });

    const nextTransactions = incoming.transactions.map(
      function (item) {
        return normalizeTransaction(item, item);
      }
    );

    const nextBudgets = incoming.budgets.map(
      function (item) {
        return normalizeBudget(item, item);
      }
    );

    const nextSavingsGoals = incoming.savingsGoals.map(
      function (item) {
        return normalizeSavingsGoal(item, item);
      }
    );

    const nextDebts = incoming.debts.map(
      function (item) {
        return normalizeDebt(item, item);
      }
    );

    const merge = function (current, incomingList) {
      if (replace) {
        return incomingList;
      }

      const result = current.slice();

      incomingList.forEach(function (item) {
        const index = result.findIndex(function (existing) {
          return existing.id === item.id;
        });

        if (index >= 0) {
          throw new Error(
            "يوجد معرّف مكرر أثناء الاستيراد: " + item.id
          );
        }

        result.push(item);
      });

      return result;
    };

    const next = {
      transactions: merge(transactions, nextTransactions),
      budgets: merge(budgets, nextBudgets),
      savingsGoals: merge(savingsGoals, nextSavingsGoals),
      debts: merge(debts, nextDebts)
    };

    const old = {
      transactions: transactions,
      budgets: budgets,
      savingsGoals: savingsGoals,
      debts: debts
    };

    transactions = next.transactions;
    budgets = next.budgets;
    savingsGoals = next.savingsGoals;
    debts = next.debts;

    try {
      persist();
    } catch (error) {
      transactions = old.transactions;
      budgets = old.budgets;
      savingsGoals = old.savingsGoals;
      debts = old.debts;
      throw error;
    }

    emit("data-imported", {
      replace: replace
    });

    return getSummary();
  }

  function reset() {
    requireInitialized();

    const old = {
      transactions: transactions,
      budgets: budgets,
      savingsGoals: savingsGoals,
      debts: debts
    };

    transactions = [];
    budgets = [];
    savingsGoals = [];
    debts = [];

    try {
      persist();
    } catch (error) {
      transactions = old.transactions;
      budgets = old.budgets;
      savingsGoals = old.savingsGoals;
      debts = old.debts;
      throw error;
    }

    emit("reset", {});

    return true;
  }

  /* ---------------------------------------------------------
     INITIALIZATION
  --------------------------------------------------------- */

  function initialize() {
    if (initialized) {
      return getSummary();
    }

    const saved = readStorage();

    if (isObject(saved)) {
      transactions = Array.isArray(saved.transactions)
        ? saved.transactions
            .filter(isObject)
            .map(function (item) {
              try {
                return normalizeTransaction(item, item);
              } catch (error) {
                return null;
              }
            })
            .filter(Boolean)
        : [];

      budgets = Array.isArray(saved.budgets)
        ? saved.budgets
            .filter(isObject)
            .map(function (item) {
              try {
                return normalizeBudget(item, item);
              } catch (error) {
                return null;
              }
            })
            .filter(Boolean)
        : [];

      savingsGoals = Array.isArray(saved.savingsGoals)
        ? saved.savingsGoals
            .filter(isObject)
            .map(function (item) {
              try {
                return normalizeSavingsGoal(item, item);
              } catch (error) {
                return null;
              }
            })
            .filter(Boolean)
        : [];

      debts = Array.isArray(saved.debts)
        ? saved.debts
            .filter(isObject)
            .map(function (item) {
              try {
                return normalizeDebt(item, item);
              } catch (error) {
                return null;
              }
            })
            .filter(Boolean)
        : [];
    }

    initialized = true;

    emit("initialized", {
      transactions: transactions.length,
      budgets: budgets.length,
      savingsGoals: savingsGoals.length,
      debts: debts.length
    });

    return getSummary();
  }

  /* ---------------------------------------------------------
     PUBLIC API
  --------------------------------------------------------- */

  window.FinanceManager = {
    version: VERSION,

    TRANSACTION_TYPES: TRANSACTION_TYPES,
    GOAL_STATUSES: GOAL_STATUSES,

    initialize: initialize,

    createTransaction: createTransaction,
    getTransactions: getTransactions,
    getTransaction: getTransaction,
    updateTransaction: updateTransaction,
    removeTransaction: removeTransaction,

    createBudget: createBudget,
    getBudgets: getBudgets,
    updateBudget: updateBudget,
    removeBudget: removeBudget,
    getBudgetUsage: getBudgetUsage,

    createSavingsGoal: createSavingsGoal,
    getSavingsGoals: getSavingsGoals,
    updateSavingsGoal: updateSavingsGoal,
    contributeToSavingsGoal: contributeToSavingsGoal,
    removeSavingsGoal: removeSavingsGoal,

    createDebt: createDebt,
    getDebts: getDebts,
    updateDebt: updateDebt,
    recordDebtPayment: recordDebtPayment,
    removeDebt: removeDebt,

    getSummary: getSummary,
    getCategorySummary: getCategorySummary,

    exportData: exportData,
    importData: importData,
    reset: reset
  };

})(window);

مهم: هذا الملف لم يُختبر تكامليًا بعد، ولم نتحقق بعد من توافق واجهة التخزين والأحداث مع بقية ملفات المشروع. كما أن البيانات المخزنة محليًا في المتصفح ليست بديلًا عن نظام مالي آمن أو نسخة احتياطية خارجية.

بعد حفظ الملف، اكتب تم لننتقل إلى "health.js" أو نراجع ترتيب الملفات إذا ظهر اختلاف في قائمة المستودع.