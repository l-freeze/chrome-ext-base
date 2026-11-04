# Repository workflow

- Use the existing checkout. Create work branches named `codex-kun/<short-description>` from the latest `master`.
- Keep commits focused on meaningful units: tooling, application behavior, UI, and documentation as appropriate. Avoid combining unrelated changes or splitting a single logical change arbitrarily.
- Run `pnpm run check` before integration. For UI changes, also inspect the built UI in light and dark mode and verify the affected behavior in a browser.
- Merge completed work into `master` using `git merge --no-ff`. Preserve the merge commit; do not squash or fast-forward this delivery flow.
- Push `master` and the work branch as part of delivery, unless the user directs otherwise. Do not force-push or rewrite published history.
- Use `codex-kun` as the Git author/committer name. Do not add an email configuration or invent an email address. This repository uses explicit empty `GIT_AUTHOR_EMAIL` and `GIT_COMMITTER_EMAIL` environment values for commit and merge commands.
- Preserve user changes. Do not reset or discard files to simplify integration.

# Implementation conventions

- Change the extension version only in `package.json`; the build writes it into the manifest. Release packages come from `pnpm run release` / `release:sidepanel` (no source maps, `release/`); `dist/` builds are for verification.
- Use the pinned pnpm version in `packageManager` and Node.js from `.nvmrc`. Install with `pnpm install --frozen-lockfile`; commit `pnpm-lock.yaml` and keep package-manager settings in `pnpm-workspace.yaml`.
- Review dependency lifecycle scripts before adding version-specific `allowBuilds` entries. Keep `strictDepBuilds` enabled; never blanket-approve builds to make installation pass.

- Use TypeScript and SolidJS components with daisyUI / Tailwind CSS; do not add another UI framework without a request. Keep Solid inside `src/ui`: screens receive ports through props, and features, composition, and infrastructure stay framework-independent. Render external or page-derived text through JSX text, never `innerHTML`.
- Put every user-visible string in `public/_locales/*/messages.json` (default locale `en`) and render it with `useI18n()`; keep keys and placeholders identical across locales. Features return reason codes, not UI text.
- Register service worker listeners synchronously at the top level through `startWorker()` and keep no state in worker variables. Define worker messages as `MessageContract`s with both validators in the owning feature's gateway, register handlers and context menu items in `composition/worker.ts`, and never import `src/ui` into the worker.
- Keep the base buildable without samples. List sample-only files in `scripts/samples.ts` and wrap every base-side reference to a sample in `@sample-begin` / `@sample-end` lines; run `pnpm run samples:verify` when changing samples or their wiring. Screen frames render feature sections passed as children by the entrypoint.
- Assemble each feature once in `composition/<feature>.ts` and reuse it from screen and worker compositions. Feature-specific preferences belong to their feature, not to the base settings.
- Keep popup and sidepanel HTML, CSS entries, and screen event handlers independent. Reuse feature ports/UseCases and themes, not the popup screen. Default commands and Actions build popup; sidepanel uses explicit commands and a separate output directory. Verify both variants when changing shared code or build configuration.
- Preserve the hexagonal boundaries described in `docs/architecture.md`. UseCases describe sequential port calls; composition injects concrete implementations explicitly.
- Group by ownership first (`features`, `integrations`, `infrastructure`), then by role. Within a feature, use `controllers` for inbound adapters, `use-cases` for sequences, and `gateways` for outbound adapters. Avoid redundant directory layers and repeating parent context in filenames.
- Feature models, ports, and UseCases must not depend on controllers, gateways, integrations, infrastructure, or UI. Keep small related feature interfaces together in `ports.ts`.
- Keep each operation's input validator private and colocated with its controller, paired with its UseCase. `lib/validation.ts` contains only validator types, execution/error mechanisms, and the Standard Schema adapter, never operation-specific schemas or conditions. The base stays dependency-free; derived products may plug in a Standard Schema library through `fromStandardSchema()`.
- Validate external responses in their client/gateway and stored data in the persistence gateway. Do not reuse controller input schemas at other boundaries. Reuse domain invariants only when they are properties of the same model across entry paths.
- Place provider contracts/clients in `integrations`, reusable technical implementations in `infrastructure`, and feature-specific conversion/persistence in that feature's gateways. Generic modules must not import features.
- UI screens depend on public ports, not concrete controllers or UseCases. Storage contracts require both save Input and load Output validators. Keep generic infrastructure tests independent of feature contracts.
- Keep real-extension E2E tests opt-in under `tests/e2e` (`pnpm run test:e2e`); base flows there must not depend on sample copy, and sample flows go in `tests/e2e/samples/`.
- Use Vitest for input/output contracts and observable errors or persisted results. Avoid tests tied to internal call counts, fine-grained execution order, or DOM snapshots.
- As a base repository, keep default tests focused on reusable validation, HTTP/storage contracts, and build artifacts. Do not fix sample-specific fields, copy, limits, or API payloads in tests unless requested. Derived products can add tests for their own behavior. Run artifact tests after building; discover their entry paths from the manifest rather than fixing sample filenames.
- Keep a small set of optional sample tests in `tests/examples/` as developer references. Begin each file with a comment instructing developers to learn from and then delete it when starting their own feature development. Exclude these examples from default test execution; run them explicitly with `pnpm run test:examples` when editing them. They remain typechecked until deleted along with the sample they import.
- Keep `docs/screenshots/` and the README images current when changing the visible design. These images document the UI; they are not snapshot-test baselines.
