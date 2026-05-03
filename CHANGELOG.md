# Changelog

All notable changes to **Discasa Bot** are documented in this file.

## [2026-05-03-two-channel-discord-storage]

### Changed

- Removed `discasa-trash` from the active setup contract; the bot now creates/reuses only `discasa-drive` and `discasa-index`.
- Restricted uploads to the media channel while keeping app-owned trash/restore as snapshot state.
- Updated README and developer documentation for the two-channel Discord structure.

### Fixed

- Kept permanent delete compatible with legacy storage messages already located in old `discasa-trash` channels without requiring that channel for new setup.

## [2026-05-03-quieter-adapter-logs]

### Changed

- Kept health polling and successful attachment-resolution probes out of routine HTTP logs.
- Attachment resolution now logs only misses as warnings instead of logging every recovery request.
- Documented that current trash/restore behavior is app-owned logical snapshot state, not bot-owned Discord storage movement.

## [2026-05-03-action-logging]

### Added

- Added HTTP request logging with method, route, status, and elapsed time.
- Added console logs for setup inspection/initialization, uploads, storage deletion, drive attachment scans, attachment resolution, snapshot reads, and snapshot writes.

### Changed

- Documented the expanded operational logging behavior and manual verification checklist.

## [2026-05-02-developer-docs]

### Changed

- Expanded `documentation.md` into a developer onboarding guide with service boundaries, API details, snapshot compatibility, deployment notes, checklists, and troubleshooting.

## [2026-05-01-library-automation]

### Changed

- Extended shared snapshot/config contracts with app-owned watched-folder and content-hash metadata.
- Documented that folder uploads, watched-folder imports, duplicate detection, and exclusive album moves remain desktop-app responsibilities.

## [2026-05-01-license]

### Added

- Added an MIT `LICENSE` file.
- Updated README and documentation with license references.

## [2026-05-01-doc-refresh]

### Changed

- Refreshed README and documentation to call out the standardized `img` and `img/scripts` layout.

## [2026-05-01-docs-assets]

### Changed

- Renamed the repository image asset folder from `art` to `img`.
- Updated documentation references to the standardized image folder.

## [2026-05-01]

### Changed

- Kept this repository focused on the hosted Discord adapter role.
- Documented the boundary between the bot and the Discasa desktop app.
- Confirmed the local service contract for setup, uploads, deletion, attachment resolution, diagnostics, and snapshots.

### Added

- Standalone README and technical documentation for the extracted bot service.
- Windows start and stop scripts for local development.
- Mock mode notes for development without live Discord credentials.
