import { Pane } from 'tweakpane';

const SETTINGS = {
  skipLogin: false,
};

// Use 'any' temporarily to bypass potential type definition issues
// This is not ideal but helps proceed if types are problematic
let pane: any | null = null; 

const TweakpaneManager = {
  init() {
    // Prevent multiple initializations and ensure browser environment
    if (pane || typeof window === 'undefined') return;

    // Use 'any' for instantiation as well if direct Pane type causes issues
    pane = new (Pane as any)({ title: 'Debug' });
    if (pane && typeof pane.addBinding === 'function') {
        pane.addBinding(SETTINGS, 'skipLogin', { label: 'Skip Login' });
    } else {
        console.error('Tweakpane pane or addBinding not available.');
    }
  },

  toggleVisibility() {
    if (pane && typeof pane.hidden !== 'undefined') {
      pane.hidden = !pane.hidden;
    } else {
        console.error('Tweakpane pane or hidden property not available.');
    }
  },

  getSkipLogin(): boolean {
    if (!pane) {
        this.init();
    }
    return SETTINGS.skipLogin;
  },

  dispose() {
    if (pane && typeof pane.dispose === 'function') {
      pane.dispose();
      pane = null;
    } else {
        // console.error('Tweakpane pane or dispose not available.');
    }
  }
};

export default TweakpaneManager; 