# NIST Appendix — Controlled Reference Publications

Status: CURRENT
Owner: Security/privacy authority — TBD
Version: 0.1.0
Approval: Pending (owner approval of the governance baseline covers this appendix)
Date: 2026-10-08

Provenance: The five publications below were downloaded directly from nvlpubs.nist.gov on 2026-10-08 by the Cursor primary agent at the project owner's direction. They are authoritative NIST publications (reference authority: official U.S. government publications; local copies are controlled references, not project decisions). Verify integrity against `SHA256SUMS` in this directory.

## Controlled publications

| File | Publication | Edition | Source |
|---|---|---|---|
| `NIST.CSWP.29.pdf` | NIST Cybersecurity Framework (CSF) | 2.0 (Feb 2024) | https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf |
| `NIST.SP.800-218.pdf` | Secure Software Development Framework (SSDF) | 1.1 (Feb 2022) | https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-218.pdf |
| `NIST.CSWP.01162020.pdf` | NIST Privacy Framework | 1.0 (Jan 2020) | https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.01162020.pdf |
| `NIST.SP.800-218A.pdf` | SSDF Community Profile: Generative AI and Dual-Use Foundation Models | 800-218A (Jul 2024) | https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-218A.pdf |
| `NIST.SP.800-204D.pdf` | Strategies for Integrating Software Supply Chain Security in DevSecOps CI/CD | 800-204D (Feb 2024) | https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-204D.pdf |

## Integrity verification

```powershell
cd "docs/appendices/nist"
Get-Content SHA256SUMS | ForEach-Object {
  $hash, $file = $_ -split '\s+', 2
  $actual = (Get-FileHash -LiteralPath $file.Trim() -Algorithm SHA256).Hash.ToLower()
  "{0}  {1}" -f ($(if ($actual -eq $hash) { 'OK' } else { 'FAIL' })), $file.Trim()
}
```

## Currency

Editions current as of the 2026-10-08 download. The security/privacy authority reviews currency at least annually and on any NIST supersession notice. Presence of these references is not a compliance claim; applicability and tailoring decisions are recorded in `project.json` under `security.nistBaseline`.
