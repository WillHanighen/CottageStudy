<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Card = (typeof data.set.cards)[number];

	type McQuestion = {
		id: string;
		type: 'mc';
		cardId: string;
		prompt: string;
		correct: string;
		choices: string[];
	};

	type TfQuestion = {
		id: string;
		type: 'tf';
		cardId: string;
		prompt: string;
		candidate: string;
		correct: 'true' | 'false';
	};

	type WrittenQuestion = {
		id: string;
		type: 'written';
		cardId: string;
		prompt: string;
		correct: string;
	};

	type MatchingPair = {
		cardId: string;
		term: string;
		definition: string;
		label: string; // letter assigned to this card's *definition* in the shuffled column
	};

	type MatchingQuestion = {
		id: string;
		type: 'matching';
		pairs: MatchingPair[]; // ordered as shown on the term column
		defs: { label: string; definition: string; cardId: string }[]; // shuffled definition column
	};

	type Question = McQuestion | TfQuestion | WrittenQuestion | MatchingQuestion;

	type SingleType = 'mc' | 'tf' | 'written';

	function shuffle<T>(arr: T[]): T[] {
		const a = arr.slice();
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	function uid(): string {
		return Math.random().toString(36).slice(2, 10);
	}

	function normalize(s: string): string {
		return s.trim().toLowerCase().replace(/\s+/g, ' ');
	}

	// svelte-ignore state_referenced_locally
	const cards = data.set.cards;

	let phase = $state<'config' | 'taking' | 'graded'>('config');

	// --- Config state ---
	let count = $state(Math.min(20, cards.length));
	let askDefinition = $state(true); // prompt = term, answer = definition
	let enableMc = $state(cards.length >= 4);
	let enableTf = $state(true);
	let enableWritten = $state(true);
	let enableMatching = $state(cards.length >= 4);

	const minCount = 1;
	const maxCount = cards.length;

	const anyTypeEnabled = $derived(enableMc || enableTf || enableWritten || enableMatching);

	// --- Quiz state ---
	let questions = $state<Question[]>([]);
	// answers keyed by question id
	// - mc / tf: string ('true' | 'false' | choice)
	// - written: string
	// - matching: Record<cardId, label>
	let answers = $state<Record<string, string | Record<string, string>>>({});

	function buildQuestion(card: Card, type: SingleType): Question {
		const promptText = askDefinition ? card.term : card.definition;
		const correctAnswer = askDefinition ? card.definition : card.term;
		if (type === 'mc') {
			const distractorPool = cards
				.filter((c) => c.id !== card.id)
				.map((c) => (askDefinition ? c.definition : c.term))
				.filter((t, i, arr) => arr.indexOf(t) === i && normalize(t) !== normalize(correctAnswer));
			const distractors = shuffle(distractorPool).slice(0, 3);
			return {
				id: uid(),
				type: 'mc',
				cardId: card.id,
				prompt: promptText,
				correct: correctAnswer,
				choices: shuffle([correctAnswer, ...distractors])
			};
		}
		if (type === 'tf') {
			const showCorrect = Math.random() < 0.5;
			let candidate = correctAnswer;
			if (!showCorrect) {
				const pool = cards
					.filter((c) => c.id !== card.id)
					.map((c) => (askDefinition ? c.definition : c.term))
					.filter((t) => normalize(t) !== normalize(correctAnswer));
				if (pool.length > 0) candidate = pool[Math.floor(Math.random() * pool.length)];
				else candidate = correctAnswer; // fallback if vocabulary exhausted
			}
			return {
				id: uid(),
				type: 'tf',
				cardId: card.id,
				prompt: promptText,
				candidate,
				correct: normalize(candidate) === normalize(correctAnswer) ? 'true' : 'false'
			};
		}
		return {
			id: uid(),
			type: 'written',
			cardId: card.id,
			prompt: promptText,
			correct: correctAnswer
		};
	}

	function buildMatchingQuestion(group: Card[]): MatchingQuestion {
		const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
		const shuffledForDefs = shuffle(group);
		const defs = shuffledForDefs.map((c, i) => ({
			label: labels[i],
			definition: askDefinition ? c.definition : c.term,
			cardId: c.id
		}));
		const pairs: MatchingPair[] = group.map((c) => {
			const matching = defs.find((d) => d.cardId === c.id)!;
			return {
				cardId: c.id,
				term: askDefinition ? c.term : c.definition,
				definition: askDefinition ? c.definition : c.term,
				label: matching.label
			};
		});
		return {
			id: uid(),
			type: 'matching',
			pairs,
			defs
		};
	}

	function pickSingleType(): SingleType {
		const enabled: SingleType[] = [];
		if (enableMc && cards.length >= 4) enabled.push('mc');
		if (enableTf) enabled.push('tf');
		if (enableWritten) enabled.push('written');
		if (enabled.length === 0) {
			// Defensive — caller guards against this. Default to written.
			return 'written';
		}
		return enabled[Math.floor(Math.random() * enabled.length)];
	}

	function generate() {
		const desired = Math.max(minCount, Math.min(maxCount, count));
		const pool = shuffle(cards).slice(0, desired);
		const list: Question[] = [];

		// Single questions first (interleaved random types)
		const singleCards = pool.slice();
		let matchingGroup: Card[] = [];
		if (enableMatching && cards.length >= 4 && singleCards.length >= 3) {
			const groupSize = Math.min(5, singleCards.length);
			matchingGroup = singleCards.splice(singleCards.length - groupSize, groupSize);
		}
		for (const card of singleCards) {
			list.push(buildQuestion(card, pickSingleType()));
		}
		if (matchingGroup.length >= 3) {
			list.push(buildMatchingQuestion(matchingGroup));
		}

		// Initialise answers
		const a: Record<string, string | Record<string, string>> = {};
		for (const q of list) {
			if (q.type === 'matching') {
				const m: Record<string, string> = {};
				for (const p of q.pairs) m[p.cardId] = '';
				a[q.id] = m;
			} else {
				a[q.id] = '';
			}
		}

		questions = list;
		answers = a;
	}

	function startQuiz() {
		if (!anyTypeEnabled) return;
		generate();
		phase = 'taking';
		// Scroll to top after the DOM swaps
		setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }), 0);
	}

	function setAnswer(qid: string, value: string) {
		answers = { ...answers, [qid]: value };
	}

	function setMatchingAnswer(qid: string, cardId: string, label: string) {
		const current = answers[qid];
		const m = (typeof current === 'object' && current !== null ? { ...current } : {}) as Record<
			string,
			string
		>;
		m[cardId] = label;
		answers = { ...answers, [qid]: m };
	}

	function isQuestionCorrect(q: Question): boolean {
		const a = answers[q.id];
		if (q.type === 'mc') return typeof a === 'string' && normalize(a) === normalize(q.correct);
		if (q.type === 'tf') return a === q.correct;
		if (q.type === 'written') return typeof a === 'string' && normalize(a) === normalize(q.correct);
		// matching: count as correct only if every pair is correct
		if (typeof a !== 'object' || a === null) return false;
		return q.pairs.every((p) => a[p.cardId] === p.label);
	}

	function questionPoints(q: Question): { earned: number; total: number } {
		if (q.type === 'matching') {
			const a = answers[q.id];
			const map = (typeof a === 'object' && a !== null ? a : {}) as Record<string, string>;
			const correct = q.pairs.filter((p) => map[p.cardId] === p.label).length;
			return { earned: correct, total: q.pairs.length };
		}
		return { earned: isQuestionCorrect(q) ? 1 : 0, total: 1 };
	}

	const score = $derived(
		(() => {
			if (phase !== 'graded') return { earned: 0, total: 0, percent: 0 };
			let earned = 0;
			let total = 0;
			for (const q of questions) {
				const p = questionPoints(q);
				earned += p.earned;
				total += p.total;
			}
			return {
				earned,
				total,
				percent: total === 0 ? 0 : Math.round((earned / total) * 100)
			};
		})()
	);

	const answeredCount = $derived(
		questions.reduce((acc, q) => {
			const a = answers[q.id];
			if (q.type === 'matching') {
				const m = (typeof a === 'object' && a !== null ? a : {}) as Record<string, string>;
				return acc + (q.pairs.every((p) => m[p.cardId]) ? 1 : 0);
			}
			return acc + (typeof a === 'string' && a.trim() !== '' ? 1 : 0);
		}, 0)
	);

	function submit() {
		phase = 'graded';
		setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
	}

	function retake() {
		phase = 'config';
		questions = [];
		answers = {};
		setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }), 0);
	}

	function questionLetter(q: MatchingQuestion, cardId: string): string {
		// student's chosen label for a term
		const a = answers[q.id];
		if (typeof a !== 'object' || a === null) return '';
		return (a as Record<string, string>)[cardId] ?? '';
	}
</script>

<svelte:head>
	<title>Quiz &mdash; {data.set.title}</title>
</svelte:head>

<section class="relative py-10 sm:py-14">
	<div class="mx-auto max-w-3xl px-6">
		<div class="mb-6 flex items-center justify-between gap-4">
			<a
				href="/sets/{data.set.id}"
				class="inline-flex items-center gap-1.5 font-mono text-xs tracking-widest text-zinc-500 uppercase transition hover:text-zinc-300"
			>
				&larr; {data.set.title}
			</a>
			<span class="font-mono text-xs tracking-widest text-zinc-500 uppercase">/ Quiz</span>
		</div>

		{#if phase === 'config'}
			<header class="mb-10 rise-in">
				<h1
					class="font-display text-4xl font-medium text-white sm:text-5xl"
					style="font-variation-settings: 'opsz' 144;"
				>
					Build your <span class="italic text-orange-400">test</span>.
				</h1>
				<p class="mt-3 text-zinc-400">
					Mix question types, pick a length, then sit it like a real quiz &mdash; no peeking until
					you submit.
				</p>
			</header>

			<div class="grain space-y-8 rounded-3xl border border-zinc-800/70 bg-zinc-900/50 p-7 sm:p-9 backdrop-blur-xl">
				<!-- Count -->
				<div>
					<div class="mb-3 flex items-center justify-between">
						<label
							for="count"
							class="font-mono text-xs tracking-widest text-zinc-400 uppercase"
						>
							Questions
						</label>
						<span class="font-mono text-sm text-orange-400">{count} / {maxCount}</span>
					</div>
					<input
						id="count"
						type="range"
						min={minCount}
						max={maxCount}
						bind:value={count}
						class="w-full accent-orange-500"
					/>
					<div class="mt-2 flex items-center justify-between font-mono text-[10px] tracking-widest text-zinc-600 uppercase">
						<span>{minCount}</span>
						<span>{maxCount}</span>
					</div>
				</div>

				<!-- Direction -->
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

				<!-- Types -->
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
						<label
							class="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 transition hover:border-zinc-700"
							class:opacity-50={cards.length < 4}
						>
							<input
								type="checkbox"
								bind:checked={enableMatching}
								disabled={cards.length < 4}
								class="mt-0.5 h-4 w-4 accent-orange-500"
							/>
							<div>
								<p class="text-sm font-medium text-white">Matching</p>
								<p class="mt-0.5 text-xs text-zinc-500">
									Pair a small group of terms with their definitions.
									{#if cards.length < 4}<span class="text-orange-400/80"> Needs 4+ cards.</span>{/if}
								</p>
							</div>
						</label>
					</div>
				</div>

				{#if !anyTypeEnabled}
					<p class="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
						Pick at least one question type to start.
					</p>
				{/if}

				<button
					type="button"
					onclick={startQuiz}
					disabled={!anyTypeEnabled}
					class="w-full rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
				>
					Start quiz
				</button>
			</div>
		{:else if phase === 'taking' || phase === 'graded'}
			{#if phase === 'graded'}
				<div
					class="grain mb-8 rounded-3xl border border-orange-500/30 bg-gradient-to-br from-zinc-900/80 to-orange-950/20 p-8 text-center backdrop-blur-xl rise-in"
				>
					<p class="font-mono text-[10px] tracking-widest text-orange-400/80 uppercase">Result</p>
					<p
						class="mt-2 font-display text-6xl font-medium text-white sm:text-7xl"
						style="font-variation-settings: 'opsz' 144;"
					>
						{score.percent}<span class="text-3xl text-zinc-500 sm:text-4xl">%</span>
					</p>
					<p class="mt-2 text-sm text-zinc-400">
						{score.earned} of {score.total} points &middot; {questions.length}
						{questions.length === 1 ? 'question' : 'questions'}
					</p>
					<div class="mt-6 flex flex-wrap items-center justify-center gap-3">
						<button
							type="button"
							onclick={retake}
							class="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600"
						>
							New quiz
						</button>
						<a
							href="/sets/{data.set.id}"
							class="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-900"
						>
							Back to set
						</a>
					</div>
				</div>
			{:else}
				<div
					class="sticky top-2 z-10 mb-6 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-2.5 backdrop-blur-xl"
				>
					<span class="font-mono text-xs tracking-widest text-zinc-400 uppercase">
						{answeredCount} / {questions.length} answered
					</span>
					<button
						type="button"
						onclick={submit}
						class="rounded-lg bg-white px-4 py-1.5 text-xs font-semibold tracking-wide text-zinc-950 uppercase transition hover:bg-zinc-200"
					>
						Submit
					</button>
				</div>
			{/if}

			<ol class="space-y-5">
				{#each questions as q, i (q.id)}
					{@const graded = phase === 'graded'}
					{@const correct = graded && isQuestionCorrect(q)}
					{@const wrong = graded && !correct}
					<li
						class="grain rounded-2xl border bg-zinc-900/40 p-6 backdrop-blur transition-colors sm:p-7
							{graded && correct ? 'border-emerald-500/40 bg-emerald-500/5' : ''}
							{graded && wrong ? 'border-red-500/40 bg-red-500/5' : ''}
							{!graded ? 'border-zinc-800/70' : ''}"
					>
						<div class="mb-4 flex items-center justify-between">
							<span
								class="font-mono text-[10px] tracking-widest text-zinc-500 uppercase"
							>
								Question {i + 1} &middot; {q.type === 'mc'
									? 'Multiple choice'
									: q.type === 'tf'
										? 'True / False'
										: q.type === 'written'
											? 'Written'
											: 'Matching'}
							</span>
							{#if graded}
								<span
									class="font-mono text-[10px] tracking-widest uppercase {correct
										? 'text-emerald-400'
										: 'text-red-400'}"
								>
									{#if q.type === 'matching'}
										{questionPoints(q).earned} / {questionPoints(q).total}
									{:else}
										{correct ? 'Correct' : 'Incorrect'}
									{/if}
								</span>
							{/if}
						</div>

						{#if q.type === 'mc'}
							<p
								class="mb-5 font-display text-xl leading-snug text-white sm:text-2xl"
								style="font-variation-settings: 'opsz' 144;"
							>
								{q.prompt}
							</p>
							<div class="grid grid-cols-1 gap-2">
								{#each q.choices as choice (choice)}
									{@const isSelected = answers[q.id] === choice}
									{@const isAnswer =
										graded && normalize(choice) === normalize(q.correct)}
									{@const isWrongPick = graded && isSelected && !isAnswer}
									<button
										type="button"
										disabled={graded}
										onclick={() => setAnswer(q.id, choice)}
										class="flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition
											{isAnswer
											? 'border-emerald-500/50 bg-emerald-500/10 text-white'
											: isWrongPick
												? 'border-red-500/50 bg-red-500/10 text-white'
												: isSelected
													? 'border-orange-500/50 bg-orange-500/10 text-white'
													: 'border-zinc-800 bg-zinc-950/40 text-zinc-200 hover:border-orange-500/40 hover:bg-zinc-900/70'}
											disabled:cursor-default"
									>
										<span
											class="grid h-7 w-7 shrink-0 place-items-center rounded-md border font-mono text-[11px]
												{isAnswer
												? 'border-emerald-500/60 text-emerald-400'
												: isWrongPick
													? 'border-red-500/60 text-red-400'
													: isSelected
														? 'border-orange-500/60 text-orange-300'
														: 'border-zinc-800 text-zinc-500'}"
										>
											{q.choices.indexOf(choice) + 1}
										</span>
										<span class="leading-relaxed">{choice}</span>
									</button>
								{/each}
							</div>
						{:else if q.type === 'tf'}
							<p class="mb-2 font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
								{askDefinition ? 'Term' : 'Definition'}
							</p>
							<p
								class="mb-3 font-display text-xl leading-snug text-white sm:text-2xl"
								style="font-variation-settings: 'opsz' 144;"
							>
								{q.prompt}
							</p>
							<p class="mb-2 font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
								Proposed {askDefinition ? 'definition' : 'term'}
							</p>
							<p class="mb-5 rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-200">
								{q.candidate}
							</p>
							<div class="grid grid-cols-2 gap-2">
								{#each ['true', 'false'] as opt (opt)}
									{@const isSelected = answers[q.id] === opt}
									{@const isAnswer = graded && opt === q.correct}
									{@const isWrongPick = graded && isSelected && !isAnswer}
									<button
										type="button"
										disabled={graded}
										onclick={() => setAnswer(q.id, opt)}
										class="rounded-xl border px-4 py-3 text-sm font-semibold tracking-wide uppercase transition
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
							{#if graded && wrong}
								<p class="mt-4 text-xs text-zinc-400">
									Correct answer:
									<span class="font-medium text-white"
										>{q.correct === 'true' ? 'True' : 'False'}</span
									>
								</p>
							{/if}
						{:else if q.type === 'written'}
							<p class="mb-2 font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
								{askDefinition ? 'Term' : 'Definition'}
							</p>
							<p
								class="mb-5 font-display text-xl leading-snug text-white sm:text-2xl"
								style="font-variation-settings: 'opsz' 144;"
							>
								{q.prompt}
							</p>
							<input
								type="text"
								value={(answers[q.id] as string) ?? ''}
								oninput={(e) =>
									setAnswer(q.id, (e.currentTarget as HTMLInputElement).value)}
								disabled={graded}
								placeholder={askDefinition ? 'Type the definition' : 'Type the term'}
								autocomplete="off"
								class="block w-full rounded-xl border bg-zinc-950/60 px-4 py-3 text-base text-white placeholder:text-zinc-700 transition-colors focus:border-orange-500
									{graded && correct ? 'border-emerald-500/50' : ''}
									{graded && wrong ? 'border-red-500/50' : ''}
									{!graded ? 'border-zinc-800' : ''}"
							/>
							{#if graded && wrong}
								<p class="mt-4 text-xs text-zinc-400">
									Correct answer:
									<span class="font-medium text-white">{q.correct}</span>
								</p>
							{/if}
						{:else}
							<!-- matching -->
							<p class="mb-5 text-sm text-zinc-400">
								Pick the letter that matches each {askDefinition ? 'term' : 'definition'}.
							</p>
							<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
								<div class="space-y-3">
									{#each q.pairs as pair (pair.cardId)}
										{@const chosen = questionLetter(q, pair.cardId)}
										{@const pairCorrect = graded && chosen === pair.label}
										{@const pairWrong = graded && !pairCorrect}
										<div
											class="rounded-xl border bg-zinc-950/40 p-3
												{pairCorrect ? 'border-emerald-500/40' : ''}
												{pairWrong ? 'border-red-500/40' : ''}
												{!graded ? 'border-zinc-800' : ''}"
										>
											<p class="mb-2 text-sm text-zinc-100 wrap-break-word">{pair.term}</p>
											<div class="flex flex-wrap gap-1.5">
												{#each q.defs as def (def.label)}
													{@const isPicked = chosen === def.label}
													<button
														type="button"
														disabled={graded}
														onclick={() =>
															setMatchingAnswer(q.id, pair.cardId, def.label)}
														class="grid h-8 w-8 place-items-center rounded-md border font-mono text-xs transition
															{graded && def.label === pair.label
															? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
															: graded && isPicked
																? 'border-red-500/60 bg-red-500/10 text-red-300'
																: isPicked
																	? 'border-orange-500/60 bg-orange-500/10 text-orange-300'
																	: 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-orange-500/40 hover:text-orange-200'}
															disabled:cursor-default"
													>
														{def.label}
													</button>
												{/each}
											</div>
										</div>
									{/each}
								</div>
								<div class="space-y-2">
									<p class="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
										{askDefinition ? 'Definitions' : 'Terms'}
									</p>
									{#each q.defs as def (def.label)}
										<div class="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
											<span class="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-zinc-800 bg-zinc-950 font-mono text-xs text-orange-400">
												{def.label}
											</span>
											<span class="text-sm text-zinc-200 wrap-break-word">{def.definition}</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</li>
				{/each}
			</ol>

			{#if phase === 'taking'}
				<div class="mt-8 flex items-center justify-end">
					<button
						type="button"
						onclick={submit}
						class="rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600"
					>
						Submit answers
					</button>
				</div>
			{:else}
				<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
					<button
						type="button"
						onclick={retake}
						class="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600"
					>
						New quiz
					</button>
					<a
						href="/sets/{data.set.id}"
						class="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-900"
					>
						Back to set
					</a>
				</div>
			{/if}
		{/if}
	</div>
</section>
