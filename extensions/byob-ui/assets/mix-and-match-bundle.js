(function () {
  'use strict';

  document.querySelectorAll('[id^="mix-and-match-bundle-"]').forEach(initBundle);

  function initBundle(section) {
    const blockId  = section.id.replace('mix-and-match-bundle-', '');
    const maxItems = parseInt(section.dataset.maxItems, 10) || 6;
    const minItems = parseInt(section.dataset.minItems, 10) || 3;

    // Build tiers array from data attrs: [{qty, discount}, ...]
    const tiers = [1,2,3,4].map(function(n) {
      return {
        qty:      parseInt(section.dataset['tier' + n + 'Qty'], 10),
        discount: parseInt(section.dataset['tier' + n + 'Discount'], 10),
      };
    }).filter(function(t) { return t.qty && t.discount; });

    // State
    const bundle = []; // array of {productId, variantId, title, price, image}

    // DOM refs
    const listEl      = document.getElementById('mamb-list-' + blockId);
    const countEl     = document.getElementById('mamb-count-' + blockId);
    const checkoutBtn = document.getElementById('mamb-checkout-' + blockId);
    const nudgeEl     = document.getElementById('mamb-nudge-' + blockId);
    const nextTierEl  = document.getElementById('mamb-next-tier-' + blockId);
    const totalNowEl  = document.getElementById('mamb-total-now-' + blockId);
    const totalWasEl  = document.getElementById('mamb-total-was-' + blockId);

    // ── Utilities ────────────────────────────────────────────────
    function formatMoney(cents) {
      if (window.Shopify && window.Shopify.formatMoney) {
        return window.Shopify.formatMoney(cents);
      }
      return '$' + (cents / 100).toFixed(2);
    }

    function getCurrentDiscount() {
      // Find highest tier reached
      var discount = 0;
      tiers.forEach(function(t) {
        if (bundle.length >= t.qty) discount = t.discount;
      });
      return discount;
    }

    function getNextTier() {
      for (var i = 0; i < tiers.length; i++) {
        if (bundle.length < tiers[i].qty) return tiers[i];
      }
      return null;
    }

    function discountedPrice(cents, pct) {
      return Math.round(cents * (100 - pct) / 100);
    }

    // ── Render everything ─────────────────────────────────────────
    function render() {
      var discount = getCurrentDiscount();
      var next     = getNextTier();
      var total    = 0;
      var totalWas = 0;

      // Count badge
      if (countEl) countEl.textContent = bundle.length;

      // Rebuild list
      if (listEl) {
        listEl.innerHTML = '';
        if (bundle.length === 0) {
          var emptyLi = document.createElement('li');
          emptyLi.className = 'mamb-bundle-empty-msg';
          emptyLi.textContent = 'Add items to build your bundle';
          listEl.appendChild(emptyLi);
        } else {
          bundle.forEach(function(item, idx) {
            var origCents = parseInt(item.price, 10);
            var nowCents  = discountedPrice(origCents, discount);
            total    += nowCents;
            totalWas += origCents;

            var li = document.createElement('li');
            li.className = 'mamb-bundle-item';
            li.innerHTML =
              '<img class="mamb-bundle-item-img" src="' + item.image + '" alt="' + item.title + '">' +
              '<div class="mamb-bundle-item-info">' +
                '<p class="mamb-bundle-item-title">' + item.title + '</p>' +
                '<div class="mamb-bundle-item-prices">' +
                  '<span class="mamb-bundle-item-now">' + formatMoney(nowCents) + '</span>' +
                  (discount > 0 ? '<span class="mamb-bundle-item-was">' + formatMoney(origCents) + '</span>' : '') +
                '</div>' +
              '</div>' +
              '<div class="mamb-bundle-actions">' +
                (discount > 0 ? '<span class="mamb-bundle-item-badge">' + discount + '% OFF</span>' : '') +
                '<button class="mamb-bundle-remove" data-index="' + idx + '" aria-label="Remove ' + item.title + '">Remove</button>' +
              '</div>';
            listEl.appendChild(li);
          });
        }
      }

      // Nudge message
      if (nextTierEl && nudgeEl) {
        if (next && bundle.length > 0) {
          var needed = next.qty - bundle.length;
          nudgeEl.innerHTML = 'Add <strong>' + needed + ' more item' + (needed > 1 ? 's' : '') +
            '</strong> to get <strong>' + next.discount + '% off!</strong>';
          nextTierEl.hidden = false;
        } else {
          nextTierEl.hidden = true;
        }
      }

      // Tier progress dots
      section.querySelectorAll('.mamb-dot').forEach(function(dot) {
        var tqty = parseInt(dot.dataset.tierQty, 10);
        dot.classList.remove('is-reached', 'is-active');
        if (bundle.length >= tqty) dot.classList.add('is-reached');
      });
      // Mark current tier dot as active
      var activeTier = null;
      tiers.forEach(function(t) {
        if (bundle.length >= t.qty) activeTier = t;
      });
      if (activeTier) {
        var activeDot = section.querySelector('.mamb-dot[data-tier-qty="' + activeTier.qty + '"]');
        if (activeDot) { activeDot.classList.remove('is-reached'); activeDot.classList.add('is-active'); }
      }

      // Header tier pills
      section.querySelectorAll('.mamb-tier').forEach(function(pill) {
        pill.classList.toggle('is-active', activeTier && parseInt(pill.dataset.tierQty, 10) === activeTier.qty);
      });

      // Totals in checkout button
      if (totalNowEl) totalNowEl.textContent = bundle.length > 0 ? formatMoney(total) : '';
      if (totalWasEl) totalWasEl.textContent = discount > 0 && bundle.length > 0 ? formatMoney(totalWas) : '';

      // Checkout button state
      if (checkoutBtn) {
        var canCheckout = bundle.length >= minItems;
        checkoutBtn.disabled = !canCheckout;
        // Update label
        var labelEl = checkoutBtn.querySelector('.mamb-checkout-label');
        if (labelEl) {
          labelEl.textContent = canCheckout
            ? (section.dataset.addLabel || 'Add to Cart')
            : 'Add ' + (minItems - bundle.length) + ' more item' + ((minItems - bundle.length) > 1 ? 's' : '');
        }
      }

      // Product cards — update prices + button state
      section.querySelectorAll('.mamb-card').forEach(function(card) {
        var pid        = card.dataset.productId;
        var origCents  = parseInt(card.dataset.price, 10);
        var nowCents   = discountedPrice(origCents, discount);
        var inBundle   = bundle.some(function(b) { return b.productId === pid; });
        var isFull     = bundle.length >= maxItems;

        // Prices
        var priceNow = card.querySelector('.mamb-price-now');
        var priceWas = card.querySelector('.mamb-price-was');
        if (priceNow) priceNow.textContent = formatMoney(nowCents);
        if (priceWas) {
          priceWas.textContent = formatMoney(origCents);
          priceWas.classList.toggle('visible', discount > 0);
        }

        // Badge on image
        var badge = card.querySelector('.mamb-card-badge');
        if (badge) {
          if (discount > 0) {
            badge.textContent = discount + '% OFF';
            badge.hidden = false;
          } else {
            badge.hidden = true;
          }
        }

        // Button
        var btn = card.querySelector('.mamb-add-btn');
        card.classList.toggle('in-bundle', inBundle);
        if (btn) {
          btn.classList.toggle('in-bundle', inBundle);
          btn.textContent = inBundle ? 'IN BUNDLE ✓' : 'ADD TO BUNDLE';
          btn.disabled = !inBundle && isFull;
        }
      });
    }

    // ── Add item ──────────────────────────────────────────────────
    function addItem(card) {
      if (bundle.length >= maxItems) return;
      bundle.push({
        productId: card.dataset.productId,
        variantId: card.dataset.variantId,
        title:     card.dataset.title,
        price:     card.dataset.price,
        image:     card.dataset.image,
      });
      render();
    }

    // ── Remove item ───────────────────────────────────────────────
    function removeItem(idx) {
      bundle.splice(idx, 1);
      render();
    }

    // ── Events ────────────────────────────────────────────────────
    // ADD TO BUNDLE
    section.addEventListener('click', function(e) {
      var btn = e.target.closest('.mamb-add-btn');
      if (!btn || btn.disabled || btn.classList.contains('in-bundle')) return;
      var card = btn.closest('.mamb-card');
      if (card) addItem(card);
    });

    // REMOVE from sidebar
    if (listEl) {
      listEl.addEventListener('click', function(e) {
        var btn = e.target.closest('.mamb-bundle-remove');
        if (!btn) return;
        removeItem(parseInt(btn.dataset.index, 10));
      });
    }

    // CHECKOUT
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', async function() {
        if (bundle.length < minItems) return;

        checkoutBtn.disabled = true;
        var labelEl = checkoutBtn.querySelector('.mamb-checkout-label');
        if (labelEl) labelEl.textContent = 'Adding to cart…';

        var discount = getCurrentDiscount();

        var items = bundle.map(function(item) {
          return {
            id:       parseInt(item.variantId, 10),
            quantity: 1,
            properties: {
              _byob_bundle:   'mix_and_match',
              _byob_discount: discount + '%',
            },
          };
        });

        try {
          var res = await fetch('/cart/add.js', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body:    JSON.stringify({ items: items }),
          });

          if (!res.ok) {
            var err = await res.json();
            throw new Error(err.description || 'Cart error');
          }

          if (labelEl) labelEl.textContent = 'Added ✓';
          setTimeout(function() { window.location.href = '/cart'; }, 600);

        } catch (err) {
          console.error('[MAMB]', err);
          if (labelEl) labelEl.textContent = '⚠ Error – Try Again';
          checkoutBtn.disabled = false;
        }
      });
    }

    // Init
    render();
  }
})();
