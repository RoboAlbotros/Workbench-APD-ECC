"use strict";

/**
 * Backend entry (SPRINT-006 scaffolding).
 * Does not listen on a port. Does not connect to SQL. Does not call Entra ID.
 * Future: HTTP GET /health → handleHealth(db); applicants routes stay later.
 */

const { createDbPlaceholder } = require("./db");
const { handleHealth } = require("./health");
const { createApplicantsRepository } = require("./repositories/applicants");
const { loadExampleConfig } = require("./sso");

function main() {
  const db = createDbPlaceholder();
  createApplicantsRepository(db);
  const sso = loadExampleConfig();
  const report = handleHealth(db);
  report.sso = {
    status: sso.status,
    provider: sso.provider,
    tenantId: sso.tenantId,
  };
  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = { main };
