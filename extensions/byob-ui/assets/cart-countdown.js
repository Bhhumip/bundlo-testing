//global constant 
let countdownInterval = null;
function getRemainingTime(settings) {

  const savedEndTime =
    localStorage.getItem(
      'cartCountdownEndTime'
    );

  if (savedEndTime) {

    const remaining =
      Math.floor(
        (
          parseInt(savedEndTime) -
          Date.now()
        ) / 1000
      );

    return remaining;

  }

  /*
    FIRST TIMER START
  */

  const newEndTime =
    Date.now() +
    (
      settings.countdownTime *
      60 *
      1000
    );

  localStorage.setItem(
    'cartCountdownEndTime',
    newEndTime
  );

  return settings.countdownTime * 60;

}

/*
  CLOSE CART DRAWER
*/

function closeCartDrawer() {

  const drawer =
    document.querySelector(
      'cart-drawer'
    );

  if (
    drawer &&
    typeof drawer.close === 'function'
  ) {

    drawer.close();

  }

  else {

    document.body.classList.remove(
      'overflow-hidden'
    );

    const drawerOverlay =
      document.querySelector(
        '.drawer'
      );

    if (drawerOverlay) {

      drawerOverlay.classList.remove(
        'active'
      );

    }

  }

}

/*
  CLEAR CART
*/

function clearCartItems() {

  fetch('/cart/clear.js', {
    method: 'POST',
    headers: {
      'Content-Type':
        'application/json'
    }
  })
    .then(() => {

      /*
        REMOVE STORAGE
      */

      localStorage.removeItem(
        'cartCountdownEndTime'
      );

      localStorage.removeItem(
        'cartCountdownExtended'
      );

      /*
        REMOVE COUNTDOWNS
      */

      document
        .querySelectorAll(
          '.cart-page-countdown, .cart-drawer-countdown'
        )
        .forEach((el) => el.remove());

      /*
        CART PAGE
      */

      if (
        window.location.pathname ===
        '/cart'
      ) {

        window.location.reload();

      }

      /*
        CART DRAWER
      */

      else {

        closeCartDrawer();

        document.dispatchEvent(
          new CustomEvent(
            'cart:refresh'
          )
        );

      }

    });

}

/*
  CREATE COUNTDOWN
*/

function createCountdown(settings) {

  const countdown =
    document.createElement('div');

  countdown.classList.add(
    'cart-countdown-wrap'
  );

  /*
    STYLES
  */

  countdown.style.background =
    settings.bgColor;

  countdown.style.color =
    settings.textColor;

  countdown.style.border =
    `${settings.borderWidth}px ${settings.borderStyle} ${settings.borderColor}`;

  countdown.style.borderRadius =
    `${settings.borderRadius}px`;

  countdown.style.fontSize =
    `${settings.fontSize}px`;

  countdown.style.padding =
    `${settings.padding}px`;

  countdown.style.margin =
    `${settings.margin}px 0`;

  countdown.style.fontWeight =
    settings.fontBold
      ? 'bold'
      : 'normal';

  /*
  CART PAGE ONLY POSITION
*/

  if (
    window.location.pathname ===
    '/cart'
  ) {

    countdown.style.top =
      `${settings.cartTopPosition}%`;

    countdown.style.left =
      `${settings.cartLeftPosition}%`;

    /*
      INSIDE cart-items ONLY
    */

    const cartItems =
      document.querySelector(
        'cart-items'
      );

    if (cartItems) {

      cartItems.style.position =
        'relative';

    }

  }

  const cartItems =
    document.querySelector(
      'cart-items'
    );

  if (cartItems) {

    cartItems.style.position =
      'relative';

  }

  /*
    CHECK EXTENDED MODE
  */

  const isExtended =
    localStorage.getItem(
      'cartCountdownExtended'
    );

  countdown.innerHTML = `
    <div class="cart-countdown-heading">
      ${isExtended
      ? settings.extendedHeading
      : settings.mainMessage
    }
    </div>

    <div class="cart-timer-text">
      ${isExtended
      ? settings.extendedMessage
      : settings.cartMessage
    }
      <span class="cart-countdown-timer"></span>
    </div>
  `;

  const timer =
    countdown.querySelector(
      '.cart-countdown-timer'
    );

  console.log(settings.timerColor);

  timer.style.color =
    settings.timerColor;

  /*
    TIMER FUNCTION
  */

  function updateTimer() {

    const endTime =
      localStorage.getItem(
        'cartCountdownEndTime'
      );

    if (!endTime) return;

    let remaining =
      Math.floor(
        (
          parseInt(endTime) -
          Date.now()
        ) / 1000
      );

    /*
      TIMER ENDED
    */

    if (remaining <= 0) {

      const alreadyExtended =
        localStorage.getItem(
          'cartCountdownExtended'
        );

      /*
        START EXTENDED TIMER
      */

      if (
        !alreadyExtended &&
        settings.extendedTime > 0
      ) {

        localStorage.setItem(
          'cartCountdownExtended',
          'true'
        );

        const extendedEndTime =
          Date.now() +
          (
            settings.extendedTime *
            1000
          );

        localStorage.setItem(
          'cartCountdownEndTime',
          extendedEndTime
        );

        /*
          UPDATE ALL TIMERS
        */

        document
          .querySelectorAll(
            '.cart-countdown-wrap'
          )
          .forEach((item) => {

            const heading =
              item.querySelector(
                '.cart-countdown-heading'
              );

            const text =
              item.querySelector(
                '.cart-timer-text'
              );

            if (heading) {

              heading.innerHTML =
                settings.extendedHeading;

            }

            if (text) {

              text.childNodes[0].textContent =
                settings.extendedMessage + ' ';

            }

          });

        remaining =
          settings.extendedTime;

      }

      /*
        FINAL EXPIRE
      */

      else {

        clearCartItems();

        if (
          settings.expireAction ===
          'hide'
        ) {

          countdown.style.display =
            'none';

        }

        else if (
          settings.expireAction ===
          'expired_text'
        ) {

          timer.innerHTML =
            'Expired';

        }

        else {

          timer.innerHTML =
            '00:00';

        }

        return;

      }

    }

    /*
      TIMER FORMAT
    */

    let minutes =
      Math.floor(
        remaining / 60
      );

    let seconds =
      remaining % 60;

    minutes =
      minutes < 10
        ? '0' + minutes
        : minutes;

    seconds =
      seconds < 10
        ? '0' + seconds
        : seconds;

    timer.innerHTML =
      `${minutes}:${seconds}`;

  }

  /*
    INITIAL RUN
  */

  updateTimer();

  /*
    INTERVAL
  */

  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  countdownInterval = setInterval(
    updateTimer,
    1000
  );

  return countdown;

}

/*
  INIT COUNTDOWN
*/

function initCountdown() {

  const settings =
    window.cartCountdownSettings;

  if (!settings) return;

  /*
    CHECK CART ITEMS
  */

  const cartItems =
    document.querySelectorAll(
      '.cart-item, .cart-items tbody tr, .drawer__cart-items .cart-item'
    );

  if (cartItems.length === 0) {

    /*
      REMOVE ALL COUNTDOWNS
    */

    document
      .querySelectorAll(
        '.cart-page-countdown, .cart-drawer-countdown'
      )
      .forEach((el) => el.remove());

    /*
      CLEAR STORAGE
    */

    localStorage.removeItem(
      'cartCountdownEndTime'
    );

    localStorage.removeItem(
      'cartCountdownExtended'
    );

    return;

  }

  getRemainingTime(settings);

  /*
    REMOVE DUPLICATE PAGE TIMER
  */

  document
    .querySelectorAll(
      '.cart-page-countdown'
    )
    .forEach((el) => el.remove());

  /*
    REMOVE DUPLICATE DRAWER TIMER
  */

  document
    .querySelectorAll(
      '.cart-drawer-countdown'
    )
    .forEach((el) => el.remove());

  /*
    CART PAGE
  */

  const cartPage =
    document.querySelector(
      'cart-items'
    ) ||
    document.querySelector(
      '.cart__items'
    ) ||
    document.querySelector(
      'form[action="/cart"]'
    );

  if (cartPage) {

    const countdown =
      createCountdown(settings);

    countdown.classList.add(
      'cart-page-countdown'
    );

    const cartTitle =
      document.querySelector(
        '.title-wrapper-with-link'
      );

    if (cartTitle) {

      cartTitle.insertAdjacentElement(
        'afterend',
        countdown
      );

    }

  }

  /*
    CART DRAWER
  */

  const drawer =
    document.querySelector(
      'cart-drawer .drawer__inner'
    );

  if (drawer) {

    const existingCountdown =
      drawer.querySelector(
        '.cart-drawer-countdown'
      );

    if (!existingCountdown) {

      const countdown =
        createCountdown(settings);

      countdown.classList.add(
        'cart-drawer-countdown'
      );

      const drawerHeader =
        drawer.querySelector(
          '.drawer__header'
        ) ||
        drawer.querySelector(
          '.drawer__heading'
        );

      if (drawerHeader) {

        drawerHeader.insertAdjacentElement(
          'afterend',
          countdown
        );

      }

    }

  }

}

/*
  PAGE LOAD
*/

document.addEventListener(
  'DOMContentLoaded',
  initCountdown
);

/*
  SHOPIFY SECTION LOAD
*/

document.addEventListener(
  'shopify:section:load',
  function () {

    setTimeout(() => {

      initCountdown();

    }, 300);

  }
);

/*
  SHOPIFY SECTION REORDER
*/

document.addEventListener(
  'shopify:section:reorder',
  function () {

    setTimeout(() => {

      initCountdown();

    }, 300);

  }
);

/*
  AJAX CART UPDATE
*/

document.addEventListener(
  'cart:updated',
  function () {

    setTimeout(() => {

      initCountdown();

    }, 300);

  }
);

/*
  DRAWER OPEN
*/

document.addEventListener(
  'click',
  function (event) {

    const cartIcon =
      event.target.closest(
        'a[href="/cart"], .header__icon--cart'
      );

    if (!cartIcon) return;

    setTimeout(() => {

      initCountdown();

    }, 800);

  }
);

/*
  SHOPIFY SECTION RENDER DETECT
*/

/*
  OBSERVE CART DRAWER CHANGES
*/

const cartDrawerObserver =
  new MutationObserver(() => {

    const drawer =
      document.querySelector(
        'cart-drawer .drawer__inner'
      );

    if (!drawer) return;

    /*
      CHECK HEADER
    */

    const drawerHeader =
      drawer.querySelector(
        '.drawer__header'
      ) ||
      drawer.querySelector(
        '.drawer__heading'
      );

    if (!drawerHeader) return;

    /*
      ALREADY EXISTS
    */

    const existingCountdown =
      drawer.querySelector(
        '.cart-drawer-countdown'
      );

    if (existingCountdown) return;

    /*
      CHECK ITEMS
    */

    const cartItems =
      drawer.querySelectorAll(
        '.cart-item'
      );

    if (cartItems.length === 0) return;

    /*
      ADD TIMER
    */

    const settings =
      window.cartCountdownSettings;

    if (!settings) return;

    getRemainingTime(settings);

    const countdown =
      createCountdown(settings);

    countdown.classList.add(
      'cart-drawer-countdown'
    );

    drawerHeader.insertAdjacentElement(
      'afterend',
      countdown
    );

  });

cartDrawerObserver.observe(
  document.body,
  {
    childList: true,
    subtree: true
  }
);


