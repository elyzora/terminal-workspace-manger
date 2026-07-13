/**
 * @module terminal
 *
 * Wraps VS Code terminal creation and management with a small, testable API.
 *
 * This layer is responsible for:
 * - creating terminals from resolved config
 * - assigning icon, color, cwd, shell and env
 * - delaying startup commands and running optional clear commands
 * - tracking which terminals were created by this extension
 */

import * as path from "path";
import * as vscode from "vscode";
import { IManagedTerminal, IResolvedTerminalConfig } from "./models";
import { Logger } from "./logger";

/**
 * Service that creates and manages VS Code terminals for a restored layout.
 */
export class TerminalManager {
  private readonly logger = Logger.getInstance();
  private readonly managedTerminals = new Set<IManagedTerminal>();

  /**
   * Creates a VS Code terminal from a resolved configuration entry.
   */
  public async createTerminal(config: IResolvedTerminalConfig): Promise<void> {
    const terminal = vscode.window.createTerminal({
      name: config.name,
      cwd: config.resolvedCwd,
      env: this.buildEnvironment(config),
      iconPath: this.resolveIcon(config),
      color: this.resolveColor(config),
      shellPath: config.resolvedShellPath,
      shellArgs: undefined,
    });

    this.managedTerminals.add({
      terminal,
      config,
      createdAt: Date.now(),
    });

    this.logger.info("Terminal created", {
      name: config.name,
      cwd: config.resolvedCwd,
    });

    if (config.show) {
      terminal.show(true);
    }

    if (config.delay && config.delay > 0) {
      await this.wait(config.delay);
    }

    if (config.clear) {
      this.sendText(terminal, "clear");
    }

    if (config.command) {
      this.sendText(terminal, config.command);
    }

    if (config.commandFile) {
      const resolvedFilePath = path.isAbsolute(config.commandFile)
        ? config.commandFile
        : path.resolve(config.resolvedCwd, config.commandFile);
      const resolvedFile = vscode.Uri.file(resolvedFilePath);
      try {
        const data = await vscode.workspace.fs.readFile(resolvedFile);
        this.sendText(terminal, Buffer.from(data).toString("utf8"));
      } catch (error) {
        this.logger.warn("Unable to read startup file", {
          error,
          commandFile: resolvedFilePath,
        });
      }
    }

    if (config.closeOnExit) {
      terminal.show(false);
    }
  }

  /**
   * Disposes every terminal created by this extension.
   */
  public disposeManagedTerminals(): void {
    for (const managedTerminal of this.managedTerminals) {
      managedTerminal.terminal.dispose();
    }
    this.managedTerminals.clear();
  }

  /**
   * Returns the list of managed terminals.
   */
  public getManagedTerminals(): readonly IManagedTerminal[] {
    return Array.from(this.managedTerminals);
  }

  /**
   * Builds the effective environment for a terminal.
   */
  private buildEnvironment(
    config: IResolvedTerminalConfig,
  ): Record<string, string> | undefined {
    if (!config.env || Object.keys(config.env).length === 0) {
      return undefined;
    }

    return { ...config.env };
  }

  /**
   * Resolves an icon for the terminal tab.
   */
  private resolveIcon(
    config: IResolvedTerminalConfig,
  ): vscode.ThemeIcon | undefined {
    if (!config.icon) {
      return undefined;
    }

    return { id: config.icon } as vscode.ThemeIcon;
  }

  /**
   * Resolves a color for the terminal tab.
   */
  private resolveColor(
    config: IResolvedTerminalConfig,
  ): vscode.TerminalOptions["color"] | undefined {
    if (!config.color) {
      return undefined;
    }

    return { id: config.color } as vscode.ThemeColor;
  }

  /**
   * Sends text into a terminal.
   */
  private sendText(terminal: vscode.Terminal, text: string): void {
    terminal.sendText(text, false);
  }

  /**
   * Waits a number of milliseconds.
   */
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
