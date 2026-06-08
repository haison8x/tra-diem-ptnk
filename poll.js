import { BASE, fetchData, setScorePublished } from './api.js';
import { updateStageUI, showAnnouncement } from './ui.js';

export function startPolling() {
    let published = false;

    async function check() {
        try {
            const json        = await fetchData(`${BASE}/configs/admission-generals/score-stage?year=2026`);
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

    const timer = setInterval(check, 3000);
    check();
}
