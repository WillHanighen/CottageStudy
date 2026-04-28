<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Card = (typeof data.set.cards)[number];

	function shuffle<T>(arr: T[]): T[] {
		const a = arr.slice();
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	// svelte-ignore state_referenced_locally
	const cards = data.set.cards;

	let queue = $state<Card[]>(shuffle(cards));
	let mastered = $state<Set<string>>(new Set());
	let currentChoices = $state<string[]>([]);
	let selected = $state<string | null>(null);
	let result = $state<'correct' | 'wrong' | null>(null);
	let typed = $state('');
	let questionType = $state<'choice' | 'type'>('choice');
	let askDefinition = $state(true);
	let totalAnswered = $state(0);
	let totalCorrect = $state(0);

	const current = $derived(queue[0]);
	const finished = $derived(mastered.size >= cards.length);
	const promptText = $derived(askDefinition ? current?.term : current?.definition);
	const answerText = $derived(askDefinition ? current?.definition : current?.term);
	const accuracy = $derived(
		totalAnswered === 0 ? 0 : Math.round((totalCorrect / totalAnswered) * 100)
	);

	function chooseQuestionType() {
		if (cards.length >= 4) {
			questionType = Math.random() < 0.6 ? 'choice' : 'type';
		} else {
			questionType = 'choice';
		}
	}

	function buildChoices() {
		if (!current) return;
		chooseQuestionType();
		const correct = askDefinition ? current.definition : current.term;
		const distractorPool = cards
			.filter((c) => c.id !== current.id)
			.map((c) => (askDefinition ? c.definition : c.term));
		const distractors = shuffle(distractorPool).slice(0, 3);
		currentChoices = shuffle([correct, ...distractors]);
		selected = null;
		typed = '';
		result = null;
	}

	$effect(() => {
		if (current) buildChoices();
	});

	function answer(value: string) {
		if (result) return;
		const correct = (askDefinition ? current.definition : current.term).trim().toLowerCase();
		const isCorrect = value.trim().toLowerCase() === correct;
		selected = value;
		result = isCorrect ? 'correct' : 'wrong';
		totalAnswered++;
		if (isCorrect) totalCorrect++;
	}

	function advance() {
		if (!current) return;
		if (result === 'correct') {
			mastered = new Set([...mastered, current.id]);
			queue = queue.slice(1);
		} else {
			const [first, ...rest] = queue;
			queue = [...rest, first];
		}
		result = null;
		selected = null;
	}

	function restart() {
		mastered = new Set();
		queue = shuffle(cards);
		totalAnswered = 0;
		totalCorrect = 0;
	}

	function flipDirection() {
		askDefinition = !askDefinition;
		restart();
	}
</script>

<Seo
	title="Learn — {data.set.title}"
	titleTemplate={false}
	description="Quiz yourself round-by-round on {data.set.title}."
	path="/sets/{data.set.id}/learn"
	noindex
/>

<section class="relative py-10 sm:py-14">
	<div class="mx-auto max-w-2xl px-6">
		<div class="mb-6 flex items-center justify-between gap-4">
			<a
				href="/sets/{data.set.id}"
				class="inline-flex items-center gap-1.5 font-mono text-xs tracking-widest text-zinc-500 uppercase transition hover:text-zinc-300"
			>
				&larr; {data.set.title}
			</a>
			<button
				type="button"
				onclick={flipDirection}
				class="font-mono text-xs tracking-widest text-zinc-500 uppercase transition hover:text-zinc-300"
			>
				{askDefinition ? 'Term → Definition' : 'Definition → Term'}
			</button>
		</div>

		<!-- Progress -->
		<div class="mb-3 flex items-center justify-between font-mono text-xs tracking-widest text-zinc-500 uppercase">
			<span>{mastered.size} / {cards.length} mastered</span>
			<span>{accuracy}% accuracy</span>
		</div>
		<div class="mb-10 h-1 overflow-hidden rounded-full bg-zinc-800">
			<div
				class="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-[width] duration-500"
				style="width: {(mastered.size / cards.length) * 100}%"
			></div>
		</div>

		{#if finished}
			<div
				class="grain rounded-3xl border border-orange-500/30 bg-gradient-to-br from-zinc-900/80 to-orange-950/20 p-12 text-center backdrop-blur-xl"
			>
				<div
					class="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-orange-500/40 bg-orange-500/10 text-orange-400"
				>
					<svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</div>
				<h2 class="font-display text-4xl font-medium italic text-white sm:text-5xl" style="font-variation-settings: 'opsz' 144;">
					You did it.
				</h2>
				<p class="mt-3 text-zinc-400">
					Mastered all {cards.length} cards with {accuracy}% accuracy across {totalAnswered} attempts.
				</p>
				<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
					<button
						type="button"
						onclick={restart}
						class="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600"
					>
						Practice again
					</button>
					<a
						href="/sets/{data.set.id}"
						class="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-900"
					>
						Back to set
					</a>
				</div>
			</div>
		{:else if current}
			<div
				class="grain mb-6 overflow-hidden rounded-3xl border border-zinc-800/70 bg-zinc-900/60 p-8 backdrop-blur-xl sm:p-10"
			>
				<p class="mb-3 font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
					{askDefinition ? 'Term' : 'Definition'}
				</p>
				<p
					class="font-display text-3xl leading-tight font-medium text-white sm:text-4xl"
					style="font-variation-settings: 'opsz' 144, 'SOFT' 30;"
				>
					{promptText}
				</p>
			</div>

			{#if questionType === 'choice'}
				<div class="grid grid-cols-1 gap-3">
					{#each currentChoices as choice (choice)}
						{@const isSelected = selected === choice}
						{@const isCorrectChoice = choice.trim().toLowerCase() === answerText.trim().toLowerCase()}
						<button
							type="button"
							disabled={!!result}
							onclick={() => answer(choice)}
							class="group flex items-center gap-4 rounded-2xl border bg-zinc-900/40 p-5 text-left transition-all
								{result && isCorrectChoice
								? 'border-emerald-500/50 bg-emerald-500/10'
								: result && isSelected
									? 'border-red-500/50 bg-red-500/10'
									: 'border-zinc-800/70 hover:border-orange-500/40 hover:bg-zinc-900/70'}
								disabled:cursor-default"
						>
							<span
								class="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-zinc-800 bg-zinc-950 font-mono text-xs text-zinc-400 transition group-hover:border-orange-500/50 group-hover:text-orange-300
									{result && isCorrectChoice ? '!border-emerald-500/60 !text-emerald-400' : ''}
									{result && isSelected && !isCorrectChoice ? '!border-red-500/60 !text-red-400' : ''}"
							>
								{currentChoices.indexOf(choice) + 1}
							</span>
							<span class="text-sm leading-relaxed text-zinc-100 sm:text-base">{choice}</span>
						</button>
					{/each}
				</div>
			{:else}
				<form
					onsubmit={(e) => {
						e.preventDefault();
						if (!result) answer(typed);
					}}
					class="space-y-3"
				>
					<input
						type="text"
						bind:value={typed}
						disabled={!!result}
						placeholder={askDefinition ? 'Type the definition' : 'Type the term'}
						autocomplete="off"
						class="block w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 text-base text-white placeholder:text-zinc-700 transition-colors focus:border-orange-500
							{result === 'correct' ? '!border-emerald-500/50' : ''}
							{result === 'wrong' ? '!border-red-500/50' : ''}"
					/>
					<button
						type="submit"
						disabled={!!result || !typed.trim()}
						class="w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
					>
						Check answer
					</button>
				</form>
			{/if}

			{#if result}
				<div class="mt-5 rounded-2xl border border-zinc-800/70 bg-zinc-900/40 p-5 text-center backdrop-blur">
					{#if result === 'correct'}
						<p class="font-mono text-xs tracking-widest text-emerald-400 uppercase">Correct</p>
					{:else}
						<p class="font-mono text-xs tracking-widest text-red-400 uppercase">Not quite</p>
						<p class="mt-2 text-sm text-zinc-400">
							Answer: <span class="text-white">{answerText}</span>
						</p>
					{/if}
					<button
						type="button"
						onclick={advance}
						class="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
					>
						Continue &rarr;
					</button>
				</div>
			{/if}
		{/if}
	</div>
</section>
