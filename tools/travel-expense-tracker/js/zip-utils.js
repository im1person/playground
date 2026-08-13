/**
 * Shared ZIP helpers (JSZip loader + progress / share sheet)
 */

const JSZIP_CDN = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';

let jszipLoading = null;
/** @type {{ blob: Blob, filename: string, count: number, subtitle?: string } | null} */
let pendingZip = null;

export function loadJSZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (jszipLoading) return jszipLoading;
    jszipLoading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = JSZIP_CDN;
        s.async = true;
        s.onload = () => {
            if (window.JSZip) resolve(window.JSZip);
            else {
                jszipLoading = null;
                reject(new Error('JSZip 載入失敗'));
            }
        };
        s.onerror = () => {
            jszipLoading = null;
            reject(new Error('無法載入 JSZip（請檢查網絡）'));
        };
        document.head.appendChild(s);
    });
    return jszipLoading;
}

export function sanitizePath(name) {
    return String(name || 'untitled')
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^\.+/, '')
        .slice(0, 80) || 'untitled';
}

export function extFromBlob(blob) {
    const t = (blob?.type || '').toLowerCase();
    if (t.includes('png')) return 'png';
    if (t.includes('webp')) return 'webp';
    if (t.includes('gif')) return 'gif';
    if (t.includes('heic') || t.includes('heif')) return 'heic';
    if (t.includes('json')) return 'json';
    return 'jpg';
}

export function todayStamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function ensureProgressUI() {
    let el = document.getElementById('export-photos-progress');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'export-photos-progress';
    el.className = 'fixed inset-0 z-[110] hidden items-center justify-center bg-black/50 backdrop-blur-sm p-6';
    el.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-3 border border-gray-100 dark:border-gray-700">
            <div class="flex items-center gap-2">
                <i data-lucide="loader-circle" class="w-5 h-5 text-blue-500 animate-spin" id="export-photos-spinner"></i>
                <h3 class="font-bold text-gray-800 dark:text-gray-100 text-sm" id="export-photos-title">處理中…</h3>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400" id="export-photos-status">準備中</p>
            <div class="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden" id="export-photos-bar-wrap">
                <div id="export-photos-bar" class="bg-blue-500 h-2 rounded-full transition-all duration-200" style="width:0%"></div>
            </div>
            <p class="text-[10px] text-gray-400 text-right tabular-nums" id="export-photos-pct">0%</p>
            <div id="export-photos-actions" class="hidden space-y-2 pt-1">
                <p class="text-[11px] text-gray-500 dark:text-gray-400" id="export-photos-ready-msg"></p>
                <button type="button" id="export-photos-share"
                    class="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition">
                    分享／存到檔案
                </button>
                <button type="button" id="export-photos-download"
                    class="w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm font-medium active:scale-[0.98] transition">
                    下載 ZIP
                </button>
                <button type="button" id="export-photos-dismiss"
                    class="w-full py-2 text-xs text-gray-400 hover:text-gray-600">稍後
                </button>
            </div>
        </div>`;
    document.body.appendChild(el);

    el.querySelector('#export-photos-share')?.addEventListener('click', async () => {
        if (!pendingZip) return;
        const { blob, filename } = pendingZip;
        const result = await shareOrDownload(blob, filename, true);
        if (result !== 'cancelled') finishPending();
    });
    el.querySelector('#export-photos-download')?.addEventListener('click', () => {
        if (!pendingZip) return;
        downloadBlob(pendingZip.blob, pendingZip.filename);
        finishPending();
    });
    el.querySelector('#export-photos-dismiss')?.addEventListener('click', () => {
        finishPending();
    });
    return el;
}

export function finishPending() {
    pendingZip = null;
    showProgress(false);
    setReadyMode(false);
}

export function setReadyMode(ready) {
    const actions = document.getElementById('export-photos-actions');
    const barWrap = document.getElementById('export-photos-bar-wrap');
    const pct = document.getElementById('export-photos-pct');
    const spinner = document.getElementById('export-photos-spinner');
    if (actions) actions.classList.toggle('hidden', !ready);
    if (barWrap) barWrap.classList.toggle('hidden', ready);
    if (pct) pct.classList.toggle('hidden', ready);
    if (spinner) spinner.classList.toggle('hidden', ready);
}

export function showProgress(visible) {
    const el = ensureProgressUI();
    el.classList.toggle('hidden', !visible);
    el.classList.toggle('flex', visible);
    if (visible && window.lucide) lucide.createIcons();
}

export function updateProgress(done, total, label, titleHint = '處理中…') {
    ensureProgressUI();
    const status = document.getElementById('export-photos-status');
    const bar = document.getElementById('export-photos-bar');
    const pct = document.getElementById('export-photos-pct');
    const title = document.getElementById('export-photos-title');
    const p = total > 0 ? Math.round((done / total) * 100) : 0;
    if (status) status.textContent = label || `${done} / ${total}`;
    if (bar) bar.style.width = `${Math.min(100, Math.max(0, p))}%`;
    if (pct) pct.textContent = `${Math.min(100, Math.max(0, p))}%`;
    if (title) {
        if (label?.startsWith('壓縮')) title.textContent = '壓縮 ZIP 中…';
        else if (label?.includes('還原') || label?.includes('匯入')) title.textContent = '匯入備份中…';
        else if (label?.includes('準備')) title.textContent = '差不多完成…';
        else title.textContent = titleHint;
    }
}

export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function shareOrDownload(blob, filename, preferShare) {
    const file = new File([blob], filename, { type: 'application/zip' });

    if (preferShare && navigator.canShare) {
        try {
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: filename,
                    text: '旅遊記帳備份'
                });
                return 'shared';
            }
        } catch (err) {
            if (err?.name === 'AbortError') return 'cancelled';
        }
    }

    try {
        downloadBlob(blob, filename);
        return 'downloaded';
    } catch {
        return 'failed';
    }
}

/**
 * @param {object} opts
 * @param {Blob} opts.blob
 * @param {string} opts.filename
 * @param {number} [opts.count]
 * @param {string} [opts.subtitle]
 * @param {string} [opts.readyTitle]
 */
export function showReadySheet({ blob, filename, count = 0, subtitle = '', readyTitle = 'ZIP 已準備好' }) {
    pendingZip = { blob, filename, count, subtitle };
    ensureProgressUI();
    const title = document.getElementById('export-photos-title');
    const status = document.getElementById('export-photos-status');
    const readyMsg = document.getElementById('export-photos-ready-msg');
    if (title) title.textContent = readyTitle;
    if (status) status.textContent = subtitle || (count ? `${count} 個檔案` : filename);
    if (readyMsg) {
        let canShare = false;
        try {
            canShare = !!(navigator.canShare && navigator.canShare({
                files: [new File([blob], filename, { type: 'application/zip' })]
            }));
        } catch { canShare = false; }
        readyMsg.textContent = canShare
            ? '手機建議撳「分享／存到檔案」（可存到「檔案」、Drive、AirDrop）'
            : '撳「下載 ZIP」儲存檔案';
        document.getElementById('export-photos-share')?.classList.toggle('hidden', !canShare);
    }
    setReadyMode(true);
    showProgress(true);
    if (window.lucide) lucide.createIcons();
}
