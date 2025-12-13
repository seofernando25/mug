interface GameplayPreferences {
	speedMultiplier: number;
	keybindings: string[];
	receptorYPosition?: number;
	judgmentLineYOffset?: number;
	perfectWindowMs?: number;
	excellentWindowMs?: number;
	goodWindowMs?: number;
	mehWindowMs?: number;
}

interface VisualPreferences {
	noteSkin: string;
	showBackgroundVideo: boolean;
}

interface AudioPreferences {
	masterVolume: number;
	musicVolume: number;
	keySoundVolume: number;
}

interface UserPreferences {
	gameplay: GameplayPreferences;
	visuals: VisualPreferences;
	audio: AudioPreferences;
}

const defaultPreferences: UserPreferences = {
	gameplay: {
		speedMultiplier: 1.0,
		keybindings: ["d", "f", "j", "k"],
		perfectWindowMs: 20,
		excellentWindowMs: 40,
		goodWindowMs: 80,
		mehWindowMs: 250,
	},
	visuals: {
		noteSkin: "default",
		showBackgroundVideo: true,
	},
	audio: {
		masterVolume: 0.8,
		musicVolume: 1.0,
		keySoundVolume: 0.7,
	},
};

export const Preferences = {
	prefs: defaultPreferences,

	load(): void {
		const savedPrefs = localStorage.getItem("rhythmGamePreferences");
		if (savedPrefs) {
			try {
				const parsedPrefs = JSON.parse(savedPrefs);
				Preferences.prefs = {
					...defaultPreferences,
					...parsedPrefs,
					gameplay: {
						...defaultPreferences.gameplay,
						...(parsedPrefs.gameplay || {}),
					},
					visuals: {
						...defaultPreferences.visuals,
						...(parsedPrefs.visuals || {}),
					},
					audio: { ...defaultPreferences.audio, ...(parsedPrefs.audio || {}) },
				};
			} catch (e) {
				console.error("Error loading preferences:", e);
				Preferences.prefs = defaultPreferences;
			}
		} else {
			Preferences.prefs = defaultPreferences;
		}
	},

	save(): void {
		try {
			localStorage.setItem(
				"rhythmGamePreferences",
				JSON.stringify(Preferences.prefs),
			);
		} catch (e) {
			console.error("Error saving preferences:", e);
		}
	},
};
