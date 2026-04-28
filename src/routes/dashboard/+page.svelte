<script lang="ts">
	import { useClerkSafe } from '$lib/clerk';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const ctx = useClerkSafe();
	const firstName = $derived(ctx.user?.firstName ?? null);

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
	<title>Library &mdash; CottageStudy</title>
</svelte:head>

<section class="relative py-16 sm:py-24">
	<div class="mx-auto max-w-6xl px-6">
		<!-- Header -->
		<div class="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
			<div class="rise-in">
				<p class="mb-3 font-mono text-xs tracking-widest text-orange-500 uppercase">/ Your library</p>
				<h1 class="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
					{#if firstName}
						Hello, <span class="font-display italic" style="font-variation-settings: 'opsz' 144;">
							{firstName}.
						</span>
					{:else}
						Your study sets.
					{/if}
				</h1>
				<p class="mt-3 text-zinc-400">
					{#if data.sets.length > 0}
						{data.sets.length}
						{data.sets.length === 1 ? 'set' : 'sets'} ready to study.
					{:else}
						Make your first set to start learning.
					{/if}
				</p>
			</div>
			<a
				href="/sets/new"
				class="rise-in inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition-all hover:bg-orange-600"
				style="animation-delay: 100ms;"
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 5v14M5 12h14" stroke-linecap="round" />
				</svg>
				New study set
			</a>
		</div>

		<!-- Sets grid -->
		{#if data.sets.length === 0}
			<div
				class="grain rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 p-16 text-center"
			>
				<div
					class="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-zinc-800 bg-zinc-900"
				>
					<svg class="h-6 w-6 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<rect x="3" y="6" width="14" height="12" rx="2" />
						<rect x="7" y="3" width="14" height="12" rx="2" />
					</svg>
				</div>
				<h3 class="mb-2 text-lg font-semibold text-white">No sets yet</h3>
				<p class="mb-6 text-sm text-zinc-500">
					A study set is a deck of flashcards. Build one in under a minute.
				</p>
				<a
					href="/sets/new"
					class="inline-flex rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
				>
					Create your first set &rarr;
				</a>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.sets as set, i (set.id)}
					<a
						href="/sets/{set.id}"
						class="group relative overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/40 p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-orange-500/40 hover:bg-zinc-900/70"
						style="animation-delay: {i * 50}ms"
					>
						<div class="mb-5 flex items-center justify-between">
							<span
								class="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/70 px-2.5 py-0.5 font-mono text-[10px] tracking-wider text-zinc-300 uppercase"
							>
								<span class="h-1 w-1 rounded-full bg-orange-500"></span>
								{set.card_count}
								{set.card_count === 1 ? 'card' : 'cards'}
							</span>
							{#if set.is_public}
								<span class="font-mono text-[10px] tracking-wider text-zinc-500 uppercase">Public</span>
							{/if}
						</div>
						<h3
							class="mb-2 line-clamp-2 text-xl font-semibold text-white transition-colors group-hover:text-orange-400"
						>
							{set.title}
						</h3>
						<p class="mb-6 line-clamp-2 min-h-[2.5rem] text-sm text-zinc-400">
							{set.description || 'No description.'}
						</p>
						<div class="flex items-center justify-between border-t border-zinc-800/70 pt-4">
							<span class="text-xs text-zinc-500">Updated {timeAgo(set.updated_at)}</span>
							<span
								class="grid h-7 w-7 place-items-center rounded-full border border-zinc-700 text-zinc-400 transition-all group-hover:border-orange-500 group-hover:text-orange-500"
							>
								<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M5 12h14M12 5l7 7-7 7" />
								</svg>
							</span>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</section>
