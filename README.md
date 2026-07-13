# Terminal Workspace Manager

Terminal Workspace Manager is a VS Code extension that restores a custom terminal layout from a JSON configuration file stored in `.vscode/terminals.json`.

## Features

- Restore terminals automatically when a workspace opens
- Create terminals with names, icons, colors, shells, cwd and env
- Support grouped/split terminals, ordering, delays, clear commands and startup files
- Watch `.vscode/terminals.json` for changes and reload automatically
- Save the current layout back to JSON with a confirmation prompt

## Installation

1. Install the extension from the marketplace or run it from the extension development host.
2. Create a `.vscode/terminals.json` file in your workspace.
3. Reload the window or use the restore command.

## Commands

- Terminal Workspace Manager: Restore Layout
- Terminal Workspace Manager: Save Layout
- Delete All Managed Terminals
- Reload configuration

## Example configuration

```json
{
  "version": 1,
  "terminals": [
    {
      "name": "Backend",
      "workspaceFolder": "backend",
      "cwd": "./backend",
      "shell": "zsh",
      "icon": "server",
      "color": "terminal.ansiGreen",
      "command": "npm run dev",
      "show": false,
      "restore": true,
      "group": "backend",
      "order": 1,
      "delay": 0,
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

## Icons

The extension accepts any VS Code `ThemeIcon` id such as `server`, `person`, `package`, `shield`, `database`, `cloud`, `symbol-method`, `terminal`.

## Colors

The extension accepts any VS Code theme color such as `terminal.ansiGreen`, `terminal.ansiBlue`, `terminal.ansiRed`, `terminal.ansiYellow`, `terminal.ansiMagenta`, `terminal.ansiCyan`.

## Troubleshooting

- If the JSON is invalid, the extension shows an error message and logs the reason.
- If the configuration file is missing, the extension warns the user instead of crashing.
- Use the output channel named "Terminal Workspace Manager" for detailed logs.
