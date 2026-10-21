/* =========================================================
   MY LIFE OS — RELATIONSHIPS MANAGER
   File: relationships.js
   Version: 2.0.0
   Purpose: Contacts, interactions, follow-ups and archiving
========================================================= */

(function (window) {
  "use strict";

  const CONTACTS_KEY = "relationships";
  const INTERACTIONS_KEY = "relationship-interactions";

  const MAX_CONTACTS = 5000;
  const MAX_INTERACTIONS = 20000;
  const MAX_TEXT_LENGTH = 20000;
  const MAX_TAGS = 100;

  const EVENTS = Object.freeze({
    changed: "relationships:changed",
    contactCreated: "relationships:contact-created",
    contactUpdated: "relationships:contact-updated",
    contactDeleted: "relationships:contact-deleted",
    interactionCreated: "relationships:interaction-created",
    interactionDeleted: "relationships:interaction-deleted"
  });

  const CATEGORIES = Object.freeze([
    "family",
    "friend",
    "professional",
    "mentor",
    "community",
    "other"
  ]);

  const INTERACTION_TYPES = Object.freeze([
    "call",
    "message",
    "meeting",
    "visit",
    "help",
    "other"
  ]);

  const hasOwn = (object, key) =>
    Object.prototype.hasOwnProperty.call(object, key);

  function createId() {
    if (
      window.AppUtils &&
      typeof window.AppUtils.createId === "function"
    ) {
      return String(window.AppUtils.createId());
    }

    return "relationship-" +
      Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 12);
  }

  function now() {
    return new Date().toISOString();
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

  function cleanString(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function cleanText(value, fieldName, maxLength) {
    if (typeof value !== "string") {
      throw new Error(fieldName + " يجب أن يكون نصاً.");
    }

    if (value.length > maxLength) {
      throw new Error(
        fieldName + " يتجاوز الحد الأقصى المسموح به."
      );
    }

    return value;
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
    try {
      if (
        window.AppEvents &&
        typeof window.AppEvents.emit === "function"
      ) {
        window.AppEvents.emit(name, detail);
        return;
      }

      if (typeof window.CustomEvent === "function") {
        window.dispatchEvent(
          new window.CustomEvent(name, { detail: detail })
        );
      }
    } catch (error) {
      console.error(
        "[RelationshipsManager] Event failed:",
        error
      );
    }
  }

  function isFailedStorageResult(result) {
    return result === false ||
      (
        isObject(result) &&
        result.success === false
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
          ? clone(fallback)
          : value;
      }

      if (!window.localStorage) {
        throw new Error("التخزين المحلي غير متاح.");
      }

      const raw = window.localStorage.getItem(
        "my-life-os:v1:" + key
      );

      return raw === null ? clone(fallback) : JSON.parse(raw);
    } catch (error) {
      console.error(
        "[RelationshipsManager] Read failed:",
        error
      );

      throw new Error(
        "تعذرت قراءة البيانات (" + key + ")."
      );
    }
  }

  function write(key, value) {
    try {
      if (
        window.AppStorage &&
        typeof window.AppStorage.set === "function"
      ) {
        const result = window.AppStorage.set(key, value);

        if (isFailedStorageResult(result)) {
          throw new Error("رفض مخزن التطبيق حفظ البيانات.");
        }

        return true;
      }

      if (!window.localStorage) {
        throw new Error("التخزين المحلي غير متاح.");
      }

      window.localStorage.setItem(
        "my-life-os:v1:" + key,
        JSON.stringify(value)
      );

      return true;
    } catch (error) {
      console.error(
        "[RelationshipsManager] Save failed:",
        error
      );

      throw new Error("تعذر حفظ بيانات العلاقات.");
    }
  }

  /*
   * Best-effort rollback for operations involving two keys.
   * This is not a true atomic transaction if the storage
   * provider fails repeatedly.
   */
  function restoreStoredValue(key, previousValue) {
    try {
      write(key, previousValue);
      return true;
    } catch (error) {
      console.error(
        "[RelationshipsManager] Rollback failed:",
        key,
        error
      );

      return false;
    }
  }

  function isValidDate(value) {
    if (
      typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      return false;
    }

    const date = new Date(value + "T00:00:00.000Z");

    return !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value;
  }

  function validateDate(value) {
    if (!isValidDate(value)) {
      throw new Error(
        "التاريخ غير صالح. استخدم الصيغة YYYY-MM-DD."
      );
    }

    return value;
  }

  function optionalDate(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    return validateDate(value);
  }

  function validateId(id) {
    const value = cleanString(id);

    if (!value) {
      throw new Error("معرّف السجل غير صالح.");
    }

    return value;
  }

  function normalizeTags(tags) {
    if (typeof tags === "string") {
      tags = tags.split(",");
    }

    if (!Array.isArray(tags)) {
      return [];
    }

    const result = [];
    const seen = new Set();

    tags.slice(0, MAX_TAGS).forEach(tag => {
      if (typeof tag !== "string") {
        return;
      }

      const value = tag.trim();

      if (!value || value.length > 100) {
        return;
      }

      const normalized = value.toLowerCase();

      if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(value);
      }
    });

    return result;
  }

  function normalizeContact(contact) {
    if (!isObject(contact)) {
      throw new Error("بيانات جهة الاتصال غير صالحة.");
    }

    const name = cleanString(contact.name);

    if (!name) {
      throw new Error("اسم جهة الاتصال مفقود.");
    }

    const category = CATEGORIES.includes(contact.category)
      ? contact.category
      : "other";

    const birthday = optionalDate(contact.birthday);
    const lastContactDate = optionalDate(
      contact.lastContactDate
    );
    const nextFollowUpDate = optionalDate(
      contact.nextFollowUpDate
    );

    return {
      id: cleanString(contact.id) || createId(),
      name: name,
      category: category,
      phone: cleanString(contact.phone),
      email: cleanString(contact.email),
      organization: cleanString(contact.organization),
      birthday: birthday,
      lastContactDate: lastContactDate,
      nextFollowUpDate: nextFollowUpDate,
      followUpNote: typeof contact.followUpNote === "string"
        ? contact.followUpNote
        : "",
      notes: typeof contact.notes === "string"
        ? contact.notes
        : "",
      tags: normalizeTags(contact.tags),
      favorite: contact.favorite === true,
      archived: contact.archived === true,
      createdAt: typeof contact.createdAt === "string"
        ? contact.createdAt
        : now(),
      updatedAt: typeof contact.updatedAt === "string"
        ? contact.updatedAt
        : now()
    };
  }

  function normalizeInteraction(interaction) {
    if (!isObject(interaction)) {
      throw new Error("بيانات سجل التواصل غير صالحة.");
    }

    const type = INTERACTION_TYPES.includes(interaction.type)
      ? interaction.type
      : "other";

    return {
      id: cleanString(interaction.id) || createId(),
      contactId: validateId(interaction.contactId),
      type: type,
      date: validateDate(interaction.date),
      summary: typeof interaction.summary === "string"
        ? interaction.summary
        : "",
      notes: typeof interaction.notes === "string"
        ? interaction.notes
        : "",
      createdAt: typeof interaction.createdAt === "string"
        ? interaction.createdAt
        : now()
    };
  }

  function readContacts() {
    const contacts = read(CONTACTS_KEY, []);

    if (!Array.isArray(contacts)) {
      throw new Error(
        "بيانات جهات الاتصال تالفة؛ لم يتم استبدالها تلقائياً."
      );
    }

    return contacts.filter(isObject);
  }

  function readInteractions() {
    const interactions = read(INTERACTIONS_KEY, []);

    if (!Array.isArray(interactions)) {
      throw new Error(
        "بيانات سجلات التواصل تالفة؛ لم يتم استبدالها تلقائياً."
      );
    }

    return interactions.filter(isObject);
  }

  function getAll(options) {
    const settings = options || {};
    let contacts = readContacts().map(normalizeContact);

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

      if (query) {
        contacts = contacts.filter(contact => {
          const searchable = [
            contact.name,
            contact.organization,
            contact.phone,
            contact.email,
            contact.notes,
            contact.followUpNote,
            contact.tags.join(" ")
          ].join(" ").toLowerCase();

          return searchable.includes(query);
        });
      }
    }

    contacts.sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return clone(contacts);
  }

  function getById(id) {
    const targetId = validateId(id);

    const contact = getAll({
      includeArchived: true
    }).find(item => item.id === targetId);

    return contact ? clone(contact) : null;
  }

  function create(input) {
    if (!isObject(input)) {
      throw new Error("بيانات جهة الاتصال غير صحيحة.");
    }

    const name = cleanString(input.name);

    if (!name) {
      throw new Error("أدخل اسم الشخص.");
    }

    const category = input.category || "other";

    if (!CATEGORIES.includes(category)) {
      throw new Error("تصنيف العلاقة غير صالح.");
    }

    const contacts = readContacts();

    if (contacts.length >= MAX_CONTACTS) {
      throw new Error("وصلت إلى الحد الأقصى لجهات الاتصال.");
    }

    const contact = normalizeContact({
      id: createId(),
      name: name,
      category: category,
      phone: cleanString(input.phone),
      email: cleanString(input.email),
      organization: cleanString(input.organization),
      birthday: optionalDate(input.birthday),
      lastContactDate: optionalDate(input.lastContactDate),
      nextFollowUpDate: optionalDate(input.nextFollowUpDate),
      followUpNote: cleanString(input.followUpNote),
      notes: typeof input.notes === "string"
        ? cleanText(input.notes, "الملاحظات", MAX_TEXT_LENGTH)
        : "",
      tags: normalizeTags(input.tags),
      favorite: input.favorite === true,
      archived: false,
      createdAt: now(),
      updatedAt: now()
    });

    if (contacts.some(item => item.id === contact.id)) {
      throw new Error("تعذر إنشاء معرّف فريد لجهة الاتصال.");
    }

    contacts.push(contact);
    write(CONTACTS_KEY, contacts);

    emit(EVENTS.contactCreated, clone(contact));
    emit(EVENTS.changed, {
      action: "contact-created",
      id: contact.id
    });

    return clone(contact);
  }

  function update(id, changes) {
    const targetId = validateId(id);

    if (!isObject(changes)) {
      throw new Error("التعديلات غير صحيحة.");
    }

    const contacts = readContacts();
    const index = contacts.findIndex(
      item => item.id === targetId
    );

    if (index === -1) {
      throw new Error("جهة الاتصال غير موجودة.");
    }

    const updated = normalizeContact(contacts[index]);

    if (hasOwn(changes, "name")) {
      const name = cleanString(changes.name);

      if (!name) {
        throw new Error("اسم الشخص لا يمكن أن يكون فارغاً.");
      }

      updated.name = name;
    }

    if (hasOwn(changes, "category")) {
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
      if (hasOwn(changes, field)) {
        updated[field] = cleanString(changes[field]);
      }
    });

    [
      "birthday",
      "lastContactDate",
      "nextFollowUpDate"
    ].forEach(field => {
      if (hasOwn(changes, field)) {
        updated[field] = optionalDate(changes[field]);
      }
    });

    if (hasOwn(changes, "notes")) {
      updated.notes = cleanText(
        changes.notes,
        "الملاحظات",
        MAX_TEXT_LENGTH
      );
    }

    if (hasOwn(changes, "tags")) {
      updated.tags = normalizeTags(changes.tags);
    }

    if (hasOwn(changes, "favorite")) {
      updated.favorite = changes.favorite === true;
    }

    if (hasOwn(changes, "archived")) {
      updated.archived = changes.archived === true;
    }

    updated.updatedAt = now();
    contacts[index] = updated;

    write(CONTACTS_KEY, contacts);

    emit(EVENTS.contactUpdated, clone(updated));
    emit(EVENTS.changed, {
      action: "contact-updated",
      id: targetId
    });

    return clone(updated);
  }

  function remove(id) {
    const targetId = validateId(id);

    const contacts = readContacts();
    const interactions = readInteractions();

    const index = contacts.findIndex(
      item => item.id === targetId
    );

    if (index === -1) {
      return false;
    }

    const nextContacts = contacts.filter(
      item => item.id !== targetId
    );

    const nextInteractions = interactions.filter(
      item => item.contactId !== targetId
    );

    /*
     * Save both datasets with best-effort rollback.
     * The storage provider does not expose a multi-key
     * transaction, so rollback is attempted on failure.
     */
    write(CONTACTS_KEY, nextContacts);

    try {
      write(INTERACTIONS_KEY, nextInteractions);
    } catch (error) {
      const restored = restoreStoredValue(
        CONTACTS_KEY,
        contacts
      );

      if (!restored) {
        throw new Error(
          "فشل حذف جهة الاتصال وتعذرت استعادة البيانات السابقة."
        );
      }

      throw error;
    }

    emit(EVENTS.contactDeleted, { id: targetId });
    emit(EVENTS.changed, {
      action: "contact-deleted",
      id: targetId
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

    const contactId = validateId(input.contactId);
    const contact = getById(contactId);

    if (!contact) {
      throw new Error("جهة الاتصال غير موجودة.");
    }

    const type = input.type || "other";

    if (!INTERACTION_TYPES.includes(type)) {
      throw new Error("نوع التواصل غير صالح.");
    }

    const interaction = normalizeInteraction({
      id: createId(),
      contactId: contactId,
      type: type,
      date: validateDate(input.date || today()),
      summary: typeof input.summary === "string"
        ? cleanText(input.summary, "ملخص التواصل", MAX_TEXT_LENGTH)
        : "",
      notes: typeof input.notes === "string"
        ? cleanText(input.notes, "ملاحظات التواصل", MAX_TEXT_LENGTH)
        : "",
      createdAt: now()
    });

    const interactions = readInteractions();

    if (interactions.length >= MAX_INTERACTIONS) {
      throw new Error("وصلت إلى الحد الأقصى لسجلات التواصل.");
    }

    if (interactions.some(item => item.id === interaction.id)) {
      throw new Error("تعذر إنشاء معرّف فريد لسجل التواصل.");
    }

    const previousContacts = readContacts();
    const previousInteractions = interactions.slice();

    interactions.push(interaction);

    /*
     * Update the contact first. If saving the interaction
     * subsequently fails, restore the previous contact.
     */
    update(contactId, {
      lastContactDate: interaction.date
    });

    try {
      write(INTERACTIONS_KEY, interactions);
    } catch (error) {
      const restored = restoreStoredValue(
        CONTACTS_KEY,
        previousContacts
      );

      if (!restored) {
        throw new Error(
          "فشل حفظ سجل التواصل وتعذرت استعادة جهة الاتصال."
        );
      }

      restoreStoredValue(
        INTERACTIONS_KEY,
        previousInteractions
      );

      throw error;
    }

    emit(EVENTS.interactionCreated, clone(interaction));
    emit(EVENTS.changed, {
      action: "interaction-created",
      id: interaction.id
    });

    return clone(interaction);
  }

  function getInteractions(contactId, options) {
    const settings = options || {};
    let interactions = readInteractions().map(
      normalizeInteraction
    );

    if (contactId) {
      const targetId = validateId(contactId);

      interactions = interactions.filter(
        item => item.contactId === targetId
      );
    }

    if (settings.from) {
      validateDate(settings.from);

      interactions = interactions.filter(
        item => item.date >= settings.from
      );
    }

    if (settings.to) {
      validateDate(settings.to);

      interactions = interactions.filter(
        item => item.date <= settings.to
      );
    }

    interactions.sort((a, b) => {
      const dateComparison = b.date.localeCompare(a.date);

      return dateComparison ||
        b.createdAt.localeCompare(a.createdAt);
    });

    return clone(interactions);
  }

  function removeInteraction(id) {
    const targetId = validateId(id);
    const interactions = readInteractions();

    const index = interactions.findIndex(
      item => item.id === targetId
    );

    if (index === -1) {
      return false;
    }

    const nextInteractions = interactions.filter(
      item => item.id !== targetId
    );

    write(INTERACTIONS_KEY, nextInteractions);

    emit(EVENTS.interactionDeleted, { id: targetId });
    emit(EVENTS.changed, {
      action: "interaction-deleted",
      id: targetId
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

    const dueFollowUps = getFollowUps();
    const overdueFollowUps = getFollowUps({
      overdueOnly: true
    });

    const summary = {
      totalContacts: contacts.length,
      archivedContacts: getAll({
        includeArchived: true
      }).filter(contact => contact.archived).length,
      favorites: 0,
      byCategory: {},
      totalInteractions: interactions.length,
      dueFollowUps: dueFollowUps.length,
      overdueFollowUps: overdueFollowUps.length
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
    const contacts = readContacts();
    const interactions = readInteractions();

    const normalizedContacts = contacts.map(normalizeContact);
    const normalizedInteractions = interactions.map(
      normalizeInteraction
    );

    const contactIds = new Set();

    normalizedContacts.forEach(contact => {
      if (contactIds.has(contact.id)) {
        throw new Error(
          "توجد معرّفات مكررة في جهات الاتصال. لم يتم تعديل البيانات."
        );
      }

      contactIds.add(contact.id);
    });

    const interactionIds = new Set();

    normalizedInteractions.forEach(interaction => {
      if (interactionIds.has(interaction.id)) {
        throw new Error(
          "توجد معرّفات مكررة في سجلات التواصل. لم يتم تعديل البيانات."
        );
      }

      interactionIds.add(interaction.id);
    });

    /*
     * Preserve existing valid records. Normalization is kept
     * in memory unless the data is explicitly changed by a
     * create/update/delete operation.
     */
    return {
      initialized: true,
      contactCount: normalizedContacts.length,
      interactionCount: normalizedInteractions.length
    };
  }

  function reset(options) {
    /*
     * Keep reset() compatible with the previous public API.
     * Pass { confirmed: true } when the caller wants to
     * explicitly confirm this destructive operation.
     */
    if (options && options.confirmed !== true) {
      throw new Error(
        "أكد إعادة التعيين باستخدام reset({ confirmed: true })."
      );
    }

    const previousContacts = readContacts();
    const previousInteractions = readInteractions();

    write(CONTACTS_KEY, []);

    try {
      write(INTERACTIONS_KEY, []);
    } catch (error) {
      const restored = restoreStoredValue(
        CONTACTS_KEY,
        previousContacts
      );

      if (!restored) {
        throw new Error(
          "فشلت إعادة التعيين وتعذرت استعادة جهات الاتصال."
        );
      }

      throw error;
    }

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
    EVENTS: EVENTS
  });

})(window);
