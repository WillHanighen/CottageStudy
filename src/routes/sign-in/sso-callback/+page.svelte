<script lang="ts">
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { useClerkSafe } from '$lib/clerk';

	type ClerkClient = {
		loaded?: boolean;
		handleRedirectCallback?: (
			params: Record<string, string | boolean | null | undefined>
		) => Promise<unknown>;
		client?: {
			signIn?: { status?: string | null } | null;
			signUp?: { status?: string | null } | null;
		};
	};

	const ctx = useClerkSafe();

	let errorMsg = $state<string | null>(null);
	let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
	let bailHandle: ReturnType<typeof setTimeout> | undefined;
	let started = false;

	function bailToSignIn(reason?: string) {
		if (bailHandle) return;
		if (reason) console.warn('[sso-callback] bailing to /sign-in:', reason);
		bailHandle = setTimeout(() => {
			void goto('/sign-in', { replaceState: true });
		}, 1500);
	}

	$effect(() => {
		if (started) return;
		if (!ctx.isLoaded) return;

		const clerk = ctx.clerk as ClerkClient | null;
		if (!clerk?.loaded || typeof clerk.handleRedirectCallback !== 'function') return;

		if (ctx.auth.userId) {
			void goto('/dashboard', { replaceState: true });
			started = true;
			return;
		}

		// If we landed here without an active sign-in/up flow (e.g. the user refreshed
		// after the OAuth handshake completed, or hit this URL directly), there's
		// nothing to finish — bounce back to /sign-in instead of spinning forever.
		const signInStatus = clerk.client?.signIn?.status ?? null;
		const signUpStatus = clerk.client?.signUp?.status ?? null;
		const hasOAuthState =
			typeof window !== 'undefined' &&
			(window.location.search.includes('__clerk') ||
				window.location.hash.includes('__clerk') ||
				signInStatus !== null ||
				signUpStatus !== null);
		if (!hasOAuthState) {
			started = true;
			bailToSignIn('no active OAuth state');
			return;
		}

		started = true;

		// Belt-and-suspenders: if Clerk doesn't navigate us off this page in 12s,
		// assume something went wrong and surface an error.
		timeoutHandle = setTimeout(() => {
			errorMsg = "We couldn't finish signing you in. Please try again.";
			bailToSignIn('timeout waiting for handleRedirectCallback');
		}, 12000);

		clerk
			.handleRedirectCallback({
				signInUrl: '/sign-in',
				signUpUrl: '/sign-in',
				signInFallbackRedirectUrl: '/dashboard',
				signUpFallbackRedirectUrl: '/dashboard',
				firstFactorUrl: '/sign-in',
				secondFactorUrl: '/sign-in',
				resetPasswordUrl: '/sign-in',
				continueSignUpUrl: '/sign-in',
				verifyEmailAddressUrl: '/sign-in',
				verifyPhoneNumberUrl: '/sign-in'
			})
			.catch((err: unknown) => {
				console.error('[sso-callback] handleRedirectCallback failed', err);
				errorMsg = err instanceof Error ? err.message : 'Sign-in failed. Please try again.';
				bailToSignIn('handleRedirectCallback rejected');
			});
	});

	onDestroy(() => {
		if (timeoutHandle) clearTimeout(timeoutHandle);
		if (bailHandle) clearTimeout(bailHandle);
	});
</script>

<svelte:head>
	<title>Signing in&hellip; &mdash; CottageStudy</title>
</svelte:head>

<div class="flex min-h-[60vh] items-center justify-center px-6">
	<div class="text-center">
		{#if errorMsg}
			<div
				class="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-400"
				aria-hidden="true"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
			</div>
			<p class="mb-3 text-sm font-medium text-red-300">{errorMsg}</p>
			<a
				href="/sign-in"
				class="text-xs text-zinc-400 underline-offset-4 hover:text-zinc-200 hover:underline"
			>
				Back to sign-in
			</a>
		{:else}
			<div
				class="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-orange-500"
			></div>
			<p class="text-md text-zinc-400">Finishing sign-in&hellip;</p>
			<p class="text-sm text-zinc-400">This may take a few seconds.</p>
		{/if}
	</div>
</div>
