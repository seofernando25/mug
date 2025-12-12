import type { Action } from 'svelte/action';

// Svelte Action for levitating text effect
export const levitateText: Action<HTMLElement> = (node) => {
    const originalText = node.textContent || '';
    const randomOffset = Math.random() * 100;
    if (originalText) {
        node.innerHTML = originalText
            .split('')
            .map((char, i) =>
                char === ' '
                    ? ' ' // Preserve spaces
                    : `<span class="levitate" style="animation-delay: ${-i * 150 + randomOffset}ms">${char}</span>`
            )
            .join('');
    }

    return {
        destroy() {
            // Optional: Restore original text content if needed
        }
    };
}; 