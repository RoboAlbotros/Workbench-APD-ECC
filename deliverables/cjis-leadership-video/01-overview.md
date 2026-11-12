# What the application is

The CJIS Applicant Tracker is the City’s working screen for staff who need to know where an applicant stands in the clearance process.

That process is for people whose work depends on criminal justice information systems. The tracker holds the clearance record. It does not hold the criminal justice information itself, and it does not perform the background check.

## The problem it is built to solve

Clearance tracking has lived in spreadsheets kept by different people. Those files do not share one set of columns, one way of writing a status, or one place to look when a date is coming due. Separate copies also spread applicant details farther than they need to go.

The tracker is the single list meant to replace that habit. The project record describes that as the purpose. It does not document that the switch has already happened citywide, so the video should present the purpose and the screen, not a completed rollout.

## What one record contains

Every applicant is tracked with the same kinds of details:

- Who the person is, which department they are with, and what role they are seeking.
- The clearance type: full clearance, a one-time visit, in progress, or no access given.
- Fingerprints and the outcome of that step.
- Security awareness training and the date it expires.
- Certification dates, including the date the certification expires.
- The next inquiry, calculated as five years after the inquiry was completed. Staff do not type that follow-up date by hand.

A driver’s license field is on the current lists. Treat it as sensitive. The reference frames use obvious demonstration values such as `NM/DEMO1001`. Date of birth and Social Security number are not fields in this application.

## Who it is for

The approved product definition names three groups:

- Staff who need a status, without the full file. On the current screen this is **Read Only**. Choosing View opens a shorter summary.
- Staff who keep the applicant records up to date. The definition calls this a Records role.
- Administrators, who see the full list, add and update applicants, and review the change log. On the current screen this is **Full Admin**.

The current sign-in choices are Admin-Full, Admin-Global, Admin-Staff, and Read Only. There is no Records choice on the sign-in screen, and the header does not show a Records tab. See `04-confirm-before-filming.md` before anyone writes “Records staff” on screen.

The voiceover talks about the work people do, not about those role codes.

## What the screen shows at a glance

After sign-in, six counts sit across the top:

- Total applicants still on the active list
- Active
- InActive (the screen uses that spelling; say “inactive”)
- Full Clearance
- One Time Visit
- Query Due

Active or inactive is calculated. A one-time visit stays active without training dates. Other clearances stay active only while the required training and certification dates are still current. Query Due counts people whose five-year date is today or earlier.

Read Only leaves one-time visits off its list. The One Time Visit count can still appear in the totals. The two will not match if someone counts the rows.

When security awareness training has expired, that row is shaded. A row can be inactive for another reason and remain unshaded. The shade is not a general “problem” marker.

## What an update leaves behind

Opening an applicant shows the record in a window over the list. Administrators also see a change log for that person: when the update happened, who made it, and which part of the record changed. The log names the field. It does not spell out the old and new text.

## What to leave out of a leadership story

These things exist in the project or on a settings screen. They are not the story, and several of them are not finished:

- Settings, user administration, and sign-in codes
- Database connection details
- Multi-factor sign-in setup
- Single sign-on setup (it can be recorded; live single sign-on is not connected)
- The data-protection check
- Import and export (import is hidden; export has been removed from the screen)
- Document upload (the field is hidden)
- Any claim of CJIS compliance, encryption, or a finished security review

The page footer shows `Version 0.1.0-dev.1` and where the copy is storing data. In the sanitized demo that line read `Storage: this browser`. Crop the footer.
