"use strict";

const assert = require("assert");
const {
  authenticateOperator,
  createSession,
  isAdminGlobalSession,
  isSignedIn,
  verifyToken,
} = require("./api-auth");

process.env.API_SESSION_SECRET = "test-session-secret-not-for-production";

const james = authenticateOperator("E41718", "jg-admin-9383");
assert.ok(james, "James Gray seed operator authenticates");
assert.strictEqual(james.userType, "adminGlobal");
assert.ok(isAdminGlobalSession({ userType: "adminGlobal" }));

const admin = authenticateOperator("admin", "12345");
assert.ok(admin, "shared Full Admin code authenticates");
assert.strictEqual(admin.role, "admin");
assert.ok(!isAdminGlobalSession({ userType: admin.userType }));

assert.strictEqual(authenticateOperator("E41718", "wrong"), null);
assert.strictEqual(authenticateOperator("", "jg-admin-9383"), null);

const token = createSession(james);
const session = verifyToken(token);
assert.ok(isSignedIn(session), "signed session verifies");
assert.strictEqual(session.userType, "adminGlobal");
assert.strictEqual(verifyToken("not-a-token"), null);

process.stdout.write("api-auth.test.js passed\n");
