<script lang="ts">
	import { page } from '$app/state';
	import {
		SITE_NAME,
		SITE_DESCRIPTION,
		SITE_KEYWORDS,
		TWITTER_HANDLE,
		absUrl,
		resolveImage,
		resolveTitle,
		type SeoProps
	} from '$lib/seo';

	type Props = SeoProps & {
		/** Optional JSON-LD object to embed as application/ld+json. */
		jsonLd?: Record<string, unknown> | Record<string, unknown>[];
	};

	let {
		title,
		titleTemplate = true,
		description = SITE_DESCRIPTION,
		path,
		image,
		type = 'website',
		noindex = false,
		keywords,
		modifiedTime,
		publishedTime,
		jsonLd
	}: Props = $props();

	const fullTitle = $derived(resolveTitle(title, titleTemplate));
	// Default to the current pathname so every page gets a correct canonical
	// without each callsite repeating it.
	const canonical = $derived(absUrl(path ?? page.url.pathname));
	const ogImage = $derived(resolveImage(image));
	const robots = $derived(noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
	const kw = $derived((keywords && keywords.length ? keywords : SITE_KEYWORDS).join(', '));

	// Build the entire JSON-LD island as a single HTML string. Every left-angle
	// bracket inside user data is escaped as \u003c so a stray closing tag in
	// the payload cannot break out of the script element. JSON parsers decode
	// the escape back to its original character, so semantics are preserved.
	const SCRIPT_OPEN = '<' + 'script type="application/ld+json">';
	const SCRIPT_CLOSE = '<' + '/script>';
	const ldHtml = $derived(
		jsonLd
			? SCRIPT_OPEN + JSON.stringify(jsonLd).replace(/</g, '\\u003c') + SCRIPT_CLOSE
			: null
	);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<meta name="keywords" content={kw} />
	<meta name="robots" content={robots} />
	<meta name="googlebot" content={robots} />

	<link rel="canonical" href={canonical} />

	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:type" content={type} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={fullTitle} />
	<meta property="og:locale" content="en_US" />

	{#if publishedTime}<meta property="article:published_time" content={publishedTime} />{/if}
	{#if modifiedTime}<meta property="article:modified_time" content={modifiedTime} />{/if}

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />
	<meta name="twitter:image:alt" content={fullTitle} />
	{#if TWITTER_HANDLE}<meta name="twitter:site" content={TWITTER_HANDLE} />{/if}
	{#if TWITTER_HANDLE}<meta name="twitter:creator" content={TWITTER_HANDLE} />{/if}

	{#if ldHtml}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html ldHtml}
	{/if}
</svelte:head>
