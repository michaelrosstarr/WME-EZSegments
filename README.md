# WME EZSegments

An easy way to update segments in WME (Waze Map Editor).

## Changelogs

### Version 3.12
```diff
~ Restored the "chip" style control fallback (`.w-icon-unpaved-fill` / `wz-checkable-chip`) from the known-working v2.1 implementation, tried before the current checkbox-based control, in case the older WME UI element is what's present
```

### Version 3.11
```diff
~ "Set Road as Unpaved" now clicks the actual "Unpaved" checkbox in the edit panel instead of calling `updateSegment`'s flagAttributes - the SDK call updated local state (and the UI) fine but didn't reliably survive a save on a brand-new segment. Only clicks when the checkbox is currently unchecked, so it stays idempotent
- Removed the `applyUnpaved` per-segment SDK call from `applySettingsToSegment`; it now runs once per selection (via the open panel's checkbox) after the rest of the per-segment attributes are applied
```

### Version 3.10
```diff
~ Reverted the 3.9 change - sending `tunnel`/`headlights`/`nearbyHOV` alongside `unpaved` threw `InvalidStateError: Not allowed to update headlights` on road types that don't support that flag (e.g. Street). `flagAttributes` is per-key optional, so only `unpaved` is sent again; the "not sticking" symptom needs a different root cause
```

### Version 3.9
```diff
~ Fixed "Set Road as Unpaved" not sticking - `updateSegment`'s flagAttributes isn't merged with the segment's existing flags, so sending only `{ unpaved: true }` was clobbering `tunnel`/`headlights`/`nearbyHOV` back to falsy instead of leaving them alone. Now sends all four, preserving the segment's current values for the other three
```

### Version 3.8
```diff
- Removed the "Autosave on Action" option and all automatic `Editing.save()` calls (both from "Quick Set Road" and "Auto-Apply Settings When a Segment is Created") - saving is left entirely to the editor now
```

### Version 3.7
```diff
~ Fixed road type/lock/speed/street/unpaved updates for a segment being applied in one shared try/catch - if any single one threw (e.g. a transient InvalidStateError), the rest were silently skipped for that segment. Each is now applied independently so one failure can't block the others
```

### Version 3.6
```diff
~ Fixed "Auto-Apply Settings When a Segment is Created" causing repeated/recursive saves
- Removed the `trackDataModelEvents`/`wme-data-model-objects-added` based auto-apply mechanism, which replayed every already-loaded segment as "added" and could reprocess the same segment repeatedly
+ Auto-apply-on-create now hooks into the same segment edit panel detection used for the "Quick Set Road" button, reuses the existing toggles (including "Autosave on Action") exactly like the manual flow, and tracks which segments it has already applied to so it never repeats itself
```

### Version 3.5
```diff
+ "Set Street To None" now falls back to the city used by a connected/neighboring segment (the actual suburb the road is in) before falling back to the map's overall top city
~ Fixed a bug where a segment's "empty" city placeholder (a real City object with isEmpty: true, not null) was being treated as a real city, so the top-city/suburb fallback never ran
```

### Version 3.4
```diff
+ Added console debugging logs around the "Set Street To None" city/street resolution to help diagnose reports of the top city not being picked up
```

### Version 3.3
```diff
~ "Set Street To None" now falls back to the map's top city before using an empty city, so a segment without its own city still lands in a real city when one is available
```

### Version 3.2
```diff
~ Fixed a stack overflow that could happen with "Auto-Apply Settings When a Segment is Created" enabled - existing segments loading into view were being reprocessed instead of just newly-drawn ones
```

### Version 3.1
```diff
~ Fixed "Set Street To None" wiping a segment's existing city - it now keeps the segment's current city and only clears the street
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
