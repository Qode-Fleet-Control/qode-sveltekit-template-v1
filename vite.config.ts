import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// The fleet serves this app at its own hostname and passes it in as FLEET_APP_HOST.
// Vite answers any other Host with "Blocked request. This host is not allowed", so
// trust exactly that one; with no fleet hostname (another host, a cluster ingress)
// there is no way to know it up front, so accept any.
const allowedHosts = process.env.FLEET_APP_HOST ? [process.env.FLEET_APP_HOST] : true;

export default defineConfig({
	server: { allowedHosts },
	preview: { allowedHosts },
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-node: the fleet runs `node build/index.js`. adapter-auto
			// cannot detect this host and fails the build.
			adapter: adapter()
		})
	]
});
