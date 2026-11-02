# INTDEV connectivity (redacted)

Date: 2026-10-22 (inventory redacted 2026-11-02)
From: Brett workstation (agent session)
Target: `DTIAPPSINTDEV`

This note no longer lists host addresses, open ports, key fingerprints, or
authorized-key paths. Those details stay on the operator workstation and the
host, not in git.

## What remains true

- Workstation SSH to `DTIAPPSINTDEV` works for authorized operators.
- `clearancetracker.cabq.gov` DNS and the HTTPS certificate are still open.
- DBA grant and the `COA\svc-clearancetracker` password stay host-only.

## Blockers for live IIS apply

1. DNS (and cert) for `clearancetracker.cabq.gov` pointing at INTDEV.
2. Confirm site path (scripts default `D:\inetpub\clearancetracker`).
3. DBA grant so `COA\svc-clearancetracker` can open the INTDEV SQL database.
4. Service-account password for `COA\svc-clearancetracker` at install time. Do not commit passwords.

## Host apply

Site files, IIS site `ClearanceTracker`, and service `ClearanceTrackerApi` were applied on 2026-10-22. See [iis-hosting.md](iis-hosting.md).
