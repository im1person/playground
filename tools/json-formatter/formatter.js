(function () {
  const jsonInput = document.getElementById('jsonInput');
  const lineNumbers = document.getElementById('lineNumbers');
  const jumpToErrorLineBtn = document.getElementById('jumpToErrorLineBtn');
  const formatBtn = document.getElementById('formatBtn');
  const minifyBtn = document.getElementById('minifyBtn');
  const copyBtn = document.getElementById('copyBtn');
  const editFieldsBtn = document.getElementById('editFieldsBtn');
  const indentSizeSelect = document.getElementById('indentSizeSelect');
  const sortKeysCheckbox = document.getElementById('sortKeysCheckbox');
  const autoFormatOnPaste = document.getElementById('autoFormatOnPaste');
  const statsBar = document.getElementById('statsBar');
  const validateBtn = document.getElementById('validateBtn');
  const loadFileBtn = document.getElementById('loadFileBtn');
  const saveFileBtn = document.getElementById('saveFileBtn');
  const fileInput = document.getElementById('fileInput');
  const errorMsg = document.getElementById('errorMsg');
  const textSection = document.getElementById('textSection');
  const fieldSection = document.getElementById('fieldSection');
  const fieldEditorList = document.getElementById('fieldEditorList');
  const backToTextBtn = document.getElementById('backToTextBtn');
  const expandAllBtn = document.getElementById('expandAllBtn');
  const collapseAllBtn = document.getElementById('collapseAllBtn');
  const defaultExpandAllCheckbox = document.getElementById('defaultExpandAll');
  const fieldErrorMsg = document.getElementById('fieldErrorMsg');

  let parsedRoot = null;
  let isArray = false;
  let lastErrorLine = 0;

  const PREF_KEY = 'jsonFormatterPrefs';

  var DELETE_ICON_SVG = '<svg class="btn-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
  var ADD_ICON_SVG = '<svg class="btn-icon-svg btn-icon-svg-add" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';

  /** Count effective width: CJK and other wide chars count as 2 so ch-based width fits. */
  function effectiveChLength(str) {
    if (!str) return 0;
    var n = 0;
    for (var i = 0; i < str.length; i++) {
      var cp = str.codePointAt(i);
      if (cp >= 0x4e00 && cp <= 0x9fff) n += 2;       /* CJK Unified Ideographs */
      else if (cp >= 0x3400 && cp <= 0x4dbf) n += 2; /* CJK Extension A */
      else if (cp >= 0x3000 && cp <= 0x303f) n += 2; /* CJK symbols/punctuation */
      else if (cp >= 0xff00 && cp <= 0xffef) n += 2; /* fullwidth */
      else if (cp > 0xffff) { n += 2; i++; }          /* surrogate pair (e.g. emoji) */
      else n += 1;
    }
    return n;
  }

  function setValueInputWidth(input) {
    var val = input.value || '';
    if (input.type === 'number') {
      var len = val.length;
      var ch = Math.max(6, Math.min(len + 2, 14));
      input.style.width = ch + 'ch';
      return;
    }
    var len = effectiveChLength(val);
    var ch = Math.max(10, Math.min(len + 2, 48));
    input.style.width = ch + 'ch';
  }

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (!raw) return;
      const prefs = JSON.parse(raw);
      if (indentSizeSelect && prefs.indent) indentSizeSelect.value = prefs.indent;
      if (sortKeysCheckbox && typeof prefs.sortKeys === 'boolean') {
        sortKeysCheckbox.checked = prefs.sortKeys;
      }
      if (defaultExpandAllCheckbox && typeof prefs.defaultExpandAll === 'boolean') {
        defaultExpandAllCheckbox.checked = prefs.defaultExpandAll;
      }
    } catch (_) {
      // ignore
    }
  }

  function savePrefs() {
    try {
      const prefs = {
        indent: indentSizeSelect ? indentSizeSelect.value : '2',
        sortKeys: !!(sortKeysCheckbox && sortKeysCheckbox.checked),
        defaultExpandAll: !!(defaultExpandAllCheckbox && defaultExpandAllCheckbox.checked)
      };
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    } catch (_) {
      // ignore
    }
  }

  function setErrorLine(lineNum) {
    if (!lineNumbers) return;
    const spans = lineNumbers.querySelectorAll('.ln-num');
    spans.forEach(function (s) { s.classList.remove('line-number-error'); });
    if (lineNum > 0 && lineNum <= spans.length) {
      spans[lineNum - 1].classList.add('line-number-error');
    }
  }

  function showError(message) {
    errorMsg.textContent = message;
    errorMsg.classList.remove('hidden');
    errorMsg.style.color = '';
    errorMsg.style.backgroundColor = '';
    errorMsg.style.borderColor = '';
    lastErrorLine = 0;
    const lineMatch = /第\s*(\d+)\s*行/.exec(message);
    if (lineMatch) {
      lastErrorLine = parseInt(lineMatch[1], 10);
      setErrorLine(lastErrorLine);
      if (jumpToErrorLineBtn) {
        jumpToErrorLineBtn.classList.remove('hidden');
      }
    } else {
      setErrorLine(0);
      if (jumpToErrorLineBtn) jumpToErrorLineBtn.classList.add('hidden');
    }
  }

  function clearError() {
    errorMsg.textContent = '';
    errorMsg.classList.add('hidden');
    errorMsg.style.color = '';
    errorMsg.style.backgroundColor = '';
    errorMsg.style.borderColor = '';
    if (jumpToErrorLineBtn) jumpToErrorLineBtn.classList.add('hidden');
    lastErrorLine = 0;
    setErrorLine(0);
  }

  function showFieldError(message) {
    fieldErrorMsg.textContent = message;
    fieldErrorMsg.classList.remove('hidden');
  }

  function clearFieldError() {
    fieldErrorMsg.textContent = '';
    fieldErrorMsg.classList.add('hidden');
  }

  /** 若瀏覽器錯誤訊息裡有 position，則換算成約略行/列並附加；沒有則加 Safari 提示。 */
  function getParseErrorDetail(raw, e) {
    const msg = e && e.message ? e.message : String(e);
    const posMatch = /(?:at\s+)?position\s+(\d+)/i.exec(msg) ||
                    /(?:at\s+)?index\s+(\d+)/i.exec(msg) ||
                    /(?:at\s+)?offset\s+(\d+)/i.exec(msg);
    if (!posMatch || !raw) {
      return msg + ' （Safari 等未提供錯誤位置，可試用 Chrome 以顯示約略行/列）';
    }
    const pos = parseInt(posMatch[1], 10);
    const before = raw.slice(0, Math.min(pos, raw.length));
    const line = before.split(/\r\n|\r|\n/).length;
    const lastNewline = before.lastIndexOf('\n');
    const col = lastNewline === -1 ? pos + 1 : pos - lastNewline;
    return msg + ' (約在第 ' + line + ' 行、第 ' + col + ' 列)';
  }

  function sortKeysDeep(value) {
    if (Array.isArray(value)) {
      return value.map(sortKeysDeep);
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const out = {};
      Object.keys(value).sort().forEach(function (k) {
        out[k] = sortKeysDeep(value[k]);
      });
      return out;
    }
    return value;
  }

  function formatJson(text, options) {
    const opts = options || {};
    const indentSetting = opts.indent || '2';
    const sortKeys = !!opts.sortKeys;
    let space;
    if (indentSetting === 'tab') space = '\t';
    else {
      const n = parseInt(indentSetting, 10);
      space = !isNaN(n) ? n : 2;
    }
    const trimmed = text.trim();
    if (!trimmed) return { ok: true, result: '' };
    try {
      let parsed = JSON.parse(trimmed);
      if (sortKeys) parsed = sortKeysDeep(parsed);
      const result = JSON.stringify(parsed, null, space);
      return { ok: true, result, parsed };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  function currentIndentSetting() {
    return indentSizeSelect ? indentSizeSelect.value : '2';
  }

  function currentSortKeys() {
    return !!(sortKeysCheckbox && sortKeysCheckbox.checked);
  }

  function doFormat() {
    const raw = jsonInput.value;
    const { ok, result, error } = formatJson(raw, {
      indent: currentIndentSetting(),
      sortKeys: currentSortKeys()
    });
    if (ok) {
      jsonInput.value = result;
      clearError();
      updateStats();
    } else {
      showError('無效的 JSON：' + getParseErrorDetail(jsonInput.value, { message: error }));
    }
  }

  function getValueType(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    if (typeof v === 'object') return 'object';
    return typeof v;
  }

  function defaultForType(t) {
    switch (t) {
      case 'string': return '';
      case 'number': return 0;
      case 'boolean': return false;
      case 'null': return null;
      case 'object': return {};
      case 'array': return [];
      default: return '';
    }
  }

  function createTypeSelect(currentType, onTypeChange) {
    const typeSelect = document.createElement('select');
    typeSelect.className = 'field-type-select';
    ['string', 'number', 'boolean', 'null', 'object', 'array'].forEach(function (opt) {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      if (opt === currentType) o.selected = true;
      typeSelect.appendChild(o);
    });
    typeSelect.addEventListener('change', function () {
      onTypeChange(typeSelect.value);
    });
    return typeSelect;
  }

  function updateLineNumbers() {
    if (!lineNumbers) return;
    const text = jsonInput.value || '';
    const n = Math.max(1, text.split(/\r\n|\r|\n/).length);
    lineNumbers.innerHTML = '';
    for (let i = 1; i <= n; i++) {
      const span = document.createElement('span');
      span.className = 'ln-num';
      span.textContent = i;
      lineNumbers.appendChild(span);
    }
    if (lastErrorLine > 0) setErrorLine(lastErrorLine);
  }

  function updateStats() {
    if (!statsBar) return;
    const text = jsonInput.value || '';
    const length = text.length;
    const lines = text.split(/\r\n|\r|\n/).length;
    let extra = '';
    try {
      if (text.trim()) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          extra = ' · 陣列長度：' + parsed.length;
        } else if (parsed && typeof parsed === 'object') {
          extra = ' · 頂層 key 數：' + Object.keys(parsed).length;
        }
      }
    } catch (_) {
      // ignore parse errors for stats
    }
    statsBar.textContent = '長度：' + length + ' 字元 · ' + lines + ' 行' + extra;
  }

  function switchToFieldEditor() {
    const raw = jsonInput.value.trim();
    if (!raw) {
      showError('請先貼上或輸入 JSON。');
      return;
    }
    try {
      parsedRoot = JSON.parse(raw);
    } catch (e) {
      showError('無效的 JSON：' + getParseErrorDetail(raw, e));
      return;
    }
    if (parsedRoot !== null && typeof parsedRoot !== 'object') {
      showError('逐欄位編輯僅支援根為物件 {} 或陣列 []。');
      return;
    }
    isArray = Array.isArray(parsedRoot);
    clearError();
    clearFieldError();
    textSection.classList.add('hidden');
    fieldSection.classList.remove('hidden');
    if (textSection.parentElement) textSection.parentElement.classList.add('field-editor-active');
    renderFieldList();
    if (defaultExpandAllCheckbox && defaultExpandAllCheckbox.checked) {
      setTimeout(expandAll, 50);
    }
  }

  function expandAll() {
    const maxRounds = 50;
    let round = 0;
    function clickNext() {
      const btns = fieldSection.querySelectorAll('.btn-expand');
      if (btns.length === 0 || round >= maxRounds) return;
      round += 1;
      btns.forEach(function (btn) {
        if (btn.offsetParent) btn.click();
      });
      setTimeout(clickNext, 20);
    }
    setTimeout(clickNext, 0);
  }

  function collapseAll() {
    // Remove all nested blocks
    const blocks = fieldSection.querySelectorAll('.field-nested-block-full');
    blocks.forEach(function (b) {
      if (b.parentNode) b.parentNode.removeChild(b);
    });
    // Reset controls in nested value cells
    const wrappers = fieldSection.querySelectorAll('.field-value-nested-wrap');
    wrappers.forEach(function (wrap) {
      const ta = wrap.querySelector('.field-value-json');
      const expandBtn = wrap.querySelector('.btn-expand');
      const collapseBtn = wrap.querySelector('.btn-collapse');
      if (ta) ta.style.display = 'block';
      if (expandBtn) expandBtn.style.display = 'inline-block';
      if (collapseBtn) collapseBtn.style.display = 'none';
    });
  }

  function switchToText() {
    try {
      const str = JSON.stringify(parsedRoot, null, 2);
      jsonInput.value = str;
    } catch (e) {
      showFieldError('無法序列化：' + e.message);
      return;
    }
    clearFieldError();
    fieldSection.classList.add('hidden');
    textSection.classList.remove('hidden');
    if (textSection.parentElement) textSection.parentElement.classList.remove('field-editor-active');
    updateStats();
  }

  function renderFieldList(container, target, level, sectionLabel) {
    const listEl = container || fieldEditorList;
    const data = target !== undefined ? target : parsedRoot;
    const depth = level !== undefined ? level : 0;
    const label = sectionLabel !== undefined ? sectionLabel : (listEl === fieldEditorList ? '根' : '');
    listEl.innerHTML = '';

    const isArr = Array.isArray(data);
    const isRoot = listEl === fieldEditorList;

    const refresh = function () {
      renderFieldList(listEl, data, depth, label);
    };

    if (isArr) {
      data.forEach(function (value, index) {
        listEl.appendChild(createRowForArray(index, value, data, listEl, refresh, depth));
      });
    } else {
      Object.keys(data).forEach(function (key) {
        listEl.appendChild(createRowForObject(key, data[key], data, listEl, refresh, depth));
      });
    }

    var addToolbar = function () {
      const toolbar = document.createElement('div');
      toolbar.className = 'field-nested-toolbar';
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'btn btn-icon btn-icon-add';
      var btnText = (isArr ? '新增項目' : '新增欄位') + (label ? ' (' + label + ')' : '');
      addBtn.innerHTML = ADD_ICON_SVG + '<span class="btn-icon-label">' + btnText + '</span>';
      addBtn.title = btnText;
      addBtn.setAttribute('aria-label', btnText);
      addBtn.addEventListener('click', function () {
        if (isArr) {
          data.push(null);
        } else {
          var base = 'newKey';
          var n = 0;
          while (base in data) base = 'newKey' + (++n);
          data[base] = '';
        }
        renderFieldList(listEl, data, depth, label);
      });
      toolbar.appendChild(addBtn);
      listEl.appendChild(toolbar);
    };
    addToolbar();
  }

  function createNestedValueCell(value, type, parent, keyOrIndex, isArrayItem, listEl, refresh, rowRef, depth) {
    const valueCell = document.createElement('div');
    valueCell.className = 'field-value-cell field-value-nested-wrap';

    const toolbar = document.createElement('div');
    toolbar.className = 'field-nested-value-toolbar';
    const expandBtn = document.createElement('button');
    expandBtn.type = 'button';
    expandBtn.className = 'btn btn-icon btn-expand';
    expandBtn.textContent = '展開編輯';
    const collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.className = 'btn btn-icon btn-collapse';
    collapseBtn.textContent = '收合';
    collapseBtn.style.display = 'none';

    const ta = document.createElement('textarea');
    ta.className = 'field-value-json';
    ta.rows = 4;
    ta.spellcheck = false;
    ta.value = JSON.stringify(value, null, 2);
    ta.addEventListener('blur', function () {
      try {
        const trimmed = ta.value.trim();
        if (isArrayItem) parent[keyOrIndex] = trimmed ? JSON.parse(trimmed) : null;
        else parent[keyOrIndex] = trimmed ? JSON.parse(trimmed) : null;
        clearFieldError();
      } catch (e) {
        showFieldError('無效的 JSON：' + e.message);
      }
    });

    let nestedBlock = null;
    const nestedList = document.createElement('div');
    nestedList.className = 'field-editor-list field-editor-list-nested';

    expandBtn.addEventListener('click', function () {
      ta.style.display = 'none';
      expandBtn.style.display = 'none';
      collapseBtn.style.display = 'inline-block';
      nestedBlock = document.createElement('div');
      nestedBlock.className = 'field-nested-block field-nested-block-full';
      nestedBlock.dataset.level = (depth + 1);
      nestedBlock.appendChild(nestedList);
      rowRef.insertAdjacentElement('afterend', nestedBlock);
      var sectionTitle = isArrayItem ? ('[' + keyOrIndex + ']') : keyOrIndex;
      renderFieldList(nestedList, parent[keyOrIndex], depth + 1, sectionTitle);
    });

    collapseBtn.addEventListener('click', function () {
      ta.value = JSON.stringify(parent[keyOrIndex], null, 2);
      if (nestedBlock && nestedBlock.parentNode) nestedBlock.remove();
      nestedBlock = null;
      ta.style.display = 'block';
      expandBtn.style.display = 'inline-block';
      collapseBtn.style.display = 'none';
    });

    toolbar.appendChild(expandBtn);
    toolbar.appendChild(collapseBtn);
    valueCell.appendChild(toolbar);
    valueCell.appendChild(ta);
    return valueCell;
  }

  function createRowForObject(key, value, parentObj, listEl, refresh, depth) {
    const row = document.createElement('div');
    row.className = 'field-row';
    const type = getValueType(value);
    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.className = 'field-key';
    keyInput.value = key;
    keyInput.placeholder = 'key';
    keyInput.dataset.oldKey = key;
    keyInput.title = key;
    keyInput.addEventListener('input', function () { keyInput.title = keyInput.value; });

    const valueCell = document.createElement('div');
    valueCell.className = 'field-value-cell';
    if (type === 'object' || type === 'array') {
      valueCell.appendChild(createNestedValueCell(value, type, parentObj, key, false, listEl, refresh, row, depth));
    } else {
      const input = document.createElement('input');
      input.type = type === 'number' ? 'number' : 'text';
      input.className = 'field-value-input';
      if (type === 'boolean') {
        input.type = 'text';
        input.value = value === true ? 'true' : 'false';
      } else {
        input.value = value === null ? '' : String(value);
      }
      input.dataset.key = key;
      input.addEventListener('change', function () {
        const k = keyInput.value.trim() || key;
        if (!(k in parentObj) && k !== key) return;
        const v = input.value;
        if (type === 'number') parentObj[k] = v === '' ? null : Number(v);
        else if (type === 'boolean') parentObj[k] = v === 'true';
        else parentObj[k] = v;
      });
      input.addEventListener('input', function () { setValueInputWidth(input); });
      valueCell.appendChild(input);
      setValueInputWidth(input);
      requestAnimationFrame(function () { setValueInputWidth(input); });
    }

    const typeSelect = createTypeSelect(type, function (newType) {
      const k = keyInput.value.trim() || key;
      if (k in parentObj) parentObj[k] = defaultForType(newType);
      refresh();
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn-icon btn-icon-delete';
    delBtn.innerHTML = DELETE_ICON_SVG;
    delBtn.title = '刪除';
    delBtn.setAttribute('aria-label', '刪除');
    delBtn.addEventListener('click', function () {
      delete parentObj[key];
      refresh();
    });

    keyInput.addEventListener('blur', function () {
      const newKey = keyInput.value.trim();
      const oldKey = keyInput.dataset.oldKey;
      if (newKey === oldKey) return;
      if (newKey === '') {
        keyInput.value = oldKey;
        return;
      }
      if (oldKey in parentObj) {
        const val = parentObj[oldKey];
        delete parentObj[oldKey];
        parentObj[newKey] = val;
        keyInput.dataset.oldKey = newKey;
      }
      refresh();
    });

    row.appendChild(keyInput);
    row.appendChild(valueCell);
    row.appendChild(typeSelect);
    row.appendChild(delBtn);
    return row;
  }

  function createRowForArray(index, value, parentArr, listEl, refresh, depth) {
    const row = document.createElement('div');
    row.className = 'field-row field-row-array';
    const type = getValueType(value);
    const indexLabel = document.createElement('span');
    indexLabel.className = 'field-index';
    indexLabel.textContent = index;

    const valueCell = document.createElement('div');
    valueCell.className = 'field-value-cell';
    if (type === 'object' || type === 'array') {
      valueCell.appendChild(createNestedValueCell(value, type, parentArr, index, true, listEl, refresh, row, depth));
    } else {
      const input = document.createElement('input');
      input.type = type === 'number' ? 'number' : 'text';
      input.className = 'field-value-input';
      if (type === 'boolean') {
        input.type = 'text';
        input.value = value === true ? 'true' : 'false';
      } else {
        input.value = value === null ? '' : String(value);
      }
      input.dataset.index = String(index);
      input.addEventListener('change', function () {
        const i = parseInt(input.dataset.index, 10);
        const v = input.value;
        if (type === 'number') parentArr[i] = v === '' ? null : Number(v);
        else if (type === 'boolean') parentArr[i] = v === 'true';
        else parentArr[i] = v;
      });
      input.addEventListener('input', function () { setValueInputWidth(input); });
      valueCell.appendChild(input);
      setValueInputWidth(input);
      requestAnimationFrame(function () { setValueInputWidth(input); });
    }

    const typeSelect = createTypeSelect(type, function (newType) {
      parentArr[index] = defaultForType(newType);
      refresh();
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn-icon btn-icon-delete';
    delBtn.innerHTML = DELETE_ICON_SVG;
    delBtn.title = '刪除';
    delBtn.setAttribute('aria-label', '刪除');
    delBtn.addEventListener('click', function () {
      parentArr.splice(index, 1);
      refresh();
    });

    row.appendChild(indexLabel);
    row.appendChild(valueCell);
    row.appendChild(typeSelect);
    row.appendChild(delBtn);
    return row;
  }

  formatBtn.addEventListener('click', doFormat);
  if (minifyBtn) minifyBtn.addEventListener('click', function () {
    const raw = jsonInput.value.trim();
    if (!raw) return;
    try {
      let parsed = JSON.parse(raw);
      if (currentSortKeys()) parsed = sortKeysDeep(parsed);
      const result = JSON.stringify(parsed);
      jsonInput.value = result;
      clearError();
      updateStats();
    } catch (e) {
      showError('無效的 JSON：' + getParseErrorDetail(jsonInput.value.trim(), e));
    }
  });
  editFieldsBtn.addEventListener('click', switchToFieldEditor);
  backToTextBtn.addEventListener('click', switchToText);
  if (expandAllBtn) expandAllBtn.addEventListener('click', expandAll);
  if (collapseAllBtn) collapseAllBtn.addEventListener('click', collapseAll);

  if (jumpToErrorLineBtn) {
    jumpToErrorLineBtn.addEventListener('click', function () {
      if (lastErrorLine < 1) return;
      var lineHeight = 21;
      var targetTop = (lastErrorLine - 1) * lineHeight;
      var visible = jsonInput.clientHeight;
      jsonInput.scrollTop = Math.max(0, targetTop - Math.floor(visible / 3));
      if (lineNumbers) lineNumbers.scrollTop = jsonInput.scrollTop;
    });
  }

  copyBtn.addEventListener('click', function () {
    const raw = jsonInput.value.trim();
    if (!raw) return;
    const { ok, result, error } = formatJson(raw, {
      indent: currentIndentSetting(),
      sortKeys: currentSortKeys()
    });
    const toCopy = ok ? result : raw;
    navigator.clipboard.writeText(toCopy).then(
      function () {
        const label = copyBtn.textContent;
        copyBtn.textContent = '已複製';
        setTimeout(function () {
          copyBtn.textContent = label;
        }, 1500);
      },
      function () {
        showError('無法寫入剪貼簿');
      }
    );
    if (!ok) showError('複製原始內容。無效的 JSON：' + getParseErrorDetail(raw, { message: error }));
    else clearError();
  });

  jsonInput.addEventListener('paste', function (e) {
    if (!autoFormatOnPaste.checked) return;
    setTimeout(function () {
      doFormat();
    }, 10);
  });

  jsonInput.addEventListener('input', function () {
    lastErrorLine = 0;
    setErrorLine(0);
    if (jumpToErrorLineBtn) jumpToErrorLineBtn.classList.add('hidden');
    updateLineNumbers();
    updateStats();
  });
  jsonInput.addEventListener('scroll', function () {
    if (lineNumbers) lineNumbers.scrollTop = jsonInput.scrollTop;
  });

  if (lineNumbers) {
    updateLineNumbers();
  }

  if (validateBtn) {
    validateBtn.addEventListener('click', function () {
      const raw = jsonInput.value.trim();
      if (!raw) {
        showError('內容為空，沒有可檢查的 JSON。');
        return;
      }
      try {
        JSON.parse(raw);
        lastErrorLine = 0;
        setErrorLine(0);
        if (jumpToErrorLineBtn) jumpToErrorLineBtn.classList.add('hidden');
        errorMsg.textContent = 'JSON 解析成功。';
        errorMsg.classList.remove('hidden');
        errorMsg.style.color = '#166534';
        errorMsg.style.backgroundColor = '#dcfce7';
        errorMsg.style.borderColor = '#bbf7d0';
      } catch (e) {
        showError('JSON 無效：' + getParseErrorDetail(raw, e));
      }
    });
  }

  if (loadFileBtn && fileInput) {
    loadFileBtn.addEventListener('click', function () {
      fileInput.value = '';
      fileInput.click();
    });
    fileInput.addEventListener('change', function () {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (evt) {
        jsonInput.value = String(evt.target.result || '');
        clearError();
        updateStats();
        doFormat();
      };
      reader.readAsText(file);
    });
  }

  if (saveFileBtn) {
    saveFileBtn.addEventListener('click', function () {
      const text = jsonInput.value || '';
      if (!text.trim()) return;
      const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      var now = new Date();
      var ts = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') + '-' +
        String(now.getMinutes()).padStart(2, '0') + '-' +
        String(now.getSeconds()).padStart(2, '0');
      a.href = url;
      a.download = 'data-' + ts + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  if (indentSizeSelect) {
    indentSizeSelect.addEventListener('change', function () {
      savePrefs();
    });
  }
  if (sortKeysCheckbox) {
    sortKeysCheckbox.addEventListener('change', function () {
      savePrefs();
    });
  }
  if (defaultExpandAllCheckbox) {
    defaultExpandAllCheckbox.addEventListener('change', function () {
      savePrefs();
    });
  }

  window.addEventListener('keydown', function (e) {
    const ctrlOrMeta = e.ctrlKey || e.metaKey;
    if (!ctrlOrMeta) return;
    const key = e.key.toLowerCase();
    if (key === 'enter') {
      e.preventDefault();
      doFormat();
    } else if (key === 'c' && e.shiftKey) {
      e.preventDefault();
      copyBtn.click();
    }
  });

  // 初始化偏好、行號與統計
  loadPrefs();
  updateLineNumbers();
  updateStats();
})();
