<script lang="ts">
	import { onMount } from 'svelte';
	import {
		DEFAULT_MODEL,
		MAX_GUIDE_CHARS,
		loadApiKey,
		loadModel,
		saveApiKey,
		saveModel,
		clearApiKey
	} from '$lib/ai/byok';
	import { encryptEnvelope, fetchServerPublicKey } from '$lib/ai/encrypt';

	type Card = { term: string; definition: string };
	type GenerateOk = { status: 'ok'; title: string; cards: Card[] };
	type GenerateNeedsInfo = { status: 'needs_more_info'; reason: string };
	type GenerateResult = GenerateOk | GenerateNeedsInfo;

	let {
		open = $bindable(false),
		onResult
	}: {
		open?: boolean;
		onResult: (payload: { title: string; cards: Card[] }) => void;
	} = $props();

	let apiKey = $state('');
	let rememberKey = $state(true);
	let showKey = $state(false);
	let model = $state(DEFAULT_MODEL);
	let guide = $state('');
	let isGenerating = $state(false);
	let errorMessage = $state<string | null>(null);
	let needsMoreInfo = $state<string | null>(null);

	let dialogEl: HTMLDivElement | undefined = $state();

	onMount(() => {
		apiKey = loadApiKey();
		model = loadModel();
		rememberKey = !!apiKey;
	});

	$effect(() => {
		if (!open) return;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	});

	$effect(() => {
		if (open && dialogEl) {
			queueMicrotask(() => {
				const target = dialogEl?.querySelector<HTMLElement>(
					apiKey ? 'textarea[data-guide]' : 'input[data-api-key]'
				);
				target?.focus();
			});
		}
	});

	function close() {
		if (isGenerating) return;
		open = false;
		errorMessage = null;
		needsMoreInfo = null;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}

	function onGuideInput(e: Event) {
		const el = e.currentTarget as HTMLTextAreaElement;
		if (el.value.length > MAX_GUIDE_CHARS) {
			guide = el.value.slice(0, MAX_GUIDE_CHARS);
			el.value = guide;
		} else {
			guide = el.value;
		}
	}

	function describeError(err: unknown): string {
		if (err instanceof Error) {
			if (err.message === 'pubkey_missing' || err.message.startsWith('pubkey_fetch_failed')) {
				return 'Could not fetch the server public key. Are you signed in?';
			}
		}
		return 'Something went wrong. Please try again.';
	}

	async function generate() {
		errorMessage = null;
		needsMoreInfo = null;

		const trimmedKey = apiKey.trim();
		const trimmedGuide = guide.trim();
		if (!trimmedKey) {
			errorMessage = 'Enter your OpenRouter API key.';
			return;
		}
		if (!trimmedGuide) {
			errorMessage = 'Paste a study guide to generate cards from.';
			return;
		}
		if (trimmedGuide.length > MAX_GUIDE_CHARS) {
			errorMessage = `Study guide is too long (max ${MAX_GUIDE_CHARS.toLocaleString()} characters).`;
			return;
		}

		const usedModel = (model.trim() || DEFAULT_MODEL).trim();

		if (rememberKey) {
			saveApiKey(trimmedKey);
		} else {
			clearApiKey();
		}
		saveModel(usedModel);

		isGenerating = true;
		try {
			const jwk = await fetchServerPublicKey();
			const envelope = await encryptEnvelope(
				{ apiKey: trimmedKey, guide: trimmedGuide, model: usedModel },
				jwk
			);

			const res = await fetch('/api/ai/generate-cards', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'same-origin',
				body: JSON.stringify(envelope)
			});

			if (!res.ok) {
				let serverError = `Server error (${res.status}).`;
				try {
					const j = (await res.json()) as { error?: string; message?: string };
					if (j?.error === 'auth') serverError = 'OpenRouter rejected the API key.';
					else if (j?.error === 'rate_limit') serverError = 'Too many requests — slow down a bit.';
					else if (j?.error === 'rate_limited') serverError = 'You are generating too quickly. Please wait a minute.';
					else if (j?.error === 'guide_too_long') serverError = `Study guide is too long (max ${MAX_GUIDE_CHARS.toLocaleString()} chars).`;
					else if (j?.error === 'unauthorized') serverError = 'Please sign in again.';
					else if (j?.message) serverError = j.message;
				} catch {
					// ignore
				}
				errorMessage = serverError;
				return;
			}

			const body = (await res.json()) as { ok?: boolean; result?: GenerateResult };
			const result = body?.result;
			if (!result) {
				errorMessage = 'Empty response from server.';
				return;
			}

			if (result.status === 'needs_more_info') {
				needsMoreInfo = result.reason || 'Add more detail to the study guide and try again.';
				return;
			}

			onResult({
				title: result.title ?? '',
				cards: Array.isArray(result.cards) ? result.cards : []
			});
			open = false;
			guide = '';
		} catch (err) {
			errorMessage = describeError(err);
		} finally {
			isGenerating = false;
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<div class="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
		<button
			type="button"
			aria-label="Close"
			tabindex="-1"
			onclick={close}
			class="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
		></button>

		<div
			bind:this={dialogEl}
			role="dialog"
			aria-modal="true"
			aria-labelledby="ai-modal-title"
			class="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-zinc-800/80 bg-zinc-950/95 shadow-2xl shadow-black/60 backdrop-blur-xl sm:rounded-3xl"
		>
			<div class="flex items-start justify-between gap-4 border-b border-zinc-800/60 px-6 py-5">
				<div>
					<h2
						id="ai-modal-title"
						class="mt-1 text-2xl font-semibold tracking-tight text-white"
					>
						Generate cards
						<span
							class="font-display italic text-orange-400"
							style="font-variation-settings: 'opsz' 144, 'SOFT' 100;"
						>
							from a study guide
						</span>
					</h2>
				</div>
				<button
					type="button"
					aria-label="Close dialog"
					onclick={close}
					disabled={isGenerating}
					class="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-white disabled:opacity-40"
				>
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
					</svg>
				</button>
			</div>

			<div class="flex-1 space-y-6 overflow-y-auto px-6 py-6">
				<!-- BYOK -->
				<div class="space-y-3">
					<div class="flex items-end justify-between gap-3">
						<label
							for="ai-api-key"
							class="block font-mono text-[12px] tracking-widest text-zinc-500 uppercase"
						>
							OpenRouter API key
						</label>
						<a
							href="https://openrouter.ai/keys"
							target="_blank"
							rel="noopener noreferrer"
							class="text-xs text-orange-400 underline-offset-4 hover:text-orange-300 hover:underline"
						>
							Get a key &rarr;
						</a>
					</div>
					<div class="relative">
						<input
							id="ai-api-key"
							data-api-key
							type={showKey ? 'text' : 'password'}
							bind:value={apiKey}
							autocomplete="off"
							spellcheck="false"
							placeholder="sk-or-v1-…"
							class="block w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 pr-20 font-mono text-sm text-white placeholder:text-zinc-700 transition-colors focus:border-orange-500 focus:outline-none"
						/>
						<button
							type="button"
							onclick={() => (showKey = !showKey)}
							class="absolute top-1/2 right-3 -translate-y-1/2 rounded px-2 py-1 font-mono text-[10px] tracking-widest text-zinc-500 uppercase transition hover:bg-zinc-800 hover:text-zinc-200"
						>
							{showKey ? 'Hide' : 'Show'}
						</button>
					</div>

					<div
						class="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-[11px] leading-relaxed text-emerald-200/90"
					>
						<svg
							class="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" stroke-linejoin="round" />
							<path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
						<span>
							Your key is <strong class="font-semibold text-emerald-100">never stored on our servers</strong> — encrypted in your browser, used in-memory for one OpenRouter call, then discarded. The toggle below only controls this browser's local cache.
						</span>
					</div>

					<label class="flex cursor-pointer items-start gap-3 text-xs text-zinc-400">
						<input
							type="checkbox"
							bind:checked={rememberKey}
							class="mt-0.5 h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-orange-500 focus:ring-orange-500"
						/>
						<span>
							Remember on this browser
							<span class="block text-[11px] text-zinc-500">
								Saves the key to this browser's localStorage so you don't paste it again next time. Uncheck to use it once and forget it.
							</span>
						</span>
					</label>
				</div>

				<!-- Model -->
				<div>
					<label
						for="ai-model"
						class="mb-2 block font-mono text-[10px] tracking-widest text-zinc-500 uppercase"
					>
						Model
					</label>
					<input
						id="ai-model"
						type="text"
						bind:value={model}
						autocomplete="off"
						spellcheck="false"
						placeholder={DEFAULT_MODEL}
						class="block w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 font-mono text-xs text-white placeholder:text-zinc-700 transition-colors focus:border-orange-500 focus:outline-none"
					/>
					<p class="mt-1.5 text-[11px] text-zinc-500">
						Defaults to <code class="text-orange-300">{DEFAULT_MODEL}</code>. Any OpenRouter slug works.
					</p>
				</div>

				<!-- Guide -->
				<div>
					<div class="mb-2 flex items-end justify-between">
						<label
							for="ai-guide"
							class="block font-mono text-[10px] tracking-widest text-zinc-500 uppercase"
						>
							Study guide
						</label>
						<span
							class="font-mono text-[12px] tabular-nums {guide.length > MAX_GUIDE_CHARS * 0.95
								? 'text-orange-300'
								: 'text-zinc-500'}"
						>
							{guide.length.toLocaleString()} / {MAX_GUIDE_CHARS.toLocaleString()}
						</span>
					</div>
					<textarea
						id="ai-guide"
						data-guide
						value={guide}
						oninput={onGuideInput}
						rows="10"
						placeholder="Paste your notes, outline, or chapter summary here. The model will decide whether there's enough material to make flashcards."
						class="block w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm leading-relaxed text-white placeholder:text-zinc-700 transition-colors focus:border-orange-500 focus:outline-none"
					></textarea>
				</div>

				{#if errorMessage}
					<div
						class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
					>
						{errorMessage}
					</div>
				{/if}

				{#if needsMoreInfo}
					<div
						class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
					>
						<p class="font-medium">More information needed</p>
						<p class="mt-1 text-amber-200/80">{needsMoreInfo}</p>
					</div>
				{/if}
			</div>

			<div
				class="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-800/60 bg-zinc-950/80 px-6 py-4 md:flex-nowrap md:justify-between"
			>
				<p class="hidden text-[11px] text-zinc-500 md:block">
					Encrypted before sending. Never stored on our servers.
				</p>
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={close}
						disabled={isGenerating}
						class="shrink-0 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-medium whitespace-nowrap text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						type="button"
						onclick={generate}
						disabled={isGenerating}
						class="inline-flex shrink-0 items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold whitespace-nowrap text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-wait disabled:opacity-70"
					>
						{#if isGenerating}
							<span
								class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
							></span>
							<span>Generating&hellip;</span>
						{:else}
							<span>Generate cards</span>
							<span aria-hidden="true">&rarr;</span>
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
