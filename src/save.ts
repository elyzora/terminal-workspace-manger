/**
 * @module save
 *
 * Implements the "Save Layout" command.
 *
 * The current implementation inspects existing managed terminals and generates a
 * JSON document that can be saved to `.vscode/terminals.json` after a user
 * confirms the overwrite. The generated file is intentionally conservative and
 * only includes the fields the extension can infer from the live terminals.
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { ExtensionConstants, ITerminalsFile } from "./models";
import { Logger } from "./logger";
import { restoreService } from "./restore";

/**
 * Service for saving a terminal layout to disk.
 */
export class SaveService {
  private readonly logger = Logger.getInstance();

  /**
   * Exports the current terminal layout into `.vscode/terminals.json`.
   */
  public async saveLayout(): Promise<void> {
    const terminals = restoreService.getTerminalManager().getManagedTerminals();
    if (terminals.length === 0) {
      vscode.window.showWarningMessage(
        "No managed terminals are available to save.",
      );
      return;
    }

    const targetPath = this.getConfigPath();
    const exists = await this.exists(targetPath);
    if (exists) {
      const overwrite = await vscode.window.showWarningMessage(
        "A terminals.json file already exists. Overwrite it?",
        { modal: true },
        "Yes",
        "No",
      );
      if (overwrite !== "Yes") {
        this.logger.info("Save cancelled by user.");
        return;
      }
    }

    const content: ITerminalsFile = {
      version: ExtensionConstants.SCHEMA_VERSION,
      terminals: terminals.map((managed) => ({
        name: managed.config.name,
        cwd: managed.config.cwd,
        shell: managed.config.shell,
        icon: managed.config.icon,
        color: managed.config.color,
        command: managed.config.command,
        show: managed.config.show,
        restore: managed.config.restore,
        group: managed.config.group,
        order: managed.config.order,
        delay: managed.config.delay,
        clear: managed.config.clear,
        env: managed.config.env,
        workspaceFolder: managed.config.workspaceFolder,
        closeOnExit: managed.config.closeOnExit,
      })),
    };

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, JSON.stringify(content, null, 2));
    vscode.window.showInformationMessage(
      "Terminal layout saved to .vscode/terminals.json",
    );
    this.logger.info("Layout saved", { path: targetPath });
  }

  private getConfigPath(): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const basePath = workspaceFolder?.uri.fsPath ?? process.cwd();
    return path.join(
      basePath,
      ExtensionConstants.CONFIG_DIR,
      ExtensionConstants.CONFIG_FILENAME,
    );
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export const saveService = new SaveService();
