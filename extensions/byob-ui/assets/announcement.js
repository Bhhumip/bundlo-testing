function createBar(sourceBar, className) {
  const clone = sourceBar.cloneNode(true);

  clone.id = "";
  clone.style.display = "block";
  clone.classList.add(className);
  clone.classList.add("announcement-bar-rendered");

  return clone;
}

function initAnnouncementSlider() {
  const sourceBar = document.getElementById(
    "app-announcement-bar"
  );

  if (!sourceBar) return;

  const enableScroll =
    sourceBar.dataset.enableScroll === "true";

  const bars = document.querySelectorAll(
    ".announcement-bar-rendered"
  );

  bars.forEach((bar) => {
    if (bar.dataset.sliderInitialized === "true")
      return;

    const messages = Array.from(
      bar.querySelectorAll(
        ".announcement-message"
      )
    ).filter((msg) =>
      msg.textContent.trim()
    );

    if (!messages.length) return;

    bar.dataset.sliderInitialized = "true";

    bar.innerHTML = "";

    // Drawer should ALWAYS scroll
    const shouldScroll =
      bar.classList.contains(
        "announcement-drawer"
      )
        ? true
        : enableScroll;

    if (shouldScroll) {
      const track =
        document.createElement("div");

      track.className =
        "announcement-track";

      const allMessages = [
        ...messages,
        ...messages
      ];

      allMessages.forEach((msg) => {
        const item =
          document.createElement("span");

        item.textContent =
          msg.textContent;

        track.appendChild(item);
      });

      bar.appendChild(track);
    }

    // Static mode only for Home & Cart pages
    else {
      messages.forEach((msg) => {
        const item =
          document.createElement("span");

        item.className =
          "announcement-static-item";

        item.textContent =
          msg.textContent;

        bar.appendChild(item);
      });
    }
  });
}

function initAnnouncementBar() {
  const sourceBar = document.getElementById("app-announcement-bar");
  const showHome = sourceBar.dataset.showHome === "true";
const showCart = sourceBar.dataset.showCart === "true";
const showCartDrawer =
  sourceBar.dataset.showCartDrawer === "true";

  if (!sourceBar) return;

  sourceBar.style.display = "none";

  const homePosition = sourceBar.dataset.homePosition;
  const cartPosition = sourceBar.dataset.cartPosition;

  const pathname = window.location.pathname;

  // HOME PAGE
  if (
  showHome &&
  pathname === "/" &&
  !document.querySelector(".announcement-home")
) {
    const bar = createBar(sourceBar, "announcement-home");

    if (homePosition === "top") {
      document.body.prepend(bar);
    } else {
      const header = document.querySelector("header");

      if (header) {
        header.insertAdjacentElement("afterend", bar);
      }
    }
  }

  // CART PAGE
  if (
  showCart &&
  pathname === "/cart" &&
  !document.querySelector(".announcement-cart")
){
    const bar = createBar(sourceBar, "announcement-cart");

    if (cartPosition === "top") {
      document.body.prepend(bar);
    } else {
      const header = document.querySelector("header");

      if (header) {
        header.insertAdjacentElement("afterend", bar);
      } else {
        const main = document.querySelector("main");

        if (main) {
          main.insertAdjacentElement("beforebegin", bar);
        } else {
          document.body.prepend(bar);
        }
      }
    }
  }

  // CART DRAWER
  const drawerContent = document.querySelector(
    "cart-drawer .drawer__inner"
  );

if (
  showCartDrawer &&
  drawerContent &&
  !drawerContent.querySelector(".announcement-drawer")
) {
    const drawerBar = createBar(
      sourceBar,
      "announcement-drawer"
    );

    drawerContent.prepend(drawerBar);
  }

  initAnnouncementSlider();
}

document.addEventListener("DOMContentLoaded", () => {
  initAnnouncementBar();
});

// Cart drawer AJAX updates
setInterval(() => {
  initAnnouncementBar();
}, 1000);


