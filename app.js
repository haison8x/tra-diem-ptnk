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

    const sUrl  = buildStudentUrl(cccd, regCode);
    const scUrl = buildScoresUrl(cccd);
    const setLink = (id, url) => {
        document.getElementById(id).href        = url;
        document.getElementById(id).textContent = url;
    };
    setLink('urlStudent', sUrl);
    setLink('urlScores',  scUrl);
    box.hidden = false;
}

document.getElementById('cccd').addEventListener('input', updateApiUrls);
document.getElementById('regCode').addEventListener('input', updateApiUrls);
updateApiUrls();

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

        if (student.passedClass?.trim() || student.passedScore !== null) {
            try {
                const scoresJson = await fetchData(buildScoresUrl(cccd));
                scores = scoresJson?.data ?? null;
            } catch {
                // swallow scores error — result card still shows without subject scores
            }
        }

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
