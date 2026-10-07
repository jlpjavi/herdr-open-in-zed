import { expect, test } from "bun:test";

import { hitTest, initialState, layoutButtons, parseKey, parseMouse, step } from "../src/menu-lib.ts";

test("lays buttons out left to right with a gap", () => {
    const [open, cancel] = layoutButtons(4, 2);

    expect(open).toMatchObject({ id: "open", row: 4, start: 2 });
    expect(cancel?.start).toBe((open?.end ?? 0) + 2);
});

test("hit test is half-open and row specific", () => {
    const buttons = layoutButtons(4, 2);
    const [open, cancel] = buttons;

    expect(hitTest(buttons, open?.start ?? 0, 4)).toBe("open");
    expect(hitTest(buttons, (open?.end ?? 0) - 1, 4)).toBe("open");
    expect(hitTest(buttons, open?.end ?? 0, 4)).toBeNull();
    expect(hitTest(buttons, cancel?.start ?? 0, 4)).toBe("cancel");
    expect(hitTest(buttons, open?.start ?? 0, 3)).toBeNull();
});

test("parses only plain left presses from SGR mouse input", () => {
    const press = "\x1b[<0;10;5M";
    const release = "\x1b[<0;10;5m";
    const wheel = "\x1b[<64;10;5M";
    const motion = "\x1b[<32;10;5M";
    const right = "\x1b[<2;10;5M";

    expect(parseMouse(press + release + wheel + motion + right)).toEqual([
        { x: 10, y: 5, press: true },
    ]);
    expect(parseMouse("hello")).toEqual([]);
});

test("keys map to menu keys", () => {
    expect(parseKey("\r")).toBe("enter");
    expect(parseKey("\x1b")).toBe("escape");
    expect(parseKey("\x1b[C")).toBe("right");
    expect(parseKey("\t")).toBe("tab");
    expect(parseKey("z")).toBeNull();
});

test("enter confirms the selection, escape cancels, arrows toggle", () => {
    expect(step(initialState, "enter").action).toBe("open");
    expect(step(initialState, "escape").action).toBe("cancel");

    const toggled = step(initialState, "right");
    expect(toggled.action).toBeNull();
    expect(toggled.state.selected).toBe("cancel");
    expect(step(toggled.state, "enter").action).toBe("cancel");
});
