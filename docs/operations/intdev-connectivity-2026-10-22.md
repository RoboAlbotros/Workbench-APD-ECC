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
| Non-interactive SSH (`BatchMode`) as `E41646` | **Permission denied** (`publickey,password,keyboard-interactive`) — password or key required |

## Blockers for live IIS apply

1. Interactive credentials for SSH or WinRM (service account or admin). Do not commit passwords.
2. DNS (and cert) for `clearancetracker.cabq.gov` pointing at INTDEV.
3. Confirm site path (scripts default `D:\inetpub\clearancetracker`).
4. DBA grant so `COA\svc-clearancetracker` can open the INTDEV SQL database.
5. GitHub self-hosted runner install on the host (labels `self-hosted`, `Windows`, `intdev`).

## Next command when password is available

```text
ssh E41646@DTIAPPSINTDEV
# then copy repo deploy scripts and run Inventory-Host.ps1 / Install-*.ps1 as admin
```

Or WinRM:

```powershell
$cred = Get-Credential COA\E41646
Enter-PSSession -ComputerName DTIAPPSINTDEV -Credential $cred
```
