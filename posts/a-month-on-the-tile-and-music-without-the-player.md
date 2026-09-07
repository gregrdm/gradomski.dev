1.4.8 is the opposite of the hotfix before it. The calendar tile gets a second
face showing the whole month, there is a new music tile, a new 3×3 size, and a
filter for which calendars feed any of it.

Both new faces were designed in full before a line of code: 26 decisions, each
with the alternative that was rejected. The starting point was working code from
a sibling project of mine, read, taken apart into decisions, and rewritten
against this project's rules rather than copied. What came across and what
deliberately did not is most of what follows.

## A whole month on the calendar tile

It is a **second face of the existing calendar tile**, held in the same field
that already holds the clock's dial and the weather's face — the third time that
pattern has earned its place. Switch it with the badge in the corner in edit
mode, exactly like the clock. A tile from before the update reads as the old
face, so **every existing calendar tile looks identical after upgrading** and
there is nothing to migrate.

A new tile type was the obvious alternative and it is worse. The picker already
has 13 entries; a fourteenth called "calendar (month)" next to "calendar" makes
the user guess what the difference is before either one is on screen. Switching
face by size was the other option — small means teaser, large means month — and
it breaks the promise the size ladder makes, which is that it is a menu of
shapes. It would also deny a small month grid to someone who wants exactly that.

The geometry is always the same: seven columns, one row per week. Only the
contents of a cell change, on a single threshold computed from the **cell as
actually measured** — not from the tile's width in grid units, which says
nothing about available dp across different screens.

- **Below the threshold:** a dot. No day number, no weekday header.
- **Above it:** the day number, a dot beneath it, and the weekday header.

Three signs that never change meaning: the plate says the day exists, the dot
says something is on it, and a brighter plate says it is today. The dot is
binary and never a count — at 2×2 there is no room for one, and at 8×4 a number
squeezed under the day number is a mark nobody reads. The query is identical
either way, so being binary buys one rendering rule rather than two.

Today used to carry an outline around its digit, and that was wrong: an outline
draws *around* the number and so competes with it for the same few dp. On the
phone it overlapped its own digits at ordinary font sizes and could only get
worse as the system font grew. A fill sits *behind* the text and cannot collide
with it at any size.

Why a threshold is needed at all: the desktop is eight columns, so a grid unit
is about 40 dp on a 360 dp screen and a 2×2 tile is about 84 dp. Seven day
columns leave about 12 dp per day, and a two-digit number needs about 14. That is
not a font-size problem — the numbers simply do not fit, and an unreadable number
is **worse** than a dot, because it pretends to say something.

**Tapping a day opens the system calendar on that day**, with the turnstile,
because that is still opening an app, just with an argument. It degrades by
itself: at 2×2 a day cell is around 12 dp, far below the touch minimum, so there
the whole tile simply opens today. No extra rule required.

There is no month navigation. Horizontal is the page pager plus the turnstile's
reserved meaning, vertical is desktop scrolling and the tile's own page
rotation. Browsing months is the calendar app's job, and the tap already goes
there.

### The first day of the week comes from the region, not the language

The locale is taken **from composition**, not from the process default, because
Android 13's per-app languages make those two different answers.

The trap underneath that: the week-fields lookup reads the first day of the week
from the **region**, not the language. A locale carrying only a language answers
Sunday for *every* language — Polish included. Verified on the JVM: `pl` gives
Sunday, `pl-PL` gives Monday. And per-app languages can hand composition a bare
`pl`, which would have started a Polish user's week on Sunday.

So the region is taken from the locale when it has one and borrowed from the
system locale when it does not. Borrowing the phone's region is a better answer
in its own right, not just a patch: the start of the week is a regional
convention, so someone in Poland running the launcher in English still starts
on Monday. The language stays with the composition locale, because that is what
draws the day letters.

### It draws the month before it knows what is on it

The grid, the numbers and today's brighter plate render immediately. The dots
wait for the first real emission from the query.

That is not a nicety. An empty grid of dots at start-up is exactly the bug that
already shipped once on this project — a "0" and "set a city" flashing at people
with a full desktop. A month grid drawn without dots is **indistinguishable from
a month that is genuinely empty**.

It is now a standing entry in the regression checklist rather than a one-off fix,
because this class of bug is invisible to whoever writes it: with a warm process
you never see it, the value is correct two frames later, and the only people who
meet it are users cold-starting with real data.

### Wide sizes stopped being a stretched grid

The first device pass was blunt: 4×4 and 2×2 good, 8×4 and 4×2 weak. There is one
cause and it can be named. **The month grid stops carrying more information as it
grows wider.** Cells get wider but not taller, so 8×4 spends 50 dp on a day to
say precisely what a 24 dp cell said at 4×4. The rest is whitespace.

Three layouts now, chosen from the measured tile rather than from a list of known
sizes:

| shape | layout |
| --- | --- |
| width − height ≥ 120 dp | **split**: a square month on the left, an agenda on the right |
| that, and width ≥ 1.8 × height | **agenda only** |
| anything else | **grid only** |

The first condition is phrased as "how much is left **beside** a square month",
and that is not an accident: a month is square by nature, so the question is
whether the remainder is enough for an agenda. At 8×4 that leaves 184 dp — a real
list. At 4×2 it leaves 92 dp, too little for a time and a title, so that shape
does not split.

**The 120 dp threshold is computed, not eyeballed.** The requirement was that
width 7 must look like width 8, because a tile trimmed by one unit changing its
layout is a distinction nobody asked for. Of the shapes that must split, 7×4
leaves the least: 123 dp on a 320 dp screen, 138 at 360, 158 at 412. One hundred
and twenty fits every one of those, and width 6 stays out of the split on all
ordinary screens at 82, 92 and 105 dp. The first version used 140, which is
exactly why 7×4 fell back to a bare grid.

The left half of the split is literally the same month grid used at 4×4, not a
second rendering of it. The agenda comes from the flow the dashboard already
lives on, filtered with the **same grouping** the dashboard's calendar section
uses, so the two surfaces cannot disagree about which day an event belongs to.

The agenda shows **two days, not one**. A wide tile usually has room to spare, and
the honest thing to put there is the next thing that will matter, not whitespace.
Tomorrow is added **only when rows actually remain**, so a packed day pushes it
out entirely instead of stealing rows from today. Both days carry a dated
heading, including in the split layout — a reversal of the first version, which
dropped the heading because the grid beside it already highlights today. That
argument stopped being true the moment a second day appeared: the headings are
what tell the two lists apart.

Rows **truncate rather than compress**. A list longer than the space loses the far
end of the horizon; it does not shrink the type. A calendar that fits one more
row at the cost of every row's legibility has stopped answering "what now".

### The largest system font broke both halves at once

Reported from the phone at the largest font step, with screen zoom untouched.
Three symptoms, **one cause**: the thresholds were constants in `dp`, and text
grows in `sp`.

The regression checklist already says it outright — nothing about the tiles
scales with that setting, they are a fixed grid of millimetres, while every `sp`
inside them does. The tile stays the same size; the letters in it do not.

- **Day numbers cut to one digit.** The fixed comparison still said "print
  numbers" to a cell that had stopped fitting them.
- **Dots vanished.** At double scale the number took the cell's whole height, so
  the dot under it was pushed out.
- **The agenda ran outside the plate**, painting onto the tiles beneath.

Both thresholds now multiply by the font scale, floored at 1 — a smaller-than-
default font does not buy the grid the right to draw in a tighter cell than the
layout was designed for. At the largest font the whole month drops to dots, and
that is the intended outcome rather than a capitulation: the checklist accepts
text that **is not there** and rejects text that is **cut**.

Only the vertical budget scales. Whether the agenda fits beside the grid at all
does not, deliberately: running out of width ends in an ellipsis, which is proper
degradation, while running out of height ends in cutting.

### Then I broke the weekday header, and that one was a design error

The fix worked — the month dropped to dots at the largest font, as intended — and
**took the `M T W T F S S` header with it**, which nobody had asked for. Reported
from the phone immediately.

The cause is not in that fix. It is in a rule I had written earlier: the header
shares a threshold with the numbers, because a grid without dates has nothing to
label. That sentence is true in exactly one case — a one-cell tile, where the
column is 12 dp and a letter does not fit either. Everywhere else it glues two
different questions together:

- **A day letter** is one glyph on one line. It needs its own line, and it needs
  the weeks to still have something left.
- **A date** is two digits with a dot beneath, inside a week row. It needs the
  row to be **tall**, not merely wide.

At double scale the second failed and the header went with it, despite sitting in
25 dp columns where the letter had fitted all along.

Two separate tests now. The header appears wherever the weeks can live with it,
and gives way only on a one-cell tile, where taking a line would leave the month
with nothing. The cell height is computed from what the weeks **actually** get,
so the header still cannot starve the numbers it labels. At the largest font the
result is a header plus dots. A week row's height deliberately does **not** scale
with the font: a plate and a dot are not text.

## Music, without opening the player

A new tile type. Album art as the plate, title, artist, skip and pause, and a tap
on the body opens whatever the sound is coming from.

The session is picked live rather than pinned to the tile: the first one playing,
or the first in the list when nothing is. The system already orders that list by
activity, so "the first one playing" is the one being listened to. Pinning a
player to a tile was the alternative, and it demands an answer to "what does a
tile pinned to Spotify show while YouTube is playing" — a separate feature, not a
variant of this one.

The reference implementation I read has a real bug here that this one does not:
there, the controller is fetched afresh on every button press, so "next" can land
on a different session than the one the tile is currently drawing. Here the
controller is held, and the action goes to the session that is on screen.

### Three states, not two

This distinction is easy to miss and it changes the design.

1. **Playing** — art, title, artist, transport with a pause icon.
2. **Paused, session alive** — the same, with a play icon. **The metadata here is
   real, not stale.** A media session usually survives a pause, the controller is
   still returned, and play **resumes that exact player**. The difference from
   state 1 is **the icon and nothing else** — no dimming, no greying. Dimming
   would suggest "out of date", and it is up to date; the only thing that changed
   is that the sound stopped, which is precisely what the icon says.
3. **No session at all** — the player was killed, or the phone restarted. There
   is no metadata and nothing to resume, so this is the empty face, **without a
   `+` affordance**: `+` promises that the action happens on this tile, and
   opening a player is not that. Tapping opens the device's default music app,
   which turns a dead tile into a useful one without making a promise.

### Album art on the plate is a correctness requirement

The art fills the whole plate with a gradient scrim from the bottom; text and
transport sit on the scrim. That is not decoration.

The function that picks a readable content colour takes **one `Color`** and
judges its luminance. An image has no single luminance, so white text on light
album art simply disappears. The scrim is a known colour — **and it is the scrim
we compute contrast against**, not the picture.

The scrim carries the **tile's colour**, not black. The first version was flat
black and read like a system media notification rather than like *this* tile. The
colour is mixed into black rather than used at full chroma, and that is not
taste: the scrim exists so that contrast can be **computed**, and darkening
whatever colour the user picked guarantees the bottom of the gradient stays a
known, legible ground even with a bright accent.

Two collisions had to be settled. The desktop draws one photo *through* the tile
plates, so album art would be a second image in the same plate: **while something
is playing, the art wins** — the tile stops being a window and becomes its own
image, and returns to being a window when the session goes. Plate transparency
applies to the art exactly as it applies to a colour.

The sizes go 2×2, 4×2, 4×4, 8×4. The floor is **2, not 4**, and that took an
argument. Three transport buttons need about 40 dp each, so about 120 dp, so
three units — which suggests a minimum width of 4. But that minimum also bounds
the size ladder, so it would **exclude the 2×2 rung**, where this tile is a
designed variant (art plus one centred play button) rather than a layout failure.
The definition in the code is "the narrowest width at which this tile still says
something", and a play button on album art says something. The touch problem is
solved by **removing two buttons**, not by squeezing in three. The artist drops at
4×2 — the only place text disappears on shrinking, because 84 dp of height is
spent by three 40 dp buttons and one line of title.

### The icon lost a second, and only in one direction

Pause switched instantly. Start took about a second. The asymmetry was the clue:
the playing check tested for exactly the "playing" state, but playback begins by
passing through **buffering**. The icon was not waiting for our event — it was
waiting for the player's buffer to fill. A pause has no such state on the way.

Fixed in two layers: buffering and seeking stopped counting as paused, which also
removed a latent bug where skipping to the next track flashed the icon back to
"play"; and an optimistic switch, set **before** the command is sent, so the icon
turns in the same frame as the touch. It only holds until the session disagrees,
so the cost of being wrong is a pause pressed *in the player* right after the
tap.

### And then buffering had to get its own sign

Folding buffering into playing hid it **under the pause icon**. On a slow stream
the tile then shows a pause, makes no sound and does not move — which is exactly
what a hung tile looks like. Reported from the phone right after the previous
fix.

So the boolean gave way to three values — paused, buffering, playing — and the
work divides cleanly. Drawing looks at all three and puts a **spinner in the
button's place** while buffering. Pressing the button looks at "engaged", because
pressing during buffering means pause and that is what the user wants. Session
selection looks at "engaged", because a session that is buffering is the one being
listened to. And the art's drift looks at "engaged", because a tile freezing the
moment a stream stalls would read as broken all over again.

Seeking goes to *playing*, not buffering, deliberately: a skip usually takes a
frame or two, and a spinner flashing on every "next" would be worse than no
spinner. A skip that genuinely has to wait passes through buffering anyway.

The optimistic switch changed meaning for the better along the way. Pressing play
now shows a **spinner** rather than a pause icon — "heard you, working" instead
of "playing", which was not yet true.

One deliberate exception: the spinner does **not** obey the animation-speed
multiplier. Everywhere else zero means "finished", but that rule is about
decoration — the turnstile, arrivals, the art's drift. This is feedback, and a
progress indicator frozen mid-arc says "hung", which is the very thing the
spinner exists to prevent.

### The drift, and a bug that was already there

The album art drifts the same way the gallery tile's photo does, from one shared
implementation. Those are the only two places where an image fills a plate, and a
second, subtly different movement would read as a fault rather than as variety.

Two rules make it more than an ornament. **The drift runs only while something is
playing**, which turns it into a **state signal**: a tile that moves is a tile
that is playing, readable from across the room without squinting at an icon. And
**zero on the speed multiplier means finished** — no transition is composed at
all, the image stands.

**Which fixed a bug that was already shipped.** The gallery tile did not respect
the speed multiplier — not one reference to it in that file; it stopped only in
edit mode. The multiplier is documented as applying to **every** animation in the
app, so anyone who had turned all animations off still had a drifting photo on
their desktop. Copying that pattern would have spread the bug to a second tile
instead of fixing it, so both moved onto the shared path at once.

And one that arrived with the change: the drift scales the image to 1.15 and the
music face clipped **nothing**, so the art ran past its plate and lay over
neighbouring tiles — visible immediately in a screenshot from the phone. The
gallery tile has carried that clip since it got its own drift. The lesson is
worth writing down because it is not a one-off: anything given this movement
**must** be in a clipped container. Scaling beyond its own bounds is built into
it, not a side effect.

### Why a track title does not break the rule from 1.4.6

1.4.6 settled that the unread **count** on the flip's back face is metadata the
tile already prints, and that a **sender or a message snippet** is excluded,
because those change a row in Data Safety, the lock-screen decision and the
privacy weight of the whole app. That post ended by saying a sender on that face
would be a separate feature with a separate answer.

The music tile shows a title and an artist. **This is that separate answer.**

It does not break the rule, and it is worth being exact about why. What was ruled
out is the **content of a notification**. A track title does not come from a
notification — it comes from the media session's metadata, which the playing app
publishes *so that the system can display it*. The same words already stand on
the lock screen and in the shade, by that app's decision rather than ours. The
badge data still carries not one character of notification text; listener access
here is the key to the session API, not to content.

**The counter-argument, which I am not hiding:** the tile hangs on a desktop that
anyone glancing at the phone sees, and a podcast episode title can carry exactly
the class of information the earlier rule protects against. The difference is
that the user adds this tile themselves and removes it themselves, whereas a
badge arrives on every tile at once. Visibility here is a choice, not a side
effect.

Operationally: no new row in Data Safety, because nothing leaves the device, and
**no new permission**. Music goes through the media session manager, which needs
notification-listener access — and this launcher already has it for badges.
Someone who turns that access on for music will also get counts on their tiles,
because badges have no separate switch. That is deliberate and it needed zero
lines of code: it is how the permission already behaves.

Coming back from system settings has to revive the tile without a restart, and
that needed its own mechanism. There is no result to await and no dialog to hang
a callback on — the launcher simply returns to the foreground holding a
permission it did not have when the flow started subscribing. So the subscription
is rebuilt from scratch, gated on the access state having **actually** changed, so
an ordinary return to the desktop does not re-register system listeners.

There is no marquee on the title. It ellipsises like every other piece of text on
every other tile. A long title is not a special case deserving its own rule.

## Choose which calendars feed the tile

Until now every calendar was pulled without asking. With one noisy work calendar
a dot appears under every day of the month and the grid stops saying anything.
The old teaser face never had that problem because it showed one event at a time;
the month grid exposes it.

The interesting part is what did **not** turn out to be needed. The project's
rule is that a new non-nullable field in the backup format needs a version gate,
because the JSON decoder will materialise it as `false`/`0` in an old file rather
than as the default. The real test is sharper: **does what the decoder puts in
place of the missing field differ from the truth about the launcher that wrote
that file?** Here it does not. A missing field gives an empty set, an empty set
means "all calendars", and a launcher from before the picker showed exactly all
of them. That is a concrete payoff of encoding "empty means all", not a matter of
taste.

The selection enters the repository as a flow rather than being handed in by a
screen, so the tile, the dashboard and the picker all see one answer. It is
composed with the ordinary refresh trigger, so changing the selection updates the
tile immediately rather than at the next tick — with one caveat found in review:
that flow has to be **de-duplicated**, because the settings flow emits on every
settings write and every one of those emissions would otherwise be a query to the
content provider.

The summary row has to name the "all" case in words. Stored, that case is an
empty set, and "0 selected" would read as a tile showing nothing — the exact
opposite of what it means.

**A known limitation, accepted:** the IDs belong to the provider, so an account
removed and added again comes back with a different ID and stops matching a saved
selection. That reads as a calendar quietly returning to the tile, which is a
better failure than the reverse — a filter hiding a calendar the user can see in
every other app.

## Also in 1.4.8

- **A new 3×3 size.** Three grid units by three, so a row works out as
  `3 + 2 + 3 = 8`: two large squares at the ends and a small tile between them.
  Every type gets it, including folders and the gallery, whose floor drops from
  4×4. Weather fits three days with glyphs at that width, and the seven-day face
  trims to three instead of falling back to the current temperature; music shows
  title, artist and the full transport. **The todo and clock tiles still compute
  their layout in whole cells and can look like 2×2 there** — that is open work,
  not a hidden fallback.
- **Icon size from 60% to 250%, and Light / Normal / Bold type.** One typographic
  scale now covers every tile face; large readings keep their sizes but take the
  chosen weight. The app name no longer moves the icon: its strip is a measured,
  invisible copy above the icon, so both ends of the face take the same space.
- **The badge dot became a pin.** In dot mode every tile — 1×1, larger, folder —
  draws it in the **top-right** corner, 2 dp in, with no plate under a full-colour
  icon. The counter stays in the bottom strip beside the name. A notification
  arriving must not move or resize the icon.
- **All-day events were showing a day early**, west of UTC. They begin at UTC
  midnight, and three places converted that with the local zone — so at a negative
  offset an all-day event landed on the wrong day on the tile, in the grid's dots
  and on the dashboard. A pre-existing bug, found while building the agenda, now
  fixed through one shared helper and covered by a test that had been passing
  falsely.
- **Edit controls hide while you move a tile.** Delete, size, colour and the type
  control get out of the way during a drag and come back when you put it down.

## What's next

1.4.9, and it is two things at once: Chrome's "Add to Home screen" finally has
somewhere to go, and the settings screen stops being seven collapsible groups.

---

sqTile is on [Google Play](https://play.google.com/store/apps/details?id=dev.gradomski.sqtilelauncher),
in English, Polish, German, Italian and Ukrainian. Free, with a single one-time Pro
unlock and no subscription. No ads, no analytics SDK, no account.
