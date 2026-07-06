# WME EZSegments

An easy way to update segments in WME (Waze Map Editor).

## Changelogs

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
