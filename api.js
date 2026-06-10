export const BASE = 'https://tuyensinh-backend.ptnk.edu.vn/api/v1';

let _scorePublished = false;
export const setScorePublished = v => { _scorePublished = v; };

const HTTP_ERRORS = {
    400: 'Máy chủ đang quá tải (400). Vui lòng thử lại sau ít phút.',
    500: 'Sai thông tin (500). Kiểm tra lại số CCCD và số báo danh.',
    503: 'Máy chủ đang quá tải (503). Vui lòng thử lại sau ít phút.',
};

function parseServerError(body, status) {
    if (body?.data === null && body.errorKey) {
        const key = body.errorKey;
        if (key === 'INTERNAL_SERVER_ERROR') return 'Sai thông tin. Kiểm tra lại số CCCD và số báo danh.';
        if (key === 'BAD_REQUEST')           return 'Máy chủ đang quá tải. Vui lòng thử lại sau ít phút.';
        return body.message || `Lỗi: ${key}`;
    }
    return HTTP_ERRORS[status] || null;
}

export async function fetchData(url, signal) {
    const r    = await fetch(url, signal ? { signal } : undefined);
    const body = await r.json().catch(() => null);
    const msg  = parseServerError(body, r.status);
    if (msg) throw new Error(msg);
    if (r.ok && body) return body;
    throw new Error('Không thể kết nối tới máy chủ. Vui lòng thử lại sau ít phút.');
}

export const buildStudentUrl = (cccd, regCode) =>
    `${BASE}/students/${encodeURIComponent(cccd)}?registrationCode=${encodeURIComponent(regCode)}`;

export const buildScoresUrl = (cccd) =>
    `${BASE}/students/${encodeURIComponent(cccd)}/scores`;
