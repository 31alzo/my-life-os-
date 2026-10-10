/* =========================================================
   MY LIFE OS — RELATIONSHIPS MANAGER
   File: relationships.js
   Purpose: Personal connections and follow-up tracking
========================================================= */

(function (window) {
  "use strict";

  const CONTACTS_KEY = "relationships";
  const INTERACTIONS_KEY = "relationship-interactions";

  const EVENTS = {
    changed: "relationships:changed",
    contactCreated: "relationships:contact-created",
    contactUpdated: "relationships:contact-updated",
    contactDeleted: "relationships:contact-deleted",
    interactionCreated: "relationships:interaction-created",
    interactionDeleted: "relationships:interaction-deleted"
  };

  const CATEGORIES = [
    "family",
    "friend",
    "professional",
    "mentor",
    "community",
    "other"
  ];

  const INTERACTION_TYPES = [
    "call",
    "message",
    "meeting",
    "visit",
    "help",
    "other"
  ];

  function createId() {
    if (
      window.AppUtils &&
      typeof window.AppUtils.createId === "function"
    ) {
      return window.AppUtils.createId();
    }

    return "relationship-" + Date.now().toString(36) +
      "-" + Math.random().toString(36).slice(2, 10);
  }

  function now() {
    return new Date().toISOString();
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

  function cleanString(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function isObject(value) {
    return value !== null &&
      typeof value === "object" &&
      !Array.isArray(value);
  }

  function clone(value) {
    if (
      window.AppUtils &&
      typeof window.AppUtils.clone === "function"
    ) {
      return window.AppUtils.clone(value);
    }

    return JSON.parse(JSON.stringify(value));
  }

  function emit(name, detail) {
    if (
      window.AppEvents &&
      typeof window.AppEvents.emit === "function"
    ) {
      window.AppEvents.emit(name, detail);
      return;
    }

    window.dispatchEvent(
      new CustomEvent(name, { detail: detail })
    );
  }

  function read(key, fallback) {
    try {
      if (
        window.AppStorage &&
        typeof window.AppStorage.get === "function"
      ) {
        const value = window.AppStorage.get(key);

        return value === null || value === undefined
          ? fallback
          : value;
      }

      const raw = window.localStorage.getItem(
        "my-life-os:v1:" + key
      );

      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      console.error("[RelationshipsManager] Read failed:", error);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      if (
        window.AppStorage &&
        typeof window.AppStorage.set === "function"
      ) {
        if (window.AppStorage.set(key, value) === false) {
          throw new Error("تعذر حفظ البيانات.");
        }

        return true;
      }

      window.localStorage.setItem(
        "my-life-os:v1:" + key,
        JSON.stringify(value)
      );

      return true;
    } catch (error) {
      console.error("[RelationshipsManager] Save failed:", error);
      throw new Error("تعذر حفظ بيانات العلاقات.");
    }
  }

  function validateDate(value) {
    if (
      typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      throw new Error("استخدم صيغة التاريخ YYYY-MM-DD.");
    }

    const date = new Date(value + "T00:00:00");

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new Error("التاريخ غير صالح.");
    }

    return value;
  }

  function normalizeContact(contact) {
    return {
      id: cleanString(contact.id) || createId(),
      name: cleanString(contact.name),
      category: CATEGORIES.includes(contact.category)
        ? contact.category
        : "other",
      phone: cleanString(contact.phone),
      email: cleanString(contact.email),
      organization: cleanString(contact.organization),
      birthday: contact.birthday || null,
      lastContactDate: contact.lastContactDate || null,
      nextFollowUpDate: contact.nextFollowUpDate || null,
      followUpNote: cleanString(contact.followUpNote),
      notes: typeof contact.notes === "string"
        ? contact.notes
        : "",
      tags: Array.isArray(contact.tags)
        ? contact.tags.filter(
            tag => typeof tag === "string" && tag.trim()
          ).map(tag => tag.trim())
        : [],
      favorite: contact.favorite === true,
      archived: contact.archived === true,
      createdAt: contact.createdAt || now(),
      updatedAt: contact.updatedAt || now()
    };
  }

  function getAll(options) {
    const settings = options || {};
    let contacts = read(CONTACTS_KEY, []);

    if (!Array.isArray(contacts)) {
      contacts = [];
    }

    contacts = contacts.filter(isObject).map(normalizeContact);

    if (settings.includeArchived !== true) {
      contacts = contacts.filter(contact => !contact.archived);
    }

    if (settings.category) {
      contacts = contacts.filter(
        contact => contact.category === settings.category
      );
    }

    if (settings.favoritesOnly === true) {
      contacts = contacts.filter(contact => contact.favorite);
    }

    if (settings.search) {
      const query = cleanString(settings.search).toLowerCase();

      contacts = contacts.filter(contact =>
        (
          contact.name + " " +
          contact.organization + " " +
          contact.phone + " " +
          contact.email + " " +
          contact.notes + " " +
          contact.tags.join(" ")
        ).toLowerCase().includes(query)
      );
    }

    contacts.sort((a, b) => a.name.localeCompare(b.name));

    return clone(contacts);
  }

  function getById(id) {
    const contact = getAll({ includeArchived: true }).find(
      item => item.id === id
    );

    return contact ? clone(contact) : null;
  }

  function normalizeTags(tags) {
    if (typeof tags === "string") {
      tags = tags.split(",");
    }

    if (!Array.isArray(tags)) {
      return [];
    }

    const result = [];

    tags.forEach(tag => {
      const value = cleanString(tag);

      if (
        value &&
        !result.some(
          existing =>
            existing.toLowerCase() === value.toLowerCase()
        )
      ) {
        result.push(value);
      }
    });

    return result;
  }

  function create(input) {
    if (!isObject(input)) {
      throw new Error("بيانات جهة الاتصال غير صحيحة.");
    }

    const name = cleanString(input.name);

    if (!name) {
      throw new Error("أدخل اسم الشخص.");
    }

    if (!CATEGORIES.includes(input.category || "other")) {
      throw new Error("تصنيف العلاقة غير صالح.");
    }

    const contact = {
      id: createId(),
      name: name,
      category: input.category || "other",
      phone: cleanString(input.phone),
      email: cleanString(input.email),
      organization: cleanString(input.organization),
      birthday: input.birthday
        ? validateDate(input.birthday)
        : null,
      lastContactDate: input.lastContactDate
        ? validateDate(input.lastContactDate)
        : null,
      nextFollowUpDate: input.nextFollowUpDate
        ? validateDate(input.nextFollowUpDate)
        : null,
      followUpNote: cleanString(input.followUpNote),
      notes: typeof input.notes === "string" ? input.notes : "",
      tags: normalizeTags(input.tags),
      favorite: input.favorite === true,
      archived: false,
      createdAt: now(),
      updatedAt: now()
    };

    const contacts = read(CONTACTS_KEY, []);
    const safeContacts = Array.isArray(contacts) ? contacts : [];

    safeContacts.push(contact);
    write(CONTACTS_KEY, safeContacts);

    emit(EVENTS.contactCreated, clone(contact));
    emit(EVENTS.changed, {
      action: "contact-created",
      id: contact.id
    });

    return clone(contact);
  }

  function update(id, changes) {
    if (!isObject(changes)) {
      throw new Error("التعديلات غير صحيحة.");
    }

    const contacts = read(CONTACTS_KEY, []);
    const safeContacts = Array.isArray(contacts) ? contacts : [];
    const index = safeContacts.findIndex(item => item.id === id);

    if (index === -1) {
      throw new Error("جهة الاتصال غير موجودة.");
    }

    const updated = normalizeContact(safeContacts[index]);

    if (Object.prototype.hasOwnProperty.call(changes, "name")) {
      const name = cleanString(changes.name);

      if (!name) {
        throw new Error("اسم الشخص لا يمكن أن يكون فارغاً.");
      }

      updated.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "category")) {
      if (!CATEGORIES.includes(changes.category)) {
        throw new Error("تصنيف العلاقة غير صالح.");
      }

      updated.category = changes.category;
    }

    [
      "phone",
      "email",
      "organization",
      "followUpNote"
    ].forEach(field => {
      if (Object.prototype.hasOwnProperty.call(changes, field)) {
        updated[field] = cleanString(changes[field]);
      }
    });

    ["birthday", "lastContactDate", "nextFollowUpDate"].forEach(
      field => {
        if (Object.prototype.hasOwnProperty.call(changes, field)) {
          updated[field] = changes[field]
            ? validateDate(changes[field])
            : null;
        }
      }
    );

    if (Object.prototype.hasOwnProperty.call(changes, "notes")) {
      if (typeof changes.notes !== "string") {
        throw new Error("الملاحظات يجب أن تكون نصاً.");
      }

      updated.notes = changes.notes;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "tags")) {
      updated.tags = normalizeTags(changes.tags);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "favorite")) {
      updated.favorite = changes.favorite === true;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "archived")) {
      updated.archived = changes.archived === true;
    }

    updated.updatedAt = now();
    safeContacts[index] = updated;

    write(CONTACTS_KEY, safeContacts);

    emit(EVENTS.contactUpdated, clone(updated));
    emit(EVENTS.changed, {
      action: "contact-updated",
      id: id
    });

    return clone(updated);
  }

  function remove(id) {
    const contacts = read(CONTACTS_KEY, []);
    const safeContacts = Array.isArray(contacts) ? contacts : [];
    const index = safeContacts.findIndex(item => item.id === id);

    if (index === -1) {
      return false;
    }

    const interactions = read(INTERACTIONS_KEY, []);
    const safeInteractions = Array.isArray(interactions)
      ? interactions
      : [];

    safeInteractions.splice(
      0,
      safeInteractions.length,
      ...safeInteractions.filter(
        item => item.contactId !== id
      )
    );

    safeContacts.splice(index, 1);

    write(CONTACTS_KEY, safeContacts);
    write(INTERACTIONS_KEY, safeInteractions);

    emit(EVENTS.contactDeleted, { id: id });
    emit(EVENTS.changed, {
      action: "contact-deleted",
      id: id
    });

    return true;
  }

  function archive(id) {
    return update(id, { archived: true });
  }

  function restore(id) {
    return update(id, { archived: false });
  }

  function addInteraction(input) {
    if (!isObject(input)) {
      throw new Error("بيانات التواصل غير صحيحة.");
    }

    const contact = getById(input.contactId);

    if (!contact) {
      throw new Error("جهة الاتصال غير موجودة.");
    }

    if (!INTERACTION_TYPES.includes(input.type || "other")) {
      throw new Error("نوع التواصل غير صالح.");
    }

    const interaction = {
      id: createId(),
      contactId: contact.id,
      type: input.type || "other",
      date: validateDate(input.date || today()),
      summary: cleanString(input.summary),
      notes: typeof input.notes === "string" ? input.notes : "",
      createdAt: now()
    };

    const interactions = read(INTERACTIONS_KEY, []);
    const safeInteractions = Array.isArray(interactions)
      ? interactions
      : [];

    safeInteractions.push(interaction);
    write(INTERACTIONS_KEY, safeInteractions);

    update(contact.id, {
      lastContactDate: interaction.date
    });

    emit(EVENTS.interactionCreated, clone(interaction));
    emit(EVENTS.changed, {
      action: "interaction-created",
      id: interaction.id
    });

    return clone(interaction);
  }

  function getInteractions(contactId, options) {
    const settings = options || {};
    let interactions = read(INTERACTIONS_KEY, []);

    if (!Array.isArray(interactions)) {
      interactions = [];
    }

    interactions = interactions.filter(isObject);

    if (contactId) {
      interactions = interactions.filter(
        item => item.contactId === contactId
      );
    }

    if (settings.from) {
      interactions = interactions.filter(
        item => item.date >= settings.from
      );
    }

    if (settings.to) {
      interactions = interactions.filter(
        item => item.date <= settings.to
      );
    }

    interactions.sort((a, b) =>
      b.date.localeCompare(a.date)
    );

    return clone(interactions);
  }

  function removeInteraction(id) {
    const interactions = read(INTERACTIONS_KEY, []);
    const safeInteractions = Array.isArray(interactions)
      ? interactions
      : [];

    const index = safeInteractions.findIndex(
      item => item.id === id
    );

    if (index === -1) {
      return false;
    }

    safeInteractions.splice(index, 1);
    write(INTERACTIONS_KEY, safeInteractions);

    emit(EVENTS.interactionDeleted, { id: id });
    emit(EVENTS.changed, {
      action: "interaction-deleted",
      id: id
    });

    return true;
  }

  function getFollowUps(options) {
    const settings = options || {};
    const targetDate = validateDate(settings.date || today());

    return getAll().filter(contact => {
      if (!contact.nextFollowUpDate) {
        return false;
      }

      if (settings.overdueOnly === true) {
        return contact.nextFollowUpDate < targetDate;
      }

      return contact.nextFollowUpDate <= targetDate;
    }).sort((a, b) =>
      a.nextFollowUpDate.localeCompare(b.nextFollowUpDate)
    );
  }

  function getSummary() {
    const contacts = getAll();
    const interactions = getInteractions();

    const summary = {
      totalContacts: contacts.length,
      favorites: 0,
      byCategory: {},
      totalInteractions: interactions.length,
      dueFollowUps: getFollowUps().length,
      overdueFollowUps: getFollowUps({
        overdueOnly: true
      }).length
    };

    CATEGORIES.forEach(category => {
      summary.byCategory[category] = 0;
    });

    contacts.forEach(contact => {
      if (contact.favorite) {
        summary.favorites += 1;
      }

      summary.byCategory[contact.category] += 1;
    });

    return summary;
  }

  function initialize() {
    const contacts = read(CONTACTS_KEY, []);
    const interactions = read(INTERACTIONS_KEY, []);

    if (!Array.isArray(contacts)) {
      write(CONTACTS_KEY, []);
    }

    if (!Array.isArray(interactions)) {
      write(INTERACTIONS_KEY, []);
    }

    return {
      initialized: true,
      contactCount: getAll({ includeArchived: true }).length,
      interactionCount: getInteractions().length
    };
  }

  function reset() {
    write(CONTACTS_KEY, []);
    write(INTERACTIONS_KEY, []);

    emit(EVENTS.changed, { action: "reset" });

    return true;
  }

  window.RelationshipsManager = Object.freeze({
    initialize: initialize,
    create: create,
    getAll: getAll,
    getById: getById,
    update: update,
    remove: remove,
    archive: archive,
    restore: restore,
    addInteraction: addInteraction,
    getInteractions: getInteractions,
    removeInteraction: removeInteraction,
    getFollowUps: getFollowUps,
    getSummary: getSummary,
    getCategories: function () {
      return CATEGORIES.slice();
    },
    getInteractionTypes: function () {
      return INTERACTION_TYPES.slice();
    },
    reset: reset,
    EVENTS: Object.freeze(Object.assign({}, EVENTS))
  });

})(window);