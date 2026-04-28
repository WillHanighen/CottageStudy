<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const set = $derived(data.set);

	let confirmingDelete = $state(false);

	function timeAgo(ts: number): string {
		const diff = Date.now() - ts;
		const m = Math.floor(diff / 60000);
		if (m < 1) return 'just now';
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h ago`;
		const d = Math.floor(h / 24);
		if (d < 30) return `${d}d ago`;
		return new Date(ts).toLocaleDateString();
	}
</script>

<svelte:head>
	<title>{set.title} &mdash; CottageStudy</title>
</svelte:head>

<section class="relative py-12 sm:py-16">
	<div class="mx-auto max-w-5xl px-6">
		<a
			href="/dashboard"
			class="mb-8 inline-flex items-center gap-1.5 font-mono text-xs tracking-widest text-zinc-500 uppercase transition hover:text-zinc-300"
		>
			&larr; Library
		</a>

		<!-- Set header -->
		<div class="mb-12 rise-in">
			<div class="mb-4 flex flex-wrap items-center gap-2 text-xs">
				<span class="rounded-full bg-zinc-800/70 px-2.5 py-0.5 font-mono tracking-wider text-zinc-300 uppercase">
					{set.cards.length} {set.cards.length === 1 ? 'card' : 'cards'}
				</span>
				{#if set.is_public}
					<span class="rounded-full border border-zinc-800 px-2.5 py-0.5 font-mono tracking-wider text-zinc-500 uppercase">
						Public
					</span>
				{/if}
				<span class="text-zinc-600">&middot;</span>
				<span class="text-zinc-500">Updated {timeAgo(set.updated_at)}</span>
			</div>
			<h1 class="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{set.title}</h1>
			{#if set.description}
				<p class="mt-3 max-w-2xl text-lg text-zinc-400">{set.description}</p>
			{/if}
		</div>

		<!-- Study modes -->
		{#if set.cards.length === 0}
			<div class="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 p-10 text-center">
				<p class="text-zinc-400">This set has no cards yet.</p>
				{#if data.isOwner}
					<a
						href="/sets/{set.id}/edit"
						class="mt-4 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
					>
						Add cards
					</a>
				{/if}
			</div>
		{:else}
			<div class="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<a
					href="/sets/{set.id}/study"
					class="group relative overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-6 transition-all hover:-translate-y-1 hover:border-orange-500/40 hover:bg-zinc-900/80"
				>
					<div class="mb-5 grid h-10 w-10 place-items-center rounded-lg border border-zinc-800 bg-zinc-950 text-orange-500">
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<rect x="3" y="6" width="14" height="12" rx="2" />
							<rect x="7" y="3" width="14" height="12" rx="2" stroke-opacity="0.5" />
						</svg>
					</div>
					<h3 class="text-lg font-semibold text-white">Flashcards</h3>
					<p class="mt-1 text-sm text-zinc-400">Flip through the deck.</p>
					<span
						class="absolute right-5 bottom-5 grid h-7 w-7 place-items-center rounded-full border border-zinc-700 text-zinc-400 transition-all group-hover:border-orange-500 group-hover:text-orange-500"
					>
						<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M5 12h14M12 5l7 7-7 7" />
						</svg>
					</span>
				</a>

				<a
					href="/sets/{set.id}/learn"
					class="group relative overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-6 transition-all hover:-translate-y-1 hover:border-orange-500/40 hover:bg-zinc-900/80"
				>
					<div class="mb-5 grid h-10 w-10 place-items-center rounded-lg border border-zinc-800 bg-zinc-950 text-orange-500">
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M12 3l8 4-8 4-8-4 8-4z" stroke-linejoin="round" />
							<path d="M4 11l8 4 8-4M4 15l8 4 8-4" stroke-linejoin="round" />
						</svg>
					</div>
					<h3 class="text-lg font-semibold text-white">Learn</h3>
					<p class="mt-1 text-sm text-zinc-400">Quiz yourself, round by round.</p>
					<span
						class="absolute right-5 bottom-5 grid h-7 w-7 place-items-center rounded-full border border-zinc-700 text-zinc-400 transition-all group-hover:border-orange-500 group-hover:text-orange-500"
					>
						<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M5 12h14M12 5l7 7-7 7" />
						</svg>
					</span>
				</a>

				<a
					href="/sets/{set.id}/quiz"
					class="group relative overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-6 transition-all hover:-translate-y-1 hover:border-orange-500/40 hover:bg-zinc-900/80"
				>
					<div class="mb-5 grid h-10 w-10 place-items-center rounded-lg border border-zinc-800 bg-zinc-950 text-orange-500">
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M9 4h7a2 2 0 012 2v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2h1" stroke-linecap="round" stroke-linejoin="round" />
							<rect x="9" y="2.5" width="6" height="3" rx="0.8" />
							<path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
							<path d="M9 17h6" stroke-linecap="round" />
						</svg>
					</div>
					<h3 class="text-lg font-semibold text-white">Quiz</h3>
					<p class="mt-1 text-sm text-zinc-400">Sit a graded test, Quizlet style.</p>
					<span
						class="absolute right-5 bottom-5 grid h-7 w-7 place-items-center rounded-full border border-zinc-700 text-zinc-400 transition-all group-hover:border-orange-500 group-hover:text-orange-500"
					>
						<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M5 12h14M12 5l7 7-7 7" />
						</svg>
					</span>
				</a>

				<a
					href="/sets/{set.id}/match"
					class="group relative overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-6 transition-all hover:-translate-y-1 hover:border-orange-500/40 hover:bg-zinc-900/80"
					class:pointer-events-none={set.cards.length < 3}
					class:opacity-60={set.cards.length < 3}
				>
					<div class="mb-5 grid h-10 w-10 place-items-center rounded-lg border border-zinc-800 bg-zinc-950 text-orange-500">
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<rect x="3" y="3" width="8" height="8" rx="1.5" />
							<rect x="13" y="3" width="8" height="8" rx="1.5" />
							<rect x="3" y="13" width="8" height="8" rx="1.5" />
							<rect x="13" y="13" width="8" height="8" rx="1.5" />
						</svg>
					</div>
					<h3 class="text-lg font-semibold text-white">Match</h3>
					<p class="mt-1 text-sm text-zinc-400">
						{set.cards.length < 3 ? 'Needs 3+ cards to play.' : 'Race the clock to pair them all.'}
					</p>
					<span
						class="absolute right-5 bottom-5 grid h-7 w-7 place-items-center rounded-full border border-zinc-700 text-zinc-400 transition-all group-hover:border-orange-500 group-hover:text-orange-500"
					>
						<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M5 12h14M12 5l7 7-7 7" />
						</svg>
					</span>
				</a>
			</div>
		{/if}

		<!-- Set actions -->
		{#if set.cards.length > 0 || data.isOwner}
			<div class="mb-10 flex flex-wrap items-center gap-3">
				{#if data.isOwner}
					<a
						href="/sets/{set.id}/edit"
						class="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
					>
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
							<path d="M11 4H4v16h16v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
						Edit set
					</a>
				{/if}
				{#if set.cards.length > 0}
					<a
						href="/sets/{set.id}/export"
						download
						class="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-orange-500/40 hover:bg-zinc-800 hover:text-orange-300"
					>
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
							<path d="M12 4v12" stroke-linecap="round" />
							<path d="M7 11l5 5 5-5" stroke-linecap="round" stroke-linejoin="round" />
							<path d="M5 20h14" stroke-linecap="round" />
						</svg>
						Export JSON
					</a>
				{/if}
				{#if data.isOwner}
					{#if !confirmingDelete}
						<button
							type="button"
							onclick={() => (confirmingDelete = true)}
							class="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
						>
							Delete set
						</button>
					{:else}
						<form method="POST" action="?/delete" use:enhance class="flex items-center gap-2">
							<span class="text-sm text-red-300">Sure?</span>
							<button
								type="submit"
								class="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-600"
							>
								Yes, delete
							</button>
							<button
								type="button"
								onclick={() => (confirmingDelete = false)}
								class="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
							>
								Cancel
							</button>
						</form>
					{/if}
				{/if}
			</div>
		{/if}

		<!-- Card list -->
		{#if set.cards.length > 0}
			<div>
				<h2 class="mb-4 font-mono text-xs tracking-widest text-orange-500 uppercase">/ Cards</h2>
				<ol class="space-y-2.5">
					{#each set.cards as card, i (card.id)}
						<li
							class="grid grid-cols-1 gap-0 overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/30 transition-colors hover:border-zinc-700/70 md:grid-cols-[56px_1fr_1px_1fr]"
						>
							<div
								class="flex items-center justify-center border-b border-zinc-800/60 bg-zinc-950/40 py-3 font-mono text-xs tracking-widest text-zinc-500 md:border-r md:border-b-0"
							>
								{String(i + 1).padStart(2, '0')}
							</div>
							<div class="px-5 py-4 text-zinc-100">
								<p class="text-base wrap-break-word">{card.term}</p>
							</div>
							<div class="hidden md:block"><div class="h-full w-px bg-zinc-800/70"></div></div>
							<div class="border-t border-zinc-800/60 px-5 py-4 text-zinc-400 md:border-t-0">
								<p class="text-base wrap-break-word">{card.definition}</p>
							</div>
						</li>
					{/each}
				</ol>
			</div>
		{/if}
	</div>
</section>
