import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";

class MockElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.style = {};
    this.listeners = {};
    this.className = "";
    this.textContent = "";
    this._value = "";
    Object.defineProperty(this, "value", {
      get: () => this._value,
      set: value => { this._value = String(value); },
    });
    this.classList = {
      add: className => {
        if (!this.className.split(/\s+/).includes(className)) {
          this.className = `${this.className} ${className}`.trim();
        }
      },
      remove: className => {
        this.className = this.className.split(/\s+/).filter(name => name !== className).join(" ");
      },
    };
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  append(...children) {
    children.forEach(child => this.appendChild(child));
  }

  replaceChildren(...children) {
    this.children = [];
    this.append(...children);
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = element => {
      for (const child of element.children) {
        if (selector.startsWith(".")) {
          if (child.className.split(/\s+/).includes(selector.slice(1))) matches.push(child);
        } else if (selector === "button" && child.tagName === "BUTTON") {
          matches.push(child);
        } else if (selector === child.tagName.toLowerCase()) {
          matches.push(child);
        }
        visit(child);
      }
    };
    visit(this);
    return matches;
  }

  closest(selector) {
    let element = this;
    while (element) {
      if (selector.startsWith(".") && element.className.split(/\s+/).includes(selector.slice(1))) {
        return element;
      }
      element = element.parentElement;
    }
    return null;
  }
}

function findById(root, id) {
  if (root.id === id) return root;
  for (const child of root.children) {
    const match = findById(child, id);
    if (match) return match;
  }
  return null;
}

async function renderProduct(product) {
  const component = { productId: `gid://shopify/Product/${product.id}` };
  const componentData = new MockElement("script");
  componentData.id = "bundle-components-json";
  componentData.textContent = JSON.stringify([component]);
  const bundleWrapper = new MockElement("div");
  bundleWrapper.id = "bundle-builder";
  const container = new MockElement("div");
  container.id = "bundle-steps-container";
  const documentRoot = new MockElement("document");
  documentRoot.append(bundleWrapper, componentData, container);
  const documentListeners = {};

  const document = {
    addEventListener: (type, listener) => {
      documentListeners[type] = listener;
    },
    createElement: tagName => new MockElement(tagName),
    getElementById: id => findById(documentRoot, id),
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  const source = await readFile(new URL("./bundle-builder.js", import.meta.url), "utf8");

  runInNewContext(source, {
    document,
    window: { Shopify: { routes: { root: "/" } } },
    fetch: async () => ({ json: async () => ({ products: [product] }) }),
    console: { log() {}, warn() {}, error() {} },
  });
  documentListeners.DOMContentLoaded();
  await new Promise(resolve => setTimeout(resolve, 0));
  return container;
}

test("renders hostile product titles and variant values as inert DOM text/data", async () => {
  const title = `Title </script><img src=x onerror="globalThis.xss=1"> ' "`;
  const optionName = `Size" data-x="1"><svg onload="globalThis.xss=1">`;
  const optionValue = `Red"><img src=x onerror="globalThis.xss=1"> '`;
  const scriptClosingValue = `</script><svg onload="globalThis.xss=1">`;
  const container = await renderProduct({
    id: 123,
    title,
    handle: "safe-handle",
    images: [],
    options: [{ name: optionName }],
    variants: [
      { id: 456, title: optionValue, option1: optionValue, available: true, price: 100 },
      { id: 789, title: scriptClosingValue, option1: scriptClosingValue, available: true, price: 200 },
    ],
  });

  const step = container.children[0];
  const renderedTitle = step.querySelector(".bundle-step__title");
  const label = step.querySelector(".bundle-options__label");
  const buttons = step.querySelector(".bundle-options").querySelectorAll("button");

  assert.equal(renderedTitle.textContent, `1. Choose your ${title}`);
  assert.equal(label.textContent, optionName);
  assert.equal(buttons.length, 2);
  assert.equal(buttons[0].textContent, optionValue);
  assert.equal(buttons[0].dataset.value, optionValue);
  assert.equal(buttons[1].textContent, scriptClosingValue);
  assert.equal(buttons[1].dataset.value, scriptClosingValue);
  assert.equal(step.querySelectorAll("img").length, 1);
  assert.equal(step.querySelectorAll("svg").length, 0);
  assert.equal(step.querySelectorAll("script").length, 0);
  assert.equal(step.querySelectorAll("img")[0].attributes.onerror, undefined);
  assert.equal(buttons[0].attributes.onclick, undefined);
  assert.equal(typeof buttons[0].listeners.click, "function");
  buttons[1].listeners.click();
  assert.equal(buttons[1].className.includes("selected"), true);
  assert.equal(findById(container, "selected-variant-123").value, "789");
});
