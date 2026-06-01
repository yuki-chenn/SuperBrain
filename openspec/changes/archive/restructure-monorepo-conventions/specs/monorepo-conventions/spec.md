## ADDED Requirements

### Requirement: Top-level apps + packages workspace layout

The repository SHALL keep deployable applications under `apps/*` and reusable libraries under `packages/*`, both registered as pnpm workspaces in `pnpm-workspace.yaml`.

#### Scenario: New deployable surface
- **WHEN** a new deployable surface is added (e.g. an admin SPA, a worker service)
- **THEN** it is created at `apps/<name>/` with its own `package.json` whose `name` is the unscoped slug (e.g. `web`, `api`, `worker`)
- **AND** it is NOT placed under `packages/`

#### Scenario: New shared library
- **WHEN** a new internal library that will be `import`-ed by two or more apps is added
- **THEN** it is created at `packages/<name>/` with `package.json` `name = "@brain-games/<name>"` and `private: true`
- **AND** it exposes a single entry via `main` + `types` + `exports`

### Requirement: NestJS feature folders live directly under `src/`

The API application SHALL keep every feature folder as an immediate child of `apps/api/src/`. Concrete game implementations SHALL live as subfolders of `apps/api/src/games/<slug>/`, never as a parallel sibling tree.

#### Scenario: Adding a new game module
- **WHEN** a new game `foo-puzzle` is added to the API
- **THEN** its files are placed under `apps/api/src/games/foo-puzzle/` (adapter, module, optional service/controller)
- **AND** they are registered in `apps/api/src/games/games.module.ts`
- **AND** no parallel `game-modules/`, `game-implementations/`, or similar sibling tree is created

#### Scenario: Adding a new non-game feature
- **WHEN** a new cross-cutting feature (e.g. `notifications`) is added
- **THEN** it is created at `apps/api/src/notifications/` with its own `notifications.module.ts`
- **AND** registered in `apps/api/src/app.module.ts`

### Requirement: Database module sits under `src/database/`, not `src/prisma/`

The API SHALL keep the Nest module wrapping `PrismaClient` at `apps/api/src/database/`. The directory `apps/api/prisma/` SHALL remain reserved exclusively for Prisma CLI artifacts (`schema.prisma`, `migrations/`, `seed.ts`, `seed/`).

#### Scenario: Importing PrismaService
- **WHEN** application code needs a `PrismaService` instance
- **THEN** the import path is `from '<relative>/database/prisma.service'`
- **AND** there is no `apps/api/src/prisma/` directory

#### Scenario: Running Prisma CLI
- **WHEN** `prisma migrate dev` or `prisma db seed` is run
- **THEN** Prisma reads `apps/api/prisma/schema.prisma` (unmoved)
- **AND** migrations are written under `apps/api/prisma/migrations/`

### Requirement: Workspace tasks are routed through Turborepo

Root `package.json` scripts for `dev`, `build`, `test`, and `lint` SHALL invoke `turbo run <task>` rather than `pnpm -r <task>`.

#### Scenario: Running root build
- **WHEN** a contributor runs `pnpm build` at the repo root
- **THEN** turbo orchestrates the build in topological order based on `dependsOn: ["^build"]`
- **AND** outputs declared under `outputs` are cached

#### Scenario: Running root dev
- **WHEN** a contributor runs `pnpm dev`
- **THEN** turbo runs every package's `dev` script concurrently with `persistent: true` and `cache: false`

#### Scenario: Running root test or lint
- **WHEN** `pnpm test` or `pnpm lint` is run
- **THEN** turbo executes the matching task across packages with caching enabled

### Requirement: Turborepo tasks declare explicit cache inputs

`turbo.json` SHALL declare an `inputs` field on every cacheable task so cache keys depend only on files relevant to that task. The `dev` task is exempt because it is non-cacheable.

#### Scenario: Editing an unrelated file
- **WHEN** a contributor edits a file outside any task's `inputs` (e.g. `README.md`, `docs/**`, `openspec/**`)
- **THEN** turbo reports a cache hit for `build`, `test`, and `lint` of every package
- **AND** no compilation runs

#### Scenario: Editing a source file
- **WHEN** a contributor edits a file matched by `inputs` (e.g. anything under `src/**`)
- **THEN** the affected package's `build` cache is invalidated
- **AND** dependents are rebuilt due to `dependsOn: ["^build"]`

### Requirement: Internal package naming uses a consistent scope

Every workspace under `packages/*` SHALL declare `name` with the `@brain-games/` scope and use `workspace:*` for cross-package dependencies.

#### Scenario: Cross-package import
- **WHEN** an app or another package imports from a workspace library
- **THEN** the bare specifier is `@brain-games/<name>` (e.g. `@brain-games/shared`)
- **AND** the consuming `package.json` records the dependency as `"workspace:*"`
