# Discasa Bot Documentation

This document describes the standalone Discasa Bot service after extraction from the main Discasa app repository.

## 1. Goal

Discasa Bot is a hosted Discord service for operations that require bot identity. It is intentionally compact so it can be deployed online with predictable memory, CPU, and operational behavior.

The bot is not the owner of Discasa product rules. The desktop app remains responsible for library state, chunking decisions, recovery decisions, user preferences, local mirroring, and UI behavior.

## 2. Components

Image assets live under `img`, with any image-related helper scripts reserved for `img/scripts`.

```text
src/index.ts
```

Imports and starts the HTTP server.

```text
src/server.ts
```

Defines Express routes, request parsing, diagnostics, uploads, snapshot endpoints, and standardized error handling.

```text
src/discord-service.ts
```

Owns Discord API operations through `discord.js`: login, server inspection, channel creation, attachment upload, message deletion, attachment listing, targeted resolution, and snapshot read/write.

```text
src/config.ts
```

Loads `.env` values and exposes normalized runtime config.

```text
src/logger.ts
src/errors.ts
```

Provide consistent logs and HTTP error responses.

## 3. Runtime Modes

### 3.1 Mock Mode

`MOCK_MODE=true` allows local development without a real Discord token. The service responds with predictable mock status where applicable.

### 3.2 Discord Mode

`MOCK_MODE=false` requires:

```env
DISCORD_BOT_TOKEN=
```

The bot logs into Discord and serves real setup, upload, snapshot, and cleanup requests.

## 4. HTTP API

Default port:

```text
3002
```

Main endpoints:

- `GET /health`
- `GET /diagnostics`
- `GET /guilds/:guildId/upload-limit`
- `GET /guilds/:guildId/setup-status`
- `POST /guilds/:guildId/initialize`
- `POST /files/upload`
- `POST /files/delete-messages`
- `POST /files/drive/attachments`
- `POST /files/resolve-attachment`
- snapshot read/write endpoints for index, folder, and config state.

## 5. Discord Structure

The bot creates or reuses this structure inside the selected server:

```text
Discasa
  #discasa-drive
  #discasa-index
  #discasa-trash
```

Responsibilities:

- create the category when missing;
- create required channels when missing;
- keep channel permissions private and scoped to the authenticated user and bot;
- detect existing installations;
- read legacy snapshot channels when needed by app requests.

## 6. File Storage

The app decides whether a file is small or chunked. The bot receives one or more upload requests and writes attachments to the requested target channel.

The bot reports a fixed upload limit of `10 MiB` so the app can remain independent from Discord boost or plan changes.

For chunked files, the app sends individual parts and stores the manifest in snapshots. The bot only uploads the bytes and returns attachment references.

## 7. Snapshots

Discasa stores JSON snapshots in `discasa-index`:

- index snapshot;
- folder snapshot;
- config snapshot;
- installation marker.

The bot can read the latest snapshot attachment and write replacement snapshots, but it does not decide snapshot contents.

## 8. Diagnostics

Diagnostics report:

- process availability;
- mock mode;
- bot configuration state;
- Discord login state;
- bot user id when available;
- API readiness.

The Discasa app uses these values in Settings and status warnings.

## 9. Local Development

Install:

```powershell
npm install
```

Run:

```powershell
npm run dev
```

Check:

```powershell
npm run check
```

Build validation:

```powershell
npm run build
```

Windows launchers:

```powershell
.\start-bot.bat
.\stop-bot.bat
```

## 10. Deployment Notes

- Deploy the repository as a normal Node.js service.
- Set `BOT_PORT` to the hosting provider's expected port if needed.
- Set `MOCK_MODE=false`.
- Provide `DISCORD_BOT_TOKEN`.
- Expose the service URL to the Discasa app through `DISCORD_BOT_URL`.
- Keep request body and upload limits aligned with the app's fixed `10 MiB` chunking model.

## 11. Maintenance Guidelines

- Keep the bot small and predictable.
- Keep product rules in the app.
- Do not add UI concerns to the bot.
- Do not make upload limits dynamic by Discord boost level.
- Keep image assets under `img` and image helper scripts under `img/scripts`.
- Keep logs and errors standardized.
- Validate with `npm run check` before pushing.

## 12. License

Discasa Bot is distributed under the MIT License. See `LICENSE` for the full text.
