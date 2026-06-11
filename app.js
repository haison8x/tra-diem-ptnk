import { fetchData, buildStudentUrl, buildScoresUrl } from './api.js';
import { populateResult, closeAnnouncement } from './ui.js';
import { startPolling } from './poll.js';

// expose for inline onclick in HTML
window.closeAnnouncement = closeAnnouncement;

// ── COOKIES ──────────────────────────────────────────────────────
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 năm
function setCookie(name, value) {
    document.cookie = `${name}=${encodeURIComponent(value)};max-age=${COOKIE_MAX_AGE};path=/;SameSite=Lax`;
}
function getCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
}

// pre-fill từ cookie
const savedCccd    = getCookie('ptnk_cccd');
const savedRegCode = getCookie('ptnk_regCode');
document.getElementById('cccd').value    = savedCccd    || '074311006619';
document.getElementById('regCode').value = savedRegCode || '262469';

// ── API URL PREVIEW ──────────────────────────────────────────────
function updateApiUrls() {
    const cccd    = document.getElementById('cccd').value.trim();
    const regCode = document.getElementById('regCode').value.trim();
    const box     = document.getElementById('apiUrls');
    if (!cccd || !regCode) { box.hidden = true; return; }

    const sUrl = buildStudentUrl(cccd, regCode);
    const urlStudentEl = document.getElementById('urlStudent');
    urlStudentEl.href        = sUrl;
    urlStudentEl.textContent = sUrl;
    // scores URL cần studentId (UUID) — chỉ có sau fetch, ẩn cho đến lúc đó
    document.getElementById('urlScores').closest('.api-url-item').hidden = true;
    box.hidden = false;
}

document.getElementById('cccd').addEventListener('input', updateApiUrls);
document.getElementById('regCode').addEventListener('input', updateApiUrls);
updateApiUrls();

// ── HISTORY ──────────────────────────────────────────────────────
const HISTORY_KEY = 'ptnk_history';
const MAX_HISTORY = 10;

function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

function saveToHistory(cccd, regCode, name) {
    const list = loadHistory().filter(e => !(e.cccd === cccd && e.regCode === regCode));
    list.unshift({ cccd, regCode, name, ts: Date.now() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
    renderHistory();
}

function deleteHistoryItem(idx) {
    const list = loadHistory();
    list.splice(idx, 1);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    renderHistory();
}

function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
}

function fillForm(cccd, regCode) {
    document.getElementById('cccd').value    = cccd;
    document.getElementById('regCode').value = regCode;
    updateApiUrls();
}

function fmtRelTime(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60)   return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
}

function renderHistory() {
    const box  = document.getElementById('historyBox');
    const btn  = document.getElementById('historyToggleBtn');
    const list = loadHistory();

    // cập nhật badge số lượng trên button
    btn.textContent = list.length ? `🕓 Lịch sử (${list.length})` : '🕓 Lịch sử';

    if (!list.length) {
        box.innerHTML = '<p class="history-empty">Chưa có lịch sử tra cứu.</p>';
    } else {
        box.innerHTML = `
            <div class="history-header">
                <span class="history-title">Lịch sử tra cứu</span>
                <button class="history-clear-btn" id="historyClearBtn">Xóa tất cả</button>
            </div>
            <div class="history-list" id="historyList"></div>`;

        const listEl = document.getElementById('historyList');
        list.forEach((e, i) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div class="history-item-info">
                    <span class="history-name">${e.name || '—'}</span>
                    <span class="history-meta">${e.regCode} · ${fmtRelTime(e.ts)}</span>
                </div>
                <button class="history-del-btn" data-idx="${i}" title="Xóa">×</button>`;
            item.querySelector('.history-item-info').addEventListener('click', () => {
                fillForm(e.cccd, e.regCode);
                box.hidden = true;
                btn.classList.remove('active');
            });
            item.querySelector('.history-del-btn').addEventListener('click', ev => {
                ev.stopPropagation();
                deleteHistoryItem(i);
            });
            listEl.appendChild(item);
        });

        document.getElementById('historyClearBtn').addEventListener('click', clearHistory);
    }
}

// toggle button
document.getElementById('historyToggleBtn').addEventListener('click', () => {
    const box = document.getElementById('historyBox');
    const btn = document.getElementById('historyToggleBtn');
    const open = box.hidden;
    box.hidden = !open;
    btn.classList.toggle('active', open);
    if (open) renderHistory();
});

// ẩn panel mặc định
document.getElementById('historyBox').hidden = true;
renderHistory(); // cập nhật badge

// ── POLL ─────────────────────────────────────────────────────────
startPolling();

// ── SUBMIT ───────────────────────────────────────────────────────
document.getElementById('searchForm').addEventListener('submit', async e => {
    e.preventDefault();
    const cccd    = document.getElementById('cccd').value.trim();
    const regCode = document.getElementById('regCode').value.trim();
    const errBox  = document.getElementById('errorBox');
    const spinner = document.getElementById('spinner');
    const card    = document.getElementById('resultCard');
    const btn     = document.getElementById('submitBtn');

    errBox.hidden = true;
    card.hidden   = true;

    if (!cccd || !regCode) {
        errBox.textContent = 'Vui lòng nhập đầy đủ số CCCD và số báo danh.';
        errBox.hidden = false;
        return;
    }

    setCookie('ptnk_cccd', cccd);
    setCookie('ptnk_regCode', regCode);

    spinner.style.display = 'block';
    btn.disabled = true;

    try {
        const json = await fetchData(buildStudentUrl(cccd, regCode));
        if (!json?.data) throw new Error('Không tìm thấy thông tin thí sinh. Kiểm tra lại số báo danh và CCCD.');

        const student = json.data;
        let   scores  = null;

        // cập nhật scores URL preview với studentId thực
        const scUrl = buildScoresUrl(student.id);
        const urlScoresEl = document.getElementById('urlScores');
        urlScoresEl.href        = scUrl;
        urlScoresEl.textContent = scUrl;
        urlScoresEl.closest('.api-url-item').hidden = false;

        if (student.passedClass?.trim() || student.passedScore !== null) {
            try {
                const scoresJson = await fetchData(buildScoresUrl(student.id));
                scores = scoresJson?.data ?? null;
            } catch {
                // swallow scores error — result card still shows without subject scores
            }
        }

        const name = `${student.lastName || ''} ${student.firstName || ''}`.trim();
        saveToHistory(cccd, regCode, name);
        populateResult(student, scores);
        card.hidden = false;
    } catch (err) {
        errBox.textContent = err.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
        errBox.hidden = false;
    } finally {
        spinner.style.display = 'none';
        btn.disabled = false;
    }
});
