const bundleState = {};
const variantsByProduct = Object.create(null);

// ── Accordion toggle ──────────────────────────────────────────────────
function toggleStep(stepIndex) {
  const content = document.getElementById('step-content-' + stepIndex);
  const icon = document.getElementById('toggle-icon-' + stepIndex);
  if (!content) return;
  const isOpen = content.style.display !== 'none';
  content.style.display = isOpen ? 'none' : 'block';
  if (icon) icon.textContent = isOpen ? '+' : '−';
}

// ── Option selection ──────────────────────────────────────────────────
function selectOption(btn, productId, optionIndex, value) {
  const group = btn.closest('.bundle-options');
  group.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  if (!bundleState[productId]) bundleState[productId] = {};
  bundleState[productId][optionIndex] = value;
  matchVariant(String(productId));
}

// ── Safe variants JSON parse ──────────────────────────────────────────
function parseVariantsJSON(productId) {
  const variants = variantsByProduct[productId];
  return Array.isArray(variants) ? variants : null;
}

// ── Variant matching — image INSTANT update ───────────────────────────
function matchVariant(productId) {
  const variants = parseVariantsJSON(productId);
  if (!variants || variants.length === 0) return;

  const selected = bundleState[productId] || {};

  let matched = variants.find(v => {
    return Object.entries(selected).every(([idx, value]) => {
      return String(v['option' + (Number(idx) + 1)]) === String(value);
    });
  });

  if (!matched) {
    matched = variants.find(v => v.available) || variants[0];
  }

  const hiddenInput = document.getElementById(
    'selected-variant-' + productId
  );

  if (hiddenInput) {
    hiddenInput.value = matched.id;
  }

  const thumb = document.getElementById('thumb-' + productId);

  if (thumb && matched.featured_image?.src) {
    thumb.src = matched.featured_image.src;
  }

  console.log(
    '[Bundle Variant]',
    productId,
    matched.id,
    matched.title
  );
}

// ── Price total ───────────────────────────────────────────────────────
function updateBundleTotal() {
  const totalEl = document.getElementById('bundle-total');
  if (!totalEl) return;

  let total = parseInt(totalEl.dataset.basePrice || 0, 10);

  Object.keys(variantsByProduct).forEach(productId => {
    const variants = parseVariantsJSON(productId);
    if (!variants) return;
    const inputEl = document.getElementById('selected-variant-' + productId);
    const selectedId = inputEl && inputEl.value;
    if (!selectedId) return;
    const variant = variants.find(v => String(v.id) === String(selectedId));
    if (variant && typeof variant.price === 'number') total += variant.price;
  });

  totalEl.textContent = formatMoney(total);
}

function formatMoney(cents) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// ── Error helpers ─────────────────────────────────────────────────────
function showBundleError(msg) {
  const errEl = document.getElementById('bundle-error');
  if (errEl) {
    errEl.textContent = msg;
    errEl.style.display = 'block';
    errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
function clearBundleError() {
  const errEl = document.getElementById('bundle-error');
  if (errEl) errEl.style.display = 'none';
}

// ── Render variant buttons ────────────────────────────────────────────
function renderVariantOptions(product, container) {
  if (!product.options || product.options.length === 0) return;

  product.options.forEach((option, optionIndex) => {
    const optionName = (typeof option === 'object' && option !== null)
      ? (option.name || String(option))
      : String(option);

    const isColor = /colou?r/i.test(optionName);
    const group = document.createElement('div');
    group.className = isColor
      ? 'bundle-options bundle-options--color'
      : 'bundle-options bundle-options--text';
    group.dataset.product = String(product.id);
    group.dataset.optionIndex = String(optionIndex);
    group.dataset.optionName = optionName;

    const label = document.createElement('div');
    label.className = 'bundle-options__label';
    label.textContent = optionName;
    container.appendChild(label);

    const seen = new Set();
    const values = [];
    product.variants.forEach(v => {
      const optionValue = v['option' + (optionIndex + 1)];
      if (optionValue != null && optionValue !== '') {
        const value = String(optionValue);
        if (!seen.has(value)) {
          seen.add(value);
          values.push(value);
        }
      }
    });

    values.forEach((value, valueIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = (isColor ? 'bundle-swatch' : 'bundle-option-btn')
        + (valueIndex === 0 ? ' selected' : '');
      button.dataset.value = value;
      if (isColor) button.style.backgroundColor = value;
      if (!isColor) button.textContent = value;
      button.addEventListener('click', () => {
        selectOption(button, String(product.id), optionIndex, value);
      });
      group.appendChild(button);
    });

    container.appendChild(group);
  });
}

// ── Parse bundle-components-json ──────────────────────────────────────
function parseBundleComponents() {
  const metaEl = document.getElementById('bundle-components-json');
  if (!metaEl) return null;
  let raw;
  try {
    raw = JSON.parse(metaEl.textContent.trim());
  } catch (e) {
    console.error('[Bundle] bundle-components-json parse error:', e);
    return null;
  }
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.components)) return raw.components;
  console.error('[Bundle] Unexpected bundle-components-json structure:', raw);
  return null;
}

// ── Fetch + render steps ──────────────────────────────────────────────
async function initBundleSteps() {
  const components = parseBundleComponents();

  if (!components || components.length === 0) {
    console.error('[Bundle] No components found.');
    return;
  }

  // Debug
  console.log("Original Count:", components.length);

  const uniqueComponents = [
    ...new Map(
      components.map(item => [item.productId, item])
    ).values()
  ];

  console.log("Unique Count:", uniqueComponents.length);

  const container = document.getElementById('bundle-steps-container');
  if (!container) return;

  const root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';

  const fetchProduct = async (comp, index) => {
    try {
      const numericId = comp.productId.split('/').pop();

      const res = await fetch('/products.json?limit=250');
      const data = await res.json();

      const product = data.products.find(
        p => String(p.id) === String(numericId)
      );

      if (!product) {
        console.error('[Bundle] Product not found', numericId);
        return null;
      }

      return { comp, product, index };
    } catch (e) {
      console.error('[Bundle] fetch failed', e);
      return null;
    }
  };

  // 👇 Yahan uniqueComponents use kar rahe hain
  const productDataList = await Promise.all(
    uniqueComponents.map(fetchProduct)
  );

  container.replaceChildren();

  productDataList.forEach(item => {
    if (!item || !item.product) return;

    const { comp, product: p, index } = item;
    const step = index + 1;
    const imgSrc =
      comp.image ||
      (p.images && p.images[0] && p.images[0].src) ||
      '';

    const stepEl = document.createElement('div');
    stepEl.className = 'bundle-step';
    stepEl.dataset.step = step;
    stepEl.dataset.productId = String(p.id);

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'bundle-step__header';
    header.setAttribute('aria-expanded', 'false');
    header.addEventListener('click', () => toggleStep(step));

    const headerLeft = document.createElement('div');
    headerLeft.className = 'bundle-step__left';
    const check = document.createElement('span');
    check.className = 'bundle-step__check';
    check.textContent = '✓';
    const title = document.createElement('span');
    title.className = 'bundle-step__title';
    title.textContent = step + '. Choose your ' + p.title;
    headerLeft.append(check, title);

    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'bundle-step__toggle';
    toggleIcon.id = 'toggle-icon-' + step;
    toggleIcon.textContent = '+';
    header.append(headerLeft, toggleIcon);

    const content = document.createElement('div');
    content.className = 'bundle-step__content';
    content.id = 'step-content-' + step;
    content.style.display = 'none';

    const thumbContainer = document.createElement('div');
    thumbContainer.className = 'bundle-step__thumb';
    const image = document.createElement('img');
    image.src = imgSrc;
    image.dataset.defaultSrc = imgSrc;
    image.id = 'thumb-' + p.id;
    image.alt = p.title;
    image.loading = 'eager';
    thumbContainer.appendChild(image);

    const variantsContainer = document.createElement('div');
    variantsContainer.className = 'bundle-step__variants';
    variantsByProduct[p.id] = Array.isArray(p.variants) ? p.variants : [];
    renderVariantOptions(p, variantsContainer);

    const selectedVariant = document.createElement('input');
    selectedVariant.type = 'hidden';
    selectedVariant.id = 'selected-variant-' + p.id;
    selectedVariant.dataset.product = String(p.id);
    selectedVariant.value = '';

    const details = document.createElement('a');
    details.href = root + 'products/' + encodeURIComponent(p.handle);
    details.target = '_blank';
    details.rel = 'noopener';
    details.className = 'bundle-step__details';
    details.textContent = 'Details ↗';

    content.append(thumbContainer, variantsContainer, selectedVariant, details);
    stepEl.append(header, content);

    container.appendChild(stepEl);

    const optionGroups = variantsContainer.querySelectorAll('.bundle-options');

    optionGroups.forEach((group, optionIndex) => {
      const firstBtn = group.querySelector('button');

      if (firstBtn) {
        const value = firstBtn.dataset.value;

        if (!bundleState[p.id]) {
          bundleState[p.id] = {};
        }

        bundleState[p.id][optionIndex] = value;
      }
    });

matchVariant(String(p.id));
  });

  updateBundleTotal();
}

// ── Hidden inputs inject karo form mein ──────────────────────────────
function injectBundleProperties(form, properties) {
  form.querySelectorAll('[data-bundle-prop]').forEach(el => el.remove());
  Object.entries(properties).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'properties[' + key + ']';
    input.value = value;
    input.dataset.bundleProp = '1';
    form.appendChild(input);
  });
}

// ── Duplicate check — same bundle already cart mein hai? ──────────────
async function findExistingBundleItem(variantId, selectionKeys, selections) {
  try {
    const res = await fetch('/cart.js');
    const cart = await res.json();
    return cart.items.find(cartItem => {
      if (String(cartItem.variant_id) !== String(variantId)) return false;
      const cartProps = cartItem.properties || {};
      return selectionKeys.every(key => cartProps[key] === selections[key]);
    }) || null;
  } catch (e) {
    console.error('[Bundle] Cart check failed', e);
    return null;
  }
}

// ── MAIN ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const bundleWrapper = document.getElementById('bundle-builder');
  if (!bundleWrapper) return;

  // Flag — agar true hai to hamare handler ne already process kar liya, seedha jaane do
  let bundleReady = false;

  initBundleSteps().then(() => {

    const nativeForm =
      document.querySelector('product-form form') ||
      document.querySelector('form[data-type="add-to-cart-form"]') ||
      document.querySelector('form[action="/cart/add"]');

    if (!nativeForm) {
      console.warn('[Bundle] Native product form not found.');
      return;
    }

    nativeForm.addEventListener('submit', async e => {

      // Agar bundleReady flag set hai — properties already inject ho chuki hain
      // Shopify ka handler chalne do, bas flag reset karo
      if (bundleReady) {
        bundleReady = false;
        return; // preventDefault nahi — Shopify submit kare
      }

      // Pehli baar — hum control lete hain
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      clearBundleError();

      // ── Validate ──────────────────────────────────────────────────
      const missingSteps = [];
      const bundleSelections = {};

      bundleWrapper.querySelectorAll('.bundle-step').forEach((step, index) => {
        const productId = step.dataset.productId;
        const variantId = document.getElementById('selected-variant-' + productId)?.value;
        if (!variantId) { missingSteps.push('Step ' + (index + 1)); return; }

        const variants = parseVariantsJSON(productId);
        const variant = variants?.find(v => String(v.id) === String(variantId));
        const productName =
          step.querySelector('.bundle-step__title')
            ?.textContent
            ?.replace(/^\d+\.\s*/, '')
            ?.replace(/^Choose your\s*/i, '')
            ?.trim() || ('Item ' + (index + 1));
        const image = document.getElementById('thumb-' + productId)?.src || '';

        bundleSelections['Item ' + (index + 1)] = productName + ' - ' + (variant?.title || '');
        bundleSelections['_item_' + (index + 1) + '_image'] = image;
      });

      if (missingSteps.length) {
        showBundleError('Please select options for: ' + missingSteps.join(', '));
        return;
      }

      const mainVariantId = nativeForm.querySelector('input[name="id"]')?.value;
      const qty = Number(nativeForm.querySelector('input[name="quantity"]')?.value || 1);
      const bundleTitle = bundleWrapper.dataset.bundleTitle || '';
      const bundleImage = bundleWrapper.dataset.bundleImage || '';

      // Sirf Item N keys se duplicate check karo — _bundle_id har baar naya hota hai
      // isliye use match mein use nahi karte
      const selectionKeys = Object.keys(bundleSelections).filter(k => /^Item \d+$/.test(k));

      try {
        const existingItem = await findExistingBundleItem(mainVariantId, selectionKeys, bundleSelections);

        if (existingItem) {
          // ── Duplicate — quantity badhao via API, phir drawer refresh ──
          const res = await fetch('/cart/change.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ id: existingItem.key, quantity: existingItem.quantity + qty })
          });
          if (!res.ok) {
            const d = await res.json();
            throw new Error(d.description || 'Could not update cart');
          }
          console.log('[Bundle] Quantity updated');

          // Drawer refresh — Shopify ka cart-drawer component use karo
          const cartDrawerEl = document.querySelector('cart-drawer');
          if (cartDrawerEl) {
            // Dawn: getSectionsToRender fetch karta hai aur drawer update karta hai
            cartDrawerEl.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
            // Dawn me open() method hota hai
            if (typeof cartDrawerEl.open === 'function') {
              // Fake event banao jo Dawn expect karta hai
              const fakeBtn = document.querySelector('[aria-controls="CartDrawer"], [aria-controls="cart-drawer"]');
              cartDrawerEl.open(fakeBtn);
            }
          }

        } else {
          // ── Naya bundle — properties inject karo, flag set karo, submit ──
          const bundleId = 'bundle-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
          const allProperties = {
            _bundle_id: bundleId,
            _bundle_role: 'parent',
            _bundle_title: bundleTitle,
            _bundle_image: bundleImage,
            ...bundleSelections
          };
          injectBundleProperties(nativeForm, allProperties);
          bundleReady = true; // Agli submit call mein hamare handler se niklega
          nativeForm.requestSubmit
            ? nativeForm.requestSubmit()
            : nativeForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }

      } catch (err) {
        bundleReady = false;
        showBundleError(err.message || 'Something went wrong');
      }

    }, true);
  });
});
