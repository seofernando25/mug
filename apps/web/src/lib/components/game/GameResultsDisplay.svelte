<script lang="ts">
export let score: number;
export let maxCombo: number;
export let songTitle: string;
export let artist: string;
export let difficultyName: string;
</script>

<div class="game-results-display">
    <div class="song-info">
        <h2 class="song-title">{songTitle}</h2>
        <p class="song-artist">{artist}</p>
        <p class="difficulty">Difficulty: {difficultyName}</p>
    </div>

    <div class="results-stats">
        <div class="stat-card">
            <h3>Score</h3>
            <p class="stat-value">{score.toLocaleString()}</p>
        </div>
        <div class="stat-card">
            <h3>Max Combo</h3>
            <p class="stat-value">{maxCombo}</p>
        </div>
    </div>
</div>

<style>
    .game-results-display {
        text-align: center;
    }

    .song-info {
        margin-bottom: 2rem;
    }

    .song-title {
        font-size: 1.8rem;
        margin-bottom: 0.5rem;
        color: #e6e6ff;
    }

    .song-artist {
        font-size: 1.2rem;
        color: #a0a0c0;
        margin-bottom: 0.5rem;
    }

    .difficulty {
        font-size: 1rem;
        color: #d0d0ff;
        font-weight: 500;
    }

    .results-stats {
        display: flex;
        justify-content: center;
        gap: 2rem;
        margin-bottom: 2.5rem;
    }

    .stat-card {
        background: rgba(50, 50, 70, 0.6);
        padding: 1.5rem;
        border-radius: 12px;
        min-width: 150px;
    }

    .stat-card h3 {
        font-size: 1rem;
        color: #b0b0e0;
        margin-bottom: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .stat-value {
        font-size: 2rem;
        font-weight: bold;
        color: #ffd700;
    }
</style>
