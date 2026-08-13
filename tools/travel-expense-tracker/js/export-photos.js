/**
 * Export receipt photos as ZIP (album-style folders) — mobile-first
 */
import { store } from './store.js';
import { getReceiptIds, getTripDate } from './utils.js';
import { getReceipt } from './db.js';
import {
    loadJSZip,
    sanitizePath,
    extFromBlob,
    todayStamp,
    showProgress,
    updateProgress,
    setReadyMode,
    showReadySheet
} from './zip-utils.js';

let exportInFlight = false;

function collectPhotoJobs(scope) {
    const trips = scope === 'all'
        ? (store.data.trips || [])
        : (store.activeTrip ? [store.activeTrip] : []);

    const jobs = [];
    for (const trip of trips) {
        const baseName = sanitizePath(trip.name || trip.settings?.location || '行程');
        const tripName = `${baseName}_${String(trip.id || '').slice(-4) || 'trip'}`;
        const expenses = [...(trip.expenses || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
        for (const exp of expenses) {
            const ids = getReceiptIds(exp);
            if (!ids.length) continue;
            const day = sanitizePath(getTripDate(exp.date) || 'unknown');
            const title = sanitizePath(exp.title || 'receipt');
            ids.forEach((rid, i) => {
                jobs.push({
                    receiptId: rid,
                    tripName,
                    day,
                    title,
                    index: i + 1,
                    total: ids.length
                });
            });
        }
    }
    return jobs;
}

/**
 * @param {'trip'|'all'} scope
 */
export async function exportPhotosZip(scope = 'trip') {
    if (exportInFlight) return;
    const jobs = collectPhotoJobs(scope);
    if (!jobs.length) {
        alert(scope === 'all' ? '全部行程都未有收據相片' : '呢個行程未有收據相片');
        return;
    }

    exportInFlight = true;
    setReadyMode(false);
    showProgress(true);
    updateProgress(0, jobs.length + 1, `載入工具…（共 ${jobs.length} 張）`, '匯出收據中…');

    try {
        const JSZip = await loadJSZip();
        const zip = new JSZip();
        const root = `travel_receipts_${scope === 'all' ? 'all' : 'trip'}_${todayStamp()}`;
        const usedPaths = new Set();

        let done = 0;
        for (const job of jobs) {
            updateProgress(done, jobs.length + 1, `讀取相片 ${done + 1}/${jobs.length}`, '匯出收據中…');
            let blob = null;
            try {
                blob = await getReceipt(job.receiptId);
            } catch (err) {
                console.warn('Skip receipt', job.receiptId, err);
            }
            if (!blob) {
                done++;
                continue;
            }

            const ext = extFromBlob(blob);
            const suffix = job.total > 1 ? `_${job.index}` : '';
            let rel = `${root}/${job.tripName}/${job.day}/${job.title}${suffix}.${ext}`;
            let n = 2;
            while (usedPaths.has(rel)) {
                rel = `${root}/${job.tripName}/${job.day}/${job.title}${suffix}_${n}.${ext}`;
                n++;
            }
            usedPaths.add(rel);
            zip.file(rel, blob, { compression: 'STORE' });
            done++;
            updateProgress(done, jobs.length + 1, `已加入 ${done}/${jobs.length}`, '匯出收據中…');
        }

        if (usedPaths.size === 0) {
            showProgress(false);
            alert('搵唔到可匯出嘅相片檔案');
            return;
        }

        updateProgress(jobs.length, jobs.length + 1, '壓縮 ZIP…', '匯出收據中…');
        const zipBlob = await zip.generateAsync(
            { type: 'blob', mimeType: 'application/zip', compression: 'STORE' },
            (meta) => {
                const overall = jobs.length + (meta.percent / 100);
                updateProgress(overall, jobs.length + 1, `壓縮 ZIP… ${Math.round(meta.percent)}%`, '匯出收據中…');
            }
        );

        const tripLabel = scope === 'all'
            ? 'all'
            : sanitizePath(store.activeTrip?.name || 'trip');
        const filename = `travel_receipts_${tripLabel}_${todayStamp()}.zip`;

        showReadySheet({
            blob: zipBlob,
            filename,
            count: usedPaths.size,
            subtitle: `${usedPaths.size} 張收據（相簿格式）`,
            readyTitle: '收據 ZIP 已準備好'
        });
    } catch (err) {
        console.error(err);
        showProgress(false);
        setReadyMode(false);
        alert('匯出失敗：' + (err?.message || err));
    } finally {
        exportInFlight = false;
    }
}

window.exportPhotosZip = exportPhotosZip;
