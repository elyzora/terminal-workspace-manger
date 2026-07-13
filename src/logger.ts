/**
 * @module logger
 *
 * Centralised logging for the Terminal Workspace Manager extension.
 *
 * Wraps a VS Code OutputChannel behind a simple API so that every
 * module can emit structured, timestamped log messages without
 * depending on the OutputChannel directly.
 *
 * **Depends on:** `models.ts` (for `ExtensionConstants`).
 * **Depended on by:** every other module that needs to log.
 */

import * as vscode from 'vscode';
import { ExtensionConstants } from './models';

/**
 * Log severity levels, ordered from most to least verbose.
 */
export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
}

/**
 * Singleton logger that writes to a dedicated VS Code Output Channel.
 *
 * Usage:
 * ```ts
 * const logger = Logger.getInstance();
 * logger.info('Configuration loaded', { terminals: 5 });
 * logger.error('Failed to parse JSON', error);
 * ```
 */
export class Logger {
    // ── Singleton ────────────────────────────────
    private static instance: Logger | undefined;

    /** The underlying VS Code output channel. */
    private readonly channel: vscode.OutputChannel;

    /** Minimum level that will actually be written. */
    private level: LogLevel = LogLevel.INFO;

    private constructor() {
        this.channel = vscode.window.createOutputChannel(
            ExtensionConstants.OUTPUT_CHANNEL_NAME,
        );
    }

    /**
     * Returns the singleton Logger instance, creating it on first call.
     */
    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    // ── Public API ───────────────────────────────

    /**
     * Set the minimum log level.
     * Messages below this level are silently dropped.
     */
    public setLevel(level: LogLevel): void {
        this.level = level;
    }

    /**
     * Log a DEBUG-level message.
     * Use for verbose / diagnostic output that is normally hidden.
     */
    public debug(message: string, data?: unknown): void {
        this.log(LogLevel.DEBUG, message, data);
    }

    /**
     * Log an INFO-level message.
     * Use for significant lifecycle events (config loaded, terminal created).
     */
    public info(message: string, data?: unknown): void {
        this.log(LogLevel.INFO, message, data);
    }

    /**
     * Log a WARN-level message.
     * Use for recoverable problems (missing optional config, deprecated key).
     */
    public warn(message: string, data?: unknown): void {
        this.log(LogLevel.WARN, message, data);
    }

    /**
     * Log an ERROR-level message.
     * Use for unrecoverable problems (invalid JSON, file-system failures).
     * If `data` is an `Error`, the stack trace is appended automatically.
     */
    public error(message: string, data?: unknown): void {
        this.log(LogLevel.ERROR, message, data);
    }

    /**
     * Reveal the output channel in the VS Code panel.
     * Called when the user explicitly wants to inspect logs.
     */
    public show(): void {
        this.channel.show(true /* preserveFocus */);
    }

    /**
     * Dispose the underlying output channel.
     * Called once during extension deactivation.
     */
    public dispose(): void {
        this.channel.dispose();
        Logger.instance = undefined;
    }

    // ── Internals ────────────────────────────────

    /**
     * Core logging method. Formats the message with a timestamp and
     * optional serialised data, then appends it to the output channel.
     */
    private log(level: LogLevel, message: string, data?: unknown): void {
        if (!this.shouldLog(level)) {
            return;
        }

        const timestamp = new Date().toISOString();
        let line = `[${timestamp}] [${level}] ${message}`;

        if (data !== undefined) {
            if (data instanceof Error) {
                line += `\n  ${data.message}`;
                if (data.stack) {
                    line += `\n  ${data.stack}`;
                }
            } else {
                try {
                    line += ` ${JSON.stringify(data)}`;
                } catch {
                    line += ` [unserializable data]`;
                }
            }
        }

        this.channel.appendLine(line);
    }

    /**
     * Returns `true` when the given level meets or exceeds the
     * configured minimum level.
     */
    private shouldLog(level: LogLevel): boolean {
        const order: Record<LogLevel, number> = {
            [LogLevel.DEBUG]: 0,
            [LogLevel.INFO]: 1,
            [LogLevel.WARN]: 2,
            [LogLevel.ERROR]: 3,
        };
        return order[level] >= order[this.level];
    }
}
