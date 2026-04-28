<script lang="ts">
	const year = new Date().getFullYear();
</script>

<footer class="relative z-10 mt-24 border-t border-zinc-800/70 bg-zinc-950/40 py-10 backdrop-blur">
	<div
		class="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 px-6 text-sm text-zinc-500 md:flex-row md:gap-6"
	>
		<p class="text-zinc-400">
			&copy; {year}
			<span class="text-white">Cottage</span><span class="text-orange-500">Study</span>
		</p>
		<div class="hidden h-4 w-px bg-zinc-400 md:block"></div>
		<div class="flex flex-wrap items-center justify-center gap-5">
			<a class="transition-colors hover:text-zinc-300" href="/explore">Explore</a>
			<div class="hidden h-4 w-px bg-zinc-800 md:block"></div>
			<a
				class="transition-colors hover:text-zinc-300"
				href="https://cottageindustries.xyz"
				target="_blank"
				rel="noopener noreferrer"
			>
				cottageindustries.xyz &nearr;
			</a>
		</div>
	</div>
</footer>
