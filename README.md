# WME EZSegments

An easy way to update segments in WME (Waze Map Editor).

## Changelogs

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
