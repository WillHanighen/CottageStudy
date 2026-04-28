<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { ClerkProvider } from 'svelte-clerk';
	import { goto } from '$app/navigation';
	import Background from '$lib/components/Background.svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let {
		data,
		children
	}: {
		data: { clerkConfigured: boolean; publishableKey: string; initialState?: unknown };
		children: Snippet;
	} = $props();

	// Hand Clerk SvelteKit's router so post-OAuth navigation works.
	// Clerk passes either an absolute URL ("https://x/y") or a path ("/y"); we normalize to a path.
	function toPath(to: string): string {
		try {
			const u = new URL(to, window.location.origin);
			return u.pathname + u.search + u.hash;
		} catch {
			return to;
		}
	}
	const routerPush = (to: string) => goto(toPath(to));
	const routerReplace = (to: string) => goto(toPath(to), { replaceState: true });

	const appearance = {
		variables: {
			colorPrimary: '#f97316',
			colorBackground: '#0a0a0c',
			colorText: '#fafafa',
			colorTextSecondary: '#a1a1aa',
			colorInputBackground: '#0a0a0c',
			colorInputText: '#fafafa',
			borderRadius: '0.625rem'
		},
		elements: {
			card: 'bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/60 shadow-2xl',
			headerTitle: 'text-white',
			headerSubtitle: 'text-zinc-400',
			socialButtonsBlockButton:
				'border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/70 text-zinc-100',
			formButtonPrimary:
				'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20',
			footerActionLink: 'text-orange-500 hover:text-orange-400',
			modalBackdrop: 'bg-zinc-950/80 backdrop-blur-md',
			modalContent: 'shadow-2xl shadow-black/60'
		}
	};
</script>

{#snippet shell()}
	<div class="flex min-h-screen flex-col">
		<Background />
		<Header />
		<main class="grow">
			{@render children()}
		</main>
		<Footer />
	</div>
{/snippet}

{#if data.clerkConfigured}
	<ClerkProvider
		publishableKey={data.publishableKey}
		{...{ initialState: data.initialState }}
		{routerPush}
		{routerReplace}
		signInUrl="/sign-in"
		signUpUrl="/sign-in"
		signInFallbackRedirectUrl="/dashboard"
		signUpFallbackRedirectUrl="/dashboard"
		{appearance}
	>
		{@render shell()}
	</ClerkProvider>
{:else}
	{@render shell()}
{/if}
