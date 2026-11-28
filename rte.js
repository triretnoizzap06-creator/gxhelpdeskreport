/* Rich notes fields: turns selected <textarea>s into a small WYSIWYG box where Ctrl/⌘+B shows real bold.
   The original <textarea> stays in the DOM (hidden) and always holds the text as **bold** markdown,
   so every existing save/read path keeps working unchanged.
   Page config (set before this script): window.RTE_SEL = which textareas, window.RTE_SKIP = ancestors to skip,
   window.RTE_COPY = false when the page styles .rte itself. */
(function () {
  if (window.__rte) return; window.__rte = 1;
  const SEL = window.RTE_SEL || 'textarea', SKIP = window.RTE_SKIP || '', COPY = window.RTE_COPY !== false;
  const desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toHtml = v => esc(v).replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  const isBold = n => n.nodeName === 'B' || n.nodeName === 'STRONG' || (n.style && /^(bold|bolder|[6-9]00)$/.test(n.style.fontWeight));
  const wrap = s => s.split('\n').map(line => { const m = line.match(/^(\s*)([\s\S]*?)(\s*)$/); return m[2] ? m[1] + '**' + m[2].replace(/\*\*/g, '') + '**' + m[3] : line; }).join('\n');
  function toMd(node) {
    let out = '';
    node.childNodes.forEach(n => {
      if (n.nodeType === 3) { out += n.nodeValue.replace(/ /g, ' '); return; }
      if (n.nodeType !== 1) return;
      if (n.nodeName === 'BR') { out += '\n'; return; }
      let inner = toMd(n); if (isBold(n)) inner = wrap(inner);
      if (/^(DIV|P|LI)$/.test(n.nodeName)) { if (out && !out.endsWith('\n')) out += '\n'; out += inner; if (n.nextSibling && !inner.endsWith('\n')) out += '\n'; }
      else out += inner;
    });
    return out;
  }
  const read = ed => toMd(ed).replace(/\n$/, '');
  const fire = (el, type, Ctor = Event, o = {}) => el.dispatchEvent(new Ctor(type, { bubbles: true, ...o }));
  const COPYP = ['fontFamily', 'fontSize', 'lineHeight', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle', 'borderColor', 'borderRadius', 'backgroundColor', 'color', 'flex', 'minHeight'];

  function enhance(ta) {
    if (ta.__rte || (SKIP && ta.closest(SKIP))) return; ta.__rte = true;
    const ed = document.createElement('div'); ed.className = 'rte'; ed.contentEditable = ta.readOnly || ta.disabled ? 'false' : 'true';
    ed.setAttribute('role', 'textbox'); ed.setAttribute('aria-multiline', 'true'); ed.spellcheck = ta.spellcheck;
    const lab = ta.getAttribute('aria-label') || ta.placeholder || ''; if (lab) ed.setAttribute('aria-label', lab);
    if (ta.placeholder) ed.dataset.ph = ta.placeholder;
    if (COPY) { const cs = getComputedStyle(ta); COPYP.forEach(p => { ed.style[p] = cs[p]; }); const rows = +ta.getAttribute('rows') || 2; const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4 || 18;
      ed.style.minHeight = Math.max(parseFloat(cs.minHeight) || 0, rows * lh + (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0) + 2) + 'px'; }
    ed.innerHTML = toHtml(desc.get.call(ta));
    ta.after(ed); ta.classList.add('rte-src');
    Object.defineProperty(ta, 'value', { configurable: true, get() { return desc.get.call(this); }, set(v) { desc.set.call(this, v); if (read(ed) !== String(v)) ed.innerHTML = toHtml(v); } });
    ta.focus = () => { ed.focus(); const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
    const sync = () => { if (!ed.textContent && !ed.querySelector('br + br, div')) ed.innerHTML = ''; desc.set.call(ta, read(ed)); fire(ta, 'input'); };
    ed.addEventListener('input', e => { e.stopPropagation(); sync(); });
    ed.addEventListener('keydown', e => {
      const k = String(e.key).toLowerCase(), mod = e.ctrlKey || e.metaKey;
      if (mod && !e.altKey && k === 'b') { e.preventDefault(); e.stopPropagation(); document.execCommand('bold'); sync(); return; }
      if (mod && !e.altKey && (k === 'i' || k === 'u')) { e.preventDefault(); return; }
      const f = new KeyboardEvent('keydown', { key: e.key, code: e.code, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey, altKey: e.altKey, bubbles: true, cancelable: true });
      if (!ta.dispatchEvent(f)) { e.preventDefault(); e.stopPropagation(); return; }
      e.stopPropagation();
      if (e.key === 'Enter' && !mod) { e.preventDefault(); document.execCommand('insertLineBreak'); sync(); }
    });
    ed.addEventListener('paste', e => { e.preventDefault(); const t = (e.clipboardData || window.clipboardData).getData('text/plain'); document.execCommand('insertHTML', false, toHtml(t)); sync(); });
    ed.addEventListener('drop', e => e.preventDefault());
    ed.addEventListener('focus', () => { ed.classList.add('on'); fire(ta, 'focusin', FocusEvent); ta.dispatchEvent(new FocusEvent('focus')); });
    ed.addEventListener('blur', () => { ed.classList.remove('on'); fire(ta, 'change'); fire(ta, 'focusout', FocusEvent); ta.dispatchEvent(new FocusEvent('blur')); });
  }
  const scan = root => { if (!root.querySelectorAll) return; if (root.matches && root.matches(SEL)) enhance(root); root.querySelectorAll(SEL).forEach(enhance); };
  const css = document.createElement('style');
  css.textContent = `.rte-src{display:none!important}.rte{box-sizing:border-box;width:100%;white-space:pre-wrap;overflow-wrap:anywhere;cursor:text;outline:none;text-align:left}
.rte.on{outline:2px solid #0A84FF;outline-offset:-1px}.rte:empty::before{content:attr(data-ph);color:#A0A0A6;pointer-events:none}.rte b,.rte strong{font-weight:700}`;
  document.head.appendChild(css);
  const start = () => { scan(document.body); new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(scan))).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
