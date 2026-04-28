<script lang="ts">
	import { enhance } from '$app/forms';
	import CardRowsEditor from '$lib/components/CardRowsEditor.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let saving = $state(false);
	let title = $state('');
	let description = $state('');
	let isPublic = $state(false);
	let rows = $state([
		{ term: '', definition: '' },
		{ term: '', definition: '' },
		{ term: '', definition: '' }
	]);

	// Re-hydrate form fields from a failed action submission so the user keeps their input.
	$effect(() => {
		if (form?.title !== undefined) title = form.title;
		if (form?.description !== undefined) description = form.description;
	});

	let importStatus = $state<{ kind: 'ok' | 'error'; message: string } | null>(null);
	let importInput: HTMLInputElement | undefined = $state();

	type ImportShape = {
		title?: unknown;
		description?: unknown;
		is_public?: unknown;
		cards?: unknown;
	};

	async function onImport(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const data: ImportShape = JSON.parse(text);

			if (!data || typeof data !== 'object' || !Array.isArray(data.cards)) {
				throw new Error('Missing a "cards" array.');
			}

			const parsedRows = (data.cards as unknown[])
				.map((c) => {
					const obj = (c ?? {}) as Record<string, unknown>;
					return {
						term: String(obj.term ?? ''),
						definition: String(obj.definition ?? '')
					};
				})
				.filter((r) => r.term.trim() || r.definition.trim());

			if (typeof data.title === 'string' && data.title.trim()) {
				title = data.title.slice(0, 200);
			}
			if (typeof data.description === 'string') {
				description = data.description;
			}
			if (typeof data.is_public === 'boolean') {
				isPublic = data.is_public;
			}
			rows = parsedRows.length > 0 ? parsedRows : [{ term: '', definition: '' }];

			importStatus = {
				kind: 'ok',
				message: `Loaded ${parsedRows.length} ${parsedRows.length === 1 ? 'card' : 'cards'} from ${file.name}.`
			};
		} catch (err) {
			const detail = err instanceof Error ? err.message : 'Could not parse file.';
			importStatus = {
				kind: 'error',
				message: `Import failed: ${detail}`
			};
		} finally {
			input.value = '';
		}
	}
</script>

<Seo
	title="New study set"
	description="Create a new flashcard set on CottageStudy."
	path="/sets/new"
	noindex
/>

<section class="relative py-16 sm:py-20">
	<div class="mx-auto max-w-4xl px-6">
		<div class="mb-10 rise-in">
			<a
				href="/dashboard"
				class="mb-6 inline-flex items-center gap-1.5 font-mono text-xs tracking-widest text-zinc-500 uppercase transition hover:text-zinc-300"
			>
				&larr; Library
			</a>
			<div class="flex flex-wrap items-end justify-between gap-4">
				<h1 class="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
					Create a
					<span
						class="font-display italic"
						style="font-variation-settings: 'opsz' 144, 'SOFT' 100;"
					>
						study set
					</span>
				</h1>
				<div class="flex items-center gap-2">
					<input
						bind:this={importInput}
						type="file"
						accept="application/json,.json"
						onchange={onImport}
						class="sr-only"
					/>
					<button
						type="button"
						onclick={() => importInput?.click()}
						class="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-orange-500/40 hover:bg-zinc-800 hover:text-orange-300"
					>
						<svg
							class="h-4 w-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
						>
							<path d="M12 16V4" stroke-linecap="round" />
							<path d="M7 9l5-5 5 5" stroke-linecap="round" stroke-linejoin="round" />
							<path d="M5 20h14" stroke-linecap="round" />
						</svg>
						Import JSON
					</button>
				</div>
			</div>
		</div>

		{#if form?.error}
			<div
				class="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
			>
				{form.error}
			</div>
		{/if}

		{#if importStatus}
			<div
				class="mb-6 rounded-lg border px-4 py-3 text-sm {importStatus.kind === 'ok'
					? 'border-orange-500/30 bg-orange-500/10 text-orange-200'
					: 'border-red-500/30 bg-red-500/10 text-red-300'}"
			>
				{importStatus.message}
			</div>
		{/if}

		<form
			method="POST"
			use:enhance={() => {
				saving = true;
				return async ({ update }) => {
					await update();
					saving = false;
				};
			}}
			class="space-y-8"
		>
			<!-- Meta -->
			<div
				class="grain space-y-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 backdrop-blur-sm sm:p-8"
			>
				<div>
					<label
						class="mb-2 block font-mono text-[10px] tracking-widest text-zinc-500 uppercase"
						for="title"
					>
						Title
					</label>
					<input
						id="title"
						name="title"
						type="text"
						required
						maxlength="200"
						placeholder="Spanish vocabulary &mdash; week 7"
						bind:value={title}
						class="block w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-lg text-white placeholder:text-zinc-700 transition-colors focus:border-orange-500"
					/>
				</div>
				<div>
					<label
						class="mb-2 block font-mono text-[10px] tracking-widest text-zinc-500 uppercase"
						for="description"
					>
						Description <span class="font-sans normal-case opacity-60">(optional)</span>
					</label>
					<textarea
						id="description"
						name="description"
						rows="2"
						placeholder="What's this set for?"
						bind:value={description}
						class="block w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-white placeholder:text-zinc-700 transition-colors focus:border-orange-500"
					></textarea>
				</div>
				<label
					class="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3"
				>
					<input
						type="checkbox"
						name="is_public"
						bind:checked={isPublic}
						class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-orange-500 focus:ring-orange-500"
					/>
					<span class="text-sm">
						<span class="text-white">Make this set public</span>
						<span class="block text-xs text-zinc-500">
							Anyone with the link will be able to view it (you can change this later).
						</span>
					</span>
				</label>
			</div>

			<!-- Cards -->
			<div>
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-lg font-semibold text-white">Cards</h2>
					<p class="font-mono text-xs text-zinc-500">{rows.length} entries</p>
				</div>
				<CardRowsEditor bind:rows />
			</div>

			<!-- Submit -->
			<div class="sticky bottom-4 z-10">
				<div
					class="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-900/80 px-4 py-3 backdrop-blur-xl"
				>
					<a
						href="/dashboard"
						class="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
					>
						Cancel
					</a>
					<button
						type="submit"
						disabled={saving}
						class="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-wait disabled:opacity-70"
					>
						{#if saving}
							<span
								class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
							></span>
							Saving&hellip;
						{:else}
							Create set &rarr;
						{/if}
					</button>
				</div>
			</div>
		</form>
	</div>
</section>
