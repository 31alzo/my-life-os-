
/* ========================================
   MY LIFE OS — Reviews & Self Assessment
   المراجعة والتقييم الذاتي
======================================== */

"use strict";

const ReviewsManager = (() => {
  const STORAGE_KEY = "reviews";

  const TYPES = [
    "daily",
    "weekly",
    "monthly"
  ];

  function getAll() {
    const reviews = AppStorage.get(STORAGE_KEY, []);
    return Array.isArray(reviews) ? reviews : [];
  }

  function getById(id) {
    return getAll().find(review => review.id === id) || null;
  }

  function create(data = {}) {
    if (!TYPES.includes(data.type)) {
      return {
        success: false,
        message: "اختر نوع المراجعة."
      };
    }

    const review = {
      id: AppUtils.createId(),
      type: data.type,
      date:
        typeof data.date === "string"
          ? data.date
          : AppUtils.getToday(),
      achievements:
        typeof data.achievements === "string"
          ? data.achievements.trim()
          : "",
      challenges:
        typeof data.challenges === "string"
          ? data.challenges.trim()
          : "",
      lessons:
        typeof data.lessons === "string"
          ? data.lessons.trim()
          : "",
      nextActions:
        typeof data.nextActions === "string"
          ? data.nextActions.trim()
          : "",
      ratings: normalizeRatings(data.ratings),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = AppStorage.set(
      STORAGE_KEY,
      [...getAll(), review]
    );

    return result.success
      ? { success: true, review }
      : result;
  }

  function normalizeRatings(ratings) {
    const normalized = {};

    if (!ratings || typeof ratings !== "object") {
      return normalized;
    }

    for (const [area, value] of Object.entries(ratings)) {
      if (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 1 &&
        value <= 10
      ) {
        normalized[area] = value;
      }
    }

    return normalized;
  }

  function update(id, changes = {}) {
    const reviews = getAll();
    const index = reviews.findIndex(review => review.id === id);

    if (index === -1) {
      return {
        success: false,
        message: "لم يتم العثور على المراجعة."
      };
    }

    const review = { ...reviews[index] };

    if (TYPES.includes(changes.type)) {
      review.type = changes.type;
    }

    for (const field of [
      "date",
      "achievements",
      "challenges",
      "lessons",
      "nextActions"
    ]) {
      if (typeof changes[field] === "string") {
        review[field] = changes[field].trim();
      }
    }

    if (changes.ratings && typeof changes.ratings === "object") {
      review.ratings = {
        ...review.ratings,
        ...normalizeRatings(changes.ratings)
      };
    }

    review.updatedAt = new Date().toISOString();
    reviews[index] = review;

    const result = AppStorage.set(STORAGE_KEY, reviews);

    return result.success
      ? { success: true, review }
      : result;
  }

  function remove(id) {
    const reviews = getAll();

    if (!reviews.some(review => review.id === id)) {
      return {
        success: false,
        message: "لم يتم العثور على المراجعة."
      };
    }

    const result = AppStorage.set(
      STORAGE_KEY,
      reviews.filter(review => review.id !== id)
    );

    return result.success
      ? { success: true }
      : result;
  }

  function getByType(type) {
    return getAll()
      .filter(review => review.type === type)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  function getByDate(date) {
    return getAll().filter(review => review.date === date);
  }

  function getLatest(type) {
    return getByType(type)[0] || null;
  }

  return Object.freeze({
    getAll,
    getById,
    create,
    update,
    remove,
    getByType,
    getByDate,
    getLatest
  });
})();
