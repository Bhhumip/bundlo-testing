function updateCartNote(note) {
  fetch("/cart/update.js", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note: note }),
  });
}

function getCartNote() {
  return fetch("/cart.js")
    .then((response) => response.json())
    .then((cart) => cart.note || "");
}

const BORDER_RADIUS_MAP = { none: "0px", base: "6px", large: "12px" };
const GAP_MAP = { tight: "6px", base: "10px", loose: "16px" };
const PADDING_MAP = { tight: "10px", base: "14px", loose: "20px" };

function createOrderNote(note, className, textareaId, settings) {
  const wrapper = document.createElement("div");
  wrapper.className = className;

  const radius = BORDER_RADIUS_MAP[settings.borderRadius] ?? "6px";
  const gap = GAP_MAP[settings.gap] ?? "10px";
  const padding = PADDING_MAP[settings.padding] ?? "14px";

  wrapper.style.marginBottom = gap;

  const requiredMark = settings.required
    ? '<span style="color:#dc2626;"> *</span>'
    : "";

  wrapper.innerHTML = `
    <label style="display:block; margin-bottom:8px; font-weight:600;">
      ${settings.label || "Order note"}${requiredMark}
    </label>
    <textarea
      id="${textareaId}"
      ${settings.maxLength ? `maxlength="${settings.maxLength}"` : ""}
      ${settings.required ? "required" : ""}
      placeholder="${settings.placeholder || ""}"
      style="
        width:100%;
        min-height:80px;
        padding:${padding};
        border-radius:${radius};
        border:1px solid #d1d5db;
        box-sizing:border-box;
        font-family:inherit;
      "
    >${note}</textarea>
  `;

  return wrapper;
}

async function renderOrderNote() {
  const settings = window.orderNoteSettings;
  if (!settings) return;

  const showCart = settings.showOnCartPage !== false;
  const showDrawer = settings.showInCartDrawer !== false;

  const note = await getCartNote();

  // ======================
  // CART PAGE
  // ======================
  if (
    showCart &&
    window.location.pathname === "/cart" &&
    !document.querySelector(".app-cart-note")
  ) {
    const field = createOrderNote(note, "app-cart-note", "app-order-note-page", settings);
    const cartContainer = document.querySelector("cart-items") || document.querySelector("main");

    if (cartContainer) {
      const checkoutBtn = document.querySelector("#main-cart-footer .cart__checkout-button");
      if (checkoutBtn) {
        const ctas = checkoutBtn.closest(".cart__ctas");
        if (ctas) ctas.before(field);
        else cartContainer.prepend(field);
      } else {
        cartContainer.prepend(field);
      }

      const textarea = document.getElementById("app-order-note-page");
      if (textarea) {
        textarea.addEventListener("change", function () {
          updateCartNote(this.value);
        });
      }
    }
  }

  // ======================
  // CART DRAWER
  // ======================
  const drawerContent = document.querySelector("cart-drawer .drawer__inner");

  if (showDrawer && drawerContent && !drawerContent.querySelector(".app-drawer-note")) {
    const field = createOrderNote(note, "app-drawer-note", "app-order-note-drawer", settings);
    const ctas = drawerContent.querySelector(".cart__ctas");

    if (ctas) ctas.parentNode.insertBefore(field, ctas);
    else drawerContent.prepend(field);

    const textarea = document.getElementById("app-order-note-drawer");
    if (textarea) {
      textarea.addEventListener("change", function () {
        updateCartNote(this.value);
      });
    }
  }
}

document.addEventListener("DOMContentLoaded", renderOrderNote);
setInterval(renderOrderNote, 1000);