<script lang="ts">
	import { useClerkSafe } from '$lib/clerk';
	import Seo from '$lib/components/Seo.svelte';
	import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from '$lib/seo';

	const ctx = useClerkSafe();
	const isSignedIn = $derived(!!ctx.auth.userId);

	const homeJsonLd = [
		{
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			name: SITE_NAME,
			url: SITE_URL,
			description: SITE_DESCRIPTION,
			potentialAction: {
				'@type': 'SearchAction',
				target: `${SITE_URL}/explore?q={search_term_string}`,
				'query-input': 'required name=search_term_string'
			}
		},
		{
			'@context': 'https://schema.org',
			'@type': 'SoftwareApplication',
			name: SITE_NAME,
			applicationCategory: 'EducationalApplication',
			operatingSystem: 'Any',
			description: SITE_DESCRIPTION,
			url: SITE_URL,
			offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
			publisher: {
				'@type': 'Organization',
				name: 'Cottage Industries',
				url: 'https://cottageindustries.xyz'
			}
		}
	];

	let flipped = $state(false);
	let tiltX = $state(0);
	let tiltY = $state(0);
	let tilting = $state(false);

	const MAX_TILT_X = 9;
	const MAX_TILT_Y = 13;

	function onTilt(event: MouseEvent) {
		const el = event.currentTarget as HTMLElement;
		const rect = el.getBoundingClientRect();
		const px = (event.clientX - rect.left) / rect.width - 0.5;
		const py = (event.clientY - rect.top) / rect.height - 0.5;
		tiltY = px * 2 * MAX_TILT_Y;
		tiltX = -py * 2 * MAX_TILT_X;
		tilting = true;
	}

	function resetTilt() {
		tiltX = 0;
		tiltY = 0;
		tilting = false;
	}

	function toggleFlip() {
		flipped = !flipped;
	}
</script>

<Seo
	title="CottageStudy — Flashcards built for focus"
	titleTemplate={false}
	description="Make flashcards in seconds and practice them four ways — flashcards, learn, quiz, match. A calm, fast, ad-free study tool for the things you actually want to remember."
	path="/"
	jsonLd={homeJsonLd}
/>

<!-- Hero -->
<section class="relative overflow-hidden py-24 sm:py-32 lg:py-40">
	<div class="relative mx-auto max-w-6xl px-6">
		<div class="mx-auto max-w-3xl text-center rise-in">
			<div
				class="mb-8 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs font-medium text-zinc-400 backdrop-blur-md"
			>
				<span class="h-1.5 w-1.5 rounded-full bg-orange-500"></span>
				A focused study tool from
				<span class="text-zinc-300">cottageindustries.xyz</span>
			</div>
			<h1
				class="mb-7 text-5xl leading-[1.05] font-semibold tracking-tight text-white sm:text-6xl md:text-7xl"
			>
				Learn things
				<span
					class="font-display text-transparent italic bg-clip-text bg-linear-to-r from-orange-400 via-amber-400 to-orange-500"
					style="font-variation-settings: 'opsz' 144, 'SOFT' 100;"
				>
					on purpose.
				</span>
			</h1>
			<p class="mx-auto mb-12 max-w-xl text-lg leading-relaxed text-zinc-400">
				Build flashcard sets in seconds, then practice them three different ways. No streaks, no
				ads, no upsells &mdash; just the cards and you.
			</p>
			<div class="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
				{#if isSignedIn}
					<a
						href="/dashboard"
						class="rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-orange-500/10 transition-all hover:bg-zinc-200 hover:shadow-orange-500/20"
					>
						Open your library &rarr;
					</a>
					<a
						href="/sets/new"
						class="rounded-xl border border-zinc-800 bg-zinc-900/50 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:border-zinc-700 hover:bg-zinc-900"
					>
						New study set
					</a>
				{:else}
					<a
						href="/sign-in"
						class="rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-orange-500/10 transition-all hover:bg-zinc-200 hover:shadow-orange-500/20"
					>
						Get started &rarr;
					</a>
					<a
						href="#how"
						class="rounded-xl border border-zinc-800 bg-zinc-900/50 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:border-zinc-700 hover:bg-zinc-900"
					>
						See how it works
					</a>
				{/if}
			</div>
		</div>

		<!-- Floating preview card -->
		<div
			class="relative mx-auto mt-20 max-w-2xl rise-in"
			style="animation-delay: 200ms; perspective: 1600px;"
		>
			<div
				class="pointer-events-none absolute -inset-px rounded-3xl bg-linear-to-b from-orange-500/30 via-orange-500/5 to-transparent blur-xl"
			></div>
			<button
				type="button"
				onclick={toggleFlip}
				onmousemove={onTilt}
				onmouseleave={resetTilt}
				aria-pressed={flipped}
				aria-label={flipped ? 'Show term' : 'Show definition'}
				class="relative block w-full cursor-pointer text-left rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60"
				style="transform-style: preserve-3d; transform: rotateX({tiltX}deg) rotateY({tiltY}deg); transition: transform {tilting ? 120 : 500}ms cubic-bezier(0.22, 1, 0.36, 1); will-change: transform;"
			>
				<div
					class="relative grid"
					style="transform-style: preserve-3d; transform: rotateY({flipped
						? 180
						: 0}deg); transition: transform 750ms cubic-bezier(0.22, 1, 0.36, 1);"
				>
					<!-- Front face -->
					<div
						class="grain col-start-1 row-start-1 flex flex-col overflow-hidden rounded-3xl border border-zinc-800/70 bg-zinc-900/60 p-8 shadow-2xl shadow-black/50 backdrop-blur-2xl sm:p-12"
						style="backface-visibility: hidden; -webkit-backface-visibility: hidden;"
					>
						<div class="flex items-center justify-between">
							<div class="text-xs font-mono tracking-widest uppercase text-zinc-500">
								Card 3 / 24
							</div>
							<div class="flex h-2 w-32 overflow-hidden rounded-full bg-zinc-800">
								<div class="w-1/8 rounded-full bg-orange-500"></div>
							</div>
						</div>
						<div class="my-12 flex flex-1 flex-col justify-center text-center">
							<p
								class="font-display text-4xl font-medium tracking-tight text-white sm:text-5xl"
								style="font-variation-settings: 'opsz' 144, 'SOFT' 30;"
							>
								<em>verisimilitude</em>
							</p>
							<p class="mt-4 text-sm text-zinc-500 font-mono">tap to flip</p>
						</div>
						<div class="flex items-center justify-between border-t border-zinc-800/70 pt-5 text-xs">
							<span class="text-zinc-500">SAT prep &mdash; week 4</span>
							<span class="text-orange-400">+ 3 mastered today</span>
						</div>
					</div>

					<!-- Back face -->
					<div
						class="grain col-start-1 row-start-1 flex flex-col overflow-hidden rounded-3xl border border-zinc-800/70 bg-zinc-900/60 p-8 shadow-2xl shadow-black/50 backdrop-blur-2xl sm:p-12"
						style="backface-visibility: hidden; -webkit-backface-visibility: hidden; transform: rotateY(180deg);"
					>
						<div class="flex items-center justify-between">
							<div class="text-xs font-mono tracking-widest uppercase text-zinc-500">
								Card 3 / 24
							</div>
							<div class="flex h-2 w-32 overflow-hidden rounded-full bg-zinc-800">
								<div class="w-1/8 rounded-full bg-orange-500"></div>
							</div>
						</div>
						<div class="my-12 flex flex-1 flex-col justify-center text-center">
							<p class="mb-4 font-mono text-xs tracking-widest text-orange-500 uppercase">
								/ Definition
							</p>
							<p
								class="font-display text-2xl leading-snug font-medium text-white sm:text-3xl"
								style="font-variation-settings: 'opsz' 144, 'SOFT' 30;"
							>
								The appearance of being true or real &mdash; the ring of authenticity in fiction.
							</p>
							<p class="mt-5 text-sm text-zinc-500 font-mono">tap to flip back</p>
						</div>
						<div class="flex items-center justify-between border-t border-zinc-800/70 pt-5 text-xs">
							<span class="text-zinc-500">SAT prep &mdash; week 4</span>
							<span class="text-orange-400">+ 3 mastered today</span>
						</div>
					</div>
				</div>
			</button>
		</div>
	</div>
</section>

<!-- Three ways to study -->
<section id="how" class="relative py-24">
	<div class="mx-auto max-w-6xl px-6">
		<div class="mb-16 max-w-2xl">
			<p class="mb-3 font-mono text-xs tracking-widest text-orange-500 uppercase">/ Three modes</p>
			<h2 class="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
				Practice the way that fits your brain today.
			</h2>
		</div>

		<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
			<!-- Mode 1: Flashcards -->
			<article
				class="group relative overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/40 p-7 transition-all hover:-translate-y-1 hover:border-orange-500/40 hover:bg-zinc-900/70"
			>
				<div
					class="mb-6 grid h-11 w-11 place-items-center rounded-xl border border-zinc-800 bg-zinc-950 text-orange-500"
				>
					<svg viewBox="0 0 24 24" fill="none" class="h-5 w-5">
						<rect x="3" y="6" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5" />
						<rect x="7" y="3" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.5" />
					</svg>
				</div>
				<h3 class="mb-2 text-lg font-semibold text-white">Flashcards</h3>
				<p class="text-sm leading-relaxed text-zinc-400">
					Classic flip cards with a satisfying physical feel. Shuffle, navigate with arrow keys, hit
					space to flip.
				</p>
			</article>

			<!-- Mode 2: Learn -->
			<article
				class="group relative overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/40 p-7 transition-all hover:-translate-y-1 hover:border-orange-500/40 hover:bg-zinc-900/70"
			>
				<div
					class="mb-6 grid h-11 w-11 place-items-center rounded-xl border border-zinc-800 bg-zinc-950 text-orange-500"
				>
					<svg viewBox="0 0 24 24" fill="none" class="h-5 w-5">
						<path d="M12 3l8 4-8 4-8-4 8-4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
						<path d="M4 11l8 4 8-4M4 15l8 4 8-4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
					</svg>
				</div>
				<h3 class="mb-2 text-lg font-semibold text-white">Learn</h3>
				<p class="text-sm leading-relaxed text-zinc-400">
					Multiple-choice quiz mode that adapts to which cards trip you up. Master your set in
					rounds.
				</p>
			</article>

			<!-- Mode 3: Match -->
			<article
				class="group relative overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/40 p-7 transition-all hover:-translate-y-1 hover:border-orange-500/40 hover:bg-zinc-900/70"
			>
				<div
					class="mb-6 grid h-11 w-11 place-items-center rounded-xl border border-zinc-800 bg-zinc-950 text-orange-500"
				>
					<svg viewBox="0 0 24 24" fill="none" class="h-5 w-5">
						<rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5" />
						<rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5" />
						<rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5" />
						<rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5" />
					</svg>
				</div>
				<h3 class="mb-2 text-lg font-semibold text-white">Match</h3>
				<p class="text-sm leading-relaxed text-zinc-400">
					Drag-free pairing game. Match terms to definitions as fast as you can &mdash; race the
					clock.
				</p>
			</article>
		</div>
	</div>
</section>

<section class="relative py-24">
	<div class="mx-auto max-w-3xl px-6 text-center">
		<h2 class="font-display text-4xl font-light italic text-white sm:text-5xl">
			Ready to remember?
		</h2>
		<p class="mt-5 text-zinc-400">Free, fast, and quietly powerful.</p>
		<div class="mt-9">
			{#if isSignedIn}
				<a
					href="/sets/new"
					class="inline-flex rounded-xl bg-orange-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition-all hover:bg-orange-600"
				>
					Create a study set &rarr;
				</a>
			{:else}
				<a
					href="/sign-in"
					class="inline-flex rounded-xl bg-orange-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition-all hover:bg-orange-600"
				>
					Sign in to start &rarr;
				</a>
			{/if}
		</div>
	</div>
</section>
