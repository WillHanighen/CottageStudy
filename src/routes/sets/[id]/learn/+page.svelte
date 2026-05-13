<script lang="ts">
	import { onMount } from 'svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { buildMcChoices } from '$lib/mcDistractors';
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
	let configModalOpen = $state(false);

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

	/** Modal draft — synced when opening the dialog */
	let draftAskDefinition = $state(true);
	let draftEnableMc = $state(cards.length >= 4);
	let draftEnableWritten = $state(true);
	let draftEnableTf = $state(true);

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

	const draftLearnKindPool = $derived.by(() => {
		const pool: LearnKind[] = [];
		if (draftEnableMc && cards.length >= 4) pool.push('mc');
		if (draftEnableWritten) pool.push('written');
		if (draftEnableTf) pool.push('tf');
		return pool;
	});

	const draftLearnKindsConfigured = $derived(draftLearnKindPool.length > 0);

	const hintSupported = $derived(learnKind === 'mc' || learnKind === 'written');

	const hintSummary = $derived.by(() => {
		const ans = answerText?.trim() ?? '';
		if (!ans) return '';
		const first = ans[0] ?? '';
		return `${ans.length} characters · starts with “${first}”`;
	});

	const typeBadgeLabel = $derived.by(() => {
		if (learnKind === 'tf') return 'True / false';
		if (learnKind === 'mc') return 'Multiple choice';
		return 'Written';
	});

	const mainPromptLine = $derived.by(() => {
		if (!current) return '';
		if (learnKind === 'tf') {
			return askDefinition
				? `${current.term}: “${tfCandidate}”`
				: `“${current.definition}”: “${tfCandidate}”`;
		}
		if (learnKind === 'mc') {
			return askDefinition ? (current.term ?? '') : (current.definition ?? '');
		}
		return promptText ?? '';
	});

	const subPromptLine = $derived.by(() => {
		if (learnKind === 'tf') {
			return askDefinition
				? 'Is the following definition correct for this term?'
				: 'Is the following term correct for this definition?';
		}
		if (learnKind === 'mc') {
			return askDefinition
				? 'Choose the definition that matches this term.'
				: 'Choose the term that matches this definition.';
		}
		return askDefinition ? 'Type the definition for this term.' : 'Type the term for this definition.';
	});

	const feedbackRevealText = $derived.by(() => {
		if (learnKind === 'mc') {
			return askDefinition ? (current?.definition ?? '') : (current?.term ?? '');
		}
		if (learnKind === 'tf') {
			return askDefinition ? (current?.definition ?? '') : (current?.term ?? '');
		}
		return answerText ?? '';
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
			currentChoices = buildMcChoices(current, cards, askDefinition);
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
		typed = '';
		hintVisible = false;
	}

	function startLearn() {
		if (!learnKindsConfigured) return;
		resetRun();
		phase = 'practicing';
		setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }), 0);
	}

	function backToSetupFresh() {
		phase = 'config';
		resetRun();
		configModalOpen = false;
		setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }), 0);
	}

	function syncDraftFromSession() {
		draftAskDefinition = askDefinition;
		draftEnableMc = enableMc;
		draftEnableWritten = enableWritten;
		draftEnableTf = enableTf;
	}

	function openConfigModal() {
		syncDraftFromSession();
		configModalOpen = true;
	}

	function closeConfigModal() {
		configModalOpen = false;
	}

	function applyConfigFromModal() {
		if (!draftLearnKindsConfigured) return;
		askDefinition = draftAskDefinition;
		enableMc = draftEnableMc;
		enableWritten = draftEnableWritten;
		enableTf = draftEnableTf;
		configModalOpen = false;
		setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }), 0);
	}

	$effect(() => {
		if (!configModalOpen) return;
		const onEsc = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeConfigModal();
		};
		window.addEventListener('keydown', onEsc);
		return () => window.removeEventListener('keydown', onEsc);
	});

	$effect(() => {
		if (!configModalOpen) return;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	});

	onMount(() => {
		const onKey = (e: KeyboardEvent) => {
			if (configModalOpen) return;
			if (phase !== 'practicing' || finished) return;
			const t = e.target as HTMLElement | null;
			if (t?.closest('input, textarea, select, [data-choice]')) {
				// Still allow number keys and Enter from input when appropriate
				if (t?.closest('input, textarea') && e.key !== 'Enter') return;
			}

			if (result !== null && (e.key === 'Enter' || e.key === ' ')) {
				e.preventDefault();
				advance();
				return;
			}

			if (result !== null) return;

			const n = parseInt(e.key, 10);
			if (learnKind === 'mc' && !Number.isNaN(n) && n >= 1 && n <= currentChoices.length) {
				e.preventDefault();
				answerMc(currentChoices[n - 1]!);
				return;
			}
			if (learnKind === 'tf' && (e.key === '1' || e.key === '2')) {
				e.preventDefault();
				answerTf(e.key === '1' ? 'true' : 'false');
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
				<div
					class="mb-5 flex max-w-2xl flex-wrap items-center justify-between gap-x-4 gap-y-2 font-mono text-xs text-zinc-500"
				>
					<span>{mastered.size} / {cards.length} mastered · {accuracy}% accuracy</span>
					<button
						type="button"
						onclick={openConfigModal}
						class="text-orange-400/90 transition hover:text-orange-300"
					>
						Change setup
					</button>
				</div>
				<div
					class="mb-5 h-[5px] w-full max-w-2xl overflow-hidden rounded-full border border-zinc-800 bg-zinc-900"
				>
					<div
						class="h-full rounded-full bg-orange-500 transition-[width] duration-500 ease-out"
						style="width: {(mastered.size / cards.length) * 100}%"
					></div>
				</div>
			{/if}

			{#if finished}
				<div
					class="grain mx-auto max-w-2xl rounded-2xl border border-orange-500/30 bg-zinc-900/50 p-10 text-center backdrop-blur-xl sm:p-12"
				>
					<div class="mb-5 text-center">
						<div class="font-display text-2xl font-semibold text-white sm:text-[1.35rem]">You did it</div>
						<p class="mt-2 text-sm text-zinc-400">
							Mastered all {cards.length} cards with {accuracy}% accuracy across {totalAnswered} attempts.
						</p>
					</div>
					<div class="mb-5 grid grid-cols-3 gap-2.5 sm:gap-3">
						<div class="rounded-[0.65rem] border border-zinc-800 bg-zinc-900/60 py-3.5 text-center">
							<div class="font-mono text-2xl font-bold text-orange-500 sm:text-[1.65rem]">{totalCorrect}</div>
							<div class="mt-1 font-mono text-[10px] tracking-widest text-zinc-500 uppercase sm:text-[0.7rem]">
								Correct
							</div>
						</div>
						<div class="rounded-[0.65rem] border border-zinc-800 bg-zinc-900/60 py-3.5 text-center">
							<div class="font-mono text-2xl font-bold text-orange-500 sm:text-[1.65rem]">
								{totalAnswered - totalCorrect}
							</div>
							<div class="mt-1 font-mono text-[10px] tracking-widest text-zinc-500 uppercase sm:text-[0.7rem]">
								Wrong
							</div>
						</div>
						<div class="rounded-[0.65rem] border border-zinc-800 bg-zinc-900/60 py-3.5 text-center">
							<div class="font-mono text-2xl font-bold text-orange-500 sm:text-[1.65rem]">{accuracy}%</div>
							<div class="mt-1 font-mono text-[10px] tracking-widest text-zinc-500 uppercase sm:text-[0.7rem]">
								Score
							</div>
						</div>
					</div>
					<button
						type="button"
						onclick={backToSetupFresh}
						class="w-full rounded-[0.65rem] bg-orange-500 py-3.5 text-base font-semibold text-white transition hover:brightness-110"
					>
						Practice again
					</button>
					<a
						href="/sets/{data.set.id}"
						class="mt-2 block w-full rounded-[0.65rem] border border-zinc-800 py-3.5 text-center text-base font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
					>
						Back to set
					</a>
				</div>
			{:else if current}
				{#if !learnKindsConfigured}
					<p class="text-center text-sm text-zinc-500">
						Enable at least one question type in setup to practice this deck.
					</p>
				{:else}
					<div
						class="grain mx-auto w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/40 px-6 py-6 backdrop-blur-md sm:px-7 sm:py-6"
					>
						<div class="mb-4 flex items-center justify-between gap-3">
							<span
								class="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono text-[0.65rem] font-semibold tracking-widest text-zinc-400 uppercase"
							>
								{typeBadgeLabel}
							</span>
							<div class="flex items-center gap-2">
								{#if hintSupported}
									<button
										type="button"
										disabled={!!result}
										onclick={revealHint}
										class="rounded-full border border-zinc-800 bg-zinc-950/60 px-2.5 py-1 font-mono text-[0.65rem] tracking-widest text-zinc-400 uppercase transition hover:border-orange-500/40 hover:text-orange-200 disabled:cursor-not-allowed disabled:opacity-40"
									>
										Hint
									</button>
								{/if}
								<span class="font-mono text-sm text-zinc-500">
									{mastered.size} / {cards.length}
								</span>
							</div>
						</div>

						<p class="text-lg font-medium leading-[1.45] text-zinc-100 sm:text-xl">
							{mainPromptLine}
						</p>
						<p class="mt-1.5 text-sm leading-relaxed text-zinc-500">{subPromptLine}</p>

						{#if hintVisible && hintSupported && hintSummary}
							<p
								class="mt-4 rounded-[0.65rem] border border-orange-500/25 bg-orange-500/5 px-4 py-3 font-mono text-xs text-orange-200/90"
							>
								{hintSummary}
							</p>
						{/if}

						<div class="mt-5 flex flex-col gap-2">
							{#if learnKind === 'mc'}
								{#each currentChoices as choice, i (choice)}
									{@const isSelected = selected === choice}
									{@const isCorrectChoice =
										choice.trim().toLowerCase() === answerText?.trim().toLowerCase()}
									<button
										type="button"
										data-choice
										disabled={!!result || !learnKindsConfigured}
										onclick={() => answerMc(choice)}
										class="flex items-start gap-2.5 rounded-xl border bg-zinc-950/50 px-4 py-3.5 text-left text-sm text-zinc-100 transition
										{!result ? 'border-zinc-800 hover:border-orange-500/45 hover:bg-orange-500/[0.12]' : ''}
										{result && isCorrectChoice
											? 'border-emerald-500/50 bg-emerald-500/[0.12]'
											: ''}
										{result && isSelected && !isCorrectChoice
											? 'border-red-500/50 bg-red-500/[0.12]'
											: ''}
										{result && !isCorrectChoice && !isSelected ? 'opacity-[0.38]' : ''}
										disabled:cursor-default"
									>
										<span
											class="grid h-[1.65rem] min-w-[1.65rem] place-items-center rounded-md border border-zinc-800 bg-zinc-900 font-mono text-[0.7rem] font-bold text-zinc-400
											{result && isCorrectChoice ? '!border-emerald-500 !bg-emerald-500 !text-white' : ''}
											{result && isSelected && !isCorrectChoice ? '!border-red-500 !bg-red-500 !text-white' : ''}"
										>
											{i + 1}
										</span>
										<span class="min-w-0 flex-1 leading-relaxed">{choice}</span>
									</button>
								{/each}
							{:else if learnKind === 'tf'}
								{#each [{ k: 'true' as const, label: 'True' }, { k: 'false' as const, label: 'False' }] as tfOpt, i (tfOpt.k)}
									{@const opt = tfOpt.k}
									{@const isSelected = selected === opt}
									{@const isAnswer = result !== null && opt === tfCorrect}
									{@const isWrongPick = result !== null && isSelected && opt !== tfCorrect}
									<button
										type="button"
										data-choice
										disabled={!!result || !learnKindsConfigured}
										onclick={() => answerTf(opt)}
										class="flex items-start gap-2.5 rounded-xl border bg-zinc-950/50 px-4 py-3.5 text-left text-sm text-zinc-100 transition
										{!result ? 'border-zinc-800 hover:border-orange-500/45 hover:bg-orange-500/[0.12]' : ''}
										{isAnswer ? 'border-emerald-500/50 bg-emerald-500/[0.12]' : ''}
										{isWrongPick ? 'border-red-500/50 bg-red-500/[0.12]' : ''}
										{result && !isAnswer && !isWrongPick ? 'opacity-[0.38]' : ''}
										disabled:cursor-default"
									>
										<span
											class="grid h-[1.65rem] min-w-[1.65rem] place-items-center rounded-md border border-zinc-800 bg-zinc-900 font-mono text-[0.7rem] font-bold text-zinc-400
											{isAnswer ? '!border-emerald-500 !bg-emerald-500 !text-white' : ''}
											{isWrongPick ? '!border-red-500 !bg-red-500 !text-white' : ''}"
										>
											{i + 1}
										</span>
										<span class="font-medium">{tfOpt.label}</span>
									</button>
								{/each}
							{:else}
								<form
									onsubmit={(e) => {
										e.preventDefault();
										if (!result && typed.trim()) answerWritten();
									}}
									class="flex flex-col gap-2"
								>
									<input
										type="text"
										bind:value={typed}
										disabled={!!result || !learnKindsConfigured}
										placeholder={askDefinition ? 'Type the definition' : 'Type the term'}
										autocomplete="off"
										class="w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3.5 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-orange-500/50 focus:outline-none
										{result === 'correct' ? '!border-emerald-500/50' : ''}
										{result === 'wrong' ? '!border-red-500/50' : ''}"
									/>
									<button
										type="submit"
										disabled={!!result || !typed.trim() || !learnKindsConfigured}
										class="w-full rounded-xl border border-zinc-700 bg-zinc-100 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
									>
										Check answer
									</button>
								</form>
							{/if}
						</div>

						{#if result === 'correct'}
							<div
								class="mt-4 rounded-[0.65rem] border border-emerald-500/35 bg-emerald-500/[0.12] px-4 py-3 text-sm leading-relaxed text-emerald-200/95"
							>
								<strong>Correct.</strong>
								<div class="mt-2 text-[0.78rem] text-zinc-400">{feedbackRevealText}</div>
							</div>
						{:else if result === 'wrong'}
							<div
								class="mt-4 rounded-[0.65rem] border border-red-500/35 bg-red-500/[0.12] px-4 py-3 text-sm leading-relaxed text-red-200/95"
							>
								<strong>Incorrect.</strong>
								<div class="mt-2 text-[0.78rem] text-zinc-400">
									Correct answer: {feedbackRevealText}
								</div>
							</div>
						{/if}

						{#if result}
							<button
								type="button"
								onclick={advance}
								class="mt-4 w-full rounded-[0.65rem] bg-orange-500 py-3 text-sm font-semibold text-white transition hover:brightness-110"
							>
								Next
							</button>
						{/if}
					</div>
				{/if}
			{/if}
		{/if}
	</div>

	{#if configModalOpen}
		<div class="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
			<button
				type="button"
				class="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
				aria-label="Close setup"
				onclick={closeConfigModal}
			></button>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="learn-config-modal-title"
				class="relative z-10 max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/95 p-6 shadow-2xl shadow-black/60"
			>
				<div class="mb-5 flex items-start justify-between gap-3">
					<h2 id="learn-config-modal-title" class="font-display text-xl font-medium text-white">
						Session setup
					</h2>
					<button
						type="button"
						class="rounded-lg border border-zinc-800 px-2 py-1 font-mono text-[10px] tracking-widest text-zinc-400 uppercase hover:bg-zinc-800"
						onclick={closeConfigModal}
					>
						Esc
					</button>
				</div>
				<p class="mb-6 text-sm text-zinc-500">
					Changes apply from this card onward. Your progress ({mastered.size}/{cards.length} mastered)
					is kept.
				</p>

				<div class="space-y-6">
					<div>
						<p class="mb-3 font-mono text-xs tracking-widest text-zinc-400 uppercase">Prompt with</p>
						<div class="grid grid-cols-2 gap-3">
							<button
								type="button"
								onclick={() => (draftAskDefinition = true)}
								class="rounded-xl border p-4 text-left transition
									{draftAskDefinition
									? 'border-orange-500/50 bg-orange-500/10 text-white'
									: 'border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:border-zinc-700'}"
							>
								<p class="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">Term</p>
								<p class="mt-1 text-sm">Show term, answer with definition</p>
							</button>
							<button
								type="button"
								onclick={() => (draftAskDefinition = false)}
								class="rounded-xl border p-4 text-left transition
									{!draftAskDefinition
									? 'border-orange-500/50 bg-orange-500/10 text-white'
									: 'border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:border-zinc-700'}"
							>
								<p class="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">Definition</p>
								<p class="mt-1 text-sm">Show definition, answer with term</p>
							</button>
						</div>
					</div>

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
									bind:checked={draftEnableMc}
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
								<input type="checkbox" bind:checked={draftEnableTf} class="mt-0.5 h-4 w-4 accent-orange-500" />
								<div>
									<p class="text-sm font-medium text-white">True / False</p>
									<p class="mt-0.5 text-xs text-zinc-500">Decide whether a pairing is right.</p>
								</div>
							</label>
							<label
								class="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 transition hover:border-zinc-700 sm:col-span-2"
							>
								<input
									type="checkbox"
									bind:checked={draftEnableWritten}
									class="mt-0.5 h-4 w-4 accent-orange-500"
								/>
								<div>
									<p class="text-sm font-medium text-white">Written</p>
									<p class="mt-0.5 text-xs text-zinc-500">Type the answer, character-perfect.</p>
								</div>
							</label>
						</div>
					</div>

					{#if !draftLearnKindsConfigured}
						<p class="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
							Pick at least one question type.
						</p>
					{/if}

					<div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
						<button
							type="button"
							onclick={closeConfigModal}
							class="rounded-xl border border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800/80"
						>
							Cancel
						</button>
						<button
							type="button"
							onclick={applyConfigFromModal}
							disabled={!draftLearnKindsConfigured}
							class="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
						>
							Apply
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</section>
