<script lang="ts">
	/** Mirrors the study-guide counter in AiGenerateModal: current / max, orange near the cap. */
	let {
		length = 0,
		max
	}: {
		length: number;
		max: number;
	} = $props();

	const nearing = $derived(length > max * 0.95);
</script>

<span
	class="font-mono text-[12px] tabular-nums shrink-0 transition-colors select-none"
	class:text-orange-300={nearing}
	class:text-zinc-500={!nearing}
>
	{length.toLocaleString()} / {max.toLocaleString()}
</span>
