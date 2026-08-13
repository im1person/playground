/**
 * Full backup = data.json + all receipt images in one ZIP
 * Format: travel-tracker-full-v1
 */
import { store } from './store.js';
import { getReceiptIds } from './utils.js';
import { getReceipt, saveReceipt, deleteReceipt } from './db.js';
import {
    loadJSZip,
    extFromBlob,
    todayStamp,
    showProgress,
    updateProgress,
    setReadyMode,
    showReadySheet
} from './zip-utils.js';

const FORMAT = 'travel-tracker-full-v1';
let backupInFlight = false;

function collectAllReceiptIds(data) {
    const ids = [];
    const seen = new Set();
    for (const trip of data?.trips || []) {
        for (const exp of trip.expenses || []) {
            for (const rid of getReceiptIds(exp)) {
                if (!seen.has(rid)) {
                    seen.add(rid);
                    ids.push(rid);
                }
            }
        }
    }
    return ids;
}

/** Export complete backup (JSON + photos) */
export async function exportFullBackup() {
    if (backupInFlight) return;
    backupInFlight = true;
    setReadyMode(false);
    showProgress(true);

    try {
        const data = store.data;
        const receiptIds = collectAllReceiptIds(data);
        const totalSteps = receiptIds.length + 2; // photos + json + zip
        updateProgress(0, totalSteps, '載入工具…', '完整備份中…');

        const JSZip = await loadJSZip();
        const zip = new JSZip();

        const manifest = {
            format: FORMAT,
            createdAt: new Date().toISOString(),
            tripCount: (data.trips || []).length,
            receiptCount: receiptIds.length,
            app: 'travel-expense-tracker'
        };
        zip.file('manifest.json', JSON.stringify(manifest, null, 2));
        zip.file('data.json', JSON.stringify(data, null, 2));

        let packed = 0;
        let missing = 0;
        for (const rid of receiptIds) {
            updateProgress(packed, totalSteps, `備份相片 ${packed + 1}/${receiptIds.length}`, '完整備份中…');
            let blob = null;
            try {
                blob = await getReceipt(rid);
            } catch (err) {
                console.warn('Backup skip', rid, err);
            }
            if (!blob) {
                missing++;
                packed++;
                continue;
            }
            const ext = extFromBlob(blob);
            // Keep id in filename so import can restore the same receiptId
            zip.file(`receipts/${rid}.${ext}`, blob, { compression: 'STORE' });
            packed++;
            updateProgress(packed, totalSteps, `已加入相片 ${packed}/${receiptIds.length}`, '完整備份中…');
        }

        updateProgress(receiptIds.length + 1, totalSteps, '壓縮 ZIP…', '完整備份中…');
        const zipBlob = await zip.generateAsync(
            { type: 'blob', mimeType: 'application/zip', compression: 'STORE' },
            (meta) => {
                const overall = receiptIds.length + 1 + (meta.percent / 100);
                updateProgress(overall, totalSteps, `壓縮 ZIP… ${Math.round(meta.percent)}%`, '完整備份中…');
            }
        );

        const filename = `travel_full_backup_${todayStamp()}.zip`;
        const subtitle = missing
            ? `${(data.trips || []).length} 個行程 · ${packed - missing} 張相（${missing} 張缺失）`
            : `${(data.trips || []).length} 個行程 · ${packed} 張相 · 資料+相片`;

        showReadySheet({
            blob: zipBlob,
            filename,
            count: packed - missing,
            subtitle,
            readyTitle: '完整備份已準備好'
        });
    } catch (err) {
        console.error(err);
        showProgress(false);
        setReadyMode(false);
        alert('完整備份失敗：' + (err?.message || err));
    } finally {
        backupInFlight = false;
    }
}

function parseReceiptIdFromPath(path) {
    // receipts/rcpt_xxx.jpg  or  receipts/rcpt_xxx
    const base = path.split('/').pop() || '';
    const id = base.replace(/\.[^.]+$/, '');
    return id || null;
}

async function importFullBackupZip(file) {
    if (backupInFlight) return;
    if (!confirm('匯入完整備份會取代而家所有行程同收據相。確定？')) {
        return;
    }

    backupInFlight = true;
    setReadyMode(false);
    showProgress(true);
    updateProgress(0, 1, '讀取 ZIP…', '匯入備份中…');

    try {
        const JSZip = await loadJSZip();
        const zip = await JSZip.loadAsync(file);

        // Locate data.json (flexible path)
        let dataFile = zip.file('data.json')
            || zip.file(/data\.json$/i)[0]
            || zip.file(/travel_tracker_backup\.json$/i)[0];
        if (!dataFile) {
            throw new Error('ZIP 入面搵唔到 data.json');
        }

        const dataText = await dataFile.async('string');
        const data = JSON.parse(dataText);
        if (!data?.trips || !Array.isArray(data.trips)) {
            throw new Error('備份資料格式唔啱');
        }

        // Optional manifest check
        const manifestFile = zip.file('manifest.json');
        if (manifestFile) {
            try {
                const manifest = JSON.parse(await manifestFile.async('string'));
                if (manifest.format && manifest.format !== FORMAT) {
                    console.warn('Unknown backup format', manifest.format);
                }
            } catch { /* ignore */ }
        }

        const receiptEntries = Object.keys(zip.files).filter(p =>
            !zip.files[p].dir && /^receipts\//i.test(p)
        );

        const total = receiptEntries.length + 2;
        const oldIds = collectAllReceiptIds(store.data);
        updateProgress(0, total, '還原收據…', '匯入備份中…');

        let restored = 0;
        let failed = 0;
        for (let i = 0; i < receiptEntries.length; i++) {
            const path = receiptEntries[i];
            updateProgress(i, total, `還原相片 ${i + 1}/${receiptEntries.length}`, '匯入備份中…');
            const rid = parseReceiptIdFromPath(path);
            if (!rid) {
                failed++;
                continue;
            }
            try {
                const blob = await zip.file(path).async('blob');
                // Ensure a usable MIME if missing
                let toSave = blob;
                if (!blob.type || blob.type === 'application/octet-stream') {
                    const ext = (path.split('.').pop() || 'jpg').toLowerCase();
                    const mime = ext === 'png' ? 'image/png'
                        : ext === 'webp' ? 'image/webp'
                        : ext === 'gif' ? 'image/gif'
                        : ext === 'heic' || ext === 'heif' ? 'image/heic'
                        : 'image/jpeg';
                    toSave = new Blob([blob], { type: mime });
                }
                await saveReceipt(rid, toSave);
                restored++;
            } catch (err) {
                console.warn('Restore receipt failed', path, err);
                failed++;
            }
        }

        updateProgress(total - 1, total, '寫入行程資料…', '匯入備份中…');
        store.data = data;
        store.save();

        const keep = new Set(collectAllReceiptIds(data));
        for (const oldId of oldIds) {
            if (!keep.has(oldId)) {
                try { await deleteReceipt(oldId); } catch {}
            }
        }

        updateProgress(total, total, '完成', '匯入備份中…');
        showProgress(false);

        const msg = failed
            ? `匯入成功：${data.trips.length} 個行程、${restored} 張相（${failed} 張失敗）。即將重新載入。`
            : `匯入成功：${data.trips.length} 個行程、${restored} 張相。即將重新載入。`;
        alert(msg);
        location.reload();
    } catch (err) {
        console.error(err);
        showProgress(false);
        setReadyMode(false);
        alert('匯入失敗：' + (err?.message || err));
    } finally {
        backupInFlight = false;
    }
}

async function importJsonOnly(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data?.trips) throw new Error('檔案格式唔啱');
    const hasPhotos = collectAllReceiptIds(data).length > 0;
    const warn = hasPhotos
        ? '呢個係 JSON（只有資料）。收據相片唔會一齊還原。若你有完整備份 ZIP，請改匯入 ZIP。\n\n仍然繼續？'
        : '匯入 JSON 會取代而家所有行程資料。確定？';
    if (!confirm(warn)) return;
    store.data = data;
    store.save();
    alert('匯入成功');
    location.reload();
}

/** Unified import: .zip full backup or .json data-only */
export async function importBackupFile(input) {
    const file = input?.files?.[0];
    if (!file) return;
    // Reset input so same file can be chosen again
    const reset = () => { try { input.value = ''; } catch {} };

    try {
        const name = (file.name || '').toLowerCase();
        const isZip = name.endsWith('.zip')
            || file.type === 'application/zip'
            || file.type === 'application/x-zip-compressed';

        if (isZip) {
            await importFullBackupZip(file);
        } else if (name.endsWith('.json') || file.type.includes('json') || file.type === 'application/octet-stream') {
            // Try JSON; if fails and looks like zip bytes, tip user
            try {
                await importJsonOnly(file);
            } catch (err) {
                if (name.endsWith('.json')) throw err;
                // Some browsers give empty type for zip
                await importFullBackupZip(file);
            }
        } else {
            // Fallback: try zip then json
            try {
                await importFullBackupZip(file);
            } catch {
                await importJsonOnly(file);
            }
        }
    } catch (err) {
        alert('匯入失敗：' + (err?.message || err));
    } finally {
        reset();
    }
}

window.exportFullBackup = exportFullBackup;
window.importBackupFile = importBackupFile;
