/**
 * @module parser
 *
 * Loads, validates and normalises the `.vscode/terminals.json` configuration.
 *
 * This module is intentionally narrow: it does not create terminals or mutate
 * VS Code state. It only turns raw JSON into a typed, resolved representation
 * that downstream services can consume safely.
 */

import * as fs from "fs/promises";
import * as path from "path";
import type * as vscode from "vscode";
import {
  ExtensionConstants,
  IResolvedTerminalConfig,
  ITerminalConfig,
  ITerminalsFile,
  isTerminalConfig,
  isTerminalsFile,
  ShellMap,
} from "./models";

type VSCodeModule = typeof import("vscode");

function getVscodeApi(): VSCodeModule {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("vscode") as VSCodeModule;
}

/**
 * Raised when the configuration file cannot be parsed or validated.
 */
export class TerminalConfigError extends Error {
  public constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TerminalConfigError";
  }
}

/**
 * Reads and validates terminal configuration files for the current workspace.
 */
export class ConfigParser {
  /**
   * Reads the workspace configuration from the default location.
   *
   * @param workspaceFolder Optional workspace folder. When omitted, the first
   * workspace folder is used if available, otherwise the current working directory.
   */
  public async loadConfiguration(
    workspaceFolder?: vscode.WorkspaceFolder,
  ): Promise<ITerminalsFile | undefined> {
    const configPath = this.getConfigPath(workspaceFolder);

    try {
      await fs.access(configPath);
    } catch {
      return undefined;
    }

    const raw = await fs.readFile(configPath, "utf8");
    return this.parse(raw);
  }

  /**
   * Resolves the raw configuration into terminal definitions with absolute
   * paths and workspace-aware defaults.
   */
  public async resolveConfiguration(
    workspaceFolder?: vscode.WorkspaceFolder,
  ): Promise<IResolvedTerminalConfig[]> {
    const config = await this.loadConfiguration(workspaceFolder);
    if (!config) {
      return [];
    }

    const vscodeApi = getVscodeApi();
    const folders = vscodeApi.workspace.workspaceFolders ?? [];
    const baseFolder = workspaceFolder ?? folders[0];

    return config.terminals
      .filter((terminal) => terminal.restore !== false)
      .map((terminal) =>
        this.resolveTerminalConfig(terminal, baseFolder, folders),
      );
  }

  /**
   * Parses and validates configuration text.
   */
  public parse(rawContent: string): ITerminalsFile {
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawContent);
    } catch (error) {
      throw new TerminalConfigError(
        "Unable to parse terminals.json as valid JSON.",
        error,
      );
    }

    if (!isTerminalsFile(parsed)) {
      throw new TerminalConfigError(
        "The configuration file is not shaped like a valid terminals.json document.",
      );
    }

    if (parsed.version !== ExtensionConstants.SCHEMA_VERSION) {
      throw new TerminalConfigError(
        `Unsupported schema version ${parsed.version}. Expected ${ExtensionConstants.SCHEMA_VERSION}.`,
      );
    }

    return parsed;
  }

  /**
   * Resolves a single terminal entry against the current workspace context.
   */
  public resolveTerminalConfig(
    terminal: ITerminalConfig,
    workspaceFolder?: vscode.WorkspaceFolder,
    workspaceFolders: readonly vscode.WorkspaceFolder[] = [],
  ): IResolvedTerminalConfig {
    const targetFolder = this.resolveWorkspaceFolder(
      terminal.workspaceFolder,
      workspaceFolder,
      workspaceFolders,
    );
    const baseDirectory =
      targetFolder?.uri.fsPath ??
      workspaceFolder?.uri.fsPath ??
      workspaceFolders[0]?.uri.fsPath ??
      process.cwd();

    const resolvedCwd = this.resolvePath(terminal.cwd, baseDirectory);
    const resolvedShellPath = this.resolveShellPath(terminal.shell);

    return {
      ...terminal,
      resolvedCwd,
      resolvedShellPath,
      resolvedWorkspaceFolder: targetFolder,
    };
  }

  /**
   * Returns the absolute path to the configuration file.
   */
  public getConfigPath(workspaceFolder?: vscode.WorkspaceFolder): string {
    const vscodeApi = getVscodeApi();
    const baseFolder =
      workspaceFolder?.uri.fsPath ??
      vscodeApi.workspace.workspaceFolders?.[0]?.uri.fsPath ??
      process.cwd();
    return path.join(
      baseFolder,
      ExtensionConstants.CONFIG_DIR,
      ExtensionConstants.CONFIG_FILENAME,
    );
  }

  /**
   * Resolves a path value against the requested workspace folder.
   *
   * Supported forms:
   * - absolute paths
   * - relative paths such as `./backend` or `../shared`
   * - workspace-folder-relative values such as `backend`
   */
  private resolvePath(
    value: string | undefined,
    baseDirectory: string,
  ): string {
    if (!value) {
      return baseDirectory;
    }

    if (path.isAbsolute(value)) {
      return path.normalize(value);
    }

    return path.resolve(baseDirectory, value);
  }

  /**
   * Resolves a shell shorthand to a concrete executable path.
   *
   * If the shell is already an absolute path, it is returned as-is.
   * If it is an unknown shorthand, the raw value is returned so VS Code can
   * fall back to the shell name itself.
   */
  private resolveShellPath(shell: string | undefined): string | undefined {
    if (!shell) {
      return undefined;
    }

    if (path.isAbsolute(shell)) {
      return shell;
    }

    const shellEntry = ShellMap[shell];
    if (!shellEntry) {
      return shell;
    }

    const platformKey =
      process.platform === "win32"
        ? "win32"
        : process.platform === "darwin"
          ? "darwin"
          : "linux";
    return shellEntry[platformKey] ?? undefined;
  }

  /**
   * Resolves the terminal's workspace folder based on the explicit property,
   * the fallback workspace folder, or the available workspace list.
   */
  private resolveWorkspaceFolder(
    requestedName: string | undefined,
    workspaceFolder: vscode.WorkspaceFolder | undefined,
    workspaceFolders: readonly vscode.WorkspaceFolder[],
  ): vscode.WorkspaceFolder | undefined {
    if (!requestedName) {
      return workspaceFolder;
    }

    return workspaceFolders.find((folder) => folder.name === requestedName);
  }
}

/**
 * Convenience export for downstream modules that only need a parser instance.
 */
export const parser = new ConfigParser();
