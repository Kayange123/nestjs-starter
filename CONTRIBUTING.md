# Contributing

Use the versions in `.node-version` and `package.json`. Install with the frozen lockfile; automated checks disable dependency lifecycle scripts. Run `pnpm prepare` if you want the local hooks installed.

Keep changes focused. Request DTOs validate transport input; services own business rules and transaction boundaries; resource query mappers expose only approved filters and sorts. Map user responses explicitly and never return password hashes. Add migrations for schema changes; do not edit applied migrations or enable production synchronization.

Before submitting, run lint, formatting checks, type checking, unit/HTTP tests and build. Run PostgreSQL integration tests for database/auth changes and the container smoke test for packaging changes. Use disposable databases. Explain checks that could not run.

Update API and upgrade documentation for contract changes. PRs should describe the concrete problem, resulting behavior, compatibility effects and validation. Commit messages follow conventional commits, have a maximum 72-character subject and reference an issue; the local commit-msg hook checks this.

Discuss ideas and code respectfully. Do not harass contributors, expose private information or publish credentials. Maintainers may remove abusive content and restrict participation. Security issues follow SECURITY.md, not public issue templates.
