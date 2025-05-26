# Web Integration Example

This example shows how to use the new `WebGameAdapter` to replace the old complex `createGame` function.

## Before (Old Complex Integration)

```typescript
// Old way - complex manual setup
const gameInstance = await createGame(songData, chartData, canvasElement, {
  onPhaseChange: (phase) => { /* complex phase handling */ },
  onCountdownUpdate: (value) => { /* countdown logic */ },
  onSongEnd: () => { /* cleanup */ },
  onScoreUpdate: (score, combo, maxCombo) => { /* score display */ },
  onNoteHit: (note, judgment, color) => { /* hit effects */ },
  onNoteMiss: (note) => { /* miss effects */ },
  getGamePhase: () => phase,
  getIsPaused: () => isPaused,
  getCountdownValue: () => countdownValue,
  onTimeUpdate: (currentTimeMs) => { /* time sync */ }
});
```

## After (New Simple Integration)

```typescript
import { WebGameAdapter, type GameplaySong } from 'game-engine';

// Convert your chart data to GameplaySong format
const song: GameplaySong = {
  audioFilename: songData.audioUrl,
  backgroundImageUrl: songData.backgroundImageUrl,
  bpm: chartData.bpm,
  lanes: chartData.lanes,
  hitObjects: chartData.hitObjects.map(ho => ({
    timeMs: ho.time,
    lane: ho.lane,
    noteInfo: ho.note_type === 'hold' 
      ? { type: 'hold', durationMs: ho.duration || 0 }
      : { type: 'tap' }
  }))
};

// Create the adapter with simple callbacks
const gameAdapter = new WebGameAdapter({
  onPhaseChange: (phase) => {
    console.log('Gameplay phase:', phase);
    // Update your UI based on phase
  },
  onCountdownUpdate: (count) => {
    console.log('Countdown:', count);
    // Show countdown in UI
  },
  onScoreUpdate: (playerId, score, combo, accuracy) => {
    console.log(`Score: ${score}, Combo: ${combo}, Accuracy: ${accuracy}%`);
    // Update score display
  },
  onNoteHit: (noteId, judgment, score) => {
    console.log(`Hit note ${noteId} with ${judgment} for ${score} points`);
    // Show hit effects
  },
  onNoteMiss: (noteId) => {
    console.log(`Missed note ${noteId}`);
    // Show miss effects
  },
  onTimeUpdate: (currentTimeMs) => {
    // Use this for rendering sync
    updateRendering(currentTimeMs);
  },
  onSongEnd: () => {
    console.log('Song ended');
    // Show results screen
  }
}, {
  gameConfig: {
    keybindings: ['d', 'f', 'j', 'k'],
    countdownSeconds: 3,
    timing: {
      perfectWindowMs: 30,
      excellentWindowMs: 60,
      goodWindowMs: 90,
      mehWindowMs: 150
    }
  }
});

// Simple 3-step initialization
async function startGame() {
  try {
    // Step 1: Initialize chart
    await gameAdapter.initializeChart(song);
    
    // Step 2: Load audio
    await gameAdapter.loadSong(songData.audioUrl);
    
    // Step 3: Start gameplay (countdown -> game)
    gameAdapter.startGameplay();
    
  } catch (error) {
    console.error('Failed to start game:', error);
  }
}

// Input handling
function handleKeyPress(event: KeyboardEvent) {
  gameAdapter.handleKeyPress(event.key);
}

function handleKeyRelease(event: KeyboardEvent) {
  gameAdapter.handleKeyRelease(event.key);
}

// Game control
function pauseGame() {
  gameAdapter.pause();
}

function resumeGame() {
  gameAdapter.resume();
}

// Rendering integration
function updateRendering(currentTimeMs: number) {
  const notes = gameAdapter.getNotesForRendering();
  const playerStates = gameAdapter.getPlayerStates();
  const phase = gameAdapter.getGameplayPhase();
  
  // Use this data to update your PIXI.js rendering
  // The notes array contains all notes with their current states
  // Player states contain score, combo, accuracy for each player
}

// Cleanup
function cleanup() {
  gameAdapter.cleanup();
}
```

## Key Benefits

1. **Simplified API**: 3-step initialization vs complex manual setup
2. **Built-in Audio Management**: No need to manually handle @pixi/sound
3. **Automatic Game Loop**: No need to manually manage requestAnimationFrame
4. **Type Safety**: Full TypeScript support with proper interfaces
5. **Separation of Concerns**: Game logic separated from rendering
6. **Consistent Timing**: Audio-synchronized timing built-in
7. **Easy Testing**: Game logic can be tested independently

## Migration Steps

1. Install the game-engine package
2. Convert your chart data to `GameplaySong` format
3. Replace `createGame` with `WebGameAdapter`
4. Update your input handlers to use the adapter methods
5. Update your rendering to use the adapter's state getters
6. Remove manual audio and game loop management code 