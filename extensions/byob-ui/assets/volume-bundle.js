(function () {
  'use strict';

  document.querySelectorAll('[id^="volume-bundle-"]').forEach(initVolumeBundle);

  function initVolumeBundle(section) {
    var blockId = section.id.replace('volume-bundle-', '');

    // ── Read product data from JSON script tags ───────────────────
    var variantsEl = document.getElementById('vb-variants-' + blockId);
    var optionsEl  = document.getElementById('vb-options-' + blockId);
    if (!variantsEl) return;

    var variants = JSON.parse(variantsEl.textContent);
    var options  = optionsEl ? JSON.parse(optionsEl.textContent) : [];
    var basePrice = variants[0] ? parseFloat(variants[0].price) * 100 : 0;

    // ── Read tiers from data attrs ────────────────────────────────
    var tiers = [];
    [1,2,3,4].forEach(function(n) {
      var qty      = parseInt(section.dataset['tier' + n + 'Qty'], 10);
      var discount = parseInt(section.dataset['tier' + n + 'Discount'], 10);
      var enabled  = n < 4 || section.dataset.enableTier4 === 'true';
      if (qty && enabled) tiers.push({ num: n, qty: qty, discount: discount });
    });

    var atcBtn       = document.getElementById('vb-atc-' + blockId);
    var selectedTier = null;

    // ── Init each tier ────────────────────────────────────────────
    tiers.forEach(function(tier) {
      var tierEl   = section.querySelector('.vb-tier[data-tier="' + tier.num + '"]');
      var radioEl  = tierEl && tierEl.querySelector('.vb-radio');
      var slotsEl  = tierEl && tierEl.querySelector('.vb-tier-slots');
      var priceNow = tierEl && tierEl.querySelector('.vb-tier-price-now');
      var priceWas = tierEl && tierEl.querySelector('.vb-tier-price-was');

      if (!tierEl) return;

      // Set prices
      var totalWas = basePrice * tier.qty;
      var totalNow = Math.round(totalWas * (100 - tier.discount) / 100);
      if (priceNow) priceNow.textContent = formatMoney(totalNow);
      if (priceWas && tier.discount > 0) priceWas.textContent = formatMoney(totalWas);

      // Click anywhere on tier selects it
      tierEl.addEventListener('click', function() {
        selectTier(tier, tierEl, radioEl, slotsEl);
      });

      // Build variant slots
      if (options.length > 0) {
        buildSlots(tier.qty, slotsEl, options, variants);
      }
    });

    // ── Select a tier ─────────────────────────────────────────────
    function selectTier(tier, tierEl, radioEl, slotsEl) {
      // Deselect all
      section.querySelectorAll('.vb-tier').forEach(function(el) {
        el.classList.remove('is-selected');
        var r = el.querySelector('.vb-radio');
        if (r) r.checked = false;
        var s = el.querySelector('.vb-tier-slots');
        if (s) s.hidden = true;
      });

      // Select this one
      tierEl.classList.add('is-selected');
      if (radioEl) radioEl.checked = true;
      if (slotsEl && options.length > 0) slotsEl.hidden = false;
      selectedTier = tier;

      // Enable ATC
      if (atcBtn) {
        atcBtn.disabled = false;
        atcBtn.textContent = 'Add to cart';
      }
    }

    // ── Build variant selector slots ──────────────────────────────
    function buildSlots(qty, slotsEl, options, variants) {
      if (!slotsEl) return;
      slotsEl.innerHTML = '';

      for (var i = 1; i <= qty; i++) {
        var slot = document.createElement('div');
        slot.className = 'vb-slot';
        slot.dataset.slot = i;

        var numEl = document.createElement('span');
        numEl.className = 'vb-slot-num';
        numEl.textContent = '#' + i;
        slot.appendChild(numEl);

        var selectorsWrap = document.createElement('div');
        selectorsWrap.className = 'vb-slot-selectors';

        options.forEach(function(opt) {
          var optWrap = document.createElement('div');
          optWrap.className = 'vb-slot-option';

          var lbl = document.createElement('label');
          lbl.textContent = opt.name;
          optWrap.appendChild(lbl);

          var select = document.createElement('select');
          select.className = 'vb-slot-select';
          select.dataset.option = opt.name;
          select.dataset.slot   = i;

          opt.values.forEach(function(val) {
            var option = document.createElement('option');
            option.value = val;
            option.textContent = val;
            select.appendChild(option);
          });

          optWrap.appendChild(select);
          selectorsWrap.appendChild(optWrap);
        });

        slot.appendChild(selectorsWrap);
        slotsEl.appendChild(slot);
      }
    }

    // ── Get selected variant for a slot ──────────────────────────
    function getVariantForSlot(slotNum, tierEl) {
      var selects = tierEl.querySelectorAll('.vb-slot[data-slot="' + slotNum + '"] .vb-slot-select');
      if (!selects || selects.length === 0) {
        // No options — return first variant
        return variants[0];
      }

      var selectedOptions = {};
      selects.forEach(function(sel) {
        selectedOptions[sel.dataset.option] = sel.value;
      });

      return variants.find(function(v) {
        return v.options.every(function(opt, idx) {
          var optName = options[idx] && options[idx].name;
          return !optName || selectedOptions[optName] === opt;
        });
      }) || variants[0];
    }

    // ── Add to cart ───────────────────────────────────────────────
    if (atcBtn) {
      atcBtn.addEventListener('click', async function() {
        if (!selectedTier) return;

        atcBtn.disabled    = true;
        atcBtn.textContent = 'Adding…';

        var tierEl = section.querySelector('.vb-tier[data-tier="' + selectedTier.num + '"]');
        var items  = [];

        for (var i = 1; i <= selectedTier.qty; i++) {
          var variant = getVariantForSlot(i, tierEl);
          if (variant) {
            items.push({
              id:       parseInt(variant.id, 10),
              quantity: 1,
              properties: {
                '_Volume Bundle': selectedTier.qty + ' items',
                '_Discount':      selectedTier.discount + '% OFF',
              }
            });
          }
        }

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

          atcBtn.textContent = 'Added ✓';
          setTimeout(function() { window.location.href = '/cart'; }, 600);

        } catch(err) {
          console.error('[VB]', err);
          atcBtn.textContent = '⚠ Try Again';
          atcBtn.disabled = false;
        }
      });
    }

    // ── Format money ──────────────────────────────────────────────
    function formatMoney(cents) {
      if (window.Shopify && window.Shopify.formatMoney) {
        return window.Shopify.formatMoney(cents);
      }
      return '$' + (cents / 100).toFixed(2);
    }
  }
})();
