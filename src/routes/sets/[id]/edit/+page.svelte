<script lang="ts">
	import { enhance } from '$app/forms';
	import CardRowsEditor from '$lib/components/CardRowsEditor.svelte';
	import CharBudgetLabel from '$lib/components/CharBudgetLabel.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import {
		MAX_SET_DESCRIPTION_CHARS,
		MAX_SET_TITLE_CHARS
	} from '$lib/notecardLimits';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let saving = $state(false);

	// svelte-ignore state_referenced_locally
	let titleEdit = $state(data.set.title);
	// svelte-ignore state_referenced_locally
	let descriptionEdit = $state(data.set.description);
	// svelte-ignore state_referenced_locally
	let syncedSetId = $state(data.set.id);

	$effect(() => {
		if (syncedSetId !== data.set.id) {
			titleEdit = data.set.title;
			descriptionEdit = data.set.description;
			syncedSetId = data.set.id;
		}
	});

	// svelte-ignore state_referenced_locally
	let rows = $state(
		// svelte-ignore state_referenced_locally
		data.set.cards.length > 0
			? data.set.cards.map((c) => ({ term: c.term, definition: c.definition }))
			: [
					{ term: '', definition: '' },
					{ term: '', definition: '' }
				]
	);
</script>

<Seo title="Editing — {data.set.title}" titleTemplate={false} path="/sets/{data.set.id}/edit" noindex />

<section class="relative py-16 sm:py-20">
	<div class="mx-auto max-w-4xl px-6">
		<div class="mb-10 rise-in">
			<a
				href="/sets/{data.set.id}"
				class="mb-6 inline-flex items-center gap-1.5 font-mono text-xs tracking-widest text-zinc-500 uppercase transition hover:text-zinc-300"
			>
				&larr; Back to set
			</a>
			<h1 class="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
				Edit
				<span class="font-display italic" style="font-variation-settings: 'opsz' 144;">
					{data.set.title}
				</span>
			</h1>
		</div>

		{#if form?.error}
			<div
				class="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
			>
				{form.error}
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
			<div class="grain space-y-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 backdrop-blur-sm sm:p-8">
				<div>
					<div class="mb-2 flex items-end justify-between gap-3">
						<label
							class="block font-mono text-[10px] tracking-widest text-zinc-500 uppercase"
							for="title"
							>Title</label
						>
						<CharBudgetLabel length={titleEdit.length} max={MAX_SET_TITLE_CHARS} />
					</div>
					<input
						id="title"
						name="title"
						type="text"
						required
						maxlength={MAX_SET_TITLE_CHARS}
						bind:value={titleEdit}
						class="block w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-lg text-white transition-colors focus:border-orange-500"
					/>
				</div>
				<div>
					<div class="mb-2 flex items-end justify-between gap-3">
						<label class="block font-mono text-[10px] tracking-widest text-zinc-500 uppercase" for="description"
							>Description</label
						>
						<CharBudgetLabel length={descriptionEdit.length} max={MAX_SET_DESCRIPTION_CHARS} />
					</div>
					<textarea
						id="description"
						name="description"
						rows="2"
						maxlength={MAX_SET_DESCRIPTION_CHARS}
						bind:value={descriptionEdit}
						class="block w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-white transition-colors focus:border-orange-500"
					></textarea>
				</div>
				<label
					class="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3"
					class:opacity-60={data.set.public_locked === 1}
					class:pointer-events-none={data.set.public_locked === 1}
				>
					<input
						type="checkbox"
						name="is_public"
						checked={data.set.is_public === 1}
						disabled={data.set.public_locked === 1}
						class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-orange-500 focus:ring-orange-500 disabled:cursor-not-allowed"
					/>
					<span class="text-sm">
						<span class="text-white">Public</span>
						<span class="block text-xs text-zinc-500">Anyone with the link can view this set.</span>
					</span>
				</label>
				{#if data.set.public_locked === 1}
					<p class="text-xs text-amber-400/90">
						This set was removed from public search after multiple community reports. It cannot be made
						public again.
					</p>
				{/if}
			</div>

			<div>
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-lg font-semibold text-white">Cards</h2>
					<p class="font-mono text-xs text-zinc-500">{rows.length} entries</p>
				</div>
				<CardRowsEditor bind:rows />
			</div>

			<div class="sticky bottom-4 z-10">
				<div class="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-900/80 px-4 py-3 backdrop-blur-xl">
					<a
						href="/sets/{data.set.id}"
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
							<span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
							Saving&hellip;
						{:else}
							Save changes
						{/if}
					</button>
				</div>
			</div>
		</form>
	</div>
</section>
