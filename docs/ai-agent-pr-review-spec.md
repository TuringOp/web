# AI Agent PR Review Spec (Tech Lead)

**Status:** Draft v1  
**Audience:** Tech leads and senior reviewers merging AI-agent-generated PRs  
**Goal:** Define practical, current best practices for deciding **merge / request changes / escalate**.

## 1) Scope and Decision Model

This spec applies to PRs where an LLM agent generated code, tests, infra changes, or documentation.

### Required PR artifacts

Every agent-authored PR should include:

1. **Change intent**: problem statement + non-goals.
2. **Agent trace bundle**: tool calls, retrieved context, and major decisions.
3. **Validation evidence**: test/lint/build/security outputs.
4. **Risk statement**: what could break and blast radius.
5. **Rollback plan**: revert path and migration/backfill notes (if relevant).

### Merge outcomes

- **Merge**: all required artifacts present, checks pass, risk is acceptable.
- **Request changes**: missing evidence, unclear reasoning, flaky validation, or weak tests.
- **Escalate**: security-sensitive, compliance-sensitive, data-destructive, or high-blast-radius changes.

---

## 2) Agent Traces: Best Practices

Agent traces are not just logs; they are reviewer evidence.

### What good looks like

- **Deterministic chronology**: ordered steps with timestamps and tool inputs/outputs.
- **Decision checkpoints**: explicit "why" at major branch points.
- **Context provenance**: each key claim links to a file, command output, or source artifact.
- **Redaction hygiene**: no secrets, tokens, private keys, or customer PII in trace outputs.
- **Failure visibility**: retries, dead ends, and recovered errors are preserved, not hidden.

### Merge gates for traces

- Trace shows how requirements map to changed files.
- Reviewer can replay key steps locally (or in CI) with equivalent outputs.
- No unexplained large diffs or unexplained tool usage.

### Common anti-patterns

- "Trust me" summaries without evidence.
- Missing failed attempts (hides risk and quality issues).
- Manual edits after agent run without attribution.

---

## 3) Context Engineering: Best Practices

Context engineering is how you control agent quality before reviewing outputs.

### What good looks like

- **Scoped context**: only relevant files/docs are provided; avoid broad noisy dumps.
- **Instruction hierarchy**: objective, constraints, acceptance criteria, then coding style.
- **Explicit boundaries**: what must not be changed (e.g., migrations, API contracts).
- **Grounding first**: require the agent to read real files before proposing edits.
- **Verification-first prompts**: ask for validation commands and expected outcomes.

### Merge gates for context quality

- PR description includes the **prompt contract** used (intent, constraints, acceptance criteria).
- Changed code aligns with stated scope; no opportunistic refactors outside scope.
- Test plan in PR matches acceptance criteria from prompt contract.

### Common anti-patterns

- Oversized context windows that dilute critical constraints.
- Ambiguous asks ("improve this") that create style churn.
- No negative constraints, causing accidental cross-file edits.

---

## 4) MCP Server Skill: Best Practices

MCP usage quality directly impacts trust in agent outputs.

### What good looks like

- **Tool selection discipline**: use specialized tools for search/read/edit/test, not ad hoc shell for everything.
- **Least-privilege access**: narrow permissions, scoped tokens, and environment segregation.
- **Explicit IO contracts**: each MCP call has clear inputs, expected outputs, and error handling.
- **Idempotent workflows**: repeated calls do not corrupt state.
- **Auditability**: MCP call history is preserved and linkable from the PR.

### Merge gates for MCP usage

- All state-changing tool calls are justified and reversible.
- External side effects (deploys, DB writes, billing actions) are either absent or clearly approved.
- Tool errors are surfaced and handled; no silent fallbacks.

### Common anti-patterns

- Hidden side effects from convenience scripts.
- Unbounded tool calls (wide glob edits, mass replacements without guards).
- Mixing local and remote execution contexts without annotation.

---

## 5) LLM Agent Architecture Internals: What Reviewers Should See

You do not need model internals, but you do need architecture transparency for risk.

### Minimum architecture disclosure in PR

- **Planner/executor split** (or equivalent loop model).
- **Retrieval strategy**: what was indexed/searched and ranking approach.
- **Memory model**: ephemeral vs persistent memory, and retention policy.
- **Tool router policy**: how tools were chosen and bounded.
- **Validation loop**: how the agent checked correctness before final output.

### Best-practice architecture traits

- **Separation of concerns**: planning, editing, and verification are distinct steps.
- **Guardrails before action**: constraints validated before writes.
- **Self-check + external-check**: agent self-critique plus deterministic checks (tests/lints/type checks).
- **Budget controls**: limits on tokens, runtime, and side-effectful calls.

### Merge gates for architecture-sensitive PRs

- High-risk changes include architecture notes in the PR body.
- Reviewer can identify where human approval was required.
- Evidence shows deterministic checks, not only model assertions.

---

## 6) PR Review Checklist (Tech Lead)

Use this as a merge template.

- [ ] Scope is clear and constrained; non-goals are explicit.
- [ ] Agent trace bundle is complete and auditable.
- [ ] Changed files are justified by requirements and trace evidence.
- [ ] Tests/lint/build/security checks pass and are relevant to change scope.
- [ ] MCP calls are least-privilege, reversible, and free of hidden side effects.
- [ ] No secrets/PII in traces, diffs, or logs.
- [ ] Risk and rollback plan are realistic.
- [ ] Architecture disclosure is sufficient for risk level.
- [ ] PR can be reproduced locally or in CI.
- [ ] Decision recorded: **Merge / Request changes / Escalate**.

---

## 7) Escalation Triggers

Escalate before merge when any of the following apply:

- Authn/authz logic changed.
- Data deletion or schema migration in production paths.
- Payment, billing, cryptography, key handling, or signing flows changed.
- Public API contract breaks or compliance impact.
- Trace evidence is incomplete for high-impact behavior.

---

## 8) Metrics to Track (Team Health)

Track these to improve agent PR quality over time:

- First-pass merge rate of agent PRs.
- Post-merge defect rate and rollback rate.
- Review cycle time (open -> merge).
- % PRs with complete trace and prompt contract.
- % escalated PRs and escalation outcomes.

These metrics should inform prompt contracts, tooling guardrails, and reviewer playbooks.

