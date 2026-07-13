/**
 * @module restore
 *
 * Coordinates the terminal restoration workflow.
 *
 * Responsibilities:
 * - load and validate configuration
 * - order terminals according to their `order` value
 * - group terminals that share a `group` so they split together
 * - create terminals in the correct sequence
 */

import * as vscode from "vscode";
import { IResolvedTerminalConfig, IRestoreOptions } from "./models";
import { Logger } from "./logger";
import { parser } from "./parser";
import { TerminalManager } from "./terminal";

/**
 * Orchestrates the restore flow for the configured terminals.
 */
export class RestoreService {
  private readonly logger = Logger.getInstance();
  private readonly terminalManager = new TerminalManager();

  /**
   * Restores the workspace layout from configuration.
   */
  public async restoreLayout(options: IRestoreOptions = {}): Promise<void> {
    const disposeExisting = options.disposeExisting ?? true;
    const showProgress = options.showProgress ?? true;

    if (disposeExisting) {
      this.terminalManager.disposeManagedTerminals();
    }

    const configs = await parser.resolveConfiguration();
    if (configs.length === 0) {
      this.logger.warn("No terminals configured for restoration.");
      return;
    }

    const sorted = this.sortTerminals(configs);
    const groups = this.groupBySplitGroup(sorted);

    if (showProgress) {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Restoring terminal layout",
          cancellable: false,
        },
        async () => {
          await this.createInOrder(groups);
        },
      );
    } else {
      await this.createInOrder(groups);
    }
  }

  /**
   * Returns the terminal manager used by this service.
   */
  public getTerminalManager(): TerminalManager {
    return this.terminalManager;
  }

  /**
   * Sorts terminals by explicit order, falling back to array position.
   */
  private sortTerminals(
    configs: readonly IResolvedTerminalConfig[],
  ): IResolvedTerminalConfig[] {
    return [...configs].sort((left, right) => {
      const leftOrder = left.order ?? Number.POSITIVE_INFINITY;
      const rightOrder = right.order ?? Number.POSITIVE_INFINITY;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return configs.indexOf(left) - configs.indexOf(right);
    });
  }

  /**
   * Groups terminals by shared `group` so sibling terminals open together.
   *
   * The current implementation preserves the order of the first terminal in
   * each group while keeping grouped terminals adjacent in the create queue.
   */
  private groupBySplitGroup(
    configs: readonly IResolvedTerminalConfig[],
  ): IResolvedTerminalConfig[][] {
    const groups: IResolvedTerminalConfig[][] = [];
    const seen = new Set<string>();

    for (const config of configs) {
      if (!config.group) {
        groups.push([config]);
        continue;
      }

      const key = config.group;
      const existingGroup = groups.find((entry) =>
        entry.some((item) => item.group === key),
      );
      if (existingGroup) {
        existingGroup.push(config);
      } else {
        const newGroup = [config];
        groups.push(newGroup);
        seen.add(key);
      }
    }

    return groups;
  }

  /**
   * Creates terminals in the correct order, one group at a time.
   */
  private async createInOrder(
    groups: readonly IResolvedTerminalConfig[][],
  ): Promise<void> {
    for (const group of groups) {
      if (group.length === 1) {
        await this.terminalManager.createTerminal(group[0]);
        continue;
      }

      const [first, ...rest] = group;
      await this.terminalManager.createTerminal(first);
      for (const config of rest) {
        await this.terminalManager.createTerminal(config);
      }
    }
  }
}

export const restoreService = new RestoreService();
