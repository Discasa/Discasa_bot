# Discasa Bot Documentation

This document is the technical onboarding guide for the standalone Discasa Bot service. It explains what the bot owns, what it must not own, how the HTTP API is shaped, and how to keep it compatible with the Discasa desktop app.

## 1. Service Role

Discasa Bot is a hosted Discord adapter for operations that require Discord bot identity. It is intentionally compact so it can run online with predictable memory, CPU, and operational behavior.

The bot is not the product owner. The sibling `..\Discasa` app remains responsible for UI behavior, library state, chunking decisions, local mirroring, watched-folder imports, duplicate detection, album movement, recovery, user preferences, and snapshot contents.

When changing code, apply this rule:

- If the behavior decides what Discasa should do, change the app.
- If the behavior performs a Discord operation requested by the app, change the bot.

## 2. Repository Layout

```text
Discasa_bot
  src/index.ts            Starts the HTTP server
  src/server.ts           Express routes, uploads, diagnostics, errors
  src/discord-service.ts  Discord login, setup, storage, snapshots
  src/config.ts           Environment loading and normalization
  src/logger.ts           Standardized logging
  src/errors.ts           HTTP error helpers
  img/bot                 Bot artwork
  img/scripts             Image helper scripts, when present
  img/sources             External artwork references
  start-bot.bat           Start local bot service
  stop-bot.bat            Stop local bot port
```

## 3. Runtime Modes

### Mock Mode

`MOCK_MODE=true` allows local development without a Discord token. It should keep routes predictable enough for the app to develop against the service.

### Discord Mode

`MOCK_MODE=false` requires:

```env
BOT_PORT=3002
MOCK_MODE=false
DISCORD_BOT_TOKEN=
```

The bot logs into Discord through `discord.js` and serves real setup, upload, snapshot, attachment lookup, and deletion requests.

## 4. Install, Run, Validate

Install:

```powershell
npm install
copy .env.example .env
```

Run:

```powershell
.\start-bot.bat
```

or:

```powershell
npm run dev
```

Stop:

```powershell
.\stop-bot.bat
```

Validate:

```powershell
npm run check
npm run build
```

Both validation commands run TypeScript with `--noEmit`.

## 5. Relationship To Discasa App

The app calls the bot through `DISCORD_BOT_URL`, normally:

```text
http://localhost:3002
```

The app owns:

- OAuth and user-facing setup flow;
- library database and product state;
- file chunking decisions and manifests;
- folder uploads and nested folder semantics;
- watched-folder imports;
- duplicate detection;
- local cache and thumbnail decisions;
- optimistic UI and rollback;
- trash and restore semantics;
- decisions about when scans or recovery probes are necessary;
- snapshot JSON contents.

The bot owns:

- Discord bot login;
- server setup inspection;
- category/channel creation;
- attachment upload;
- Discord message deletion;
- raw drive attachment listing;
- targeted attachment resolution;
- reading latest snapshot attachments;
- writing snapshot attachments supplied by the app.

## 6. Discord Structure

The bot creates or reuses this private structure inside the selected server:

```text
Discasa
  #discasa-drive
  #discasa-index
  #discasa-trash
```

Responsibilities:

- Create the category when missing.
- Create required channels when missing.
- Keep permissions private and scoped to the authenticated user and bot.
- Detect existing installations.
- Preserve compatibility with older Discasa installations that stored snapshots in legacy channels.

Channel purpose:

- `discasa-drive`: active file attachments and chunk parts.
- `discasa-index`: index, folder, config, and installation snapshots.
- `discasa-trash`: compatibility channel for older app versions and any storage already there. Current trash/restore is app-owned logical snapshot state, not a bot-owned physical move.

## 7. HTTP API

Default port:

```text
3002
```

Routes are defined in `src/server.ts`.

### Health And Diagnostics

```text
GET /health
GET /diagnostics
```

Use these for hosted monitoring and app status warnings. Diagnostics should report process availability, mock mode, token configuration, login state, bot user id, and queue/storage details when available.

### Setup

```text
GET  /guilds/:guildId/upload-limit
GET  /guilds/:guildId/setup-status
POST /guilds/:guildId/initialize
```

Setup routes inspect or create the Discasa category and channels. The app decides when setup is required; the bot only executes Discord operations and returns the resulting structure.

### File Storage

```text
POST /files/upload
POST /files/delete-messages
POST /files/drive/attachments
POST /files/resolve-attachment
```

`/files/upload` receives one or more files and a target storage channel requested by the app. The bot uploads bytes and returns Discord attachment references.

`/files/delete-messages` removes Discord storage messages by id. The app decides when an item should be deleted or moved.

`/files/drive/attachments` lists raw drive attachments so the app can import externally added files.

`/files/resolve-attachment` tries to find or refresh a known attachment reference for recovery.

### Snapshots

```text
POST /snapshots/index/current
POST /snapshots/folder/current
POST /snapshots/config/current
POST /snapshots/index/latest
POST /snapshots/folder/latest
POST /snapshots/config/latest
POST /snapshots/index/sync
POST /snapshots/folder/sync
POST /snapshots/config/sync
```

The bot reads and writes snapshot attachments. It must preserve fields it does not understand because the app owns the snapshot schema. This includes app-owned metadata such as content hashes, watched-folder source markers, source fingerprints, media-edit fields, and future product fields.

## 8. File Upload Model

The app decides whether a file is small or chunked. The bot receives the files it should upload and the channel where they should be stored.

The bot reports a fixed upload limit of `10 MiB`. Do not make this dynamic by server boost level unless the app contract is redesigned. The fixed value lets the app keep chunking predictable across servers.

For chunked files:

1. The app splits the file into parts.
2. The app sends the parts to the bot.
3. The bot uploads the parts to Discord.
4. The bot returns attachment references.
5. The app stores the manifest in the index snapshot.

The bot should not build or interpret the product manifest beyond returning Discord storage references.

## 9. Snapshot Compatibility

Snapshots are app-owned JSON documents. The bot should treat them as opaque payloads except for locating, storing, and retrieving them.

Compatibility rules:

- Do not drop unknown fields.
- Do not rename fields without coordinating app changes.
- Do not infer product behavior from snapshot details.
- Keep latest-snapshot lookup compatible with legacy channels when needed.
- Keep index, folder, and config snapshots separate.

Current app-owned snapshot concerns include:

- library items and storage references;
- chunk manifests;
- album/folder tree;
- folder memberships;
- config settings;
- content hashes for duplicate detection;
- watched-folder source metadata;
- saved media edit metadata.

## 10. Error And Logging Behavior

Use standardized helpers in:

```text
src/errors.ts
src/logger.ts
```

Route handlers should pass errors through Express error handling. Avoid returning raw Discord errors to clients when a normalized message is clearer.

Logs should be operationally useful:

- meaningful HTTP requests with method, route, status, and elapsed time;
- startup mode and port;
- Discord login state;
- setup actions;
- upload actions and failures;
- drive attachment scans;
- attachment resolution misses, rather than every successful recovery probe;
- snapshot current/latest/sync actions and failures;
- deletion actions and failures.

Health polling and successful attachment-recovery probes are intentionally quiet so normal app activity does not look like product work.

Do not log secret tokens or full OAuth credentials.

## 11. Security And Permissions

The bot should create private channels and keep access limited to the expected Discord user and bot identity. Any permission change must be coordinated with the app setup flow.

Security rules:

- Never expose `DISCORD_BOT_TOKEN`.
- Do not add broad public channel permissions.
- Validate requested guild/channel/message ids before using them.
- Keep upload and request body limits aligned with the app.
- Keep mock mode clearly separated from real Discord mode.

## 12. Deployment Notes

Deploy as a normal Node.js service.

Required production values:

```env
BOT_PORT=<provider port or 3002>
MOCK_MODE=false
DISCORD_BOT_TOKEN=<token>
```

The deployed URL must be configured in the app as `DISCORD_BOT_URL`.

Operational checks after deploy:

- `GET /health` returns OK.
- `GET /diagnostics` reports configured token and Discord login.
- Setup status works for a test guild.
- Upload works with a small file.
- Snapshot sync works for index, folder, and config.

## 13. Development Guide

Use this map when changing behavior:

```text
Add or change an HTTP route
  src/server.ts

Change Discord setup, upload, delete, attachment lookup, snapshots
  src/discord-service.ts

Change environment handling
  src/config.ts

Change logs or error responses
  src/logger.ts
  src/errors.ts
```

If the change requires a new persistent product field, update the app repository first or in the same coordinated change. The bot should preserve the field in snapshots but should not own its meaning.

## 14. Manual Test Checklist

Before pushing bot changes:

- `npm run check` passes.
- `npm run build` passes.
- `.\start-bot.bat` starts the service.
- `http://localhost:3002/health` responds.
- `http://localhost:3002/diagnostics` responds.
- Console logs include HTTP method, route, status, and elapsed time for bot requests.
- In mock mode, app diagnostics can reach the bot.
- In Discord mode, bot logs in successfully.
- Setup status can inspect a selected guild.
- Initialize creates or reuses category/channels.
- Upload endpoint stores a small attachment.
- Snapshot sync and latest-read endpoints work for index, folder, and config.
- Delete-messages endpoint handles valid and missing messages safely.

## 15. Troubleshooting

Bot does not start:

- Check `BOT_PORT`.
- Check whether another process is using the port.
- Run `.\stop-bot.bat` and start again.

Diagnostics says token is not configured:

- Set `DISCORD_BOT_TOKEN`.
- Set `MOCK_MODE=false` only when the token is available.

Bot is configured but not logged in:

- Validate the token in the Discord developer portal.
- Check whether the token was rotated.
- Restart the service after changing `.env`.

App cannot reach bot:

- Confirm `DISCORD_BOT_URL` in the app `.env`.
- Confirm `GET /health` works from the same machine.
- Check firewall or hosting URL if deployed.

Upload fails:

- Confirm request size and app chunking.
- Confirm channel ids point to the correct Discasa channels.
- Check Discord rate limits and attachment errors in logs.

Snapshots are stale:

- Confirm `/snapshots/*/sync` routes are receiving requests.
- Confirm `discasa-index` exists and the bot can write there.
- Confirm the app is not running against a different bot URL.

## 16. Maintenance Rules

- Keep the bot small and predictable.
- Keep product rules in the app.
- Do not add UI concepts to the bot.
- Preserve app-owned snapshot fields even when the bot does not interpret them.
- Keep the upload limit contract aligned with the app fixed `10 MiB` chunking model.
- Keep image assets under `img` and image helper scripts under `img/scripts`.
- Keep logs and errors standardized.
- Update documentation and changelog when behavior or contracts change.
- Validate with `npm run check` before pushing.

## 17. License

Discasa Bot is distributed under the MIT License. See `LICENSE` for the full text.
