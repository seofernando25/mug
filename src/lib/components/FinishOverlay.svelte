<div class="overlay-container finish-overlay">
	<h1 class="finish-text">FINISH!</h1>
</div>

<style>
	.overlay-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: rgba(0, 0, 0, 0.7);
		z-index: 100; /* Ensure it's above the game canvas */
		color: white;
	}

	.finish-text {
		font-size: 8rem;
		font-weight: bold;
		color: #ffd700; /* Gold color */
		text-shadow:
			0 0 10px #ffd700,
			0 0 20px #ff0000;
		animation: fadeInZoom 1s ease-out;
	}

	@keyframes fadeInZoom {
		from {
			opacity: 0;
			transform: scale(0.5);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
