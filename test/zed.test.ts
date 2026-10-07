import { expect, test } from "bun:test";

import { paneCwd, pickZedCli, projectRoot } from "../src/zed.ts";
import type { Shell } from "../src/zed.ts";

const HOME = "/Users/me";
const preview = "/Applications/Zed Preview.app/Contents/MacOS/cli";
const stable = "/Applications/Zed.app/Contents/MacOS/cli";

const fakeShell = (options: {
    readonly installed?: ReadonlyArray<string>;
    readonly running?: ReadonlyArray<string>;
    readonly outputs?: Readonly<Record<string, string>>;
}): Shell => ({
    exists: async (path) => options.installed?.includes(path) ?? false,
    run: async (command, args) => {
        if (command === "pgrep") {
            const pattern = args[1] ?? "";
            return options.running?.some((process) => pattern.includes(process)) ? "1234" : null;
        }
        return options.outputs?.[`${command} ${args.join(" ")}`] ?? null;
    },
});

test("ZED_BIN wins over everything", async () => {
    const shell = fakeShell({ installed: [preview, stable], running: ["Zed Preview.app"] });

    expect(await pickZedCli(shell, { ZED_BIN: "/opt/zed" }, HOME)).toBe("/opt/zed");
});

test("prefers the running build, Preview before stable", async () => {
    const both = fakeShell({ installed: [stable, preview], running: ["Zed Preview.app", "Zed.app"] });
    const onlyStable = fakeShell({ installed: [stable, preview], running: ["/Zed.app/"] });

    expect(await pickZedCli(both, {}, HOME)).toBe(preview);
    expect(await pickZedCli(onlyStable, {}, HOME)).toBe(stable);
});

test("falls back to the first installed build when none is running", async () => {
    expect(await pickZedCli(fakeShell({ installed: [stable, preview] }), {}, HOME)).toBe(preview);
    expect(await pickZedCli(fakeShell({ installed: [stable] }), {}, HOME)).toBe(stable);
});

test("ZED_HERDR_APP restricts the choice", async () => {
    const shell = fakeShell({ installed: [stable, preview], running: ["Zed Preview.app"] });

    expect(await pickZedCli(shell, { ZED_HERDR_APP: "stable" }, HOME)).toBeNull();
    expect(await pickZedCli(shell, { ZED_HERDR_APP: "preview" }, HOME)).toBe(preview);
});

test("returns null when Zed is not installed", async () => {
    expect(await pickZedCli(fakeShell({}), {}, HOME)).toBeNull();
});

test("project root is the git top level, else the directory itself", async () => {
    const shell = fakeShell({
        outputs: { "git -C /repos/app/src rev-parse --show-toplevel": "/repos/app" },
    });

    expect(await projectRoot(shell, "/repos/app/src")).toBe("/repos/app");
    expect(await projectRoot(shell, "/tmp/plain")).toBe("/tmp/plain");
    expect(await projectRoot(shell, "relative")).toBeNull();
});

test("reads the pane's foreground cwd, then cwd", async () => {
    const pane = (body: string) =>
        fakeShell({ outputs: { "herdr pane get wE:p1": `{"result":{"pane":${body}}}` } });

    expect(await paneCwd(pane('{"foreground_cwd":"/a","cwd":"/b"}'), "herdr", "wE:p1")).toBe("/a");
    expect(await paneCwd(pane('{"cwd":"/b"}'), "herdr", "wE:p1")).toBe("/b");
    expect(await paneCwd(fakeShell({}), "herdr", "wE:p1")).toBeNull();
});
