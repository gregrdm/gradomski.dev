1.4.7 fixes one crash and nothing else. No features, no UI changes, two days
after 1.4.6.

It gets its own release rather than waiting for the next batch because the crash
is fatal and **there is no way for a user to avoid it**. It comes from reloading
the app list, and that reload fires on its own — at process start, and on every
package change. You do not have to open anything to hit it, and there is nothing
to steer around. It is triggered by the state of one installed app, so for an
affected phone it repeats for as long as that state lasts.

## What it looked like

The launcher vanishes. Not after tapping something — after a package changed, or
simply on process start.

```
java.lang.NullPointerException: Attempt to invoke virtual method
'java.lang.Class java.lang.Object.getClass()' on a null object reference
    at dev.gradomski.sqtilelauncher.core.apps.AppRepository.loadApps
```

That `getClass()` is the giveaway. It is not a call anybody wrote — it is how R8
compiles a Kotlin null-check. Something the code declared non-null was null.

## `applicationInfo.sourceDir` was null

`LauncherApps.getActivityList` returned an entry whose `sourceDir` was null, and
`loadApps` read it into a non-null `String`.

`sourceDir` is declared non-null in the SDK. But it is filled in by **another
process**, about a package that need not be complete. The most likely culprit is
an **archived app** — archiving has been in Android since 15, and sqTile targets
36. The entry stays visible to the launcher, which is the entire point of
archiving, but there is no APK on the device. The same hole opens for a package
caught mid-install or mid-uninstall — and the reload runs from the
package-changed callback, so we aim straight into that window — and for a
package on unmounted storage.

## Why it killed the process rather than failing a reload

The throw happened inside `map` on the `apps` flow, shared with `stateIn` from a
scope with a `SupervisorJob`.

A supervisor does not *handle* a child's failure, it stops the failure
propagating upward. The exception went to the default uncaught handler and took
the process down. And even if it had not, it would have closed that flow: the app
list would never have refreshed again for the life of the process.

## The fix, in three layers

1. **Fields another process fills in are read through explicitly nullable
   locals**, and each has a degraded answer rather than an exception. No APK
   means "timestamp unknown" — a case the icon disk cache already handles, at the
   cost of one re-render. No label means falling back to the package name: the
   app stays in the list and still launches.
2. **`loadApps` now runs behind a `reloadApps`** that reports the failure to
   Crashlytics and returns the last good list instead of tearing the flow down.
   Before the first successful pass it returns `null` — "not loaded yet", which
   is the project's rule for the initial value of a data flow, and not an empty
   list that a real user state could also produce.
3. **The timestamp helper moved to the top level**, because it needs nothing from
   the instance and can therefore be tested without a device. The reproducing
   case is now a unit test.

**What the fix does not settle.** That the culprit was an archived app comes from
the stack trace and the SDK version, not from a reproduction on a phone. If it
comes back, the report from layer 2 hands over a concrete exception instead of
killing the process — the next report will be diagnostic.

## Three more places of the same class

Invisible to a user, but the same mistake waiting for its turn. All three are
about the same principle: **someone else's APK is external input, not our
invariant.**

- **The icon pack timestamp** wrapped `File(sourceDir)` in a catch for "package
  not found" only. An icon pack is an app like any other, so it can be archived
  too: still installed enough to answer, still without an APK to stamp.
- **The list of available packs** now falls back to the package name for a
  missing label. One odd theme app on a device used to take down the whole pack
  picker.
- **The source drawable** inflates a drawable from **another app's** resources,
  on a path started from composition. A damaged or archived APK threw there,
  into the composition; it returns null now and the tile keeps its plate.

The uninstall entry in the tile menu also got a guard: an entry that will not say
whether it is a system app does not get offered "Uninstall", because there would
be no honest way to handle it.

**Considered and deliberately left alone:** resolving activities calls a binder
that can throw when `system_server` is having a bad day. Not wrapped — it is not
a known failure mode of this app, and the coding standards here say plainly not
to wrap code just in case. If such an exception shows up in Crashlytics, there is
one place to change.

## Scale

One report, which is how this crash arrived at all: a production log on 28
August. I did not read the Crashlytics numbers. If this release ever needs an
argument about reach, that argument has to come from the console, not from here.

## What's next

1.4.8, and it is the opposite of this one in every dimension: a whole-month face
for the calendar tile, a new music tile, a 3×3 size, and a rebuild of how tile
faces are styled.

---

sqTile is on [Google Play](https://play.google.com/store/apps/details?id=dev.gradomski.sqtilelauncher),
in English, Polish, German, Italian and Ukrainian. Free, with a single one-time Pro
unlock and no subscription. No ads, no analytics SDK, no account.
