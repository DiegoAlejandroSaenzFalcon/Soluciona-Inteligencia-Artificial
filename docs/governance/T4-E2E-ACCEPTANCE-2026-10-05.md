# T4 — E2E Acceptance Evidence
## Corte verificable: 2026-10-05

PO: Diego Alejandro Saenz Falcon
PR: #27
Branch: feature/t4-completion-multicliente
Verified commit: 592f56026a734ddd55d63940cef1afeb2e89bb5a

## Test design

The acceptance target is the real commercial web runtime, not static source inspection.

For each tenant pack:
1. Start the real Node runtime with `node index.js --cliente <slug>`.
2. Disable WhatsApp transport for the deterministic test boundary.
3. Override the HTTP port to an isolated test port.
4. Verify public `GET /api/branding` returns the tenant identity, expected branding color, segment and business name.
5. Verify the real panel route `GET /panel-empresarial` returns HTTP 200 and loads `panel-branding.js`.
6. Verify `GET /panel-branding.js` is actually served by the runtime and contains the branding functions.
7. Repeat for `demo` and `demo2` to demonstrate tenant-specific branding isolation.

This distinguishes source-level implementation from runtime E2E evidence.

## Evidence

- E2E Multi-client branding: SUCCESS — check run 111636229991.
- E2E result: 1 test, 1 pass, 0 fail, 0 skipped.
- Unit Tests (node:test): SUCCESS — check run 111636229772.
- Unit result: 63 tests, 62 pass, 0 fail, 1 skipped.
- Gitleaks: SUCCESS — check run 111636229472.
- npm audit (critical threshold): SUCCESS — check run 111636230395.
- TypeScript scaffold typecheck: FAILURE but explicitly non-blocking by workflow contract — check run 111636229970.

## Defect found and corrected by E2E

The first E2E attempt exposed a real integration defect: `/panel-branding.js` was allowed through the authentication gate but was not included in the runtime's public panel-script serving branch. The runtime therefore returned the wrong content for that URL.

The fix adds `/panel-branding.js` to the actual public panel-script handler. The passing E2E run above is evidence for the corrected runtime path.

## Boundary

This E2E verifies local deterministic multi-client branding and panel integration. It does not claim Meta WhatsApp or DIAN external E2E, production deployment, or PostgreSQL production readiness.
