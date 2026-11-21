// Helpers for testing the customize-form tabs (StyleTab, LayoutTab, ...).
//
// The tabs are built from <Group label>{<Field label>{control}</Field>}</Group>.
// Field labels are plain <span>s, not <label for="...">, so getByLabelText cannot
// find the controls. These helpers walk that known structure instead:
//   tab root > group div > [label span, field div, field div, ...]
//   field div > [label span, control]

export function getRoot(container) {
    return container.firstChild;
}

export function getGroupLabels(container) {
    return [...getRoot(container).children]
        .filter((el) => el.tagName === "DIV")
        .map((el) => el.firstChild.textContent);
}

export function getGroup(container, label) {
    return (
        [...getRoot(container).children].find(
            (el) => el.tagName === "DIV" && el.firstChild?.textContent === label
        ) ?? null
    );
}

export function getField(container, groupLabel, fieldLabel) {
    const group = getGroup(container, groupLabel);
    if (!group) return null;
    return [...group.children].find((el) => el.firstChild?.textContent === fieldLabel) ?? null;
}

export function getControl(container, groupLabel, fieldLabel) {
    return getField(container, groupLabel, fieldLabel)?.querySelector("select, input, textarea") ?? null;
}

export const optionValues = (select) => [...select.options].map((o) => o.value);
export const optionLabels = (select) => [...select.options].map((o) => o.textContent);

export const countControls = (container) =>
    container.querySelectorAll("input, select, textarea").length;