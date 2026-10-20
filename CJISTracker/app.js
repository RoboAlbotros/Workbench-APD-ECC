const STORAGE_KEYS = {
  records: "cjisApplicantTracker.records",
  changeLog: "cjisApplicantTracker.changeLog",
  accessCodes: "cjisApplicantTracker.accessCodes",
  iiiCompletionIsoMigrated: "cjisApplicantTracker.iiiCompletionIsoMigrated",
  optionLists: "cjisApplicantTracker.optionLists",
  managedUsers: "cjisApplicantTracker.managedUsers",
};

const SQL_API_BASE = "http://127.0.0.1:8741";
let persistenceMode = "local";
let sqlPersistError = "";

// Access codes are local prototype controls. Full Admin is operator-set to 12345
// (owner-directed, SPRINT-004). Former defaults 1111/2222/2468 stay forbidden.
const FORBIDDEN_CODES = new Set(["1111", "2222", "2468", "0000", "1234"]);
const OWNER_ADMIN_CODE = "12345";
const PROTOTYPE_LIMITED_CODE = "lim-7431";
const PROTOTYPE_RECORDS_CODE = "rec-8562";
let accessCodes = null;

function loadAccessCodes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.accessCodes);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveAccessCodes(codes) {
  localStorage.setItem(STORAGE_KEYS.accessCodes, JSON.stringify(codes));
  accessCodes = codes;
}

function isUsableRoleCode(code, reserved) {
  return Boolean(code) && !FORBIDDEN_CODES.has(code) && !reserved.has(code);
}

function ensureOwnerAccessCodes() {
  const existing = loadAccessCodes() || {};
  const reserved = new Set([OWNER_ADMIN_CODE]);
  const limited = isUsableRoleCode(existing.limited, reserved)
    ? existing.limited
    : PROTOTYPE_LIMITED_CODE;
  reserved.add(limited);
  const records = isUsableRoleCode(existing.records, reserved)
    ? existing.records
    : PROTOTYPE_RECORDS_CODE;
  saveAccessCodes({
    limited,
    records,
    admin: OWNER_ADMIN_CODE,
  });
}

ensureOwnerAccessCodes();

const ACCESS_LABELS = {
  limited: "Limited View",
  records: "Records View",
  adminGlobal: "Admin-Global",
  adminStaff: "Admin-Staff",
  admin: "Admin-Full",
};

const DRIVERS_LICENSE_MAX_BODY_LENGTH = 15;
const DRIVERS_LICENSE_MAX_LENGTH = 18;
const DRIVERS_LICENSE_PATTERN = /^[A-Za-z]{2}\/[A-Za-z0-9]{1,15}$/;
const DRIVERS_LICENSE_INVALID_MESSAGE =
  "Driver Lic Num must be a two-letter state prefix, a slash, and up to 15 letters or numbers (example: NM/A23456H8X0H23H5).";
const CREATE_REQUIRED_FIELDS = [
  { field: "lastName", label: "Last Name" },
  { field: "firstName", label: "First Name" },
  { field: "driversLicense", label: "Driver Lic Num" },
  { field: "requestor", label: "Requestor" },
];
const NAME_SUFFIX_VALUES = new Set(["JR", "SR", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "ESQ", "PHD", "MD", "DDS"]);
const DEFAULT_DEPARTMENT_OPTIONS = [
  "AV-Aviation",
  "AW-Animal Welfare",
  "CA-Chief Administrative Office",
  "CC-Office of the City Clerk",
  "CL-Council Services",
  "CM-Community Safety Department",
  "CP-Civilian Police OS Dept",
  "CS-Cultural Services",
  "ED-Economic Development",
  "EH-Environmental Health",
  "FA-Finance Admin Svc",
  "FC-Youth and Family Svcs Dept",
  "FD-Fire",
  "GS-General Services Department",
  "HH-Health,Housing,Hmlsns Dept",
  "HR-Human Resources",
  "IA-Internal Audit",
  "IG-Office of Inspector GenDept",
  "LG-Legal",
  "MA-Mayor's Office Department",
  "MD-Municipal Development",
  "APD",
  "PD-Police",
  "PL-Planning Department",
  "PR-Parks and Recreation",
  "SA-Senior Affairs",
  "SW-Solid Waste",
  "TI-Technology and Innovation",
  "TR-Transit",
];

function sanitizeDriversLicenseInput(value) {
  const chars = String(value || "").toUpperCase();
  let prefix = "";
  let body = "";
  for (const ch of chars) {
    if (prefix.length < 2) {
      if (/[A-Z]/.test(ch)) prefix += ch;
      continue;
    }
    if (ch === "/") continue;
    if (/[A-Z0-9]/.test(ch) && body.length < DRIVERS_LICENSE_MAX_BODY_LENGTH) {
      body += ch;
    }
  }
  if (prefix.length < 2) return prefix;
  return `${prefix}/${body}`;
}

function normalizeDriversLicense(value) {
  return sanitizeDriversLicenseInput(value);
}

const PHONE_DIGIT_LIMIT = 10;
const PHONE_INVALID_MESSAGE =
  "Applicant Phone Number must be 10 digits (example: 303-555-0174).";

function extractPhoneDigits(value) {
  return String(value || "").replace(/\D/g, "").slice(0, PHONE_DIGIT_LIMIT);
}

function formatPhoneNumber(value) {
  const digits = extractPhoneDigits(value);
  if (!digits) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function normalizePhoneNumber(value) {
  return formatPhoneNumber(value);
}

function isValidPhoneNumber(value) {
  const text = String(value || "").trim();
  if (text === "") return true;
  return extractPhoneDigits(text).length === PHONE_DIGIT_LIMIT;
}

const UPPERCASE_APPLICANT_TEXT_FIELDS = new Set([
  "lastName",
  "firstName",
  "middleInitial",
  "suffix",
  "controlNumber",
  "vendor",
  "requestor",
  "source",
  "emailAddress",
  "positionRole",
]);

function normalizeApplicantText(value) {
  return String(value || "").trim().toUpperCase();
}

function isValidDriversLicense(value) {
  const text = String(value || "").trim();
  return text === "" || DRIVERS_LICENSE_PATTERN.test(text);
}

const DEFAULT_ACCESS_TYPE_OPTIONS = [
  "Physical",
  "Non VPN",
  "Security Groups",
  "Facility Access",
  "Unescorted Access",
  "Building Access",
  "Escorted Access",
  "System Access",
  "System/Building",
];

const READONLY_ACCESS_TYPE_OPTIONS = new Set([
  "Physical",
  "Non VPN",
  "Security Groups",
  "System/Building",
]);
const HIDDEN_ACCESS_TYPE_OPTIONS = new Set([
  "Security Groups",
  "System/Building",
]);
const LIMITED_VIEW_CLEARANCE_TYPE = "One Time Visit";

function isReadOnlyAccessTypeOption(value) {
  return READONLY_ACCESS_TYPE_OPTIONS.has(String(value || "").trim());
}

function isHiddenAccessTypeOption(value) {
  return HIDDEN_ACCESS_TYPE_OPTIONS.has(String(value || "").trim());
}

function renameAccessTypeToken(value) {
  const text = String(value || "").trim();
  if (text.toUpperCase() === "VPN") return "Physical";
  return text;
}

function applyAccessTypeOptionState(input) {
  if (!input || input.name !== "accessTypeValues") return;
  const locked = isReadOnlyAccessTypeOption(input.value);
  const label = input.closest("label");
  if (locked) {
    input.disabled = true;
    input.setAttribute("aria-disabled", "true");
    label?.classList.add("access-type-readonly");
    return;
  }
  input.removeAttribute("aria-disabled");
  label?.classList.remove("access-type-readonly");
}

const DEFAULT_OPTION_LISTS = {
  department: DEFAULT_DEPARTMENT_OPTIONS.slice(),
  clearanceType: ["Full Clearance", "One Time Visit", "InProgress", "No Access Given"],
  accessType: DEFAULT_ACCESS_TYPE_OPTIONS.slice(),
  iiiStatus: ["Clear", "Misd/Clear", "Felony"],
  cjisSecurityAwarenessRole: ["Basic", "General", "Privileged", "Security"],
  outcome: ["Clear", "Misd/Clear", "Felony", "Needs Follow Up"],
  ncicCertification: ["Y", "N"],
  positionRole: [],
};

const OPTION_LIST_DEFINITIONS = [
  { key: "department", label: "Department", selectIds: ["department"], placeholder: "Select department" },
  {
    key: "clearanceType",
    label: "Clearance Type",
    selectIds: ["clearanceType"],
    placeholder: "Select type",
    filterId: "clearanceFilter",
    filterAllLabel: "All types",
  },
  { key: "accessType", label: "Access Type", checkboxName: "accessTypeValues" },
  { key: "iiiStatus", label: "III - Status", selectIds: ["iiiStatus"], placeholder: "Select status" },
  {
    key: "cjisSecurityAwarenessRole",
    label: "CJIS Security and Awareness Role",
    selectIds: ["cjisSecurityAwarenessRole"],
    placeholder: "Select role",
  },
  {
    key: "outcome",
    label: "Fingerprint Outcome",
    selectIds: ["outcome"],
    placeholder: "Select outcome",
    filterId: "outcomeFilter",
    filterAllLabel: "All fingerprint outcomes",
  },
  { key: "ncicCertification", label: "NCIC Certification", selectIds: ["ncicCertification"], placeholder: "Select Y/N" },
  { key: "positionRole", label: "Position/Role", datalistId: "positionRoleOptions" },
];

const USER_TYPE_LABELS = {
  admin: "Admin-Full",
  adminGlobal: "Admin-Global",
  adminStaff: "Admin-Staff",
  readOnly: "Read Only",
};

function normalizeManagedUserType(value) {
  if (value === "adminGlobal") return "adminGlobal";
  if (value === "adminStaff") return "adminStaff";
  if (value === "admin") return "admin";
  return "readOnly";
}

function isNamedOnlyAccessLevel(role) {
  return role === "adminGlobal" || role === "adminStaff";
}

function uniqueOptions(values) {
  const seen = new Map();
  (Array.isArray(values) ? values : []).forEach((value) => {
    const text = String(value || "").trim();
    if (!text) return;
    const key = text.toUpperCase();
    if (!seen.has(key)) seen.set(key, text);
  });
  return [...seen.values()];
}

function insertOptionIfMissing(values, option, beforeOption) {
  const next = uniqueOptions(values);
  if (next.some((value) => value.toUpperCase() === String(option || "").toUpperCase())) return next;
  const beforeIndex = next.findIndex(
    (value) => value.toUpperCase() === String(beforeOption || "").toUpperCase(),
  );
  if (beforeIndex >= 0) {
    next.splice(beforeIndex, 0, option);
    return next;
  }
  next.push(option);
  return next;
}

function loadOptionLists() {
  const lists = {};
  Object.entries(DEFAULT_OPTION_LISTS).forEach(([key, defaults]) => {
    lists[key] = uniqueOptions(defaults);
  });
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.optionLists);
    if (!raw) return lists;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return lists;
    Object.keys(DEFAULT_OPTION_LISTS).forEach((key) => {
      if (Array.isArray(parsed[key])) {
        const merged = uniqueOptions(parsed[key]);
        lists[key] = merged.length ? merged : uniqueOptions(DEFAULT_OPTION_LISTS[key]);
      }
    });
    lists.accessType = uniqueOptions((lists.accessType || []).map(renameAccessTypeToken));
    lists.department = insertOptionIfMissing(lists.department, "APD", "PD-Police");
    return lists;
  } catch {
    return lists;
  }
}

function saveOptionLists() {
  localStorage.setItem(STORAGE_KEYS.optionLists, JSON.stringify(optionLists));
}

function getOptionList(key) {
  const lists = optionLists || DEFAULT_OPTION_LISTS;
  const values = lists[key];
  if (Array.isArray(values) && values.length) return uniqueOptions(values);
  return uniqueOptions(DEFAULT_OPTION_LISTS[key] || []);
}

function matchClosedOption(value, options, aliases = {}) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const exact = options.find((option) => option.toUpperCase() === raw.toUpperCase());
  if (exact) return exact;
  const alias = aliases[raw.toLowerCase()];
  if (alias) {
    const aliased = options.find((option) => option.toUpperCase() === alias.toUpperCase());
    return aliased || alias;
  }
  return raw;
}

function loadManagedUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.managedUsers);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((user) => ({
        id: String(user.id || crypto.randomUUID()),
        name: String(user.name || "").trim(),
        userType: normalizeManagedUserType(user.userType),
        accessCode: String(user.accessCode || ""),
      }))
      .filter((user) => user.name && user.accessCode.length >= 4);
  } catch {
    return [];
  }
}

function saveManagedUsers() {
  localStorage.setItem(STORAGE_KEYS.managedUsers, JSON.stringify(managedUsers));
}

function currentUserAccessLabel() {
  if (!currentUser) return "";
  if (currentUser.userType && USER_TYPE_LABELS[currentUser.userType]) {
    return USER_TYPE_LABELS[currentUser.userType];
  }
  return ACCESS_LABELS[currentUser.role] || currentUser.role;
}

function normalizeDepartment(value) {
  return matchClosedOption(value, getOptionList("department"));
}

function isCreatingApplicant() {
  return !String(document.querySelector("#recordId")?.value || "").trim();
}

function requiredCreateFieldValue(field, record) {
  if (field === "driversLicense") {
    return normalizeDriversLicense(record?.driversLicense);
  }
  return String(record?.[field] || "").trim();
}

function getMissingCreateRequiredFields(record) {
  return CREATE_REQUIRED_FIELDS.filter(({ field }) => !requiredCreateFieldValue(field, record)).map(
    ({ label }) => label,
  );
}

function syncCreateRequiredAttributes() {
  const requiredOnCreate = isCreatingApplicant() && currentFormMode !== "view";
  CREATE_REQUIRED_FIELDS.forEach(({ field }) => {
    const control = document.querySelector(`#${field}`);
    if (!control) return;
    if (field === "lastName" || field === "firstName") {
      control.required = true;
      return;
    }
    control.required = requiredOnCreate;
  });
}

function findDuplicateDriversLicenseRecords(value, excludeId) {
  const normalized = normalizeDriversLicense(value);
  if (!normalized) return [];
  return records.filter((record) => {
    return (
      record.id !== excludeId &&
      normalizeDriversLicense(record.driversLicense) === normalized
    );
  });
}

function shouldBlockDuplicateDriversLicense(value, excludeId) {
  const normalized = normalizeDriversLicense(value);
  const duplicates = findDuplicateDriversLicenseRecords(normalized, excludeId);
  if (!normalized || !duplicates.length) {
    return { block: false, duplicates };
  }
  if (acknowledgedDuplicateDriversLicense === normalized) {
    return { block: false, duplicates };
  }
  if (excludeId) {
    const existing = records.find((record) => record.id === excludeId);
    if (existing && normalizeDriversLicense(existing.driversLicense) === normalized) {
      return { block: false, duplicates };
    }
  }
  return { block: true, duplicates };
}

function formatDuplicateDisplayValue(value) {
  const text = String(value || "").trim();
  return text ? escapeHtml(text) : "—";
}

function hideDuplicateDriversLicensePanel() {
  if (!duplicateDriversLicensePanel) return;
  duplicateDriversLicensePanel.hidden = true;
  duplicateDriversLicensePanel.classList.add("hidden");
  if (duplicateDriversLicenseList) duplicateDriversLicenseList.innerHTML = "";
}

function showDuplicateDriversLicenseWarning(duplicates) {
  showMessage(formMessage, "applicant is already on file", true);
  if (!duplicateDriversLicensePanel || !duplicateDriversLicenseList) return;
  const canCreate = canAccessView("admin");
  duplicateDriversLicenseList.innerHTML = duplicates
    .map((record) => {
      const archivedNote = isArchivedRecord(record)
        ? `<p class="duplicate-dl-meta">Archived</p>`
        : "";
      const copyButton = canCreate
        ? `<button class="admin-action duplicate-dl-copy" type="button" data-copy-applicant="${escapeHtml(record.id)}">Create new applicant</button>`
        : "";
      return `<article class="duplicate-dl-card">
        <p class="duplicate-dl-name">${formatDuplicateDisplayValue(record.name)}</p>
        <p>Driver Lic Num: ${formatDuplicateDisplayValue(record.driversLicense)}</p>
        <p>Applicant Phone Number: ${formatDuplicateDisplayValue(record.phoneNumber)}</p>
        <p>Applicant Email: ${formatDuplicateDisplayValue(record.emailAddress)}</p>
        <p>Vendor: ${formatDuplicateDisplayValue(record.vendor)}</p>
        <p>Clearance Type: ${formatDuplicateDisplayValue(record.clearanceType)}</p>
        ${archivedNote}
        ${copyButton}
      </article>`;
    })
    .join("");
  duplicateDriversLicensePanel.hidden = false;
  duplicateDriversLicensePanel.classList.remove("hidden");
  duplicateDriversLicenseList.querySelectorAll("[data-copy-applicant]").forEach((button) => {
    button.addEventListener("click", () => {
      startNewApplicantFromDuplicate(button.dataset.copyApplicant);
    });
  });
}

function reviewDriversLicenseDuplicates() {
  if (currentFormMode === "view") {
    hideDuplicateDriversLicensePanel();
    return;
  }
  const excludeId = document.querySelector("#recordId")?.value || "";
  const raw = driversLicenseInput ? driversLicenseInput.value : "";
  const result = shouldBlockDuplicateDriversLicense(raw, excludeId);
  if (result.block) {
    showDuplicateDriversLicenseWarning(result.duplicates);
    return;
  }
  hideDuplicateDriversLicensePanel();
  if (formMessage && formMessage.textContent === "applicant is already on file") {
    showMessage(formMessage, "");
  }
}

function startNewApplicantFromDuplicate(sourceId) {
  const source = records.find((record) => record.id === sourceId);
  if (!source || !canAccessView("admin")) return;

  const copiedNameParts = resolveApplicantNameParts(source);
  const copiedDl = normalizeDriversLicense(source.driversLicense);
  const copiedPhone = formatPhoneNumber(source.phoneNumber);
  const copiedEmail = String(source.emailAddress || "");

  drawerOpen = true;
  if (currentView !== "admin") {
    setView("admin");
  }

  currentFormMode = "edit";
  applicantForm.reset();
  currentDocuments = [];
  documentUpload.value = "";
  renderDocumentList();
  document.querySelector("#recordId").value = "";
  acknowledgedDuplicateDriversLicense = copiedDl;
  setFormFieldValue("lastName", copiedNameParts.lastName);
  setFormFieldValue("firstName", copiedNameParts.firstName);
  setFormFieldValue("middleInitial", copiedNameParts.middleInitial);
  setFormFieldValue("suffix", copiedNameParts.suffix);
  setFormFieldValue("driversLicense", copiedDl);
  setFormFieldValue("phoneNumber", copiedPhone);
  setFormFieldValue("emailAddress", copiedEmail);
  setFormFieldValue("vendor", "");
  setFormFieldValue("department", "");
  setFormFieldValue("positionRole", "");
  setFormFieldValue("requestor", "");
  setFormFieldValue("source", "");
  syncInquiryDueField();
  syncApplicantActivityStatus();
  hideDuplicateDriversLicensePanel();
  updateFormMode();
  updateChangeLogVisibility();
  updateEditorVisibility();
  updateArchiveVisibility();
  showMessage(formMessage, "New applicant started from an existing record. Complete remaining fields and save.");
  document.querySelector("#vendor")?.focus();
}

const fields = [
  "lastName",
  "firstName",
  "middleInitial",
  "suffix",
  "name",
  "controlNumber",
  "driversLicense",
  "vendor",
  "department",
  "positionRole",
  "requestor",
  "dateInformationProvided",
  "dateOfIiiCompletion",
  "iiiStatus",
  "clearanceType",
  "tourOrientation",
  "accessType",
  "passport",
  "cjisSecurityAwarenessRole",
  "fingerprintsNotifiedCompleted",
  "outcome",
  "securityAwarenessExpiration",
  "securityAddendum",
  "ncicCertificationExpiration",
  "ncicCertification",
  "completedFullProcess",
  "dateOfSiteVisitOnly",
  "queriedEveryFiveYears",
  "emailAddress",
  "phoneNumber",
  "source",
  "lastChangedBy",
  "documents",
  "notes",
];

const limitedFields = [
  "name",
  "driversLicense",
  "vendor",
  "department",
  "positionRole",
  "activityStatus",
  "clearanceType",
  "securityAwarenessExpiration",
  "lastChangedBy",
];

const adminFields = fields.filter((field) => !["notes", "documents"].includes(field));
// Admin table diet (DEC-019): Actions plus slim data columns. Control ID stays
// off lists (DEC-020). Driver Lic Num is shown near Name. Tour/Orientation,
// Source, III - Status, CJIS Security Role, NCIC Certification, Passport,
// Fingerprint Outcome, and Access Type stay in the form, search, and data
// model, not on Limited or All Applicant Records listings.
const adminTableFields = [
  "name",
  "driversLicense",
  "clearanceType",
  "department",
  "positionRole",
  "requestor",
];
const dateSortFields = new Set([
  "dateInformationProvided",
  "dateOfIiiCompletion",
  "fingerprintsNotifiedCompleted",
  "securityAwarenessExpiration",
  "securityAddendum",
  "ncicCertificationExpiration",
  "completedFullProcess",
  "dateOfSiteVisitOnly",
  "queriedEveryFiveYears",
]);
const formFields = fields.filter((field) => field !== "documents" && field !== "name");

const labels = {
  lastName: "Last Name",
  firstName: "First Name",
  middleInitial: "Middle Initial",
  suffix: "Suffix",
  name: "Name",
  controlNumber: "Control ID",
  driversLicense: "Driver Lic Num",
  source: "Source",
  vendor: "Vendor",
  department: "Department",
  positionRole: "Position/Role",
  requestor: "Requestor",
  dateInformationProvided: "Date Information Provided",
  iiiStatus: "III - Status",
  dateOfIiiCompletion: "Date of III Completion",
  clearanceType: "Clearance Type",
  tourOrientation: "Tour/Orientation",
  accessType: "Access Type",
  passport: "Passport",
  cjisSecurityAwarenessRole: "CJIS Security and Awareness Role",
  ncicCertification: "NCIC Certification",
  ncicCertificationExpiration: "NCIC Date of Cert Expiration",
  fingerprintsNotifiedCompleted: "Fingerprints Completed",
  outcome: "Fingerprint Outcome",
  securityAwarenessExpiration: "Security and Awareness Cert",
  securityAddendum: "Security Addendum",
  phoneNumber: "Applicant Phone Number",
  emailAddress: "Applicant Email Address",
  documents: "Documents",
  completedFullProcess: "Completed Full Process",
  dateOfSiteVisitOnly: "Date of Site Visit Only",
  queriedEveryFiveYears: "Next III Inquiry Due (5 yrs)",
  lastChangedBy: "Last Changed By",
  notes: "Notes",
};

const tableLabels = {
  name: "Name",
  driversLicense: "Driver Lic Num",
  cjisSecurityAwarenessRole: "CJIS Security Role",
  securityAwarenessExpiration: "Security and Awareness Cert",
  activityStatus: "Status",
};

let optionLists = loadOptionLists();
saveOptionLists();
let managedUsers = loadManagedUsers();
let inquiryDueMigrationCount = 0;
let iiiCompletionMigrationCount = 0;
let iiiCompletionIsoMigrated = localStorage.getItem(STORAGE_KEYS.iiiCompletionIsoMigrated) === "1";
let records = loadRecords();
let changeLog = loadChangeLog();
if (inquiryDueMigrationCount) {
  logInquiryDueMigration(inquiryDueMigrationCount);
}
if (iiiCompletionMigrationCount) {
  logIiiCompletionIsoMigration(iiiCompletionMigrationCount);
}
let currentUser = null;
let currentView = "limited";
let fullScreenView = null;
let viewBeforeFullScreen = "admin";
let currentDocuments = [];
let currentFormMode = "edit";
let drawerOpen = false;
let drawerReturnFocus = null;
let acknowledgedDuplicateDriversLicense = "";
let optionListEdit = null;
let adminListSort = { field: "", direction: "asc" };
let adminClearanceFilterValue = "all";

const accessPanel = document.querySelector("#accessPanel");
const accessForm = document.querySelector("#accessForm");
const managementUserName = document.querySelector("#managementUserName");
const managementAccessLevel = document.querySelector("#managementAccessLevel");
const managementAccessCode = document.querySelector("#managementAccessCode");
const currentUserBadge = document.querySelector("#currentUserBadge");
const archivedRecordsButton = document.querySelector("#archivedRecordsButton");
const adminConsoleButton = document.querySelector("#adminConsoleButton");
const signOutButton = document.querySelector("#signOutButton");
const adminConsole = document.querySelector("#adminConsole");
const archivedRecordsPage = document.querySelector("#archivedRecordsPage");
const closeAdminConsoleButton = document.querySelector("#closeAdminConsole");
const closeArchivedRecordsButton = document.querySelector("#closeArchivedRecords");
const archivedSearchInput = document.querySelector("#archivedSearchInput");
const optionListEditors = document.querySelector("#optionListEditors");
const optionListMessage = document.querySelector("#optionListMessage");
const addManagedUserForm = document.querySelector("#addManagedUserForm");
const managedUserMessage = document.querySelector("#managedUserMessage");
const managedUserTable = document.querySelector("#managedUserTable");
const accessMessage = document.querySelector("#accessMessage");
const headerMetrics = document.querySelector("#headerMetrics");
const viewSwitch = document.querySelector("#viewSwitch");
const sessionControls = document.querySelector("#sessionControls");
const toolbar = document.querySelector("#toolbar");
const drawerBackdrop = document.querySelector("#drawerBackdrop");
const closeDrawer = document.querySelector("#closeDrawer");
const limitedPopup = document.querySelector("#limitedPopup");
const limitedPopupBackdrop = document.querySelector("#limitedPopupBackdrop");
const limitedPopupFields = document.querySelector("#limitedPopupFields");
const closeLimitedPopupButton = document.querySelector("#closeLimitedPopup");
let limitedPopupReturnFocus = null;
const LIMITED_POPUP_FIELDS = [
  { field: "lastName", label: "Last Name" },
  { field: "firstName", label: "First Name" },
  { field: "clearanceType", label: "Clearance Type" },
  { field: "department", label: "Department" },
  { field: "positionRole", label: "Position/Role" },
];
const LIMITED_POPUP_DATE_FIELDS = [
  { field: "dateInformationProvided", label: "Date Information Provided" },
  { field: "dateOfIiiCompletion", label: "Date of III Completion" },
  { field: "queriedEveryFiveYears", label: "Next III Inquiry Due (5 yrs)" },
  { field: "fingerprintsNotifiedCompleted", label: "Fingerprints Completed" },
  { field: "securityAwarenessExpiration", label: "Security and Awareness Cert" },
  { field: "securityAddendum", label: "Security Addendum" },
  { field: "ncicCertificationExpiration", label: "NCIC Date of Cert Expiration" },
  { field: "completedFullProcess", label: "Completed Full Process" },
];
const limitedViewButton = document.querySelector("#limitedViewButton");
const recordsViewButton = document.querySelector("#recordsViewButton");
const adminViewButton = document.querySelector("#adminViewButton");
const limitedView = document.querySelector("#limitedView");
const recordsView = document.querySelector("#recordsView");
const adminView = document.querySelector("#adminView");
const editorPanel = document.querySelector("#editorPanel");
const editorEyebrow = document.querySelector("#editorEyebrow");
const formHeading = document.querySelector("#formHeading");
const limitedTable = document.querySelector("#limitedTable");
const recordsTable = document.querySelector("#recordsTable");
const adminTable = document.querySelector("#adminTable");
const adminTools = document.querySelector("#adminTools");
const changeLogTable = document.querySelector("#changeLogTable");
const changeLogPanel = document.querySelector("#changeLogPanel");
const applicantForm = document.querySelector("#applicantForm");
const saveApplicantButton = document.querySelector("#saveApplicantButton");
const resetForm = document.querySelector("#resetForm");
const archiveRecord = document.querySelector("#archiveRecord");
const restoreRecord = document.querySelector("#restoreRecord");
const archivedTable = document.querySelector("#archivedTable");
const archivedCountPill = document.querySelector("#archivedCountPill");
const exportCsv = document.querySelector("#exportCsv");
const formMessage = document.querySelector("#formMessage");
const duplicateDriversLicensePanel = document.querySelector("#duplicateDriversLicensePanel");
const duplicateDriversLicenseList = document.querySelector("#duplicateDriversLicenseList");
const searchInput = document.querySelector("#searchInput");
const activityFilter = document.querySelector("#activityFilter");
const clearanceFilter = document.querySelector("#clearanceFilter");
const outcomeFilter = document.querySelector("#outcomeFilter");
const vendorOptions = document.querySelector("#vendorOptions");
const positionRoleOptions = document.querySelector("#positionRoleOptions");
const documentUpload = document.querySelector("#documentUpload");
const documentList = document.querySelector("#documentList");

const accessSetupForm = document.querySelector("#accessSetupForm");
const setupMessage = document.querySelector("#setupMessage");
const importForm = document.querySelector("#importForm");
const importCsvFile = document.querySelector("#importCsvFile");
const importReplace = document.querySelector("#importReplace");
const importMessage = document.querySelector("#importMessage");

accessForm.addEventListener("submit", signInManagementUser);
accessSetupForm.addEventListener("submit", completeAccessSetup);
if (importForm) importForm.addEventListener("submit", handleCsvImport);

function updateSetupVisibility() {
  const needsSetup = !accessCodes;
  accessSetupForm.classList.toggle("hidden", !needsSetup);
  accessForm.classList.toggle("hidden", needsSetup || Boolean(currentUser));
}

function completeAccessSetup(event) {
  event.preventDefault();
  const limited = document.querySelector("#setupLimitedCode").value.trim();
  const recordsCode = document.querySelector("#setupRecordsCode").value.trim();
  const admin = document.querySelector("#setupAdminCode").value.trim();

  if ([limited, recordsCode, admin].some((code) => code.length < 4)) {
    showMessage(setupMessage, "Each access code must be at least 4 characters.", true);
    return;
  }
  if (new Set([limited, recordsCode, admin]).size !== 3) {
    showMessage(setupMessage, "The three access codes must all be different.", true);
    return;
  }
  if ([limited, recordsCode, admin].some((code) => FORBIDDEN_CODES.has(code))) {
    showMessage(setupMessage, "Choose codes that are not former defaults or trivial sequences.", true);
    return;
  }

  saveAccessCodes({ limited, records: recordsCode, admin });
  accessSetupForm.reset();
  updateSetupVisibility();
  showMessage(accessMessage, "Access codes saved. Sign in to continue.");
}
signOutButton.addEventListener("click", signOutManagementUser);
if (archivedRecordsButton) archivedRecordsButton.addEventListener("click", openArchivedRecordsPage);
if (adminConsoleButton) adminConsoleButton.addEventListener("click", openAdminConsole);
if (closeAdminConsoleButton) closeAdminConsoleButton.addEventListener("click", closeFullScreenPage);
if (closeArchivedRecordsButton) closeArchivedRecordsButton.addEventListener("click", closeFullScreenPage);
if (archivedSearchInput) archivedSearchInput.addEventListener("input", renderArchivedTable);
if (optionListEditors) {
  optionListEditors.addEventListener("submit", handleOptionListSubmit);
  optionListEditors.addEventListener("click", handleOptionListClick);
}
if (addManagedUserForm) addManagedUserForm.addEventListener("submit", addManagedUser);
if (managedUserTable) managedUserTable.addEventListener("click", handleManagedUserTableClick);
limitedViewButton.addEventListener("click", () => setView("limited"));
if (recordsViewButton) recordsViewButton.addEventListener("click", () => setView("records"));
adminViewButton.addEventListener("click", () => setView("admin"));
applicantForm.addEventListener("submit", saveApplicant);
resetForm.addEventListener("click", openNewApplicant);
closeDrawer.addEventListener("click", closeApplicantDrawer);
drawerBackdrop.addEventListener("click", closeApplicantDrawer);
if (closeLimitedPopupButton) closeLimitedPopupButton.addEventListener("click", () => closeLimitedPopup());
if (limitedPopupBackdrop) limitedPopupBackdrop.addEventListener("click", () => closeLimitedPopup());
archiveRecord.addEventListener("click", archiveApplicant);
restoreRecord.addEventListener("click", () => restoreApplicant());
document.querySelector("#dateOfIiiCompletion").addEventListener("input", syncInquiryDueField);
document.querySelector("#dateOfIiiCompletion").addEventListener("change", syncInquiryDueField);
const securityAwarenessExpirationInput = document.querySelector("#securityAwarenessExpiration");
if (securityAwarenessExpirationInput) {
  securityAwarenessExpirationInput.addEventListener("input", syncApplicantActivityStatus);
  securityAwarenessExpirationInput.addEventListener("change", syncApplicantActivityStatus);
}
const ncicCertificationExpirationInput = document.querySelector("#ncicCertificationExpiration");
if (ncicCertificationExpirationInput) {
  ncicCertificationExpirationInput.addEventListener("input", syncApplicantActivityStatus);
  ncicCertificationExpirationInput.addEventListener("change", syncApplicantActivityStatus);
}
const driversLicenseInput = document.querySelector("#driversLicense");
if (driversLicenseInput) {
  const applyDriversLicenseInputLimit = () => {
    const selectionStart = driversLicenseInput.selectionStart ?? 0;
    const keptBefore = sanitizeDriversLicenseInput(String(driversLicenseInput.value).slice(0, selectionStart)).length;
    const next = sanitizeDriversLicenseInput(driversLicenseInput.value);
    if (driversLicenseInput.value !== next) {
      driversLicenseInput.value = next;
    }
    if (typeof driversLicenseInput.setSelectionRange === "function") {
      const pos = Math.min(keptBefore, next.length);
      driversLicenseInput.setSelectionRange(pos, pos);
    }
  };
  const syncDriversLicenseValidity = () => {
    applyDriversLicenseInputLimit();
    const raw = String(driversLicenseInput.value || "").trim();
    driversLicenseInput.setCustomValidity(isValidDriversLicense(raw) ? "" : DRIVERS_LICENSE_INVALID_MESSAGE);
    const normalized = normalizeDriversLicense(raw);
    if (acknowledgedDuplicateDriversLicense && acknowledgedDuplicateDriversLicense !== normalized) {
      acknowledgedDuplicateDriversLicense = "";
    }
    reviewDriversLicenseDuplicates();
  };
  driversLicenseInput.addEventListener("input", syncDriversLicenseValidity);
  driversLicenseInput.addEventListener("change", syncDriversLicenseValidity);
  driversLicenseInput.addEventListener("paste", (event) => {
    event.preventDefault();
    const pasted = event.clipboardData ? event.clipboardData.getData("text") : "";
    const start = driversLicenseInput.selectionStart ?? 0;
    const end = driversLicenseInput.selectionEnd ?? 0;
    const current = String(driversLicenseInput.value || "");
    const merged = current.slice(0, start) + pasted + current.slice(end);
    driversLicenseInput.value = sanitizeDriversLicenseInput(merged);
    const cursor = sanitizeDriversLicenseInput(current.slice(0, start) + pasted).length;
    if (typeof driversLicenseInput.setSelectionRange === "function") {
      driversLicenseInput.setSelectionRange(cursor, cursor);
    }
    driversLicenseInput.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function persistUppercaseApplicantTextInput(event) {
  const control = event.target;
  if (!(control instanceof HTMLInputElement)) return;
  if (control.readOnly || control.disabled) return;
  const start = control.selectionStart;
  const end = control.selectionEnd;
  const upper = control.value.toUpperCase();
  if (control.value === upper) return;
  control.value = upper;
  if (typeof start === "number" && typeof end === "number") {
    control.setSelectionRange(start, end);
  }
}

UPPERCASE_APPLICANT_TEXT_FIELDS.forEach((field) => {
  const control = document.querySelector(`#${field}`);
  if (!control) return;
  control.addEventListener("input", persistUppercaseApplicantTextInput);
});
const middleInitialInput = document.querySelector("#middleInitial");
if (middleInitialInput) {
  middleInitialInput.addEventListener("input", () => {
    if (middleInitialInput.readOnly || middleInitialInput.disabled) return;
    const next = normalizeMiddleInitial(middleInitialInput.value);
    if (middleInitialInput.value !== next) middleInitialInput.value = next;
  });
}
const phoneNumberInput = document.querySelector("#phoneNumber");
if (phoneNumberInput) {
  const persistPhoneNumberMask = () => {
    if (phoneNumberInput.readOnly || phoneNumberInput.disabled) return;
    const selectionStart = phoneNumberInput.selectionStart ?? 0;
    const digitsBefore = String(phoneNumberInput.value)
      .slice(0, selectionStart)
      .replace(/\D/g, "").length;
    const formatted = formatPhoneNumber(phoneNumberInput.value);
    if (phoneNumberInput.value !== formatted) {
      phoneNumberInput.value = formatted;
    }
    let seen = 0;
    let pos = formatted.length;
    if (digitsBefore === 0) {
      pos = 0;
    } else {
      for (let i = 0; i < formatted.length; i += 1) {
        if (/\d/.test(formatted[i])) {
          seen += 1;
          if (seen === digitsBefore) {
            pos = i + 1;
            break;
          }
        }
      }
    }
    if (typeof phoneNumberInput.setSelectionRange === "function") {
      phoneNumberInput.setSelectionRange(pos, pos);
    }
    phoneNumberInput.setCustomValidity(isValidPhoneNumber(phoneNumberInput.value) ? "" : PHONE_INVALID_MESSAGE);
  };
  phoneNumberInput.addEventListener("input", persistPhoneNumberMask);
  phoneNumberInput.addEventListener("change", persistPhoneNumberMask);
  phoneNumberInput.addEventListener("paste", (event) => {
    event.preventDefault();
    const pasted = event.clipboardData ? event.clipboardData.getData("text") : "";
    const start = phoneNumberInput.selectionStart ?? 0;
    const end = phoneNumberInput.selectionEnd ?? 0;
    const current = String(phoneNumberInput.value || "");
    const merged = current.slice(0, start) + pasted + current.slice(end);
    phoneNumberInput.value = formatPhoneNumber(merged);
    const digitsBefore = extractPhoneDigits(current.slice(0, start) + pasted).length;
    let seen = 0;
    let pos = phoneNumberInput.value.length;
    if (digitsBefore === 0) {
      pos = 0;
    } else {
      for (let i = 0; i < phoneNumberInput.value.length; i += 1) {
        if (/\d/.test(phoneNumberInput.value[i])) {
          seen += 1;
          if (seen === digitsBefore) {
            pos = i + 1;
            break;
          }
        }
      }
    }
    if (typeof phoneNumberInput.setSelectionRange === "function") {
      phoneNumberInput.setSelectionRange(pos, pos);
    }
    phoneNumberInput.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
document.addEventListener("keydown", handleDrawerKeydown);
document.addEventListener("keydown", handleLimitedPopupKeydown);
if (exportCsv) exportCsv.addEventListener("click", downloadCsv);
documentUpload.addEventListener("change", handleDocumentUpload);
[searchInput, activityFilter, clearanceFilter, outcomeFilter].forEach((control) => {
  if (!control) return;
  control.addEventListener("input", () => {
    if (control === clearanceFilter && currentView !== "limited") {
      adminClearanceFilterValue = clearanceFilter.value || "all";
    }
    renderAll();
  });
});
if (adminTable) {
  adminTable.addEventListener("click", handleAdminTableSortClick);
}

function loadRecords() {
  const raw = localStorage.getItem(STORAGE_KEYS.records);
  if (!raw) {
    const seed = typeof getTestApplicantSeed === "function" ? getTestApplicantSeed() : [];
    if (seed.length) {
      return normalizeRecords(seed);
    }
    markIiiCompletionMigrated();
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    const previousDueDates = parsed.map((record) => record.queriedEveryFiveYears || "");
    const normalized = normalizeRecords(parsed);
    inquiryDueMigrationCount = normalized.filter((record, index) => {
      return (record.queriedEveryFiveYears || "") !== previousDueDates[index];
    }).length;
    return normalized;
  } catch {
    return [];
  }
}

function saveRecords() {
  saveRecordSet(records);
}

function saveRecordSet(recordSet) {
  localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(recordSet));
  if (persistenceMode === "sql") {
    void persistRecordsToSql(recordSet);
  }
}

function recordsForSql(recordSet) {
  return recordSet.map((record) => {
    const next = { ...record };
    delete next.dateOfBirth;
    delete next.socialSecurityNumber;
    next.documents = [];
    return next;
  });
}

async function persistRecordsToSql(recordSet) {
  try {
    const response = await fetch(`${SQL_API_BASE}/api/applicants`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: recordsForSql(recordSet) }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      sqlPersistError = body.reason || body.error || `HTTP ${response.status}`;
      updatePersistenceStatus();
      return;
    }
    sqlPersistError = "";
    updatePersistenceStatus();
  } catch (error) {
    sqlPersistError = error.message || String(error);
    updatePersistenceStatus();
  }
}

async function startSqlPersistence() {
  try {
    const healthResponse = await fetch(`${SQL_API_BASE}/health`);
    const health = await healthResponse.json().catch(() => null);
    if (!health || !health.database || !health.database.connected) {
      updatePersistenceStatus();
      return;
    }
    const listResponse = await fetch(`${SQL_API_BASE}/api/applicants`);
    if (!listResponse.ok) {
      updatePersistenceStatus();
      return;
    }
    const body = await listResponse.json();
    const remote = Array.isArray(body.records) ? body.records : [];
    if (remote.length) {
      records = normalizeRecords(remote);
    }
    persistenceMode = "sql";
    if (!remote.length && records.length) {
      await persistRecordsToSql(records);
    }
    renderAll();
    updatePersistenceStatus();
  } catch {
    persistenceMode = "local";
    updatePersistenceStatus();
  }
}

function updatePersistenceStatus() {
  const target = document.querySelector("#persistenceStatus");
  if (!target) return;
  if (persistenceMode === "sql") {
    target.textContent = sqlPersistError
      ? `Storage: SQL error (${sqlPersistError})`
      : "Storage: SQL (localhost)";
    return;
  }
  target.textContent = "Storage: this browser";
}

function loadChangeLog() {
  const raw = localStorage.getItem(STORAGE_KEYS.changeLog);
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveChangeLog() {
  localStorage.setItem(STORAGE_KEYS.changeLog, JSON.stringify(changeLog));
}

function normalizeRecords(recordSet) {
  const normalized = recordSet.map((record) => {
    const legacyDate = record.completedProcessOrSiteVisit || "";
    const storedIiiCompletion = toStoredIiiCompletionDate(record.dateOfIiiCompletion);
    const nameParts = resolveApplicantNameParts(record);
    const nextRecord = {
      ...record,
      lastName: nameParts.lastName,
      firstName: nameParts.firstName,
      middleInitial: nameParts.middleInitial,
      suffix: nameParts.suffix,
      name: nameParts.name,
      controlNumber: normalizeApplicantText(record.controlNumber || record.controlId),
      driversLicense: normalizeDriversLicense(record.driversLicense),
      source: normalizeApplicantText(record.source),
      vendor: normalizeApplicantText(record.vendor),
      department: normalizeDepartment(record.department),
      positionRole: normalizeApplicantText(record.positionRole),
      requestor: normalizeApplicantText(record.requestor),
      outcome: normalizeOutcome(record.outcome),
      iiiStatus: normalizeIiiStatus(record.iiiStatus),
      clearanceType: normalizeClearanceType(record.clearanceType),
      tourOrientation: normalizeYesNo(record.tourOrientation),
      securityAddendum: normalizeDateValue(record.securityAddendum),
      dateOfIiiCompletion: storedIiiCompletion,
      queriedEveryFiveYears: computeInquiryDueDate(storedIiiCompletion),
      accessType: normalizeAccessType(record.accessType),
      passport: normalizeYesNo(record.passport),
      cjisSecurityAwarenessRole: record.cjisSecurityAwarenessRole || "",
      ncicCertification: matchClosedOption(record.ncicCertification, getOptionList("ncicCertification"), {
        yes: "Y",
        y: "Y",
        true: "Y",
        "1": "Y",
        on: "Y",
        no: "N",
        n: "N",
        false: "N",
        "0": "N",
      }),
      ncicCertificationExpiration: normalizeDateValue(record.ncicCertificationExpiration),
      emailAddress: normalizeApplicantText(record.emailAddress),
      phoneNumber: normalizePhoneNumber(record.phoneNumber),
      completedFullProcess: record.completedFullProcess || "",
      dateOfSiteVisitOnly: record.dateOfSiteVisitOnly || "",
      lastChangedBy: record.lastChangedBy || "",
      documents: Array.isArray(record.documents) ? record.documents : [],
      notes: record.notes || "",
      archived: Boolean(record.archived),
      archivedAt: Boolean(record.archived) ? String(record.archivedAt || "") : "",
      archivedBy: Boolean(record.archived) ? String(record.archivedBy || "") : "",
    };

    if (legacyDate && !nextRecord.completedFullProcess && !nextRecord.dateOfSiteVisitOnly) {
      if (record.clearanceType === "One Time Visit") {
        nextRecord.dateOfSiteVisitOnly = legacyDate;
      } else {
        nextRecord.completedFullProcess = legacyDate;
      }
    }

    delete nextRecord.completedProcessOrSiteVisit;
    delete nextRecord.dateOfBirth;
    delete nextRecord.socialSecurityNumber;
    delete nextRecord.isDeleted;
    delete nextRecord.deleted;
    return nextRecord;
  });

  markIiiCompletionMigrated();
  saveRecordSet(normalized);
  return normalized;
}

function normalizeApplicantName(value) {
  return formatApplicantName(parseApplicantName(value));
}

function normalizeMiddleInitial(value) {
  const match = String(value || "").trim().toUpperCase().match(/[A-Z]/);
  return match ? match[0] : "";
}

function isNameSuffix(value) {
  const token = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\./g, "");
  return NAME_SUFFIX_VALUES.has(token);
}

function isMiddleInitialToken(value) {
  return /^[A-Za-z]\.?$/.test(String(value || "").trim());
}

function parseGivenNameParts(lastName, rest) {
  const tokens = String(rest || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  let suffix = "";
  if (tokens.length && isNameSuffix(tokens[tokens.length - 1])) {
    suffix = normalizeApplicantText(tokens.pop().replace(/\./g, ""));
  }
  const firstParts = [];
  let middleInitial = "";
  tokens.forEach((token, index) => {
    if (!middleInitial && index > 0 && isMiddleInitialToken(token)) {
      middleInitial = normalizeMiddleInitial(token);
      return;
    }
    firstParts.push(token);
  });
  return {
    lastName: normalizeApplicantText(lastName),
    firstName: normalizeApplicantText(firstParts.join(" ")),
    middleInitial,
    suffix,
  };
}

function parseApplicantName(value) {
  const text = String(value || "").trim();
  if (!text) {
    return { lastName: "", firstName: "", middleInitial: "", suffix: "" };
  }
  if (!text.includes(",")) {
    const parts = text.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return { lastName: normalizeApplicantText(parts[0]), firstName: "", middleInitial: "", suffix: "" };
    }
    return parseGivenNameParts(parts.at(-1), parts.slice(0, -1).join(" "));
  }
  const comma = text.indexOf(",");
  return parseGivenNameParts(text.slice(0, comma), text.slice(comma + 1));
}

function formatApplicantName(parts) {
  const lastName = normalizeApplicantText(parts?.lastName);
  const firstName = normalizeApplicantText(parts?.firstName);
  const middleInitial = normalizeMiddleInitial(parts?.middleInitial);
  const suffix = normalizeApplicantText(parts?.suffix);
  const given = [firstName, middleInitial, suffix].filter(Boolean).join(" ");
  if (lastName && given) return `${lastName}, ${given}`;
  return lastName || given;
}

function resolveApplicantNameParts(record) {
  const parsed = parseApplicantName(record?.name);
  const lastName = normalizeApplicantText(record?.lastName) || parsed.lastName;
  const firstName = normalizeApplicantText(record?.firstName) || parsed.firstName;
  const middleInitial = normalizeMiddleInitial(record?.middleInitial) || parsed.middleInitial;
  const suffix = normalizeApplicantText(record?.suffix) || parsed.suffix;
  return {
    lastName,
    firstName,
    middleInitial,
    suffix,
    name: formatApplicantName({ lastName, firstName, middleInitial, suffix }),
  };
}

function normalizeOutcome(value) {
  return matchClosedOption(value, getOptionList("outcome"), {
    approved: "Clear",
    clear: "Clear",
    "misd/clear": "Misd/Clear",
    "misd clear": "Misd/Clear",
    denied: "Felony",
    unauthorized: "Felony",
    felony: "Felony",
  });
}

function normalizeIiiStatus(value) {
  return matchClosedOption(value, getOptionList("iiiStatus"), {
    clear: "Clear",
    felony: "Felony",
    "review needed": "Felony",
    "misd/clear": "Misd/Clear",
    "misd clear": "Misd/Clear",
  });
}

function normalizeClearanceType(value) {
  return matchClosedOption(value, getOptionList("clearanceType"), {
    "full clearance": "Full Clearance",
    "one time visit": "One Time Visit",
    "in-progress": "InProgress",
    "in progress": "InProgress",
    inprogress: "InProgress",
    "no access given": "No Access Given",
  });
}

function normalizeAccessType(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(",");
  const allowed = new Map(getOptionList("accessType").map((option) => [option.toLowerCase(), option]));
  return values
    .map((item) => renameAccessTypeToken(item))
    .filter(Boolean)
    .map((item) => allowed.get(item.toLowerCase()) || item)
    .filter((item, index, list) => list.indexOf(item) === index)
    .join(", ");
}

function normalizeDateValue(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function normalizeYesNo(value) {
  if (value === true || value === 1) return "Y";
  if (value === false || value === 0) return "N";
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "yes" || normalized === "y" || normalized === "true" || normalized === "1" || normalized === "on") {
    return "Y";
  }
  if (normalized === "no" || normalized === "n" || normalized === "false" || normalized === "0") {
    return "N";
  }
  return "";
}

function findManagedUserByCredentials(name, code) {
  const needle = String(name || "").trim().toLowerCase();
  if (!needle || !code) return null;
  return managedUsers.find((user) => user.name.toLowerCase() === needle && user.accessCode === code) || null;
}

function managedUserRole(user) {
  return user.userType === "readOnly" ? "limited" : "admin";
}

function managedUserSignInLevel(user) {
  if (user.userType === "readOnly") return "limited";
  if (user.userType === "adminStaff") return "adminStaff";
  if (user.userType === "adminGlobal") return "adminGlobal";
  return "admin";
}

function signInManagementUser(event) {
  event.preventDefault();
  const name = managementUserName.value.trim();
  const role = managementAccessLevel.value;
  const code = managementAccessCode.value;
  const managed = findManagedUserByCredentials(name, code);

  if (role === "admin" && code === OWNER_ADMIN_CODE) {
    ensureOwnerAccessCodes();
    updateSetupVisibility();
  }

  if (!name || !role) {
    showMessage(accessMessage, "Invalid management access.", true);
    return;
  }

  if (managed) {
    const mappedRole = managedUserRole(managed);
    const expectedLevel = managedUserSignInLevel(managed);
    if (role !== expectedLevel) {
      showMessage(
        accessMessage,
        `This account is ${USER_TYPE_LABELS[managed.userType]}. Select ${ACCESS_LABELS[expectedLevel]}.`,
        true,
      );
      return;
    }
    currentUser = { name: managed.name, role: mappedRole, userType: managed.userType };
    managementAccessCode.value = "";
    showMessage(accessMessage, "");
    updateAccessControls();
    setView(mappedRole);
    return;
  }

  if (isNamedOnlyAccessLevel(role)) {
    showMessage(accessMessage, `${ACCESS_LABELS[role]} sign-in requires a named ${ACCESS_LABELS[role]} user.`, true);
    return;
  }

  if (!accessCodes) {
    showMessage(accessMessage, "Access codes are not configured. Complete initial setup first.", true);
    return;
  }

  if (accessCodes[role] !== code) {
    showMessage(accessMessage, "Invalid management access.", true);
    return;
  }

  currentUser = { name, role };
  managementAccessCode.value = "";
  showMessage(accessMessage, "");
  updateAccessControls();
  setView(role);
}

function signOutManagementUser() {
  currentUser = null;
  currentFormMode = "edit";
  fullScreenView = null;
  closeApplicantDrawer({ restoreFocus: false });
  closeLimitedPopup({ restoreFocus: false });
  showMessage(accessMessage, "Signed out.");
  updateAccessControls();
  setView("limited");
}

function canAccessView(view) {
  if (!currentUser) return false;
  if (currentUser.role === "admin") return true;
  if (currentUser.role === "records") return view === "limited" || view === "records";
  return view === "limited";
}

function isAdminPageOpen() {
  return fullScreenView === "admin" || fullScreenView === "archived";
}

function updateAccessControls() {
  const signedIn = Boolean(currentUser);
  const showFullPage = signedIn && isAdminPageOpen() && isFullAdmin();
  document.body.classList.toggle("signed-in", signedIn);
  document.body.classList.toggle("signed-out", !signedIn);
  document.body.classList.toggle("admin-console-open", showFullPage);
  accessPanel.classList.toggle("session-bar", signedIn);
  accessPanel.classList.remove("hidden");
  accessForm.classList.toggle("hidden", signedIn || !accessCodes);
  headerMetrics.classList.toggle("hidden", !signedIn);
  viewSwitch.classList.toggle("hidden", !signedIn || showFullPage);
  sessionControls.classList.toggle("hidden", !signedIn);
  toolbar.classList.toggle("hidden", !signedIn || showFullPage);
  currentUserBadge.textContent = signedIn ? `${currentUser.name} - ${currentUserAccessLabel()}` : "";
  if (archivedRecordsButton) {
    archivedRecordsButton.classList.toggle(
      "hidden",
      !signedIn || !isFullAdmin() || fullScreenView === "archived",
    );
  }
  if (adminConsoleButton) {
    adminConsoleButton.classList.toggle(
      "hidden",
      !signedIn || !canAccessAdminConsole() || fullScreenView === "admin",
    );
  }
  syncAdminGlobalOnlySections();

  limitedViewButton.disabled = !canAccessView("limited");
  if (recordsViewButton) recordsViewButton.disabled = !canAccessView("records");
  adminViewButton.disabled = !canAccessView("admin");
}

function updateFullScreenVisibility() {
  const showAdmin = Boolean(currentUser) && fullScreenView === "admin" && canAccessAdminConsole();
  const showArchived = Boolean(currentUser) && fullScreenView === "archived" && canReviewArchived();
  if (adminConsole) adminConsole.classList.toggle("hidden", !showAdmin);
  if (archivedRecordsPage) archivedRecordsPage.classList.toggle("hidden", !showArchived);
  if (fullScreenView === "admin" && !canAccessAdminConsole()) {
    fullScreenView = null;
  }
  if (fullScreenView === "archived" && !canReviewArchived()) {
    fullScreenView = null;
  }
}

function openFullScreenView(page) {
  const allowed =
    page === "admin" ? canAccessAdminConsole() : page === "archived" ? canReviewArchived() : false;
  if (!allowed) {
    showMessage(
      accessMessage,
      page === "admin"
        ? "Only Admin-Full and Admin-Global can open the Settings Console."
        : "Only Full Admin can open this page.",
      true,
    );
    return;
  }
  if (!isAdminPageOpen()) {
    viewBeforeFullScreen = currentView;
  }
  currentView = "admin";
  fullScreenView = page;
  closeApplicantDrawer({ restoreFocus: false });
  updateAccessControls();
  updateFullScreenVisibility();
  limitedView.classList.add("hidden");
  recordsView.classList.add("hidden");
  adminView.classList.add("hidden");
  renderAll();
}

function openAdminConsole() {
  openFullScreenView("admin");
}

function openArchivedRecordsPage() {
  openFullScreenView("archived");
}

function closeFullScreenPage() {
  fullScreenView = null;
  updateFullScreenVisibility();
  const nextView = canAccessView(viewBeforeFullScreen) ? viewBeforeFullScreen : "admin";
  updateAccessControls();
  setView(nextView);
}

function setView(view) {
  if (isAdminPageOpen() && view) {
    fullScreenView = null;
  }
  updateFullScreenVisibility();
  if (!canAccessView(view)) {
    currentView = "limited";
    limitedView.classList.add("hidden");
    recordsView.classList.add("hidden");
    adminView.classList.add("hidden");
    editorPanel.classList.add("hidden");
    limitedViewButton.classList.remove("active");
    recordsViewButton?.classList.remove("active");
    adminViewButton.classList.remove("active");
    limitedViewButton.setAttribute("aria-selected", "false");
    recordsViewButton?.setAttribute("aria-selected", "false");
    adminViewButton.setAttribute("aria-selected", "false");
    if (currentUser) showMessage(accessMessage, `${ACCESS_LABELS[currentUser.role]} cannot open ${ACCESS_LABELS[view]}.`, true);
    closeLimitedPopup({ restoreFocus: false });
    renderAll();
    return;
  }

  const isAdmin = view === "admin";
  const isRecords = view === "records";
  currentView = view;
  limitedView.classList.toggle("hidden", view !== "limited");
  recordsView.classList.toggle("hidden", !isRecords);
  adminView.classList.toggle("hidden", !isAdmin);
  limitedViewButton.classList.toggle("active", view === "limited");
  recordsViewButton?.classList.toggle("active", isRecords);
  adminViewButton.classList.toggle("active", isAdmin);
  limitedViewButton.setAttribute("aria-selected", String(view === "limited"));
  recordsViewButton?.setAttribute("aria-selected", String(isRecords));
  adminViewButton.setAttribute("aria-selected", String(isAdmin));
  editorEyebrow.textContent = isAdmin ? "Full Record" : "Records";
  resetForm.classList.toggle("hidden", !isAdmin);
  if (!isAdmin && !isRecords) closeApplicantDrawer({ restoreFocus: false });
  if (view !== "limited") closeLimitedPopup({ restoreFocus: false });
  updateFormMode();
  updateEditorVisibility();
  updateArchiveVisibility();
  updateChangeLogVisibility();
  renderAll();
}

function getFormFieldValue(field) {
  if (field === "accessType") {
    const visible = [...document.querySelectorAll('input[name="accessTypeValues"]:checked')].map(
      (input) => input.value,
    );
    const existingId = document.querySelector("#recordId")?.value || "";
    const existing = existingId ? records.find((record) => record.id === existingId) : null;
    const hiddenKept = String(existing?.accessType || "")
      .split(",")
      .map((item) => renameAccessTypeToken(item))
      .filter((item) => isHiddenAccessTypeOption(item));
    return normalizeAccessType([...visible, ...hiddenKept].join(", "));
  }

  if (field === "passport" || field === "tourOrientation") {
    return document.querySelector(`#${field}`).checked ? "Y" : "N";
  }

  const raw = document.querySelector(`#${field}`).value.trim();
  if (field === "dateOfIiiCompletion") {
    return toIsoDate(parseIiiCompletionDate(raw));
  }
  if (field === "phoneNumber") {
    return normalizePhoneNumber(raw);
  }
  if (field === "driversLicense") {
    return normalizeDriversLicense(raw);
  }
  if (field === "middleInitial") {
    return normalizeMiddleInitial(raw);
  }
  if (UPPERCASE_APPLICANT_TEXT_FIELDS.has(field)) {
    return raw.toUpperCase();
  }
  return raw;
}

function setFormFieldValue(field, value) {
  if (field === "accessType") {
    const selectedValues = String(value || "")
      .split(",")
      .map((item) => item.trim());
    document.querySelectorAll('input[name="accessTypeValues"]').forEach((input) => {
      input.checked = selectedValues.includes(input.value);
    });
    return;
  }

  if (field === "passport" || field === "tourOrientation") {
    document.querySelector(`#${field}`).checked = normalizeYesNo(value) === "Y";
    return;
  }

  if (field === "dateOfIiiCompletion") {
    document.querySelector(`#${field}`).value = toIsoDate(parseIiiCompletionDate(value));
    return;
  }

  if (field === "phoneNumber") {
    document.querySelector("#phoneNumber").value = formatPhoneNumber(value);
    return;
  }

  if (field === "driversLicense") {
    document.querySelector("#driversLicense").value = sanitizeDriversLicenseInput(value);
    return;
  }

  if (field === "middleInitial") {
    document.querySelector("#middleInitial").value = normalizeMiddleInitial(value);
    return;
  }

  const nextValue = UPPERCASE_APPLICANT_TEXT_FIELDS.has(field)
    ? String(value || "").toUpperCase()
    : value || "";
  document.querySelector(`#${field}`).value = nextValue;
}

function saveApplicant(event) {
  event.preventDefault();
  if (currentFormMode === "view") {
    showMessage(formMessage, "Applicant record is open in read-only view mode.", true);
    return;
  }

  if (!currentUser || (currentView === "limited")) {
    showMessage(formMessage, "Sign in with Records or Full Admin access before saving.", true);
    return;
  }

  const existingRecordId = document.querySelector("#recordId").value;
  if (currentView === "records" && !existingRecordId) {
    showMessage(formMessage, "Select an applicant from Records View before saving.", true);
    return;
  }

  const id = existingRecordId || crypto.randomUUID();
  const nextRecord = formFields.reduce(
    (record, field) => {
      record[field] = getFormFieldValue(field);
      return record;
    },
    { id, updatedAt: new Date().toISOString() },
  );
  nextRecord.clearanceType = normalizeClearanceType(nextRecord.clearanceType);
  nextRecord.tourOrientation = normalizeYesNo(nextRecord.tourOrientation);
  nextRecord.accessType = normalizeAccessType(nextRecord.accessType);
  nextRecord.passport = normalizeYesNo(nextRecord.passport);
  nextRecord.outcome = normalizeOutcome(nextRecord.outcome);
  nextRecord.iiiStatus = normalizeIiiStatus(nextRecord.iiiStatus);
  nextRecord.ncicCertification = normalizeYesNo(nextRecord.ncicCertification);
  nextRecord.controlNumber = String(nextRecord.controlNumber || "").trim();
  nextRecord.driversLicense = normalizeDriversLicense(nextRecord.driversLicense);
  nextRecord.department = normalizeDepartment(nextRecord.department);
  nextRecord.positionRole = normalizeApplicantText(nextRecord.positionRole);
  nextRecord.phoneNumber = normalizePhoneNumber(nextRecord.phoneNumber);
  const nameParts = resolveApplicantNameParts(nextRecord);
  nextRecord.lastName = nameParts.lastName;
  nextRecord.firstName = nameParts.firstName;
  nextRecord.middleInitial = nameParts.middleInitial;
  nextRecord.suffix = nameParts.suffix;
  nextRecord.name = nameParts.name;
  if (!existingRecordId) {
    const missingCreateFields = getMissingCreateRequiredFields(nextRecord);
    if (missingCreateFields.length) {
      showMessage(
        formMessage,
        `New applicants require ${missingCreateFields.join(", ")}.`,
        true,
      );
      return;
    }
  }
  if (!isValidDriversLicense(nextRecord.driversLicense)) {
    showMessage(formMessage, DRIVERS_LICENSE_INVALID_MESSAGE, true);
    return;
  }
  if (!isValidPhoneNumber(nextRecord.phoneNumber)) {
    showMessage(formMessage, PHONE_INVALID_MESSAGE, true);
    return;
  }
  const duplicateDriversLicense = shouldBlockDuplicateDriversLicense(
    nextRecord.driversLicense,
    existingRecordId,
  );
  if (duplicateDriversLicense.block) {
    showDuplicateDriversLicenseWarning(duplicateDriversLicense.duplicates);
    return;
  }
  if (nextRecord.controlNumber) {
    const duplicate = records.some(
      (record) =>
        record.id !== id &&
        String(record.controlNumber || "").trim().toLowerCase() === nextRecord.controlNumber.toLowerCase(),
    );
    if (duplicate) {
      showMessage(formMessage, `Control ID "${nextRecord.controlNumber}" is already assigned to another applicant. Control IDs must be unique.`, true);
      return;
    }
  }
  nextRecord.lastChangedBy = currentUser.name;
  nextRecord.documents = currentDocuments;
  nextRecord.queriedEveryFiveYears = computeInquiryDueDate(nextRecord.dateOfIiiCompletion);

  const existingIndex = records.findIndex((record) => record.id === id);
  const previousRecord = existingIndex >= 0 ? records[existingIndex] : null;
  nextRecord.archived = Boolean(previousRecord?.archived);
  nextRecord.archivedAt = previousRecord?.archived ? String(previousRecord.archivedAt || "") : "";
  nextRecord.archivedBy = previousRecord?.archived ? String(previousRecord.archivedBy || "") : "";
  if (existingIndex >= 0) {
    records[existingIndex] = nextRecord;
    logRecordChange("Updated", nextRecord, getChangedFields(previousRecord, nextRecord));
  } else {
    records.unshift(nextRecord);
    logRecordChange("Created", nextRecord, ["Record created"]);
  }

  saveRecords();
  resetApplicantForm();
  renderAll();
  showMessage(formMessage, "Applicant record saved.");
}

function resetApplicantForm() {
  currentFormMode = "edit";
  drawerOpen = false;
  applicantForm.reset();
  currentDocuments = [];
  documentUpload.value = "";
  renderDocumentList();
  document.querySelector("#recordId").value = "";
  acknowledgedDuplicateDriversLicense = "";
  hideDuplicateDriversLicensePanel();
  syncInquiryDueField();
  syncApplicantActivityStatus();
  updateFormMode();
  updateChangeLogVisibility();
  updateEditorVisibility();
  updateArchiveVisibility();
  showMessage(formMessage, "");
}

function openNewApplicant() {
  if (!canAccessView("admin")) return;
  setView("admin");
  resetApplicantForm();
  drawerOpen = true;
  openApplicantDrawer(resetForm);
  updateEditorVisibility();
  updateFormMode();
  showMessage(formMessage, "Enter a new applicant record.");
  document.querySelector("#lastName")?.focus();
}

function closeApplicantDrawer(options = {}) {
  const restoreFocus = options.restoreFocus !== false;
  drawerOpen = false;
  resetApplicantForm();
  updateEditorVisibility();
  if (restoreFocus && drawerReturnFocus && typeof drawerReturnFocus.focus === "function") {
    drawerReturnFocus.focus();
  }
  drawerReturnFocus = null;
}

function openApplicantDrawer(invoker) {
  drawerReturnFocus = invoker || document.activeElement;
  drawerOpen = true;
  editorPanel.classList.remove("hidden");
  drawerBackdrop.classList.remove("hidden");
  drawerBackdrop.hidden = false;
  document.body.classList.add("drawer-open");
}

function getDrawerFocusable() {
  return [...editorPanel.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])")]
    .filter((element) => {
      if (element.disabled || element.hidden || element.id === "recordId") return false;
      const hiddenAncestor = element.closest(".hidden");
      return !hiddenAncestor || hiddenAncestor === editorPanel;
    });
}

function handleDrawerKeydown(event) {
  if (editorPanel.classList.contains("hidden")) return;

  if (event.key === "Escape") {
    event.preventDefault();
    closeApplicantDrawer();
    return;
  }

  if (event.key !== "Tab") return;
  const focusable = getDrawerFocusable();
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function isFullAdmin() {
  return Boolean(currentUser && currentUser.role === "admin" && canAccessView("admin"));
}

function isAdminStaffUser() {
  return Boolean(currentUser && currentUser.userType === "adminStaff");
}

function isAdminGlobalUser() {
  return Boolean(currentUser && currentUser.userType === "adminGlobal");
}

function syncAdminGlobalOnlySections() {
  document.querySelectorAll(".admin-global-only").forEach((section) => {
    section.classList.toggle("hidden", !isAdminGlobalUser());
  });
}

function canAccessAdminConsole() {
  return isFullAdmin() && !isAdminStaffUser();
}

function canReviewArchived() {
  return isFullAdmin();
}

function canRestoreArchived() {
  return isFullAdmin() && !isAdminStaffUser();
}

function isArchivedRecord(record) {
  return Boolean(record && record.archived);
}

function getActiveRecords(recordSet = records) {
  return recordSet.filter((record) => !isArchivedRecord(record));
}

function getArchivedApplicantRecords(recordSet = records) {
  return recordSet.filter(isArchivedRecord);
}

function archiveApplicant() {
  if (!isFullAdmin()) {
    showMessage(formMessage, "Only Full Admin can archive applicant records.", true);
    return;
  }
  const id = document.querySelector("#recordId").value;
  if (!id || !confirm("Archive this applicant record? It will leave the default lists. Full Admin can review and restore it.")) {
    return;
  }
  const index = records.findIndex((record) => record.id === id);
  if (index < 0) return;
  const now = new Date().toISOString();
  const archivedApplicant = {
    ...records[index],
    archived: true,
    archivedAt: now,
    archivedBy: currentUser.name,
    lastChangedBy: currentUser.name,
    updatedAt: now,
  };
  records[index] = archivedApplicant;
  logRecordChange("Archived", archivedApplicant, ["Record archived"]);
  saveRecords();
  resetApplicantForm();
  renderAll();
  showMessage(formMessage, "Applicant record archived.");
}

function restoreApplicant(recordId) {
  if (!canRestoreArchived()) {
    showMessage(formMessage, "Only Admin-Full and Admin-Global can restore archived applicant records.", true);
    return;
  }
  const id = recordId || document.querySelector("#recordId").value;
  if (!id || !confirm("Restore this applicant record to the active lists?")) return;
  const index = records.findIndex((record) => record.id === id);
  if (index < 0) return;
  const now = new Date().toISOString();
  const restoredApplicant = {
    ...records[index],
    archived: false,
    archivedAt: "",
    archivedBy: "",
    lastChangedBy: currentUser.name,
    updatedAt: now,
  };
  records[index] = restoredApplicant;
  logRecordChange("Restored", restoredApplicant, ["Record restored"]);
  saveRecords();
  resetApplicantForm();
  renderAll();
  showMessage(formMessage, "Applicant record restored.");
}

function handleDocumentUpload() {
  const files = [...documentUpload.files];
  if (!files.length) return;

  Promise.all(files.map(readDocumentFile))
    .then((documents) => {
      currentDocuments = [...currentDocuments, ...documents];
      documentUpload.value = "";
      renderDocumentList();
      showMessage(formMessage, "Document added. Save applicant to keep changes.");
    })
    .catch(() => {
      showMessage(formMessage, "Unable to read one or more documents.", true);
    });
}

function readDocumentFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser?.name || "",
        dataUrl: reader.result,
      });
    });
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

function renderDocumentList() {
  if (!currentDocuments.length) {
    documentList.innerHTML = `<p class="empty-inline">No documents uploaded.</p>`;
    return;
  }

  documentList.innerHTML = currentDocuments
    .map((documentItem) => {
      return `<div class="document-item">
        <a href="${escapeHtml(documentItem.dataUrl)}" download="${escapeHtml(documentItem.name)}">${escapeHtml(documentItem.name)}</a>
        <span>${formatFileSize(documentItem.size)}</span>
        <button class="admin-action danger" type="button" data-remove-document="${documentItem.id}">Remove</button>
      </div>`;
    })
    .join("");

  documentList.querySelectorAll("[data-remove-document]").forEach((button) => {
    button.addEventListener("click", () => {
      currentDocuments = currentDocuments.filter((documentItem) => documentItem.id !== button.dataset.removeDocument);
      renderDocumentList();
      showMessage(formMessage, "Document removed. Save applicant to keep changes.");
    });
  });
}

function formatFileSize(size) {
  const bytes = Number(size) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function loadApplicantForm(id, mode) {
  const record = records.find((item) => item.id === id);
  if (!record) return;

  currentFormMode = mode;
  document.querySelector("#recordId").value = record.id;
  acknowledgedDuplicateDriversLicense = "";
  hideDuplicateDriversLicensePanel();
  formFields.forEach((field) => {
    setFormFieldValue(field, record[field]);
  });
  currentDocuments = Array.isArray(record.documents) ? [...record.documents] : [];
  documentUpload.value = "";
  renderDocumentList();
  syncInquiryDueField();
  syncApplicantActivityStatus();
  drawerOpen = true;
  updateFormMode();
  updateChangeLogVisibility();
  updateEditorVisibility();
  updateArchiveVisibility();
  showMessage(formMessage, mode === "view" ? "Viewing applicant record in read-only mode." : "Editing applicant record.");
  const firstField = document.querySelector("#lastName");
  firstField?.focus();
}

function editApplicant(id, invoker) {
  loadApplicantForm(id, "edit");
  openApplicantDrawer(invoker);
}

function viewApplicant(id, invoker) {
  loadApplicantForm(id, "view");
  openApplicantDrawer(invoker);
}

function renderAll() {
  renderManagedDropdowns();
  renderOutcomeFilter();
  syncLimitedClearanceFilter();
  renderMetrics();
  renderVendorOptions();
  renderLimitedTable();
  renderRecordsTable();
  if (canAccessView("admin")) {
    renderAdminTable();
    renderArchivedTable();
    updateChangeLogVisibility();
  }
  if (fullScreenView === "admin" && canAccessAdminConsole()) {
    renderOptionListEditors();
    renderManagedUserTable();
  }
}

function fillSelectOptions(select, options, placeholder) {
  if (!select) return;
  const current = select.value;
  const extras = current && !options.includes(current) ? [current] : [];
  select.innerHTML = [
    `<option value="">${escapeHtml(placeholder)}</option>`,
    ...[...options, ...extras].map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`),
  ].join("");
  if (current) select.value = current;
}

function fillFilterSelect(select, options, allLabel) {
  if (!select) return;
  const current = select.value || "all";
  select.innerHTML = [
    `<option value="all">${escapeHtml(allLabel)}</option>`,
    ...options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`),
  ].join("");
  select.value = current === "all" || options.includes(current) ? current : "all";
}

function renderAccessTypeCheckboxes() {
  const fieldset = document.querySelector("#accessType");
  if (!fieldset) return;
  const tourLabel = fieldset.querySelector(".field-tourOrientation");
  const checked = new Set(
    [...fieldset.querySelectorAll('input[name="accessTypeValues"]:checked')].map((input) => input.value),
  );
  [...fieldset.querySelectorAll("label")].forEach((label) => {
    if (!label.classList.contains("field-tourOrientation")) label.remove();
  });
  getOptionList("accessType").forEach((option) => {
    if (isHiddenAccessTypeOption(option)) return;
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "accessTypeValues";
    input.value = option;
    input.checked = checked.has(option);
    label.append(input, document.createTextNode(` ${option}`));
    applyAccessTypeOptionState(input);
    if (tourLabel) {
      fieldset.insertBefore(label, tourLabel);
    } else {
      fieldset.append(label);
    }
  });
}

function renderManagedDropdowns() {
  OPTION_LIST_DEFINITIONS.forEach((definition) => {
    const options = getOptionList(definition.key);
    (definition.selectIds || []).forEach((selectId) => {
      fillSelectOptions(document.querySelector(`#${selectId}`), options, definition.placeholder || "Select");
    });
    if (definition.filterId) {
      fillFilterSelect(document.querySelector(`#${definition.filterId}`), options, definition.filterAllLabel || "All");
    }
    if (definition.checkboxName === "accessTypeValues") {
      renderAccessTypeCheckboxes();
    }
  });
}

function renderDepartmentOptions() {
  const select = document.querySelector("#department");
  fillSelectOptions(select, getOptionList("department"), "Select department");
}

function renderVendorOptions() {
  const vendors = [...new Set(getActiveRecords().map((record) => record.vendor).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  vendorOptions.innerHTML = vendors.map((vendor) => `<option value="${escapeHtml(vendor)}"></option>`).join("");
  if (positionRoleOptions) {
    const roles = uniqueOptions([
      ...getOptionList("positionRole"),
      ...getActiveRecords().map((record) => record.positionRole),
    ]).sort((a, b) => a.localeCompare(b));
    positionRoleOptions.innerHTML = roles.map((role) => `<option value="${escapeHtml(role)}"></option>`).join("");
  }
}

function getRecordActivityStatus(record) {
  return getApplicantActivityStatus(record.securityAwarenessExpiration, record.ncicCertificationExpiration);
}

function syncLimitedClearanceFilter() {
  if (!clearanceFilter) return;
  const wrap = clearanceFilter.closest("label");
  const limited = currentView === "limited";
  if (limited) {
    if (!clearanceFilter.disabled) {
      adminClearanceFilterValue = clearanceFilter.value || "all";
    }
    clearanceFilter.value = LIMITED_VIEW_CLEARANCE_TYPE;
    clearanceFilter.disabled = true;
    wrap?.classList.add("filter-locked");
    return;
  }
  clearanceFilter.disabled = false;
  wrap?.classList.remove("filter-locked");
  const options = [...clearanceFilter.options].map((option) => option.value);
  clearanceFilter.value = options.includes(adminClearanceFilterValue) ? adminClearanceFilterValue : "all";
}

function getFilteredRecords(view = currentView) {
  const query = searchInput.value.trim().toLowerCase();
  const activity = activityFilter ? activityFilter.value : "all";
  const clearance =
    view === "limited" ? LIMITED_VIEW_CLEARANCE_TYPE : adminClearanceFilterValue || clearanceFilter.value;
  const outcome = outcomeFilter.value;

  return getActiveRecords().filter((record) => {
    const haystack = [
      record.name,
      record.lastName,
      record.firstName,
      record.middleInitial,
      record.suffix,
      record.controlNumber,
      record.driversLicense,
      record.vendor,
      record.department,
      record.positionRole,
      record.requestor,
      record.emailAddress,
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!query || haystack.includes(query)) &&
      (activity === "all" || getRecordActivityStatus(record) === activity) &&
      (clearance === "all" || record.clearanceType === clearance) &&
      (outcome === "all" || record.outcome === outcome)
    );
  });
}

function renderOutcomeFilter() {
  fillFilterSelect(outcomeFilter, getOptionList("outcome"), "All fingerprint outcomes");
}

function renderMetrics() {
  const activeRecords = getActiveRecords();
  const queryDue = activeRecords.filter(isQueryDue).length;
  const activityActive = activeRecords.filter((record) => getRecordActivityStatus(record) === "Active").length;
  document.querySelector("#totalCount").textContent = activeRecords.length;
  document.querySelector("#activeCount").textContent = activityActive;
  document.querySelector("#inactiveCount").textContent = activeRecords.length - activityActive;
  document.querySelector("#fullClearanceCount").textContent = activeRecords.filter((record) => {
    return record.clearanceType === "Full Clearance";
  }).length;
  document.querySelector("#siteVisitCount").textContent = activeRecords.filter((record) => {
    return record.clearanceType === "One Time Visit";
  }).length;
  document.querySelector("#queryDueCount").textContent = queryDue;
}

function renderLimitedTable() {
  const visibleRecords = getSortedRecords(getFilteredRecords("limited"));
  if (!visibleRecords.length) {
    limitedTable.innerHTML = `<p class="empty-state">No applicant records match the current filters.</p>`;
    return;
  }

  limitedTable.innerHTML = `<table class="limited-records-table">
    <thead>
      <tr>
        <th class="field-admin">Actions</th>
        ${limitedFields.map(renderHeaderCell).join("")}
      </tr>
    </thead>
    <tbody>${visibleRecords.map((record, index) => renderLimitedRow(record, index % 2)).join("")}</tbody>
  </table>`;

  limitedTable.querySelectorAll("[data-limited-view]").forEach((button) => {
    button.addEventListener("click", () => openLimitedPopup(button.dataset.limitedView, button));
  });
}

function renderRecordsTable() {
  const visibleRecords = getSortedRecords(getFilteredRecords("records"));
  if (!visibleRecords.length) {
    recordsTable.innerHTML = `<p class="empty-state">No applicant records match the current filters.</p>`;
    return;
  }

  recordsTable.innerHTML = `<table class="limited-records-table">
    <thead>
      <tr>
        ${limitedFields.map(renderHeaderCell).join("")}
        <th class="field-admin">Actions</th>
      </tr>
    </thead>
    <tbody>${visibleRecords.map((record, index) => renderRecordsRow(record, index % 2)).join("")}</tbody>
  </table>`;

  recordsTable.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => editApplicant(button.dataset.edit, button));
  });
  recordsTable.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => viewApplicant(button.dataset.view, button));
  });
}

function renderRecordsRow(record, stripeTone) {
  return `<tr${rowClassAttributes(record, stripeTone)}>
    ${limitedFields
      .map((field) => {
        return renderDataCell(field, record[field], record);
      })
      .join("")}
    <td class="field-admin">
      <div class="record-actions">
        <button class="admin-action" type="button" data-view="${record.id}">View</button>
        <button class="admin-action" type="button" data-edit="${record.id}">Edit</button>
      </div>
    </td>
  </tr>`;
}

function renderLimitedRow(record, stripeTone) {
  return `<tr${rowClassAttributes(record, stripeTone)}>
    <td class="field-admin">
      <div class="record-actions">
        <button class="admin-action" type="button" data-limited-view="${record.id}">View</button>
      </div>
    </td>
    ${limitedFields
      .map((field) => {
        const value = record[field];
        return renderDataCell(field, value, record);
      })
      .join("")}
  </tr>`;
}

function limitedPopupDisplayValue(field, record) {
  const value = record[field];
  if (!value) return "—";
  if (isDateField(field)) return formatDate(value) || "—";
  return String(value);
}

function renderLimitedPopupRows(fieldDefs, record) {
  return fieldDefs
    .map((item) => {
      return `<div class="limited-popup-row">
        <dt>${escapeHtml(item.label)}</dt>
        <dd>${escapeHtml(limitedPopupDisplayValue(item.field, record))}</dd>
      </div>`;
    })
    .join("");
}

function fillLimitedPopup(record) {
  if (!limitedPopupFields) return;
  limitedPopupFields.innerHTML = `
    <dl>${renderLimitedPopupRows(LIMITED_POPUP_FIELDS, record)}</dl>
    <h3 class="limited-popup-section">Certifications &amp; Dates</h3>
    <dl>${renderLimitedPopupRows(LIMITED_POPUP_DATE_FIELDS, record)}</dl>
  `;
}

function openLimitedPopup(id, invoker) {
  const record = records.find((item) => item.id === id && !isArchivedRecord(item));
  if (!record || !limitedPopup || !limitedPopupBackdrop) return;
  limitedPopupReturnFocus = invoker || document.activeElement;
  fillLimitedPopup(record);
  limitedPopup.classList.remove("hidden");
  limitedPopup.hidden = false;
  limitedPopupBackdrop.classList.remove("hidden");
  limitedPopupBackdrop.hidden = false;
  document.body.classList.add("limited-popup-open");
  closeLimitedPopupButton?.focus();
}

function closeLimitedPopup(options = {}) {
  const restoreFocus = options.restoreFocus !== false;
  if (!limitedPopup || !limitedPopupBackdrop) return;
  limitedPopup.classList.add("hidden");
  limitedPopup.hidden = true;
  limitedPopupBackdrop.classList.add("hidden");
  limitedPopupBackdrop.hidden = true;
  document.body.classList.remove("limited-popup-open");
  if (limitedPopupFields) limitedPopupFields.innerHTML = "";
  if (restoreFocus && limitedPopupReturnFocus && typeof limitedPopupReturnFocus.focus === "function") {
    limitedPopupReturnFocus.focus();
  }
  limitedPopupReturnFocus = null;
}

function handleLimitedPopupKeydown(event) {
  if (!limitedPopup || limitedPopup.classList.contains("hidden")) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeLimitedPopup();
  }
}

function renderAdminTable() {
  const visibleRecords = getAdminSortedRecords(getFilteredRecords("admin"));
  if (!visibleRecords.length) {
    adminTable.innerHTML = `<p class="empty-state">No applicant records match the current filters.</p>`;
    return;
  }

  const bodyRows = visibleRecords.map((record, index) => renderAdminRow(record, index % 2)).join("");

  adminTable.innerHTML = `<table class="admin-records-table">
    <thead>
      <tr>
        <th class="field-admin" scope="col">Actions</th>
        ${adminTableFields.map(renderAdminSortableHeaderCell).join("")}
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>`;

  adminTable.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => editApplicant(button.dataset.edit, button));
  });
  adminTable.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => viewApplicant(button.dataset.view, button));
  });
}

function renderAdminRow(record, stripeTone) {
  return `<tr${rowClassAttributes(record, stripeTone)}>
    <td class="field-admin">
      <div class="record-actions">
        <button class="admin-action" type="button" data-view="${record.id}">View</button>
        <button class="admin-action" type="button" data-edit="${record.id}">Edit</button>
      </div>
    </td>
    ${adminTableFields
      .map((field) => {
        return renderDataCell(field, record[field], record);
      })
      .join("")}
  </tr>`;
}

function getFilteredArchivedRecords() {
  const query = archivedSearchInput ? archivedSearchInput.value.trim().toLowerCase() : "";
  return getArchivedApplicantRecords().filter((record) => {
    if (!query) return true;
    const haystack = [
      record.name,
      record.lastName,
      record.firstName,
      record.middleInitial,
      record.suffix,
      record.controlNumber,
      record.driversLicense,
      record.vendor,
      record.department,
      record.positionRole,
      record.requestor,
      record.emailAddress,
      record.clearanceType,
      record.archivedBy,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

function renderArchivedTable() {
  if (!archivedTable) return;
  const allArchived = getArchivedApplicantRecords();
  const archivedRecords = getSortedRecords(getFilteredArchivedRecords());
  if (archivedCountPill) {
    const query = archivedSearchInput ? archivedSearchInput.value.trim() : "";
    archivedCountPill.textContent = query
      ? `${archivedRecords.length} of ${allArchived.length} archived`
      : `${allArchived.length} archived`;
  }
  if (!canReviewArchived()) {
    archivedTable.innerHTML = `<p class="empty-state">Archived records are available to Full Admin only.</p>`;
    return;
  }
  if (!allArchived.length) {
    archivedTable.innerHTML = `<p class="empty-state">No archived applicant records.</p>`;
    return;
  }
  if (!archivedRecords.length) {
    archivedTable.innerHTML = `<p class="empty-state">No archived records match the current search.</p>`;
    return;
  }

  archivedTable.innerHTML = `<table class="admin-records-table archived-records-table">
    <thead>
      <tr>
        <th class="field-admin">Actions</th>
        <th>Name</th>
        <th>Driver Lic Num</th>
        <th>Vendor</th>
        <th>Department</th>
        <th>Position/Role</th>
        <th>Requestor</th>
        <th>Archived By</th>
        <th>Archived At</th>
      </tr>
    </thead>
    <tbody>
      ${archivedRecords
        .map((record) => {
          return `<tr>
            <td class="field-admin">
              <div class="record-actions">
                <button class="admin-action" type="button" data-view-archived="${record.id}">View</button>
                ${
                  canRestoreArchived()
                    ? `<button class="admin-action" type="button" data-restore="${record.id}">Restore</button>`
                    : ""
                }
              </div>
            </td>
            <td class="field-name">${escapeHtml(record.name)}</td>
            <td>${escapeHtml(record.driversLicense)}</td>
            <td class="field-vendor">${escapeHtml(record.vendor)}</td>
            <td>${escapeHtml(record.department)}</td>
            <td>${escapeHtml(record.positionRole)}</td>
            <td>${escapeHtml(record.requestor)}</td>
            <td>${escapeHtml(record.archivedBy)}</td>
            <td>${formatDateTime(record.archivedAt)}</td>
          </tr>`;
        })
        .join("")}
    </tbody>
  </table>`;

  archivedTable.querySelectorAll("[data-view-archived]").forEach((button) => {
    button.addEventListener("click", () => viewApplicant(button.dataset.viewArchived, button));
  });
  archivedTable.querySelectorAll("[data-restore]").forEach((button) => {
    button.addEventListener("click", () => restoreApplicant(button.dataset.restore));
  });
}

function renderOptionListEditors() {
  if (!optionListEditors) return;
  optionListEditors.innerHTML = OPTION_LIST_DEFINITIONS.map((definition) => {
    const options = getOptionList(definition.key);
    const items = options.length
      ? options
          .map((option) => {
            const isEditing =
              optionListEdit && optionListEdit.key === definition.key && optionListEdit.value === option;
            if (isEditing) {
              return `<li class="option-list-editing">
                <form class="option-list-edit" data-option-key="${escapeHtml(definition.key)}" data-original-option="${escapeHtml(option)}">
                  <input type="text" maxlength="80" value="${escapeHtml(option)}" required />
                  <div class="option-list-actions">
                    <button class="primary-action" type="submit">Save</button>
                    <button class="secondary-action" type="button" data-cancel-edit>Cancel</button>
                  </div>
                </form>
              </li>`;
            }
            return `<li>
              <span>${escapeHtml(option)}</span>
              <div class="option-list-actions">
                <button class="secondary-action" type="button" data-option-key="${escapeHtml(definition.key)}" data-edit-option="${escapeHtml(option)}">Edit</button>
                <button class="secondary-action" type="button" data-option-key="${escapeHtml(definition.key)}" data-remove-option="${escapeHtml(option)}">Remove</button>
              </div>
            </li>`;
          })
          .join("")
      : `<li class="empty-option">No values yet.</li>`;
    return `<article class="option-list-card">
      <h3>${escapeHtml(definition.label)}</h3>
      <ul>${items}</ul>
      <form class="option-list-add" data-option-key="${escapeHtml(definition.key)}">
        <input type="text" maxlength="80" placeholder="Add ${escapeHtml(definition.label)}" required />
        <button class="primary-action" type="submit">Add</button>
      </form>
    </article>`;
  }).join("");
  const editInput = optionListEditors.querySelector(".option-list-edit input");
  if (editInput) {
    editInput.focus();
    editInput.select();
  }
}

function handleOptionListSubmit(event) {
  const editForm = event.target.closest("form.option-list-edit");
  if (editForm) {
    event.preventDefault();
    const input = editForm.querySelector("input");
    renameOptionListValue(editForm.dataset.optionKey, editForm.dataset.originalOption, input ? input.value : "");
    return;
  }
  const form = event.target.closest("form.option-list-add[data-option-key]");
  if (!form) return;
  event.preventDefault();
  const input = form.querySelector("input");
  addOptionListValue(form.dataset.optionKey, input ? input.value : "");
  if (input) input.value = "";
}

function handleOptionListClick(event) {
  const cancelButton = event.target.closest("[data-cancel-edit]");
  if (cancelButton) {
    optionListEdit = null;
    renderOptionListEditors();
    return;
  }
  const editButton = event.target.closest("[data-edit-option]");
  if (editButton) {
    optionListEdit = { key: editButton.dataset.optionKey, value: editButton.dataset.editOption };
    renderOptionListEditors();
    return;
  }
  const removeButton = event.target.closest("[data-remove-option]");
  if (!removeButton) return;
  optionListEdit = null;
  removeOptionListValue(removeButton.dataset.optionKey, removeButton.dataset.removeOption);
}

function addOptionListValue(key, rawValue) {
  if (!OPTION_LIST_DEFINITIONS.some((definition) => definition.key === key)) return;
  const value = String(rawValue || "").trim();
  if (!value) {
    showMessage(optionListMessage, "Enter a dropdown value to add.", true);
    return;
  }
  const current = getOptionList(key);
  if (current.some((option) => option.toUpperCase() === value.toUpperCase())) {
    showMessage(optionListMessage, `"${value}" is already in ${labelForOptionList(key)}.`, true);
    return;
  }
  optionLists[key] = uniqueOptions([...current, value]);
  saveOptionLists();
  showMessage(optionListMessage, `Added "${value}" to ${labelForOptionList(key)}.`);
  renderAll();
}

function renameOptionListValue(key, oldValue, rawValue) {
  if (!OPTION_LIST_DEFINITIONS.some((definition) => definition.key === key)) return;
  const previous = String(oldValue || "").trim();
  const next = String(rawValue || "").trim();
  if (!previous) return;
  if (!next) {
    showMessage(optionListMessage, "Enter a dropdown value to save.", true);
    return;
  }
  const current = getOptionList(key);
  if (!current.includes(previous)) {
    optionListEdit = null;
    renderOptionListEditors();
    return;
  }
  if (next === previous) {
    optionListEdit = null;
    renderOptionListEditors();
    return;
  }
  if (current.some((option) => option !== previous && option.toUpperCase() === next.toUpperCase())) {
    showMessage(optionListMessage, `"${next}" is already in ${labelForOptionList(key)}.`, true);
    return;
  }
  optionLists[key] = current.map((option) => (option === previous ? next : option));
  saveOptionLists();
  const updatedCount = applyOptionRenameToRecords(key, previous, next);
  optionListEdit = null;
  const recordNote = updatedCount
    ? ` Updated ${updatedCount} applicant record${updatedCount === 1 ? "" : "s"}.`
    : "";
  showMessage(optionListMessage, `Renamed "${previous}" to "${next}" in ${labelForOptionList(key)}.${recordNote}`);
  renderAll();
}

function applyOptionRenameToRecords(key, oldValue, newValue) {
  let updatedCount = 0;
  records = records.map((record) => {
    if (key === "accessType") {
      const values = String(record.accessType || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (!values.includes(oldValue)) return record;
      updatedCount += 1;
      return {
        ...record,
        accessType: values.map((item) => (item === oldValue ? newValue : item)).join(", "),
      };
    }
    if (record[key] !== oldValue) return record;
    updatedCount += 1;
    return { ...record, [key]: newValue };
  });
  if (updatedCount) {
    saveRecords();
    logRecordChange(
      "Updated dropdown value",
      { id: "option-list", name: labelForOptionList(key) },
      [`${oldValue} → ${newValue}`, `${updatedCount} record${updatedCount === 1 ? "" : "s"} updated`],
    );
  }
  return updatedCount;
}

function removeOptionListValue(key, rawValue) {
  if (!OPTION_LIST_DEFINITIONS.some((definition) => definition.key === key)) return;
  const value = String(rawValue || "").trim();
  const current = getOptionList(key);
  if (current.length <= 1 && key !== "positionRole") {
    showMessage(optionListMessage, `Keep at least one ${labelForOptionList(key)} value.`, true);
    return;
  }
  optionLists[key] = current.filter((option) => option !== value);
  saveOptionLists();
  showMessage(optionListMessage, `Removed "${value}" from ${labelForOptionList(key)}.`);
  renderAll();
}

function labelForOptionList(key) {
  return OPTION_LIST_DEFINITIONS.find((definition) => definition.key === key)?.label || key;
}

function reservedAccessCodes() {
  const codes = new Set([OWNER_ADMIN_CODE, ...FORBIDDEN_CODES]);
  if (accessCodes) {
    Object.values(accessCodes).forEach((code) => {
      if (code) codes.add(code);
    });
  }
  managedUsers.forEach((user) => {
    if (user.accessCode) codes.add(user.accessCode);
  });
  return codes;
}

function addManagedUser(event) {
  event.preventDefault();
  if (!canAccessAdminConsole()) {
    showMessage(managedUserMessage, "Only Admin-Full and Admin-Global can manage users.", true);
    return;
  }
  const name = document.querySelector("#newManagedUserName").value.trim();
  const userType = normalizeManagedUserType(document.querySelector("#newManagedUserType").value);
  const accessCode = document.querySelector("#newManagedUserCode").value;
  if (!name) {
    showMessage(managedUserMessage, "User Name is required.", true);
    return;
  }
  if (!USER_TYPE_LABELS[userType] || document.querySelector("#newManagedUserType").value !== userType) {
    showMessage(managedUserMessage, "Choose Admin-Full, Admin-Global, Admin-Staff, or Read Only.", true);
    return;
  }
  if (!accessCode || accessCode.length < 4) {
    showMessage(managedUserMessage, "Access Code must be at least 4 characters.", true);
    return;
  }
  if (FORBIDDEN_CODES.has(accessCode)) {
    showMessage(managedUserMessage, "Choose an access code that is not a former default or trivial sequence.", true);
    return;
  }
  if (managedUsers.some((user) => user.name.toLowerCase() === name.toLowerCase())) {
    showMessage(managedUserMessage, "A user with that name already exists.", true);
    return;
  }
  if (reservedAccessCodes().has(accessCode)) {
    showMessage(managedUserMessage, "That access code is already in use.", true);
    return;
  }
  managedUsers = [
    ...managedUsers,
    {
      id: crypto.randomUUID(),
      name,
      userType,
      accessCode,
    },
  ];
  saveManagedUsers();
  addManagedUserForm.reset();
  document.querySelector("#newManagedUserType").value = "admin";
  showMessage(managedUserMessage, `Added ${USER_TYPE_LABELS[userType]} user ${name}.`);
  renderManagedUserTable();
}

function handleManagedUserTableClick(event) {
  const removeButton = event.target.closest("[data-remove-user]");
  if (removeButton) {
    removeManagedUser(removeButton.dataset.removeUser);
    return;
  }
  const changeButton = event.target.closest("[data-change-user-code]");
  if (changeButton) {
    changeManagedUserCode(changeButton.dataset.changeUserCode);
  }
}

function removeManagedUser(id) {
  if (!canAccessAdminConsole()) return;
  const user = managedUsers.find((entry) => entry.id === id);
  if (!user) return;
  if (!confirm(`Remove ${user.name} (${USER_TYPE_LABELS[user.userType]})?`)) return;
  managedUsers = managedUsers.filter((entry) => entry.id !== id);
  saveManagedUsers();
  showMessage(managedUserMessage, `Removed ${user.name}.`);
  renderManagedUserTable();
}

function changeManagedUserCode(id) {
  if (!canAccessAdminConsole()) return;
  const user = managedUsers.find((entry) => entry.id === id);
  if (!user) return;
  const nextCode = window.prompt(`New access code for ${user.name} (at least 4 characters):`, "");
  if (nextCode === null) return;
  const accessCode = String(nextCode);
  if (accessCode.length < 4) {
    showMessage(managedUserMessage, "Access Code must be at least 4 characters.", true);
    return;
  }
  if (FORBIDDEN_CODES.has(accessCode)) {
    showMessage(managedUserMessage, "Choose an access code that is not a former default or trivial sequence.", true);
    return;
  }
  const reserved = reservedAccessCodes();
  reserved.delete(user.accessCode);
  if (reserved.has(accessCode)) {
    showMessage(managedUserMessage, "That access code is already in use.", true);
    return;
  }
  user.accessCode = accessCode;
  saveManagedUsers();
  showMessage(managedUserMessage, `Updated access code for ${user.name}.`);
  renderManagedUserTable();
}

function renderManagedUserTable() {
  if (!managedUserTable) return;
  if (!managedUsers.length) {
    managedUserTable.innerHTML = `<p class="empty-state">No named users yet. Shared view access codes still work. Add an Admin-Full, Admin-Global, Admin-Staff, or Read Only user above.</p>`;
    return;
  }
  managedUserTable.innerHTML = `<table class="admin-records-table managed-user-table">
    <thead>
      <tr>
        <th>User Name</th>
        <th>User Type</th>
        <th>Signs In As</th>
        <th class="field-admin">Actions</th>
      </tr>
    </thead>
    <tbody>
      ${managedUsers
        .map((user) => {
          const signsInAs = ACCESS_LABELS[managedUserSignInLevel(user)];
          return `<tr>
            <td>${escapeHtml(user.name)}</td>
            <td>${escapeHtml(USER_TYPE_LABELS[user.userType])}</td>
            <td>${escapeHtml(signsInAs)}</td>
            <td class="field-admin">
              <div class="record-actions">
                <button class="admin-action" type="button" data-change-user-code="${escapeHtml(user.id)}">Change Code</button>
                <button class="admin-action" type="button" data-remove-user="${escapeHtml(user.id)}">Remove</button>
              </div>
            </td>
          </tr>`;
        })
        .join("")}
    </tbody>
  </table>`;
}

function renderChangeLog() {
  const selectedRecordId = document.querySelector("#recordId").value;
  const selectedLog = changeLog.filter((entry) => entry.recordId === selectedRecordId);
  if (!selectedLog.length) {
    changeLogTable.innerHTML = `<p class="empty-state">No changes have been logged for this applicant yet.</p>`;
    return;
  }

  changeLogTable.innerHTML = `<table class="change-log-table">
    <thead>
      <tr>
        <th>Changed</th>
        <th>User</th>
        <th>Access</th>
        <th>Action</th>
        <th>Applicant</th>
        <th>Changes</th>
      </tr>
    </thead>
    <tbody>
      ${selectedLog
        .map((entry) => {
          return `<tr>
            <td>${formatDateTime(entry.changedAt)}</td>
            <td>${escapeHtml(entry.changedBy)}</td>
            <td>${escapeHtml(entry.roleLabel)}</td>
            <td>${escapeHtml(entry.action)}</td>
            <td>${escapeHtml(entry.applicantName)}</td>
            <td>${escapeHtml(entry.changes.join("; "))}</td>
          </tr>`;
        })
        .join("")}
    </tbody>
  </table>`;
}

function updateChangeLogVisibility() {
  const hasSelectedRecord = Boolean(document.querySelector("#recordId").value);
  const shouldShow = currentView === "admin" && canAccessView("admin") && hasSelectedRecord && currentFormMode === "edit";
  changeLogPanel.classList.toggle("hidden", !shouldShow);
  if (shouldShow) renderChangeLog();
}

function logRecordChange(action, record, changes) {
  const user = currentUser || { name: "Unknown", role: "limited" };
  changeLog.unshift({
    id: crypto.randomUUID(),
    recordId: record.id,
    applicantName: record.name || "Unnamed applicant",
    vendor: record.vendor || "",
    action,
    changes,
    changedBy: user.name,
    role: user.role,
    roleLabel: ACCESS_LABELS[user.role] || user.role,
    changedAt: new Date().toISOString(),
  });
  changeLog = changeLog.slice(0, 500);
  saveChangeLog();
}

function getChangedFields(previousRecord, nextRecord) {
  if (!previousRecord) return ["Record created"];
  const changedFields = fields
    .filter((field) => field !== "lastChangedBy")
    .filter((field) => serializeFieldValue(previousRecord[field]) !== serializeFieldValue(nextRecord[field]))
    .map((field) => labels[field] || field);

  return changedFields.length ? changedFields : ["No field value changes"];
}

function serializeFieldValue(value) {
  return Array.isArray(value)
    ? JSON.stringify(value.map((item) => ({ name: item.name, size: item.size, type: item.type })))
    : String(value || "");
}

function renderHeaderCell(field) {
  return `<th class="field-${field}">${escapeHtml(tableLabels[field] || labels[field])}</th>`;
}

function renderAdminSortableHeaderCell(field) {
  const label = tableLabels[field] || labels[field];
  const isActive = adminListSort.field === field;
  const ariaSort = !isActive ? "none" : adminListSort.direction === "desc" ? "descending" : "ascending";
  const nextDirection = isActive && adminListSort.direction === "asc" ? "descending" : "ascending";
  const indicator = !isActive ? "↕" : adminListSort.direction === "desc" ? "▼" : "▲";
  return `<th class="field-${field} sortable-heading" scope="col" aria-sort="${ariaSort}">
    <button type="button" data-sort-field="${field}" aria-label="Sort by ${escapeHtml(label)}, ${ariaSort === "none" ? "unsorted" : ariaSort}. Activate to sort ${nextDirection}.">
      <span>${escapeHtml(label)}</span>
      <span class="sort-indicator" aria-hidden="true">${indicator}</span>
    </button>
  </th>`;
}

function handleAdminTableSortClick(event) {
  const button = event.target.closest("[data-sort-field]");
  if (!button || !adminTable.contains(button)) return;
  const field = button.dataset.sortField;
  if (!adminTableFields.includes(field)) return;
  if (adminListSort.field === field) {
    adminListSort.direction = adminListSort.direction === "asc" ? "desc" : "asc";
  } else {
    adminListSort.field = field;
    adminListSort.direction = "asc";
  }
  renderAdminTable();
}

function getAdminSortedRecords(recordSet) {
  if (!adminListSort.field) return getSortedRecords(recordSet);
  const direction = adminListSort.direction === "desc" ? -1 : 1;
  return [...recordSet].sort((a, b) => {
    const compared = compareRecordsByField(a, b, adminListSort.field);
    if (compared !== 0) return compared * direction;
    return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
  });
}

function compareRecordsByField(a, b, field) {
  if (field === "accessType") {
    return getAccessTypeSortValue(a).localeCompare(getAccessTypeSortValue(b), undefined, {
      sensitivity: "base",
      numeric: true,
    });
  }
  if (dateSortFields.has(field)) {
    return getDateSortValue(a[field]) - getDateSortValue(b[field]);
  }
  return String(a[field] ?? "").localeCompare(String(b[field] ?? ""), undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

function getAccessTypeSortValue(record) {
  const value = record.accessType;
  if (Array.isArray(value)) return value.join(" ");
  return String(value || "");
}

function getSortedRecords(recordSet) {
  return [...recordSet].sort((a, b) => {
    return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
  });
}

function getDateSortValue(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const timestamp = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function renderDataCell(field, value, record) {
  if (field === "activityStatus") {
    const status = record ? getRecordActivityStatus(record) : "InActive";
    const tone = status === "Active" ? "active" : "inactive";
    return `<td class="field-activityStatus"><span class="badge ${tone}">${escapeHtml(status)}</span></td>`;
  }

  if (field === "documents") {
    return `<td class="field-documents">${renderDocumentSummary(value)}</td>`;
  }

  const content = field === "accessType"
    ? renderBadgeList(value)
    : isBadgeField(field) ? renderBadge(value) : formatFieldValue(field, value);
  const expired = field === "securityAwarenessExpiration" && record && isSecurityCertExpired(record);
  const extraClass = expired ? " security-cert-expired" : "";
  const extraAttrs = expired
    ? ` title="Out of compliance: Security and Awareness certification has expired" aria-label="${escapeHtml(`${String(value || "").trim() || "Security and Awareness Cert"}, expired and out of compliance`)}"`
    : "";
  return `<td class="field-${field}${extraClass}"${extraAttrs}>${content}</td>`;
}

function isSecurityCertExpired(record) {
  if (!record.securityAwarenessExpiration) return false;
  const expiration = new Date(`${record.securityAwarenessExpiration}T00:00:00`);
  if (Number.isNaN(expiration.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return expiration < today;
}

function isCertDateCurrent(certValue) {
  const iso = normalizeDateValue(certValue);
  if (!iso) return false;
  const expiration = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(expiration.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return expiration >= today;
}

function getApplicantActivityStatus(securityAwarenessCert, ncicCertExpiration) {
  return isCertDateCurrent(securityAwarenessCert) && isCertDateCurrent(ncicCertExpiration)
    ? "Active"
    : "InActive";
}

function syncApplicantActivityStatus() {
  const statusEl = document.querySelector("#applicantActivityStatus");
  if (!statusEl) return;
  const status = getApplicantActivityStatus(
    document.querySelector("#securityAwarenessExpiration")?.value,
    document.querySelector("#ncicCertificationExpiration")?.value,
  );
  statusEl.textContent = status;
  statusEl.className = `applicant-activity-status badge ${status === "Active" ? "active" : "inactive"}`;
}

function rowClassAttributes(record, stripeTone) {
  const classes = [`vendor-group-${stripeTone}`];
  const expired = isSecurityCertExpired(record);
  if (expired) classes.push("compliance-expired-row");
  const title = expired
    ? ` title="Out of compliance: Security and Awareness certification has expired"`
    : "";
  return ` class="${classes.join(" ")}"${title}`;
}

function renderDocumentSummary(value) {
  const documents = Array.isArray(value) ? value : [];
  if (!documents.length) return "";
  return `<span class="status-pill document-count">${documents.length} file${documents.length === 1 ? "" : "s"}</span>`;
}

function isBadgeField(field) {
  return [
    "iiiStatus",
    "clearanceType",
    "outcome",
    "accessType",
    "cjisSecurityAwarenessRole",
    "ncicCertification",
    "passport",
    "tourOrientation",
    "department",
  ].includes(field);
}

function renderBadge(value) {
  if (!value) return "";
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `<span class="badge ${normalized}">${escapeHtml(value)}</span>`;
}

function renderBadgeList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map(renderBadge)
    .join(" ");
}

function updateArchiveVisibility() {
  const id = document.querySelector("#recordId").value;
  const selected = records.find((record) => record.id === id);
  const canReview = isFullAdmin() && (currentView === "admin" || isAdminPageOpen());
  const archived = Boolean(selected && isArchivedRecord(selected));
  archiveRecord.classList.toggle(
    "hidden",
    !canReview || !selected || archived || currentFormMode === "view",
  );
  restoreRecord.classList.toggle("hidden", !canRestoreArchived() || !canReview || !selected || !archived);
}

function updateEditorVisibility() {
  const hasSelectedRecord = Boolean(document.querySelector("#recordId").value);
  const showForAdmin =
    canAccessView("admin") && (currentView === "admin" || isAdminPageOpen()) && (hasSelectedRecord || drawerOpen);
  const showForRecords = currentView === "records" && hasSelectedRecord;
  const shouldShow = showForAdmin || showForRecords;
  editorPanel.classList.toggle("hidden", !shouldShow);
  drawerBackdrop.classList.toggle("hidden", !shouldShow);
  drawerBackdrop.hidden = !shouldShow;
  document.body.classList.toggle("drawer-open", shouldShow);
}

function updateFormMode() {
  const isReadOnly = currentFormMode === "view";
  const creating = isCreatingApplicant();
  applicantForm.querySelectorAll("input, select, textarea").forEach((control) => {
    if (control.id === "recordId") return;
    if (control.id === "queriedEveryFiveYears") {
      control.readOnly = true;
      control.setAttribute("aria-readonly", "true");
      control.classList.add("calculated-readonly-field");
      return;
    }
    if (control.name === "accessTypeValues" && isReadOnlyAccessTypeOption(control.value)) {
      applyAccessTypeOptionState(control);
      return;
    }
    if (control.type === "checkbox" || control.tagName === "SELECT") {
      control.disabled = isReadOnly;
    } else {
      const preserveImportedSource = control.id === "source" && !creating;
      control.readOnly = isReadOnly || control.id === "lastChangedBy" || preserveImportedSource;
    }
  });
  syncCreateRequiredAttributes();
  saveApplicantButton.classList.toggle("hidden", isReadOnly);
  formHeading.textContent = isReadOnly ? "Applicant Details - Read Only" : "Applicant Details";
  editorEyebrow.textContent = isReadOnly ? "Read Only" : currentView === "admin" ? "Full Record" : "Records";
  syncApplicantActivityStatus();
}

function renderQueryStatus(record) {
  if (!record.queriedEveryFiveYears) return `<span class="badge pending">No query date</span>`;
  if (isQueryDue(record)) return `<span class="badge due">Due</span>`;
  return `<span class="badge clear">Current</span>`;
}

function formatFieldValue(field, value) {
  return isDateField(field) ? formatDate(value) : escapeHtml(value);
}

function isQueryDue(record) {
  if (!record.queriedEveryFiveYears) return false;
  const due = new Date(`${record.queriedEveryFiveYears}T00:00:00`);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due <= today;
}

// Date of III Completion: native date control (calendar), store ISO YYYY-MM-DD.
// Legacy localStorage slash dates were DD/MM/YYYY; a one-time flag
// (STORAGE_KEYS.iiiCompletionIsoMigrated) interprets those as DD/MM once, then
// rewrites them to ISO so 10/02/2026 (10 Feb) becomes 2026-02-10, not 2 Oct.
function parseIsoDateParts(value) {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!iso) return null;
  return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
}

function parseSlashDateParts(value, order) {
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(value || "").trim());
  if (!slash) return null;
  if (order === "ddmm") {
    return { year: Number(slash[3]), month: Number(slash[2]), day: Number(slash[1]) };
  }
  return { year: Number(slash[3]), month: Number(slash[1]), day: Number(slash[2]) };
}

function parseIiiCompletionDate(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  return parseIsoDateParts(text) || parseSlashDateParts(text, "mmdd");
}

function markIiiCompletionMigrated() {
  if (iiiCompletionIsoMigrated) return;
  iiiCompletionIsoMigrated = true;
  localStorage.setItem(STORAGE_KEYS.iiiCompletionIsoMigrated, "1");
}

function toStoredIiiCompletionDate(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const iso = parseIsoDateParts(text);
  if (iso) return toIsoDate(iso);
  if (!iiiCompletionIsoMigrated) {
    const legacy = parseSlashDateParts(text, "ddmm");
    if (legacy) {
      iiiCompletionMigrationCount += 1;
      return toIsoDate(legacy);
    }
  }
  return toIsoDate(parseIiiCompletionDate(text));
}

function addYearsToDateParts(parts, years) {
  const targetYear = parts.year + years;
  const lastDay = new Date(targetYear, parts.month, 0).getDate();
  return { year: targetYear, month: parts.month, day: Math.min(parts.day, lastDay) };
}

function computeInquiryDueDate(iiiCompletion) {
  const parts = parseIiiCompletionDate(iiiCompletion);
  if (!parts) return "";
  return toIsoDate(addYearsToDateParts(parts, 5));
}

function syncInquiryDueField() {
  const dueField = document.querySelector("#queriedEveryFiveYears");
  const iiiField = document.querySelector("#dateOfIiiCompletion");
  if (!dueField || !iiiField) return;
  dueField.value = computeInquiryDueDate(iiiField.value);
}

function logIiiCompletionIsoMigration(changedCount) {
  changeLog.unshift({
    id: crypto.randomUUID(),
    recordId: "iii-completion-iso-migration",
    applicantName: `${changedCount} stored record(s)`,
    vendor: "",
    action: "Migrated",
    changes: [`Converted Date of III Completion from legacy DD/MM/YYYY display strings to stored ISO YYYY-MM-DD for ${changedCount} stored record(s), preserving the same calendar day.`],
    changedBy: "System",
    role: "admin",
    roleLabel: "System",
    changedAt: new Date().toISOString(),
  });
  changeLog = changeLog.slice(0, 500);
  saveChangeLog();
}

function logInquiryDueMigration(changedCount) {
  changeLog.unshift({
    id: crypto.randomUUID(),
    recordId: "inquiry-due-migration",
    applicantName: `${changedCount} stored record(s)`,
    vendor: "",
    action: "Migrated",
    changes: [`Recomputed Next III Inquiry Due (5 yrs) for ${changedCount} stored record(s) from Date of III Completion + 5 years.`],
    changedBy: "System",
    role: "admin",
    roleLabel: "System",
    changedAt: new Date().toISOString(),
  });
  changeLog = changeLog.slice(0, 500);
  saveChangeLog();
}

// --- CSV import (SPRINT-004) -------------------------------------------------
// Maps spreadsheet columns to tracker fields per docs/planning/import-crosswalk-mastersheet.md.
// DOB and SSN columns stay excluded (DEC-012). Raw MasterSheet "State / Driver's
// License" headers stay blocked. A Driver Lic Num header is accepted only when
// the value matches ST + / + up to 15 letters or numbers (DEC-020). Never commit spreadsheet PII.

const IMPORT_BLOCKED_HEADER_PATTERNS = [/birth/i, /social\s*security/i, /\bssn\b/i, /licen[cs]e/i];
const IMPORT_DRIVERS_LICENSE_HEADER = /^(driver\s*lic(\.|ense)?\s*num(ber)?|drivers?License(Number)?)$/i;

const IMPORT_HEADER_MAP = [
  { match: /^source$/i, field: "source" },
  { match: /^control[\s_-]*id$/i, field: "controlNumber" },
  { match: /^last\s*name$/i, field: "lastName" },
  { match: /^first\s*name$/i, field: "firstName" },
  { match: /^middle(\s*init(ial)?)?$/i, field: "middleInitial" },
  { match: /^suffix$/i, field: "suffix" },
  { match: /^name/i, field: "name" },
  { match: /^vendor$/i, field: "vendor" },
  { match: /^department$/i, field: "department" },
  { match: /^position(\s*\/\s*|\s+|\/)?role$/i, field: "positionRole" },
  { match: /^requestor$/i, field: "requestor" },
  { match: /^date information provided$/i, field: "dateInformationProvided", type: "isoDate" },
  { match: /iii\s*completion/i, field: "dateOfIiiCompletion", type: "isoDate" },
  { match: /^iii\s*-?\s*status$/i, field: "iiiStatus" },
  { match: /clearance/i, field: "clearanceType" },
  { match: /^tour(\s*\/\s*|\s+|\/)?orient/i, field: "tourOrientation" },
  { match: /^access type$/i, field: "accessType" },
  { match: /security and awareness role/i, field: "cjisSecurityAwarenessRole" },
  { match: /^fingerprints?\s/i, field: "fingerprintsNotifiedCompleted", type: "isoDate" },
  { match: /outcome/i, field: "outcome" },
  { match: /security and awareness (expiration|cert)/i, field: "securityAwarenessExpiration", type: "isoDate" },
  { match: /^security addendum$/i, field: "securityAddendum", type: "isoDate" },
  { match: /ncic.*(expiration|cert of)/i, field: "ncicCertificationExpiration", type: "isoDate" },
  { match: /^ncic certification$/i, field: "ncicCertification" },
  { match: /^passport$/i, field: "passport" },
  { match: /phone/i, field: "phoneNumber", type: "phoneNumber" },
  { match: /^completed full process$/i, field: "completedFullProcess", type: "isoDate" },
  { match: /site visit/i, field: "dateOfSiteVisitOnly", type: "isoDate" },
  { match: /quer/i, field: "queriedEveryFiveYears", type: "isoDate" },
  { match: /e-?mail/i, field: "emailAddress" },
  { match: /^notes$/i, field: "notes" },
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;
  const source = String(text || "").replace(/^\uFEFF/, "");

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        value += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(value);
      value = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else {
      value += char;
    }
  }
  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

function parseUsOrIsoDate(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (us) return { year: Number(us[3]), month: Number(us[1]), day: Number(us[2]) };
  return null;
}

function toIsoDate(parts) {
  if (!parts) return "";
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function importCsvText(csvText, replaceAll) {
  if (!currentUser || currentUser.role !== "admin") {
    return { ok: false, message: "Full Admin access is required to import records." };
  }

  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return { ok: false, message: "CSV must contain a header row and at least one record." };
  }

  const headers = rows[0].map((header) => header.trim());
  const columnMap = headers.map((header) => {
    if (!header) return null;
    if (IMPORT_DRIVERS_LICENSE_HEADER.test(header)) {
      return { field: "driversLicense", type: "driversLicense", header };
    }
    if (IMPORT_BLOCKED_HEADER_PATTERNS.some((pattern) => pattern.test(header))) {
      return { blocked: true, header };
    }
    const mapped = IMPORT_HEADER_MAP.find((entry) => entry.match.test(header));
    return mapped ? { field: mapped.field, type: mapped.type || "text", header } : null;
  });

  const blockedHeaders = columnMap.filter((column) => column?.blocked).map((column) => column.header);
  const mappedCount = columnMap.filter((column) => column && !column.blocked).length;
  if (!mappedCount) {
    return { ok: false, message: "No recognizable columns found. Check the header row against the import crosswalk." };
  }

  const imported = [];
  const errors = [];
  const seenControlIds = new Map();

  rows.slice(1).forEach((cells, rowIndex) => {
    const record = { id: crypto.randomUUID(), updatedAt: new Date().toISOString() };
    columnMap.forEach((column, columnIndex) => {
      if (!column || column.blocked) return;
      const raw = String(cells[columnIndex] ?? "").trim();
      if (column.type === "isoDate") {
        record[column.field] = toIsoDate(parseUsOrIsoDate(raw));
      } else if (column.type === "driversLicense") {
        if (!raw) {
          record.driversLicense = "";
        } else {
          const normalizedLicense = normalizeDriversLicense(raw);
          if (isValidDriversLicense(normalizedLicense) && normalizedLicense) {
            record.driversLicense = normalizedLicense;
          } else {
            errors.push(
              `Row ${rowIndex + 2}: Driver Lic Num must be a two-letter state prefix, a slash, and up to 15 letters or numbers (example: NM/A23456H8X0H23H5); value omitted.`,
            );
            record.driversLicense = "";
          }
        }
      } else if (column.type === "phoneNumber") {
        if (!raw) {
          record.phoneNumber = "";
        } else if (extractPhoneDigits(raw).length === PHONE_DIGIT_LIMIT) {
          record.phoneNumber = formatPhoneNumber(raw);
        } else {
          errors.push(
            `Row ${rowIndex + 2}: Applicant Phone Number must be 10 digits (example: 303-555-0174); value omitted.`,
          );
          record.phoneNumber = "";
        }
      } else {
        record[column.field] = raw;
      }
    });
    record.lastChangedBy = currentUser.name;
    record.archived = false;
    record.archivedAt = "";
    record.archivedBy = "";
    const importedName = resolveApplicantNameParts(record);
    record.lastName = importedName.lastName;
    record.firstName = importedName.firstName;
    record.middleInitial = importedName.middleInitial;
    record.suffix = importedName.suffix;
    record.name = importedName.name;

    if (!record.lastName && !record.firstName) {
      errors.push(`Row ${rowIndex + 2}: missing applicant name; row skipped.`);
      return;
    }

    const controlId = String(record.controlNumber || "").trim().toLowerCase();
    if (controlId) {
      if (seenControlIds.has(controlId)) {
        errors.push(`Row ${rowIndex + 2}: duplicate Control ID "${record.controlNumber}" within the file; row skipped.`);
        return;
      }
      seenControlIds.set(controlId, true);
    }
    imported.push(record);
  });

  if (!imported.length) {
    return { ok: false, message: `No records imported. ${errors.join(" ")}` };
  }

  let nextRecords;
  if (replaceAll) {
    nextRecords = imported;
  } else {
    const existingControlIds = new Set(
      records.map((record) => String(record.controlNumber || "").trim().toLowerCase()).filter(Boolean),
    );
    const additions = imported.filter((record) => {
      const controlId = String(record.controlNumber || "").trim().toLowerCase();
      if (controlId && existingControlIds.has(controlId)) {
        errors.push(`Control ID "${record.controlNumber}" already exists; row skipped.`);
        return false;
      }
      return true;
    });
    nextRecords = [...additions, ...records];
  }

  records = normalizeRecords(nextRecords);
  saveRecords();
  logRecordChange(
    replaceAll ? "Imported (replaced all)" : "Imported (added)",
    { id: "import", name: `${imported.length} records from CSV` },
    [`${imported.length} records imported`, ...(blockedHeaders.length ? [`Excluded PII columns: ${blockedHeaders.join(", ")}`] : [])],
  );
  resetApplicantForm();
  renderAll();

  const summary = `Imported ${imported.length} record${imported.length === 1 ? "" : "s"}${replaceAll ? " (existing records replaced)" : ""}.`;
  const exclusions = blockedHeaders.length ? ` Excluded PII columns: ${blockedHeaders.join(", ")}.` : "";
  const problems = errors.length ? ` ${errors.join(" ")}` : "";
  return { ok: true, message: `${summary}${exclusions}${problems}` };
}

function handleCsvImport(event) {
  event.preventDefault();
  const file = importCsvFile.files?.[0];
  if (!file) {
    showMessage(importMessage, "Choose a CSV file to import.", true);
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const result = importCsvText(String(reader.result || ""), importReplace.checked);
    showMessage(importMessage, result.message, !result.ok);
    if (result.ok) importForm.reset();
  });
  reader.addEventListener("error", () => {
    showMessage(importMessage, "Unable to read the selected file.", true);
  });
  reader.readAsText(file);
}

function downloadCsv() {
  const header = adminFields.map((field) => labels[field]);
  const rows = getActiveRecords().map((record) => adminFields.map((field) => exportFieldValue(field, record[field])));
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cjis-applicant-tracker.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function exportFieldValue(field, value) {
  return value || "";
}

function isDateField(field) {
  return [
    "dateInformationProvided",
    "dateOfIiiCompletion",
    "fingerprintsNotifiedCompleted",
    "securityAwarenessExpiration",
    "securityAddendum",
    "ncicCertificationExpiration",
    "completedFullProcess",
    "dateOfSiteVisitOnly",
    "queriedEveryFiveYears",
  ].includes(field);
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function showMessage(target, message, isError = false) {
  target.textContent = message;
  target.classList.toggle("error", isError);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

renderManagedDropdowns();
updateSetupVisibility();
updateAccessControls();
updateFullScreenVisibility();
setView("limited");
updatePersistenceStatus();
void startSqlPersistence();
