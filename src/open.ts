import { access } from "node:fs/promises";
import { homedir } from "node:os";

import { paneCwd, pickZedCli, projectRoot } from "./zed.ts";
import type { Shell } from "./zed.ts";

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

const fail = (message: string): never => {
    console.error(`zed-open: ${message}`);
    process.exit(1);
};

const env = process.env;
const herdr = env.HERDR_BIN_PATH ?? "herdr";

// `--cwd <dir>` skips the pane lookup, for callers that have no HerdR pane (the
// Claude Code `/zed` command).
const flag = process.argv.indexOf("--cwd");
const explicitCwd = flag === -1 ? undefined : process.argv[flag + 1];

const resolveCwd = async (): Promise<string | null> => {
    if (explicitCwd !== undefined) {
        return explicitCwd;
    }
    const paneId = env.HERDR_PANE_ID;
    if (!paneId) {
        return fail("HERDR_PANE_ID is not set; run this as a HerdR plugin action or pass --cwd");
    }
    return paneCwd(shell, herdr, paneId);
};

const cwd = await resolveCwd();
if (cwd === null) {
    fail("could not read the working directory");
}

const root = await projectRoot(shell, cwd as string);
if (root === null) {
    fail(`not an absolute directory: ${cwd}`);
}

const cli = await pickZedCli(shell, env, homedir());
if (cli === null) {
    fail("no Zed found; install Zed or set ZED_BIN");
}

// `-e` opens the project in an existing window (Zed's multi-project window) or focuses it.
const child = Bun.spawn([cli as string, "-e", root as string], {
    stdout: "inherit",
    stderr: "inherit",
});
process.exit(await child.exited);
