# Future Considerations

Status: DRAFT
Owner: Product and governance authorities — TBD
Version: 0.1.0 (document draft)
Approval: Pending
Date: 2026-10-05

Recommendations are not approvals or authorized work.

| ID | Consideration | Recommendation | Owner | Rationale |
| --- | --- | --- | --- | --- |
| FC-001 | Automated governance enforcement | FUTURE | Governance authority — TBD | Explicitly deferred by initialization request. No enforcement software or workflow is created. |
| FC-002 | Tool-specific governance adapters | FUTURE | Technical and governance authorities — TBD | Explicitly deferred by initialization request. No adapters are created. |
| FC-003 | Admin Console Security & Authentication (MFA, SSO, session management, API keys & webhooks, database credentials) | ACTIVE prototype for Admin-Global; production SSO remains FUTURE | Security/privacy and technical authorities — TBD | Owner activated the Settings section for named Admin-Global users on branch Security-&-Authentication. MFA connects named users to the Microsoft Authenticator app with a browser-local time-based code. Database credentials save Windows integrated SQL settings on the API host and do not store a SQL password in the browser. Idle timeout and recorded SSO/token settings remain browser-local. The SSO card records Entra tenant, client, redirect, URL, and role-claim fields on the API host, plus SAML basic configuration. Tenant ID, Client ID, Entity ID, and Reply URL still need to be set for this application. Live City SSO and live SAML login are not connected. Production auth remains DEC-015 City SSO / Entra ID. |
| FC-004 | Admin Console Users, Roles & Permissions (directory table, custom roles builder, bulk actions) | FUTURE | Product and security/privacy authorities — TBD | Owner requested placeholder sections. Prototype Admin / Read Only users remain the only active access-control functions. |
| FC-005 | Admin Console System Preferences & Feature Flags (global defaults, feature toggles, rate limiting) | FUTURE | Technical and product authorities — TBD | Owner requested placeholder sections. Controls are not connected and do not change tracker behavior. |
| FC-006 | Admin Console Audit Logs & Compliance (searchable immutable activity stream) | FUTURE | Security/privacy and QA authorities — TBD | Owner requested placeholder sections. Applicant change log in the record drawer remains the only active audit trail. |
| FC-007 | Use the product-owner confirmation checklist in the next application version build-out | FUTURE | Jessica Solis (product) + Annamarie Zambrano (outcome, joint) | Owner: the checklist is for the next version, not this SPRINT-007 prototype. Source files are `docs/planning/product-owner-confirmation-checklist.md` and `.docx` (already in the repo). The Office lock file `~$oduct-owner-confirmation-checklist.docx` is not a source artifact and is not committed. |
