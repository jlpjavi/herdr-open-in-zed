import { access } from "node:fs/promises";
import { basename } from "node:path";
import { homedir } from "node:os";

import { hitTest, initialState, layoutButtons, parseKey, parseMouse, step } from "./menu-lib.ts";
import type { MenuAction, MenuState } from "./menu-lib.ts";
import { pickZedCli, projectRoot } from "./zed.ts";
import type { Shell } from "./zed.ts";

const ENTER_SCREEN = "\x1b[?1049h\x1b[?25l\x1b[?1000h\x1b[?1006h";
const LEAVE_SCREEN = "\x1b[?1006l\x1b[?1000l\x1b[?25h\x1b[?1049l";
const REVERSE = "\x1b[7m";
const RESET = "\x1b[0m";
const BUTTON_ROW = 4;
const MARGIN = 2;

const shell: Shell = {
    run: async (command, args) => {
        try {
            const child = Bun.spawn([command, ...args], { stdout: "pipe", stderr: "ignore" });
            const [output, code] = await Promise.all([
                new Response(child.stdout).text(),
                child.exited,
            ]);
            return code === 0 ? output.trim() : null;
        } catch {
            return null;
        }
    },
    exists: (path) =>
        access(path).then(
            () => true,
            () => false,
        ),
};

const cwd = process.env.ZED_OPEN_CWD;
const root = cwd ? await projectRoot(shell, cwd) : null;
const cli = await pickZedCli(shell, process.env, homedir());

const draw = (state: MenuState): void => {
    const buttons = layoutButtons(BUTTON_ROW, MARGIN);
    const lines: Array<string> = [];
    lines.push(`\x1b[2J\x1b[H`);
    lines.push(`\x1b[2;${MARGIN + 1}HOpen in Zed`);
    lines.push(`\x1b[3;${MARGIN + 1}H\x1b[2m${root ? basename(root) : "no project found"}${RESET}`);
    for (const button of buttons) {
        const style = button.id === state.selected ? REVERSE : "";
        lines.push(`\x1b[${button.row + 1};${button.start + 1}H${style}${button.label}${RESET}`);
    }
    lines.push(`\x1b[6;${MARGIN + 1}H\x1b[2mclick, or Enter / Tab / Esc${RESET}`);
    process.stdout.write(lines.join(""));
};

const finish = async (action: MenuAction): Promise<never> => {
    process.stdout.write(LEAVE_SCREEN);
    process.stdin.setRawMode(false);
    if (action === "open" && root !== null && cli !== null) {
        const child = Bun.spawn([cli, "-e", root], { stdout: "inherit", stderr: "inherit" });
        process.exit(await child.exited);
    }
    process.exit(0);
};

if (!process.stdin.isTTY) {
    console.error("zed-open: the menu needs a terminal");
    process.exit(1);
}

let state = initialState;
process.stdin.setRawMode(true);
process.stdout.write(ENTER_SCREEN);
draw(state);

process.stdin.on("data", (chunk: Buffer) => {
    const data = chunk.toString("utf8");
    const buttons = layoutButtons(BUTTON_ROW, MARGIN);
    for (const event of parseMouse(data)) {
        const hit = hitTest(buttons, event.x - 1, event.y - 1);
        if (hit !== null) {
            void finish(hit);
            return;
        }
    }
    const key = parseKey(data);
    if (key !== null) {
        const result = step(state, key);
        if (result.action !== null) {
            void finish(result.action);
            return;
        }
        state = result.state;
        draw(state);
    }
});
