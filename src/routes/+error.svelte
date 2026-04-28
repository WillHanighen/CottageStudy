<script lang="ts">
	import { page } from '$app/state';
	import Seo from '$lib/components/Seo.svelte';

	const status = $derived(page.status);
	const message = $derived(page.error?.message ?? '');

	const title = $derived.by(() => {
		if (status === 404) return 'Page not found';
		if (status === 401 || status === 403) return 'You can’t see this';
		if (status >= 500) return 'Something went wrong';
		return 'Something went wrong';
	});

	const blurb = $derived.by(() => {
		if (status === 404)
			return 'The page you’re looking for has been moved, renamed, or never existed in the first place.';
		if (status === 401 || status === 403)
			return 'You don’t have access to this page. Try signing in, or head back home.';
		if (status >= 500)
			return 'Our end hiccupped. Give it a moment and try again — or head back to safer ground.';
		return 'An unexpected error occurred. (Status: {status}) You can try reloading or head back home.';
	});
</script>

<Seo title="{status} — {title}" titleTemplate={false} description={blurb} noindex />

<section class="relative overflow-hidden py-24 sm:py-32 lg:py-40">
	<div class="relative mx-auto max-w-3xl px-6">
		<div class="rise-in text-center">
			<div
				class="mb-8 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 font-mono text-xs font-medium text-zinc-400 backdrop-blur-md"
			>
				<span class="h-1.5 w-1.5 rounded-full bg-orange-500"></span>
				Error {status}
			</div>

			<h1
				class="mb-6 text-5xl leading-[1.05] font-semibold tracking-tight text-white sm:text-6xl"
			>
				{title}
				<span
					class="font-display block text-transparent italic bg-clip-text bg-linear-to-r from-orange-400 via-amber-400 to-orange-500"
					style="font-variation-settings: 'opsz' 144, 'SOFT' 100;"
				>
					{status}
				</span>
			</h1>

			<p class="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-zinc-400">
				{blurb}
			</p>

			{#if message && message.toLowerCase() !== 'internal error' && message.toLowerCase() !== 'not found'}
				<div
					class="mx-auto mb-10 max-w-xl rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-4 text-left backdrop-blur-sm"
				>
					<p class="mb-1 font-mono text-[10px] tracking-widest text-orange-500 uppercase">
						/ Details
					</p>
					<p class="font-mono text-sm wrap-break-word text-zinc-300">{message}</p>
				</div>
			{/if}

			<div class="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
				<a
					href="/"
					class="rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-orange-500/10 transition-all hover:bg-zinc-200 hover:shadow-orange-500/20"
				>
					Back home &rarr;
				</a>
				<button
					type="button"
					onclick={() => location.reload()}
					class="rounded-xl border border-zinc-800 bg-zinc-900/50 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:border-zinc-700 hover:bg-zinc-900"
				>
					Try again
				</button>
			</div>
		</div>
	</div>
</section>
