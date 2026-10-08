import { useEffect } from "react";

const ZERO = /^0(\.0+)?%?$/;

// "rgb(9, 31, 122)" -> true when the color is dark enough to need light text
function isDark(color) {
    const parts = color.match(/[\d.]+/g);
    if (!parts || parts.length < 3) return false;
    if (parts.length > 3 && Number(parts[3]) === 0) return false; // transparent
    const [r, g, b] = parts.map(Number);
    return (0.299 * r + 0.587 * g + 0.114 * b) < 110;
}

/*
    Mutes the cells that hold a plain 0 in every report table inside the given
    container, so the real figures stand out. Runs again whenever the tables
    change (new data, another year, another report).
*/
export function useFadeZeros(containerRef) {
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let frame = 0;

        const mark = () => {
            frame = 0;
            container.querySelectorAll("tbody td, tbody th, tfoot td, tfoot th").forEach((cell) => {
                const zero = ZERO.test(cell.textContent.trim());
                cell.classList.toggle("is-zero", zero);
                cell.classList.toggle("is-zero-dark", zero && isDark(getComputedStyle(cell).backgroundColor));
            });
        };

        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(mark);
        };

        const observer = new MutationObserver(schedule);
        observer.observe(container, { childList: true, subtree: true, characterData: true });
        schedule();

        return () => {
            observer.disconnect();
            if (frame) cancelAnimationFrame(frame);
        };
    }, [containerRef]);
}
