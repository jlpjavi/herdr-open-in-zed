export type ButtonId = "open" | "cancel";

export interface Button {
    readonly id: ButtonId;
    readonly label: string;
    /** 0-based row and half-open column span `[start, end)`. */
    readonly row: number;
    readonly start: number;
    readonly end: number;
}

export interface MouseEvent {
    readonly x: number;
    readonly y: number;
    readonly press: boolean;
}

export type Key = "enter" | "escape" | "left" | "right" | "tab";

export interface MenuState {
    readonly selected: ButtonId;
}

export type MenuAction = ButtonId | null;

const BUTTONS: ReadonlyArray<{ readonly id: ButtonId; readonly label: string }> = [
    { id: "open", label: " Open in Zed " },
    { id: "cancel", label: " Cancel " },
];

export const initialState: MenuState = { selected: "open" };

/** Lays the buttons out on one row, left to right, separated by two spaces. */
export const layoutButtons = (row: number, margin: number): ReadonlyArray<Button> => {
    let column = margin;
    return BUTTONS.map(({ id, label }) => {
        const button = { id, label, row, start: column, end: column + label.length };
        column = button.end + 2;
        return button;
    });
};

export const hitTest = (
    buttons: ReadonlyArray<Button>,
    column: number,
    row: number,
): ButtonId | null =>
    buttons.find(
        (button) => button.row === row && column >= button.start && column < button.end,
    )?.id ?? null;

// SGR mouse report: ESC [ < button ; column ; row (M = press/drag, m = release), 1-based.
// oxlint-disable-next-line no-control-regex
const mousePattern = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;

/** Left-button presses (no wheel, no motion) found in a chunk of terminal input. */
export const parseMouse = (data: string): ReadonlyArray<MouseEvent> =>
    [...data.matchAll(mousePattern)].flatMap((match) => {
        const button = Number(match[1]);
        const isPlainLeft = (button & 3) === 0 && (button & 96) === 0;
        return isPlainLeft && match[4] === "M"
            ? [{ x: Number(match[2]), y: Number(match[3]), press: true }]
            : [];
    });

export const parseKey = (data: string): Key | null => {
    switch (data) {
        case "\r":
        case "\n":
            return "enter";
        case "\x1b":
        case "q":
            return "escape";
        case "\x1b[D":
        case "h":
            return "left";
        case "\x1b[C":
        case "l":
            return "right";
        case "\t":
            return "tab";
        default:
            return null;
    }
};

const other = (id: ButtonId): ButtonId => (id === "open" ? "cancel" : "open");

export const step = (
    state: MenuState,
    key: Key,
): { readonly state: MenuState; readonly action: MenuAction } => {
    switch (key) {
        case "enter":
            return { state, action: state.selected };
        case "escape":
            return { state, action: "cancel" };
        default:
            return { state: { selected: other(state.selected) }, action: null };
    }
};
