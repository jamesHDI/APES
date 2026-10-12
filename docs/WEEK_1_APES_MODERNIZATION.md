# APES Week 1 Modernization Foundation

## Decision

APES remains a standalone application and repository. It will adopt the EVES backend technology pattern—Express, Prisma, MySQL, server-side authorization, audit trails, and private uploads—without merging into EVES.

## Target boundary

The React application will call an APES-owned `/api` service. It will no longer authenticate against, query, or mutate Supabase directly. The API becomes the sole authority for identity, evaluation workflow transitions, scoring persistence, notifications, and file access.

## Source-to-target map

| Current APES / Supabase entity | APES target model | Migration treatment |
| --- | --- | --- |
| `employees` | `User`, `Company`, `Department` | Match by verified corporate email or employee number. Do not import the legacy password column. |
| `evaluation_cycles` | `EvaluationCycle` | Preserve dates, period, and status. Recalculate counters from assignments. |
| `evaluation_templates`, `kpis`, `core_values` | `EvaluationTemplate`, `Kpi`, `CoreValue` | Normalize template content; retain JSON only for rating standards and genuinely flexible payloads. |
| `evaluations`, ratings JSON, rating tables | `Evaluation`, `KpiRating`, `CoreValueRating` | Prefer relational rating rows; preserve legacy scorecard JSON separately only if needed for archive fidelity. |
| audit-trail JSON and `evaluation_history` | `EvaluationWorkflowEvent` plus archival export | Import ordered workflow events. Never allow client creation of state events. |
| signatures and evidence files | Private object storage plus attachment metadata | Copy only approved files; issue signed URLs after authorization. |
| notifications/direct messages | API-managed notification module | Rebuild after evaluation APIs are stable. |

## Workflow contract

Only the server may change evaluation status. The frontend requests named actions; it never submits a `status` field.

| Track | Path |
| --- | --- |
| Regular employee | `DRAFT` → `PENDING_DEPT_HEAD` → `PENDING_POD` → `COMPLETED` → `ARCHIVED` |
| Department head | `DRAFT` → `PENDING_PRESIDENT` → `PENDING_POD` → `COMPLETED` → `ARCHIVED` |
| Revision | An authorized reviewer may return a pending evaluation to `REOPENED`; only the assigned employee may resubmit it. |

The exact decision whether a supervisor is a distinct mandatory step will be confirmed during UAT before the first production migration. Current APES screens use both supervisor and department-head labels, so it must not be inferred from a role name alone.

## Security baseline inherited from EVES patterns

- Server-side bcrypt password hashes; separate access and refresh secrets; httpOnly secure cookies.
- Explicit CORS allow-list, Helmet, rate limiting, validation, and role/ownership checks.
- Controller → service → Prisma separation for every write.
- Append-only workflow/audit events created in the transaction that changes a record.
- Private uploads with authorization before signed download URLs.
- No Supabase anon-key database access or browser-local authorization fallback.

## Week 1 completion criteria

1. Target schema is reviewed with HR/POD and database owners.
2. User matching rules are accepted: employee number first, corporate email second; unmatched records are quarantined.
3. Regular and department-head workflow transitions are signed off.
4. A non-production MySQL database and APES API environment variables are available.
5. Supabase export and attachment inventory can be taken under a controlled read-only window.

## Deliberate non-actions

- No Supabase data has been copied or deleted.
- No existing employee passwords will be migrated.
- No frontend service has been redirected yet.
- No change has been made to EVES.
