# Discasa Bot

Discasa Bot is the hosted Discord adapter for Discasa. It keeps the online service intentionally small: the desktop app owns product rules, library coordination, chunking decisions, recovery, and user-facing state, while the bot only performs operations that require Discord bot identity.

For full operational notes, see [documentation.md](documentation.md).

For project history, see [CHANGELOG.md](CHANGELOG.md).

## Current State

The bot includes:

- a compact Node.js, Express, and `discord.js` service;
- health and diagnostics endpoints for hosted monitoring;
- setup inspection and initialization for Discasa servers;
- creation or reuse of the Discasa category and channels;
- targeted file uploads to Discord channels;
- message deletion for storage cleanup;
- raw attachment listing from `discasa-drive`;
- targeted attachment reference resolution;
- snapshot read/write endpoints for index, folders, and config;
- compatibility fields for app-owned content hashes and watched-folder metadata in snapshots;
- standardized HTTP, setup, storage, snapshot, and error logging;
- mock mode for local development without Discord credentials.

## Repository Layout

```text
Discasa_bot
  img
    bot       Bot source artwork
    scripts   Image-related helper scripts, when present
    sources   External bot artwork references

  src
    index.ts            Service entrypoint
    server.ts           HTTP routes and diagnostics
    discord-service.ts  Discord storage operations
    config.ts           Environment loading
    logger.ts           Standardized logs
    errors.ts           Standardized error responses

  start-bot.bat         Start the bot locally
  stop-bot.bat          Stop the bot local port
```

## Discord Structure

When Discasa is applied to a Discord server, the bot creates or reuses:

```text
Discasa
  #discasa-drive
  #discasa-index
  #discasa-trash
```

- `discasa-drive`: active file storage.
- `discasa-index`: index, folder, config, and install snapshots.
- `discasa-trash`: storage for items moved to trash.

The bot also keeps compatibility with older Discasa installations where snapshot data may exist in legacy channels.

## Development

### Requirements

- Node.js 20 or newer.
- A Discord bot token when `MOCK_MODE=false`.

### Install

```powershell
npm install
```

Copy the environment example:

```powershell
copy .env.example .env
```

### Environment

```env
BOT_PORT=3002
MOCK_MODE=true
DISCORD_BOT_TOKEN=
```

For real Discord integration, set `MOCK_MODE=false` and provide `DISCORD_BOT_TOKEN`.

### Run

```powershell
.\start-bot.bat
```

or:

```powershell
npm run dev
```

Stop the local bot port:

```powershell
.\stop-bot.bat
```

## Validation

```powershell
npm run check
npm run build
```

Both commands currently run TypeScript with `--noEmit`.

## Asset Layout

Image assets and source artwork live under `img`. Image-related helper scripts should live under `img/scripts`.

## Relationship to Discasa

The desktop app repository uses `DISCORD_BOT_URL` to talk to this service. In local development, keep this bot available at:

```text
http://localhost:3002
```

The bot should remain a thin hosted adapter. Product rules should stay in the Discasa app whenever they can run there.

Folder uploads, watched-folder imports, duplicate detection, and album move semantics are app-owned behaviors. The bot stores and returns the snapshot data needed by those flows, but it does not decide how collections are displayed or grouped.

## License

This repository is licensed under the MIT License. See [LICENSE](LICENSE).
