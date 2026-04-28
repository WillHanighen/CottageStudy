<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Explore &mdash; CottageStudy</title>
</svelte:head>

<section class="relative py-16 sm:py-24">
	<div class="mx-auto max-w-6xl px-6">
		<div class="mb-12 max-w-2xl rise-in">
			<p class="mb-3 font-mono text-xs tracking-widest text-orange-500 uppercase">/ Explore</p>
			<h1 class="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
				Public sets from the community.
			</h1>
			<p class="mt-3 text-zinc-400">
				Sets people have shared with the world. Click in, study away.
			</p>
		</div>

		{#if data.sets.length === 0}
			<div
				class="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 p-16 text-center"
			>
				<p class="text-zinc-500">No public sets yet. Be the first &mdash; mark a set as public when you create it.</p>
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
