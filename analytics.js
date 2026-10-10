/* =========================================
MY LIFE OS — ANALYTICS
File: Analytics.js
الإصدار الأول — لوحة تحليل التقدم الشخصي
========================================= */

(function () {
"use strict";

const MODULE_NAME = "Analytics";
const ROOT_ID = "analytics-root";
const STORAGE_KEY = "my_life_os_analytics";

const DEFAULT_SETTINGS = {
period: "week",
showGoals: true,
showTasks: true,
showHabits: true,
showDomains: true
};

const state = {
settings: { ...DEFAULT_SETTINGS },
data: null
};

/* =========================================
UTILITIES
========================================= */

function safeArray(value) {
return Array.isArray(value) ? value : [];
}

function safeObject(value) {
return value && typeof value === "object" && !Array.isArray(value)
? value
: {};
}

function escapeHTML(value) {
return String(value ?? "")
.replace(/&/g, "&")
.replace(/</g, "<")
.replace(/>/g, ">")
.replace(/"/g, """)
.replace(/'/g, "'");
}

function readJSON(key, fallback) {
try {
const value = localStorage.getItem(key);
return value === null ? fallback : JSON.parse(value);
} catch (error) {
console.warn("[${MODULE_NAME}] تعذرت قراءة البيانات:", error);
return fallback;
}
}

function saveSettings() {
try {
localStorage.setItem(
STORAGE_KEY,
JSON.stringify(state.settings)
);
} catch (error) {
console.warn("[${MODULE_NAME}] تعذر حفظ الإعدادات:", error);
}
}

function firstDefined(object, keys, fallback) {
const source = safeObject(object);

for (const key of keys) {
  if (
    Object.prototype.hasOwnProperty.call(source, key) &&
    source[key] !== undefined &&
    source[key] !== null
  ) {
    return source[key];
  }
}

return fallback;

}

function toDate(value) {
if (!value) return null;

const date = new Date(value);

return Number.isNaN(date.getTime()) ? null : date;

}

function dateFromItem(item) {
return toDate(
firstDefined(
item,
[
"completedAt",
"completed_at",
"updatedAt",
"updated_at",
"createdAt",
"created_at",
"date",
"timestamp"
],
null
)
);
}

function isCompleted(item) {
if (item === true) return true;

if (!item || typeof item !== "object") return false;

const status = String(
  firstDefined(item, ["status", "state"], "")
).toLowerCase();

if (
  [
    "completed",
    "complete",
    "done",
    "finished",
    "منجز",
    "مكتمل",
    "مكتملة",
    "تم"
  ].includes(status)
) {
  return true;
}

return (
  item.completed === true ||
  item.isCompleted === true ||
  item.is_completed === true ||
  item.done === true ||
  item.finished === true
);

}

function itemName(item, fallback) {
if (typeof item === "string") return item;

return String(
  firstDefined(
    item,
    ["title", "name", "label", "text"],
    fallback
  )
);

}

function percentage(completed, total) {
if (!total) return 0;

return Math.round((completed / total) * 100);

}

function clamp(value, min, max) {
return Math.min(max, Math.max(min, value));
}

/* =========================================
DATA ACCESS
يدعم مصادر متعددة بصورة احتياطية
========================================= */

function readFromAppStorage(key) {
try {
if (
typeof window.AppStorage !== "undefined" &&
window.AppStorage
) {
if (typeof window.AppStorage.get === "function") {
return window.AppStorage.get(key);
}

    if (typeof window.AppStorage.getItem === "function") {
      return window.AppStorage.getItem(key);
    }
  }
} catch (error) {
  console.warn(
    `[${MODULE_NAME}] تعذرت قراءة AppStorage:`,
    key,
    error
  );
}

return undefined;

}

function readCollection(candidates) {
for (const key of candidates) {
const appValue = readFromAppStorage(key);

  if (appValue !== undefined && appValue !== null) {
    const normalized =
      typeof appValue === "string"
        ? readJSONFromString(appValue)
        : appValue;

    if (Array.isArray(normalized)) return normalized;

    if (
      normalized &&
      typeof normalized === "object"
    ) {
      const nested = firstDefined(
        normalized,
        ["items", "data", "records", "list"],
        null
      );

      if (Array.isArray(nested)) return nested;
    }
  }

  const localValue = readJSON(key, null);

  if (Array.isArray(localValue)) return localValue;

  if (
    localValue &&
    typeof localValue === "object"
  ) {
    const nested = firstDefined(
      localValue,
      ["items", "data", "records", "list"],
      null
    );

    if (Array.isArray(nested)) return nested;
  }
}

return [];

}

function readJSONFromString(value) {
try {
return JSON.parse(value);
} catch (_) {
return null;
}
}

function loadData() {
const goals = readCollection([
"my_life_os_goals",
"life_os_goals",
"goals",
"lifeGoals"
]);

const tasks = readCollection([
  "my_life_os_tasks",
  "life_os_tasks",
  "tasks",
  "lifeTasks"
]);

const habits = readCollection([
  "my_life_os_habits",
  "life_os_habits",
  "habits",
  "lifeHabits"
]);

const domains = readCollection([
  "my_life_os_domains",
  "life_os_domains",
  "lifeDomains",
  "domains"
]);

state.data = {
  goals,
  tasks,
  habits,
  domains,
  updatedAt: new Date().toISOString()
};

return state.data;

}

/* =========================================
PERIODS
========================================= */

function getPeriodRange(period) {
const end = new Date();
end.setHours(23, 59, 59, 999);

const start = new Date(end);
start.setHours(0, 0, 0, 0);

if (period === "today") {
  return { start, end };
}

if (period === "week") {
  const day = start.getDay();
  const daysSinceSaturday = (day + 1) % 7;

  start.setDate(start.getDate() - daysSinceSaturday);
  return { start, end };
}

if (period === "month") {
  start.setDate(1);
  return { start, end };
}

if (period === "year") {
  start.setMonth(0, 1);
  return { start, end };
}

start.setTime(0);
start.setFullYear(2000);

return { start, end };

}

function isWithinPeriod(item, period) {
const date = dateFromItem(item);

if (!date) return false;

const range = getPeriodRange(period);

return date >= range.start && date <= range.end;

}

function countCompletedInPeriod(items, period) {
return safeArray(items).filter(
item => isCompleted(item) && isWithinPeriod(item, period)
).length;
}

/* =========================================
ANALYTICS CALCULATIONS
========================================= */

function calculateCollection(items, period) {
const list = safeArray(items);
const completed = list.filter(isCompleted).length;

return {
  total: list.length,
  completed,
  remaining: Math.max(0, list.length - completed),
  rate: percentage(completed, list.length),
  completedInPeriod: countCompletedInPeriod(list, period)
};

}

function calculateOverview(data, period) {
const goals = calculateCollection(data.goals, period);
const tasks = calculateCollection(data.tasks, period);
const habits = calculateCollection(data.habits, period);

const totalItems =
  goals.total + tasks.total + habits.total;

const completedItems =
  goals.completed + tasks.completed + habits.completed;

return {
  goals,
  tasks,
  habits,
  totalItems,
  completedItems,
  remainingItems: Math.max(0, totalItems - completedItems),
  overallRate: percentage(completedItems, totalItems)
};

}

function calculateDailyActivity(data, days) {
const result = [];
const count = clamp(Number(days) || 7, 1, 365);

const sources = [
  ...safeArray(data.tasks),
  ...safeArray(data.goals),
  ...safeArray(data.habits)
];

const today = new Date();

for (let offset = count - 1; offset >= 0; offset--) {
  const date = new Date(today);
  date.setDate(today.getDate() - offset);
  date.setHours(0, 0, 0, 0);

  const nextDay = new Date(date);
  nextDay.setDate(date.getDate() + 1);

  const completed = sources.filter(item => {
    if (!isCompleted(item)) return false;

    const itemDate = dateFromItem(item);

    return itemDate && itemDate >= date && itemDate < nextDay;
  }).length;

  result.push({
    date: date.toISOString().slice(0, 10),
    label: date.toLocaleDateString("ar", {
      weekday: "short",
      day: "numeric"
    }),
    completed
  });
}

return result;

}

function calculateDomainStats(domains) {
return safeArray(domains).map(domain => {
const progress = Number(
firstDefined(
domain,
["progress", "completion", "percentage"],
0
)
);

  return {
    name: itemName(domain, "مجال بلا اسم"),
    progress: clamp(
      Number.isFinite(progress) ? progress : 0,
      0,
      100
    )
  };
});

}

function getInsights(data, overview, activity) {
const insights = [];

if (overview.totalItems === 0) {
  insights.push({
    type: "info",
    title: "ابدأ بتسجيل بياناتك",
    description:
      "أضف هدفًا أو مهمة أو عادة حتى تتمكن من متابعة تقدمك."
  });

  return insights;
}

if (overview.overallRate >= 80) {
  insights.push({
    type: "success",
    title: "تقدم ملحوظ",
    description:
      "نسبة إنجازك مرتفعة. حافظ على الاستمرارية دون إرهاق نفسك."
  });
} else if (overview.overallRate >= 40) {
  insights.push({
    type: "info",
    title: "أنت تتقدم",
    description:
      "قسّم الأعمال المتبقية إلى خطوات صغيرة وحدد أولوياتك."
  });
} else {
  insights.push({
    type: "warning",
    title: "راجع أولوياتك",
    description:
      "ابدأ بمهمة صغيرة ومحددة لتسهيل العودة إلى مسارك."
  });
}

const latestActivity = activity.slice(-7);
const activeDays = latestActivity.filter(
  day => day.completed > 0
).length;

if (latestActivity.length && activeDays === 0) {
  insights.push({
    type: "info",
    title: "خطوة صغيرة اليوم",
    description:
      "سجّل إنجازًا واحدًا اليوم لتبدأ بناء سجل تقدمك."
  });
} else if (activeDays >= 5) {
  insights.push({
    type: "success",
    title: "استمرارية جيدة",
    description:
      `سجلت إنجازات في ${activeDays} من آخر ${latestActivity.length} أيام.`
  });
}

if (overview.tasks.remaining > 0) {
  insights.push({
    type: "info",
    title: "المهام المتبقية",
    description:
      `لديك ${overview.tasks.remaining} مهمة غير مكتملة. اختر الأهم أولًا.`
  });
}

return insights;

}

function getReport(period) {
const data = loadData();
const overview = calculateOverview(data, period);
const activity = calculateDailyActivity(data, 7);
const domains = calculateDomainStats(data.domains);
const insights = getInsights(data, overview, activity);

return {
  period,
  generatedAt: new Date().toISOString(),
  overview,
  activity,
  domains,
  insights
};

}

/* =========================================
RENDER HELPERS
========================================= */

function renderStatCard(title, value, subtitle, icon) {
return "<article class="analytics-stat-card"> <div class="analytics-stat-icon" aria-hidden="true"> ${escapeHTML(icon)} </div> <div class="analytics-stat-content"> <div class="analytics-stat-title">${escapeHTML(title)}</div> <div class="analytics-stat-value">${escapeHTML(value)}</div> <div class="analytics-stat-subtitle">${escapeHTML(subtitle)}</div> </div> </article>";
}

function renderProgressCard(title, stats, icon) {
return `
<article class="analytics-progress-card">
<div class="analytics-card-heading">
<span aria-hidden="true">${escapeHTML(icon)}</span>
<h3>${escapeHTML(title)}</h3>
</div>

    <div class="analytics-progress-number">
      ${stats.rate}%
    </div>

    <div
      class="analytics-progress-track"
      role="progressbar"
      aria-label="${escapeHTML(title)}"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow="${stats.rate}"
    >
      <div
        class="analytics-progress-fill"
        style="width:${stats.rate}%"
      ></div>
    </div>

    <div class="analytics-progress-details">
      <span>مكتمل: ${stats.completed}</span>
      <span>المجموع: ${stats.total}</span>
    </div>

    <div class="analytics-period-detail">
      إنجازات الفترة: ${stats.completedInPeriod}
    </div>
  </article>
`;

}

function renderActivityChart(activity) {
const maxValue = Math.max(
1,
...activity.map(day => day.completed)
);

return `
  <section class="analytics-panel">
    <div class="analytics-section-heading">
      <h3>النشاط اليومي</h3>
      <span>آخر ${activity.length} أيام</span>
    </div>

    <div class="analytics-chart" role="img"
      aria-label="رسم يوضح عدد الإنجازات اليومية">
      ${activity.map(day => {
        const height = Math.max(
          day.completed > 0 ? 8 : 3,
          (day.completed / maxValue) * 100
        );

        return `
          <div class="analytics-chart-column">
            <span class="analytics-chart-value">
              ${day.completed}
            </span>

            <div class="analytics-chart-bar-area">
              <div
                class="analytics-chart-bar"
                style="height:${height}%"
                title="${escapeHTML(day.label)}: ${day.completed}"
              ></div>
            </div>

            <span class="analytics-chart-label">
              ${escapeHTML(day.label)}
            </span>
          </div>
        `;
      }).join("")}
    </div>

    <p class="analytics-muted">
      يعتمد الرسم على تواريخ الإنجاز المسجلة في بياناتك.
    </p>
  </section>
`;

}

function renderDomains(domains) {
if (!domains.length) {
return "<section class="analytics-panel"> <h3>مجالات الحياة</h3> <p class="analytics-empty"> لا توجد مجالات مسجلة أو ذات نسب تقدم معروفة حتى الآن. </p> </section>";
}

return `
  <section class="analytics-panel">
    <h3>مجالات الحياة</h3>

    <div class="analytics-domain-list">
      ${domains.map(domain => `
        <div class="analytics-domain-item">
          <div class="analytics-domain-heading">
            <span>${escapeHTML(domain.name)}</span>
            <strong>${domain.progress}%</strong>
          </div>

          <div
            class="analytics-progress-track"
            role="progressbar"
            aria-label="${escapeHTML(domain.name)}"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow="${domain.progress}"
          >
            <div
              class="analytics-progress-fill"
              style="width:${domain.progress}%"
            ></div>
          </div>
        </div>
      `).join("")}
    </div>
  </section>
`;

}

function renderInsights(insights) {
return `
<section class="analytics-panel">
<h3>ملاحظات تساعدك على التقدم</h3>

    <div class="analytics-insights">
      ${insights.map(insight => `
        <article class="analytics-insight analytics-insight-${escapeHTML(insight.type)}">
          <strong>${escapeHTML(insight.title)}</strong>
          <p>${escapeHTML(insight.description)}</p>
        </article>
      `).join("")}
    </div>
  </section>
`;

}

function renderEmptyState() {
return "<div class="analytics-empty-state"> <div class="analytics-empty-icon" aria-hidden="true">📊</div> <h3>لوحة تقدمك الشخصي</h3> <p> ستظهر الإحصائيات عندما تسجل أهدافك ومهامك وعاداتك. </p> </div>";
}

function renderStyles() {
return `
<style id="analytics-styles">
#${ROOT_ID} {
direction: rtl;
color: var(--text-color, #f5f5f5);
font-family: inherit;
width: 100%;
box-sizing: border-box;
}

    #${ROOT_ID} *,
    #${ROOT_ID} *::before,
    #${ROOT_ID} *::after {
      box-sizing: border-box;
    }

    #${ROOT_ID} .analytics-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 20px;
    }

    #${ROOT_ID} .analytics-header h2 {
      margin: 0 0 6px;
      font-size: 1.35rem;
    }

    #${ROOT_ID} .analytics-muted,
    #${ROOT_ID} .analytics-header p {
      color: var(--muted-color, #a6adbb);
      font-size: .88rem;
      margin: 0;
    }

    #${ROOT_ID} .analytics-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    #${ROOT_ID} select,
    #${ROOT_ID} button {
      font: inherit;
      border-radius: 10px;
      padding: 10px 12px;
      border: 1px solid var(--border-color, #343b4b);
    }

    #${ROOT_ID} select {
      color: inherit;
      background: var(--surface-color, #171e2b);
    }

    #${ROOT_ID} button {
      cursor: pointer;
      color: #171717;
      background: var(--accent-color, #d6b45d);
      font-weight: 700;
    }

    #${ROOT_ID} button:focus-visible,
    #${ROOT_ID} select:focus-visible {
      outline: 2px solid var(--accent-color, #d6b45d);
      outline-offset: 3px;
    }

    #${ROOT_ID} .analytics-stats-grid,
    #${ROOT_ID} .analytics-progress-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    #${ROOT_ID} .analytics-stat-card,
    #${ROOT_ID} .analytics-progress-card,
    #${ROOT_ID} .analytics-panel {
      background: var(--card-bg, #171e2b);
      border: 1px solid var(--border-color, #343b4b);
      border-radius: 16px;
      padding: 16px;
      min-width: 0;
    }

    #${ROOT_ID} .analytics-stat-card {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    #${ROOT_ID} .analytics-stat-icon {
      font-size: 1.5rem;
    }

    #${ROOT_ID} .analytics-stat-title,
    #${ROOT_ID} .analytics-stat-subtitle {
      color: var(--muted-color, #a6adbb);
      font-size: .82rem;
    }

    #${ROOT_ID} .analytics-stat-value {
      font-size: 1.55rem;
      font-weight: 800;
      margin: 5px 0;
    }

    #${ROOT_ID} .analytics-card-heading {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    #${ROOT_ID} h3 {
      font-size: 1rem;
      margin: 0 0 14px;
    }

    #${ROOT_ID} .analytics-card-heading h3 {
      margin: 0;
    }

    #${ROOT_ID} .analytics-progress-number {
      font-size: 1.8rem;
      font-weight: 800;
      margin: 14px 0;
    }

    #${ROOT_ID} .analytics-progress-track {
      width: 100%;
      height: 8px;
      background: var(--border-color, #343b4b);
      border-radius: 99px;
      overflow: hidden;
    }

    #${ROOT_ID} .analytics-progress-fill {
      height: 100%;
      background: var(--accent-color, #d6b45d);
      border-radius: inherit;
      transition: width .25s ease;
    }

    #${ROOT_ID} .analytics-progress-details {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-top: 12px;
      font-size: .8rem;
      color: var(--muted-color, #a6adbb);
    }

    #${ROOT_ID} .analytics-period-detail {
      margin-top: 8px;
      font-size: .8rem;
    }

    #${ROOT_ID} .analytics-panel {
      margin-bottom: 16px;
    }

    #${ROOT_ID} .analytics-section-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 18px;
    }

    #${ROOT_ID} .analytics-section-heading h3 {
      margin: 0;
    }

    #${ROOT_ID} .analytics-section-heading span {
      color: var(--muted-color, #a6adbb);
      font-size: .8rem;
    }

    #${ROOT_ID} .analytics-chart {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 8px;
      min-height: 160px;
    }

    #${ROOT_ID} .analytics-chart-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 7px;
      min-width: 0;
    }

    #${ROOT_ID} .analytics-chart-value,
    #${ROOT_ID} .analytics-chart-label {
      font-size: .72rem;
      color: var(--muted-color, #a6adbb);
      text-align: center;
    }

    #${ROOT_ID} .analytics-chart-bar-area {
      width: 100%;
      height: 110px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    #${ROOT_ID} .analytics-chart-bar {
      width: min(34px, 75%);
      min-height: 3px;
      background: var(--accent-color, #d6b45d);
      border-radius: 6px 6px 2px 2px;
    }

    #${ROOT_ID} .analytics-domain-list {
      display: grid;
      gap: 16px;
    }

    #${ROOT_ID} .analytics-domain-heading {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;
      font-size: .9rem;
    }

    #${ROOT_ID} .analytics-insights {
      display: grid;
      gap: 10px;
    }

    #${ROOT_ID} .analytics-insight {
      border: 1px solid var(--border-color, #343b4b);
      border-radius: 12px;
      padding: 12px;
    }

    #${ROOT_ID} .analytics-insight strong {
      display: block;
      margin-bottom: 5px;
    }

    #${ROOT_ID} .analytics-insight p {
      margin: 0;
      font-size: .88rem;
      line-height: 1.7;
      color: var(--muted-color, #c0c5cf);
    }

    #${ROOT_ID} .analytics-insight-success {
      border-right: 3px solid #42b883;
    }

    #${ROOT_ID} .analytics-insight-warning {
      border-right: 3px solid #e8ad46;
    }

    #${ROOT_ID} .analytics-insight-info {
      border-right: 3px solid var(--accent-color, #d6b45d);
    }

    #${ROOT_ID} .analytics-empty-state,
    #${ROOT_ID} .analytics-empty {
      text-align: center;
      color: var(--muted-color, #a6adbb);
      padding: 24px 12px;
      line-height: 1.8;
    }

    #${ROOT_ID} .analytics-empty-icon {
      font-size: 2.4rem;
      margin-bottom: 10px;
    }

    #${ROOT_ID} .analytics-empty-state h3 {
      color: var(--text-color, #f5f5f5);
      margin-bottom: 8px;
    }

    @media (max-width: 650px) {
      #${ROOT_ID} .analytics-stats-grid,
      #${ROOT_ID} .analytics-progress-grid {
        grid-template-columns: 1fr;
      }

      #${ROOT_ID} .analytics-header {
        align-items: stretch;
      }

      #${ROOT_ID} .analytics-controls {
        width: 100%;
      }

      #${ROOT_ID} .analytics-controls select,
      #${ROOT_ID} .analytics-controls button {
        flex: 1;
        min-width: 0;
      }

      #${ROOT_ID} .analytics-stat-value {
        font-size: 1.35rem;
      }
    }
  </style>
`;

}

/* =========================================
MAIN RENDER
========================================= */

function render() {
const root = document.getElementById(ROOT_ID);

if (!root) {
  return false;
}

const report = getReport(state.settings.period);
const overview = report.overview;

root.innerHTML = `
  ${renderStyles()}

  <header class="analytics-header">
    <div>
      <h2>تحليل تقدمك</h2>
      <p>نظرة منظمة على إنجازاتك في MY LIFE OS</p>
    </div>

    <div class="analytics-controls">
      <label for="analytics-period">الفترة</label>

      <select id="analytics-period">
        <option value="today" ${state.settings.period === "today" ? "selected" : ""}>اليوم</option>
        <option value="week" ${state.settings.period === "week" ? "selected" : ""}>هذا الأسبوع</option>
        <option value="month" ${state.settings.period === "month" ? "selected" : ""}>هذا الشهر</option>
        <option value="year" ${state.settings.period === "year" ? "selected" : ""}>هذه السنة</option>
        <option value="all" ${state.settings.period === "all" ? "selected" : ""}>كل الوقت</option>
      </select>

      <button type="button" id="analytics-refresh">
        تحديث
      </button>
    </div>
  </header>

  ${
    overview.totalItems === 0
      ? renderEmptyState()
      : `
        <section class="analytics-stats-grid">
          ${renderStatCard(
            "إجمالي العناصر",
            overview.totalItems,
            "أهداف ومهام وعادات",
            "📋"
          )}

          ${renderStatCard(
            "العناصر المكتملة",
            overview.completedItems,
            "حسب الحالات المسجلة",
            "✅"
          )}

          ${renderStatCard(
            "نسبة الإنجاز",
            `${overview.overallRate}%`,
            "من إجمالي العناصر",
            "📈"
          )}
        </section>

        <section class="analytics-progress-grid">
          ${
            state.settings.showGoals
              ? renderProgressCard("الأهداف", overview.goals, "🎯")
              : ""
          }

          ${
            state.settings.showTasks
              ? renderProgressCard("المهام", overview.tasks, "📝")
              : ""
          }

          ${
            state.settings.showHabits
              ? renderProgressCard("العادات", overview.habits, "🔄")
              : ""
          }
        </section>

        ${renderActivityChart(report.activity)}

        ${
          state.settings.showDomains
            ? renderDomains(report.domains)
            : ""
        }

        ${renderInsights(report.insights)}
      `
  }

  <p class="analytics-muted">
    آخر إنشاء للتقرير:
    ${escapeHTML(new Date(report.generatedAt).toLocaleString("ar"))}
  </p>
`;

bindEvents(root);

return true;

}

/* =========================================
EVENTS
========================================= */

function bindEvents(root) {
const periodSelect = root.querySelector("#analytics-period");
const refreshButton = root.querySelector("#analytics-refresh");

if (periodSelect) {
  periodSelect.addEventListener("change", event => {
    const allowed = ["today", "week", "month", "year", "all"];
    const value = event.target.value;

    state.settings.period = allowed.includes(value)
      ? value
      : "week";

    saveSettings();
    render();
  });
}

if (refreshButton) {
  refreshButton.addEventListener("click", () => {
    loadData();
    render();
  });
}

}

/* =========================================
PUBLIC API
========================================= */

function init(target) {
const root =
typeof target === "string"
? document.querySelector(target)
: target || document.getElementById(ROOT_ID);

if (!root) {
  console.warn(
    `[${MODULE_NAME}] لم يتم العثور على عنصر العرض. أنشئ عنصرًا يحمل id="${ROOT_ID}".`
  );

  return false;
}

if (root.id !== ROOT_ID) {
  root.id = ROOT_ID;
}

const savedSettings = readJSON(
  STORAGE_KEY,
  DEFAULT_SETTINGS
);

state.settings = {
  ...DEFAULT_SETTINGS,
  ...safeObject(savedSettings)
};

loadData();

return render();

}

function refresh() {
loadData();
return render();
}

function getStats(period) {
const selectedPeriod = [
"today",
"week",
"month",
"year",
"all"
].includes(period)
? period
: state.settings.period;

return getReport(selectedPeriod);

}

function setVisibility(options) {
state.settings = {
...state.settings,
...safeObject(options)
};

saveSettings();
render();

return { ...state.settings };

}

function getSettings() {
return { ...state.settings };
}

window.Analytics = {
init,
render,
refresh,
getStats,
setVisibility,
getSettings
};

if (document.readyState === "loading") {
document.addEventListener("DOMContentLoaded", () => {
if (document.getElementById(ROOT_ID)) {
init();
}
});
} else if (document.getElementById(ROOT_ID)) {
init();
}
})();