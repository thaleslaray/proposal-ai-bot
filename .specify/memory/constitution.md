<!--
  SYNC IMPACT REPORT
  ==================
  Version Change: N/A → 1.0.0
  Type: MAJOR (Initial constitution creation)

  Modified Principles: N/A (new document)
  Added Sections:
    - I. Supabase-First Architecture
    - II. Component-Driven UI
    - III. Test-First Development (NON-NEGOTIABLE)
    - IV. AI Cost & Quality Management
    - V. Security & Compliance (LGPD/WhatsApp)
    - VI. Performance & User Experience
    - VII. Observability & Analytics
    - Monetization Strategy
    - Development Workflow
    - Governance

  Removed Sections: N/A (initial version)

  Templates Requiring Updates:
    ✅ .specify/templates/plan-template.md - Constitution Check section aligned
    ✅ .specify/templates/spec-template.md - Requirements align with principles
    ✅ .specify/templates/tasks-template.md - Task categorization reflects principles
    ⚠ .specify/templates/commands/*.md - No command templates exist yet

  Follow-up TODOs:
    - Create command templates for common workflows (deploy, migrations, etc.)
    - Establish testing coverage baseline and tracking mechanism
    - Document AI prompt versioning strategy
-->

# MeuPRD Constitution

## Core Principles

### I. Supabase-First Architecture

**MeuPRD MUST leverage Supabase as the primary backend infrastructure.**

- All data persistence MUST use PostgreSQL via Supabase
- Authentication MUST use Supabase Auth (currently WhatsApp OTP integration)
- Backend logic MUST be implemented as Supabase Edge Functions (Deno)
- Row Level Security (RLS) MUST be enabled on all tables with explicit policies
- Real-time features MUST use Supabase Realtime subscriptions (events, notifications)
- File storage MUST use Supabase Storage (avatars, assets)
- Service role operations MUST be restricted to Edge Functions only

**Rationale**: Supabase provides a scalable BaaS eliminating infrastructure overhead while maintaining PostgreSQL's robustness. RLS enforces security at the database level, making authorization bugs less likely. Edge Functions enable serverless backend logic with minimal latency.

### II. Component-Driven UI

**All UI MUST be built using shadcn/ui components and follow atomic design principles.**

- Use shadcn/ui (Radix UI primitives) as the single source of truth for UI components
- Custom components MUST follow the pattern: `src/components/[domain]/[ComponentName].tsx`
- Components MUST be typed with explicit TypeScript interfaces
- Reusable logic MUST be extracted to custom hooks in `src/hooks/`
- State management MUST use React Context for global state + TanStack Query for server state
- Components MUST NOT exceed 500 lines - refactor into smaller units if necessary
- Accessibility (ARIA) MUST be preserved from Radix primitives

**Rationale**: shadcn/ui provides a consistent, accessible design system. TanStack Query handles server state caching and synchronization, reducing boilerplate and bugs. Context API manages cross-cutting concerns like authentication without prop drilling.

### III. Test-First Development (NON-NEGOTIABLE)

**TDD is MANDATORY: Tests written → User approved → Tests fail → Then implement.**

**Red-Green-Refactor cycle strictly enforced:**

1. **RED**: Write failing test(s) that capture requirements
2. **GREEN**: Implement minimum code to pass tests
3. **REFACTOR**: Improve code quality without breaking tests

**Testing Requirements:**
- **Unit Tests**: All custom hooks MUST have unit tests (Vitest)
- **Integration Tests**: All pages and complex components MUST have integration tests (Testing Library)
- **Contract Tests**: All Edge Functions MUST have contract tests validating request/response schemas
- **Coverage Target**: Minimum 70% overall, 90% for critical paths (auth, payments, PRD generation)
- Tests MUST run in CI/CD before merge
- Tests MUST use real-world scenarios from user stories

**Current Status**: Legacy code at ~30-40% coverage is grandfathered. ALL NEW CODE must follow TDD.

**Rationale**: TDD catches bugs early, serves as living documentation, and enables confident refactoring. The upfront time investment pays dividends in reduced debugging and maintenance. Non-negotiable status ensures discipline even under pressure.

### IV. AI Cost & Quality Management

**AI-generated content MUST balance quality with cost efficiency.**

**OpenAI Integration Requirements:**
- All prompts MUST be versioned and stored in code (not hardcoded strings)
- Token usage MUST be tracked per request in `api_usage` table
- Cost per request MUST be calculated and logged (USD)
- Prompt changes MUST be tested for quality regression before deployment
- Rate limiting MUST prevent cost runaway (respect role-based daily limits)
- Failed generations MUST be logged with context for debugging
- Prompt templates MUST include clear instructions, examples, and output format specifications

**Quality Gates:**
- Generated PRDs MUST parse successfully into structured markdown
- Extracted metadata (category, preview) MUST be validated before storage
- User feedback mechanisms (thumbs up/down) MUST be tracked for prompt iteration

**Cost Optimization:**
- Use appropriate model tier (GPT-4 vs GPT-3.5) based on complexity
- Implement result caching for similar inputs
- Monitor average cost per PRD and alert on anomalies (>$0.10/PRD)

**Rationale**: AI is the core value proposition but can become a cost center if unmanaged. Tracking and versioning enable optimization. Quality gates prevent poor UX from undermining the product's value.

### V. Security & Compliance (LGPD/WhatsApp)

**Security and privacy MUST be enforced at multiple layers.**

**Authentication Security:**
- WhatsApp OTP codes MUST expire after 5 minutes
- Maximum 3 OTP verification attempts per code
- Rate limiting on OTP generation: 3 requests per phone per hour
- OTP codes MUST be service_role only (no client access via RLS)
- Session tokens MUST use Supabase Auth JWT with automatic refresh

**LGPD Compliance:**
- LGPD consent MUST be obtained before any data processing
- Consent modal MUST block app usage until accepted or declined
- Consent timestamp MUST be stored in `profiles.lgpd_consent_date`
- Users MUST be able to control email visibility (`show_email` flag)
- Users MUST be able to set PRDs as private (`is_public` flag)
- Data deletion requests MUST be honored within 7 days (admin tools required)

**Input Validation:**
- ALL user inputs MUST be validated with Zod schemas (frontend + backend)
- SQL injection MUST be prevented via parameterized queries (Supabase client handles this)
- XSS MUST be prevented - sanitize markdown output (use trusted libraries)
- CSRF protection MUST leverage Supabase's built-in mechanisms

**Secrets Management:**
- NEVER commit secrets to git (use `.env.example` template only)
- All secrets MUST be stored in Supabase Edge Function secrets
- Service role keys MUST only be used in backend (never exposed to client)

**Rationale**: User trust is paramount for a SaaS handling phone numbers and personal ideas. LGPD compliance is legally required in Brazil. Multi-layer security (RLS + application-level + validation) reduces attack surface.

### VI. Performance & User Experience

**The application MUST feel fast and responsive across all user roles.**

**Performance Targets:**
- Initial page load (LCP): < 2.5 seconds on 4G
- Time to Interactive (TTI): < 3.5 seconds
- PRD generation API response: < 8 seconds (OpenAI dependent)
- Database queries: < 200ms p95 (optimize with indexes)
- Real-time updates: < 500ms latency (Supabase Realtime)

**UX Requirements:**
- Loading states MUST be shown for all async operations (skeleton loaders preferred)
- Error states MUST display actionable messages (not generic "error occurred")
- Success feedback MUST be immediate (toast notifications via Sonner)
- Optimistic updates MUST be used where safe (likes, remix actions)
- Cooldown timers MUST have visible countdown (2s between PRD generations)
- Pagination or virtualization MUST be used for lists > 50 items (Community gallery)

**Optimization Strategies:**
- Code splitting by route (Vite lazy loading)
- Image optimization (WebP, lazy loading, proper sizing)
- TanStack Query caching (5min default, configurable per query)
- Minimize re-renders (useCallback, useMemo, React.memo where beneficial)
- Database indexes on foreign keys and frequently filtered columns

**Monitoring:**
- Sentry MUST capture frontend errors with context
- Performance metrics MUST be tracked (web vitals)
- Slow queries MUST be logged and reviewed monthly

**Rationale**: Performance directly impacts conversion and retention. Users expect instant feedback even when backend processes take time. Proactive monitoring catches regressions before users complain.

### VII. Observability & Analytics

**ALL user interactions and system events MUST be observable and analyzable.**

**Structured Logging:**
- Backend logs MUST use structured format (JSON) with severity levels
- Logs MUST include: `timestamp`, `user_id`, `action`, `context`, `result`
- Admin actions MUST be logged separately in `admin_logs` table
- Errors MUST be logged with stack traces and reproduction context
- Logs MUST be searchable (consider log aggregation tool in future)

**Analytics Tracking:**
- User actions MUST be tracked via centralized `lib/analytics.ts`
- Events to track: `prd_generated`, `prd_viewed`, `prd_liked`, `prd_remixed`, `upgrade_modal_opened`, `whatsapp_login_success`, `profile_view`, `social_click`, `search`, `category_filter`
- UTM parameters MUST be captured on signup (`acquisition_tracking` table)
- Conversion funnels MUST be trackable (free → student → lifetime)
- A/B test infrastructure MUST be considered for future optimizations

**API Usage Tracking:**
- Every OpenAI API call MUST be logged in `api_usage` table
- Track: `user_id`, `endpoint`, `tokens_used`, `cost_usd`, `duration_ms`, `success`
- Aggregate cost per user per month for billing validation
- Alert on anomalies (user exceeding expected usage by 3x)

**Health Checks:**
- Edge Functions MUST expose health check endpoints
- Monitor Hotmart API integration success rate (log failures)
- Monitor WhatsApp OTP delivery rate (track sent vs verified)

**Rationale**: Observability enables data-driven decisions. Analytics inform product improvements and marketing ROI. Logging enables debugging production issues without reproducing locally. API usage tracking prevents cost overruns and fraud.

## Monetization Strategy

**MeuPRD's monetization model MUST remain sustainable and aligned with value delivery.**

**Role-Based Limits:**
- **Free**: 1 PRD/day, no voice, no history, community access
- **Student** (R$97/mês): 20 PRDs/day, voice enabled, full history, all features
- **Lifetime** (R$497 one-time): Unlimited PRDs, priority support, early access to new features
- **Admin**: Unlimited access + admin dashboard

**Validation Requirements:**
- Hotmart purchases MUST be validated daily via Edge Function cron job
- Validation cache MUST be refreshed every 24 hours
- Auto-upgrade users when purchase detected
- Auto-downgrade on subscription expiration (grace period: 3 days)

**Upgrade Prompts:**
- Daily limit reached MUST trigger upgrade modal
- Modal MUST clearly show benefits of each tier
- Modal MUST NOT be shown more than 2x per session (avoid annoyance)
- Conversion events MUST be tracked for funnel analysis

**Future Monetization (Planned):**
- Email marketing funnels targeting inactive users and free-tier limit-reached users
- Team/Organization plans (future consideration)
- API access for power users (future consideration)

**Rationale**: Clear tier differentiation ensures users understand value at each level. Automated validation reduces manual support overhead. Conversion tracking enables optimization.

## Development Workflow

**Code changes MUST follow a structured, reviewable process.**

**Branching Strategy:**
- `main` branch MUST always be deployable
- Feature branches MUST follow pattern: `[###]-feature-name`
- Hotfixes MUST follow pattern: `hotfix-[description]`
- Branch names MUST be lowercase with hyphens

**Commit Messages:**
- MUST follow conventional commits: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`
- Example: `feat(auth): add phone number validation`
- Breaking changes MUST be marked: `feat!: change API response format`

**Code Review:**
- All PRs MUST be reviewed before merge (exception: hotfixes with post-review)
- PRs MUST include description and testing steps
- PRs MUST pass all tests and linting checks
- PRs SHOULD be < 500 lines (split if larger)

**Pre-Commit Hooks (Husky):**
- Prettier MUST format code automatically
- ESLint MUST check for errors
- TypeScript MUST compile without errors

**Deployment:**
- Merges to `main` MUST trigger automatic deployment (Lovable/Vercel)
- Database migrations MUST be run manually with review (Supabase migrations)
- Edge Functions MUST be deployed via Supabase CLI

**Complexity Justification:**
- ANY deviation from these principles MUST be documented in `docs/TECH_DECISIONS.md`
- Include: what was violated, why needed, simpler alternative rejected, timeline for revisit

**Rationale**: Structured workflow prevents regressions and maintains code quality. Conventional commits enable automated changelog generation. Small PRs get reviewed faster and merge with fewer conflicts.

## Governance

**This constitution supersedes all other development practices and guides.**

**Amendment Process:**
1. Amendments MUST be proposed with clear rationale
2. Impact on existing codebase MUST be assessed
3. Templates MUST be updated to reflect changes
4. Version MUST be incremented semantically:
   - **MAJOR**: Backward incompatible principle changes (e.g., removing TDD requirement)
   - **MINOR**: New principle added or major expansion (e.g., adding new tech stack requirement)
   - **PATCH**: Clarifications, wording fixes, non-semantic refinements
5. Migration plan MUST be documented for breaking changes
6. All team members MUST be notified of amendments

**Compliance Verification:**
- All PRs MUST verify compliance with constitution principles
- Code reviews MUST explicitly check for violations
- Automated checks MUST be added where feasible (linting, test coverage gates)
- Non-compliance MUST be justified in writing (reference specific principle)

**Living Document:**
- Constitution MUST be reviewed quarterly
- Outdated principles MUST be updated or removed
- New patterns and learnings MUST be incorporated

**Tooling Alignment:**
- Use `.specify/templates/plan-template.md` for feature planning (includes Constitution Check)
- Use `.specify/templates/spec-template.md` for feature specifications
- Use `.specify/templates/tasks-template.md` for task breakdown

**Version**: 1.0.0 | **Ratified**: 2025-11-03 | **Last Amended**: 2025-11-03
