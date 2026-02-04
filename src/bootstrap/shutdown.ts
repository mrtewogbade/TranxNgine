import { INestApplication, Logger } from '@nestjs/common';

/**
 * Installs signal/exception handlers and enables Nest shutdown hooks.
 * - Handles SIGINT/SIGTERM
 * - Logs and handles unhandledRejection / uncaughtException
 * - Times out after 10s to force exit
 */
export function installGracefulShutdown(app: INestApplication) {
  app.enableShutdownHooks();

  let shuttingDown = false;

  const shutdown = async (reason: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    Logger.warn(`${reason} received. Shutting down...`);

    const killer = setTimeout(() => {
      Logger.error('Shutdown timed out, forcing exit.');
      process.exit(1);
    }, 10_000).unref();

    try {
      await app.close();
    } catch (e) {
      Logger.error('Error during app.close(): ' + (e as Error).message);
    } finally {
      clearTimeout(killer);
      process.exit(0);
    }
  };

  ['SIGINT', 'SIGTERM'].forEach((sig) => {
    process.once(sig as NodeJS.Signals, () => void shutdown(sig));
  });

  process.once('unhandledRejection', (reason) => {
    Logger.error('unhandledRejection: ' + String(reason));
    void shutdown('unhandledRejection');
  });

  process.once('uncaughtException', (err) => {
    Logger.error(
      'uncaughtException: ' + (err?.stack || err?.message || String(err)),
    );
    void shutdown('uncaughtException');
  });
}
