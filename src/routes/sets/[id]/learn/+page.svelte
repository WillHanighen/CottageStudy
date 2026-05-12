<script lang="ts">
	import { onMount } from 'svelte';
	import Seo from '$lib/components/Seo.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Card = (typeof data.set.cards)[number];
	type LearnKind = 'mc' | 'written' | 'tf';

	function shuffle<T>(arr: T[]): T[] {
		const a = arr.slice();
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	function normalize(s: string): string {
		return s.trim().toLowerCase().replace(/\s+/g, ' ');
	}

	// svelte-ignore state_referenced_locally
	const cards = data.set.cards;

	let phase = $state<'config' | 'practicing'>('config');

	let queue = $state<Card[]>(shuffle(cards));
	let mastered = $state<Set<string>>(new Set());
	let learnKind = $state<LearnKind>('written');
	let currentChoices = $state<string[]>([]);
	let tfCandidate = $state('');
	let tfCorrect = $state<'true' | 'false'>('true');
	let selected = $state<string | null>(null);
	let result = $state<'correct' | 'wrong' | null>(null);
	let typed = $state('');
	let hintVisible = $state(false);
	let askDefinition = $state(true);
	let totalAnswered = $state(0);
	let totalCorrect = $state(0);

	let enableMc = $state(cards.length >= 4);
	let enableWritten = $state(true);
	let enableTf = $state(true);

	const current = $derived(queue[0]);
	const finished = $derived(mastered.size >= cards.length);
	const promptText = $derived(askDefinition ? current?.term : current?.definition);
	const answerText = $derived(askDefinition ? current?.definition : current?.term);
	const accuracy = $derived(
		totalAnswered === 0 ? 0 : Math.round((totalCorrect / totalAnswered) * 100)
	);

	const learnKindPool = $derived.by(() => {
		const pool: LearnKind[] = [];
		if (enableMc && cards.length >= 4) pool.push('mc');
		if (enableWritten) pool.push('written');
		if (enableTf) pool.push('tf');
		return pool;
	});

	const learnKindsConfigured = $derived(learnKindPool.length > 0);

	const hintSupported = $derived(learnKind === 'mc' || learnKind === 'written');

	const hintSummary = $derived.by(() => {
		const ans = answerText?.trim() ?? '';
		if (!ans) return '';
		const first = ans[0] ?? '';
		return `${ans.length} characters · starts with “${first}”`;
	});

	function pickLearnKind(): LearnKind {
		const pool = learnKindPool;
		if (pool.length === 0) return 'written';
		return pool[Math.floor(Math.random() * pool.length)];
	}

	function resetRun() {
		mastered = new Set();
		queue = shuffle(cards);
		totalAnswered = 0;
		totalCorrect = 0;
		result = null;
		selected = null;
		typed = '';
		hintVisible = false;
	}

	function setupRound() {
		if (!current) return;
		learnKind = pickLearnKind();
		hintVisible = false;
		selected = null;
		typed = '';
		result = null;

		const correctAnswer = askDefinition ? current.definition : current.term;

		if (learnKind === 'mc') {
			const distractorPool = cards
				.filter((c) => c.id !== current.id)
				.map((c) => (askDefinition ? c.definition : c.term))
				.filter((t, i, arr) => arr.indexOf(t) === i && normalize(t) !== normalize(correctAnswer));
			const distractors = shuffle(distractorPool).slice(0, 3);
			currentChoices = shuffle([correctAnswer, ...distractors]);
			tfCandidate = '';
			return;
		}

		if (learnKind === 'tf') {
			currentChoices = [];
			const showCorrect = Math.random() < 0.5;
			let candidate = correctAnswer;
			if (!showCorrect) {
				const pool = cards
					.filter((c) => c.id !== current.id)
					.map((c) => (askDefinition ? c.definition : c.term))
					.filter((t) => normalize(t) !== normalize(correctAnswer));
				if (pool.length > 0) candidate = pool[Math.floor(Math.random() * pool.length)];
			}
			tfCandidate = candidate;
			tfCorrect = normalize(candidate) === normalize(correctAnswer) ? 'true' : 'false';
			return;
		}

		currentChoices = [];
		tfCandidate = '';
	}

	$effect(() => {
		if (phase !== 'practicing') return;
		if (current) setupRound();
	});

	/** Correct answers auto-advance shortly; wrong stays until Continue / Enter */
	$effect(() => {
		if (phase !== 'practicing') return;
		if (result !== 'correct') return;
		const id = setTimeout(() => advance(), 620);
		return () => clearTimeout(id);
	});

	function grade(isCorrect: boolean) {
		result = isCorrect ? 'correct' : 'wrong';
		totalAnswered++;
		if (isCorrect) totalCorrect++;
	}

	function answerMc(value: string) {
		if (result || !current || learnKind !== 'mc') return;
		const correct = (askDefinition ? current.definition : current.term).trim().toLowerCase();
		selected = value;
		grade(value.trim().toLowerCase() === correct);
	}

	function answerWritten() {
		if (result || !current || learnKind !== 'written') return;
		const correct = normalize(askDefinition ? current.definition : current.term);
		selected = typed;
		grade(normalize(typed) === correct);
	}

	function answerTf(opt: 'true' | 'false') {
		if (result || learnKind !== 'tf') return;
		selected = opt;
		grade(opt === tfCorrect);
	}

	function revealHint() {
		if (!hintSupported || result) return;
		hintVisible = true;
	}

	function advance() {
		if (!current || result === null) return;
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

	function startLearn() {
		if (!learnKindsConfigured) return;
		resetRun();
		phase = 'practicing';
		setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }), 0);
	}

	function backToSetup() {
		phase = 'config';
		resetRun();
		setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }), 0);
	}

	onMount(() => {
		const onKey = (e: KeyboardEvent) => {
			if (phase !== 'practicing') return;
			const t = e.target as HTMLElement | null;
			if (t?.closest('input, textarea, select, button[data-choice]')) return;
			if (e.key === 'Enter' && result !== null) {
				e.preventDefault();
				advance();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

<Seo
	title="Learn — {data.set.title}"
	titleTemplate={false}
	description="Quiz yourself round-by-round on {data.set.title}."
	path="/sets/{data.set.id}/learn"
	noindex
/>

<section class="relative py-10 sm:py-14">
	<div class="mx-auto max-w-3xl px-6">
		<div class="mb-6 flex items-center justify-between gap-4">
			<a
				href="/sets/{data.set.id}"
				class="inline-flex items-center gap-1.5 font-mono text-xs tracking-widest text-zinc-500 uppercase transition hover:text-zinc-300"
			>
				&larr; {data.set.title}
			</a>
			<span class="font-mono text-xs tracking-widest text-zinc-500 uppercase">/ Learn</span>
		</div>

		{#if phase === 'config'}
			<header class="mb-10 rise-in">
				<h1
					class="font-display text-4xl font-medium text-white sm:text-5xl"
					style="font-variation-settings: 'opsz' 144;"
				>
					Set up your <span class="italic text-orange-400">learn</span> session.
				</h1>
				<p class="mt-3 text-zinc-400">
					Choose how prompts appear and which answer formats to mix. You&apos;ll keep drilling until
					every card is mastered &mdash; wrong answers loop to the back of the queue.
				</p>
			</header>

			<div class="grain space-y-8 rounded-3xl border border-zinc-800/70 bg-zinc-900/50 p-7 sm:p-9 backdrop-blur-xl">
				<div>
					<p class="mb-3 font-mono text-xs tracking-widest text-zinc-400 uppercase">Session</p>
					<p class="text-sm leading-relaxed text-zinc-500">
						Adaptive practice on all {cards.length}
						{cards.length === 1 ? 'card' : 'cards'}. Each one leaves the queue only after a correct
						answer.
					</p>
				</div>

				<!-- Direction (same pattern as Quiz) -->
				<div>
					<p class="mb-3 font-mono text-xs tracking-widest text-zinc-400 uppercase">Prompt with</p>
					<div class="grid grid-cols-2 gap-3">
						<button
							type="button"
							onclick={() => (askDefinition = true)}
							class="rounded-xl border p-4 text-left transition
								{askDefinition
								? 'border-orange-500/50 bg-orange-500/10 text-white'
								: 'border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:border-zinc-700'}"
						>
							<p class="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">Term</p>
							<p class="mt-1 text-sm">Show term, answer with definition</p>
						</button>
						<button
							type="button"
							onclick={() => (askDefinition = false)}
							class="rounded-xl border p-4 text-left transition
								{!askDefinition
								? 'border-orange-500/50 bg-orange-500/10 text-white'
								: 'border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:border-zinc-700'}"
						>
							<p class="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
								Definition
							</p>
							<p class="mt-1 text-sm">Show definition, answer with term</p>
						</button>
					</div>
				</div>

				<!-- Types (Quiz layout; Learn omits matching) -->
				<div>
					<p class="mb-3 font-mono text-xs tracking-widest text-zinc-400 uppercase">
						Question types
					</p>
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<label
							class="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 transition hover:border-zinc-700"
							class:opacity-50={cards.length < 4}
						>
							<input
								type="checkbox"
								bind:checked={enableMc}
								disabled={cards.length < 4}
								class="mt-0.5 h-4 w-4 accent-orange-500"
							/>
							<div>
								<p class="text-sm font-medium text-white">Multiple choice</p>
								<p class="mt-0.5 text-xs text-zinc-500">
									Pick the right answer from four options.
									{#if cards.length < 4}<span class="text-orange-400/80"> Needs 4+ cards.</span>{/if}
								</p>
							</div>
						</label>
						<label
							class="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 transition hover:border-zinc-700"
						>
							<input type="checkbox" bind:checked={enableTf} class="mt-0.5 h-4 w-4 accent-orange-500" />
							<div>
								<p class="text-sm font-medium text-white">True / False</p>
								<p class="mt-0.5 text-xs text-zinc-500">Decide whether a pairing is right.</p>
							</div>
						</label>
						<label
							class="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 transition hover:border-zinc-700"
						>
							<input
								type="checkbox"
								bind:checked={enableWritten}
								class="mt-0.5 h-4 w-4 accent-orange-500"
							/>
							<div>
								<p class="text-sm font-medium text-white">Written</p>
								<p class="mt-0.5 text-xs text-zinc-500">Type the answer, character-perfect.</p>
							</div>
						</label>
					</div>
				</div>

				{#if !learnKindsConfigured}
					<p class="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
						Pick at least one question type to start.
					</p>
				{/if}

				<button
					type="button"
					onclick={startLearn}
					disabled={!learnKindsConfigured}
					class="w-full rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
				>
					Start learning
				</button>
			</div>
		{:else}
			<!-- Progress (only while practicing and not finished) -->
			{#if !finished && current}
				<div class="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 font-mono text-xs tracking-widest text-zinc-500 uppercase">
					<span>{mastered.size} / {cards.length} mastered</span>
					<div class="flex items-center gap-3">
						<span>{accuracy}% accuracy</span>
						<button
							type="button"
							onclick={backToSetup}
							class="text-orange-400/90 transition hover:text-orange-300"
						>
							Change setup
						</button>
					</div>
				</div>
				<div class="mb-10 h-1 overflow-hidden rounded-full bg-zinc-800">
					<div
						class="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-[width] duration-500"
						style="width: {(mastered.size / cards.length) * 100}%"
					></div>
				</div>
			{/if}

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
							onclick={backToSetup}
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
				{#if !learnKindsConfigured}
					<p class="text-center text-sm text-zinc-500">
						Enable at least one question type in setup to practice this deck.
					</p>
				{:else}
					<div
						class="grain mb-6 overflow-hidden rounded-3xl border border-zinc-800/70 bg-zinc-900/60 p-8 backdrop-blur-xl sm:p-10"
					>
						<div class="mb-3 flex flex-wrap items-start justify-between gap-3">
							<div>
								<p class="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
									{askDefinition ? 'Term' : 'Definition'}
									<span class="text-zinc-600"> · </span>
									<span class="text-orange-400/90">
										{learnKind === 'mc'
											? 'Multiple choice'
											: learnKind === 'written'
												? 'Written'
												: 'True / False'}
									</span>
								</p>
							</div>
							{#if hintSupported}
								<button
									type="button"
									disabled={!!result}
									onclick={revealHint}
									class="shrink-0 rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-1.5 font-mono text-[10px] tracking-widest text-zinc-300 uppercase transition hover:border-orange-500/50 hover:text-orange-200 disabled:cursor-not-allowed disabled:opacity-40"
								>
									Hint
								</button>
							{/if}
						</div>
						<p
							class="font-display text-3xl leading-tight font-medium text-white sm:text-4xl"
							style="font-variation-settings: 'opsz' 144, 'SOFT' 30;"
						>
							{promptText}
						</p>
						{#if hintVisible && hintSupported && hintSummary}
							<p class="mt-5 rounded-xl border border-orange-500/25 bg-orange-500/5 px-4 py-3 font-mono text-xs text-orange-200/90">
								{hintSummary}
							</p>
						{/if}
					</div>

					{#if learnKind === 'mc'}
						<div class="grid grid-cols-1 gap-3">
							{#each currentChoices as choice (choice)}
								{@const isSelected = selected === choice}
								{@const isCorrectChoice =
									choice.trim().toLowerCase() === answerText?.trim().toLowerCase()}
								<button
									type="button"
									data-choice
									disabled={!!result || !learnKindsConfigured}
									onclick={() => answerMc(choice)}
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
					{:else if learnKind === 'tf'}
						<div>
							<p class="mb-2 font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
								Proposed {askDefinition ? 'definition' : 'term'}
							</p>
							<p class="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 px-5 py-4 text-sm leading-relaxed text-zinc-100">
								{tfCandidate}
							</p>
							<div class="grid grid-cols-2 gap-3">
								{#each ['true', 'false'] as opt (opt)}
									{@const isSelected = selected === opt}
									{@const isAnswer = result !== null && opt === tfCorrect}
									{@const isWrongPick = result !== null && isSelected && opt !== tfCorrect}
									<button
										type="button"
										data-choice
										disabled={!!result || !learnKindsConfigured}
										onclick={() => answerTf(opt as 'true' | 'false')}
										class="rounded-2xl border px-4 py-4 text-sm font-semibold tracking-wide uppercase transition
										{isAnswer
											? 'border-emerald-500/50 bg-emerald-500/10 text-white'
											: isWrongPick
												? 'border-red-500/50 bg-red-500/10 text-white'
												: isSelected
													? 'border-orange-500/50 bg-orange-500/10 text-white'
													: 'border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:border-orange-500/40 hover:bg-zinc-900/70'}
										disabled:cursor-default"
									>
										{opt === 'true' ? 'True' : 'False'}
									</button>
								{/each}
							</div>
						</div>
					{:else}
						<form
							onsubmit={(e) => {
								e.preventDefault();
								if (!result && typed.trim()) answerWritten();
							}}
							class="space-y-3"
						>
							<input
								type="text"
								bind:value={typed}
								disabled={!!result || !learnKindsConfigured}
								placeholder={askDefinition ? 'Type the definition' : 'Type the term'}
								autocomplete="off"
								class="block w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 text-base text-white placeholder:text-zinc-700 transition-colors focus:border-orange-500
								{result === 'correct' ? '!border-emerald-500/50' : ''}
								{result === 'wrong' ? '!border-red-500/50' : ''}"
							/>
							<button
								type="submit"
								disabled={!!result || !typed.trim() || !learnKindsConfigured}
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
								<p class="mt-2 font-mono text-[10px] tracking-widest text-zinc-600 uppercase">
									Continuing automatically &middot; Enter or tap below to go now
								</p>
								<button
									type="button"
									onclick={advance}
									class="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
								>
									Next card &rarr;
								</button>
							{:else}
								<p class="font-mono text-xs tracking-widest text-red-400 uppercase">Not quite</p>
								<p class="mt-2 text-sm text-zinc-400">
									Answer: <span class="text-white">{answerText}</span>
								</p>
								<p class="mt-3 font-mono text-[10px] tracking-widest text-zinc-600 uppercase">
									Press Enter or tap Continue
								</p>
							{/if}
							{#if result === 'wrong'}
								<button
									type="button"
									onclick={advance}
									class="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
								>
									Continue &rarr;
								</button>
							{/if}
						</div>
					{/if}
				{/if}
			{/if}
		{/if}
	</div>
</section>
