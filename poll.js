import { BASE, fetchData, setScorePublished } from './api.js';
import { updateStageUI, showAnnouncement } from './ui.js';

export function startPolling() {
    let published = false;

    async function check() {
        try {
            const year       = new Date().getFullYear();
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 2000);
            const json       = await fetchData(`${BASE}/configs/admission-generals/score-stage?year=${year}`, controller.signal);
            const isPublished = json?.data === true;
            updateStageUI(isPublished);

            if (isPublished && !published) {
                published = true;
                setScorePublished(true);
                clearInterval(timer);
                document.getElementById('pollChip').classList.add('announced');
                document.getElementById('pollLabel').textContent = 'Đã công bố kết quả!';
                showAnnouncement();
            }
        } catch {}
    }

    const timer = setInterval(check, 2000);
    check();
}
