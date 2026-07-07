// ==UserScript==
// @name            WME EZSegments
// @namespace       https://greasyfork.org/en/scripts/518381-wme-ezsegments
// @version         4.5
// @description     Easily update roads
// @author          https://github.com/michaelrosstarr
// @include 	    /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor.*$/
// @exclude         https://www.waze.com/user/*editor/*
// @exclude         https://www.waze.com/*/user/*editor/*
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_xmlhttpRequest
// @icon            https://www.google.com/s2/favicons?sz=64&domain=waze.com
// @grant           none
// @license         GNU GPL(v3)
// @downloadURL     https://update.greasyfork.org/scripts/518381/WME%20EZSegments.user.js
// @updateURL       https://update.greasyfork.org/scripts/518381/WME%20EZSegments.meta.js
// ==/UserScript==

const ScriptName = GM_info.script.name;
const ScriptVersion = GM_info.script.version;
const STORAGE_KEY = 'WME_EZRoads_Options';

let wmeSDK;
let openPanel;
let roadTypeLocalizedNames = {};

const roadTypes = [
    { id: 1, name: 'Street', value: 1 },
    { id: 2, name: 'Primary Street', value: 2 },
    { id: 3, name: 'Freeway', value: 3 },
    { id: 4, name: 'Ramp', value: 4 },
    { id: 5, name: 'Walking Trail', value: 5 },
    { id: 6, name: 'Major Highway', value: 6 },
    { id: 7, name: 'Minor Freeway', value: 7 },
    { id: 8, name: 'Offroad', value: 8 },
    { id: 9, name: 'Walkway', value: 9 },
    { id: 10, name: 'Pedestrian Walkway', value: 10 },
    { id: 11, name: 'Ferry', value: 15 },
    { id: 12, name: 'Stairway', value: 16 },
    { id: 13, name: 'Private Road', value: 17 },
    { id: 14, name: 'Railroad', value: 18 },
    { id: 15, name: 'Runway/Taxiway', value: 19 },
    { id: 16, name: 'Parking Lot Road', value: 20 },
    { id: 17, name: 'Alley', value: 22 },
];

const defaultOptions = {
    roadType: 1,
    unpaved: false,
    setStreet: false,
    applyOnCreate: false,
    setLock: false,
    updateSpeed: false,
    locks: roadTypes.map(roadType => ({ id: roadType.id, lock: 1 })),
    speeds: roadTypes.map(roadType => ({ id: roadType.id, speed: 60 }))
};

const locks = [
    { id: 1, value: 1 },
    { id: 2, value: 2 },
    { id: 3, value: 3 },
    { id: 4, value: 4 },
    { id: 5, value: 5 },
    { id: 6, value: 6 },
]

const log = (message) => {
    if (typeof message === 'string') {
        console.log('WME_EZRoads: ' + message);
    } else {
        console.log('WME_EZRoads: ', message);
    }
}

// Prefer the SDK's localized road type name (respects the editor's language setting),
// falling back to our hardcoded label if the lookup isn't available for some reason.
const roadTypeName = (roadType) => roadTypeLocalizedNames[roadType.value] || roadType.name;

// Compares dotted version strings (e.g. "3.9" vs "3.10") segment by segment as
// numbers, since a plain string/parseFloat compare gets "3.10" < "3.9" wrong.
const isNewerVersion = (remote, local) => {
    const r = remote.split('.').map(Number);
    const l = local.split('.').map(Number);
    for (let i = 0; i < Math.max(r.length, l.length); i++) {
        const rv = r[i] || 0;
        const lv = l[i] || 0;
        if (rv !== lv) return rv > lv;
    }
    return false;
}

let latestVersion = null;

// Puts an "update available" notice in the settings tab, if it's been rendered yet.
// Safe to call before the tab exists (e.g. from the update check resolving early) -
// it just no-ops until constructSettings() calls it again once the tab is built.
const renderUpdateNotice = () => {
    const el = document.getElementById('ezroads-update-notice');
    if (!el || !latestVersion) return;

    el.style.display = 'block';
    el.innerHTML = `A new version (v${latestVersion}) is available - <a href="https://greasyfork.org/en/scripts/518381-wme-ezsegments" target="_blank" rel="noopener">update now</a>`;
}

// Fetches the Greasyfork update metadata (just the userscript header block) and
// compares its @version against the running one. Uses GM_xmlhttpRequest rather than
// fetch() so it isn't subject to WME's page CSP.
const checkForUpdate = () => {
    if (typeof GM_xmlhttpRequest !== 'function') return;

    GM_xmlhttpRequest({
        method: 'GET',
        url: 'https://update.greasyfork.org/scripts/518381/WME%20EZSegments.meta.js',
        onload: (response) => {
            const match = response.responseText.match(/@version\s+([\d.]+)/);
            if (!match) return;

            if (isNewerVersion(match[1], ScriptVersion)) {
                latestVersion = match[1];
                log(`New version available: ${latestVersion} (current: ${ScriptVersion})`);
                renderUpdateNotice();
            }
        },
        onerror: (e) => log('Update check failed: ' + e)
    });
}

window.SDK_INITIALIZED.then(initScript);

function initScript() {
    wmeSDK = getWmeSdk({ scriptId: "wme-ez-segments", scriptName: "EZ Segments" });

    try {
        wmeSDK.DataModel.Segments.getRoadTypes().forEach(rt => {
            roadTypeLocalizedNames[rt.id] = rt.localizedName || rt.name;
        });
    } catch (e) {
        log('Could not load localized road type names: ' + e);
    }

    WME_EZRoads_bootstrap();
}

const getCurrentCountry = () => {
    return wmeSDK.DataModel.Countries.getTopCountry();
}

const saveOptions = (options) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
}

const getOptions = () => {

    const savedOptions = JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
    // Merge saved options with defaults to ensure all expected options exist
    return { ...defaultOptions, ...savedOptions };
}

const WME_EZRoads_bootstrap = () => {
    if (
        !document.getElementById('edit-panel')
        || !wmeSDK.DataModel.Countries.getTopCountry()
    ) {
        setTimeout(WME_EZRoads_bootstrap, 250);
        return;
    }

    if (wmeSDK.State.isReady()) {
        WME_EZRoads_init();
    } else {
        wmeSDK.Events.once({ eventName: 'wme-ready' }).then(WME_EZRoads_init);
    }
}

const WME_EZRoads_init = () => {
    log("Initing");

    observeEditPanel();
    registerQuickSetShortcut();
    constructSettings();
    checkForUpdate();

    log("Completed Init")
}

// Segment ids we've already auto-applied settings to, so re-opening/re-rendering the
// edit panel for the same still-unsaved segment doesn't run the whole thing again.
const autoAppliedSegmentIds = new Set();

// If "Auto-Apply Settings When a Segment is Created" is on, and the segment(s) just
// selected are genuinely new (unsaved) and haven't been auto-applied yet, apply the
// same settings as the manual "Quick Set Road" flow.
const maybeAutoApplyOnCreate = () => {
    const options = getOptions();
    if (!options.applyOnCreate) return;

    const selection = wmeSDK.Editing.getSelection();
    if (!selection || selection.objectType !== 'segment') return;

    const newIds = selection.ids.filter(id => {
        if (autoAppliedSegmentIds.has(id)) return false;

        try {
            if (!wmeSDK.DataModel.isNew({ dataModelName: 'segments', objectId: id })) return false;
        } catch (e) {
            log(`Could not check if segment ${id} is new, skipping: ${e}`);
            return false;
        }

        // Drawing a new road that starts/ends/passes through an existing segment makes
        // WME split that existing segment into two pieces as a side effect. Both split
        // pieces are themselves unsaved ("new") until the save completes, exactly like
        // the genuinely new segment the user just drew - so `isNew` alone can't tell
        // them apart, and without this check we'd apply settings to the split remnants
        // of an already-mapped road too. Split remnants keep the original segment's
        // address (isEmpty: false); a freshly drawn segment always starts with none.
        try {
            const address = wmeSDK.DataModel.Segments.getAddress({ segmentId: id });
            if (address && !address.isEmpty) {
                log(`Segment ${id} is new but already has an address - likely a split remnant of an existing road, skipping auto-apply`);
                return false;
            }
        } catch (e) {
            log(`Could not check address for segment ${id}, proceeding: ${e}`);
        }

        return true;
    });

    if (!newIds.length) return;

    newIds.forEach(id => autoAppliedSegmentIds.add(id));

    log('New segment(s) selected, auto-applying settings: ' + newIds.join(', '));
    newIds.forEach(id => applySettingsToSegment(id, options));

    // The unpaved control lives in the shared edit panel and toggles unpaved for
    // whatever's currently selected as a whole. That's fine when the selection is
    // exactly the new segment(s), but WME sometimes keeps an already-existing segment
    // selected alongside a newly-drawn one (e.g. the segment it was drawn/split from) -
    // clicking the shared control there would incorrectly mark that existing segment
    // as unpaved too. In that mixed case, set the flag directly via the SDK instead,
    // scoped to just the new segment(s) - less reliable surviving a save than the real
    // click (see applyUnpaved's comment), but it can never touch a segment it shouldn't.
    if (newIds.length === selection.ids.length) {
        safelyApply(newIds.join(','), 'unpaved', () => applyUnpaved(options));
    } else if (options.unpaved) {
        log(`Selection includes existing segment(s) alongside new one(s) (${newIds.join(', ')}) - setting unpaved via SDK instead of the shared panel control so they aren't affected`);
        newIds.forEach(id => safelyApply(id, 'unpaved (fallback)', () =>
            wmeSDK.DataModel.Segments.updateSegment({ segmentId: id, flagAttributes: { unpaved: true } })));
    }
}

// Injects the "Quick Set Road" button into the segment edit panel, and triggers
// auto-apply-on-create. There's no SDK hook for extending that panel, so we still
// need to watch the DOM for it to appear.
const observeEditPanel = () => {
    const roadObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            for (let i = 0; i < mutation.addedNodes.length; i++) {
                const addedNode = mutation.addedNodes[i];

                if (addedNode.nodeType === Node.ELEMENT_NODE) {
                    let editSegment = addedNode.querySelector('#segment-edit-general');
                    if (editSegment) {
                        openPanel = editSegment;

                        maybeAutoApplyOnCreate();

                        // Check if THIS SPECIFIC panel already has the button
                        const parentElement = editSegment.parentNode;
                        if (!parentElement.querySelector('[data-ez-road-button="true"]')) {
                            log("Creating Quick Set Road button for this panel");
                            const quickButton = document.createElement('wz-button');
                            quickButton.setAttribute('type', 'button');
                            quickButton.setAttribute('style', 'margin-bottom: 5px; width: 100%');
                            quickButton.setAttribute('disabled', 'false');
                            quickButton.setAttribute('data-ez-road-button', 'true');
                            quickButton.setAttribute('id', 'ez-road-quick-button-' + Date.now()); // Unique ID using timestamp
                            quickButton.classList.add('send-button', 'ez-comment-button');
                            quickButton.textContent = 'Quick Set Road';
                            parentElement.insertBefore(quickButton, editSegment);
                            quickButton.addEventListener('mousedown', () => handleUpdate());
                            log("Button created for current panel");
                        } else {
                            log("This panel already has the button, skipping creation");
                        }
                    }
                }
            }
        });
    });

    roadObserver.observe(document.getElementById('edit-panel'), { childList: true, subtree: true });
}

// Registers "U" as a native WME shortcut, so it shows up in the editor's shortcut list
// and WME itself takes care of ignoring the key while the user is typing in a field.
// Falls back to a manual keydown listener if the SDK can't register it (e.g. key already bound).
const registerQuickSetShortcut = () => {
    try {
        wmeSDK.Shortcuts.createShortcut({
            shortcutId: 'wme-ezsegments-quick-set',
            description: 'EZ Segments: Quick Set Road',
            shortcutKeys: 'U',
            callback: () => handleUpdate()
        });
        log('Registered "U" shortcut via SDK');
    } catch (e) {
        log('Could not register SDK shortcut, falling back to manual keydown listener: ' + e);

        document.addEventListener("keydown", (event) => {
            const isInputActive = document.activeElement && (
                document.activeElement.tagName === 'INPUT' ||
                document.activeElement.tagName === 'TEXTAREA' ||
                document.activeElement.contentEditable === 'true' ||
                document.activeElement.tagName === 'WZ-AUTOCOMPLETE' ||
                document.activeElement.tagName === 'WZ-TEXTAREA'
            );

            if (!isInputActive && event.key.toLowerCase() === "u") {
                handleUpdate();
            }
        });
    }
}

// Finds (or creates) the "empty" city (cityName: '') for the current country, which is how
// WME represents "no city" for a segment's address.
const getEmptyCity = () => {
    const countryId = getCurrentCountry().id;

    return wmeSDK.DataModel.Cities.getCity({ cityName: '', countryId })
        || wmeSDK.DataModel.Cities.addCity({ cityName: '', countryId });
}

// Finds (or creates) the "empty" street (streetName: '') for a given city, which is how
// WME represents "no street" for a segment's address.
const getEmptyStreet = (cityId) => {
    return wmeSDK.DataModel.Streets.getStreet({ cityId, streetName: '' })
        || wmeSDK.DataModel.Streets.addStreet({ cityId, streetName: '' });
}

// A "real" city means it's an actual named city/suburb, not the placeholder WME uses
// to represent "no city" (which is still a City object, just with isEmpty: true).
const isRealCity = (city) => !!city && !city.isEmpty;

// Looks at segments directly connected to this one (both directions) and returns the
// first real city used by one of their addresses. This is how we pick up the correct
// suburb/city for a segment that doesn't have one of its own yet - based on the roads
// it's actually attached to, rather than the map's overall "top city".
const getNeighboringCity = (segmentId) => {
    for (const reverseDirection of [false, true]) {
        let connectedSegments;
        try {
            connectedSegments = wmeSDK.DataModel.Segments.getConnectedSegments({ segmentId, reverseDirection });
        } catch (e) {
            log(`Could not get connected segments (reverseDirection=${reverseDirection}) for segment ${segmentId}: ${e}`);
            continue;
        }

        for (const neighbor of connectedSegments) {
            const neighborAddress = wmeSDK.DataModel.Segments.getAddress({ segmentId: neighbor.id });
            if (isRealCity(neighborAddress.city)) {
                return neighborAddress.city;
            }
        }
    }

    return null;
}

const applyRoadType = (id, seg, options) => {
    if (options.roadType && seg.roadType !== options.roadType) {
        wmeSDK.DataModel.Segments.updateSegment({ segmentId: id, roadType: options.roadType });
    }
}

const applyLock = (id, options) => {
    if (!options.setLock) return;

    const rank = wmeSDK.State.getUserInfo().rank;
    const selectedRoad = roadTypes.find(rt => rt.value === options.roadType);
    if (!selectedRoad) return;

    const lockSetting = options.locks.find(l => l.id === selectedRoad.id);
    if (!lockSetting) return;

    let toLock = lockSetting.lock - 1;
    if (rank < toLock) toLock = rank;

    wmeSDK.DataModel.Segments.updateSegment({ segmentId: id, lockRank: toLock });
}

const applySpeed = (id, options) => {
    if (!options.updateSpeed) return;

    const selectedRoad = roadTypes.find(rt => rt.value === options.roadType);
    if (!selectedRoad) return;

    const speedSetting = options.speeds.find(s => s.id === selectedRoad.id);
    if (!speedSetting) return;

    const speedValue = parseInt(speedSetting.speed, 10);
    if (isNaN(speedValue) || speedValue < 0) return;

    wmeSDK.DataModel.Segments.updateSegment({
        segmentId: id,
        fwdSpeedLimit: speedValue,
        revSpeedLimit: speedValue
    });
}

// Sets the segment's street to "None". Prefers, in order: the segment's own city, the city
// used by a connected/neighboring segment (i.e. the actual suburb this road sits in), the
// map's overall top city, and only then the fully empty city as a last resort.
const applyEmptyStreet = (id, options) => {
    if (!options.setStreet) return;

    const address = wmeSDK.DataModel.Segments.getAddress({ segmentId: id });
    const neighboringCity = isRealCity(address.city) ? null : getNeighboringCity(id);
    const topCity = wmeSDK.DataModel.Cities.getTopCity();
    log(`[setStreet] segment ${id}: address.city=${JSON.stringify(address.city)}, neighboringCity=${JSON.stringify(neighboringCity)}, topCity=${JSON.stringify(topCity)}`);

    const city = (isRealCity(address.city) && address.city)
        || neighboringCity
        || (isRealCity(topCity) && topCity)
        || getEmptyCity();
    log(`[setStreet] segment ${id}: chosen city=${JSON.stringify(city)}`);

    const street = getEmptyStreet(city.id);
    log(`[setStreet] segment ${id}: chosen street=${JSON.stringify(street)}`);

    wmeSDK.DataModel.Segments.updateAddress({ segmentId: id, primaryStreetId: street.id });

    const newAddress = wmeSDK.DataModel.Segments.getAddress({ segmentId: id });
    log(`[setStreet] segment ${id}: address after update=${JSON.stringify(newAddress)}`);
}

// Unpaved, via a real click on the edit panel's control rather than the SDK's
// updateSegment flagAttributes call - that call reliably updates local state (and
// the UI reflects it) but doesn't always survive a save for a brand-new segment.
// Clicking through the actual control goes through WME's own handling instead, same
// as the known-working v2.1 approach. Tries the older "chip" style control first,
// then falls back to the checkbox used by the current WME UI. Only clicks when
// currently unchecked (v2.1 didn't guard this, which could toggle it back off if
// triggered more than once, e.g. on a multi-segment selection).
//
// WME builds the edit panel's outer container first and fills in its inner controls
// (this chip/checkbox included) a moment later. The manual "Quick Set Road" flow never
// notices, since a human always clicks well after that finishes - but the auto-apply-on-
// create hook runs the instant the container appears, so it can lose that race and find
// nothing to click. Retry for a bit against the same captured panel element (not the
// module-level `openPanel`, which may have already moved on to a different selection)
// before giving up.
const applyUnpaved = (options, panel = openPanel, attempt = 0) => {
    if (!options.unpaved || !panel) return;

    const unpavedIcon = panel.querySelector('.w-icon-unpaved-fill');
    const unpavedChip = unpavedIcon?.closest('wz-checkable-chip');
    if (unpavedChip) {
        unpavedChip.click();
        log('Clicked unpaved chip');
        return;
    }

    const wzCheckbox = panel.querySelector('wz-checkbox[name="unpaved"]');
    if (wzCheckbox) {
        const input = wzCheckbox.querySelector('input[type="checkbox"][name="unpaved"]');
        const isChecked = wzCheckbox.hasAttribute('checked') || input?.checked;
        if (isChecked) return;

        (input || wzCheckbox).click();
        log('Clicked unpaved checkbox');
        return;
    }

    const MAX_ATTEMPTS = 15; // ~3s at 200ms apart
    if (attempt < MAX_ATTEMPTS && panel.isConnected) {
        setTimeout(() => safelyApply('unpaved (retry)', 'unpaved', () => applyUnpaved(options, panel, attempt + 1)), 200);
        return;
    }

    log('Could not toggle unpaved setting - no compatible elements found' + (attempt ? ` after ${attempt} retries` : ''));
}

// Runs a single attribute update for a segment, in isolation - if it throws (e.g. a
// transient InvalidStateError on a segment that's still being drawn/connected), the
// other attributes for this segment still get applied instead of being skipped.
const safelyApply = (id, label, fn) => {
    try {
        fn();
    } catch (e) {
        log(`Failed to apply ${label} to segment ${id}: ${e}`);
    }
}

// Applies the configured options to a single segment. Shared by the manual
// "Quick Set Road" trigger (button/shortcut) and the auto-apply-on-create watcher.
const applySettingsToSegment = (id, options) => {
    let seg;
    try {
        if (!wmeSDK.DataModel.Segments.hasPermissions({ segmentId: id })) {
            log(`Skipping segment ${id}, no edit permission`);
            return;
        }

        seg = wmeSDK.DataModel.Segments.getById({ segmentId: id });
    } catch (e) {
        log(`Failed to look up segment ${id}: ${e}`);
        return;
    }

    if (!seg) return;

    safelyApply(id, 'road type', () => applyRoadType(id, seg, options));
    safelyApply(id, 'lock', () => applyLock(id, options));
    safelyApply(id, 'speed', () => applySpeed(id, options));
    safelyApply(id, 'street', () => applyEmptyStreet(id, options));
}

const handleUpdate = () => {
    const selection = wmeSDK.Editing.getSelection();

    if (!selection || selection.objectType !== 'segment') return;

    log('Updating selected segments');

    const options = getOptions();
    log('Options at time of update: ' + JSON.stringify(options));
    selection.ids.forEach(id => applySettingsToSegment(id, options));
    safelyApply(selection.ids.join(','), 'unpaved', () => applyUnpaved(options));
}

const constructSettings = () => {
    const localOptions = getOptions();
    let currentRoadType = localOptions.roadType;

    const update = (key, value) => {
        const options = getOptions();
        options[key] = value;
        localOptions[key] = value;
        saveOptions(options);
    };

    // Update lock level for a specific road type
    const updateLockLevel = (roadTypeId, lockLevel) => {
        const options = getOptions();
        const lockIndex = options.locks.findIndex(l => l.id === roadTypeId);
        if (lockIndex !== -1) {
            options.locks[lockIndex].lock = parseInt(lockLevel);
            localOptions.locks = options.locks;
            saveOptions(options);
        }
    };

    // Update speed for a specific road type
    const updateSpeed = (roadTypeId, speed) => {
        const options = getOptions();
        const speedIndex = options.speeds.findIndex(s => s.id === roadTypeId);

        // Make sure we have a valid integer
        let speedValue = parseInt(speed, 10);
        if (isNaN(speedValue)) {
            speedValue = -1; // Default to -1 for invalid values
        }

        log(`Updating speed for road type ${roadTypeId} to ${speedValue}`);

        if (speedIndex !== -1) {
            options.speeds[speedIndex].speed = speedValue;
            localOptions.speeds = options.speeds;
            saveOptions(options);
        }
    };

    // Reset all options to defaults
    const resetOptions = () => {
        saveOptions(defaultOptions);
        // Refresh the page to reload settings
        window.location.reload();
    };

    // Checkbox option definitions
    const checkboxOptions = [
        { id: 'setStreet', text: 'Set Street To None', key: 'setStreet' },
        { id: 'unpaved', text: 'Set Road as Unpaved', key: 'unpaved' },
        { id: 'setLock', text: 'Set the lock to the level', key: 'setLock' },
        { id: 'updateSpeed', text: 'Update speed limits', key: 'updateSpeed' },
        { id: 'applyOnCreate', text: 'Auto-Apply On Create', key: 'applyOnCreate' }
    ];

    // Helper function to create radio buttons
    const createRadioButton = (roadType) => {
        const id = `road-${roadType.id}`;
        const isChecked = localOptions.roadType === roadType.value;
        const lockSetting = localOptions.locks.find(l => l.id === roadType.id) || { id: roadType.id, lock: 1 };
        const speedSetting = localOptions.speeds.find(s => s.id === roadType.id) || { id: roadType.id, speed: 60 };

        const div = $(`<div class="ezroads-option">
            <div class="ezroads-radio-container">
                <input type="radio" id="${id}" name="defaultRoad" ${isChecked ? 'checked' : ''}>
                <label for="${id}">${roadTypeName(roadType)}</label>
                <select id="lock-level-${roadType.id}" class="road-lock-level" data-road-id="${roadType.id}" ${!localOptions.setLock ? 'disabled' : ''}>
                    ${locks.map(lock => `<option value="${lock.value}" ${lockSetting.lock === lock.value ? 'selected' : ''}>L${lock.value}</option>`).join('')}
                </select>
                <input type="number" id="speed-${roadType.id}" class="road-speed" data-road-id="${roadType.id}"
                       value="${speedSetting.speed}" min="-1" ${!localOptions.updateSpeed ? 'disabled' : ''}>
            </div>
        </div>`);

        div.find('input[type="radio"]').on('click', () => {
            update('roadType', roadType.value);
            currentRoadType = roadType.value;
        });

        div.find('select').on('change', function () {
            updateLockLevel(roadType.id, $(this).val());
        });

        div.find('input.road-speed').on('change', function () {
            // Get the value as a number
            const speedValue = parseInt($(this).val(), 10);
            // If it's not a number, reset to 0
            if (isNaN(speedValue)) {
                $(this).val(0);
                updateSpeed(roadType.id, 0);
            } else {
                updateSpeed(roadType.id, speedValue);
            }
        });

        return div;
    };

    // Helper function to create checkboxes
    const createCheckbox = (option) => {
        const isChecked = localOptions[option.key];
        const div = $(`<div class="ezroads-option">
            <input type="checkbox" id="${option.id}" name="${option.id}" ${isChecked ? 'checked' : ''}>
            <label for="${option.id}">${option.text}</label>
        </div>`);
        div.on('click', () => update(option.key, $(`#${option.id}`).prop('checked')));
        return div;
    };

    // Register the script tab
    wmeSDK.Sidebar.registerScriptTab().then(({ tabLabel, tabPane }) => {
        tabLabel.innerText = 'EZ Segments';
        tabLabel.title = 'Easily Update Roads';

        // Setup base styles
        const styles = $(`<style>
            #ezroads-settings h2, #ezroads-settings h5 {
                margin-top: 0;
                margin-bottom: 10px;
            }
            .ezroads-section {
                margin-bottom: 15px;
            }
            .ezroads-option {
                margin-bottom: 8px;
            }
            .ezroads-radio-container {
                display: flex;
                align-items: center;
            }
            .ezroads-radio-container input[type="radio"] {
                margin-right: 5px;
            }
            .ezroads-radio-container label {
                flex: 1;
                margin-right: 10px;
                text-align: left;
            }
            .ezroads-radio-container select {
                width: 80px;
                margin-left: auto;
                margin-right: 5px;
            }
            .ezroads-radio-container input.road-speed {
                width: 60px;
            }
            .ezroads-reset-button {
                margin-top: 20px;
                padding: 8px 12px;
                background-color: #f44336;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
            }
            .ezroads-reset-button:hover {
                background-color: #d32f2f;
            }
        </style>`);

        tabPane.innerHTML = '<div id="ezroads-settings"></div>';
        const scriptContentPane = $('#ezroads-settings');
        scriptContentPane.append(styles);

        // Header section
        const header = $(`<div class="ezroads-section">
            <h2>EZ Segments</h2>
            <div>Current Version: <b>${ScriptVersion}</b></div>
            <div>Update Keybind: <kbd>u</kbd></div>
            <div id="ezroads-update-notice" style="display: none; margin-top: 5px; color: #f44336; font-weight: bold;"></div>
        </div>`);
        scriptContentPane.append(header);

        // In case the update check already resolved before this tab was built
        renderUpdateNotice();

        // Road type and options header
        const roadTypeHeader = $(`<div class="ezroads-section">
            <div style="display: flex; align-items: center;">
                <div style="flex-grow: 1; text-align: center;">Road Type</div>
                <div style="width: 80px; text-align: center;">Lock</div>
                <div style="width: 60px; text-align: center;">Speed</div>
            </div>
        </div>`);
        scriptContentPane.append(roadTypeHeader);

        // Road type section with header
        const roadTypeSection = $(`<div class="ezroads-section">
            <div id="road-type-options"></div>
        </div>`);
        scriptContentPane.append(roadTypeSection);

        const roadTypeOptions = roadTypeSection.find('#road-type-options');
        roadTypes.forEach(roadType => {
            roadTypeOptions.append(createRadioButton(roadType));
        });

        // Additional options section
        const additionalSection = $(`<div class="ezroads-section">
            <h5>Additional Options</h5>
            <div id="additional-options"></div>
        </div>`);
        scriptContentPane.append(additionalSection);

        const additionalOptions = additionalSection.find('#additional-options');
        checkboxOptions.forEach(option => {
            additionalOptions.append(createCheckbox(option));
        });

        // Update all lock dropdowns when setLock checkbox changes
        $(document).on('click', '#setLock', function () {
            const isChecked = $(this).prop('checked');
            $('.road-lock-level').prop('disabled', !isChecked);
        });

        // Update all speed inputs when updateSpeed checkbox changes
        $(document).on('click', '#updateSpeed', function () {
            const isChecked = $(this).prop('checked');
            $('.road-speed').prop('disabled', !isChecked);
            log('Speed update option changed to: ' + isChecked);
        });

        // Reset button section
        const resetButton = $(`<button class="ezroads-reset-button">Reset All Options</button>`);
        resetButton.on('click', function () {
            if (confirm('Are you sure you want to reset all options to default values?')) {
                resetOptions();
            }
        });
        scriptContentPane.append(resetButton);
    });
};
