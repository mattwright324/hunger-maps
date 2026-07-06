/**
 * Wait for the DOM to be ready.
 * Alternate to $(document).ready()
 */
export const doc_ready =  async () => {
    return new Promise(resolve => {
        if (document.readyState !== "loading") {
            resolve();
        } else {
            document.addEventListener("DOMContentLoaded", resolve);
        }
    })
}

let enabledTooltips = false;

/**
 * Listener to dynamically create tooltips for elements at hover time.
 * Significantly more efficient than creating all tooltips at page load and constantly recreating them on dynamically changing pages.
 */
export function enable_bs_tooltips() {
    if (enabledTooltips) {
        return
    }
    enabledTooltips = true;

    console.log("Enabling dynamic tooltips");

    document.addEventListener('mouseover', function (e) {
        const target = e.target.closest('[data-bs-toggle="tooltip"]');
        if (target && !target.hasAttribute("bs-tt-added")) {
            target.setAttribute("bs-tt-added", true);
            const tooltip = new bootstrap.Tooltip(target);
            tooltip.show();
        }
    })
}

/**
 * Store all DOM elements and controls here.
 */
export const controls = {}
export const elements = {}

let readyState;
let readyPromise;

/**
 * Extension of doc_ready() to load required DOM elements and controls.
 */
export const dom_ready = async () => {
    if (readyState === 'ready') {
        return;
    }
    if (readyState === 'loading') {
        return readyPromise;
    }
    readyState = 'loading';

    return readyPromise = dom_load();
}

const dom_load = async () => {
    await doc_ready();

    enable_bs_tooltips();

    new ClipboardJS(".clipboard");

    const urlSearchParams = new URL(window.location).searchParams;

    elements.divDataAdjust = document.getElementById("data-adjust");
    controls.inputScale = document.getElementById("scale");
    controls.inputOffsetX = document.getElementById("offsetX");
    controls.inputOffsetY = document.getElementById("offsetY");
    controls.inputRotation = document.getElementById("rotation");

    if (urlSearchParams.has("adjust")) {
        elements.divDataAdjust.removeAttribute("style")
    }

    controls.mapSelect = document.getElementById("mapSelect");
    controls.searchBox = document.getElementById("searchBox");
    controls.checkShowOnlyMatches = document.getElementById("showOnlyMatches");
    controls.enableHeightFilter = document.getElementById("filterZrange");
    controls.sliderHeight = document.getElementById("zRange");
    controls.hideAiSpawner = document.getElementById("hideAiSpawner");

    const options = {
        enableFiltering: true,
        enableCaseInsensitiveFiltering: true,
        includeSelectAllOption: true,
        buttonWidth: '100%',
        maxHeight: 400,
    }

    controls.showAll = document.getElementById("showAll");
    controls.hideAll = document.getElementById("hideAll");

    controls.lootSelect = $("#loot-select").multiselect(options);
    controls.looseSelect = $("#loose-select").multiselect(options);
    controls.envSelect = $("#env-select").multiselect(options);
    controls.creatureSelect = $("#creature-select").multiselect(options);
    controls.questSelect = $("#quest-select").multiselect(options);
    controls.spawnsSelect = $("#spawns-select").multiselect(options);
    controls.otherSelect = $("#other-select").multiselect(options);

    controls.showAll.onclick = () => {
        [controls.lootSelect, controls.looseSelect, controls.envSelect, controls.creatureSelect, controls.questSelect, controls.spawnsSelect, controls.otherSelect].forEach(control => {
            control.multiselect('selectAll', false)
            control.multiselect('updateButtonText')
        })
        controls.lootSelect.trigger('change')
    }

    controls.hideAll.onclick = () => {
        [controls.lootSelect, controls.looseSelect, controls.envSelect, controls.creatureSelect, controls.questSelect, controls.spawnsSelect, controls.otherSelect].forEach(control => {
            control.multiselect('deselectAll', false)
            control.multiselect('updateButtonText')
        })
        controls.lootSelect.trigger('change')
    }

    console.log("Loaded [controls:", controls, "] [elements:", elements, "]")
}

export function rebuildSelects() {
    [controls.lootSelect, controls.looseSelect, controls.envSelect, controls.creatureSelect, controls.questSelect,
        controls.spawnsSelect, controls.otherSelect].forEach(control => {
        control.multiselect("rebuild");
    })
}