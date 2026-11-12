# Confirm before filming

These items are unresolved or easy to get wrong on camera. The script leaves them unspoken on purpose.

## Claims with no documented result

The project record does not contain a measured savings figure, an error-rate change, a count of retired spreadsheets, or a statement that the tracker is in production use. The footer on the page reads `Version 0.1.0-dev.1`. If leadership wants a results line or a “now available” line, they need to supply a figure someone can stand behind. Otherwise the closing lines in the script are the whole ending.

City single sign-on is the recorded direction for production sign-in. It is not the sign-in this application is using. The video should not mention it.

## Name and audience

The page title is **CJIS Applicant Tracker**. Confirm that leadership wants those words on the title card. A host name elsewhere in the project uses “clearance tracker.” Pick one public name.

The approved definition says the status lookup is for ECC staff, the updates are for records staff, and the full list is for administrators. Confirm whether the video should say “ECC” or stay with “City staff,” which is what the script says now.

## Records role

The definition still describes a Records role that can edit and cannot delete. The current sign-in list is Admin-Full, Admin-Global, Admin-Staff, and Read Only. The header switches between Read Only and Full Admin. Records View is still in the page, and it is not a visible tab. Confirm the current audience before any on-screen label says “Records.”

## Privacy line on Read Only

Read Only shows a pill, “Sensitive fields hidden,” and it also shows a Driver Lic Num column. The short View window does not show the license number. The script never says that sensitive details are hidden. Confirm what leadership wants that pill to promise before anyone reads it aloud. Cover the license column in any frame where it is readable, unless the value is a demonstration number from this packet.

Date of birth and Social Security number are not on the form. Phone and email can be stored. This sample leaves both blank.

## Counts that depend on the day

With the fictitious sample, a session on November 12, 2026 showed:

| Count | Value | Why |
| --- | --- | --- |
| Total | 6 | All six people, excluding anyone archived |
| Active | 3 | Rivera, Patel, Nguyen |
| InActive | 3 | Chen, Brooks, Ortiz |
| Full Clearance | 3 | Rivera, Chen, Nguyen |
| One Time Visit | 1 | Patel |
| Query Due | 1 | Nguyen, inquiry date 03/15/2026 |

Read Only lists five people. Patel’s one-time visit is omitted there, and the One Time Visit count still shows 1.

Chen is shaded because security awareness training expired 02/01/2026. Brooks and Ortiz are inactive because required dates are missing. They are not shaded. A shaded row means expired security awareness training, not every inactive reason.

Nguyen’s certification dates are 01/20/2028. On January 21, 2028, Nguyen no longer counts as active unless those dates change. Reconfirm the badges if the shoot is later than January 20, 2028. Rivera’s next inquiry, 06/12/2029, becomes due on that date, and Query Due would then show 2.

## Screens still needed only if the story grows

The one-minute cut is covered by the stills in this folder. Capture these only for a longer cut, and only from the fictitious sample:

- A live open of the record window, if the edit should use the real motion instead of a dissolve between stills.
- The change log immediately after a save, if the “Applicant record saved” banner should be timed rather than cropped.
- Leadership’s chosen title card and end card. Those are graphics, not application screens.

No additional product screen is required to tell the story in the script.

## Keep off camera

- The repository’s built-in applicant file and named operator list. They contain real staff information and access codes.
- Settings and every card inside it.
- The sign-in code, the authenticator setup, database fields, and single sign-on fields.
- The footer.
- Fingerprint or inquiry results other than Clear. The form can show more serious outcomes. This sample does not.
- Archive and delete. They work for administrators. They are a procedure, not this story.

## How the reference frames were made

The stills come from a temporary local copy of the page. That copy loaded only the fictitious sample, the operator list was emptied, and the footer was hidden. The storage line underneath, had it been left visible, read `Storage: this browser`. Nothing in the frames was taken from the built-in staff file.

To recreate motion later, point a separate copy of the page at `sample-data/fictitious-test-applicants.js`. Leave the project’s own sample file untouched. Keep Settings closed on that copy as well: a normal copy of the application code still contains the operator list even when the applicant sample has been swapped.
