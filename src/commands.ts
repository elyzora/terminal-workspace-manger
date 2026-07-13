/**
 * @module commands
 *
 * Registers extension commands and keeps the command wiring separate from the
 * activation lifecycle.
 */

import * as vscode from "vscode";
import { Commands } from "./models";
import { Logger } from "./logger";
import { restoreService } from "./restore";
import { saveService } from "./save";

/**
 * Registers all extension commands and returns the disposables.
 */
export function registerCommands(): vscode.Disposable[] {
  const logger = Logger.getInstance();

  const disposables: vscode.Disposable[] = [];

  disposables.push(
    vscode.commands.registerCommand(Commands.RESTORE, async () => {
      try {
        await restoreService.restoreLayout();
      } catch (error) {
        logger.error("Restore command failed", error);
        vscode.window.showErrorMessage(
          "Failed to restore terminals. See the output channel for details.",
        );
      }
    }),
  );

  disposables.push(
    vscode.commands.registerCommand(Commands.SAVE, async () => {
      try {
        await saveService.saveLayout();
      } catch (error) {
        logger.error("Save command failed", error);
        vscode.window.showErrorMessage(
          "Failed to save terminal layout. See the output channel for details.",
        );
      }
    }),
  );

  disposables.push(
    vscode.commands.registerCommand(Commands.DELETE, () => {
      try {
        restoreService.getTerminalManager().disposeManagedTerminals();
        vscode.window.showInformationMessage("Managed terminals removed.");
      } catch (error) {
        logger.error("Delete command failed", error);
        vscode.window.showErrorMessage("Failed to delete managed terminals.");
      }
    }),
  );

  disposables.push(
    vscode.commands.registerCommand(Commands.RELOAD, async () => {
      try {
        await restoreService.restoreLayout();
      } catch (error) {
        logger.error("Reload command failed", error);
        vscode.window.showErrorMessage("Failed to reload terminal layout.");
      }
    }),
  );

  return disposables;
}
