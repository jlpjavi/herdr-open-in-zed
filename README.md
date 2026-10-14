# herdr-open-in-zed

A HerdR plugin that opens the focused workspace's project in your running Zed or Zed Preview, **on demand**. No daemon, no auto-sync: press a key and the project shows up in Zed.

Plugin id: `jlpjavi.zed-open` · action: `open` ("Open project in Zed")

## How it works

1. Reads the working directory of the focused pane (`herdr pane get $HERDR_PANE_ID`, preferring the foreground process's cwd).
2. Resolves the Git top level with `git -C <cwd> rev-parse --show-toplevel`. Outside a repo it falls back to the cwd itself.
3. Picks a Zed CLI (see below) and runs `zed -e <root>`. Zed adds the project to its multi-project window, or focuses it if it is already open.

### Which Zed build

In order:

1. `ZED_BIN`, if set.
2. A running build, Zed Preview before stable Zed.
3. The first installed build, Zed Preview then Zed.
4. `zed` on the PATH, if `/usr/local/bin/zed` exists.

Set `ZED_HERDR_APP=preview` or `stable` to restrict the choice. macOS app locations searched: `/Applications` and `~/Applications`.

## Requirements

- macOS (Linux works only through `ZED_BIN` or `/usr/local/bin/zed`)
- [Bun](https://bun.sh)
- HerdR `>= 0.7.3`
- Git
- Zed or Zed Preview

## Install

```bash
git clone git@github.com:jlpjavi/herdr-open-in-zed.git ~/projects/herdr-open-in-zed
cd ~/projects/herdr-open-in-zed
herdr plugin link .
herdr plugin enable jlpjavi.zed-open
```

Actions run with Bun straight from `src/`; there is no build step.

Bind a key in `~/.config/herdr/config.toml`:

```toml
[[keys.command]]
key = "ctrl+alt+z"
type = "plugin_action"
command = "jlpjavi.zed-open.open"
description = "open project in zed"
```

To remove it: `herdr plugin disable jlpjavi.zed-open && herdr plugin unlink jlpjavi.zed-open`.

## Ways to trigger it

| Where | How |
| --- | --- |
| Any HerdR pane | `ctrl+alt+z` (the binding above). |
| A Claude Code pane | Type `/zed`. Needs the optional mod below. |
| Scripts | `bun src/open.ts` (uses `HERDR_PANE_ID`) or `bun src/open.ts --cwd <dir>`. |

HerdR plugin v1 has no hook to add items to its menus or sidebar, so there is no clickable indicator; the key binding is the trigger.

## Claude Code `/zed` command (optional)

`claude-mod/` is a Claude Code mod that registers a `/zed` slash command running `src/open.ts --cwd <session dir>`.

> `claude-mod/register.tsx` hardcodes absolute paths to `bun` and `open.ts` (`BUN` and `OPEN_SCRIPT`). Edit them for your machine before using it.

```bash
claude plugin validate claude-mod
claude --plugin-dir ~/projects/herdr-open-in-zed/claude-mod        # one session
```

To load it for every session, add the folder to `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of `~/.claude/settings.json`. The mod API is early access and may change between Claude Code releases.

## HerdR inside Zed's agent panel

Zed terminals belong to a project, so a newly added project has no HerdR until you start one. Let Zed start it in the agent panel's terminals. In `~/.config/zed/settings.json`:

```json
"agent": {
  "terminal_init_command": "env -u HERDR_ENV herdr"
}
```

Open an agent-panel terminal from the panel's **+** menu > New Terminal, or bind a key in `~/.config/zed/keymap.json`:

```json
{ "context": "Workspace", "bindings": { "cmd-alt-h": "agent::NewTerminalThread" } }
```

`terminal_init_command` only runs in agent-panel terminal threads, so the bottom terminal panel stays a normal shell. `env -u HERDR_ENV` stops HerdR refusing to start when Zed itself was launched from a HerdR pane; the client attaches to the same persistent session (about 15-20 MB per client).

## Troubleshooting

Errors are printed to stderr prefixed with `zed-open:`.

| Message | Cause / fix |
| --- | --- |
| `HERDR_PANE_ID is not set` | Run it as a HerdR plugin action, or pass `--cwd <dir>`. |
| `could not read the working directory` | `herdr pane get` failed; check `HERDR_BIN_PATH` or that `herdr` is on the PATH. |
| `not an absolute directory` | The cwd was relative or empty. |
| `no Zed found` | Install Zed or set `ZED_BIN` to its CLI. |

## Development

```bash
bun test
```

| Path | Purpose |
| --- | --- |
| `herdr-plugin.toml` | Plugin manifest and the `open` action. |
| `src/open.ts` | Entry point: resolve cwd, pick Zed, run `zed -e`. |
| `src/zed.ts` | Pure helpers: Zed build selection, Git root, pane cwd. |
| `test/zed.test.ts` | Unit tests for the helpers. |
| `claude-mod/` | Optional Claude Code `/zed` command. |
