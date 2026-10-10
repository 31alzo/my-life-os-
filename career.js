
/* ========================================
   MY LIFE OS — Career & CV Manager
   المسار المهني والسيرة الذاتية
======================================== */

"use strict";

const CareerManager = (() => {
  const STORAGE_KEY = "career-profile";

  const STATUSES = [
    "obtained",
    "in_progress",
    "planned",
    "not_needed"
  ];

  const TYPES = [
    "education",
    "certificate",
    "language",
    "digital_skill",
    "course",
    "project",
    "experience",
    "internship"
  ];

  function getProfile() {
    const profile = AppStorage.get(STORAGE_KEY, null);

    if (!profile || typeof profile !== "object") {
      return {
        fullName: "",
        professionalSummary: "",
        targetRole: "",
        entries: [],
        skills: [],
        languages: [],
        updatedAt: null
      };
    }

    return profile;
  }

  function saveProfile(changes = {}) {
    const current = getProfile();

    const updated = {
      ...current,
      ...changes,
      updatedAt: new Date().toISOString()
    };

    const result = AppStorage.set(STORAGE_KEY, updated);

    return result.success
      ? { success: true, profile: updated }
      : result;
  }

  function getEntries() {
    return getProfile().entries;
  }

  function getEntryById(id) {
    return getEntries().find(entry => entry.id === id) || null;
  }

  function addEntry(data = {}) {
    const title =
      typeof data.title === "string"
        ? data.title.trim()
        : "";

    if (!title) {
      return {
        success: false,
        message: "اكتب اسم الشهادة أو المهارة أو الخبرة."
      };
    }

    const entry = {
      id: AppUtils.createId(),
      title,
      type: TYPES.includes(data.type)
        ? data.type
        : "certificate",
      institution:
        typeof data.institution === "string"
          ? data.institution.trim()
          : "",
      status: STATUSES.includes(data.status)
        ? data.status
        : "planned",
      startDate:
        typeof data.startDate === "string"
          ? data.startDate
          : "",
      endDate:
        typeof data.endDate === "string"
          ? data.endDate
          : "",
      description:
        typeof data.description === "string"
          ? data.description.trim()
          : "",
      evidenceUrl:
        typeof data.evidenceUrl === "string"
          ? data.evidenceUrl.trim()
          : "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const profile = getProfile();

    return saveProfile({
      ...profile,
      entries: [...profile.entries, entry]
    }).success
      ? { success: true, entry }
      : {
          success: false,
          message: "تعذر حفظ بيانات المسار المهني."
        };
  }

  function updateEntry(id, changes = {}) {
    const profile = getProfile();
    const index = profile.entries.findIndex(
      entry => entry.id === id
    );

    if (index === -1) {
      return {
        success: false,
        message: "لم يتم العثور على العنصر."
      };
    }

    const entries = [...profile.entries];
    const entry = { ...entries[index] };

    for (const field of [
      "title",
      "institution",
      "description",
      "evidenceUrl",
      "startDate",
      "endDate"
    ]) {
      if (typeof changes[field] === "string") {
        entry[field] = changes[field].trim();
      }
    }

    if (STATUSES.includes(changes.status)) {
      entry.status = changes.status;
    }

    if (TYPES.includes(changes.type)) {
      entry.type = changes.type;
    }

    entry.updatedAt = new Date().toISOString();
    entries[index] = entry;

    const result = saveProfile({
      ...profile,
      entries
    });

    return result.success
      ? { success: true, entry }
      : result;
  }

  function removeEntry(id) {
    const profile = getProfile();
    const entries = profile.entries.filter(
      entry => entry.id !== id
    );

    if (entries.length === profile.entries.length) {
      return {
        success: false,
        message: "لم يتم العثور على العنصر."
      };
    }

    return saveProfile({
      ...profile,
      entries
    });
  }

  function getSummary() {
    const entries = getEntries();

    return {
      total: entries.length,
      obtained: entries.filter(
        entry => entry.status === "obtained"
      ).length,
      inProgress: entries.filter(
        entry => entry.status === "in_progress"
      ).length,
      planned: entries.filter(
        entry => entry.status === "planned"
      ).length,
      byType: TYPES.reduce((summary, type) => {
        summary[type] = entries.filter(
          entry => entry.type === type
        ).length;

        return summary;
      }, {})
    };
  }

  function getProfileCompleteness() {
    const profile = getProfile();

    const fields = [
      profile.fullName,
      profile.professionalSummary,
      profile.targetRole
    ];

    const filled = fields.filter(
      value => typeof value === "string" && value.trim()
    ).length;

    return Math.round((filled / fields.length) * 100);
  }

  return Object.freeze({
    getProfile,
    saveProfile,
    getEntries,
    getEntryById,
    addEntry,
    updateEntry,
    removeEntry,
    getSummary,
    getProfileCompleteness
  });
})();
