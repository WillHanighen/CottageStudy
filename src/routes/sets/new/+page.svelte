<script lang="ts">
	import { enhance } from '$app/forms';
	import CardRowsEditor from '$lib/components/CardRowsEditor.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let saving = $state(false);
	let rows = $state([
		{ term: '', definition: '' },
		{ term: '', definition: '' },
		{ term: '', definition: '' }
	]);
</script>

<svelte:head>
	<title>New study set &mdash; CottageStudy</title>
</svelte:head>

<section class="relative py-16 sm:py-20">
	<div class="mx-auto max-w-4xl px-6">
		<div class="mb-10 rise-in">
			<a
				href="/dashboard"
				class="mb-6 inline-flex items-center gap-1.5 font-mono text-xs tracking-widest text-zinc-500 uppercase transition hover:text-zinc-300"
			>
				&larr; Library
			</a>
			<h1 class="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
				Create a
				<span class="font-display italic" style="font-variation-settings: 'opsz' 144, 'SOFT' 100;">
					study set
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
			<!-- Meta -->
			<div class="grain space-y-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 backdrop-blur-sm sm:p-8">
				<div>
					<label class="mb-2 block font-mono text-[10px] tracking-widest text-zinc-500 uppercase" for="title">
						Title
					</label>
					<input
						id="title"
						name="title"
						type="text"
						required
						maxlength="200"
						placeholder="Spanish vocabulary &mdash; week 7"
						value={form?.title ?? ''}
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
						class="block w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-white placeholder:text-zinc-700 transition-colors focus:border-orange-500"
					>{form?.description ?? ''}</textarea>
				</div>
				<label
					class="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3"
				>
					<input
						type="checkbox"
						name="is_public"
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
				<div class="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-900/80 px-4 py-3 backdrop-blur-xl">
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
							<span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
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
