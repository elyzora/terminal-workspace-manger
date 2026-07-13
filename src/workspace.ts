/**
 * @module workspace
 *
 * Watches for workspace changes and configuration-file updates so the
 * terminal layout can be reloaded automatically when needed.
 */

import * as path from "path";
import * as vscode from "vscode";
import { ExtensionConstants } from "./models";
import { Logger } from "./logger";
import { restoreService } from "./restore";

/**
 * Manages workspace-level watchers for terminals.json.
 */
export class WorkspaceWatcher {
  private readonly logger = Logger.getInstance();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly watcher = vscode.workspace.createFileSystemWatcher(
    ExtensionConstants.CONFIG_GLOB,
  );

  public constructor() {
    this.disposables.push(this.watcher);
    this.watcher.onDidChange(() => this.handleConfigChange());
    this.watcher.onDidCreate(() => this.handleConfigChange());
    this.watcher.onDidDelete(() => this.handleConfigChange());
  }

  /**
   * Disposes the watcher and its subscriptions.
   */
  public dispose(): void {
    vscode.Disposable.from(...this.disposables).dispose();
  }

  /**
   * Handles config changes by reloading the terminal layout.
   */
  private async handleConfigChange(): Promise<void> {
    try {
      this.logger.info("Configuration changed; reloading terminals.");
      await restoreService.restoreLayout({
        disposeExisting: true,
        showProgress: false,
      });
    } catch (error) {
      this.logger.error(
        "Failed to reload terminals after configuration change.",
        error,
      );
    }
  }
}
