# Contributing

Thanks for considering a contribution to the microservices platform demo.

## What this project is

A local-first, portfolio-grade microservices platform: a Node/Express orders
API, a Spring Boot catalog API, a React frontend, and the Kubernetes plumbing
(Helm, ArgoCD, Terraform, monitoring) around them. It is deliberately polyglot
so you can see the same platform concerns handled in different languages.

## Repository conventions

- **Conventional commits** (`feat:`, `fix:`, `refactor:`, `test:`,
  `chore:`, `docs:`, `perf:`). One logical change per commit, with a message
  that describes *why* as well as *what*.
- **Do not rewrite shared history.** The repo is deployed via GitOps
  (ArgoCD), so `git push` to `main` is the deploy step. No force-pushes,
  no rebases that rewrite pushed commits.
- **One logical change per commit.** If a PR touches both the Java API and
  the nginx config, split it.
- **Existing history is not rewritten.** Never `git reset --hard`, rebase
  away, or amend already-pushed commits.

## Running tests

```bash
# Node orders API (uses the built-in test runner)
cd backend-node && npm test

# Spring Boot catalog API
cd backend-java && mvn -B test

# React frontend (Vitest + Testing Library)
cd frontend && npm test
```

## Before you open a PR

- Run the relevant test suite and make sure it is green.
- Run the linters (`npm run lint` in `backend-node` and `frontend`; Maven
  compiles the Java side).
- Keep secrets out of git: no real credentials, no `.env`, no kubeconfigs.
  See `SECURITY.md`.

## What's a good first contribution?

- A test for an uncovered happy path or failure mode.
- Hardening a k8s/Helm manifest (probes, resources, PDBs).
- A clearer README section or a new diagram.
- Closing a gap between the two backends (parity).

If you're unsure whether an idea fits, open an issue first and describe the
change — feedback is cheap, rework is not.