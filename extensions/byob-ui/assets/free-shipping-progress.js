let fetchTimer = null;
let progressBarElement = null;
let isRefreshingCartDrawer = false;
let freeGiftAddFailed = false;
let lastFailedGiftVariantId = null;
console.log("FREE SHIPPING VERSION 12345");
/*
  SETTINGS
*/
const settings = window.cartProgressSettings || {};
const currencySymbol = settings.currencySymbol || '$';
const rules = settings.rules || [];
//let countdownInterval = null;
console.log("Progress bar script loaded");
console.log(window.cartProgressSettings);
/*
  GET ACTIVE RULES
*/
function getActiveRules() {
  return rules
    .filter(rule => rule.enabled)
    .sort((a, b) => a.threshold - b.threshold);
}

/*
  GET CART TOTAL
*/
function getCartTotal(cart) {
  return (
    cart.items.reduce((sum, item) => {
      return sum + item.final_line_price;
    }, 0) / 100
  );
}

/*
  HELPERS
*/
function extractVariantId(rawValue) {
  if (!rawValue) return null;

  const value = String(rawValue).trim();

  if (/^\d+$/.test(value)) {
    return value;
  }

  const extracted = value.split('/').pop();

  if (extracted && /^\d+$/.test(extracted)) {
    return extracted;
  }

  return null;
}

async function canAddVariant(variantId) {
  if (!variantId) return false;

  try {
    const response = await fetch(`/variants/${variantId}.js`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      console.warn('[Cart Progress] Variant lookup failed:', variantId, response.status);
      return false;
    }

    const variant = await response.json();

    if (!variant || !variant.id) {
      console.warn('[Cart Progress] Variant payload invalid:', variantId);
      return false;
    }

    if (variant.available === false) {
      console.warn('[Cart Progress] Variant unavailable:', variantId);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Cart Progress] Variant validation failed:', error);
    return false;
  }
}

/*
  CREATE SINGLE ELEMENT
*/
function createProgressBarElement() {
  if (progressBarElement) return progressBarElement;

  const div = document.createElement('div');

  div.className = 'cart-page-progress';

  div.innerHTML = `
    <div
      class="cart-progress-wrapper"
      style="
        --progress-fill-color: ${settings.filledColor};
        --progress-empty-color: ${settings.emptyColor};
      "
    >
      <div class="cart-progress-message">
        Loading...
      </div>

      <div class="cart-progress-bar">
        <div class="cart-progress-fill"></div>
      </div>

      <div class="cart-progress-steps">
        ${getActiveRules()
      .map(rule => `
  <div class="step" data-type="${rule.type}">
    <span>${currencySymbol}${rule.threshold}</span>
    <p>${rule.icon || ''} ${rule.label}</p>
  </div>
`)
      .join('')
    }
      </div>
    </div>
  `;

  progressBarElement = div;
  return div;
}

/*
  CHECK EXISTING BAR
*/
function alreadyMounted(container) {
  return container?.querySelector('.cart-page-progress');
}

/*
  RENDER CART DRAWER
*/
async function refreshCartDrawer() {
  if (isRefreshingCartDrawer) return;

  isRefreshingCartDrawer = true;

  try {
    const sectionsRes = await fetch('/?sections=cart-drawer,cart-icon-bubble,cart-live-region-text', {
      cache: 'no-store'
    });

    const sections = await sectionsRes.json();

    /*
      CART DRAWER
    */
    const drawerElement = document.querySelector('#CartDrawer');

    if (drawerElement && sections['cart-drawer']) {
      const temp = document.createElement('div');
      temp.innerHTML = sections['cart-drawer'];

      const newDrawer = temp.querySelector('#CartDrawer');

      if (newDrawer) {
        drawerElement.innerHTML = newDrawer.innerHTML;
      }
    }

    /*
      CART ICON
    */
    const iconBubble = document.querySelector('#cart-icon-bubble');

    if (iconBubble && sections['cart-icon-bubble']) {
      const temp = document.createElement('div');
      temp.innerHTML = sections['cart-icon-bubble'];

      const newBubble = temp.querySelector('#cart-icon-bubble');

      if (newBubble) {
        iconBubble.innerHTML = newBubble.innerHTML;
      }
    }

    /*
      LIVE REGION
    */
    const liveRegion = document.querySelector('#cart-live-region-text');

    if (liveRegion && sections['cart-live-region-text']) {
      const temp = document.createElement('div');
      temp.innerHTML = sections['cart-live-region-text'];

      const newRegion = temp.querySelector('#cart-live-region-text');

      if (newRegion) {
        liveRegion.innerHTML = newRegion.innerHTML;
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    isRefreshingCartDrawer = false;
  }
}

/*
  MOUNT BAR
*/
function mountProgressBar() {

  console.log("MOUNTING");

  console.log(
    "cart-drawer-items:",
    document.querySelector('cart-drawer-items')
  );

  console.log(
    "drawer__inner:",
    document.querySelector('.drawer__inner')
  );

  console.log(
    "CartDrawer:",
    document.querySelector('#CartDrawer')
  );

  /* isuue testing*/
  const drawer =
    document.querySelector('cart-drawer-items') ||
    document.querySelector('.drawer__inner');

  if (drawer && !alreadyMounted(drawer)) {
    drawer.prepend(createProgressBarElement().cloneNode(true));
  }

  const forms = document.querySelectorAll('form[action="/cart"]');

  forms.forEach(form => {
    if (form.closest('cart-drawer-items')) return;

    if (!alreadyMounted(form)) {
      form.prepend(createProgressBarElement().cloneNode(true));
    }
  });
}

/*
  HELPER: Get the highest applicable rule of a specific type
*/
function getHighestApplicableRule(rules, cartTotal, ruleType) {
  const applicableRules = rules
    .filter(rule => rule.type === ruleType && rule.enabled && cartTotal >= rule.threshold)
    .sort((a, b) => b.threshold - a.threshold);

  return applicableRules[0] || null;
}

/*
  HELPER: Get the last unlocked rule (highest threshold reached) of any type
*/
function getLastUnlockedRule(rules, cartTotal) {
  const unlockedRules = rules
    .filter(rule => rule.enabled && cartTotal >= rule.threshold)
    .sort((a, b) => b.threshold - a.threshold);

  return unlockedRules[0] || null;
}

/*
  HELPER: Get reward label for a rule
*/
function getRewardLabel(rule) {
  if (!rule) return '';

  if (rule.type === 'discount_percent') {
    return rule.label?.trim() || `${rule.value || 0}% OFF`;
  }

  if (rule.type === 'discount_fixed') {
    return rule.label?.trim() || `${currencySymbol}${rule.value || 0} OFF`;
  }

  if (rule.type === 'free_gift') {
    return rule.label?.trim() || 'Free gift';
  }

  if (rule.type === 'free_shipping') {
    return rule.label?.trim() || 'Free shipping';
  }

  return rule.label?.trim() || 'Reward';
}

/*
  UPDATE UI
*/
async function updateProgressBar(cart) {
  const wrappers = document.querySelectorAll('.cart-progress-wrapper');

  if (!wrappers.length) return;

  const total = getCartTotal(cart);

  console.log('====================');
  console.log('CART OBJECT', cart);
  console.log('ITEM COUNT', cart.item_count);
  console.log('ITEMS', cart.items);
  console.log('TOTAL', total);
  console.log('====================');
  const activeRules = getActiveRules();
  //Fixed : cart progress
  const highestUnlockedRule = getLastUnlockedRule(
    activeRules,
    total
  );


  console.log('CART DATA', cart);

  console.log(
    'ITEM COUNT:',
    cart.item_count
  );

  console.log(
    'TOTAL:',
    getCartTotal(cart)
  );

  /*
    DISCOUNT RULE - Get the HIGHEST applicable discount
  */


  let finalTotal = total;

  if (
    highestUnlockedRule &&
    highestUnlockedRule.type === 'discount_percent'
  ) {
    finalTotal =
      total -
      (total * (highestUnlockedRule.value / 100));
  }

  updateEstimateTotal(total, finalTotal);
  console.log(
    'updateEstimateTotal',
    {
      total,
      finalTotal
    }
  );

  /*
    FREE GIFT RULE - Get the HIGHEST applicable gift rule
  */
  const freeGiftRule = activeRules
    .filter(rule => rule.type === 'free_gift' && rule.enabled)
    .sort((a, b) => b.threshold - a.threshold)[0];

  /*
    FREE SHIPPING RULE - Get the HIGHEST applicable shipping rule
  */
  const freeShippingRule = getHighestApplicableRule(activeRules, total, 'free_shipping');

  // Changes:
  if (freeShippingRule) {
    const shippingUnlocked = total >= freeShippingRule.threshold;

    // Add or remove a CSS class so your stylesheet can style it
    wrappers.forEach(wrapper => {
      wrapper.classList.toggle('free-shipping-unlocked', shippingUnlocked);
    });

    if (shippingUnlocked) {
      console.log('[Cart Progress] Free shipping unlocked ✅', {
        threshold: freeShippingRule.threshold,
        currentTotal: total
      });
    }
  }

  if (freeGiftRule) {
    const variantId = extractVariantId(freeGiftRule.freeGiftVariantId);

    if (!variantId) {
      console.warn('[Cart Progress] Invalid free gift variant ID:', freeGiftRule.freeGiftVariantId);
    } else {
      //Changes : if gift already exists then earlier condition wont work
      const giftItem = cart.items.find(
        item =>
          item.properties?.fspAutoGift === 'true'
      );

      /*
        Reset failure flag if threshold is no longer met or gift already exists
      */
      if (total < freeGiftRule.threshold || giftItem) {
        if (lastFailedGiftVariantId === variantId) {
          freeGiftAddFailed = false;
          lastFailedGiftVariantId = null;
        }
      }

      /*
        ADD FREE GIFT - Only if highest threshold gift hasn't been added yet
      */
      if (
        total >= freeGiftRule.threshold &&
        !giftItem &&
        (!freeGiftAddFailed || lastFailedGiftVariantId !== variantId)
      ) {
        const variantAvailable = await canAddVariant(variantId);

        if (!variantAvailable) {
          freeGiftAddFailed = true;
          lastFailedGiftVariantId = variantId;
          console.warn('[Cart Progress] Free gift skipped: invalid or unavailable variant', { threshold: freeGiftRule.threshold, variant: variantId });
        } else {
          try {
            const addResponse = await fetch('/cart/add.js', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                items: [
                  {
                    id: Number(variantId),
                    quantity: 1,
                    properties: {
                      fspAutoGift: 'true'
                    }
                  }
                ]
              })
            });

            if (!addResponse.ok) {
              let errorData = null;

              try {
                errorData = await addResponse.json();
              } catch (_) { }

              freeGiftAddFailed = true;
              lastFailedGiftVariantId = variantId;

              console.warn('[Cart Progress] Failed to add free gift', {
                status: addResponse.status,
                threshold: freeGiftRule.threshold,
                error: errorData
              });
            } else {
              freeGiftAddFailed = false;
              lastFailedGiftVariantId = null;

              console.log('[Cart Progress] Free gift added successfully', { threshold: freeGiftRule.threshold, variant: variantId });

              await refreshCartDrawer();
              mountProgressBar();

              const updatedCart = await fetchCart();
              if (updatedCart) {
                await updateProgressBar(updatedCart);
              }

              return;
            }
          } catch (error) {
            freeGiftAddFailed = true;
            lastFailedGiftVariantId = variantId;
            console.error('[Cart Progress] Add free gift request failed:', error);
          }
        }
      }

      /*
        KEEP ONLY 1 GIFT - Ensure only one gift item at highest threshold
      */
      if (giftItem && giftItem.quantity > 1) {
        console.log('[Cart Progress] Adjusting gift quantity to 1', { variant: variantId });

        await fetch('/cart/change.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            id: giftItem.key,
            quantity: 1
          })
        });

        await refreshCartDrawer();
        mountProgressBar();

        const updatedCart = await fetchCart();
        if (updatedCart) {
          await updateProgressBar(updatedCart);
        }

        return;
      }

      /*
        REMOVE FREE GIFT - Only remove if cart no longer meets the threshold
      */

      if (total < freeGiftRule.threshold && giftItem) {
        console.log('[Cart Progress] Removing free gift - threshold no longer met', { threshold: freeGiftRule.threshold, currentTotal: total, variant: variantId });

        await fetch('/cart/change.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            id: giftItem.key,
            quantity: 0
          })
        });

        freeGiftAddFailed = false;
        lastFailedGiftVariantId = null;

        await refreshCartDrawer();
        mountProgressBar();

        const updatedCart = await fetchCart();
        if (updatedCart) {
          await updateProgressBar(updatedCart);
        }

        return;
      }
    }
  }

  if (!activeRules.length) return;

  const maxThreshold = activeRules[activeRules.length - 1]?.threshold || 100;

  wrappers.forEach(wrapper => {
    const steps = wrapper.querySelectorAll('.step');

    steps.forEach((step, index) => {
      const rule = activeRules[index];
      if (!rule) return;
      const unlocked = total >= rule.threshold;
      step.classList.toggle('completed', unlocked);

      console.log(
        'RULE:',
        rule.label,
        'THRESHOLD:',
        rule.threshold,
        'UNLOCKED:',
        unlocked
      );

      const isHighestReward =
        highestUnlockedRule &&
        highestUnlockedRule.id === rule.id;

      step.classList.toggle(
        'completed',
        isHighestReward
      );

      step.classList.toggle(
        'inactive-reward',
        highestUnlockedRule &&
        highestUnlockedRule.id !== rule.id &&
        total >= rule.threshold
      );
    });

    const fill = wrapper.querySelector('.cart-progress-fill');
    const message = wrapper.querySelector('.cart-progress-message');

    if (!fill || !message) return;

    /*
      EMPTY CART
    */
    if (cart.item_count === 0) {
      const container = wrapper.closest('.cart-page-progress');
      if (container) {
        container.style.display = '';
      }
      fill.style.width = '0%';
      message.innerHTML = settings.labels?.emptyCart || 'Your cart is empty';
      return;
    }

    /*
      PROGRESS
    */
    let progress = (total / maxThreshold) * 100;
    progress = Math.min(100, Math.max(0, progress));

    fill.style.width = `${progress}%`;

    /*
      GET CURRENT MILESTONE STATUS
    */
    const nextRule = activeRules.find(rule => total < rule.threshold);
    //const lastUnlockedRule = getLastUnlockedRule(activeRules, total);

    /*
      MESSAGE LOGIC - Show encouragement with specific next milestone
    */
    if (nextRule) {
      // Customer hasn't reached max yet - show next milestone info
      const remaining = (nextRule.threshold - total).toFixed(2);
      const nextReward = getRewardLabel(nextRule);

      // Show which milestone was just unlocked (if any) and what's next
      if (highestUnlockedRule && highestUnlockedRule.threshold < nextRule.threshold) {
        // User has unlocked at least one milestone, show encouragement to next
        const currentMilestone = activeRules.indexOf(highestUnlockedRule) + 1;
        const nextMilestone = activeRules.indexOf(nextRule) + 1;
        const beforeGoalTemplate =
          settings.labels?.beforeGoal ||
          'Add {{remaining}} to unlock {{reward}}';

        message.innerHTML = beforeGoalTemplate
          .replace('{{remaining}}', `${currencySymbol}${remaining}`)
          .replace('{{reward}}', nextReward)
          .replace('{{currentMilestone}}', currentMilestone)
          .replace('{{nextMilestone}}', nextMilestone);
      } else {
        // No milestones reached yet, show first one
        const beforeGoalTemplate =
          settings.labels?.beforeGoal ||
          'Add {{remaining}} to unlock {{reward}}';

        message.innerHTML = beforeGoalTemplate
          .replace('{{remaining}}', `${currencySymbol}${remaining}`)
          .replace('{{reward}}', nextReward);
      }
    } else {
      // All milestones reached - show congratulations message
      const lastReward = getRewardLabel(
        highestUnlockedRule
      );
      const afterGoalTemplate =
        settings.labels?.afterGoal ||
        'You\'ve unlocked all rewards! Your reward: {{reward}}';

      message.innerHTML = afterGoalTemplate.replace(
        '{{reward}}',
        lastReward
      );
    }
  });
}

/*
  UPDATE TOTAL
*/
function updateEstimateTotal(total, finalTotal) {
  const totalElement =
    document.querySelector('.totals__total-value') ||
    document.querySelector('.totals__subtotal-value') ||
    document.querySelector('.totals__subtotal') ||
    document.querySelector('.totals__total');

  const drawerTotal =
    document.querySelector('.drawer__footer .totals__total-value') ||
    document.querySelector('.drawer__footer .totals__subtotal-value') ||
    document.querySelector('.drawer__footer .totals');

  const discountAmount = total - finalTotal;

  const html =
    discountAmount > 0
      ? `
        <div class="discounted-total-wrapper">
          <span
            style="
              text-decoration: line-through;
              opacity: .6;
              margin-right: 8px;
            "
          >
            ${currencySymbol}${total.toFixed(2)}
          </span>

          <span>
            ${currencySymbol}${finalTotal.toFixed(2)}
          </span>

          <div
            style="
              color: green;
              font-size: 12px;
              margin-top: 4px;
            "
          >
            You saved ${currencySymbol}${discountAmount.toFixed(2)}
          </div>
        </div>
      `
      : `${currencySymbol}${total.toFixed(2)}`;

  if (totalElement) {
    totalElement.innerHTML = html;
  }

  if (drawerTotal) {
    drawerTotal.innerHTML = html;
  }
}

/*
  FETCH CART
*/
async function fetchCart() {
  try {
    const response = await fetch('/cart.js', {
      cache: 'no-store'
    });
    const cart = await response.json();
    console.log('FETCH CART RESPONSE', cart)

    return cart;
  } catch (error) {
    console.error(error);
    return null;
  }
}

/*
  INIT
*/
async function initProgressBar() {
  clearTimeout(fetchTimer);

  fetchTimer = setTimeout(async () => {
    mountProgressBar();

    const wrappers = document.querySelectorAll('.cart-progress-wrapper');

    wrappers.forEach(wrapper => {
      wrapper.classList.add('progress-loading');
    });

    const cart = await fetchCart();

    if (!cart) {
      wrappers.forEach(wrapper => {
        wrapper.classList.remove('progress-loading');
      });
      return;
    }

    await updateProgressBar(cart);

    const latestWrappers = document.querySelectorAll('.cart-progress-wrapper');
    latestWrappers.forEach(wrapper => {
      wrapper.classList.remove('progress-loading');
    });
  }, 100);
}

/*
  INIT SYSTEM
*/
function initCartProgressBars() {
  if (!settings.enabled) return;

  mountProgressBar();
  initProgressBar();
}

/*
  DOM READY
*/
document.addEventListener('DOMContentLoaded', initCartProgressBars);

/*
  CART UPDATED
*/
document.addEventListener('cart:updated', () => {
  mountProgressBar();
  initProgressBar();
});

/*
  QUANTITY CHANGE
*/
document.addEventListener('change', event => {
  if (event.target.matches('input[name="updates[]"]')) {
    setTimeout(() => {
      initProgressBar();
    }, 100);
  }
});

/*
  ADD TO CART
*/
document.addEventListener('submit', event => {
  const form = event.target.closest('form[action*="/cart/add"]');
  if (!form) return;

  setTimeout(() => {
    mountProgressBar();
    initProgressBar();
  }, 500);
});

/*
  SHOPIFY EVENTS
*/
document.addEventListener('ajaxProduct:added', () => {
  setTimeout(() => {
    mountProgressBar();
    initProgressBar();
  }, 300);
});

document.addEventListener('cart:refresh', () => {
  setTimeout(() => {
    mountProgressBar();
    initProgressBar();
  }, 300);
});

/*
  PROGRESS OBSERVER
*/
const progressObserver = new MutationObserver(() => {
  if (isRefreshingCartDrawer) return;

  if (!document.querySelector('.cart-progress-wrapper')) {
    mountProgressBar();
    initProgressBar();
  }
});

progressObserver.observe(document.body, {
  childList: true,
  subtree: true
});


function getHighestUnlockedRule(rules, cartTotal) {
  const unlocked = rules
    .filter(rule => rule.enabled && cartTotal >= rule.threshold)
    .sort((a, b) => b.threshold - a.threshold);

  return unlocked[0] || null;
}

window.addEventListener('pageshow', () => {
  console.log('PAGESHOW');

  setTimeout(() => {
    mountProgressBar();
    initProgressBar();
  }, 300);
});
