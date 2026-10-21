# Repository workflow

- Use the existing checkout. Create work branches named `codex-kun/<short-description>` from the latest `master`.
- Keep commits focused on meaningful units: tooling, application behavior, UI, and documentation as appropriate. Avoid combining unrelated changes or splitting a single logical change arbitrarily.
- Run `npm run check` before integration. For UI changes, also inspect the built UI in light and dark mode and verify the affected behavior in a browser.
- Merge completed work into `master` using `git merge --no-ff`. Preserve the merge commit; do not squash or fast-forward this delivery flow.
- Push `master` and the work branch as part of delivery, unless the user directs otherwise. Do not force-push or rewrite published history.
- Use `codex-kun` as the Git author/committer name. Do not add an email configuration or invent an email address. This repository uses explicit empty `GIT_AUTHOR_EMAIL` and `GIT_COMMITTER_EMAIL` environment values for commit and merge commands.
- Preserve user changes. Do not reset or discard files to simplify integration.

# Implementation conventions

- Use TypeScript and native DOM APIs with daisyUI / Tailwind CSS; do not add a UI framework without a request.
- Preserve the hexagonal boundaries described in `docs/architecture.md`. UseCases describe sequential port calls; composition injects concrete implementations explicitly.
- Keep feature domain/application independent of adapters, integrations, infrastructure, and UI. Application ports express feature needs, not generic driver or provider contracts.
- Place provider DTOs/clients in `integrations`, reusable technical implementations in `infrastructure`, and feature-specific conversion/persistence in that feature's adapters. Shared infrastructure and validation must not import features.
- UI screens depend on public inbound ports, not concrete controllers or UseCases. Keep generic infrastructure tests independent of feature contracts.
- Route external input and UI operations through the validation-backed controller. Storage contracts require both save Input and load Output validators.
- Use Vitest for input/output contracts and observable errors or persisted results. Avoid tests tied to internal call counts, fine-grained execution order, or DOM snapshots.
- Keep `docs/screenshots/` and the README images current when changing the visible design. These images document the UI; they are not snapshot-test baselines.
