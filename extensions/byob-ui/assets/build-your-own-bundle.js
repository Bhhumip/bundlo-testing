(function () {
  'use strict';

  document.querySelectorAll('[id^="build-your-own-bundle-"]').forEach(initSection);

  function initSection(section) {
    const sectionId = section.id.replace('build-your-own-bundle-', '');
    const slotCount = parseInt(section.dataset.slotCount, 10) || 4;
    const bundleCode = section.dataset.bundleCode || '';   // ← NEW
    const parentVariantId = section.dataset.parentVariantId || ''; // ← NEW
    const checkoutBtn = document.getElementById(`byob-checkout-${sectionId}`);
    
    // Debug logging
    console.log('[BYOB DEBUG]', {
      sectionId,
      parentVariantId,
      bundleCode,
      slotCount,
      dataAttributes: section.dataset
    });

    const slots = Array(slotCount).fill(null);

    const getSlotEl = (i) => section.querySelector(`.byob-slot[data-slot="${i + 1}"]`);
    const getSlotThumb = (i) => getSlotEl(i)?.querySelector('.byob-slot-thumb');
    const getSlotRemoveBtn = (i) => getSlotEl(i)?.querySelector('.byob-slot-remove');
    const getSlotLabel = (i) => getSlotEl(i)?.querySelector('.byob-slot-label');
    const getAllCards = () => section.querySelectorAll('.byob-product-card');

    function renderSlot(i) {
      const slotEl = getSlotEl(i);
      const thumb = getSlotThumb(i);
      const removeBtn = getSlotRemoveBtn(i);
      const label = getSlotLabel(i);
      if (!slotEl || !thumb) return;

      const item = slots[i];

      if (item) {
        slotEl.classList.add('is-filled');
        thumb.querySelector('.byob-slot-number')?.remove();

        let img = thumb.querySelector('img');
        if (!img) {
          img = document.createElement('img');
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:10px;display:block;';
          // insert before remove button so button stays on top
          thumb.insertBefore(img, removeBtn);
        }
        img.src = item.image;
        img.alt = item.title;

        // FIXED: both hidden=false AND display:flex to guarantee visibility
        if (removeBtn) {
          removeBtn.hidden = false;
          removeBtn.style.display = 'flex';
        }
        if (label) label.textContent = truncate(item.title, 14);

      } else {
        slotEl.classList.remove('is-filled');
        thumb.querySelector('img')?.remove();

        if (!thumb.querySelector('.byob-slot-number')) {
          const num = document.createElement('span');
          num.className = 'byob-slot-number';
          num.textContent = i + 1;
          thumb.insertBefore(num, removeBtn);
        }

        // FIXED: both hidden=true AND display:none
        if (removeBtn) {
          removeBtn.hidden = true;
          removeBtn.style.display = 'none';
        }
        if (label) label.textContent = `Select Item ${i + 1}`;
      }
    }

    function renderCards() {
      const filledIds = new Set(slots.filter(Boolean).map(s => s.productId));
      const allFull   = slots.every(Boolean);

      getAllCards().forEach(card => {
        const pid        = card.dataset.productId;
        const btn        = card.querySelector('.byob-add-btn');
        const removeBtn  = card.querySelector('.byob-remove-btn');
        const btnGroup   = card.querySelector('.byob-btn-group');
        const isSelected = filledIds.has(pid);

        card.classList.toggle('is-selected', isSelected);

        if (btn) {
          const shouldDisable = isSelected || allFull;
          btn.disabled        = shouldDisable;
          btn.textContent     = isSelected ? 'ADDED ✓' : 'ADD TO BOX';
        }

        // Toggle remove button visibility
        if (btnGroup && removeBtn) {
          btnGroup.classList.toggle('has-item', isSelected);
        }
      });
    }

    function renderFooter() {
      if (!checkoutBtn) return;
      const allFull = slots.every(Boolean);
      checkoutBtn.disabled = !allFull;
    }

    function addItem(data) {
      const idx = slots.findIndex(s => s === null);
      if (idx === -1) return;
      slots[idx] = data;
      renderSlot(idx);
      renderCards();
      renderFooter();
    }

    function removeItem(idx) {
      slots[idx] = null;
      renderSlot(idx);
      renderCards();
      renderFooter();
    }

    // ADD TO BOX
    section.addEventListener('click', e => {
      const btn = e.target.closest('.byob-add-btn');
      if (!btn || btn.disabled) return;
      const card = btn.closest('.byob-product-card');
      if (!card) return;
      addItem({
        productId: card.dataset.productId,
        variantId: card.dataset.variantId,
        title: card.dataset.productTitle,
        price: card.dataset.productPrice,
        image: card.dataset.productImage,
      });
    });

    // REMOVE from slot
    section.addEventListener('click', e => {
      const btn = e.target.closest('.byob-slot-remove');
      if (!btn) return;
      e.stopPropagation();
      removeItem(parseInt(btn.dataset.slot, 10) - 1);
    });

    // REMOVE from product card
    section.addEventListener('click', e => {
      const btn = e.target.closest('.byob-remove-btn');
      if (!btn) return;
      e.stopPropagation();
      const productId = btn.dataset.productId;
      // Find and remove the item with this product ID from slots
      const slotIdx = slots.findIndex(s => s && s.productId === productId);
      if (slotIdx !== -1) {
        removeItem(slotIdx);
      }
    });

    // ── CHECKOUT ────────────────────────────────────────────────────────

    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', async () => {
        // Require every slot filled
        if (!slots.every(Boolean)) return;

        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Adding to cart…';

        try {
          // Build child lines data directly from slots
          const childLinesData = slots.map((s) => ({
            variantId: parseInt(s.variantId, 10),
            quantity: 1,                // or s.quantity if you support multiples
            title: s.title,
            image: s.image,
          }));

          // Build items array:
          // ONLY the parent BYOB product, with children stored in properties
          const items = [];

          if (parentVariantId) {
            items.push({
              id: parseInt(parentVariantId, 10),
              quantity: 1,
              properties: {
                _byob_parent: 'true',
                _byob_code: bundleCode,
                _byob_child_lines: JSON.stringify(childLinesData),
              },
            });
          } else {
            throw new Error('⚠ BYOB Product not properly configured. Please ensure a product is selected in section settings and it has an available variant.');
          }

          // Add just the parent line to cart
          const addRes = await fetch('/cart/add.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ items }),
          });

          if (!addRes.ok) {
            const err = await addRes.json();
            throw new Error(err.description || 'Cart error');
          }

          checkoutBtn.textContent = 'Added ✓';
          setTimeout(() => {
            window.location.href = '/cart';
          }, 600);
        } catch (err) {
          console.error('[BYOB]', err);
          checkoutBtn.textContent = '⚠ Error – Try Again';
          checkoutBtn.disabled = false;
        }
      });
    }

    // Init
    for (let i = 0; i < slotCount; i++) renderSlot(i);
    renderCards();
    renderFooter();
  }

  function truncate(str, max) {
    return str && str.length > max ? str.slice(0, max) + '…' : str;
  }
})();