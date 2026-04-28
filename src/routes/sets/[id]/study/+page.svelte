<script lang="ts">
	import { onMount } from 'svelte';
	import Seo from '$lib/components/Seo.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let order = $state<number[]>(data.set.cards.map((_, i) => i));
	let idx = $state(0);
	let flipped = $state(false);
	let shuffled = $state(false);
	let showDefFirst = $state(false);

	const total = $derived(order.length);
	const currentCard = $derived(data.set.cards[order[idx]]);
	const progress = $derived(total > 0 ? ((idx + 1) / total) * 100 : 0);

	function next() {
		flipped = false;
		setTimeout(() => {
			idx = (idx + 1) % total;
		}, 80);
	}
	function prev() {
		flipped = false;
		setTimeout(() => {
			idx = (idx - 1 + total) % total;
		}, 80);
	}
	function flip() {
		flipped = !flipped;
	}

	function shuffle() {
		const arr = [...order];
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		order = arr;
		idx = 0;
		flipped = false;
		shuffled = true;
	}
	function reset() {
		order = data.set.cards.map((_, i) => i);
		idx = 0;
		flipped = false;
		shuffled = false;
	}

	onMount(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
			if (e.key === 'ArrowRight') {
				e.preventDefault();
				next();
			} else if (e.key === 'ArrowLeft') {
				e.preventDefault();
				prev();
			} else if (e.key === ' ' || e.key === 'Enter') {
				e.preventDefault();
				flip();
			}
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	});
</script>

<Seo
	title="Flashcards — {data.set.title}"
	titleTemplate={false}
	description="Flip through the deck for {data.set.title} on CottageStudy."
	path="/sets/{data.set.id}/study"
	noindex
/>

<section class="relative py-10 sm:py-14">
	<div class="mx-auto max-w-3xl px-6">
		<!-- Top bar -->
		<div class="mb-6 flex items-center justify-between gap-4">
			<a
				href="/sets/{data.set.id}"
				class="inline-flex items-center gap-1.5 font-mono text-xs tracking-widest text-zinc-500 uppercase transition hover:text-zinc-300"
			>
				&larr; {data.set.title}
			</a>
			<div class="font-mono text-xs tracking-widest text-zinc-500 uppercase">
				{idx + 1} / {total}
			</div>
		</div>

		<!-- Progress -->
		<div class="mb-8 h-1 overflow-hidden rounded-full bg-zinc-800">
			<div
				class="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-[width] duration-300"
				style="width: {progress}%"
			></div>
		</div>

		<!-- Flashcard -->
		<div class="flashcard mb-8 aspect-[4/3] sm:aspect-[16/9]">
			<button
				type="button"
				onclick={flip}
				aria-label="Flip card"
				class="flashcard-inner relative block h-full w-full cursor-pointer select-none {flipped ? 'is-flipped' : ''}"
			>
				<!-- Front -->
				<div
					class="flashcard-face absolute inset-0 grid place-items-center"
				>
					<div
						class="grain relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-zinc-800/70 bg-zinc-900/60 p-8 text-center shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-12"
					>
						<span class="absolute top-5 left-5 font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
							{showDefFirst ? 'Definition' : 'Term'}
						</span>
						<p
							class="font-display text-3xl leading-tight font-medium text-white sm:text-5xl md:text-6xl"
							style="font-variation-settings: 'opsz' 144, 'SOFT' 30;"
						>
							{showDefFirst ? currentCard.definition : currentCard.term}
						</p>
						<span class="absolute right-5 bottom-5 font-mono text-[10px] tracking-widest text-zinc-600 uppercase">
							tap / space &middot; flip
						</span>
					</div>
				</div>
				<!-- Back -->
				<div
					class="flashcard-face flashcard-face--back absolute inset-0 grid place-items-center"
				>
					<div
						class="grain relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-orange-500/30 bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-orange-950/30 p-8 text-center shadow-2xl shadow-orange-500/10 backdrop-blur-xl sm:p-12"
					>
						<span class="absolute top-5 left-5 font-mono text-[10px] tracking-widest text-orange-400 uppercase">
							{showDefFirst ? 'Term' : 'Definition'}
						</span>
						<p class="text-2xl leading-relaxed text-zinc-100 sm:text-3xl">
							{showDefFirst ? currentCard.term : currentCard.definition}
						</p>
					</div>
				</div>
			</button>
		</div>

		<!-- Nav -->
		<div class="mb-6 flex items-center justify-between gap-3">
			<button
				type="button"
				aria-label="Previous card"
				onclick={prev}
				class="grid h-12 w-12 place-items-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:border-orange-500/40 hover:text-white"
			>
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</button>

			<button
				type="button"
				onclick={flip}
				class="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-orange-500/10 transition-colors hover:bg-zinc-200"
			>
				{flipped ? 'Back to term' : 'Reveal'}
			</button>

			<button
				type="button"
				aria-label="Next card"
				onclick={next}
				class="grid h-12 w-12 place-items-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:border-orange-500/40 hover:text-white"
			>
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</button>
		</div>

		<!-- Toolbar -->
		<div class="flex flex-wrap items-center justify-center gap-2 text-xs">
			<button
				type="button"
				onclick={shuffle}
				class="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
			>
				<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M16 3h5v5M4 20l17-17M21 16v5h-5M15 15l6 6M4 4l5 5" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
				{shuffled ? 'Reshuffle' : 'Shuffle'}
			</button>
			{#if shuffled}
				<button
					type="button"
					onclick={reset}
					class="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
				>
					Reset order
				</button>
			{/if}
			<button
				type="button"
				onclick={() => (showDefFirst = !showDefFirst)}
				class="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
			>
				<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M3 12a9 9 0 0118 0M21 12a9 9 0 01-18 0M9 8l-3 4 3 4M15 8l3 4-3 4" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
				{showDefFirst ? 'Term first' : 'Definition first'}
			</button>
			<span class="ml-2 hidden font-mono tracking-wider text-zinc-600 sm:inline">
				space &middot; flip &nbsp;&middot;&nbsp; &larr; / &rarr; &middot; navigate
			</span>
		</div>
	</div>
</section>
