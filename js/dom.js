/**
 * Wait for the DOM to be ready.
 * Alternate to $(document).ready()
 */
export const doc_ready = async () => {
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

    elements.metaVersion = document.querySelector("meta[name='version']").content;

    console.log(elements.metaVersion);

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
    controls.showOverlay = document.getElementById("showOverlay");
    controls.searchBox = document.getElementById("searchBox");
    controls.checkShowOnlyMatches = document.getElementById("showOnlyMatches");
    controls.enableHeightFilter = document.getElementById("filterZrange");
    controls.sliderHeight = document.getElementById("zRange");

    TomSelect.define('select_all', function () {
        const self = this;
        self.on('dropdown_open', function (dropdown) {
            if (dropdown.querySelector('.ts-select-all')) return;
            const bar = document.createElement('div');
            bar.className = 'ts-select-all d-flex gap-1 p-1 border-bottom';
            bar.innerHTML = '<button type="button" class="btn btn-sm btn-outline-secondary flex-fill">All</button>'
                + '<button type="button" class="btn btn-sm btn-outline-secondary flex-fill">None</button>';
            bar.children[0].addEventListener('mousedown', e => {
                e.preventDefault(); // keep dropdown open
                self.setValue(Object.keys(self.options), true);
                self.trigger('change', self.getValue());
            });
            bar.children[1].addEventListener('mousedown', e => {
                e.preventDefault();
                self.clear(true);
                self.trigger('change', self.getValue());
            });
            dropdown.prepend(bar);
        });
    });

    function syncLabel(ts) {
        if (!ts._label) {
            ts._label = document.createElement('span');
            ts._label.className = 'ts-summary';
            ts.control.prepend(ts._label);
        }
        const n = ts.getValue().length;
        const total = Object.keys(ts.options).length;
        ts._label.textContent = n === 0 ? 'None selected'
            : n === total ? 'All selected'
                : `${n} selected`;
        ts._label.classList.toggle('text-muted', n === 0);
    }

    const tsOptions = {
        plugins: ['checkbox_options', 'select_all'],
        create: false,
        persist: false,
        maxOptions: null,
        closeAfterSelect: false,
        hideSelected: false,
        onInitialize() {
            syncLabel(this);
        },
        onChange() {
            syncLabel(this);
        },
    };

    controls.showAll = document.getElementById("showAll");
    controls.hideAll = document.getElementById("hideAll");

    controls.npcSelect = new TomSelect('#npc-select', tsOptions);
    controls.lootSourceSelect = new TomSelect('#loot-source-select', tsOptions);
    controls.lootSelect = new TomSelect('#loot-select', tsOptions);
    controls.looseSelect = new TomSelect('#loose-select', tsOptions);
    controls.envSelect = new TomSelect('#env-select', tsOptions);
    controls.creatureSelect = new TomSelect('#creature-select', tsOptions);
    controls.questSelect = new TomSelect('#quest-select', tsOptions);
    controls.spawnsSelect = new TomSelect('#spawns-select', tsOptions);
    controls.otherSelect = new TomSelect('#other-select', tsOptions);

    const allSelects = () => [
        controls.npcSelect, controls.lootSourceSelect, controls.lootSelect, controls.looseSelect, controls.envSelect,
        controls.creatureSelect, controls.questSelect, controls.spawnsSelect, controls.otherSelect
    ];

    controls.showAll.onclick = () => {
        allSelects().forEach(ts => {
            ts.setValue(Object.keys(ts.options), true);
            ts.trigger('change', ts.getValue())
        });
    };

    controls.hideAll.onclick = () => {
        allSelects().forEach(ts => {
            ts.clear(true);
            ts.trigger('change', ts.getValue())
        });
    };

    console.log("Loaded [controls:", controls, "] [elements:", elements, "]")
}


export function refreshLabels() {
    [controls.npcSelect, controls.lootSourceSelect, controls.lootSelect, controls.looseSelect, controls.envSelect,
        controls.creatureSelect, controls.questSelect, controls.spawnsSelect, controls.otherSelect
    ].forEach(ts => {
        if (!ts._label) return;
        const n = ts.getValue().length;
        const total = Object.keys(ts.options).length;
        ts._label.textContent = n === 0 ? 'None selected'
            : n === total ? 'All selected'
                : `${n} selected`;
        ts._label.classList.toggle('text-muted', n === 0);
    });
}

