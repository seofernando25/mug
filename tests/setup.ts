// Shared test setup. Registers mocks for virtual modules that Bun cannot resolve
// on its own, so test files do not each need to repeat them.
import { mock } from 'bun:test';

// SvelteKit compiles `$env/static/*` at build time; under `bun test` the specifier is
// unresolvable. Values match the local development defaults in .env.
mock.module('$env/static/public', () => ({
	PUBLIC_WS_URL: 'ws://localhost:3000'
}));

mock.module('$env/static/private', () => ({}));

console.log('🔧 Test setup loaded');
