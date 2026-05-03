import express from "express";
import multer from "multer";
import { env } from "./config";
import { HttpError, sendErrorResponse } from "./errors";
import { logger } from "./logger";
import {
  deleteStorageMessagesFromDiscord,
  getDiscordBotDiagnostics,
  getDiscordBotRuntimeStatus,
  getDiscordUploadLimitForGuild,
  hasCurrentConfigSnapshot,
  hasCurrentFolderSnapshot,
  hasCurrentIndexSnapshot,
  initializeDiscasaInGuild,
  inspectDiscasaSetup,
  listDiscordDriveAttachments,
  readLatestConfigSnapshot,
  readLatestFolderSnapshot,
  readLatestIndexSnapshot,
  resolveAttachmentReference,
  syncConfigSnapshot,
  syncFolderSnapshot,
  syncIndexSnapshot,
  uploadFilesToDiscordChannel,
  type ActiveStorageContext,
  type PersistedConfigSnapshot,
  type PersistedFolderSnapshot,
  type PersistedIndexSnapshot,
} from "./discord-service";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const QUIET_HTTP_LOG_PATHS = new Set(["/health", "/files/resolve-attachment"]);

app.use(express.json({ limit: "25mb" }));
app.use((request, response, next) => {
  const startedAt = Date.now();

  response.on("finish", () => {
    if (QUIET_HTTP_LOG_PATHS.has(request.path)) {
      return;
    }

    logger.info(`${request.method} ${request.originalUrl} ${response.statusCode} ${Date.now() - startedAt}ms`);
  });

  next();
});

function readContext(raw: unknown): ActiveStorageContext {
  if (!raw || typeof raw !== "object") {
    throw new HttpError(400, "ACTIVE_STORAGE_CONTEXT_REQUIRED", "Active storage context is required.");
  }

  return raw as ActiveStorageContext;
}

function readMultipartContext(raw: unknown): ActiveStorageContext {
  if (typeof raw !== "string") {
    throw new HttpError(400, "ACTIVE_STORAGE_CONTEXT_REQUIRED", "Active storage context is required.");
  }

  return readContext(JSON.parse(raw) as unknown);
}

app.get("/health", async (_request, response, next) => {
  try {
    const status = await getDiscordBotRuntimeStatus();
    response.json({
      ok: status.mockMode || (status.botConfigured && status.botLoggedIn),
      ...status,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/diagnostics", async (_request, response, next) => {
  try {
    response.json(await getDiscordBotDiagnostics());
  } catch (error) {
    next(error);
  }
});

app.get("/guilds/:guildId/upload-limit", async (request, response, next) => {
  try {
    const guildId = String(request.params.guildId ?? "");
    logger.info(`Upload limit requested for guild ${guildId}.`);
    response.json({ uploadLimitBytes: await getDiscordUploadLimitForGuild(guildId) });
  } catch (error) {
    next(error);
  }
});

app.get("/guilds/:guildId/setup-status", async (request, response, next) => {
  try {
    const guildId = String(request.params.guildId ?? "");
    logger.info(`Setup status requested for guild ${guildId}.`);
    response.json(await inspectDiscasaSetup(guildId));
  } catch (error) {
    next(error);
  }
});

app.post("/guilds/:guildId/initialize", async (request, response, next) => {
  try {
    const guildId = String(request.params.guildId ?? "");
    const authenticatedUserId = typeof request.body.authenticatedUserId === "string" ? request.body.authenticatedUserId : undefined;
    logger.info(`Initialize requested for guild ${guildId}.`, { authenticatedUserId: authenticatedUserId ?? null });
    response.json(await initializeDiscasaInGuild(guildId, authenticatedUserId));
  } catch (error) {
    next(error);
  }
});

app.post("/files/upload", upload.array("files"), async (request, response, next) => {
  try {
    const files = request.files as Express.Multer.File[] | undefined;
    const context = readMultipartContext(request.body.context);
    const targetChannelId =
      typeof request.body.targetChannelId === "string" && request.body.targetChannelId.length > 0
        ? request.body.targetChannelId
        : context.driveChannelId;

    if (!files?.length) {
      throw new HttpError(400, "FILES_REQUIRED", "At least one file is required.");
    }

    logger.info(`Upload requested for guild ${context.guildId}.`, {
      targetChannelId,
      fileCount: files.length,
      totalBytes: files.reduce((total, file) => total + file.size, 0),
    });
    response.json({ records: await uploadFilesToDiscordChannel(files, context, targetChannelId) });
  } catch (error) {
    next(error);
  }
});

app.post("/files/delete-messages", async (request, response, next) => {
  try {
    const rawMessages = Array.isArray(request.body.messages) ? request.body.messages : [];
    const messages = rawMessages.map((entry: unknown) => {
      const message = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
      return {
        channelId: String(message.channelId ?? ""),
        messageId: String(message.messageId ?? ""),
      };
    }).filter((message: { channelId: string; messageId: string }) => message.channelId.length > 0 && message.messageId.length > 0);

    const context = readContext(request.body.context);
    logger.info(`Delete storage messages requested for guild ${context.guildId}.`, { messageCount: messages.length });
    await deleteStorageMessagesFromDiscord(context, messages);
    response.json({ deleted: true });
  } catch (error) {
    next(error);
  }
});

app.post("/files/drive/attachments", async (request, response, next) => {
  try {
    const beforeMessageId = typeof request.body.beforeMessageId === "string" ? request.body.beforeMessageId : undefined;
    const context = readContext(request.body.context);
    logger.info(`Drive attachment scan requested for guild ${context.guildId}.`, { beforeMessageId: beforeMessageId ?? null });
    response.json(await listDiscordDriveAttachments(
      context,
      beforeMessageId,
    ));
  } catch (error) {
    next(error);
  }
});

app.post("/files/resolve-attachment", async (request, response, next) => {
  try {
    const reference = request.body.reference as { preferredFileName?: unknown } | undefined;
    const resolution = await resolveAttachmentReference(request.body.reference);
    if (!resolution) {
      logger.warn("Attachment resolution did not find a matching Discord attachment.", {
        preferredFileName: reference?.preferredFileName ?? null,
      });
    }

    response.json({
      resolution,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/snapshots/index/current", async (request, response, next) => {
  try {
    const context = readContext(request.body.context);
    logger.info(`Current index snapshot check requested for guild ${context.guildId}.`);
    response.json({ current: await hasCurrentIndexSnapshot(context) });
  } catch (error) {
    next(error);
  }
});

app.post("/snapshots/folder/current", async (request, response, next) => {
  try {
    const context = readContext(request.body.context);
    logger.info(`Current folder snapshot check requested for guild ${context.guildId}.`);
    response.json({ current: await hasCurrentFolderSnapshot(context) });
  } catch (error) {
    next(error);
  }
});

app.post("/snapshots/config/current", async (request, response, next) => {
  try {
    const context = readContext(request.body.context);
    logger.info(`Current config snapshot check requested for guild ${context.guildId}.`);
    response.json({ current: await hasCurrentConfigSnapshot(context) });
  } catch (error) {
    next(error);
  }
});

app.post("/snapshots/index/latest", async (request, response, next) => {
  try {
    const context = readContext(request.body.context);
    logger.info(`Latest index snapshot requested for guild ${context.guildId}.`);
    response.json({ snapshot: await readLatestIndexSnapshot(context) });
  } catch (error) {
    next(error);
  }
});

app.post("/snapshots/folder/latest", async (request, response, next) => {
  try {
    const context = readContext(request.body.context);
    logger.info(`Latest folder snapshot requested for guild ${context.guildId}.`);
    response.json({ snapshot: await readLatestFolderSnapshot(context) });
  } catch (error) {
    next(error);
  }
});

app.post("/snapshots/config/latest", async (request, response, next) => {
  try {
    const context = readContext(request.body.context);
    logger.info(`Latest config snapshot requested for guild ${context.guildId}.`);
    response.json({ snapshot: await readLatestConfigSnapshot(context) });
  } catch (error) {
    next(error);
  }
});

app.post("/snapshots/index/sync", async (request, response, next) => {
  try {
    const context = readContext(request.body.context);
    logger.info(`Index snapshot sync requested for guild ${context.guildId}.`);
    await syncIndexSnapshot(context, request.body.snapshot as PersistedIndexSnapshot);
    response.json({ synced: true });
  } catch (error) {
    next(error);
  }
});

app.post("/snapshots/folder/sync", async (request, response, next) => {
  try {
    const context = readContext(request.body.context);
    logger.info(`Folder snapshot sync requested for guild ${context.guildId}.`);
    await syncFolderSnapshot(context, request.body.snapshot as PersistedFolderSnapshot);
    response.json({ synced: true });
  } catch (error) {
    next(error);
  }
});

app.post("/snapshots/config/sync", async (request, response, next) => {
  try {
    const context = readContext(request.body.context);
    logger.info(`Config snapshot sync requested for guild ${context.guildId}.`);
    await syncConfigSnapshot(context, request.body.snapshot as PersistedConfigSnapshot);
    response.json({ synced: true });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  sendErrorResponse(response, error, "Unexpected Discord bot service error");
});

app.listen(env.port, async () => {
  logger.info(`Discord bot service running on http://localhost:${env.port}`);

  try {
    const status = await getDiscordBotRuntimeStatus();
    logger.info(`Mock mode: ${status.mockMode}`);
    logger.info(`Bot configured: ${status.botConfigured}`);
    logger.info(`Bot logged in: ${status.botLoggedIn}`);
  } catch (error) {
    logger.warn("Bot status could not be resolved at startup.", error);
  }
});
