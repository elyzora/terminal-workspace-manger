/**
 * @module models
 *
 * Central type definitions for the Terminal Workspace Manager extension.
 * Every other module imports its types from here — this file has zero
 * internal dependencies, making it the leaf of the dependency graph.
 */

import type * as vscode from "vscode";

// ─────────────────────────────────────────────
//  Configuration File Schema Types
// ─────────────────────────────────────────────

/**
 * Represents a single terminal entry inside `.vscode/terminals.json`.
 *
 * All properties except `name` are optional so that users can define
 * terminals with minimal boilerplate.
 */
export interface ITerminalConfig {
  /** Display name shown on the terminal tab. */
  readonly name: string;

  /**
   * Shell executable shorthand or absolute path.
   * Shorthands: `zsh`, `bash`, `fish`, `powershell`, `cmd`, `pwsh`.
   */
  readonly shell?: string;

  /**
   * Working directory for the terminal.
   * Supports absolute paths, relative paths (resolved against the
   * workspace folder), and workspace-folder-relative notation (`./`).
   */
  readonly cwd?: string;

  /**
   * VS Code ThemeIcon id displayed on the terminal tab.
   * @example "server" | "person" | "package" | "shield" | "database"
   */
  readonly icon?: string;

  /**
   * VS Code ThemeColor id applied to the terminal tab icon.
   * @example "terminal.ansiGreen" | "terminal.ansiBlue"
   */
  readonly color?: string;

  /**
   * Startup command sent to the terminal after creation.
   * @example "npm run dev"
   */
  readonly command?: string;

  /**
   * Path to a script file whose contents are executed on startup.
   * Resolved relative to the workspace folder.
   * @example "commands/backend.sh"
   */
  readonly commandFile?: string;

  /**
   * If `true`, the terminal panel is revealed and this terminal
   * receives focus after creation.
   * @default false
   */
  readonly show?: boolean;

  /**
   * If `false`, this terminal is skipped during restore.
   * Useful for temporarily disabling a terminal without removing
   * its configuration.
   * @default true
   */
  readonly restore?: boolean;

  /**
   * Group identifier for split terminals. Terminals sharing the
   * same `group` value are opened in the same split pane.
   * @example "backend"
   */
  readonly group?: string;

  /**
   * Creation order. Lower numbers are created first.
   * Terminals without an explicit order are created after
   * ordered terminals, in their original array position.
   * @default Infinity
   */
  readonly order?: number;

  /**
   * Milliseconds to wait before executing the startup command.
   * This delay occurs after the terminal is created but before
   * the command is sent.
   * @default 0
   */
  readonly delay?: number;

  /**
   * If `true`, a `clear` command is sent before the startup command.
   * @default false
   */
  readonly clear?: boolean;

  /**
   * Environment variables merged into the terminal's environment.
   * @example { "NODE_ENV": "development", "PORT": "3000" }
   */
  readonly env?: Readonly<Record<string, string>>;

  /**
   * Name of the workspace folder (in a multi-root workspace) that
   * this terminal belongs to. Used to resolve `cwd` and as the
   * shell integration scope.
   * @example "backend" | "user" | "vendor"
   */
  readonly workspaceFolder?: string;

  /**
   * If `true`, the terminal is automatically closed when the
   * shell process exits.
   * @default false
   */
  readonly closeOnExit?: boolean;
}

/**
 * Root shape of the `.vscode/terminals.json` configuration file.
 */
export interface ITerminalsFile {
  /**
   * Schema version. Currently only `1` is supported.
   * Allows for forward-compatible config evolution.
   */
  readonly version: number;

  /** Array of terminal definitions. */
  readonly terminals: readonly ITerminalConfig[];
}

// ─────────────────────────────────────────────
//  Runtime / Internal Types
// ─────────────────────────────────────────────

/**
 * A terminal config that has been validated and enriched with
 * resolved absolute paths and defaults applied.
 */
export interface IResolvedTerminalConfig extends ITerminalConfig {
  /** Absolute path to the resolved working directory. */
  readonly resolvedCwd: string;

  /** Absolute path to the shell executable (or `undefined` for default). */
  readonly resolvedShellPath?: string;

  /** Resolved workspace folder URI, if applicable. */
  readonly resolvedWorkspaceFolder?: vscode.WorkspaceFolder;
}

/**
 * Tracks a terminal that was created by this extension so that
 * the "Delete All Managed Terminals" command can dispose only
 * the terminals we own.
 */
export interface IManagedTerminal {
  /** The VS Code terminal instance. */
  readonly terminal: vscode.Terminal;

  /** The original configuration that produced this terminal. */
  readonly config: ITerminalConfig;

  /** Timestamp (epoch ms) when the terminal was created. */
  readonly createdAt: number;
}

/**
 * Options bag passed into the restore orchestrator so that
 * callers can customise behaviour without positional args.
 */
export interface IRestoreOptions {
  /**
   * If `true`, all previously-managed terminals are disposed
   * before restoring the new layout.
   * @default true
   */
  readonly disposeExisting?: boolean;

  /**
   * If `true`, a progress notification is shown during restore.
   * @default true
   */
  readonly showProgress?: boolean;
}

// ─────────────────────────────────────────────
//  Enum-like Constants
// ─────────────────────────────────────────────

/**
 * Extension-wide constants.
 * Gathered here so magic strings live in one place.
 */
export const ExtensionConstants = {
  /** Extension identifier used in command prefixes. */
  EXTENSION_ID: "terminalWorkspaceManager",

  /** Configuration filename. */
  CONFIG_FILENAME: "terminals.json",

  /** Relative directory inside the workspace. */
  CONFIG_DIR: ".vscode",

  /** Output-channel display name. */
  OUTPUT_CHANNEL_NAME: "Terminal Workspace Manager",

  /** Glob pattern for the file-system watcher. */
  CONFIG_GLOB: "**/.vscode/terminals.json",

  /** Current schema version. */
  SCHEMA_VERSION: 1,
} as const;

/**
 * All command identifiers registered by this extension.
 */
export const Commands = {
  RESTORE: `${ExtensionConstants.EXTENSION_ID}.restore`,
  SAVE: `${ExtensionConstants.EXTENSION_ID}.save`,
  DELETE: `${ExtensionConstants.EXTENSION_ID}.delete`,
  RELOAD: `${ExtensionConstants.EXTENSION_ID}.reload`,
} as const;

/**
 * Maps shell shorthand names to their executable names per platform.
 * `null` means the shell is not available on that platform.
 */
export const ShellMap: Readonly<
  Record<
    string,
    Readonly<{
      win32: string | null;
      darwin: string | null;
      linux: string | null;
    }>
  >
> = {
  zsh: { win32: null, darwin: "/bin/zsh", linux: "/usr/bin/zsh" },
  bash: {
    win32: "C:\\Program Files\\Git\\bin\\bash.exe",
    darwin: "/bin/bash",
    linux: "/bin/bash",
  },
  fish: { win32: null, darwin: "/usr/local/bin/fish", linux: "/usr/bin/fish" },
  powershell: {
    win32: "powershell.exe",
    darwin: "/usr/local/bin/pwsh",
    linux: "/usr/bin/pwsh",
  },
  cmd: { win32: "cmd.exe", darwin: null, linux: null },
  pwsh: {
    win32: "pwsh.exe",
    darwin: "/usr/local/bin/pwsh",
    linux: "/usr/bin/pwsh",
  },
} as const;

// ─────────────────────────────────────────────
//  Type Guards
// ─────────────────────────────────────────────

/**
 * Runtime type guard that checks whether an unknown value
 * conforms to the {@link ITerminalConfig} interface.
 *
 * Only validates structural shape — deep validation is
 * handled by the parser module.
 */
export function isTerminalConfig(value: unknown): value is ITerminalConfig {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // `name` is the only required field
  if (typeof obj["name"] !== "string" || obj["name"].trim().length === 0) {
    return false;
  }

  // Optional field type checks
  const optionalStrings: (keyof ITerminalConfig)[] = [
    "shell",
    "cwd",
    "icon",
    "color",
    "command",
    "commandFile",
    "group",
    "workspaceFolder",
  ];
  for (const key of optionalStrings) {
    if (key in obj && typeof obj[key] !== "string") {
      return false;
    }
  }

  const optionalBooleans: (keyof ITerminalConfig)[] = [
    "show",
    "restore",
    "clear",
    "closeOnExit",
  ];
  for (const key of optionalBooleans) {
    if (key in obj && typeof obj[key] !== "boolean") {
      return false;
    }
  }

  const optionalNumbers: (keyof ITerminalConfig)[] = ["order", "delay"];
  for (const key of optionalNumbers) {
    if (key in obj && typeof obj[key] !== "number") {
      return false;
    }
  }

  if ("env" in obj) {
    if (
      typeof obj["env"] !== "object" ||
      obj["env"] === null ||
      Array.isArray(obj["env"])
    ) {
      return false;
    }
    const env = obj["env"] as Record<string, unknown>;
    for (const val of Object.values(env)) {
      if (typeof val !== "string") {
        return false;
      }
    }
  }

  return true;
}

/**
 * Runtime type guard for the root {@link ITerminalsFile} shape.
 */
export function isTerminalsFile(value: unknown): value is ITerminalsFile {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  if (typeof obj["version"] !== "number") {
    return false;
  }

  if (!Array.isArray(obj["terminals"])) {
    return false;
  }

  return (obj["terminals"] as unknown[]).every(isTerminalConfig);
}
