# WME EZSegments

A Tampermonkey userscript that adds quick segment-editing shortcuts (road type, lock, speed, street/city, unpaved) to the Waze Map Editor (WME).

- `script.user.js` — the entire script.
- `README.md` — changelog, kept in sync with `script.user.js`.

## Reference docs

- Official WME SDK reference: https://www.waze.com/editor/sdk/index.html
  - TypeScript typings (full method/type signatures, more reliable than the HTML docs): https://web-assets.waze.com/wme_sdk_docs/production/latest/wme-sdk-typings.tgz
- wme-sdk-plus (community SDK extension) wiki: https://github.com/TheEditorX/wme-sdk-plus/wiki

Prefer the official SDK (`wmeSDK.*`) over DOM scraping/clicking wherever the SDK exposes the capability.

## Conventions

- **Always bump `@version` in the `script.user.js` header** whenever you change the script, even for small fixes — no exceptions.
- Add a matching entry to the changelog in `README.md` (newest version on top) describing what changed, using the existing `+`/`~`/`-` diff-style format.
