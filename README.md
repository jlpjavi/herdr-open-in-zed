# Open in Zed (HerdR plugin)

Open the focused workspace's project in your running Zed or Zed Preview, **on demand**. No daemon, no auto-sync.

It runs `zed -e <git root>`, which adds the project to Zed's multi-project window or focuses it if it is already there. The Zed build is chosen in this order:

1. `ZED_BIN`, if set.
2. A running build, Zed Preview before stable Zed.
3. The first installed build (Zed Preview, then Zed).

Set `ZED_HERDR_APP=preview` or `stable` to restrict the choice. macOS app paths searched: `/Applications` and `~/Applications`.

## Ways to trigger it

| Where | How |
| --- | --- |
| Any HerdR pane | `ctrl+alt+z` opens a small popup. Click **Open in Zed** (or Enter, Tab to switch, Esc to cancel). |
| A Claude Code pane | Click the **Open in Zed** button above the prompt (hotkey `z` after focusing the band). Needs the mod below. |
| Scripts | `bun src/open.ts` (uses the focused pane) or `bun src/open.ts --cwd <dir>`. |

HerdR itself has no hook to add items to its menus or sidebar (plugin v1), so the click targets are the popup and the Claude Code button.

## Install

```bash
cd ~/projects/herdr-open-in-zed
herdr plugin link .
herdr plugin enable jlpjavi.zed-open
```

Actions run with Bun straight from `src/`; there is no build step.

Bind the popup to a key in `~/.config/herdr/config.toml`:

```toml
[[keys.command]]
key = "ctrl+alt+z"
type = "plugin_action"
command = "jlpjavi.zed-open.menu"
description = "open project in zed (menu)"
```

`jlpjavi.zed-open.open` runs the open directly with no popup.

## Claude Code button (optional)

`claude-mod/` is a Claude Code mod that draws an **Open in Zed** button above the prompt and runs `src/open.ts --cwd <session dir>`. Validate with `claude plugin validate claude-mod`.

Load it for one session with `claude --plugin-dir ~/projects/herdr-open-in-zed/claude-mod`, or for every session by adding the folder to `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of `~/.claude/settings.json`. Clicks reach the button only in Claude Code's fullscreen mode; otherwise focus the band and press `z`. The mod API is early access and may change between Claude Code releases.

## herdr in Zed's agent panel

Zed terminals belong to a project, so a newly added project has no herdr until you start one. Zed can start it for you in the agent panel's terminals. In `~/.config/zed/settings.json`:

```json
"agent": {
  "terminal_init_command": "env -u HERDR_ENV herdr"
}
```

Then open an agent-panel terminal with the panel's **+** menu > New Terminal, or bind a key in `~/.config/zed/keymap.json`:

```json
{ "context": "Workspace", "bindings": { "cmd-alt-h": "agent::NewTerminalThread" } }
```

`terminal_init_command` only runs in agent-panel terminal threads, so the bottom terminal panel stays a normal shell. `env -u HERDR_ENV` stops HerdR refusing to start when Zed itself was launched from a HerdR pane; the client attaches to the same persistent session (about 15–20 MB per client).

## Development

```bash
bun test
```
