# INTDEV connectivity inventory (Phase 1)

Date: 2026-10-22
From: Brett workstation (agent session)
Target: `DTIAPPSINTDEV` / `DTIAPPSINTDEV.coa.cabq.lcl`

## Results

| Check | Result |
| --- | --- |
| DNS A | `10.5.16.108` |
| TCP 22 (SSH) | Open (`TcpTestSucceeded=True`) |
| TCP 5985 (WinRM HTTP) | Open |
| TCP 5986 (WinRM HTTPS) | Closed |
| TCP 445 (SMB) | Open |
| Local `ssh` client | Present |
| `clearancetracker.cabq.gov` DNS | **Does not resolve** (name does not exist) |
| Non-interactive SSH (`BatchMode`) as `E41646` | **Works** with `id_ed25519_clearancetracker` (fingerprint `SHA256:W/MNnIzmZ/jVO5uoH3ya313ZrCfjkyiIm2982Rcw7QE`). Public key appended to `C:\ProgramData\ssh\administrators_authorized_keys`. Local alias: `ssh intdev`. |

## Blockers for live IIS apply

1. DNS (and cert) for `clearancetracker.cabq.gov` pointing at INTDEV.
2. Confirm site path (scripts default `D:\inetpub\clearancetracker`).
3. DBA grant so `COA\svc-clearancetracker` can open the INTDEV SQL database.
4. Service-account password for `COA\svc-clearancetracker` at install time. Do not commit passwords.

## SSH

Workstation key `id_ed25519_clearancetracker` is authorized for `COA\E41646` (local Administrators match). Connect with:

```text
ssh intdev
```

## Host apply

Site files, IIS site `ClearanceTracker`, and service `ClearanceTrackerApi` were applied on 2026-10-22. See [iis-hosting.md](iis-hosting.md).
