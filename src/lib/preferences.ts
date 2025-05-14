// src/lib/preferences.ts

// Placeholder for global user preferences

interface GameplayPreferences {
    speedMultiplier: number;
    keybindings: string[]; // e.g., ['d', 'f', 'j', 'k']
    receptorYPosition?: number; // Optional: if user can customize this
    judgmentLineYOffset?: number; // Optional: offset from receptor for judgment text
    perfectWindowMs?: number; // Optional: timing window for Perfect judgment (e.g., +/- 30ms)
    excellentWindowMs?: number; // Optional: timing window for Excellent judgment (e.g., +/- 75ms)
    goodWindowMs?: number;    // Optional: timing window for Good judgment (e.g., +/- 120ms)
    mehWindowMs?: number;      // Optional: timing window for Meh judgment (e.g., +/- 150ms)
}

interface VisualPreferences {
    noteSkin: string;
    showBackgroundVideo: boolean;
    // Add other visual preferences
}

interface AudioPreferences {
    masterVolume: number;
    musicVolume: number;
    keySoundVolume: number;
    // Add other audio preferences
}

interface UserPreferences {
    gameplay: GameplayPreferences;
    visuals: VisualPreferences;
    audio: AudioPreferences;
    // Add other categories of preferences
}

// Default preferences - in a real app, these would be loaded from localStorage or a backend
const defaultPreferences: UserPreferences = {
    gameplay: {
        speedMultiplier: 1.0,
        keybindings: ['d', 'f', 'j', 'k'], // Default 4-key layout
        perfectWindowMs: 20,   // New Perfect window
        excellentWindowMs: 40, // New Excellent window
        goodWindowMs: 80,     // New Good window
        mehWindowMs: 250       // New Meh window (renamed from okWindowMs)
    },
    visuals: {
        noteSkin: 'default',
        showBackgroundVideo: true
    },
    audio: {
        masterVolume: 0.8,
        musicVolume: 1.0,
        keySoundVolume: 0.7
    }
};

// In a real application, you'd have functions to load/save preferences
// For now, just export a static object.
export class Preferences {
    // Static property to hold the current preferences
    public static prefs: UserPreferences = defaultPreferences;

    // Method to load preferences (e.g., from localStorage)
    public static load(): void {
        const savedPrefs = localStorage.getItem('rhythmGamePreferences');
        if (savedPrefs) {
            try {
                const parsedPrefs = JSON.parse(savedPrefs);
                // Basic merge to avoid breaking if new prefs are added to default
                this.prefs = {
                    ...defaultPreferences,
                    ...parsedPrefs,
                    gameplay: { ...defaultPreferences.gameplay, ...(parsedPrefs.gameplay || {}) },
                    visuals: { ...defaultPreferences.visuals, ...(parsedPrefs.visuals || {}) },
                    audio: { ...defaultPreferences.audio, ...(parsedPrefs.audio || {}) },
                };
            } catch (e) {
                console.error("Error loading preferences:", e);
                this.prefs = defaultPreferences; // Fallback to defaults
            }
        } else {
            this.prefs = defaultPreferences;
        }
    }

    // Method to save preferences (e.g., to localStorage)
    public static save(): void {
        try {
            localStorage.setItem('rhythmGamePreferences', JSON.stringify(this.prefs));
        } catch (e) {
            console.error("Error saving preferences:", e);
        }
    }

    // Initialize by loading prefs when the module is first imported (optional)
    // static {
    //   this.load();
    // }
}

// Optionally, load preferences when the module is initialized.
// Preferences.load(); // Be careful with side effects in module scope for SSR or testing. 