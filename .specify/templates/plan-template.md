# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Reference**: `.specify/memory/constitution.md`

This feature MUST comply with all seven core principles:

### I. Supabase-First Architecture ✓
- [ ] Uses Supabase for data persistence (PostgreSQL)
- [ ] Auth via Supabase Auth (if applicable)
- [ ] Backend logic via Edge Functions (if applicable)
- [ ] RLS policies defined for new tables
- [ ] Real-time subscriptions used (if applicable)
- [ ] File storage via Supabase Storage (if applicable)

### II. Component-Driven UI ✓
- [ ] Uses shadcn/ui components (no custom unstyled components)
- [ ] Components under 500 lines (refactor if exceeded)
- [ ] Custom hooks for reusable logic
- [ ] TanStack Query for server state (if applicable)
- [ ] TypeScript interfaces defined for props

### III. Test-First Development (NON-NEGOTIABLE) ✓
- [ ] Tests written BEFORE implementation (TDD enforced)
- [ ] Unit tests for all custom hooks
- [ ] Integration tests for pages/complex components
- [ ] Contract tests for Edge Functions (if applicable)
- [ ] Target: 70% overall coverage, 90% for critical paths

### IV. AI Cost & Quality Management ✓
- [ ] Prompts versioned and stored in code (if AI used)
- [ ] Token usage tracked in `api_usage` table
- [ ] Cost calculated and logged per request
- [ ] Quality gates for generated content validation
- [ ] Rate limiting implemented

### V. Security & Compliance ✓
- [ ] Input validation with Zod schemas
- [ ] LGPD consent required (if handling personal data)
- [ ] RLS policies prevent unauthorized access
- [ ] No secrets in code (environment variables only)
- [ ] XSS/SQL injection prevention applied

### VI. Performance & User Experience ✓
- [ ] Loading states for async operations
- [ ] Error states with actionable messages
- [ ] Optimistic updates where safe
- [ ] Pagination/virtualization for large lists (>50 items)
- [ ] Performance targets met (LCP <2.5s, TTI <3.5s)

### VII. Observability & Analytics ✓
- [ ] User actions tracked via `lib/analytics.ts`
- [ ] Structured logging with context
- [ ] Errors logged with stack traces
- [ ] API usage tracked (if applicable)

**Violations Requiring Justification**: List any principle violations below and explain why simpler alternatives were rejected.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
