# WME EZSegments

An easy way to update segments in WME (Waze Map Editor).

## Changelogs

### Version 4.4
```diff
~ Fixed "Auto-Apply Settings When a Segment is Created" marking an already-existing, already-selected segment as unpaved too - the unpaved control lives in the shared edit panel and toggles unpaved for the whole current selection, but WME sometimes keeps an existing segment selected alongside a newly-drawn one (e.g. the segment it was drawn/split from). Auto-apply now only clicks that shared control when the selection is exactly the new segment(s); otherwise it sets the unpaved flag directly via the SDK, scoped to just the new segment(s), so existing segments are never touched. Road type/lock/speed/street were unaffected since they already update by segment id
```

### Version 4.3
```diff
~ Fixed "Set Road as Unpaved" not being applied when "Auto-Apply Settings When a Segment is Created" is on - WME builds the edit panel's outer container first and fills in the unpaved chip/checkbox a moment later, so the auto-apply hook (which runs the instant the container appears) could lose that race and find nothing to click. Manual "Quick Set Road" never showed this since a human always clicks well after the panel finishes rendering. `applyUnpaved` now retries for up to ~3 seconds against the same captured panel element before giving up
```

### Version 4.2
```diff
~ Fixed `TypeError: can't access property "then", window.SDK_INITIALIZED is undefined` on load - removing the `@grant none` line in 4.0 (to add `@grant GM_xmlhttpRequest` for the update check) made the userscript manager sandbox the script into an isolated `window` that can't see globals the page itself sets, like `SDK_INITIALIZED` from WME's own bootstrap. Restored `@grant none` alongside the specific grants so the script runs unsandboxed in the page context again
```

### Version 4.0
```diff
~ "Set Street To None" city resolution: keeps the segment's own city when it has one, then falls back to the city used by a connected/neighboring segment (the actual suburb the road is in), then the map's overall top city, and only then a fully empty placeholder city as a last resort - fixing earlier bugs where it wiped a segment's existing city and where the "empty" city placeholder was mistaken for a real one. Added console debug logging around this resolution to help diagnose city-related reports
~ Fixed a stack overflow that could happen with "Auto-Apply Settings When a Segment is Created" enabled - existing segments loading into view were being reprocessed instead of just newly-drawn ones
~ Fixed "Auto-Apply Settings When a Segment is Created" causing repeated/recursive saves; it now hooks into the same segment edit panel detection used for "Quick Set Road", reuses the existing toggles, and tracks which segments it has already applied to so it never repeats itself
~ Fixed road type/lock/speed/street/unpaved updates for a segment being applied in one shared try/catch - if any single one threw (e.g. a transient InvalidStateError), the rest were silently skipped. Each is now applied independently so one failure can't block the others
- Removed the "Autosave on Action" option and all automatic `Editing.save()` calls - saving is left entirely to the editor now
~ Fixed "Set Road as Unpaved" not reliably surviving a save on brand-new segments - `updateSegment`'s flagAttributes SDK call updated local state (and the UI) fine but didn't always stick. It now clicks the real "Unpaved" control in the edit panel instead, same approach as the known-working v2.1 release: tries the older "chip" style control (`.w-icon-unpaved-fill` / `wz-checkable-chip`) first, then falls back to the current checkbox (`wz-checkbox[name="unpaved"]`). Only clicks when currently unchecked, so it stays idempotent, and now runs once per selection instead of once per segment
+ Added an in-editor notice when a newer version is available on Greasyfork - checked once on load via `GM_xmlhttpRequest` against the update metadata, with an "update now" link shown in the EZ Segments tab
```

### Version 3.0
```diff
+ Rewritten to use more of the official WME SDK (localized road type names, permission checks, native keyboard shortcuts, segment flag attributes)
+ Added "Auto-Apply Settings When a Segment is Created" option
~ "Set Road as Unpaved" now uses the real segment attribute instead of clicking the UI checkbox
~ Fixed the "U" keybind and script-ready detection bugs
~ Fixed the Alley road type using the wrong internal id
```

### Version 2.0
```diff
+ Added missing road types
+ Can now set the lock level for the segment
+ Can now set individual speed limits for segment
+ Stability changes all around
+ Can toggle more settings
```

### Version 1.3

First major public release of WME EZSegments
```diff
+ Fixed an issue when running in compact mode
+ Updated how settings are stored
~ Updated name to reflect more what the script does
```
