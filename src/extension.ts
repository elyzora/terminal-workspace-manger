import * as vscode from "vscode";
import { Commands, ExtensionConstants } from "./models";
import { Logger } from "./logger";
import { registerCommands } from "./commands";
import { restoreService } from "./restore";
import { WorkspaceWatcher } from "./workspace";

/**
 * Activates the extension when VS Code starts or when a relevant command is invoked.
 */
export function activate(context: vscode.ExtensionContext): void {
  const logger = Logger.getInstance();
  logger.info("Extension activated");

  const disposables = registerCommands();
  context.subscriptions.push(...disposables);

  const workspaceWatcher = new WorkspaceWatcher();
  context.subscriptions.push(workspaceWatcher);

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      logger.info("Workspace folders changed; restoring layout.");
      void restoreService.restoreLayout({
        disposeExisting: true,
        showProgress: false,
      });
    }),
  );

  void restoreService
    .restoreLayout({ disposeExisting: true, showProgress: false })
    .catch((error) => {
      logger.error("Initial restore failed", error);
    });
}

/**
 * Cleans up the extension on deactivation.
 */
export function deactivate(): void {
  Logger.getInstance().dispose();
  restoreService.getTerminalManager().disposeManagedTerminals();
}
