Open a page in Chrome, hit "Add to Home screen", and until 1.4.9 nothing
happened. sqTile had no filter in its manifest for pinning, so the system had
nobody to hand the request to.

It does now. And finding out what that menu item actually does turned up a
second, larger hole that pinning does not fix — so 1.4.9 fixes that too. On top
of it, the settings screen stopped being seven collapsible groups, long-press
stopped picking tiles up by accident, and the background can be a colour of your
own.

Twenty decisions were settled before any code, two of them with their own
written records. The two that matter most to anyone using the launcher are below.

## What you get

You are in the browser on a page, menu → "Add to Home screen". A compact sqTile
dialog appears over it: the page's icon, its name, one sentence saying it will
land at the end of the desktop, and **Add** / **Cancel**. After Add you are back
in the browser exactly where you were, and the tile is waiting on the desktop.

No toast afterwards — the dialog just said what it would do, which is precisely
why the sentence about where it lands has to be *in* the dialog rather than
after it. And no size picker: you are halfway through another task, and you will
fix the size in edit mode when you are actually looking at it.

## This is not a "PWA" feature

The branch was called `feature/pwa` and that is what people reach for it with.
There is not one word about PWAs in the code, and there will not be.

**Android does not tell a launcher "this is a PWA".** "Add to Home screen" is a
pin-shortcut request, and what the launcher receives is identical for a Firefox
bookmark, a contact, a Spotify playlist or a shortcut to a settings page. There
is nothing in that request that says "web".

**And an installable PWA usually is not a shortcut at all.** On a device with
Google services, Chrome mints a **WebAPK** — a real package, which sqTile's app
list already sees like any other app. The pin-shortcut path is what
*non*-installable pages get, and devices without Play services. Confirmed on the
phone, and Samsung Internet behaves the same way: installing a page from either
browser produced a new package and **no pin request at all**.

## The hole that finding that out opened

Chrome 152 calls the menu item **"Install and create shortcut"**. For an
installable page it does the first half — installs the WebAPK — and expects the
launcher to put the icon on the home screen itself. One UI and Pixel do that,
because they place every newly installed app.

sqTile did not. A new package refreshed the app list and that was all.

So: you install a web app, the browser says it will create a shortcut, and the
desktop is empty. That reads as a broken feature, **and it is exactly the case
most people mean when they say "PWA"**. Pinned shortcuts do not fix it, because
in that case there is no pin.

### Web apps land by themselves; nothing else does

The fix is a rule, not a workaround: **installing a WebAPK is the only kind of
install that is itself a request for an icon on the home screen.** The user was
standing in a browser and pressed a button that promised a shortcut. Installing
from Play carries no such intent, and neither does an update.

Both alternatives are worse. Doing nothing leaves the most common case broken.
Placing *every* newly installed app turns the desktop into a dump on Play
installs, updates and system apps — which is the behaviour people leave OEM
launchers to get away from.

Detection is **by metadata, not by package name**. A WebAPK declares its start
URL, confirmed by reading the manifest of an installed shell on the phone. The
package-name prefix stays as a fallback for a shell without readable metadata.
The metadata says what the package **is** — a shell around a start URL — while
the prefix only says what it is **called**.

Duplicate protection is a requirement rather than caution here: the
package-added callback also fires on a package **replacement**, so without it
every update to a web app would add another tile. Matching is by package rather
than by exact component, because a shell that renames its activity between
versions is still, to the person looking at it, the same app.

## The permission that undercuts the whole thing

Launching a pinned shortcut works **only while sqTile is the default launcher**.
Without that role it throws, and there is no way around it: the shortcut's intent
is not readable by anyone but its publisher, so we cannot fall back to starting
it ourselves.

That runs straight into the fact that sqTile ships a "set as default" tile —
which is to say it explicitly assumes users who have not made it their default.

Three states, and they are not the same shape:

| state | permanence | what happens |
| --- | --- | --- |
| publisher uninstalled | permanent — reinstalling does not restore the pin | the tile is deleted, like an app's |
| no default-launcher role | temporary | the tile stays; tapping explains |
| shortcut gone after a device transfer | permanent, but undetectable | the tile stays; tapping offers to remove it |

Those last two need **two different dialog texts, not one**. One is repairable
and leads to the default-launcher settings; the other is not, and the honest
offer is to delete the tile. A single text for both is a lie in one of them.

Chrome softens the first case on its own, as it turns out: it asks whether the
current default launcher can accept a pin at all, and **hides the menu item**
when it cannot. So until sqTile is your default, you do not see "Add to Home
screen" in the first place — a gentler failure than a tile that does nothing.
For testing it means the debug build has to be set as default or the feature
cannot even be invoked, which looks like a broken browser.

### A decision that changed while I was writing the code

In the design session I wrote that the launcher never deletes tiles by itself,
citing the install check that only runs on import. That was wrong. The
application class had been listening for removed packages and deleting their
tiles for a long time — a tile for an uninstalled app disappears immediately, and
always has.

So the rule in the table above is the real one, and it came from re-reading the
code rather than from the design note. Deleting a shortcut tile when its
publisher is uninstalled is one line; reversing that decision later is deleting
the same line.

Pruning on import follows the same principle from the other side. We ask the
system whether the shortcut is still pinned and **remove the tile only on a
definite no**. When we cannot ask — because we are not the default launcher —
we keep it. Importing a backup on a fresh install *before* setting sqTile as
default is a likely order of operations, and pruning on uncertainty would delete
every shortcut tile from a backup the same phone had written. **Deleting because
"I do not know" is a worse failure than a dead tile.**

## The icon is a snapshot, deliberately

It is rendered once, at the moment of pinning, and stored keyed by tile id.

Everywhere else in the launcher, an icon is re-derived on demand and cached in
scratch space that the system may reclaim. A shortcut's icon **cannot be
re-derived** in the states this tile lives in — not while we lack the launcher
role, not after the publisher revokes the shortcut, not after Chrome is
uninstalled. That is exactly the split the icon cache already documents:
derivable things go in the disposable cache, non-derivable things get kept.

Icon packs do not apply, and the picker for them does not appear on this tile
type. Pack mappings are indexed by component, and a shortcut has no component;
an empty picker is worse than no picker. The per-tile override offers only the
full image or a monogram — a themed or silhouetted favicon is a white blob, and
the override exists so you have a way out of "one colourful tile among white
glyphs" without pretending we can theme a favicon.

## Backup carries the icon but not the pin

Worth knowing, because it produces a confusing result. The icon and the label
travel in Android's auto-backup and in a device transfer. **The pin on the
system's side does not.** So after moving to a new phone you get a tile that
looks perfect and will not launch — which is the second dialog text above,
earning its place.

The manual backup file does not even carry the icon; it holds entities only, the
same way contact photos have never travelled in it.

## Field evidence: a shortcut id can be a UUID

Samsung Internet wrote its shortcut id as `7354df85-b807-…`, not as a URL.

That is a small thing with a large consequence: every temptation to read the
page's host out of that identifier — and there was one, for naming the tile —
would break on it. The id stays opaque.

## Long-press stopped picking tiles up

A user reported it plainly: on a full grid it is far too easy to move a tile.

The cause was one gesture doing two jobs. A tile's long-press handler both
entered edit mode **and** picked the tile up in the same callback. Entering edit
mode scales the desktop down, so the tile ran out from under the finger by up to
eight per cent of its distance from the centre of the scale — and the finger was
already in a drag. On a full grid there is no empty space to hold, so the tile
was the **only** way into edit mode: every single trip into editing began with an
accidental tile move that then saved itself.

Long-press now goes straight into edit mode, with the tile you pressed selected,
and picks nothing up until edit mode is already open.

There was a four-cell menu in between — long-press opened a menu instead, and
nothing moved — and it was **withdrawn before this release shipped**. It earned
its place when edit mode opened with no labels at all, but the edit bar now
carries add, tidy up, settings and done itself, so two of the four cells were
that bar's buttons written differently and the other two were doors the menu was
standing in front of. The cost, named: the shortcut straight to wallpaper goes
with it. Wallpaper is still under Settings → Appearance, but nothing jumps
directly to that section any more.

### The frame that never happens

Entering edit mode used to animate exactly one thing — the scale — with a spring,
while everything the mode really changes happened in the switch frame: the rail
appeared and **narrowed every cell**, the bar took its space, the grid jumped
sideways. One animated movement out of four. It ignored the animation-speed
multiplier too, so it sprang even at "no animations".

The resolution simplifies all of it: **the cell size stopped depending on the
mode.** The rail is no longer subtracted from the cell width, so the grid never
recalculates. There is no switch frame, so there is nothing to mask, and no jump
either entering or leaving. Edit mode is one scale over a grid that was already
laid out. It then runs in two stages — the desktop first, the rail and bar
after — and leaving reverses the order by itself.

The scale went from 0.92 to 0.85, and that is not taste: the margin the scale
opens is now the **only** place the rail fits, and 0.92 left about 29 dp for a
44 dp rail.

Three things that do not work, each tried on the phone first:

- **Animating the cell size.** Tiles move relative to one another, and it looks
  like the grid is running away underneath them while they chase it. Worse than
  the jump it replaced.
- **Hiding the recalculation frame under a fade.** Reads as a blink.
- **A compensating scale with a switch threshold.** Plates cross over smoothly,
  but icons and labels have fixed sizes in dp — so *they* jump instead. The jump
  moves rather than disappearing.

## Three bugs found on the way

- **A single-page tile swallowed desktop scrolling.** The vertical gesture
  detector was installed unconditionally and checked how many pages there were
  only when the drag ended. Such a detector consumes from the first frame, so the
  gesture was eaten along its whole length before that check ever ran: a scroll
  begun on a todo tile with one page simply did nothing. It is now installed only
  when there is something to page through.
- **A layout dropped an entire second row, silently.** The flow layout places
  only as many lines as fit its height, and if the next line misses by a single
  pixel it is dropped whole — so three of the six types in one section of the add
  menu were **not drawn at all**, with no trace on screen. Rows are cut by hand
  now: the worst a bad measurement can do is clip a pixel.
- **The held-row highlight had no visible effect.** It was drawn with the helper
  grid, which puts it **under** the tiles, in the accent colour — the same colour
  the tiles are painted. With a free cell it glimmered through the gaps; on a
  full desktop it was covered completely. A marker has to differ from the thing
  it marks, and be on top of it.

## Settings became five pages you swipe between

Seven collapsible groups, with a rule that only one could be open at a time —
because a stack of seven open ones is unreadable. That same rule made it
impossible to compare two settings: you had to open them alternately. And the
largest group was a wall inside a wall: eight sections, about sixteen controls
with a system wallpaper set, longer when open than the rest of the screen put
together.

It is five pages now — look, tiles, content, apps, about — with boxes inside each
instead of bare section headings. A box says where one subject ends and the next
begins without collapsing anything. Nothing was dropped; the box was the unit of
the move.

The move was also the moment to fix things that had ended up wherever they
happened to land:

- **The two wallpapers sit next to each other.** The system wallpaper as a
  background and the tile wallpaper were five sections apart, told apart only by
  a sentence whose entire job was to say "not the other one". Position tells them
  apart now.
- **Animation speed got its own box.** A multiplier applied to **every** animation
  in the app was the tail of a group about how tiles look.
- **"Rate sqTile" moved out of the backup group**, whose subtitle was one word:
  "backup".
- **Badges moved from content to tiles**, because they describe how a tile looks,
  not what it contains.

Two rules hold it together. **The accent frame is used exactly once** — on the
"what's new" box — because an accent frame is this app's way of saying "look
here", and five of them under one another would stop meaning anything. And **the
Pro marker sits on the control, not on the box**, because boxes mix paid and free
controls: a chip on the title of a box holding both would be untrue.

"What's new" shows a marker on its box rather than a modal on launch. The
launcher is the first thing you see after unlocking the phone and has no business
putting anything on top of that.

Generating those notes from the release documents was considered and rejected in
favour of writing them by hand with a guard test that fails when the version code
moves without them: parsing five language versions of a changelog block would be
more code than the thing it protects.

## Your own background colour, and the trap that nearly shipped

Black, white, wallpaper — and now a colour you pick.

It is stored as **two fields**, not one nullable colour: whether a custom
background is live, and which colour was chosen. One field is simpler and loses
the colour every time you switch to black, so the picker would open from scratch
instead of from the colour you were just working on. Separating "what is on" from
"what the user did" is what lets one tap bring your colour back.

Resolution runs in order: wallpaper, then custom, then black or white. Wallpaper
winning first is why a custom colour under a wallpaper is dormant rather than
erased.

**And that order is the trap.** Because the resolver answers in sequence, the
black chip has to **clear the custom flag** — otherwise the custom branch still
wins and the chip **does nothing at all**. The same ordering breaks a write split
across several steps: between "wallpaper off" and "custom off" there is an
emission where the desktop paints the very colour the user is leaving. So each
chip is one atomic write, not a sequence.

Two smaller things worth recording. The chip is filled with the colour only when
selected, and carries a hairline outline, because **any colour can be exactly the
colour of the screen** — unlike the accent, which is always pushed to visibility.
That is not hypothetical: my own saved colour is `#021A0C`, near enough the
settings background that without the outline the chip would be invisible.

And the gate order was corrected in flight: **choosing a saved colour comes
before the Pro check.** The gate guards creating and changing a colour, not
returning to your own. With the checks the other way round, someone whose Pro had
lapsed could not even go back to their own background — which contradicts the
rule that a lapse keeps what you have and only stops you changing it.

## Also in 1.4.9

- **The add-tile menu is grouped into sections you swipe through** — apps, day,
  media, contacts, tools. It was a flat list of every type, 616 dp tall on a
  360×800 screen, growing by 40 dp with each new type; it would have run out of
  screen before I ran out of ideas. Its height no longer depends on how many
  types there are, and each type's section, label and icon are declared together
  in one place, so a new type will not compile until it has answered all three.
- **A toolchain trap that cost an hour**, written down so it costs nobody else
  one: the incremental dexing cache produced a `classes.dex` whose checksum did
  not match its contents, and the app died at launch with a missing-class error
  pointing at something else entirely. The build says success, the JVM tests
  pass, the APK signs and installs. `clean` fixes it; a twenty-line script
  confirms it in half a minute. The dead ends, so nobody walks them twice: a
  notification-listener warning in the system log was a *consequence* of the
  crash loop, and the USB transfer was not corrupting anything.
- **600 unit tests**, no failures.

## What's next

The todo and clock tiles still compute their layout in whole cells, so on the new
3×3 size they can look the way they do at 2×2. That is the next thing to fix, and
it is open work rather than a hidden fallback.

Beyond that: more languages, and then a proper weather screen behind the weather
tile. If you have an opinion about which of those matters more, I would rather
hear it before it ships than after — [get in touch](https://www.gradomski.dev/contact.html).

---

sqTile is on [Google Play](https://play.google.com/store/apps/details?id=dev.gradomski.sqtilelauncher),
in English, Polish, German, Italian and Ukrainian. Free, with a single one-time Pro
unlock and no subscription. No ads, no analytics SDK, no account.
