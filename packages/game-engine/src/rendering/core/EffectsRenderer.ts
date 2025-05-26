import * as PIXI from 'pixi.js';

// Example: Simple particle data structure
interface Particle {
	sprite: PIXI.Sprite | PIXI.Graphics; // Could be a sprite or a graphic
	vx: number;
	vy: number;
	alphaDecay: number;
	scaleDecay?: number;
	life: number; // Time in frames or ms
}

export interface HitEffectConfig {
	texture?: PIXI.Texture; // Optional texture for particles
	color?: number;         // Color if using graphics
	particleCount?: number;
	particleSize?: number;
	particleLife?: number;    // ms
	particleSpeed?: number;
	position: { x: number; y: number };
	// Add more specific effect parameters as needed
}

export class EffectsRenderer {
	public container: PIXI.Container;
	private particles: Particle[] = [];
	private ticker: PIXI.Ticker;

	constructor() {
		this.container = new PIXI.Container();
		this.ticker = new PIXI.Ticker();
		this.ticker.add(this._updateParticles.bind(this));
		this.ticker.start();
	}

	// Example: Spawn a simple burst of particles
	public spawnHitEffect(config: HitEffectConfig): void {
		const count = config.particleCount || 20;
		const life = config.particleLife || 500; // ms
		const speed = config.particleSpeed || 2;
		const size = config.particleSize || 5;

		for (let i = 0; i < count; i++) {
			let particleSprite: PIXI.Sprite | PIXI.Graphics;
			if (config.texture) {
				particleSprite = new PIXI.Sprite(config.texture);
				particleSprite.anchor.set(0.5);
			} else {
				particleSprite = new PIXI.Graphics();
				(particleSprite as PIXI.Graphics).beginFill(config.color || 0xffffff);
				(particleSprite as PIXI.Graphics).drawCircle(0, 0, size / 2);
				(particleSprite as PIXI.Graphics).endFill();
			}

			particleSprite.x = config.position.x;
			particleSprite.y = config.position.y;
			particleSprite.scale.set(1);
			particleSprite.alpha = 1;

			const angle = Math.random() * Math.PI * 2;
			const particle: Particle = {
				sprite: particleSprite,
				vx: Math.cos(angle) * speed * (Math.random() * 0.5 + 0.5), // Add some randomness to speed
				vy: Math.sin(angle) * speed * (Math.random() * 0.5 + 0.5),
				alphaDecay: 1 / (life / this.ticker.deltaMS), // Decay over life in terms of frames
				scaleDecay: config.texture ? 0.5 / (life / this.ticker.deltaMS) : undefined, // Only scale decay for sprites for this example
				life: life / this.ticker.deltaMS, // Convert life to frames
			};
			this.particles.push(particle);
			this.container.addChild(particle.sprite);
		}
	}

	private _updateParticles(): void {
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i]!;
			p.life -= 1; // Decrement by 1 frame

			if (p.life <= 0) {
				p.sprite.destroy();
				this.particles.splice(i, 1);
			} else {
				p.sprite.x += p.vx;
				p.sprite.y += p.vy;
				p.sprite.alpha -= p.alphaDecay;
				if (p.scaleDecay && p.sprite instanceof PIXI.Sprite) {
					p.sprite.scale.x -= p.scaleDecay;
					p.sprite.scale.y -= p.scaleDecay;
					if (p.sprite.scale.x < 0) p.sprite.scale.set(0);
				}
			}
		}
	}

	public setVisibility(visible: boolean): void {
		this.container.visible = visible;
	}

	public destroy(): void {
		this.ticker.stop();
		this.ticker.destroy();
		this.container.destroy({ children: true, texture: true });
		this.particles = [];
	}
} 