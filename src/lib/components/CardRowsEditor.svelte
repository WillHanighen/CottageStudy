<script lang="ts">
	type Row = { term: string; definition: string };

	let {
		rows = $bindable<Row[]>([{ term: '', definition: '' }, { term: '', definition: '' }, { term: '', definition: '' }])
	}: { rows: Row[] } = $props();

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
			class="grain group relative grid grid-cols-1 gap-0 overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm transition-all focus-within:border-orange-500/40 hover:border-zinc-700 md:grid-cols-[64px_1fr_1px_1fr_auto]"
		>
			<!-- Index + reorder -->
			<div class="flex flex-col items-center justify-center gap-1 border-b border-zinc-800/60 bg-zinc-950/40 py-3 md:border-r md:border-b-0">
				<span class="font-mono text-xs tracking-widest text-zinc-500">{String(i + 1).padStart(2, '0')}</span>
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
				<label
					for="row-term-{i}"
					class="mb-2 block font-mono text-[10px] tracking-widest text-zinc-500 uppercase"
				>
					Term
				</label>
				<textarea
					id="row-term-{i}"
					data-row-term
					bind:value={row.term}
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
				<label
					for="row-def-{i}"
					class="mb-2 block font-mono text-[10px] tracking-widest text-zinc-500 uppercase"
				>
					Definition
				</label>
				<textarea
					id="row-def-{i}"
					bind:value={row.definition}
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
						<path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1.6 14.2A2 2 0 0115.4 22H8.6a2 2 0 01-2-1.8L5 6" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</button>
			</div>
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
