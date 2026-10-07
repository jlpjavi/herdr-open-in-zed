import { paneCwd } from "./zed.ts";
import type { Shell } from "./zed.ts";

/**
 * Action entry point: finds the focused workspace's directory and opens the menu popup
 * with it. A popup gets no HERDR_PANE_ID, so the directory travels in ZED_OPEN_CWD.
 */
const herdr = process.env.HERDR_BIN_PATH ?? "herdr";

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
    exists: async () => false,
};

interface Context {
    readonly workspace_cwd?: string;
    readonly focused_pane_cwd?: string;
}

const fromContext = (): string | null => {
    try {
        const context = JSON.parse(process.env.HERDR_PLUGIN_CONTEXT_JSON ?? "{}") as Context;
        return context.workspace_cwd ?? context.focused_pane_cwd ?? null;
    } catch {
        return null;
    }
};

const paneId = process.env.HERDR_PANE_ID;
const cwd = fromContext() ?? (paneId ? await paneCwd(shell, herdr, paneId) : null);
if (cwd === null) {
    console.error("zed-open: could not find the workspace directory");
    process.exit(1);
}

const child = Bun.spawn(
    [
        herdr,
        "plugin",
        "pane",
        "open",
        "--plugin",
        "jlpjavi.zed-open",
        "--entrypoint",
        "menu",
        "--env",
        `ZED_OPEN_CWD=${cwd}`,
        "--focus",
    ],
    { stdout: "inherit", stderr: "inherit" },
);
process.exit(await child.exited);
