// ── CONFIG ────────────────────────────────────────────────────────
// môn chuyên của từng tổ hợp (từ config API)
const TO_HOP_MAP = {
    TH1: 'Toán chuyên',
    TH2: 'Vật lý chuyên',
    TH3: 'Hóa học chuyên',
    TH4: 'Sinh học chuyên',
    TH5: 'Tin học chuyên',
    TH6: 'Ngữ văn chuyên',
    TH7: 'Tiếng Anh chuyên',
};

// Tính tổng điểm từng tổ hợp: 3 môn không chuyên + môn chuyên × 2
function computeToHopTotals(scores) {
    const khongChuyen = scores.filter(s => s.subjectName.includes('(không chuyên)'));
    const chuyen      = scores.filter(s => !s.subjectName.includes('(không chuyên)'));
    const sumKC = khongChuyen.reduce((acc, s) => acc + (parseFloat(s.score) || 0), 0);

    return chuyen.flatMap(s => {
        const nameLower = s.subjectName.toLowerCase();
        const entry = Object.entries(TO_HOP_MAP).find(([, mon]) =>
            mon.replace(/ chuyên$/i, '').toLowerCase() === nameLower
        );
        if (!entry) return [];
        const [th, monChuyen] = entry;
        const total = sumKC + (parseFloat(s.score) || 0) * 2;
        return [{ th, monChuyen, total }];
    });
}

// ── FORMAT HELPERS ───────────────────────────────────────────────
const GRADE_MAP = { excellent: 'Xuất sắc', good: 'Tốt', average: 'Khá', poor: 'Yếu' };
const GRADE_YEARS = ['Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9'];
const STATUS_MAP = { registered: 'Đã đăng ký', pending: 'Đang xét', approved: 'Đã duyệt', rejected: 'Từ chối' };

export const fmtGrade = v => GRADE_MAP[v] || v;
export const fmtGender = v => v === 'female' ? 'Nữ' : v === 'male' ? 'Nam' : (v || '—');
export const fmtStatus = v => STATUS_MAP[v] || v;
export const fmtMoney = n => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

export function fmtAddr(a) {
    if (!a) return '—';
    return [a.ward?.fullName, a.district?.fullName, a.province?.fullName]
        .filter(x => x?.trim()).join(', ') || '—';
}

export function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

export function fmtNow() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// ── DOM HELPERS ──────────────────────────────────────────────────
const el = id => document.getElementById(id);
const cloneTemplate = id => el(id).content.cloneNode(true);

// ── RESULT CARD ──────────────────────────────────────────────────
export function populateResult(d, scores) {
    populateProfile(d);
    populateBanner(d, scores);
    populateInfo(d);
    populateGradeChips('conductsList', 'sectionConducts', d.conducts);
    populateGradeChips('perfsList', 'sectionPerfs', d.academicPerformances);
    populateElectives(d.electives);
    populateScores(scores, d.subjects);
    el('feePaid').textContent = fmtMoney((d.totalPaidFee || 0) / 100);
    el('feePending').textContent = fmtMoney((d.totalPendingFee || 0) / 100);
}

function populateProfile(d) {
    const img = el('profileImg');
    const placeholder = el('profilePlaceholder');
    if (d.imageUrl) {
        img.src = d.imageUrl;
        img.style.display = '';
        placeholder.style.display = 'none';
    } else {
        img.style.display = 'none';
        placeholder.style.display = '';
    }
    el('profileName').textContent = `${d.lastName || ''} ${d.firstName || ''}`.trim();
    el('profileReg').textContent = d.registrationCode;
    el('profileCCCD').textContent = d.identify;
    const badge = el('profileBadge');
    badge.textContent = fmtStatus(d.applicationStatus);
    badge.className = 'badge ' + (
        (d.applicationStatus === 'registered' || d.applicationStatus === 'approved') ? 'badge-green' :
            d.applicationStatus === 'pending' ? 'badge-yellow' : 'badge-red'
    );
}

function hasAnyScore(scores) {
    if (!Array.isArray(scores) || !scores.length) return false;
    return scores.some(s => { const v = parseFloat(s.score); return !isNaN(v) && v !== 0; });
}

function populateBanner(d, scores) {
    el('bannerDau').hidden = el('bannerRot').hidden = el('bannerPending').hidden = true;
    if (d.passedClass?.trim()) {
        el('bannerDau').querySelector('.rb-class').textContent = `ĐẬU – ${d.passedClass}`;
        const scoreEl = el('bannerDau').querySelector('.rb-score');
        scoreEl.textContent = d.passedScore ? `Điểm: ${d.passedScore}` : '';
        scoreEl.hidden = !d.passedScore;
        el('bannerDau').hidden = false;
    } else if (hasAnyScore(scores)) {
        el('bannerRot').hidden = false;
    } else {
        el('bannerPending').hidden = false;
    }
}

function populateInfo(d) {
    el('infoName').textContent = `${d.lastName || ''} ${d.firstName || ''}`.trim();
    el('infoGender').textContent = fmtGender(d.gender);
    el('infoDob').textContent = d.dateString || fmtDate(d.birthDate);
    el('infoCCCD').textContent = d.identify || '—';
    el('infoPhone').textContent = d.phoneNumber || '—';
    el('infoEmail').textContent = d.email || '—';
    el('infoBirthPlace').textContent = fmtAddr(d.birthPlace);
    el('infoSchoolName').textContent = d.middleSchoolName || '—';
    el('infoSchoolAddr').textContent = fmtAddr(d.middleSchoolAddress);
}

function populateGradeChips(listId, sectionId, items) {
    const list = el(listId);
    const section = el(sectionId);
    list.innerHTML = '';
    if (items?.length) {
        items.forEach((c, i) => {
            const frag = cloneTemplate('tpl-grade-chip');
            frag.querySelector('.yr').textContent = GRADE_YEARS[i] || `Năm ${i + 1}`;
            frag.querySelector('.gv').textContent = fmtGrade(c);
            list.appendChild(frag);
        });
        section.hidden = false;
    } else {
        section.hidden = true;
    }
}


function populateElectives(electives) {
    const list = el('electivesList');
    const section = el('sectionElectives');
    list.innerHTML = '';
    if (electives?.length) {
        electives.forEach(e => {
            const frag = cloneTemplate('tpl-elective');
            frag.querySelector('.el-lvl').textContent = `Nguyện vọng ${e.level}`;
            frag.querySelector('.el-name').textContent = e.name;
            list.appendChild(frag);
        });
        section.hidden = false;
    } else {
        section.hidden = true;
    }
}

function populateScores(scores, subjects) {
    const inline = el('inlineScores');
    inline.innerHTML = '';

    const hasScores = Array.isArray(scores) && scores.length;
    const items = hasScores
        ? scores.map(s => ({ name: s.subjectName || s.name || '—', value: s.score ?? s.point ?? 'N/A' }))
        : (subjects || []).map(s => ({ name: s.name || '—', value: 'N/A' }));

    if (!items.length) { inline.hidden = true; return; }

    if (hasScores) {
        const totals = computeToHopTotals(scores);
        if (totals.length) {
            const row = document.createElement('div');
            row.className = 'isc-row';
            row.innerHTML = '<span class="isc-row-label">Tổng điểm tổ hợp</span>';
            totals.forEach(({ th, monChuyen, total }) => {
                const chip = document.createElement('div');
                chip.className = 'inline-score-chip combo';
                chip.innerHTML = `<span class="isc-name">${th} – ${monChuyen}</span><span class="isc-val">${total % 1 === 0 ? total : total.toFixed(2)}</span>`;
                row.appendChild(chip);
            });
            inline.appendChild(row);
        }
    }

    const row = document.createElement('div');
    row.className = 'isc-row';
    row.innerHTML = '<span class="isc-row-label">Điểm thành phần</span>';
    items.forEach(({ name, value }) => {
        const chip = document.createElement('div');
        chip.className = 'inline-score-chip';
        chip.innerHTML = `<span class="isc-name">${name}</span><span class="isc-val">${value}</span>`;
        row.appendChild(chip);
    });
    inline.appendChild(row);

    inline.hidden = false;
}

// ── STAGE STATUS ─────────────────────────────────────────────────
export function updateStageUI(published) {
    const stageEl = el('stageStatus');
    const updated = el('stageUpdated');

    stageEl.hidden = false;
    stageEl.className = `stage-status ${published ? 'published' : 'not-published'}`;
    el('stageIcon').textContent = published ? '✅' : '⏳';
    el('stageText').textContent = published
        ? 'Đã có kết quả'
        : 'Chưa có kết quả';

    updated.textContent = `${fmtNow()}`;
    updated.classList.remove('flash');
    void updated.offsetWidth;
    updated.classList.add('flash');
}

// ── ANNOUNCEMENT ─────────────────────────────────────────────────
export function showAnnouncement() {
    if (document.cookie.includes('ptnk_announced=1')) return;
    document.cookie = 'ptnk_announced=1;max-age=31536000;path=/;SameSite=Lax';
    spawnConfetti();
    el('overlay').classList.add('show');
}

export function closeAnnouncement() {
    el('overlay').classList.remove('show');
}

function spawnConfetti() {
    const wrap = el('confettiWrap');
    const colors = ['#fcd34d', '#6ee7b7', '#93c5fd', '#f9a8d4', '#fb923c', '#a5f3fc'];
    for (let i = 0; i < 60; i++) {
        const dot = document.createElement('div');
        dot.className = 'confetti';
        Object.assign(dot.style, {
            left: `${Math.random() * 100}%`,
            top: '-20px',
            background: colors[i % colors.length],
            width: `${6 + Math.random() * 8}px`,
            height: `${6 + Math.random() * 8}px`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDuration: `${2 + Math.random() * 3}s`,
            animationDelay: `${Math.random() * 2}s`,
        });
        wrap.appendChild(dot);
    }
}
