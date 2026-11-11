# Verbosele source-owned design catalog

Run `node design/workbench/server.mjs`, then open http://127.0.0.1:8783/design/.
Run `node design/workbench/check.mjs` for production hashes and central contract validation. Set DESIGN_SYSTEM_ROOT if the central checkout is elsewhere.
Run `node design/workbench/test.cjs` for desktop/mobile browser fixtures and interrupted/repeated real-control flows. Existing application regression tests remain under tests/.

The server serves an explicit allowlist of actual production files, not copies or lookalikes. Only fixture HTML receives a preview setup script before production scripts. That setup uses private in-memory storage and deterministic Dictionary/Datamuse responses, without reading existing game progress. The CSP prohibits remote requests and form submissions. Non-GET requests, arbitrary files, unknown fixture names and Host rebinding are rejected. No source, gameplay or palette is changed.

The eight token modes document the existing CSS cascade; they are inspection metadata, not a new production stylesheet. Source provenance and six production SHA-256 hashes are in design/baseline.json. Integration commits are separate from that inspected base revision.

Preserved limits: original Standard light has known contrast exceptions, nine-letter rows can overflow narrow viewports, and 200% text may overflow the original status line. These are documented in the original README. Screen-reader speech, physical devices, other engines, tab favicon pixels and live dictionary quality are not covered. No accessibility-conformance claim. No public redistribution or deployment is authorized.

No parent stethem.com submodule pointer is committed by this integration. Central registry synchronization is explicit and separate.

## Verified theme handshake

Preview-only theme.mjs installs the canonical, SHA-256-pinned theme adapter. It validates requested modes and computed source tokens before acknowledging the central parent request nonce. Verbosele applies appearance through existing production controls; Prosocial supports only its actual light palette. The adapter checks the parent window, message type and request ID, and is disposed on page exit. The strict server allows cross-origin module loading for sandboxed central previews only on its existing public-file allowlist.
