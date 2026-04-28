<script lang="ts">
	import { goto } from '$app/navigation';
	import SignInProviders from '$lib/components/SignInProviders.svelte';
	import { useClerkSafe } from '$lib/clerk';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const ctx = useClerkSafe();

	// If the client already has a Clerk session, never show the sign-in UI.
	// Bounce to the requested redirect (or /dashboard) instead — this avoids
	// Clerk's "you're already signed in" error when the server-side handler
	// hasn't caught up yet (e.g. stale cookies on first visit).
	$effect(() => {
		if (ctx.isLoaded && ctx.auth.userId) {
			const target = data.redirectTo || '/dashboard';
			goto(target, { replaceState: true });
		}
	});
</script>

<svelte:head>
	<title>Sign in &mdash; CottageStudy</title>
</svelte:head>

<section
	class="relative isolate flex min-h-[80vh] items-center justify-center overflow-hidden py-12 sm:py-24"
>
	<div class="relative z-10 mx-auto w-full max-w-md px-6">
		<!-- Header -->
		<div class="mb-10 text-center rise-in">
			<div
				class="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg shadow-orange-500/5"
			>
				<svg class="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
					/>
				</svg>
			</div>
			<h1 class="mb-2 text-2xl font-semibold tracking-tight text-white">Welcome back</h1>
			<p class="text-sm text-zinc-400">Sign in to your account to continue</p>
		</div>

		<!-- Card -->
		<div
			class="rise-in rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-2 shadow-2xl ring-1 ring-white/5 backdrop-blur-xl"
			style="animation-delay: 100ms;"
		>
			<div class="p-6 sm:p-8">
				{#if data.clerkConfigured}
					<SignInProviders
						turnstileSiteKey={data.turnstileSiteKey}
						redirectTo={data.redirectTo}
					/>

					<div
						class="mx-auto mt-8 max-w-xs space-y-4 text-center text-xs leading-relaxed text-zinc-600"
					>
						<p>New here? Signing in will automatically create an account for you.</p>
						<p>
							By continuing, you agree to CottageStudy's
							<a
								class="text-orange-500 transition-colors hover:text-orange-400"
								href="https://cottageindustries.xyz/tos"
								target="_blank"
								rel="noopener noreferrer">Terms</a
							>
							and
							<a
								class="text-orange-500 transition-colors hover:text-orange-400"
								href="https://cottageindustries.xyz/privacy"
								target="_blank"
								rel="noopener noreferrer"
							>
								Privacy Policy
							</a>.
						</p>
					</div>
				{:else}
					<div class="py-6 text-center">
						<div
							class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10"
						>
							<svg
								class="h-6 w-6 text-amber-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								/>
							</svg>
						</div>
						<h3 class="mb-2 text-sm font-medium text-amber-300">Auth not configured</h3>
						<p class="mx-auto max-w-xs text-xs leading-relaxed text-zinc-500">
							Set <code class="text-zinc-300">PUBLIC_CLERK_PUBLISHABLE_KEY</code> and
							<code class="text-zinc-300">CLERK_SECRET_KEY</code> in your <code class="text-zinc-300">.env</code>
							file, then restart the dev server.
						</p>
					</div>
				{/if}
			</div>
		</div>

		<div class="mt-8 text-center">
			<a class="text-xs text-zinc-500 transition-colors hover:text-zinc-400" href="/">
				&larr; Back to home
			</a>
		</div>
	</div>
</section>
