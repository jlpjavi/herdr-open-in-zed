import { isAbsolute } from "node:path";

export interface ZedBuild {
    readonly name: "Zed Preview" | "Zed";
    readonly cli: string;
    /** Regex source matching the main process command line of this build. */
    readonly processPattern: string;
}

export interface Shell {
    /** Runs a command without a shell and returns trimmed stdout, or null on any failure. */
    readonly run: (command: string, args: ReadonlyArray<string>) => Promise<string | null>;
    readonly exists: (path: string) => Promise<boolean>;
}

const builds = (home: string): ReadonlyArray<ZedBuild> =>
    ["/Applications", `${home}/Applications`].flatMap((dir) => [
        {
            name: "Zed Preview" as const,
            cli: `${dir}/Zed Preview.app/Contents/MacOS/cli`,
            processPattern: `${dir}/Zed Preview.app/Contents/MacOS/zed$`,
        },
        {
            name: "Zed" as const,
            cli: `${dir}/Zed.app/Contents/MacOS/cli`,
            processPattern: `${dir}/Zed.app/Contents/MacOS/zed$`,
        },
    ]);

/**
 * Chooses the Zed CLI to use. `ZED_BIN` wins. Otherwise a running build wins, Preview
 * before stable, and finally the first installed build. Returns null when none exists.
 */
export const pickZedCli = async (
    shell: Shell,
    environment: Readonly<Record<string, string | undefined>>,
    home: string,
): Promise<string | null> => {
    const forced = environment.ZED_BIN?.trim();
    if (forced) {
        return forced;
    }

    const installed: Array<ZedBuild> = [];
    for (const build of builds(home)) {
        if (await shell.exists(build.cli)) {
            installed.push(build);
        }
    }

    const wanted = environment.ZED_HERDR_APP?.trim().toLowerCase();
    const candidates = installed.filter(
        (build) => wanted === undefined || wanted === "" || build.name.toLowerCase().includes(wanted),
    );

    for (const build of candidates) {
        if ((await shell.run("pgrep", ["-f", build.processPattern])) !== null) {
            return build.cli;
        }
    }
    return candidates[0]?.cli ?? ((await shell.exists("/usr/local/bin/zed")) ? "zed" : null);
};

/** Directory of the project to open: the git top level of `cwd`, or `cwd` itself. */
export const projectRoot = async (shell: Shell, cwd: string): Promise<string | null> => {
    if (!isAbsolute(cwd)) {
        return null;
    }
    const top = await shell.run("git", ["-C", cwd, "rev-parse", "--show-toplevel"]);
    return top !== null && top.length > 0 ? top : cwd;
};

interface PaneInfo {
    readonly pane?: { readonly foreground_cwd?: string; readonly cwd?: string };
}

/** Working directory of the pane the action was invoked from. */
export const paneCwd = async (
    shell: Shell,
    herdr: string,
    paneId: string,
): Promise<string | null> => {
    const output = await shell.run(herdr, ["pane", "get", paneId]);
    if (output === null) {
        return null;
    }
    try {
        const parsed = JSON.parse(output) as { readonly result?: PaneInfo };
        const pane = parsed.result?.pane;
        return pane?.foreground_cwd ?? pane?.cwd ?? null;
    } catch {
        return null;
    }
};
