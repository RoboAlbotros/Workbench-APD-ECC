const STORAGE_KEYS = {
  records: "cjisApplicantTracker.records",
  changeLog: "cjisApplicantTracker.changeLog",
  accessCodes: "cjisApplicantTracker.accessCodes",
  iiiCompletionIsoMigrated: "cjisApplicantTracker.iiiCompletionIsoMigrated",
};

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
  admin: "Full Admin",
};

const fields = [
  "name",
  "controlNumber",
  "vendor",
  "requestor",
  "dateInformationProvided",
  "dateOfIiiCompletion",
  "iiiStatus",
  "clearanceType",
  "accessType",
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
  "controlNumber",
  "clearanceType",
  "securityAwarenessExpiration",
  "lastChangedBy",
];

const adminFields = fields.filter((field) => !["notes", "documents"].includes(field));
// Admin table diet (DEC-019): Actions plus seven data columns. All other fields stay
// in the data model, form, search, and CSV export.
const adminTableFields = [
  "name",
  "clearanceType",
  "accessType",
  "iiiStatus",
  "cjisSecurityAwarenessRole",
  "ncicCertification",
  "requestor",
];
const formFields = fields.filter((field) => field !== "documents");

const labels = {
  name: "Name (Last, First, MI, Suffix)",
  controlNumber: "Control ID",
  source: "Source",
  vendor: "Vendor",
  requestor: "Requestor",
  dateInformationProvided: "Date Information Provided",
  iiiStatus: "III - Status",
  dateOfIiiCompletion: "Date of III Completion",
  clearanceType: "Clearance Type",
  accessType: "Access Type",
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
  cjisSecurityAwarenessRole: "CJIS Security Role",
  securityAwarenessExpiration: "Security and Awareness Cert",
};

const ACCESS_TYPE_OPTIONS = [
  "VPN",
  "Non VPN",
  "Security Groups",
  "Facility Access",
  "Unescorted Access",
  "Building Access",
  "Escorted Access",
  "System Access",
  "System/Building",
];

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
let currentDocuments = [];
let currentFormMode = "edit";
let drawerOpen = false;
let drawerReturnFocus = null;

const accessPanel = document.querySelector("#accessPanel");
const accessForm = document.querySelector("#accessForm");
const managementUserName = document.querySelector("#managementUserName");
const managementAccessLevel = document.querySelector("#managementAccessLevel");
const managementAccessCode = document.querySelector("#managementAccessCode");
const currentUserBadge = document.querySelector("#currentUserBadge");
const signOutButton = document.querySelector("#signOutButton");
const accessMessage = document.querySelector("#accessMessage");
const headerMetrics = document.querySelector("#headerMetrics");
const viewSwitch = document.querySelector("#viewSwitch");
const sessionControls = document.querySelector("#sessionControls");
const toolbar = document.querySelector("#toolbar");
const drawerBackdrop = document.querySelector("#drawerBackdrop");
const closeDrawer = document.querySelector("#closeDrawer");
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
const deleteRecord = document.querySelector("#deleteRecord");
const exportCsv = document.querySelector("#exportCsv");
const formMessage = document.querySelector("#formMessage");
const searchInput = document.querySelector("#searchInput");
const clearanceFilter = document.querySelector("#clearanceFilter");
const outcomeFilter = document.querySelector("#outcomeFilter");
const vendorOptions = document.querySelector("#vendorOptions");
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
  accessForm.classList.toggle("hidden", needsSetup);
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
limitedViewButton.addEventListener("click", () => setView("limited"));
recordsViewButton.addEventListener("click", () => setView("records"));
adminViewButton.addEventListener("click", () => setView("admin"));
applicantForm.addEventListener("submit", saveApplicant);
resetForm.addEventListener("click", openNewApplicant);
closeDrawer.addEventListener("click", closeApplicantDrawer);
drawerBackdrop.addEventListener("click", closeApplicantDrawer);
deleteRecord.addEventListener("click", deleteApplicant);
document.querySelector("#dateOfIiiCompletion").addEventListener("input", syncInquiryDueField);
document.querySelector("#dateOfIiiCompletion").addEventListener("change", syncInquiryDueField);
document.addEventListener("keydown", handleDrawerKeydown);
exportCsv.addEventListener("click", downloadCsv);
documentUpload.addEventListener("change", handleDocumentUpload);
[searchInput, clearanceFilter, outcomeFilter].forEach((control) => {
  control.addEventListener("input", renderAll);
});

function loadRecords() {
  const raw = localStorage.getItem(STORAGE_KEYS.records);
  if (!raw) {
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
    const nextRecord = {
      ...record,
      name: normalizeApplicantName(record.name),
      controlNumber: String(record.controlNumber || record.controlId || "").trim(),
      source: String(record.source || "").trim(),
      requestor: record.requestor || "",
      outcome: normalizeOutcome(record.outcome),
      iiiStatus: normalizeIiiStatus(record.iiiStatus),
      clearanceType: normalizeClearanceType(record.clearanceType),
      securityAddendum: normalizeDateValue(record.securityAddendum),
      dateOfIiiCompletion: storedIiiCompletion,
      queriedEveryFiveYears: computeInquiryDueDate(storedIiiCompletion),
      accessType: normalizeAccessType(record.accessType),
      cjisSecurityAwarenessRole: record.cjisSecurityAwarenessRole || "",
      ncicCertification: normalizeYesNo(record.ncicCertification),
      ncicCertificationExpiration: normalizeDateValue(record.ncicCertificationExpiration),
      emailAddress: record.emailAddress || "",
      completedFullProcess: record.completedFullProcess || "",
      dateOfSiteVisitOnly: record.dateOfSiteVisitOnly || "",
      lastChangedBy: record.lastChangedBy || "",
      documents: Array.isArray(record.documents) ? record.documents : [],
      notes: record.notes || "",
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
    delete nextRecord.driversLicense;
    return nextRecord;
  });

  markIiiCompletionMigrated();
  saveRecordSet(normalized);
  return normalized;
}

function normalizeApplicantName(value) {
  const text = String(value || "").trim();
  if (!text || text.includes(",")) return text;
  const parts = text.split(/\s+/);
  if (parts.length < 2) return text;
  const lastName = parts.at(-1);
  const givenNames = parts.slice(0, -1).join(" ");
  return `${lastName}, ${givenNames}`;
}

function normalizeOutcome(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "approved" || normalized === "clear") return "Clear";
  if (normalized === "misd/clear" || normalized === "misd clear") return "Misd/Clear";
  if (normalized === "denied" || normalized === "unauthorized" || normalized === "felony") return "Felony";
  return "Needs Follow Up";
}

function normalizeIiiStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "clear") return "Clear";
  if (normalized === "felony" || normalized === "review needed") return "Felony";
  return "Misd/Clear";
}

function normalizeClearanceType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "full clearance") return "Full Clearance";
  if (normalized === "one time visit") return "One Time Visit";
  if (normalized === "no access given") return "No Access Given";
  return "";
}

function normalizeAccessType(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(",");
  const allowed = new Map(ACCESS_TYPE_OPTIONS.map((option) => [option.toLowerCase(), option]));
  return values
    .map((item) => String(item).trim().toLowerCase())
    .filter(Boolean)
    .map((item) => allowed.get(item))
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
    .join(", ");
}

function normalizeDateValue(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function normalizeYesNo(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "yes" || normalized === "y") return "Y";
  if (normalized === "no" || normalized === "n") return "N";
  return "";
}

function signInManagementUser(event) {
  event.preventDefault();
  const name = managementUserName.value.trim();
  const role = managementAccessLevel.value;
  const code = managementAccessCode.value;

  if (role === "admin" && code === OWNER_ADMIN_CODE) {
    ensureOwnerAccessCodes();
    updateSetupVisibility();
  }

  if (!accessCodes) {
    showMessage(accessMessage, "Access codes are not configured. Complete initial setup first.", true);
    return;
  }

  if (!name || !role || accessCodes[role] !== code) {
    showMessage(accessMessage, "Invalid management access.", true);
    return;
  }

  currentUser = { name, role };
  managementAccessCode.value = "";
  showMessage(accessMessage, `Signed in as ${name}.`);
  updateAccessControls();
  setView(role);
}

function signOutManagementUser() {
  currentUser = null;
  currentFormMode = "edit";
  closeApplicantDrawer({ restoreFocus: false });
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

function updateAccessControls() {
  const signedIn = Boolean(currentUser);
  document.body.classList.toggle("signed-in", signedIn);
  document.body.classList.toggle("signed-out", !signedIn);
  accessPanel.classList.toggle("hidden", signedIn);
  headerMetrics.classList.toggle("hidden", !signedIn);
  viewSwitch.classList.toggle("hidden", !signedIn);
  sessionControls.classList.toggle("hidden", !signedIn);
  toolbar.classList.toggle("hidden", !signedIn);
  currentUserBadge.textContent = signedIn ? `${currentUser.name} - ${ACCESS_LABELS[currentUser.role]}` : "";

  limitedViewButton.disabled = !canAccessView("limited");
  recordsViewButton.disabled = !canAccessView("records");
  adminViewButton.disabled = !canAccessView("admin");
}

function setView(view) {
  if (!canAccessView(view)) {
    currentView = "limited";
    limitedView.classList.add("hidden");
    recordsView.classList.add("hidden");
    adminView.classList.add("hidden");
    editorPanel.classList.add("hidden");
    limitedViewButton.classList.remove("active");
    recordsViewButton.classList.remove("active");
    adminViewButton.classList.remove("active");
    limitedViewButton.setAttribute("aria-selected", "false");
    recordsViewButton.setAttribute("aria-selected", "false");
    adminViewButton.setAttribute("aria-selected", "false");
    if (currentUser) showMessage(accessMessage, `${ACCESS_LABELS[currentUser.role]} cannot open ${ACCESS_LABELS[view]}.`, true);
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
  recordsViewButton.classList.toggle("active", isRecords);
  adminViewButton.classList.toggle("active", isAdmin);
  limitedViewButton.setAttribute("aria-selected", String(view === "limited"));
  recordsViewButton.setAttribute("aria-selected", String(isRecords));
  adminViewButton.setAttribute("aria-selected", String(isAdmin));
  editorEyebrow.textContent = isAdmin ? "Full Record" : "Records";
  resetForm.classList.toggle("hidden", !isAdmin);
  if (!isAdmin && !isRecords) closeApplicantDrawer({ restoreFocus: false });
  updateFormMode();
  updateEditorVisibility();
  updateDeleteVisibility();
  updateChangeLogVisibility();
  renderAll();
}

function getFormFieldValue(field) {
  if (field === "accessType") {
    return [...document.querySelectorAll('input[name="accessTypeValues"]:checked')]
      .map((input) => input.value)
      .join(", ");
  }

  const raw = document.querySelector(`#${field}`).value.trim();
  if (field === "dateOfIiiCompletion") {
    return toIsoDate(parseIiiCompletionDate(raw));
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

  if (field === "dateOfIiiCompletion") {
    document.querySelector(`#${field}`).value = toMmDdYyyy(parseIiiCompletionDate(value));
    return;
  }

  document.querySelector(`#${field}`).value = value || "";
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
  nextRecord.accessType = normalizeAccessType(nextRecord.accessType);
  nextRecord.outcome = normalizeOutcome(nextRecord.outcome);
  nextRecord.iiiStatus = normalizeIiiStatus(nextRecord.iiiStatus);
  nextRecord.ncicCertification = normalizeYesNo(nextRecord.ncicCertification);
  nextRecord.controlNumber = String(nextRecord.controlNumber || "").trim();
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
  syncInquiryDueField();
  updateFormMode();
  updateChangeLogVisibility();
  updateEditorVisibility();
  updateDeleteVisibility();
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
  document.querySelector("#name").focus();
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

function deleteApplicant() {
  const id = document.querySelector("#recordId").value;
  if (!id || !confirm("Delete this applicant record?")) return;
  const deletedRecord = records.find((record) => record.id === id);
  records = records.filter((record) => record.id !== id);
  if (deletedRecord) logRecordChange("Deleted", deletedRecord, ["Record deleted"]);
  saveRecords();
  resetApplicantForm();
  renderAll();
  showMessage(formMessage, "Applicant record deleted.");
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
  formFields.forEach((field) => {
    setFormFieldValue(field, record[field]);
  });
  currentDocuments = Array.isArray(record.documents) ? [...record.documents] : [];
  documentUpload.value = "";
  renderDocumentList();
  syncInquiryDueField();
  drawerOpen = true;
  updateFormMode();
  updateChangeLogVisibility();
  updateEditorVisibility();
  updateDeleteVisibility();
  showMessage(formMessage, mode === "view" ? "Viewing applicant record in read-only mode." : "Editing applicant record.");
  const firstField = document.querySelector("#name");
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
  renderOutcomeFilter();
  renderMetrics();
  renderVendorOptions();
  renderLimitedTable();
  renderRecordsTable();
  if (canAccessView("admin")) {
    renderAdminTable();
    updateChangeLogVisibility();
  }
}

function renderVendorOptions() {
  const vendors = [...new Set(records.map((record) => record.vendor).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  vendorOptions.innerHTML = vendors.map((vendor) => `<option value="${escapeHtml(vendor)}"></option>`).join("");
}

function getFilteredRecords() {
  const query = searchInput.value.trim().toLowerCase();
  const clearance = clearanceFilter.value;
  const outcome = outcomeFilter.value;

  return records.filter((record) => {
    const haystack = [
      record.name,
      record.controlNumber,
      record.vendor,
      record.requestor,
      record.emailAddress,
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!query || haystack.includes(query)) &&
      (clearance === "all" || record.clearanceType === clearance) &&
      (outcome === "all" || record.outcome === outcome)
    );
  });
}

function renderOutcomeFilter() {
  const current = outcomeFilter.value || "all";
  const outcomes = [...new Set(records.map((record) => record.outcome).filter(Boolean))].sort();
  outcomeFilter.innerHTML = `<option value="all">All fingerprint outcomes</option>${outcomes
    .map((outcome) => `<option value="${escapeHtml(outcome)}">${escapeHtml(outcome)}</option>`)
    .join("")}`;
  outcomeFilter.value = outcomes.includes(current) ? current : "all";
}

function renderMetrics() {
  const queryDue = records.filter(isQueryDue).length;
  document.querySelector("#totalCount").textContent = records.length;
  document.querySelector("#fullClearanceCount").textContent = records.filter((record) => {
    return record.clearanceType === "Full Clearance";
  }).length;
  document.querySelector("#siteVisitCount").textContent = records.filter((record) => {
    return record.clearanceType === "One Time Visit";
  }).length;
  document.querySelector("#queryDueCount").textContent = queryDue;
}

function renderLimitedTable() {
  const visibleRecords = getSortedRecords(getFilteredRecords());
  if (!visibleRecords.length) {
    limitedTable.innerHTML = `<p class="empty-state">No applicant records match the current filters.</p>`;
    return;
  }

  limitedTable.innerHTML = `<table class="limited-records-table">
    <thead>
      <tr>
        ${limitedFields.map(renderHeaderCell).join("")}
      </tr>
    </thead>
    <tbody>${renderGroupedRows(visibleRecords, renderLimitedRow, limitedFields.length)}</tbody>
  </table>`;
}

function renderRecordsTable() {
  const visibleRecords = getSortedRecords(getFilteredRecords());
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
    <tbody>${renderGroupedRows(visibleRecords, renderRecordsRow, limitedFields.length + 1)}</tbody>
  </table>`;

  recordsTable.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => editApplicant(button.dataset.edit, button));
  });
  recordsTable.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => viewApplicant(button.dataset.view, button));
  });
}

function renderRecordsRow(record, groupTone) {
  return `<tr${rowClassAttributes(record, groupTone)}>
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

function renderLimitedRow(record, groupTone) {
  return `<tr${rowClassAttributes(record, groupTone)}>
    ${limitedFields
      .map((field) => {
        const value = record[field];
        return renderDataCell(field, value, record);
      })
      .join("")}
  </tr>`;
}

function renderAdminTable() {
  const visibleRecords = getSortedRecords(getFilteredRecords());
  if (!visibleRecords.length) {
    adminTable.innerHTML = `<p class="empty-state">No applicant records match the current filters.</p>`;
    return;
  }

  adminTable.innerHTML = `<table class="admin-records-table">
    <thead>
      <tr>
        <th class="field-admin">Actions</th>
        ${adminTableFields.map(renderHeaderCell).join("")}
      </tr>
    </thead>
    <tbody>${renderGroupedRows(visibleRecords, renderAdminRow, adminTableFields.length + 1)}</tbody>
  </table>`;

  adminTable.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => editApplicant(button.dataset.edit, button));
  });
  adminTable.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => viewApplicant(button.dataset.view, button));
  });
}

function renderAdminRow(record, groupTone) {
  return `<tr${rowClassAttributes(record, groupTone)}>
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

function renderGroupedRows(sortedRecords, rowRenderer, columnCount) {
  let currentVendor = "";
  let groupIndex = -1;
  return sortedRecords
    .map((record) => {
      const vendor = getVendorGroupName(record);
      const isNewGroup = vendor !== currentVendor;
      if (isNewGroup) {
        groupIndex += 1;
        currentVendor = vendor;
      }
      const groupTone = groupIndex % 2;
      const vendorHeader = isNewGroup
        ? `<tr class="vendor-group-row vendor-group-${groupTone}"><th colspan="${columnCount}">${escapeHtml(vendor)}</th></tr>`
        : "";

      return `${vendorHeader}${rowRenderer(record, groupTone)}`;
    })
    .join("");
}

function getSortedRecords(recordSet) {
  return [...recordSet].sort((a, b) => {
    const vendorCompare = getVendorGroupName(a).localeCompare(getVendorGroupName(b), undefined, { sensitivity: "base" });
    if (vendorCompare !== 0) return vendorCompare;
    return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
  });
}

function getVendorGroupName(record) {
  return String(record.vendor || "").trim() || "Vendor Not Specified";
}

function getDateSortValue(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const timestamp = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function renderDataCell(field, value, record) {
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

function rowClassAttributes(record, groupTone) {
  const classes = [`vendor-group-${groupTone}`];
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

function updateDeleteVisibility() {
  const hasSelectedRecord = Boolean(document.querySelector("#recordId").value);
  deleteRecord.classList.toggle(
    "hidden",
    currentView !== "admin" || !canAccessView("admin") || !hasSelectedRecord || currentFormMode === "view",
  );
}

function updateEditorVisibility() {
  const hasSelectedRecord = Boolean(document.querySelector("#recordId").value);
  const showForAdmin = currentView === "admin" && canAccessView("admin") && (hasSelectedRecord || drawerOpen);
  const showForRecords = currentView === "records" && hasSelectedRecord;
  const shouldShow = showForAdmin || showForRecords;
  editorPanel.classList.toggle("hidden", !shouldShow);
  drawerBackdrop.classList.toggle("hidden", !shouldShow);
  drawerBackdrop.hidden = !shouldShow;
  document.body.classList.toggle("drawer-open", shouldShow);
}

function updateFormMode() {
  const isReadOnly = currentFormMode === "view";
  applicantForm.querySelectorAll("input, select, textarea").forEach((control) => {
    if (control.id === "recordId") return;
    if (control.id === "queriedEveryFiveYears") {
      control.readOnly = true;
      control.setAttribute("aria-readonly", "true");
      control.classList.add("calculated-readonly-field");
      return;
    }
    if (control.type === "checkbox" || control.tagName === "SELECT") {
      control.disabled = isReadOnly;
    } else {
      control.readOnly = isReadOnly || control.id === "lastChangedBy" || control.id === "source";
    }
  });
  saveApplicantButton.classList.toggle("hidden", isReadOnly);
  formHeading.textContent = isReadOnly ? "Applicant Details - Read Only" : "Applicant Details";
  editorEyebrow.textContent = isReadOnly ? "Read Only" : currentView === "admin" ? "Full Record" : "Records";
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

// Date of III Completion: display MM/DD/YYYY, store ISO YYYY-MM-DD.
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
// Sensitive PII columns (DOB, SSN, driver's license) are excluded unconditionally (DEC-012).

const IMPORT_BLOCKED_HEADER_PATTERNS = [/birth/i, /social\s*security/i, /\bssn\b/i, /licen[cs]e/i];

const IMPORT_HEADER_MAP = [
  { match: /^source$/i, field: "source" },
  { match: /^control[\s_-]*id$/i, field: "controlNumber" },
  { match: /^name/i, field: "name" },
  { match: /^vendor$/i, field: "vendor" },
  { match: /^requestor$/i, field: "requestor" },
  { match: /^date information provided$/i, field: "dateInformationProvided", type: "isoDate" },
  { match: /iii\s*completion/i, field: "dateOfIiiCompletion", type: "isoDate" },
  { match: /^iii\s*-?\s*status$/i, field: "iiiStatus" },
  { match: /clearance/i, field: "clearanceType" },
  { match: /^access type$/i, field: "accessType" },
  { match: /security and awareness role/i, field: "cjisSecurityAwarenessRole" },
  { match: /^fingerprints?\s/i, field: "fingerprintsNotifiedCompleted", type: "isoDate" },
  { match: /outcome/i, field: "outcome" },
  { match: /security and awareness (expiration|cert)/i, field: "securityAwarenessExpiration", type: "isoDate" },
  { match: /^security addendum$/i, field: "securityAddendum", type: "isoDate" },
  { match: /ncic.*(expiration|cert of)/i, field: "ncicCertificationExpiration", type: "isoDate" },
  { match: /^ncic certification$/i, field: "ncicCertification" },
  { match: /phone/i, field: "phoneNumber" },
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

function toMmDdYyyy(parts) {
  if (!parts) return "";
  return `${String(parts.month).padStart(2, "0")}/${String(parts.day).padStart(2, "0")}/${parts.year}`;
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
      } else {
        record[column.field] = raw;
      }
    });
    record.lastChangedBy = currentUser.name;

    if (!String(record.name || "").trim()) {
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
  const rows = records.map((record) => adminFields.map((field) => exportFieldValue(field, record[field])));
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
  if (field === "dateOfIiiCompletion") {
    return toMmDdYyyy(parseIiiCompletionDate(value));
  }
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

updateSetupVisibility();
updateAccessControls();
setView("limited");
