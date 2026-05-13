<script lang="ts">
	import type { CardRow } from '$lib/cardRow';
	import CharBudgetLabel from '$lib/components/CharBudgetLabel.svelte';
	import {
		MAX_CARD_DEFINITION_CHARS,
		MAX_CARD_TERM_CHARS,
		MAX_MC_DISTRACTORS_PER_SIDE
	} from '$lib/notecardLimits';

	let {
		rows = $bindable<CardRow[]>([
			{ term: '', definition: '' },
			{ term: '', definition: '' },
			{ term: '', definition: '' }
		])
	}: { rows: CardRow[] } = $props();

	function padThree(row: CardRow, side: 'incorrect_definitions' | 'incorrect_terms'): string[] {
		const a = row[side];
		const arr = Array.isArray(a) ? a : [];
		return [0, 1, 2].map((i) => (typeof arr[i] === 'string' ? arr[i] : '')).slice(0, MAX_MC_DISTRACTORS_PER_SIDE);
	}

	function getSlot(row: CardRow, side: 'incorrect_definitions' | 'incorrect_terms', slot: number): string {
		return padThree(row, side)[slot] ?? '';
	}

	function setDistractor(
		i: number,
		side: 'incorrect_definitions' | 'incorrect_terms',
		slot: number,
		value: string
	) {
		const maxC = side === 'incorrect_definitions' ? MAX_CARD_DEFINITION_CHARS : MAX_CARD_TERM_CHARS;
		const row = rows[i];
		const slots = padThree(row, side);
		slots[slot] = value.slice(0, maxC);
		const compact = slots.map((s) => s.trim()).filter(Boolean);
		const next: CardRow = { ...row };
		if (compact.length > 0) {
			next[side] = compact;
		} else {
			delete next[side];
		}
		rows = rows.map((r, j) => (j === i ? next : r));
	}

	function add() {
		rows = [...rows, { term: '', definition: '' }];
		queueMicrotask(() => {
			const inputs = document.querySelectorAll<HTMLTextAreaElement>('textarea[data-row-term]');
			inputs[inputs.length - 1]?.focus();
		});
	}

	function remove(idx: number) {
		if (rows.length <= 1) return;
		rows = rows.filter((_, i) => i !== idx);
	}

	function move(idx: number, dir: -1 | 1) {
		const next = idx + dir;
		if (next < 0 || next >= rows.length) return;
		const copy = rows.slice();
		[copy[idx], copy[next]] = [copy[next], copy[idx]];
		rows = copy;
	}

	function autoresize(node: HTMLTextAreaElement, _value: string) {
		const resize = () => {
			node.style.height = 'auto';
			node.style.height = node.scrollHeight + 'px';
		};
		queueMicrotask(resize);
		return {
			update(_v: string) {
				resize();
			}
		};
	}
</script>

<div class="space-y-3">
	{#each rows as row, i (i)}
		<div
			class="overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm transition-all focus-within:border-orange-500/40 hover:border-zinc-700"
		>
			<div
				class="group relative grid grid-cols-1 gap-0 md:grid-cols-[64px_1fr_1px_1fr_auto]"
			>
				<!-- Index + reorder -->
				<div
					class="flex flex-col items-center justify-center gap-1 border-b border-zinc-800/60 bg-zinc-950/40 py-3 md:border-r md:border-b-0"
				>
					<span class="font-mono text-xs tracking-widest text-zinc-500"
						>{String(i + 1).padStart(2, '0')}</span
					>
					<div class="flex gap-0.5">
						<button
							type="button"
							aria-label="Move up"
							onclick={() => move(i, -1)}
							disabled={i === 0}
							class="grid h-5 w-5 place-items-center rounded text-zinc-500 transition hover:bg-zinc-800 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
						>
							<svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<path d="M18 15l-6-6-6 6" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</button>
						<button
							type="button"
							aria-label="Move down"
							onclick={() => move(i, 1)}
							disabled={i === rows.length - 1}
							class="grid h-5 w-5 place-items-center rounded text-zinc-500 transition hover:bg-zinc-800 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
						>
							<svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</button>
					</div>
				</div>

				<!-- Term -->
				<div class="px-5 py-4">
					<div class="mb-2 flex items-end justify-between gap-3">
						<label
							for="row-term-{i}"
							class="block font-mono text-[10px] tracking-widest text-zinc-500 uppercase"
						>
							Term
						</label>
						<CharBudgetLabel length={row.term.length} max={MAX_CARD_TERM_CHARS} />
					</div>
					<textarea
						id="row-term-{i}"
						data-row-term
						bind:value={row.term}
						maxlength={MAX_CARD_TERM_CHARS}
						rows="1"
						use:autoresize={row.term}
						placeholder="Enter term"
						class="block w-full resize-none border-0 bg-transparent p-0 text-base text-white placeholder:text-zinc-700 focus:ring-0 focus:outline-none"
					></textarea>
				</div>

				<!-- Divider -->
				<div class="hidden md:block">
					<div class="h-full w-px bg-zinc-800/70"></div>
				</div>

				<!-- Definition -->
				<div class="border-t border-zinc-800/60 px-5 py-4 md:border-t-0">
					<div class="mb-2 flex items-end justify-between gap-3">
						<label
							for="row-def-{i}"
							class="block font-mono text-[10px] tracking-widest text-zinc-500 uppercase"
						>
							Definition
						</label>
						<CharBudgetLabel length={row.definition.length} max={MAX_CARD_DEFINITION_CHARS} />
					</div>
					<textarea
						id="row-def-{i}"
						bind:value={row.definition}
						maxlength={MAX_CARD_DEFINITION_CHARS}
						rows="1"
						use:autoresize={row.definition}
						placeholder="Enter definition"
						class="block w-full resize-none border-0 bg-transparent p-0 text-base text-white placeholder:text-zinc-700 focus:ring-0 focus:outline-none"
					></textarea>
				</div>

				<!-- Delete -->
				<div class="flex items-center justify-end p-3">
					<button
						type="button"
						aria-label="Remove card"
						onclick={() => remove(i)}
						disabled={rows.length <= 1}
						class="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
					>
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
							<path
								d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1.6 14.2A2 2 0 0115.4 22H8.6a2 2 0 01-2-1.8L5 6"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</button>
				</div>
			</div>

			<details class="group/d border-t border-zinc-800/60 bg-zinc-950/25">
				<summary
					class="cursor-pointer list-none px-5 py-3 font-mono text-[10px] tracking-widest text-zinc-500 uppercase transition hover:text-zinc-300 [&::-webkit-details-marker]:hidden"
				>
					<span class="inline-flex items-center gap-2">
						<span
							class="inline-block transition group-open/d:rotate-90"
							aria-hidden="true"
						>
							<svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</span>
						Wrong answers (optional, multiple choice)
					</span>
				</summary>
				<div class="grid gap-4 border-t border-zinc-800/40 px-5 py-4 md:grid-cols-2">
					<div>
						<p class="mb-2 text-xs text-zinc-500">
							When the prompt is the <strong class="text-zinc-400">term</strong>, these fake definitions
							fill wrong choices.
						</p>
						<div class="space-y-2">
							{#each [0, 1, 2] as slot (slot)}
								<input
									type="text"
									maxlength={MAX_CARD_DEFINITION_CHARS}
									value={getSlot(row, 'incorrect_definitions', slot)}
									oninput={(e) =>
										setDistractor(i, 'incorrect_definitions', slot, e.currentTarget.value)}
									class="w-full rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-orange-500/40 focus:outline-none"
									placeholder="Wrong definition {slot + 1}"
								/>
							{/each}
						</div>
					</div>
					<div>
						<p class="mb-2 text-xs text-zinc-500">
							When the prompt is the <strong class="text-zinc-400">definition</strong>, these fake terms
							fill wrong choices.
						</p>
						<div class="space-y-2">
							{#each [0, 1, 2] as slot (slot)}
								<input
									type="text"
									maxlength={MAX_CARD_TERM_CHARS}
									value={getSlot(row, 'incorrect_terms', slot)}
									oninput={(e) =>
										setDistractor(i, 'incorrect_terms', slot, e.currentTarget.value)}
									class="w-full rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-orange-500/40 focus:outline-none"
									placeholder="Wrong term {slot + 1}"
								/>
							{/each}
						</div>
					</div>
				</div>
			</details>
		</div>
	{/each}

	<button
		type="button"
		onclick={add}
		class="grid w-full place-items-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/20 py-5 text-sm font-medium text-zinc-400 transition hover:border-orange-500/50 hover:bg-orange-500/5 hover:text-orange-300"
	>
		+ Add card
	</button>

	<!-- Hidden serialized payload for form submit -->
	<input type="hidden" name="cards" value={JSON.stringify(rows)} />
</div>
