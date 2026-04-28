<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { useClerkSafe } from '$lib/clerk';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	type TurnstileApi = {
		render: (target: string | HTMLElement, opts: Record<string, any>) => string;
		remove: (widgetId: string) => void;
		reset: (widgetId?: string) => void;
		ready?: (cb: () => void) => void;
	};

	// Loosely typed Clerk client to avoid pulling in the heavy types here. We only call
	// the stable `clerk.client.signIn.authenticateWithRedirect` method exposed by Clerk JS.
	type ClerkClient = {
		loaded?: boolean;
		client?: {
			signIn?: {
				authenticateWithRedirect: (params: {
					strategy: string;
					redirectUrl: string;
					redirectUrlComplete: string;
				}) => Promise<unknown>;
			};
		};
	};

	let {
		turnstileSiteKey,
		redirectTo
	}: {
		turnstileSiteKey: string;
		redirectTo: string;
	} = $props();

	const ctx = useClerkSafe();

	let turnstileToken = $state<string | null>(null);
	let widgetReady = $state(false);
	let busyProvider = $state<string | null>(null);
	let errorMsg = $state<string | null>(null);

	let widgetEl: HTMLDivElement | null = null;
	let widgetId: string | null = null;

	const isSignedIn = $derived(!!ctx.auth.userId);

	$effect(() => {
		if (isSignedIn) {
			void goto(redirectTo, { replaceState: true });
		}
	});

	function getTurnstile(): TurnstileApi | null {
		return (window as unknown as { turnstile?: TurnstileApi }).turnstile ?? null;
	}

	function renderWidget() {
		if (widgetId !== null) return; // already mounted
		const ts = getTurnstile();
		if (!ts || !widgetEl || !turnstileSiteKey) return;
		widgetId = ts.render(widgetEl, {
			sitekey: turnstileSiteKey,
			theme: 'dark',
			callback: (token: string) => {
				turnstileToken = token;
				widgetReady = true;
			},
			'error-callback': () => {
				errorMsg = 'Captcha failed to load. Refresh and try again.';
			},
			'expired-callback': () => {
				turnstileToken = null;
				widgetReady = false;
			}
		});
	}

	onMount(() => {
		const id = 'cf-turnstile-script';
		const existing = document.getElementById(id);
		if (!existing) {
			const script = document.createElement('script');
			script.id = id;
			script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
			script.async = true;
			script.defer = true;
			script.onload = renderWidget;
			document.head.appendChild(script);
		} else if (getTurnstile()) {
			// Script already loaded from a previous mount; render immediately.
			renderWidget();
		} else {
			existing.addEventListener('load', renderWidget, { once: true });
		}

		return () => {
			const ts = getTurnstile();
			if (ts && widgetId !== null) {
				try {
					ts.remove(widgetId);
				} catch {
					// noop — widget may already be gone (HMR, etc.)
				}
			}
			widgetId = null;
		};
	});

	async function authenticate(strategy: 'oauth_google' | 'oauth_github') {
		errorMsg = null;
		if (!turnstileSiteKey) {
			errorMsg = 'Sign-in is not yet configured. Set Turnstile keys in your environment.';
			return;
		}
		if (!turnstileToken) {
			errorMsg = 'Please complete the verification first.';
			return;
		}
		const clerk = ctx.clerk as ClerkClient | null;
		const signIn = clerk?.client?.signIn;
		if (!clerk?.loaded || !signIn) {
			errorMsg = 'Authentication client is still loading. Try again in a moment.';
			return;
		}
		busyProvider = strategy;
		try {
			const verifyRes = await fetch('/api/turnstile/verify', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ token: turnstileToken })
			});
			const verifyJson = (await verifyRes.json()) as { success: boolean; error?: string };
			if (!verifyJson.success) {
				errorMsg = verifyJson.error ?? 'Captcha verification failed.';
				busyProvider = null;
				const ts = getTurnstile();
				if (ts && widgetId !== null) ts.reset(widgetId);
				turnstileToken = null;
				widgetReady = false;
				return;
			}

			await signIn.authenticateWithRedirect({
				strategy,
				redirectUrl: '/sign-in/sso-callback',
				redirectUrlComplete: redirectTo
			});
			// Browser will redirect; if we somehow return here, just clear the busy state.
			busyProvider = null;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Sign-in failed. Try again.';
			busyProvider = null;
		}
	}
</script>

<div class="space-y-4">
	<!-- Turnstile widget -->
	<div class="mb-4 flex justify-center">
		<div bind:this={widgetEl} class="cf-turnstile"></div>
	</div>

	{#if errorMsg}
		<div
			class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-xs text-red-300"
		>
			{errorMsg}
		</div>
	{/if}

	<!-- GitHub -->
	<button
		type="button"
		disabled={!widgetReady || busyProvider !== null}
		onclick={() => authenticate('oauth_github')}
		class="auth-btn group flex w-full items-center justify-center gap-3 rounded-lg border border-transparent bg-[#24292F] px-4 py-3 text-sm font-medium text-white shadow-lg shadow-black/20 transition-all hover:scale-[1.02] hover:bg-[#24292F]/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
	>
		{#if busyProvider === 'oauth_github'}
			<span
				class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
			></span>
			<span>Connecting&hellip;</span>
		{:else}
			<svg class="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
				<path
					d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.93c.58.11.79-.25.79-.55v-2.1c-3.2.7-3.87-1.54-3.87-1.54-.53-1.33-1.3-1.69-1.3-1.69-1.07-.74.08-.73.08-.73 1.18.08 1.81 1.22 1.81 1.22 1.05 1.8 2.75 1.28 3.43.98.11-.76.41-1.28.74-1.58-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.27 1.2-3.06-.12-.29-.52-1.46.12-3.04 0 0 .97-.31 3.17 1.17a10.9 10.9 0 0 1 5.78 0c2.2-1.48 3.16-1.17 3.16-1.17.64 1.58.24 2.75.12 3.04.75.79 1.2 1.81 1.2 3.06 0 4.41-2.68 5.38-5.24 5.66.42.36.79 1.07.79 2.16v3.2c0 .31.21.67.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
				></path>
			</svg>
			Continue with GitHub
		{/if}
	</button>

	<!-- Google -->
	<button
		type="button"
		disabled={!widgetReady || busyProvider !== null}
		onclick={() => authenticate('oauth_google')}
		class="auth-btn group flex w-full items-center justify-center gap-3 rounded-lg border border-transparent bg-white px-4 py-3 text-sm font-medium text-zinc-900 shadow-lg shadow-black/5 transition-all hover:scale-[1.02] hover:bg-zinc-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
	>
		{#if busyProvider === 'oauth_google'}
			<span
				class="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700"
			></span>
			<span>Connecting&hellip;</span>
		{:else}
			<svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
				<path
					fill="#4285F4"
					d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
				/>
				<path
					fill="#34A853"
					d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
				/>
				<path
					fill="#FBBC05"
					d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
				/>
				<path
					fill="#EA4335"
					d="M12 4.66c1.6 0 3.04.55 4.19 1.6l3.14-3.14C17.46 1.05 14.98 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
				/>
			</svg>
			Continue with Google
		{/if}
	</button>
</div>
