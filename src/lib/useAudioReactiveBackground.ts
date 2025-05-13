import { Colors } from './gameplayConstants';

export interface AudioReactiveOptions {
    appInstance: any; // PixiJS Application
    audioElement: HTMLAudioElement;
    getVolumeFactor?: (rms: number) => number; // Optional custom mapping
}

export function setupAudioReactiveBackground({
    appInstance,
    audioElement,
    getVolumeFactor = (rms) => Math.min(1, rms * 2.5)
}: AudioReactiveOptions) {
    let audioContext: AudioContext | null = null;
    let analyserNode: AnalyserNode | null = null;
    let audioSourceNode: MediaElementAudioSourceNode | null = null;
    let audioDataArray: Uint8Array | null = null;

    function interpolateColor(color1: number, color2: number, factor: number): number {
        const r1 = (color1 >> 16) & 0xff;
        const g1 = (color1 >> 8) & 0xff;
        const b1 = color1 & 0xff;
        const r2 = (color2 >> 16) & 0xff;
        const g2 = (color2 >> 8) & 0xff;
        const b2 = color2 & 0xff;
        const r = Math.round(r1 + factor * (r2 - r1));
        const g = Math.round(g1 + factor * (g2 - g1));
        const b = Math.round(b1 + factor * (b2 - b1));
        return (r << 16) | (g << 8) | b;
    }

    // Setup Web Audio API
    audioContext = new AudioContext();
    audioSourceNode = audioContext.createMediaElementSource(audioElement);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 256;
    audioDataArray = new Uint8Array(analyserNode.frequencyBinCount);
    audioSourceNode.connect(analyserNode);
    analyserNode.connect(audioContext.destination);

    // Animation loop (should be called in your PixiJS ticker/game loop)
    function updateBackground() {
        if (!analyserNode || !audioDataArray || !appInstance) return;
        analyserNode.getByteTimeDomainData(audioDataArray);
        let sum = 0;
        for (let i = 0; i < audioDataArray.length; i++) {
            const normalizedValue = (audioDataArray[i] / 128.0) - 1.0;
            sum += normalizedValue * normalizedValue;
        }
        const rms = Math.sqrt(sum / audioDataArray.length);
        const volumeFactor = getVolumeFactor(rms);
        const bgColor = interpolateColor(Colors.BACKGROUND, Colors.BACKGROUND_PULSE, volumeFactor);
        if (appInstance.renderer && appInstance.renderer.background) {
            appInstance.renderer.background.color = bgColor;
        }
    }

    // Cleanup
    function cleanup() {
        if (audioSourceNode) audioSourceNode.disconnect();
        if (analyserNode) analyserNode.disconnect();
        if (audioContext && audioContext.state !== 'closed') audioContext.close();
    }

    return { updateBackground, cleanup, audioContext, analyserNode, audioSourceNode, audioDataArray };
} 