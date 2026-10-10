/* =========================================
MY LIFE OS — SEARCH
File: Search.js
البحث المركزي في البيانات الشخصية
========================================= */

(function () {
"use strict";

const MODULE_NAME = "Search";
const ROOT_ID = "search-root";

const SOURCES = [
{
type: "goal",
label: "الأهداف",
icon: "🎯",
keys: [
"my_life_os_goals",
"life_os_goals",
"goals",
"lifeGoals"
]
},
{
type: "task",
label: "المهام",
icon: "📝",
keys: [
"my_life_os_tasks",
"life_os_tasks",
"tasks",
"lifeTasks"
]
},
{
type: "habit",
label: "العادات",
icon: "🔄",
keys: [
"my_life_os_habits",
"life_os_habits",
"habits",
"lifeHabits"
]
},
{
type: "note",
label: "الملاحظات",
icon: "📒",
keys: [
"my_life_os_notes",
"life_os_notes",
"notes",
"lifeNotes"
]
},
{
type: "memo",
label: "المذكرات",
icon: "📔",
keys: [
"my_life_os_memos",
"life_os_memos",
"memos",
"memo"
]
},
{
type: "learning",
label: "التعلم",
icon: "📚",
keys: [
"my_life_os_learning",
"life_os_learning",
"learning"
]
},
{
type: "career",
label: "المسار المهني",
icon: "💼",
keys: [
"my_life_os_career",
"life_os_career",
"career"
]
},
{
type: "domain",
label: "مجالات الحياة",
icon: "🌱",
keys: [
"my_life_os_domains",
"life_os_domains",
"lifeDomains",
"domains"
]
}
];

const state = {
query: "",
type: "all",
results: [],
dataLoaded: false,
root: null
};

/* =========================================
HELPERS
========================================= */

function escapeHTML(value) {
return String(value ?? "")
.replace(/&/g, "&")
.replace(/</g, "<")
.replace(/>/g, ">")
.replace(/"/g, """)
.replace(/'/g, "'");
}

function safeObject(value) {
return value &&
typeof value === "object" &&
!Array.isArray(value)
? value
: {};
}

function parseJSON(value) {
if (typeof value !== "string") return value;

try {
  return JSON.parse(value);
} catch (_) {
  return null;
}

}

function normalizeText(value) {
return String(value ?? "")
.normalize("NFKC")
.toLocaleLowerCase("ar")
.replace(/[أإآٱ]/g, "ا")
.replace(/ى/g, "ي")
.replace(/ة/g, "ه")
.replace(/ـ/g, "")
.replace(/[\u064B-\u065F\u0670]/g, "")
.replace(/\s+/g, " ")
.trim();
}

function getField(object, keys, fallback) {
const source = safeObject(object);

for (const key of keys) {
  if (
    Object.prototype.hasOwnProperty.call(source, key) &&
    source[key] !== null &&
    source[key] !== undefined
  ) {
    return source[key];
  }
}

return fallback;

}

function getTitle(item) {
if (typeof item === "string") return item;

return String(
  getField(
    item,
    ["title", "name", "label", "heading", "text"],
    "عنصر بلا عنوان"
  )
);

}

function getDescription(item) {
if (typeof item === "string") return "";

return String(
  getField(
    item,
    [
      "description",
      "content",
      "body",
      "details",
      "note",
      "summary"
    ],
    ""
  )
);

}

function getStatus(item) {
if (!item || typeof item !== "object") {
return "غير محدد";
}

return String(
  getField(
    item,
    ["status", "state"],
    item.completed === true ? "مكتمل" : "غير محدد"
  )
);

}

function getDate(item) {
if (!item || typeof item !== "object") return "";

const value = getField(
  item,
  [
    "updatedAt",
    "updated_at",
    "createdAt",
    "created_at",
    "date",
    "dueDate",
    "due_date"
  ],
  ""
);

if (!value) return "";

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
  return String(value);
}

return date.toLocaleDateString("ar");

}

/* =========================================
STORAGE ACCESS
========================================= */

function readAppStorage(key) {
try {
if (
window.AppStorage &&
typeof window.AppStorage.get === "function"
) {
return window.AppStorage.get(key);
}

  if (
    window.AppStorage &&
    typeof window.AppStorage.getItem === "function"
  ) {
    return window.AppStorage.getItem(key);
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

function normalizeCollection(value) {
const parsed = parseJSON(value);

if (Array.isArray(parsed)) return parsed;

if (parsed && typeof parsed === "object") {
  const nested = getField(
    parsed,
    ["items", "data", "records", "list"],
    null
  );

  if (Array.isArray(nested)) return nested;
}

return null;

}

function readCollection(keys) {
for (const key of keys) {
const appValue = readAppStorage(key);

  if (appValue !== undefined && appValue !== null) {
    const collection = normalizeCollection(appValue);

    if (collection) return collection;
  }

  try {
    const localValue = localStorage.getItem(key);

    if (localValue !== null) {
      const collection = normalizeCollection(localValue);

      if (collection) return collection;
    }
  } catch (error) {
    console.warn(
      `[${MODULE_NAME}] تعذرت قراءة التخزين المحلي:`,
      error
    );
  }
}

return [];

}

function loadAllData() {
const records = [];

SOURCES.forEach(source => {
  const items = readCollection(source.keys);

  items.forEach((item, index) => {
    if (
      item === null ||
      item === undefined ||
      (typeof item !== "object" && typeof item !== "string")
    ) {
      return;
    }

    records.push({
      id: String(
        getField(
          item,
          ["id", "uuid", "_id"],
          `${source.type}-${index}`
        )
      ),
      type: source.type,
      typeLabel: source.label,
      icon: source.icon,
      title: getTitle(item),
      description: getDescription(item),
      status: getStatus(item),
      date: getDate(item),
      original: item,
      sourceKey: source.keys[0]
    });
  });
});

state.dataLoaded = true;

return records;

}

/* =========================================
SEARCH ENGINE
========================================= */

function searchableText(record) {
return normalizeText([
record.title,
record.description,
record.status,
record.typeLabel,
record.date
].join(" "));
}

function scoreRecord(record, query) {
const normalizedQuery = normalizeText(query);

if (!normalizedQuery) return 0;

const title = normalizeText(record.title);
const description = normalizeText(record.description);
const combined = searchableText(record);

let score = 0;

if (title === normalizedQuery) {
  score += 100;
} else if (title.startsWith(normalizedQuery)) {
  score += 60;
} else if (title.includes(normalizedQuery)) {
  score += 40;
}

if (description.includes(normalizedQuery)) {
  score += 20;
}

if (combined.includes(normalizedQuery)) {
  score += 10;
}

const terms = normalizedQuery
  .split(" ")
  .filter(Boolean);

if (terms.length > 1) {
  const allTermsMatch = terms.every(term =>
    combined.includes(term)
  );

  if (allTermsMatch) score += 15;
}

return score;

}

function search(query, options) {
const settings = safeObject(options);
const type = settings.type || "all";
const limit = Math.max(
1,
Math.min(500, Number(settings.limit) || 100)
);

const records = loadAllData();
const normalizedQuery = normalizeText(query);

if (!normalizedQuery) {
  state.results = [];
  return [];
}

const results = records
  .filter(record => {
    return type === "all" || record.type === type;
  })
  .map(record => ({
    ...record,
    score: scoreRecord(record, normalizedQuery)
  }))
  .filter(record => record.score > 0)
  .sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.title.localeCompare(b.title, "ar");
  })
  .slice(0, limit);

state.results = results;

return results;

}

/* =========================================
RESULT RENDERING
========================================= */

function highlightText(text, query) {
const original = String(text ?? "");
const normalizedQuery = normalizeText(query);

if (!normalizedQuery) {
  return escapeHTML(original);
}

/*
  لا نستخدم HTML خامًا من البيانات.
  نعرض النص بعد تهريبه للحفاظ على أمان الواجهة.
*/

const safeText = escapeHTML(original);
const safeQuery = escapeHTML(query.trim());

if (!safeQuery) return safeText;

const escapedQuery = safeQuery.replace(
  /[.*+?^${}()|[\]\\]/g,
  "\\$&"
);

try {
  return safeText.replace(
    new RegExp(`(${escapedQuery})`, "gi"),
    "<mark>$1</mark>"
  );
} catch (_) {
  return safeText;
}

}

function renderResult(record) {
const description = record.description
? "<p class="search-result-description"> ${escapeHTML(record.description.slice(0, 220))} ${record.description.length > 220 ? "…" : ""} </p>"
: "";

return `
  <article
    class="search-result-card"
    data-result-type="${escapeHTML(record.type)}"
    data-result-id="${escapeHTML(record.id)}"
  >
    <div class="search-result-icon" aria-hidden="true">
      ${escapeHTML(record.icon)}
    </div>

    <div class="search-result-content">
      <div class="search-result-heading">
        <h3>${highlightText(record.title, state.query)}</h3>
        <span class="search-result-type">
          ${escapeHTML(record.typeLabel)}
        </span>
      </div>

      ${description}

      <div class="search-result-meta">
        <span>الحالة: ${escapeHTML(record.status)}</span>
        ${
          record.date
            ? `<span>التاريخ: ${escapeHTML(record.date)}</span>`
            : ""
        }
      </div>
    </div>
  </article>
`;

}

function renderResults(results) {
if (!state.query.trim()) {
return "<div class="search-empty-state"> <div class="search-empty-icon" aria-hidden="true">🔎</div> <h3>ابحث في حياتك</h3> <p> اكتب كلمة للبحث في أهدافك ومهامك وعاداتك وملاحظاتك. </p> </div>";
}

if (!results.length) {
  return `
    <div class="search-empty-state">
      <div class="search-empty-icon" aria-hidden="true">📭</div>
      <h3>لم نعثر على نتائج</h3>
      <p>جرّب كلمات أخرى أو اختر نوعًا مختلفًا من البيانات.</p>
    </div>
  `;
}

return `
  <div class="search-results-summary" aria-live="polite">
    عدد النتائج: <strong>${results.length}</strong>
  </div>

  <div class="search-results-list">
    ${results.map(renderResult).join("")}
  </div>
`;

}

/* =========================================
STYLES
========================================= */

function renderStyles() {
return `
<style id="search-styles">
#${ROOT_ID} {
direction: rtl;
width: 100%;
color: var(--text-color, #f5f5f5);
font-family: inherit;
}

    #${ROOT_ID} *,
    #${ROOT_ID} *::before,
    #${ROOT_ID} *::after {
      box-sizing: border-box;
    }

    #${ROOT_ID} .search-header {
      margin-bottom: 20px;
    }

    #${ROOT_ID} .search-header h2 {
      margin: 0 0 8px;
      font-size: 1.35rem;
    }

    #${ROOT_ID} .search-header p {
      color: var(--muted-color, #a6adbb);
      line-height: 1.7;
      margin: 0;
      font-size: .9rem;
    }

    #${ROOT_ID} .search-form {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      margin-bottom: 14px;
    }

    #${ROOT_ID} .search-input-wrap {
      position: relative;
      min-width: 0;
    }

    #${ROOT_ID} .search-input {
      width: 100%;
      min-height: 48px;
      border: 1px solid var(--border-color, #343b4b);
      border-radius: 12px;
      padding: 12px 42px 12px 12px;
      font: inherit;
      color: inherit;
      background: var(--surface-color, #171e2b);
      outline: none;
    }

    #${ROOT_ID} .search-input:focus {
      border-color: var(--accent-color, #d6b45d);
      box-shadow: 0 0 0 2px
        color-mix(in srgb, var(--accent-color, #d6b45d) 20%, transparent);
    }

    #${ROOT_ID} .search-input-icon {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
    }

    #${ROOT_ID} .search-clear {
      min-width: 72px;
      border: 1px solid var(--border-color, #343b4b);
      border-radius: 12px;
      padding: 10px 14px;
      font: inherit;
      cursor: pointer;
      background: var(--accent-color, #d6b45d);
      color: #171717;
      font-weight: 700;
    }

    #${ROOT_ID} .search-filters {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 18px;
    }

    #${ROOT_ID} .search-filter {
      border: 1px solid var(--border-color, #343b4b);
      border-radius: 99px;
      padding: 8px 13px;
      color: inherit;
      background: var(--surface-color, #171e2b);
      font: inherit;
      font-size: .84rem;
      cursor: pointer;
    }

    #${ROOT_ID} .search-filter[aria-pressed="true"] {
      background: var(--accent-color, #d6b45d);
      color: #171717;
      border-color: var(--accent-color, #d6b45d);
      font-weight: 700;
    }

    #${ROOT_ID} button:focus-visible {
      outline: 2px solid var(--accent-color, #d6b45d);
      outline-offset: 3px;
    }

    #${ROOT_ID} .search-results-summary {
      margin-bottom: 12px;
      color: var(--muted-color, #a6adbb);
      font-size: .88rem;
    }

    #${ROOT_ID} .search-results-list {
      display: grid;
      gap: 10px;
    }

    #${ROOT_ID} .search-result-card {
      display: flex;
      gap: 12px;
      padding: 15px;
      border-radius: 14px;
      border: 1px solid var(--border-color, #343b4b);
      background: var(--card-bg, #171e2b);
      min-width: 0;
    }

    #${ROOT_ID} .search-result-icon {
      flex: 0 0 40px;
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      border-radius: 12px;
      background: var(--surface-color, #202838);
      font-size: 1.25rem;
    }

    #${ROOT_ID} .search-result-content {
      min-width: 0;
      flex: 1;
    }

    #${ROOT_ID} .search-result-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }

    #${ROOT_ID} .search-result-heading h3 {
      margin: 0;
      font-size: .98rem;
      overflow-wrap: anywhere;
    }

    #${ROOT_ID} .search-result-type {
      color: var(--accent-color, #d6b45d);
      font-size: .78rem;
      white-space: nowrap;
    }

    #${ROOT_ID} .search-result-description {
      color: var(--muted-color, #b2b9c7);
      font-size: .88rem;
      line-height: 1.7;
      margin: 9px 0;
      overflow-wrap: anywhere;
    }

    #${ROOT_ID} .search-result-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 14px;
      color: var(--muted-color, #a6adbb);
      font-size: .78rem;
    }

    #${ROOT_ID} mark {
      background: #e6c76d;
      color: #171717;
      border-radius: 3px;
      padding: 0 2px;
    }

    #${ROOT_ID} .search-empty-state {
      padding: 36px 16px;
      text-align: center;
      border: 1px dashed var(--border-color, #343b4b);
      border-radius: 16px;
      color: var(--muted-color, #a6adbb);
      line-height: 1.8;
    }

    #${ROOT_ID} .search-empty-icon {
      font-size: 2.3rem;
      margin-bottom: 10px;
    }

    #${ROOT_ID} .search-empty-state h3 {
      color: var(--text-color, #f5f5f5);
      margin: 0 0 8px;
    }

    #${ROOT_ID} .search-empty-state p {
      margin: 0;
    }

    @media (max-width: 480px) {
      #${ROOT_ID} .search-form {
        grid-template-columns: 1fr;
      }

      #${ROOT_ID} .search-clear {
        width: 100%;
      }

      #${ROOT_ID} .search-result-card {
        padding: 12px;
      }
    }
  </style>
`;

}

/* =========================================
MAIN UI
========================================= */

function render() {
const root = state.root ||
document.getElementById(ROOT_ID);

if (!root) return false;

state.root = root;

root.innerHTML = `
  ${renderStyles()}

  <header class="search-header">
    <h2>البحث المركزي</h2>
    <p>
      اعثر على المعلومات التي سجلتها في مكان واحد.
    </p>
  </header>

  <form class="search-form" id="search-form" role="search">
    <div class="search-input-wrap">
      <span class="search-input-icon" aria-hidden="true">🔎</span>

      <input
        id="search-query"
        class="search-input"
        type="search"
        value="${escapeHTML(state.query)}"
        placeholder="ابحث عن هدف أو مهمة أو ملاحظة..."
        autocomplete="off"
        aria-label="عبارة البحث"
      />
    </div>

    <button class="search-clear" type="button" id="search-clear">
      مسح
    </button>
  </form>

  <div class="search-filters" role="group" aria-label="تصفية النتائج">
    ${[
      ["all", "الكل"],
      ["goal", "🎯 الأهداف"],
      ["task", "📝 المهام"],
      ["habit", "🔄 العادات"],
      ["note", "📒 الملاحظات"],
      ["memo", "📔 المذكرات"],
      ["learning", "📚 التعلم"],
      ["career", "💼 العمل"],
      ["domain", "🌱 المجالات"]
    ].map(([type, label]) => `
      <button
        type="button"
        class="search-filter"
        data-search-type="${type}"
        aria-pressed="${state.type === type ? "true" : "false"}"
      >
        ${label}
      </button>
    `).join("")}
  </div>

  <section id="search-results" aria-live="polite">
    ${renderResults(state.results)}
  </section>
`;

bindEvents(root);

return true;

}

/* =========================================
EVENT HANDLERS
========================================= */

function updateResults() {
state.results = search(state.query, {
type: state.type,
limit: 100
});

const resultsContainer =
  state.root.querySelector("#search-results");

if (resultsContainer) {
  resultsContainer.innerHTML = renderResults(state.results);
}

state.root
  .querySelectorAll("[data-search-type]")
  .forEach(button => {
    button.setAttribute(
      "aria-pressed",
      button.dataset.searchType === state.type
        ? "true"
        : "false"
    );
  });

}

function bindEvents(root) {
const form = root.querySelector("#search-form");
const input = root.querySelector("#search-query");
const clearButton = root.querySelector("#search-clear");

if (form) {
  form.addEventListener("submit", event => {
    event.preventDefault();
    updateResults();
  });
}

if (input) {
  input.addEventListener("input", event => {
    state.query = event.target.value;
    updateResults();
  });
}

if (clearButton) {
  clearButton.addEventListener("click", () => {
    state.query = "";
    state.results = [];

    const searchInput =
      root.querySelector("#search-query");

    if (searchInput) {
      searchInput.value = "";
      searchInput.focus();
    }

    updateResults();
  });
}

root
  .querySelectorAll("[data-search-type]")
  .forEach(button => {
    button.addEventListener("click", () => {
      state.type = button.dataset.searchType || "all";
      updateResults();
    });
  });

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

state.root = root;
state.query = "";
state.type = "all";
state.results = [];

render();

return true;

}

function refresh() {
updateResults();
return state.results;
}

function getResults() {
return state.results.map(record => ({
id: record.id,
type: record.type,
typeLabel: record.typeLabel,
title: record.title,
description: record.description,
status: record.status,
date: record.date,
score: record.score
}));
}

function setQuery(query) {
state.query = String(query ?? "");

if (state.root) {
  const input = state.root.querySelector("#search-query");

  if (input) input.value = state.query;
}

updateResults();

return getResults();

}

function setType(type) {
const validTypes = [
"all",
...SOURCES.map(source => source.type)
];

state.type = validTypes.includes(type) ? type : "all";

updateResults();

return state.type;

}

window.Search = {
init,
render,
search,
refresh,
getResults,
setQuery,
setType
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