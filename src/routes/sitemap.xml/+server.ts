import { queries } from '$lib/server/db';
import { absUrl } from '$lib/seo';
import type { RequestHandler } from './$types';

type Entry = {
	loc: string;
	lastmod?: string;
	changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
	priority?: number;
};

const STATIC_ENTRIES: Entry[] = [
	{ loc: '/', changefreq: 'weekly', priority: 1.0 },
	{ loc: '/explore', changefreq: 'daily', priority: 0.8 }
];

function escapeXml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function urlEntry(e: Entry): string {
	const parts: string[] = [`  <url>`, `    <loc>${escapeXml(absUrl(e.loc))}</loc>`];
	if (e.lastmod) parts.push(`    <lastmod>${e.lastmod}</lastmod>`);
	if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
	if (typeof e.priority === 'number') parts.push(`    <priority>${e.priority.toFixed(1)}</priority>`);
	parts.push(`  </url>`);
	return parts.join('\n');
}

export const prerender = false;

export const GET: RequestHandler = () => {
	const sets = queries.listPublicSetsForSitemap();

	const entries: Entry[] = [
		...STATIC_ENTRIES,
		...sets.map<Entry>((s) => ({
			loc: `/sets/${s.id}`,
			lastmod: new Date(s.updated_at).toISOString(),
			changefreq: 'weekly',
			priority: 0.6
		}))
	];

	const body =
		`<?xml version="1.0" encoding="UTF-8"?>\n` +
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
		entries.map(urlEntry).join('\n') +
		`\n</urlset>\n`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			// Refresh hourly at the edge; sitemap freshness doesn't need to be instant.
			'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
			'X-Robots-Tag': 'noindex'
		}
	});
};
