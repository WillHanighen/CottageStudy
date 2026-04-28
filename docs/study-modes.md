# Study modes

Each set offers four ways to study, mounted under `/sets/[id]/<mode>`. They
all share the same loader pattern: pull the set with cards via
`queries.getSetWithCards`, enforce visibility (public sets are readable by
anyone, private sets are owner-only), and redirect back to the set hub if
the deck is empty.

| Mode             | Route                | Min cards | Skill drilled                                                                                |
| ---------------- | -------------------- | --------- | -------------------------------------------------------------------------------------------- |
| **Flashcards**   | `/sets/[id]/study`   | 1         | Recognition + recall. Manual flip + advance.                                                 |
| **Learn**        | `/sets/[id]/learn`   | 1         | Adaptive drill — wrong cards loop back into the queue until mastered.                        |
| **Quiz**         | `/sets/[id]/quiz`    | 1         | Graded test with mixed question types. Submit-once, scored, no peeking.                      |
| **Match**        | `/sets/[id]/match`   | 3         | Speed-based pairing of terms with definitions against a stopwatch.                           |

The set hub at `/sets/[id]` lays them out as a 4-up grid and disables modes
whose minimum-cards requirement isn't met.

## Flashcards

[`src/routes/sets/[id]/study/+page.svelte`](../src/routes/sets/[id]/study/+page.svelte)

A linear deck. The current card is rendered as a 3D-flippable rectangle
showing the term on the front and the definition on the back. Built with
`transform-style: preserve-3d` plus `backface-visibility: hidden` on each face
— a real Y-axis rotation rather than a fade swap, so it feels like a physical
card.

### Controls

| Input                   | Action                                          |
| ----------------------- | ----------------------------------------------- |
| `Space` or `Enter`      | Flip the current card                           |
| `ArrowLeft`             | Previous card (wraps)                           |
| `ArrowRight`            | Next card (wraps)                               |
| Tap / click the card    | Flip                                            |
| Shuffle button          | Random-shuffle deck order, reset to first card  |
| Reset button            | Restore source order                            |
| Definition-first toggle | Show definition on front, term on back          |

The keyboard handler is registered in `onMount` and removed in the cleanup; it
ignores keys when the active element is an `<input>` or `<textarea>` so the
shortcut keys don't fight the browser's default behavior in form fields.

There's a brief 80 ms delay between un-flipping and advancing so you don't
catch a glimpse of the back face mid-rotation.

## Learn

[`src/routes/sets/[id]/learn/+page.svelte`](../src/routes/sets/[id]/learn/+page.svelte)

Adaptive practice. The deck is loaded into a shuffled queue. Each round, the
front card is presented either as a 4-option multiple choice (60% probability
when the deck has 4+ cards) or a typed free-response. The current card stays
in the queue until you get it right, at which point it's added to a
`mastered` set; wrong answers send the card to the back of the queue.

### Loop

```
queue ← shuffle(cards)
mastered ← ∅
while mastered.size < cards.length:
    current ← queue[0]
    show prompt for current
    accept answer (mc click or typed string)
    grade case-insensitive after .trim()
    if correct:
        mastered.add(current.id); queue ← queue.slice(1)
    else:
        queue ← [...queue.slice(1), current]
```

A small accuracy widget shows `mastered / total` and the running answer
accuracy. The "flip direction" button at the top swaps prompts (term → def
becomes def → term) and restarts the round.

For decks with 1–3 cards, the multiple choice path is suppressed and only
typed responses are used (you can't make a meaningful 4-option question with
3 distractors).

## Quiz

[`src/routes/sets/[id]/quiz/+page.svelte`](../src/routes/sets/[id]/quiz/+page.svelte)

A Quizlet-style **Test** mode. Three phases driven by a `phase` state:

1. **`config`** — pick number of questions (slider, bounded to deck size),
   prompt direction (term-prompt or definition-prompt), and which question
   types to mix in.
2. **`taking`** — every question on a single scrollable page with a sticky
   `N / total answered` header. There is no per-question feedback. Submit
   button at the bottom (and in the sticky header) finalizes.
3. **`graded`** — the same questions re-render, with green / red borders,
   correct answers revealed inline, and a big score banner at the top
   showing `earned / total` and a percentage.

### Question types

| Type            | Slot cost | Min deck size | Notes                                                                              |
| --------------- | --------- | ------------- | ---------------------------------------------------------------------------------- |
| Multiple choice | 1         | 4             | 4 shuffled options, 1 correct + 3 deduped distractors                              |
| True / False    | 1         | 1             | Coin flip whether the candidate is correct or pulled from the distractor pool     |
| Written         | 1         | 1             | Case + whitespace-insensitive equality                                             |
| Matching        | up to 5   | 4             | One block at the end. Up to 5 cards, lettered defs, partial credit per pair       |

### Generation

`generate()` reserves a single Matching block at the end of the question list
when the type is enabled and the deck has ≥ 4 cards, then fills the remaining
slots with random single-question types from the user's enabled set. Each
single question consults a per-question distractor pool that excludes the
answer card and de-duplicates by `normalize()` (`trim().toLowerCase()` with
collapsed whitespace).

### Scoring

Single questions are 1 point. The matching block is one question worth `N`
points where `N` is the number of pairs — partial credit for partial pairing.
The score banner sums `earned / total` across all questions.

### Sticky toolbar

The `taking` phase pins a small toolbar to the top with answered count and a
submit button, so long quizzes don't force you to scroll back up to submit.

## Match

[`src/routes/sets/[id]/match/+page.svelte`](../src/routes/sets/[id]/match/+page.svelte)

A timed pairing game. Up to 6 cards are pulled from the deck (or `min(6,
deck.length)`), and rendered as 12 tiles — each card contributes a `term`
tile and a `definition` tile. Click two tiles; correct pairs lock in, wrong
pairs flash red for 600 ms.

### Mechanics

- Timer starts on the first tile click via `setInterval(..., 50)` (50 ms
  resolution = 0.05 s display granularity).
- Self-clicking the already-selected tile deselects it.
- A pair matches iff `pairId` is equal **and** `kind` differs (term + def, not
  term + term).
- Best time per set is persisted in `localStorage` under
  `match-best-<setId>` and surfaced in the finish screen.

### Notes

- Round size is hard-capped at 6 even for larger decks; it's a sprint, not a
  marathon. Increase `ROUND_SIZE` in the page's `<script>` block if you want
  to tune it.
- The localStorage key includes the set id so different sets keep distinct
  best times.

## Adding a new mode

If you want a fifth mode (e.g. spaced repetition over time), the pattern is:

1. Create `src/routes/sets/[id]/<mode>/+page.server.ts` mirroring
   `learn/+page.server.ts` for the auth + visibility gate.
2. Create the matching `+page.svelte`. The shared visual primitives — grain
   cards, Fraunces display headings, mono labels, orange accents — are all
   plain Tailwind classes from `app.css`, no component library needed.
3. Add a card to the set hub grid in `src/routes/sets/[id]/+page.svelte`. The
   grid is `sm:grid-cols-2 lg:grid-cols-4` — to add a fifth, bump to
   `lg:grid-cols-5` (or wrap to a 2x3 / 3x2 layout).
4. Update the [README mode list](../README.md#whats-in-the-box) and
   [the mode table](#study-modes) above.

If the mode needs to persist progress (mastered cards, mistakes, schedule),
add a new table to [`db.ts`](../src/lib/server/db.ts) with a foreign key on
`(user_id, set_id)` and the appropriate cascade. Don't try to bolt
per-user state onto the existing `cards` table.
