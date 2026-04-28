import { SITE_NAME, SITE_DESCRIPTION } from '$lib/seo';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = () => {
	const manifest = {
		name: SITE_NAME,
		short_name: SITE_NAME,
		description: SITE_DESCRIPTION,
		start_url: '/',
		scope: '/',
		display: 'standalone',
		orientation: 'portrait',
		background_color: '#09090b',
		theme_color: '#09090b',
		icons: [
			{
				src: '/favicon.svg',
				type: 'image/svg+xml',
				sizes: 'any',
				purpose: 'any'
			},
			{
				src: '/favicon.svg',
				type: 'image/svg+xml',
				sizes: 'any',
				purpose: 'maskable'
			}
		],
		categories: ['education', 'productivity']
	};

	return new Response(JSON.stringify(manifest, null, 2), {
		headers: {
			'Content-Type': 'application/manifest+json; charset=utf-8',
			'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800'
		}
	});
};
