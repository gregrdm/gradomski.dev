The last post ended with a question: a sweep of light across the plate, or a
vertical flip? I asked because I would rather hear the answer before shipping
than after.

The answer turned out to be "both, and a third one, and an off switch". 1.4.6
gives the tile three movements and a way to turn all of them off, and the flip
does something the spec had explicitly ruled out.

Four releases went out between that post and this one. This is the first of
four write-ups, published together because they should have gone up as they
landed.

## Three movements, and one of them turns the tile over

Until now a new notification added a static dot or a number, which nobody
notices unless they happen to be looking at that exact tile. Now the tile face
itself reacts:

- **Sweep** (the default) — a band of light in the accent colour crosses the
  plate once, along the tile's diagonal.
- **Drop** — three rings spread from the centre of the plate to its corners,
  like rain landing on water.
- **Flip** — the tile turns over on its **vertical** axis, shows the **unread
  count** on the back (up to "99+"), holds it, and finishes the turn back to
  the icon.
- **None** — just the badge, as before.

Dock icons get a gentle scale pulse in all three modes, never a flip: there is
no plate there for anything to run across, and a row of rotating icons is too
much movement at once.

The setting lives in **tile content → notifications**, under the badge style
chips. That whole section is already behind a check for notification access, so
someone without it never sees a choice about something they do not have.

## Arrival is the notification's own timestamp, not a change in a counter

This is the one decision in the release that had no alternative, and it is worth
spelling out because the obvious approach fails in a way you would only find on
a real phone.

The obvious approach is a delta: remember each package's badge count, animate
when it goes up. It does not work here.
`NotificationBadgeService.refresh()` runs on **every** return of the launcher to
the foreground, and in the branch without a live binding it **zeroes** the map
before rebuilding it a moment later. `publish()` rewrites the map wholesale on
`onNotificationRankingUpdate` too. So the delta would be positive for every
package on every trip back to the home screen, and the feature would be an
avalanche of animations across the whole desktop.

`BadgeEntry.postedAtMillis` is a property of the notification itself. `clear()`,
a republish, a rebind after doze, a dead listener, a ranking change — none of
them touch it. A whole class of bugs disappears instead of being patched with a
guard on every publication path.

Two consequences come free:

- A notification **swiped away** is not in `entries`, so it has nothing to
  animate with, however fresh it was. After eight hours away the wave covers
  packages with a notification **still standing**, not eight hours of history.
- The badge-ability filter (`isOngoing` / `isGroupSummary` /
  `isSuppressedBubble`) is pulled into one place and shared with `countBadges`,
  so a notification that cannot show a number cannot move a tile either.

Both functions return **the arrival time, not a boolean**, and that is not
tidiness. The "seen" floor does not move while the desktop is on top, so a flag
reading "this package has something unread" stays raised once raised — a second
message in the same conversation would not change it and would pass with no
animation at all. That is precisely the case the cooldown exists for. A
timestamp changes with every message.

The tile also fires **only on a time newer** than the one it last ran on:
swiping away the newest notification uncovers an older one and *lowers* that
value, which is not an arrival and has no business moving anything.

**A limitation I cannot fix:** apps that never clear their own notifications
after you have read them inside the app leave them standing, and the launcher
sees exactly what the notification shade sees. A per-package timestamp removes
most of that margin. What is left is narrow — a notification that arrived while
you were inside the app and that you did not read animates when you come back,
which is arguably correct anyway.

The logic is pure and lives in `core/notifications/BadgeArrivals.kt`, with 16
JVM test cases and no device involved.

## 480 milliseconds was the wrong answer three times over

The first build ran every movement at 480 ms, derived from `FLIP_DURATION_MS`
(half a turnstile turn) times two. On the phone that was a mistake you could see
from across the room: a full badge rotation went **twice as fast as any other
flip in the launcher** and read like panic rather than like a message.

Two rules came out of it, both now written into `DESIGN.md`:

1. **Movement the user did not ask for goes slower than movement they did.** The
   turnstile answers a tap and has every right to snap. A badge animation is an
   interruption.
2. **Every movement gets its own timing, none derived from another.** At speed
   1: flip **1900 ms** (500 turn + 900 hold + 500 back), drop **1000 ms**, sweep
   **900 ms**. The shared constant was convenient and false — a second and a bit
   stretched across a band of light turns a flash into a gradient crawling over
   the tile, while turning a whole plate over needs exactly that long to look
   deliberate.

Easing sits **inside** the shape of the movement rather than on the animation.
The flip is three stages, and one curve stretched across the whole thing would
ease in and out of the *hold* instead of each half-turn. So every movement runs
on a linear clock and takes from it whatever it needs; the half-turns get a
symmetric curve of their own so neither end snaps.

The cooldown is **derived too**, not a constant: this movement's duration at
this speed, plus 800 ms of silence — 2700 ms for the flip, 1800 for the drop,
1700 for the sweep. The flat 2 s of the first version meant "the animation, then
roughly a second of nothing", and the moment the movements stopped sharing a
duration that constant would have quietly eaten the silence on the slowest one.
Deriving it keeps the invariant that was the decision, rather than the number
that was its consequence.

The cooldown **drops** a second event inside its window rather than queueing it.
That is deliberate: queueing would turn a burst of messages into a burst of
animations chasing reality, which is the strobe the cooldown exists to prevent.

## The flip grew a real back face

The first flip turned the tile 360° and came back to the same face, because the
spec deliberately ruled out "a real live tile". On the phone it was obvious that
a rotation which reveals nothing has nothing to say. The tile now turns onto its
back, shows the unread count, holds it for 900 ms and continues the turn — the
same way round, not back the way it came, because reversing halfway through the
hold reads like a jam.

**This does not break the privacy invariant, and it is worth saying exactly
why.** What was ruled out is the notification's **content** — the sender, a
snippet of the message — because that changes a row in Data Safety, the decision
about the lock screen and the whole privacy weight of the app. A count is
metadata the tile **already prints in its corner**. The back face shows nothing
the launcher was not already showing, and `BadgeEntry` still carries not one
character of notification text. If a sender ever belongs on that face, it is a
separate feature with a separate answer in Data Safety, not an extension of this
one.

Two layouts, chosen by the same predicate the front uses:

- **Below 2×2** — the number alone, filling the plate.
- **2×2 and up** — the app icon and the number beside it, centred as one pair.

The app name **left** the back face, and that is a deliberate reversal of the
first version rather than an oversight. The reason it was there — an upended
tile still says whose it is, which matters when several turn at once — is now
served better: an icon is recognised faster than 11-point text is read. A 2×2
plate will not hold icon, number and name without shrinking all three below
usefulness.

A folder tile shows the icon of **the member that got the notification**, from a
source that shares one filter with the arrival itself: a source that could
disagree with it would dress the tile in the wrong app's icon. The number stays
the sum across members, the way the same tile's corner prints it. Icon says who
woke the tile, number says how many are waiting.

One trap worth writing down, because it cost the whole effect: `displaySmall`
carries a fixed `lineHeight` of 44 sp, and auto-sizing only changes `fontSize`.
Left in, it pins the block height at 44 sp whatever size the fitter finds — so
on a plate shorter than that, nothing ever "fits" and the number drops to the
floor, which is exactly the outcome filling the plate was meant to remove.
Confirmed in the Compose sources: the step-based fitter rejects a candidate on
overflow in either axis, and layout overwrites `fontSize` alone.

## A setting you could not check until something happened

Four chips — sweep, drop, flip, none — are four words describing movements the
user has never seen. Worse, this is the **only setting in the app whose result
cannot be checked on demand**: every other one shows itself the moment you leave
settings, and this one waits for a notification to arrive. Choosing between
"drop" and "sweep" was choosing between two words.

There is now a tile next to the chips that plays the selected movement. It plays
when you pick a chip and when you tap it, and never on a loop — a tile moving by
itself inside a scrolling list takes attention away from the chips it is there
to explain.

The decisions behind it, in order of how much they matter:

- **The scene draws with the desktop's own code**, not an imitation of it — the
  same plate, the same sweep, the same flip angle, the same back face, in the
  user's accent and corner radius. A preview that is its own drawing of roughly
  how something looks guarantees exactly one thing: that it will stop being true
  one day and nobody will find out.
- **It deliberately does not share the trigger.** The real one is gated by, among
  other things, whether the desktop page is active — which is false in settings.
  A preview built on that function would **never fire and never say why**. The
  scene runs its own clock at the same duration. That looks like a shortcut and
  is a decision.
- **The kill switches are honoured.** Animation speed at zero, or the system
  animation scale at zero, stops the scene. The "none" chip shows a tile at rest,
  which **is** its correct preview rather than the absence of one.
- **The scene is 2×2, and that is not cosmetic.** After the back-face change, its
  layout threshold runs exactly at 2×2; a smaller scene would be a preview of a
  different thing than the user is going to get.

The pattern is written for the users that come after it. Tile icons already meet
its contract. The dock does not — it reads the desktop view model, so its
preview starts with extracting a parameterised row of icons, which is why it is
not in this release.

## The system animation scale, read for the first time

The animation-speed slider sits behind the Pro gate, and so does the "none"
chip. Which means a free user gets this movement and **has nothing to turn it
off with**.

So 1.4.6 is the first place in the app that reads Android's own
`ANIMATOR_DURATION_SCALE`, on every resume, and treats zero **purely as a
switch** — the two scales are never multiplied together, the setting simply
collapses to "none". That gives a free user a fire exit without dismantling the
Pro gating and without adding a second free toggle.

The scope of that rule is this one animation. The turnstile, the cascades and
the sweeping border do not read it — that is a separate tidy-up, deliberately
left out of this release.

## Icon packs, and the memory they had been costing

Long-press a tile, "change icon", and an empty grid. Always when no pack was
selected in settings, which is where everyone starts.

The view was not at fault. A tile held **only a resource name**, so it could be
resolved only through the globally selected pack, and the picker was by
construction a window onto that one pack. Per-tile personalisation could not
mean anything else until the model could say which pack a name came from.

**The same root gave a second bug that nobody reported.** A pinned name changed
meaning when the global pack changed: a tile with `ic_phone` pinned from pack A
showed `ic_phone` **from pack C** after switching — a different drawing under the
same name — or fell back to the app icon if C had no such name. On a tile the
user never touched. Qualifying the reference with its pack removes that in
passing.

A tile now holds `"pack/resource"`. A name without a slash still means "the
active pack", which is exactly what those rows meant before, so there is **no
Room migration and no backup version bump** — old rows and old backups are read
by a rule, not converted.

Then the work of loading icons exposed something older and more expensive.
Picking Lawnicons could bog the whole launcher down until you unpinned it. Two
causes, both in how a drawing becomes a bitmap and how it is kept — code older
than this release. Measured on an S25 Ultra at 420 dpi with 190 launchable apps:

| | before | after |
| --- | --- | --- |
| rasterisation size | the drawable's own (~1000 px) | 192 px ceiling |
| one icon in memory | ~3.9 MB | 144 KB |
| cache capacity | 128 **entries** | a **32 MB** budget |
| native heap (Heap Alloc) | 100 MB, 27 MB pushed to disk | 69 MB, zero swap |
| total PSS | 253 MB | 229 MB |

Three changes.

**A rasterisation ceiling.** Icons were drawn at the drawable's own size, which
is whatever the pack's author picked: Lawnicons carries 19,230 resources, each an
adaptive icon on a 192 dp vector, which is about 504 px at 420 dpi before the
adaptive viewport scale and around 1000 px after it. Monochrome renders always
came out at 192 px; without a ceiling there were **two** full-colour paths that
did not. The second was the one feeding the dock, the search field and the dock
app picker — an easy one to miss, and it was missed until a code review went
looking.

The 192 px ceiling is a display size, not just a byte budget: the largest icon on
screen is 56 dp, which is 196 px at 560 dpi and 224 px at 640 dpi. If that
ceiling ever gets computed from density it becomes an input to the render and
**must** join the cache key.

**A budget in bytes, not entries.** A counter cannot bound something it does not
measure, and 128 entries duly accepted half a gigabyte. It fixes an older bug at
the same time: 128 was **below the number of apps on the phone**, so scrolling a
190-item list evicted icons that the same list needed a moment later, and
re-rendered them for the rest of the session.

**A disk cache**, tried after memory and before rendering. Its key is built
**only from things known before the pack is queried**, so a hit skips the
appfilter lookup, the identifier lookup and the rasterisation together. The app's
own version code is part of that key: timestamps name pages **outside** the app,
while the pixels also depend on our renderer, and `cacheDir` survives an app
update — without it, changing the renderer in a later release would leave
everyone who updates with 1.4.6's renders forever. Same quiet symptom as a
missing timestamp: the icon still looks right.

Known limitation: the first run after choosing a pack still renders everything.
The disk cache starts paying from the second.

## Also in 1.4.6

- **Choose which sections your dashboard shows.** Calendar, tasks, habits and
  reminders each get a checkbox. A section that is off is not composed at all,
  which is the difference from collapsing a heading. Stored as the set of
  **hidden** sections rather than visible ones, because "no answer" has to mean
  "show everything" — and three different situations produce no answer: a fresh
  install, a backup written before the option existed, and a section added in a
  future version. The new group is free: it is the user saying what their own
  dashboard is for.
- **The free and Pro split, tidied.** Icon style was behind the paywall in
  settings and free in the per-tile menu, so the paywall stood somewhere nobody
  had to walk past. The rule now: free gets a workable set, Pro removes the
  limits. Gating applies to **adding**, never to what is already there — a list
  over the limit after Pro lapses keeps every row.
- **The badge stopped pushing the icon around.** On a tile with no name, the
  bottom strip only existed when there was something to put in it, so a notification
  stole a dozen dp of height from the icon and swiping it away gave them back.
  The badge is now a layer over the face rather than a row inside it.
- **A tile lands where you let it go.** A 2×2 tile on column 0, under a row of
  icons starting at column 1, dragged one column right, landed on column 2. The
  stepping rule now has one stated exception: a drop that displaces nobody but
  the tile itself wins immediately.
- **Tile colours can be see-through**, with an alpha bar in every picker and a
  transparency slider in the tile's colour menu. Plate opacity moved out of the
  colour's top byte into its own column, because "has a colour" is also the flag
  "this tile opted out of the wallpaper photo" — so dimming a default-coloured
  tile used to swap its photo for a translucent accent.
- **Controls on the smallest tiles** stopped shrinking. Below a full cell they
  are 36 dp with their centre sitting on the tile's corner, so the middle of the
  face stays clear instead of being covered by four touch targets that met in
  the middle.
- **Debug builds got their own package.** `connectedDebugAndroidTest` uninstalls
  the app it tested, and debug shared an application ID with release — so the
  first run on the phone took the installed release build and its database with
  it. Recovered from a local copy made minutes earlier; the suffix means it
  cannot happen twice.
- **Room went to schema 13** for the per-tile plate opacity, as an added nullable
  column with a migration test. The backup version stays at 4: no existing field
  changes meaning.
- **456 unit tests**, up from 382. Six of them fail on my machine for a reason
  that has nothing to do with this release — the settings tests cannot swap a
  DataStore temp file under Windows file locking, and they fail identically on a
  clean checkout. That is its own decision to make, and it is not this one.

## What's next

1.4.7, a week later, and it is one line long: a crash from production that took
the launcher down without the user touching anything. Then 1.4.8 gives the
calendar tile a whole-month face and adds a music tile.

---

sqTile is on [Google Play](https://play.google.com/store/apps/details?id=dev.gradomski.sqtilelauncher),
in English, Polish, German, Italian and Ukrainian. Free, with a single one-time Pro
unlock and no subscription. No ads, no analytics SDK, no account.
