import { env as publicEnv } from '$env/dynamic/public';

export const SITE_NAME = 'CottageStudy';
export const SITE_TAGLINE = 'Flashcards built for focus.';
export const SITE_DESCRIPTION =
	"Build flashcard sets in seconds and practice them four ways — flashcards, learn, quiz, match. CottageStudy is a calm, fast, ad-free study tool from Cottage Industries.";

export const SITE_KEYWORDS = [
	'flashcards',
	'study app',
	'spaced repetition',
	'quizlet alternative',
	'free flashcards',
	'learn vocabulary',
	'study tool',
	'CottageStudy',
	'Cottage Industries'
];

export const TWITTER_HANDLE = '@cottagextries';

const DEFAULT_ORIGIN = 'https://study.cottageindustries.xyz';

/**
 * Public-baked site origin. Falls back to the production domain so meta
 * generated during prerender / build still resolves to absolute URLs.
 */
export const SITE_URL: string = (() => {
	const candidate = publicEnv.PUBLIC_SITE_URL || DEFAULT_ORIGIN;
	return candidate.replace(/\/$/, '');
})();

/** Build a fully-qualified canonical URL for the given pathname or URL. */
export function absUrl(pathOrUrl: string | URL, base: string = SITE_URL): string {
	try {
		const u =
			pathOrUrl instanceof URL
				? new URL(pathOrUrl.pathname + pathOrUrl.search, base)
				: new URL(pathOrUrl, base);
		// Strip trailing slash on non-root canonicals for tidier URLs.
		const path = u.pathname.length > 1 ? u.pathname.replace(/\/$/, '') : u.pathname;
		return `${u.origin}${path}${u.search}`;
	} catch {
		return base;
	}
}

/** Default Open Graph image (absolute). Override per-page when relevant. */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og.svg`;

export type SeoProps = {
	/** Page-specific title segment (e.g. "Explore"). Combined with the site name. */
	title?: string;
	/** Whether to suffix the title with the site name. Default true. */
	titleTemplate?: boolean;
	/** Plain-language summary, ~150 chars. */
	description?: string;
	/** Pathname (e.g. /explore) or full URL. Defaults to site root. */
	path?: string;
	/** Absolute or root-relative image URL for og:image / twitter:image. */
	image?: string;
	/** og:type. Default "website". Use "article" for set detail pages. */
	type?: 'website' | 'article' | 'profile';
	/** When true, instruct crawlers not to index/follow this page. */
	noindex?: boolean;
	/** Optional comma-separated keyword list. */
	keywords?: string[];
	/** ISO timestamp for article:modified_time. */
	modifiedTime?: string;
	/** ISO timestamp for article:published_time. */
	publishedTime?: string;
	/** When true (default), force `index, follow` even with noindex absent. */
	index?: boolean;
};

export function resolveTitle(title?: string, withTemplate = true): string {
	if (!title) return `${SITE_NAME} — ${SITE_TAGLINE}`;
	if (!withTemplate) return title;
	return `${title} · ${SITE_NAME}`;
}

export function resolveImage(image?: string): string {
	if (!image) return DEFAULT_OG_IMAGE;
	if (/^https?:\/\//i.test(image)) return image;
	return `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`;
}
