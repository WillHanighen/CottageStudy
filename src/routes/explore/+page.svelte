<script lang="ts">
	import type { PageData } from './$types';
	import Seo from '$lib/components/Seo.svelte';

	let { data }: { data: PageData } = $props();

	const seoTitle = $derived(data.q ? `“${data.q}” — Explore public sets` : 'Explore public sets');
	const seoDesc = $derived(
		data.q
			? `Public flashcard sets matching “${data.q}” on CottageStudy. Click in and study.`
			: 'Browse public flashcard sets shared by the CottageStudy community. Free to study, no account needed.'
	);
	// Don't index search-result variants — only the canonical /explore index.
	const noindex = $derived(Boolean(data.q));
</script>

<Seo
	title={seoTitle}
	description={seoDesc}
	path="/explore"
	{noindex}
	keywords={[
		'public flashcards',
		'shared study sets',
		'free flashcards online',
		'flashcard library',
		'CottageStudy explore'
	]}
/>

<section class="relative py-16 sm:py-24">
	<div class="mx-auto max-w-6xl px-6">
		<div class="mb-10 max-w-2xl rise-in">
			<p class="mb-3 font-mono text-xs tracking-widest text-orange-500 uppercase">/ Explore</p>
			<h1 class="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
				Public sets from the community.
			</h1>
			<p class="mt-3 text-zinc-400">
				Sets people have shared with the world. Click in, study away.
			</p>
		</div>

		<form
			method="GET"
			action="/explore"
			class="mb-10 flex flex-col gap-3 sm:flex-row sm:items-center"
			role="search"
		>
			<label for="explore-search" class="sr-only">Search public sets</label>
			<div class="relative flex-1">
				<svg
					aria-hidden="true"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					class="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-zinc-500"
				>
					<circle cx="11" cy="11" r="7" />
					<path d="M20 20l-3.5-3.5" stroke-linecap="round" />
				</svg>
				<input
					id="explore-search"
					type="search"
					name="q"
					value={data.q}
					placeholder="Search by title or description&hellip;"
					autocomplete="off"
					class="block w-full rounded-xl border border-zinc-800 bg-zinc-950/60 py-3 pr-4 pl-11 text-sm text-white placeholder:text-zinc-600 transition-colors focus:border-orange-500 focus:outline-none"
				/>
			</div>
			<div class="flex items-center gap-2">
				<button
					type="submit"
					class="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
				>
					Search
				</button>
				{#if data.q}
					<a
						href="/explore"
						class="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
					>
						Reset
					</a>
				{/if}
			</div>
		</form>

		{#if data.q}
			<p class="mb-6 font-mono text-xs tracking-widest text-zinc-500 uppercase">
				{data.sets.length}
				{data.sets.length === 1 ? 'result' : 'results'} for
				<span class="text-orange-400">&ldquo;{data.q}&rdquo;</span>
			</p>
		{/if}

		{#if data.sets.length === 0}
			<div
				class="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 p-16 text-center"
			>
				{#if data.q}
					<p class="text-zinc-500">
						No public sets match &ldquo;{data.q}&rdquo;. Try a different word, or
						<a href="/explore" class="text-orange-400 hover:underline">clear the search</a>.
					</p>
				{:else}
					<p class="text-zinc-500">
						No public sets yet. Be the first &mdash; mark a set as public when you create it.
					</p>
				{/if}
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.sets as set (set.id)}
					<a
						href="/sets/{set.id}"
						class="group relative overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/40 p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-orange-500/40 hover:bg-zinc-900/70"
					>
						<div class="mb-4 flex items-center justify-between text-xs">
							<span
								class="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/70 px-2.5 py-0.5 font-mono tracking-wider text-zinc-300 uppercase"
							>
								<span class="h-1 w-1 rounded-full bg-orange-500"></span>
								{set.card_count} cards
							</span>
						</div>
						<h3
							class="mb-2 line-clamp-2 text-xl font-semibold text-white transition-colors group-hover:text-orange-400"
						>
							{set.title}
						</h3>
						<p class="line-clamp-3 text-sm text-zinc-400">
							{set.description || 'No description.'}
						</p>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</section>
