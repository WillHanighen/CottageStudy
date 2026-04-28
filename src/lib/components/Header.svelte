<script lang="ts">
	import { getContext } from 'svelte';
	import { page } from '$app/state';
	import { ClerkLoaded, UserButton } from 'svelte-clerk';
	import { useClerkSafe } from '$lib/clerk';

	const ctx = useClerkSafe();
	const isSignedIn = $derived(!!ctx.auth.userId);
	const clerkMounted = getContext('$$_clerk') !== undefined;

	const links: Array<{ href: string; label: string }> = [
		{ href: '/', label: 'Home' },
		{ href: '/dashboard', label: 'Library' },
		{ href: '/explore', label: 'Explore' }
	];

	const path = $derived(page.url.pathname);
	const isActive = (href: string) =>
		href === '/' ? path === '/' : path === href || path.startsWith(href + '/');
</script>

<nav
	class="sticky top-0 z-50 border-b border-zinc-800/70 bg-zinc-950/70 backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/50"
>
	<div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
		<a href="/" class="group flex items-center gap-2.5 text-zinc-100 transition-colors">
			<span
				class="grid h-8 w-8 place-items-center rounded-lg border border-zinc-800 bg-zinc-900 shadow-lg shadow-orange-500/5 transition-all group-hover:border-orange-500/40"
			>
				<svg viewBox="0 0 24 24" fill="none" class="h-4 w-4 text-orange-500">
					<path
						d="M4 5.5A2.5 2.5 0 016.5 3H17a2 2 0 012 2v14a2 2 0 01-2 2H6.5A2.5 2.5 0 014 18.5v-13z"
						stroke="currentColor"
						stroke-width="1.5"
					/>
					<path d="M8 7.5h7M8 11h7M8 14.5h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
				</svg>
			</span>
			<span class="text-lg font-bold tracking-tight">
				Cottage<span class="text-orange-500">Study</span>
			</span>
		</a>

		<div class="flex items-center gap-1 sm:gap-2">
			{#each links as link (link.href)}
				<a
					href={link.href}
					class="relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors {isActive(
						link.href
					)
						? 'text-white'
						: 'text-zinc-400 hover:text-white'}"
				>
					{link.label}
					{#if isActive(link.href)}
						<span
							class="absolute right-3 -bottom-px left-3 h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent"
						></span>
					{/if}
				</a>
			{/each}

			<div class="ml-2 h-6 w-px bg-zinc-800 sm:ml-3"></div>

			{#if clerkMounted}
				<ClerkLoaded>
					{#if isSignedIn}
						<a
							href="/sets/new"
							class="ml-1 hidden rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-sm font-medium text-orange-300 transition-all hover:border-orange-500/60 hover:bg-orange-500/15 sm:inline-block"
						>
							+ New Set
						</a>
						<div class="ml-2 grid place-items-center">
							<UserButton />
						</div>
					{:else}
						<a
							href="/sign-in"
							class="rounded-lg bg-white px-3.5 py-1.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
						>
							Sign in
						</a>
					{/if}
				</ClerkLoaded>
			{:else}
				<span
					class="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300"
					title="Set PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in .env to enable sign-in."
				>
					Auth not configured
				</span>
			{/if}
		</div>
	</div>
</nav>
