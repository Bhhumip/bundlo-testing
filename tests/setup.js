import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

window.alert = vi.fn();
window.scrollTo = vi.fn();
window.matchMedia ??= () => ({ matches: false, addEventListener() { }, removeEventListener() { }, addListener() { }, removeListener() { } });
// recharts (used in analytics) needs this in jsdom
globalThis.ResizeObserver ??= class { observe() { } unobserve() { } disconnect() { } };