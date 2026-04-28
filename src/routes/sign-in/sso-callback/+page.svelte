<script lang="ts">
	import { AuthenticateWithRedirectCallback } from 'svelte-clerk';
</script>

<svelte:head>
	<title>Signing in&hellip; &mdash; CottageStudy</title>
</svelte:head>

<div class="flex min-h-[60vh] items-center justify-center px-6">
	<div class="text-center">
		<div
			class="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-orange-500"
		></div>
		<p class="text-sm text-zinc-400">Finishing sign-in&hellip;</p>
	</div>
	<AuthenticateWithRedirectCallback
		signInUrl="/sign-in"
		signUpUrl="/sign-in"
		signInFallbackRedirectUrl="/dashboard"
		signUpFallbackRedirectUrl="/dashboard"
	/>
</div>
