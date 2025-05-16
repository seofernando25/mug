<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import gsap from 'gsap';

  let pulseElement: HTMLDivElement;
  let pulseTimeline: gsap.core.Timeline | null = null;
  

  export function triggerPulse(
    centerX: number,
    centerY: number,
    colorHex: number,
    opacityStart: number = 0.05, // Visible opacity
    scaleTo: number = 5,      // Scale multiplier
    durationMs: number = 200  // Standard duration
  ) {
    if (!pulseElement) {
      return;
    }

    const r = (colorHex >> 16) & 0xff;
    const g = (colorHex >> 8) & 0xff;
    const b = colorHex & 0xff;
    const solidPulseColor = `rgb(${r},${g},${b})`; 

    if (pulseTimeline && pulseTimeline.isActive()) {
      pulseTimeline.kill();
    }

    // Set initial size and position
    const initialSize = 20; // Base size in pixels
    const finalX = centerX - initialSize / 2;
    const finalY = centerY - initialSize / 2;

    const gsapSetParams = {
      position: 'fixed',
      left: finalX,
      top: finalY,
      width: initialSize,
      height: initialSize,
      backgroundColor: solidPulseColor, 
      opacity: opacityStart,         
      scale: 1,
      borderRadius: '50%',
      display: 'block' 
    };

    gsap.set(pulseElement, gsapSetParams);
    
    pulseTimeline = gsap.timeline({
      onComplete: () => {
        gsap.set(pulseElement, { display: 'none' });
      }
    });

    pulseTimeline.to(pulseElement, {
      scale: scaleTo,
      opacity: 0, 
      duration: durationMs / 1000,
      ease: 'power2.out'
    });
  }

  onMount(() => {
    // Optional: Initial setup if needed
  });

  onDestroy(() => {
    if (pulseTimeline) {
      pulseTimeline.kill();
    }
  });

</script>

<div bind:this={pulseElement} class="screen-pulse-element"></div>

<style>
  .screen-pulse-element {
    position: fixed;
    pointer-events: none;
    z-index: 9998; /* Back to original z-index */
    display: none; 
    border-radius: 50%;
    transform-origin: '50% 50%';
    /* border: 2px solid yellow; */ /* Remove test border */
  }
</style> 