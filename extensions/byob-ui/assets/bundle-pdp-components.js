/**
 * Bundle PDP Components
 * ─────────────────────────────────────────────────────────────────────
 * Reads bundle.components from a window global set by Liquid,
 * deduplicates by productId, then renders cards directly.
 * No API fetch needed — title, price, image are all in the metafield.
 * ─────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  // Wait for full DOM so inline <script> globals are guaranteed to exist
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    // DOMContentLoaded already fired — but our inline script may still
    // not have run if the external JS was loaded async/defer before it.
    // Use setTimeout(0) to push to end of current call stack.
    setTimeout(run, 0);
  }

  function run() {
    document.querySelectorAll('[id^="bundle-pdp-"]').forEach(initBlock);
  }

  function initBlock(wrap) {
    const grid = wrap.querySelector('.bundle-pdp__grid');
    const loading = wrap.querySelector('.bundle-pdp__loading');
    const errorEl = wrap.querySelector('.bundle-pdp__error');

    // ── 1. Read from window global set by Liquid inline <script> ──
    // Liquid renders:
    //   window.__bundleComponents_BLOCKID = [ ...json... ];
    // The block.id can contain special chars so we use the full id
    // from the wrap element, stripping the 'bundle-pdp-' prefix.
    let components = [];

    try {

      const blockId = wrap.id.replace('bundle-pdp-', '');
      const key = '__bundleData_' + blockId;
      const bundleData = window[key];  // already a parsed object, | json handles it

      if (!bundleData) throw new Error('window.' + key + ' is undefined');
      if (!bundleData.components || !Array.isArray(bundleData.components)) {
        throw new Error('bundleData.components is missing');
      }

      components = bundleData.components;

    } catch (e) {
      console.warn('[Bundle PDP] Failed to read bundle data:', e.message);
      showError(loading, errorEl);
      return;
    }

    // ── 2. Deduplicate by productId ───────────────────────────────
    const seen = new Set();
    const unique = [];

    for (const item of components) {
      const pid = item.productId;
      if (!pid || seen.has(pid)) continue;
      seen.add(pid);
      unique.push(item);
    }

    if (!unique.length) {
      console.warn('[Bundle PDP] No unique products after dedup');
      showError(loading, errorEl);
      return;
    }

    // ── 3. Render ─────────────────────────────────────────────────
    renderCards(grid, unique);
    loading.hidden = true;
    loading.style.display = 'none';
    grid.hidden = false;
  }

  // ── RENDER ───────────────────────────────────────────────────────

  function renderCards(grid, components) {
    grid.innerHTML = '';
    components.forEach(c => grid.appendChild(buildCard(c)));
  }

  function buildCard(component) {
    const article = document.createElement('article');
    article.className = 'bundle-pdp__card';
    article.setAttribute('role', 'listitem');

    // Image
    const imgWrap = document.createElement('div');
    imgWrap.className = 'bundle-pdp__card-img-wrap';

    if (component.image) {
      const img = document.createElement('img');
      img.src = resizeCdnImage(component.image, 400);
      img.alt = component.title || '';
      img.loading = 'lazy';
      img.width = 400;
      img.height = 400;
      imgWrap.appendChild(img);
    } else {
      imgWrap.classList.add('bundle-pdp__card-img-wrap--placeholder');
      imgWrap.textContent = '📦';
    }

    // Info
    const info = document.createElement('div');
    info.className = 'bundle-pdp__card-info';

    const name = document.createElement('p');
    name.className = 'bundle-pdp__card-name';
    name.textContent = component.title || 'Product';
    info.appendChild(name);

    if (component.price != null) {
      const price = document.createElement('p');
      price.className = 'bundle-pdp__card-price';
      price.textContent = formatMoney(component.price);
      info.appendChild(price);
    }

    article.appendChild(imgWrap);
    article.appendChild(info);

    // Click to navigate
    const numericId = extractNumericId(component.productId);
    if (numericId) {
      article.style.cursor = 'pointer';
      article.setAttribute('tabindex', '0');
      const go = () => navigateToProduct(numericId, component.title);
      article.addEventListener('click', go);
      article.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    }

    return article;
  }

  // ── NAVIGATION ───────────────────────────────────────────────────

  async function navigateToProduct(numericId, title) {
    try {
      const res = await fetch(`/products.json?ids=${numericId}&limit=1`, { cache: 'force-cache' });
      if (res.ok) {
        const data = await res.json();
        const handle = data?.products?.[0]?.handle;
        if (handle) { window.location.href = `/products/${handle}`; return; }
      }
    } catch (_) { }
    if (title) window.location.href = `/search?q=${encodeURIComponent(title)}&type=product`;
  }

  // ── HELPERS ──────────────────────────────────────────────────────

  function extractNumericId(gid) {
    if (!gid) return null;
    const parts = String(gid).split('/');
    return parts[parts.length - 1] || null;
  }

  function resizeCdnImage(url, size) {
    if (!url || !url.includes('cdn.shopify.com')) return url;
    return url.replace(/(\.[a-z]{3,4})(\?|$)/i, `_${size}x$1$2`);
  }

  function formatMoney(price) {
    if (price == null) return '';
    const numeric = parseFloat(price);
    if (isNaN(numeric)) return String(price);
    if (window.Shopify?.formatMoney) {
      return window.Shopify.formatMoney(Math.round(numeric * 100), '{{amount}}');
    }
    const currency = window.Shopify?.currency?.active || '$';
    return `${currency}${numeric.toFixed(2)}`;
  }

  function showError(loading, errorEl) {
    if (loading) loading.hidden = true;
    if (errorEl) errorEl.hidden = false;
  }

})();
