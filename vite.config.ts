import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	ssr: {
		// Bun built-in modules must stay external; the bundler should not try to resolve them.
		external: ['bun:sqlite', 'bun:test', 'bun:ffi', 'bun:wrap']
	},
	build: {
		rollupOptions: {
			external: [/^bun:/]
		}
	}
});
