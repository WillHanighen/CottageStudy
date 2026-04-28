import { absUrl } from '$lib/seo';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = () => {
	const sitemap = absUrl('/sitemap.xml');

	const body = [
		'# CottageStudy — robots policy',
		'User-agent: *',
		// Auth/private surfaces have no business on SERPs.
		'Disallow: /sign-in',
		'Disallow: /sign-in/',
		'Disallow: /dashboard',
		'Disallow: /dashboard/',
		'Disallow: /sets/new',
		'Disallow: /api/',
		// Per-set utility routes (still allowed via the canonical /sets/{id}).
		'Disallow: /sets/*/edit',
		'Disallow: /sets/*/edit/',
		'Disallow: /sets/*/study',
		'Disallow: /sets/*/learn',
		'Disallow: /sets/*/quiz',
		'Disallow: /sets/*/match',
		'Disallow: /sets/*/export',
		// Search-result variants are noindex; no need to crawl them either.
		'Disallow: /explore?*',
		'Allow: /',
		'',
		`Sitemap: ${sitemap}`,
		''
	].join('\n');

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
		}
	});
};
