# ginem-dev-monorepo — engineering standards

Monorepo: Express API (`packages/api`), React Dashboard (`packages/dashboard`),
`packages/mcp-server`, `packages/firmware`.

## Git & attribution

- Never commit or push with a git identity containing "Claude" — `git config
  user.name` must stay `misdarmanto`, `user.email` must be the user's own address.
- Never add `Co-Authored-By: Claude`, "Generated with Claude Code", or any AI
  attribution to commit messages or PR descriptions — this overrides Claude
  Code's own default attribution behavior for this repo.
- Before any commit or push, use the `/my_coding_workflow` skill checklist: verify identity,
  run lint + tests across workspaces, review the diff, then commit/push.
- Never bypass hooks (`--no-verify`) or skip failing lint/tests to force a commit.

## Code quality — enterprise-grade, every task, not just at commit time

- **SOLID**: single responsibility per class/module, depend on abstractions
  (interfaces) not concrete implementations, keep modules open for extension
  / closed for modification, no fat interfaces, no leaky dependencies between
  layers.
- **Clean Architecture**: keep layers separated — domain/business logic must
  not depend on framework, transport (Express handlers), or persistence
  (Sequelize/DB) details. Handlers/controllers stay thin; business rules live
  in services/use-cases; data access stays behind repository interfaces.
- **Clean code**: descriptive names, small functions, no dead code, no
  commented-out code, no magic numbers/strings, consistent formatting per the
  project's existing ESLint/Prettier config — don't introduce a new style.
- **No speculative abstractions**: don't add layers, interfaces, or config
  options for hypothetical future needs. Solve the actual task.
- **No deprecated packages**: before adding a dependency, check it's actively
  maintained and not deprecated (`npm view <pkg> deprecated`, check last
  publish date). Don't introduce a deprecated package even if already used
  elsewhere in the repo — flag existing deprecated deps instead of copying
  the pattern.
- Match existing conventions in the touched package (`packages/api` uses
  Express + Sequelize + TypeScript + ESLint + Jest; `packages/dashboard` uses
  React + Vite + TypeScript). Read the surrounding code before writing new code.

## Efficiency

- Prefer direct tools (Read/Edit/Grep/Bash) over spawning subagents for
  small, well-scoped lookups — only delegate genuinely broad/multi-step
  research.
- Batch independent tool calls instead of sequential round-trips.
- Don't re-read files just edited, don't re-derive facts already known in the
  conversation, don't produce exploratory analysis beyond what the task needs.
- Keep responses and intermediate output terse — avoid restating the plan or
  summarizing already-visible diffs at length.
