function getCart() {
    return fetch("/cart.js").then((r) => r.json());
}

function buildField(settings, containerClass) {
    const wrapper = document.createElement("div");
    wrapper.className = `discount-wrapper ${containerClass}`;
    wrapper.style.gap = `${settings.gap}px`;

    wrapper.innerHTML = `
        ${settings.heading ? `<div class="discount-heading" style="font-size:14px;font-weight:600;margin-bottom:8px;">${settings.heading}</div>` : ""}
        <div style="display:flex; align-items:center; gap:${settings.gap}px; width:100%; flex-wrap:wrap;">
            <input
                type="text"
                class="discount-input"
                placeholder="${settings.placeholder || ""}"
                style="
                    border-color:${settings.inputBorderColor};
                    border-radius:${settings.inputBorderRadius}px;
                    height:${settings.inputHeight}px;
                    font-size:${settings.fontSize}px;
                    flex:1 1 180px;
                    min-width:0;
                "
            />
            <button
                type="button"
                class="discount-apply-btn"
                style="
                    background:${settings.buttonBackground};
                    color:${settings.buttonTextColor};
                    border-radius:${settings.buttonRadius}px;
                    height:${settings.inputHeight}px;
                    font-size:${settings.fontSize}px;
                    flex:0 0 auto;
                "
            >${settings.buttonLabel}</button>
        </div>
        <div class="discount-message" style="font-size:12px; margin-top:6px; display:none;"></div>
    `;

    const input = wrapper.querySelector(".discount-input");
    const button = wrapper.querySelector(".discount-apply-btn");

    button.addEventListener("click", () => {
        const code = input.value.trim();
        if (!code) return;
        button.disabled = true;
        sessionStorage.setItem("pendingDiscountCode", code);
        const redirectPath = window.location.pathname;
        window.location.href = `${window.location.origin}/discount/${encodeURIComponent(code)}?redirect=${encodeURIComponent(redirectPath)}`;
    });

    return wrapper;
}

function insertAtPosition(container, field, position, ctasSelector) {
    if (position === "checkout") {
        const ctas = document.querySelector(ctasSelector);
        if (ctas) {
            ctas.parentNode.insertBefore(field, ctas);
            return;
        }
    }
    // "top", "subtotal", or checkout-selector-not-found fallback
    container.prepend(field);
}

async function showPendingResult(settings) {
    const pendingCode = sessionStorage.getItem("pendingDiscountCode");
    if (!pendingCode) return;

    sessionStorage.removeItem("pendingDiscountCode");
    const cart = await getCart();
    const applied = (cart.discount_codes || []).some(
        (d) => d.code?.toLowerCase() === pendingCode.toLowerCase() && d.applicable
    );

    document.querySelectorAll(".discount-message").forEach((el) => {
        el.style.display = "block";
        if (applied) {
            el.textContent = settings.successMessage;
            el.style.color = settings.successColor;
        } else {
            el.textContent = settings.errorMessage;
            el.style.color = settings.errorColor;
        }
    });
}

function renderDiscountField() {
    const settings = window.discountCodeFieldSettings;
    if (!settings || settings.enabled === false) return;

    // CART PAGE
    if (
        settings.showOnCartPage !== false &&
        window.location.pathname === "/cart" &&
        !document.querySelector(".discount-cart")
    ) {
        const cartContainer =
            document.querySelector("cart-items") || document.querySelector("main");
        if (cartContainer) {
            const field = buildField(settings, "discount-cart");
            insertAtPosition(
                cartContainer,
                field,
                settings.insertPosition,
                "#main-cart-footer .cart__checkout-button"
            );
        }
    }

    // CART DRAWER
    const drawer = document.querySelector("cart-drawer .drawer__inner");
    if (
        settings.showInCartDrawer !== false &&
        drawer &&
        !drawer.querySelector(".discount-drawer")
    ) {
        const field = buildField(settings, "discount-drawer");
        insertAtPosition(drawer, field, settings.insertPosition, ".cart__ctas");
    }

    showPendingResult(settings);
}

document.addEventListener("DOMContentLoaded", renderDiscountField);
document.addEventListener("cart:updated", () => setTimeout(renderDiscountField, 300));

const discountDrawerObserver = new MutationObserver(() => {
    const drawer = document.querySelector("cart-drawer .drawer__inner");
    if (!drawer) return;
    renderDiscountField();
});
discountDrawerObserver.observe(document.body, { childList: true, subtree: true });