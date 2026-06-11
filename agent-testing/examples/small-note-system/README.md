# Small Note System Offline Fixture

This directory documents the `smallNoteSystemFixture` exported from `agent-testing/src/examples`.

## Fixture Identity

- Fixture ID: `small-note-system`
- Fixture name: `Small Team Notes`
- Scope: offline deterministic validation of the `agent-testing/` pipeline
- Runtime status: no runtime integration, no real system connection, no report file output

## Target System

The fixture models a small note system for 10-30 team users. The system includes:

- authentication
- note CRUD
- search
- file upload
- sharing
- backup and restore
- logging
- admin permissions

The target deployment profile is a `single_vps` style deployment with database-backed storage, authentication, authorization, multi-user use, and admin roles.

## Requirements Covered

The fixture requirements include Chinese and English statements that can be recognized by deterministic acceptance extraction rules:

- Users can log in and create, edit, and delete notes.
- Private notes must not be visible to other regular users.
- Shared notes are visible to authorized users.
- Notes can be searched by title and body.
- Attachments are supported with file size and type limits.
- Database backup runs daily.
- Login failures, save failures, upload failures, and permission denials are logged.
- The service supports 10-30 concurrent users.
- A restore procedure from backup exists.

## Raw Evidence Included

The fixture includes static raw evidence only:

- passing API-style login sample
- passing human-observation note creation sample
- passing API-style search sample
- failing unauthorized private-note access sample
- failing oversized upload feedback sample
- failing or insufficient restore-record sample
- inconclusive oral backup claim
- `agent_reasoning + pass` logging claim that should be downgraded during normalization

These records are not actual test results. They are static examples for exercising evidence normalization, severity classification, defect analysis, regression suggestion, release recommendation, report generation, trace, and audit draft behavior.

## Expected Triggered Capabilities

Running `validateSmallNoteSystemScenario()` should exercise:

- acceptance extraction
- test case generation
- evidence normalization
- severity classification
- defect analysis
- regression suggestion
- release recommendation
- report generation
- trace generation
- approval and audit draft fields

## Boundary

This fixture does not connect to a real system, browser, API, database, log source, MCP server, or LLM. It does not execute real system tests and does not write a Markdown report file.

Use it only to validate the deterministic offline pipeline shape and safety boundaries.
