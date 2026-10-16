"use strict";

/**
 * Applicants repository stub (SPRINT-006). Not a full implementation.
 *
 * Persist blank Control ID as NULL (not '') so UX_Applicants_ControlNumber
 * allows many unset values and unique non-null Control IDs (DEC-018).
 * Control ID is hidden from the UI (DEC-020); do not drop stored values.
 * Persist DriverLicenseNumber when present (DEC-020); format ST + / + up to 15 letters or numbers.
 * Do not persist Date of Birth or SSN (DEC-012 / DEC-017).
 * SourceName is read-only in the UI (DEC-018).
 *
 * app.js field → column:
 *   name                          ApplicantName
 *   controlNumber                 ControlNumber
 *   driversLicense                DriverLicenseNumber
 *   source                        SourceName
 *   vendor                        VendorId / Vendors.VendorName
 *   requestor                     Requestor
 *   dateInformationProvided       DateInformationProvided
 *   dateOfIiiCompletion           DateOfIiiCompletion
 *   iiiStatus                     IiiStatusId
 *   clearanceType                 ClearanceTypeId
 *   accessType                    ApplicantAccessTypes
 *   passport                      Passport
 *   cjisSecurityAwarenessRole     CjisSecurityAwarenessRoleId
 *   fingerprintsNotifiedCompleted FingerprintsCompleted
 *   outcome                       FingerprintOutcomeId
 *   securityAwarenessExpiration   SecurityAwarenessExpiration
 *   securityAddendum              SecurityAddendumDate
 *   ncicCertificationExpiration   NcicCertificationExpiration
 *   ncicCertification             NcicCertification
 *   completedFullProcess          CompletedFullProcess
 *   dateOfSiteVisitOnly           DateOfSiteVisitOnly
 *   queriedEveryFiveYears         QueryDateEveryFiveYears
 *   emailAddress                  ApplicantEmailAddress
 *   phoneNumber                   PhoneNumber
 *   lastChangedBy                 LastChangedByDisplayName
 *   documents                     ApplicantDocuments
 *   notes                         Notes
 *   archived                      IsArchived
 *   archivedAt                    ArchivedAtUtc
 *   archivedBy                    ArchivedByDisplayName
 *
 * Product action is archive/restore (Full Admin), not hard-delete.
 * remove() remains an unimplemented stub; do not map it to a UI delete.
 */

function notImplemented(methodName) {
  throw new Error(
    `SPRINT-006: applicantsRepository.${methodName} is not implemented. The browser app still uses localStorage.`,
  );
}

function createApplicantsRepository(_db) {
  return {
    list() {
      return notImplemented("list");
    },
    getById(_applicantId) {
      return notImplemented("getById");
    },
    getByControlNumber(_controlNumber) {
      return notImplemented("getByControlNumber");
    },
    create(_applicant) {
      return notImplemented("create");
    },
    update(_applicantId, _applicant) {
      return notImplemented("update");
    },
    remove(_applicantId) {
      return notImplemented("remove");
    },
  };
}

module.exports = { createApplicantsRepository };
