(function () {
  "use strict";

  const compactStyle = document.createElement("style");
  compactStyle.textContent = `
    .records-table th,
    .records-table td,
    .limited-records-table th,
    .limited-records-table td,
    .admin-records-table th,
    .admin-records-table td {
      padding: 0.48rem 0.56rem !important;
      vertical-align: middle;
    }

    .vendor-group-row td {
      background: #eaf5fb !important;
      border-top: 2px solid #87c4e6 !important;
      border-bottom: 1px solid #b9ddef !important;
      color: #173b56;
      font-weight: 700;
      letter-spacing: 0;
      padding: 0.52rem 0.65rem !important;
    }

    .record-actions {
      display: flex;
      flex-wrap: nowrap;
      gap: 0.35rem;
    }

    .record-actions button,
    [data-view],
    [data-edit] {
      white-space: nowrap;
    }

    .calculated-readonly-field {
      background: #eef2f5 !important;
      color: #435466 !important;
      cursor: not-allowed;
    }

    .compliance-expired-row > td {
      background: #fff2f2 !important;
    }

    .compliance-expired-row > td.security-cert-expired {
      background: #ffdada !important;
      box-shadow: inset 4px 0 #bd2c2c;
      color: #8d1717 !important;
      font-weight: 800;
    }
  `;
  document.head.appendChild(compactStyle);

  const normalize = (value) => String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const isVendor = (value) => normalize(value) === "vendor";
  const isName = (value) => normalize(value) === "name";
  const isClearance = (value) => normalize(value).includes("clearance type");
  const isAccess = (value) => normalize(value).includes("access type");
  const isFingerprintOutcome = (value) => normalize(value).includes("fingerprint outcome");
  const isAction = (value) => {
    const label = normalize(value);
    return label === "actions" || label === "action" || label === "edit";
  };

  function replaceLabelText(element, replacement) {
    if (element.tagName !== "LABEL") {
      element.textContent = replacement;
      return;
    }

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (node.nodeValue.trim()) {
        const leading = node.nodeValue.match(/^\s*/)?.[0] || "";
        const trailing = node.nodeValue.match(/\s*$/)?.[0] || "";
        node.nodeValue = `${leading}${replacement}${trailing}`;
        return;
      }
      node = walker.nextNode();
    }
  }

  function updateLabelsAndControls() {
    document.querySelectorAll("label, th, dt, .field-label").forEach((element) => {
      const label = normalize(element.textContent).replace(/:$/, "");
      if (label === "phone number") {
        replaceLabelText(element, "Applicant Phone Number");
      } else if (label === "query date (every 5 years)" || label === "queried (every 5 years)" || label === "query date") {
        replaceLabelText(element, "Next III Inquery Due (5 yrs)");
      } else if (label === "security and awareness expiration annually" || label === "security and awareness expiration") {
        replaceLabelText(element, "Security and Awareness Cert");
      }
    });

    document.querySelectorAll("button, a").forEach((element) => {
      if (/^export\s+csv$/i.test(element.textContent.trim())) {
        element.remove();
      }
    });
  }

  function findField(fieldName) {
    const escaped = window.CSS?.escape ? CSS.escape(fieldName) : fieldName;
    return document.querySelector(`input#${escaped}, select#${escaped}, input[name="${fieldName}"], select[name="${fieldName}"], input[id$="${fieldName}"], select[id$="${fieldName}"]`);
  }

  function addYearsToIsoDate(value, years) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if (!match) return "";
    const targetYear = Number(match[1]) + years;
    const month = Number(match[2]);
    const day = Number(match[3]);
    const lastDay = new Date(targetYear, month, 0).getDate();
    return `${targetYear}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
  }

  function configureQueryDate() {
    const iiiCompletion = findField("dateOfIiiCompletion");
    const queryDate = findField("queriedEveryFiveYears");
    if (!iiiCompletion || !queryDate) return;

    queryDate.readOnly = true;
    queryDate.setAttribute("aria-readonly", "true");
    queryDate.classList.add("calculated-readonly-field");

    const calculate = () => {
      const calculated = addYearsToIsoDate(iiiCompletion.value, 5);
      if (queryDate.value === calculated) return;
      queryDate.value = calculated;
      queryDate.dispatchEvent(new Event("input", { bubbles: true }));
      queryDate.dispatchEvent(new Event("change", { bubbles: true }));
    };

    if (iiiCompletion.dataset.queryDateCalculation !== "enabled") {
      iiiCompletion.dataset.queryDateCalculation = "enabled";
      iiiCompletion.addEventListener("input", calculate);
      iiiCompletion.addEventListener("change", calculate);
    }

    calculate();
  }

  function parseDisplayedDate(value) {
    const text = String(value || "").trim();
    if (!text || text === "—" || text === "-") return null;

    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

    const numeric = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
    if (numeric) return new Date(Number(numeric[3]), Number(numeric[1]) - 1, Number(numeric[2]));

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function addYearsToDate(date, years) {
    const targetYear = date.getFullYear() + years;
    const month = date.getMonth();
    const day = date.getDate();
    const lastDay = new Date(targetYear, month + 1, 0).getDate();
    return new Date(targetYear, month, Math.min(day, lastDay));
  }

  function updateCalculatedQueryCells(table) {
    const headerRow = table.tHead?.rows?.[0] || table.querySelector("tr:has(th)");
    const body = table.tBodies?.[0];
    if (!headerRow || !body) return;

    const headers = Array.from(headerRow.cells, (cell) => normalize(cell.textContent));
    const iiiIndex = headers.findIndex((label) => label.includes("date of iii completion"));
    const queryIndex = headers.findIndex((label) => label.includes("next iii inquery due (5 yrs)"));
    if (iiiIndex < 0 || queryIndex < 0) return;

    Array.from(body.rows).forEach((row) => {
      if (row.classList.contains("vendor-group-row") || row.querySelector("[colspan]")) return;
      const iiiDate = parseDisplayedDate(row.cells[iiiIndex]?.textContent);
      const queryCell = row.cells[queryIndex];
      if (!queryCell) return;
      queryCell.textContent = iiiDate ? addYearsToDate(iiiDate, 5).toLocaleDateString() : "";
      queryCell.setAttribute("aria-readonly", "true");
    });
  }

  function isLimitedOrAdminTable(table) {
    const ancestorIds = Array.from(document.querySelectorAll("[id]"))
      .filter((element) => element.contains(table))
      .map((element) => element.id.toLowerCase())
      .join(" ");
    const scope = `${table.id || ""} ${ancestorIds}`.toLowerCase();
    return scope.includes("limited") || scope.includes("admin");
  }

  function applyComplianceAlerts(table) {
    if (!isLimitedOrAdminTable(table)) return;
    const headerRow = table.tHead?.rows?.[0] || table.querySelector("tr:has(th)");
    const body = table.tBodies?.[0];
    if (!headerRow || !body) return;

    const headers = Array.from(headerRow.cells, (cell) => normalize(cell.textContent).replace(/:$/, ""));
    const certIndex = headers.findIndex((label) =>
      label === "security and awareness cert" || label.includes("security and awareness expiration")
    );
    if (certIndex < 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    Array.from(body.rows).forEach((row) => {
      if (row.classList.contains("vendor-group-row") || row.querySelector("[colspan]")) return;
      const cell = row.cells[certIndex];
      const expiration = parseDisplayedDate(cell?.textContent);
      const expired = expiration && expiration < today;
      row.classList.toggle("compliance-expired-row", Boolean(expired));
      cell?.classList.toggle("security-cert-expired", Boolean(expired));
      if (cell) {
        if (expired) {
          cell.setAttribute("title", "Out of compliance: Security and Awareness certification has expired");
          cell.setAttribute("aria-label", `${cell.textContent.trim()}, expired and out of compliance`);
        } else {
          cell.removeAttribute("title");
          cell.removeAttribute("aria-label");
        }
      }
    });
  }

  function isGroupRow(row, expectedCellCount) {
    return row.classList.contains("group-row") ||
      row.classList.contains("vendor-group-row") ||
      Boolean(row.querySelector("[colspan]")) ||
      row.cells.length !== expectedCellCount;
  }

  function preferredOrder(labels) {
    const prioritized = [
      labels.findIndex(isAction),
      labels.findIndex(isName),
      labels.findIndex(isClearance),
      labels.findIndex(isAccess)
    ].filter((index, position, indexes) => index >= 0 && indexes.indexOf(index) === position);

    const hidden = new Set([
      labels.findIndex(isVendor),
      labels.findIndex(isFingerprintOutcome)
    ].filter((index) => index >= 0));

    const remaining = labels
      .map((_, index) => index)
      .filter((index) => !prioritized.includes(index) && !hidden.has(index));

    return [...prioritized, ...remaining];
  }

  function transformTable(table) {
    if (table.dataset.vendorTransforming === "true") return;

    const headerRow = table.tHead?.rows?.[0] || table.querySelector("tr:has(th)");
    const body = table.tBodies?.[0];
    if (!headerRow || !body) return;

    const visibleLabels = Array.from(headerRow.cells, (cell) => cell.textContent.trim());
    const currentRows = Array.from(body.rows);
    const firstDataRow = currentRows.find((row) => !row.querySelector("[colspan]"));
    if (!firstDataRow) return;

    let sourceLabels = visibleLabels;
    const hasVendorHeader = visibleLabels.some(isVendor);

    if (hasVendorHeader) {
      table.dataset.originalColumnLabels = JSON.stringify(visibleLabels);
    } else if (table.dataset.originalColumnLabels) {
      try {
        const originalLabels = JSON.parse(table.dataset.originalColumnLabels);
        if (firstDataRow.cells.length === originalLabels.length) sourceLabels = originalLabels;
      } catch {
        return;
      }
    }

    const vendorIndex = sourceLabels.findIndex(isVendor);
    if (vendorIndex < 0 || firstDataRow.cells.length !== sourceLabels.length) return;

    const nameIndex = sourceLabels.findIndex(isName);
    const order = preferredOrder(sourceLabels);
    const dataRows = currentRows.filter((row) => !isGroupRow(row, sourceLabels.length));
    if (!dataRows.length) return;

    table.dataset.vendorTransforming = "true";

    if (hasVendorHeader) {
      const headerCells = Array.from(headerRow.cells);
      order.forEach((index) => headerRow.appendChild(headerCells[index]));
      headerCells.forEach((cell, index) => {
        if (!order.includes(index)) cell.remove();
      });
    }

    const records = dataRows.map((row) => {
      const cells = Array.from(row.cells);
      const vendor = cells[vendorIndex]?.textContent.trim() || "Vendor Not Specified";
      const name = nameIndex >= 0 ? cells[nameIndex]?.textContent.trim() || "" : "";
      order.forEach((index) => row.appendChild(cells[index]));
      cells.forEach((cell, index) => {
        if (!order.includes(index)) cell.remove();
      });
      return { row, vendor, name };
    });

    records.sort((left, right) =>
      left.vendor.localeCompare(right.vendor, undefined, { sensitivity: "base" }) ||
      left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
    );

    const fragment = document.createDocumentFragment();
    let currentVendor = null;

    records.forEach((record) => {
      if (normalize(record.vendor) !== normalize(currentVendor)) {
        currentVendor = record.vendor;
        const groupRow = document.createElement("tr");
        groupRow.className = "group-row vendor-group-row";
        const groupCell = document.createElement("td");
        groupCell.colSpan = order.length;
        groupCell.textContent = currentVendor;
        groupRow.appendChild(groupCell);
        fragment.appendChild(groupRow);
      }
      fragment.appendChild(record.row);
    });

    body.replaceChildren(fragment);
    table.dataset.vendorTransforming = "false";
  }

  let scheduled = false;
  function refreshListings() {
    updateLabelsAndControls();
    configureQueryDate();
    document.querySelectorAll("table").forEach((table) => {
      transformTable(table);
      updateCalculatedQueryCells(table);
      applyComplianceAlerts(table);
    });
  }

  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      refreshListings();
    });
  }

  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleRefresh();
})();
