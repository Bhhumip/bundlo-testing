document.addEventListener("DOMContentLoaded", function () {

  const stickyBar =
    document.getElementById("sticky-cart-bar");

  const addBtn =
    document.getElementById("sticky-add-to-cart");

  const productForm =
    document.querySelector(
      'form[action*="/cart/add"]'
    );

  if (!stickyBar || !productForm) return;

  const productData = JSON.parse(
    document.getElementById(
      "sticky-product-json"
    ).textContent
  );

  // =========================
  // SHOW / HIDE STICKY BAR
  // =========================

  const productInfoSection =
    document.querySelector(
      '.product, .product__info-wrapper, .product-form, .product-info'
    );

  function toggleStickyCart() {

    if (!productInfoSection) return;

    const rect =
      productInfoSection.getBoundingClientRect();

    if (rect.bottom < window.innerHeight - 200) {

      stickyBar.classList.remove(
        'hide-sticky'
      );

      stickyBar.classList.add(
        'show-sticky'
      );

    } else {

      stickyBar.classList.remove(
        'show-sticky'
      );

      stickyBar.classList.add(
        'hide-sticky'
      );
    }
  }

  window.addEventListener(
    'scroll',
    toggleStickyCart
  );

  toggleStickyCart();

  // =========================
  // FORMAT MONEY
  // =========================

  function formatMoney(price) {
    const currency = window.stickyCurrencyCode || "INR";

    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency,
      currencyDisplay: "code",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price / 100);
  }

  // =========================
  // GET CURRENT VARIANT
  // =========================

  function getSelectedVariant() {

    const selectedOptions = [];

    const stickySelects =
      document.querySelectorAll('.sticky-custom-select');

    stickySelects.forEach(select => {

      const activeOption =
        select.querySelector('.sticky-select-option.active');

      if (activeOption) {
        selectedOptions.push(
          activeOption.getAttribute('data-value')
        );
      }

    });

    const matchedVariant =
      productData.variants.find(variant => {

        return selectedOptions.every((option, index) => {
          return variant[`option${index + 1}`] === option;
        });

      });

    return matchedVariant || productData.variants[0];
  }
  // =========================
  // CLOSE DROPDOWNS
  // =========================

  function closeAllDropdowns() {

    document.querySelectorAll(
      '.sticky-custom-select.active'
    ).forEach(select => {

      select.classList.remove('active');
    });
  }

  // =========================
  // UPDATE STICKY UI
  // =========================

  function updateStickyUIFromVariant() {

    const variant =
      getSelectedVariant();

    if (!variant) return;

    // PRICE

    // PRICE

    const priceEl =
      document.getElementById("sticky-price");

    if (priceEl) {

      const price = variant.price;
      const compare = variant.compare_at_price;

      if (compare && compare > price) {

        priceEl.innerHTML =
          `<s>${formatMoney(compare)}</s> ${formatMoney(price)}`;

      } else {

        priceEl.innerHTML =
          formatMoney(price);
      }
    }


    // =========================
    // IMAGE UPDATE LOGIC
    // =========================

    const stickyImage =
      document.getElementById(
        "sticky-variant-image"
      );

    if (stickyImage) {

      let imageUrl = null;

      // 1. Variant image exists → use it
      if (
        variant &&
        variant.featured_image &&
        variant.featured_image.src
      ) {

        imageUrl =
          variant.featured_image.src;

      }

      // 2. fallback → product default image
      else {

        imageUrl =
          productData.featured_image;
      }

      stickyImage.src = imageUrl;
    }

    // OPTIONS

    const stickySelects =
      document.querySelectorAll(
        '.sticky-custom-select'
      );

    stickySelects.forEach(
      (selectContainer, index) => {

        const triggerText =
          selectContainer.querySelector(
            '.sticky-select-value'
          );

        const optionButtons =
          selectContainer.querySelectorAll(
            '.sticky-select-option'
          );

        const selectedValue =
          variant[`option${index + 1}`];

        triggerText.textContent =
          selectedValue || 'Select Option';

        optionButtons.forEach(btn => {

          btn.classList.remove(
            'active'
          );

          if (
            btn.getAttribute(
              'data-value'
            ) === selectedValue
          ) {

            btn.classList.add(
              'active'
            );
          }
        });
      }
    );
  }

  // =========================
  // SYNC PRODUCT PAGE
  // =========================

  function syncWithProductPage(
    optionPosition,
    value
  ) {

    const currentSelect =
      document.querySelector(
        `.sticky-custom-select[data-option-position="${optionPosition}"]`
      );

    if (currentSelect) {

      const allOptions =
        currentSelect.querySelectorAll(
          '.sticky-select-option'
        );

      allOptions.forEach(btn => {

        btn.classList.remove(
          'active'
        );

        if (
          btn.getAttribute(
            'data-value'
          ) === value
        ) {

          btn.classList.add(
            'active'
          );
        }
      });

      const triggerText =
        currentSelect.querySelector(
          '.sticky-select-value'
        );

      if (triggerText) {

        triggerText.textContent =
          value;
      }
    }

    // PRODUCT SELECTS

    const productSelects =
      document.querySelectorAll(
        'form[action*="/cart/add"] select'
      );

    if (
      productSelects[
      optionPosition - 1
      ]
    ) {

      productSelects[
        optionPosition - 1
      ].value = value;

      productSelects[
        optionPosition - 1
      ].dispatchEvent(
        new Event(
          'change',
          { bubbles: true }
        )
      );
    }

    // PRODUCT RADIOS

    const radioInputs =
      document.querySelectorAll(
        `input[type="radio"][value="${value}"]`
      );

    radioInputs.forEach(radio => {

      radio.checked = true;

      radio.dispatchEvent(
        new Event(
          'change',
          { bubbles: true }
        )
      );

      radio.dispatchEvent(
        new Event(
          'click',
          { bubbles: true }
        )
      );
    });

    // UPDATE VARIANT INPUT

    setTimeout(() => {

      const variant =
        getSelectedVariant();

      if (!variant) return;

      const variantInput =
        document.querySelector(
          'form[action*="/cart/add"] input[name="id"]'
        );

      if (variantInput) {

        variantInput.value =
          variant.id;

        variantInput.dispatchEvent(
          new Event(
            'change',
            { bubbles: true }
          )
        );
      }

      updateStickyUIFromVariant();

    }, 100);
  }

  // =========================
  // CUSTOM SELECTS
  // =========================

  function initCustomSelects() {

    const customSelects =
      document.querySelectorAll(
        '.sticky-custom-select'
      );

    customSelects.forEach(
      selectContainer => {

        const trigger =
          selectContainer.querySelector(
            '.sticky-select-trigger'
          );

        const options =
          selectContainer.querySelectorAll(
            '.sticky-select-option'
          );

        // OPEN

        trigger.addEventListener(
          'click',
          () => {

            const isActive =
              selectContainer.classList.contains(
                'active'
              );

            closeAllDropdowns();

            if (!isActive) {

              selectContainer.classList.add(
                'active'
              );
            }
          }
        );

        // SELECT

        options.forEach(option => {

          if (
            option.getAttribute(
              'data-available'
            ) === 'false'
          ) {
            return;
          }

          option.addEventListener(
            'click',
            () => {

              const value =
                option.getAttribute(
                  'data-value'
                );

              const optionPosition =
                selectContainer.getAttribute(
                  'data-option-position'
                );

              syncWithProductPage(
                optionPosition,
                value
              );

              closeAllDropdowns();
            }
          );
        });
      }
    );

    // OUTSIDE CLICK

    document.addEventListener(
      'click',
      (e) => {

        if (
          !e.target.closest(
            '.sticky-custom-select'
          )
        ) {

          closeAllDropdowns();
        }
      }
    );
  }

  // =========================
  // PRODUCT -> STICKY SYNC
  // =========================

  document.addEventListener(
    "change",
    function () {

      setTimeout(() => {

        updateStickyUIFromVariant();

      }, 100);
    }
  );

  // =========================
  // ADD TO CART
  // =========================

  addBtn.addEventListener(
    "click",
    async function () {

      const variant = getSelectedVariant();

      if (!variant) {
        alert("Please select variant");
        return;
      }

addBtn.disabled = true;

const originalText = addBtn.innerHTML;

addBtn.innerHTML = `
  <span class="sticky-loader"></span>
`;

      try {

        const addResponse = await fetch(
          "/cart/add.js",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              id: Number(variant.id),
              quantity: 1
            })
          }
        );

        if (!addResponse.ok) {
          throw new Error("Add to cart failed");
        }

        const addedItem =
          await addResponse.json();

        // Fetch latest sections
        const sectionsRes =
          await fetch(
            "/cart?sections=cart-drawer,cart-icon-bubble,cart-live-region-text"
          );

        const sections =
          await sectionsRes.json();

        const cartDrawer =
          document.querySelector(
            "cart-drawer"
          );

        // Fallback
        if (!cartDrawer) {

          window.location.href =
            "/cart";

          return;
        }

        // Update drawer content
        cartDrawer.renderContents({

          id: addedItem.id,

          sections: sections

        });

        // Open drawer
        cartDrawer.classList.remove(
          "is-empty"
        );

        cartDrawer.classList.add(
          "active"
        );

        if (
          typeof cartDrawer.open ===
          "function"
        ) {

          cartDrawer.open();
        }

        addBtn.innerText =
          "Added";

      }
      catch (error) {

        console.error(error);

        addBtn.innerText =
          "Error";
      }

      setTimeout(() => {

        addBtn.innerHTML = originalText;
        addBtn.disabled = false;

      }, 2000);
    }
  );

  // =========================
  // INIT
  // =========================

  initCustomSelects();

  setTimeout(() => {

    updateStickyUIFromVariant();

  }, 300);

});
