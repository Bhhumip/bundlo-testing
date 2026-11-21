import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

window.alert = vi.fn();
window.scrollTo = vi.fn();
window.matchMedia ??= () => ({ matches: false, addEventListener() { }, removeEventListener() { }, addListener() { }, removeListener() { } });
// recharts (used in analytics) needs this in jsdom
globalThis.ResizeObserver ??= class { observe() { } unobserve() { } disconnect() { } };

// Safety net: no test may reach the real database.
vi.mock("~/db.server", () => ({
    default: new Proxy({}, {
        get(_target, prop) {
            if (prop === "then" || prop === "__esModule") return undefined;
            throw new Error(`A test touched the real database (prisma.${String(prop)}). Mock the model module this code uses.`);
        },
    }),
}));