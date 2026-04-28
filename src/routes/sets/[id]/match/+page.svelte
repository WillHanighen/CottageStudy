<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Seo from '$lib/components/Seo.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Tile = {
		key: string; // unique identifier per tile
		pairId: string; // shared by the two paired tiles
		text: string;
		kind: 'term' | 'definition';
	};

	// svelte-ignore state_referenced_locally
	const ROUND_SIZE = Math.min(6, data.set.cards.length);

	function shuffle<T>(arr: T[]): T[] {
		const a = arr.slice();
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	let tiles = $state<Tile[]>([]);
	let matched = $state<Set<string>>(new Set());
	let wrongPair = $state<[string, string] | null>(null);
	let selected = $state<string | null>(null);
	let elapsed = $state(0);
	let interval: ReturnType<typeof setInterval> | null = null;
	let started = $state(false);
	let bestTime = $state<number | null>(null);

	function buildBoard() {
		const picked = shuffle(data.set.cards).slice(0, ROUND_SIZE);
		const list: Tile[] = [];
		for (const c of picked) {
			list.push({ key: `${c.id}::t`, pairId: c.id, text: c.term, kind: 'term' });
			list.push({ key: `${c.id}::d`, pairId: c.id, text: c.definition, kind: 'definition' });
		}
		tiles = shuffle(list);
		matched = new Set();
		selected = null;
		wrongPair = null;
		elapsed = 0;
		started = false;
		if (interval) {
			clearInterval(interval);
			interval = null;
		}
	}

	function startTimer() {
		if (interval) return;
		started = true;
		const begin = Date.now();
		interval = setInterval(() => {
			elapsed = (Date.now() - begin) / 1000;
		}, 50);
	}

	function stopTimer() {
		if (interval) {
			clearInterval(interval);
			interval = null;
		}
	}

	function handleSelect(tile: Tile) {
		if (matched.has(tile.pairId)) return;
		if (wrongPair) return;
		if (!started) startTimer();

		if (selected === null) {
			selected = tile.key;
			return;
		}
		if (selected === tile.key) {
			selected = null;
			return;
		}

		const other = tiles.find((t) => t.key === selected);
		if (!other) {
			selected = tile.key;
			return;
		}

		if (other.pairId === tile.pairId && other.kind !== tile.kind) {
			matched = new Set([...matched, tile.pairId]);
			selected = null;
		} else {
			wrongPair = [other.key, tile.key];
			setTimeout(() => {
				wrongPair = null;
				selected = null;
			}, 600);
		}
	}

	$effect(() => {
		if (matched.size === ROUND_SIZE && started) {
			stopTimer();
			const best = Number(localStorage.getItem(`match-best-${data.set.id}`) ?? 0);
			if (!best || elapsed < best) {
				localStorage.setItem(`match-best-${data.set.id}`, String(elapsed));
				bestTime = elapsed;
			} else {
				bestTime = best;
			}
		}
	});

	onMount(() => {
		bestTime = Number(localStorage.getItem(`match-best-${data.set.id}`) || 0) || null;
		buildBoard();
	});

	onDestroy(() => {
		stopTimer();
	});

	const finished = $derived(matched.size === ROUND_SIZE && started);

	function fmtTime(s: number) {
		const mm = Math.floor(s / 60);
		const ss = (s - mm * 60).toFixed(1);
		return `${mm}:${ss.padStart(4, '0')}`;
	}
</script>

<Seo
	title="Match — {data.set.title}"
	titleTemplate={false}
	description="Race the clock to pair every term with its definition for {data.set.title}."
	path="/sets/{data.set.id}/match"
	noindex
/>

<section class="relative py-10 sm:py-14">
	<div class="mx-auto max-w-5xl px-6">
		<div class="mb-6 flex items-center justify-between gap-4">
			<a
				href="/sets/{data.set.id}"
				class="inline-flex items-center gap-1.5 font-mono text-xs tracking-widest text-zinc-500 uppercase transition hover:text-zinc-300"
			>
				&larr; {data.set.title}
			</a>
			<div class="flex items-center gap-4 font-mono text-xs tracking-widest uppercase">
				<span class="text-zinc-500">
					{matched.size} / {ROUND_SIZE} pairs
				</span>
				<span class="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-orange-400 tabular-nums">
					{fmtTime(elapsed)}
				</span>
			</div>
		</div>

		{#if finished}
			<div
				class="grain mb-6 rounded-3xl border border-orange-500/30 bg-gradient-to-br from-zinc-900/80 to-orange-950/20 p-10 text-center backdrop-blur-xl"
			>
				<p class="mb-3 font-mono text-xs tracking-widest text-orange-400 uppercase">All matched</p>
				<p class="font-display text-5xl font-medium tabular-nums text-white sm:text-6xl">
					{fmtTime(elapsed)}
				</p>
				{#if bestTime !== null}
					<p class="mt-3 text-sm text-zinc-400">
						Best for this set: <span class="text-zinc-200 tabular-nums">{fmtTime(bestTime)}</span>
					</p>
				{/if}
				<div class="mt-7 flex items-center justify-center gap-3">
					<button
						type="button"
						onclick={buildBoard}
						class="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600"
					>
						Play again
					</button>
					<a
						href="/sets/{data.set.id}"
						class="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-900"
					>
						Back to set
					</a>
				</div>
			</div>
		{/if}

		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
			{#each tiles as tile (tile.key)}
				{@const isMatched = matched.has(tile.pairId)}
				{@const isSelected = selected === tile.key}
				{@const isWrong = wrongPair?.includes(tile.key) ?? false}
				<button
					type="button"
					disabled={isMatched}
					onclick={() => handleSelect(tile)}
					class="grain group relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border p-4 text-center transition-all duration-300
						{isMatched
						? 'border-emerald-500/30 bg-emerald-500/5 opacity-30 scale-95'
						: isWrong
							? 'border-red-500/60 bg-red-500/10 animate-pulse'
							: isSelected
								? 'border-orange-500/60 bg-orange-500/10 scale-[1.03] shadow-lg shadow-orange-500/20'
								: 'border-zinc-800/70 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900/80'}"
				>
					<span
						class="absolute top-2 left-2.5 font-mono text-[9px] tracking-widest uppercase
							{isMatched ? 'text-emerald-500/70' : tile.kind === 'term' ? 'text-orange-500/80' : 'text-zinc-500'}"
					>
						{tile.kind}
					</span>
					<p
						class="text-sm leading-snug text-zinc-100 sm:text-base
							{tile.kind === 'term' ? 'font-display font-medium' : 'font-sans'}"
						style={tile.kind === 'term' ? "font-variation-settings: 'opsz' 144, 'SOFT' 30;" : ''}
					>
						{tile.text}
					</p>
				</button>
			{/each}
		</div>

		{#if !started && !finished}
			<p class="mt-6 text-center font-mono text-xs tracking-widest text-zinc-600 uppercase">
				Click any tile to start the timer
			</p>
		{/if}
	</div>
</section>
