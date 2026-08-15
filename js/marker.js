import {textures} from "textures";
import * as data from "data";
import {controls} from "dom";

let stickyMarker = null;
let justTapped = false;

export function closeTooltip() {
    stickyMarker = null;
    document.getElementById('tooltip').style.display = 'none';
}

function isSidebarOpen() {
    return document.getElementById('sidebar')?.classList.contains('show') ?? false;
}

function positionTooltip(tooltipEl, clientX, clientY) {
    tooltipEl.style.display = 'block';
    tooltipEl.style.left = '0px';
    tooltipEl.style.top = '0px';
    const rect = tooltipEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = clientX + 15;
    let top = clientY - 15;
    if (left + rect.width > vw - 8) left = clientX - rect.width - 15;
    if (top + rect.height > vh - 8) top = clientY - rect.height + 15;
    tooltipEl.style.left = Math.max(8, left) + 'px';
    tooltipEl.style.top = Math.max(8, top) + 'px';
}

document.addEventListener('pointerup', e => {
    if (!justTapped && stickyMarker) {
        const tooltipEl = document.getElementById('tooltip');
        if (!tooltipEl.contains(e.target)) {
            stickyMarker = null;
            tooltipEl.style.display = 'none';
        }
    }
    justTapped = false;
});

function encodeHTML(str) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return str.replace(/[&<>"']/g, function(m) { return map[m]; });
}

class Marker {
    constructor(row) {
        this.#row = row;
        this.#init();
    }

    // Raw data from CSV file
    #row;
    #readable = {};
    #descriptors = [];
    #loot_table_lookup = false;
    #table;
    #texture = textures.uncommon;
    #container = new PIXI.Container();
    #sprite = new PIXI.Sprite(this.#texture);
    #class = "other";

    // Styles that get changed by filters to set back to default
    #tint = 0xFFFFFF;
    #zIndex = 0;

    get row() {
        return this.#row;
    }

    get texture() {
        return textures[this.#row.texture];
    }

    get descriptors() {
        return this.#descriptors.join(" ").toLowerCase();
    }

    get tableData() {
        this.#lookupTable();
        return this.#table;
    }

    get container() {
        return this.#container;
    }

    get sprite() {
        return this.#sprite;
    }

    get readable() {
        return this.#readable;
    }

    get class() {
        return this.#class;
    }

    get originalTint() {
        return this.#tint;
    }

    get originalZIndex() {
        return this.#zIndex;
    }

    #lookupTable() {
        if (this.#loot_table_lookup) return;
        const lootSource = this.#row.LootSource;
        if (lootSource) {
            const lootSourceMap = data.DT_LootSources[lootSource];
            this.#table = data.LOOT_TABLES[lootSource];
            if (!this.#table) {
                let lookupKey = lootSourceMap?.["LootTable"] || lootSource;
                if (lookupKey === "Sack_Flour") {
                    lookupKey = "FlourBag"
                }
                if (lookupKey === "Amphora") {
                    lookupKey = "Liquids"
                }
                if (lookupKey === "Drinks") {
                    lookupKey = "Drinks_All"
                }
                if (lookupKey === "Ammunition") {
                    lookupKey = "Ammunition_ALL"
                }
                if (lookupKey === "Armor") {
                    lookupKey = "Armor_ALL"
                }
                if (lookupKey === "Saddlebag") {
                    lookupKey = "Civilian"
                }
                if (lookupKey === "Corpse_Gavroche") {
                    lookupKey = "Key_Gavroche"
                }
                if (lookupKey === "TinkerCase") {
                    lookupKey = "Crafting_Artificer_TinkerCase"
                }
                if (lookupKey === "SlopBin") {
                    lookupKey = "Crafting_Cook_SlopBin"
                }
                if (lookupKey === "Blacksmith") {
                    lookupKey = "Workbench"
                }
                if (lookupKey === "Graveyard") {
                    lookupKey = "Grave"
                }
                for (const [key, value] of Object.entries(data.LOOT_TABLES)) {
                    if (key.includes("_Map0") || key.includes("Tutorial")) {
                        continue;
                    }
                    if (value.some(entry => entry?.ObjectName?.includes("Tutorial"))) {
                        continue;
                    }
                    if (key.toUpperCase().includes("LIT_" + lookupKey.toUpperCase() + "_0")
                        || key.toUpperCase() === "LIT_" + lookupKey.toUpperCase()
                        || key.toUpperCase() === "LIT_" + lookupKey.toUpperCase().substring(0, lookupKey.length - 1)) {
                        this.#table = value;
                        break;
                    }
                }
                function combineTables(name, tables, rarityFilter) {
                    let newTable = [];
                    for (let i = 0; i < tables.length; i++) {
                        const table = data.LOOT_TABLES[tables[i]];
                        if (!table) {
                            console.error(`Table not found: ${tables[i]}`);
                            continue;
                        }
                        newTable.push(...table);
                    }

                    newTable = newTable.filter(entry => rarityFilter ? rarityFilter.some(r => entry?.Rarity?.includes(r)) : true);

                    let newWeightSum = 0;
                    for (let i = 0; i < newTable.length; i++) {
                        newWeightSum += Number(newTable[i].Weight) || 0;
                    }
                    for (let i = 0; i < newTable.length; i++) {
                        newTable[i].WeightSum = newWeightSum;
                        newTable[i].WeightPercent = (newTable[i].Weight / newWeightSum * 100).toFixed(4);
                    }
                    newTable.sort((a, b) => (Number(b.WeightPercent) || 0) - (Number(a.WeightPercent) || 0));
                    return newTable;
                }
                if (lookupKey === "Medical") {
                    this.#table = combineTables("Medical", ["LIT_Medicine_Uncommon", "LIT_Medicine_Crafting", "LIT_Medicine_Common"])
                }
                if (lookupKey === "Medical_UREL") {
                    this.#table = combineTables("Medical_UREL", [
                        "LIT_Medicine_Uncommon",
                        "LIT_Medicine_Rare",
                        "LIT_Medicine_Epic",
                        "LIT_Medicine_Legendary",
                    ])
                }
                if (lookupKey === "CivilianCupboardDresser") {
                    this.#table = combineTables("CivilianCupboardDresser", ["LIT_CivilianDresser", "LIT_CivilianCupboard"])
                }
                if (lookupKey === "Global") {
                    this.#table = combineTables("Global", [
                        "LIT_GlobalItems_01_Common",
                        "LIT_GlobalItems_02_Uncommon",
                        "LIT_GlobalItems_03_Rare",
                        "LIT_GlobalItems_04_Epic",
                        "LIT_GlobalItems_05_Legendary"
                    ])
                }
                if (lookupKey === "Global_REL") {
                    this.#table = combineTables("Global_UREL", [
                        "LIT_GlobalItems_03_Rare",
                        "LIT_GlobalItems_04_Epic",
                        "LIT_GlobalItems_05_Legendary"
                    ])
                }
                if (lookupKey === "Armor_UREL") {
                    this.#table = combineTables("Armor_UREL", ["LIT_Armor_All"], ["Uncommon", "Rare", "Epic", "Legendary", "Artifact"])
                    // this.#table = combineTables("Armor_UREL", [
                    //     "LIT_Armor_Uncommon",
                    //     "LIT_Armor_Rare",
                    //     "LIT_Armor_Epic",
                    //     "LIT_Armor_Legendary"
                    // ])
                }
                if (lookupKey === "Weapon_Melee") {
                    this.#table = combineTables("Weapon_Melee", ["LIT_1HMelee_All", "LIT_2HMelee_All"])
                }
                if (lookupKey === "Weapon_Melee_REL") {
                    this.#table = combineTables("Weapon_Ranged", ["LIT_1HMelee_All", "LIT_2HMelee_All"], ["Uncommon", "Rare", "Epic", "Legendary", "Artifact"])
                    // this.#table = combineTables("Weapon_Melee_REL", [
                    //     "LIT_1HMelee_Uncommon",
                    //     "LIT_1HMelee_Rare",
                    //     "LIT_1HMelee_Epic",
                    //     "LIT_1HMelee_Legendary",
                    //     "LIT_2HMelee_Uncommon",
                    //     "LIT_2HMelee_Rare",
                    //     "LIT_2HMelee_Epic",
                    //     "LIT_2HMelee_Legendary",
                    // ])
                }
                if (lookupKey === "Weapon_Ranged") {
                    this.#table = combineTables("Weapon_Ranged", ["LIT_Rifles_All", "LIT_Pistols_All"])
                }
                if (lookupKey === "Weapon_Ranged_REL") {
                    this.#table = combineTables("Weapon_Ranged", ["LIT_Rifles_All", "LIT_Pistols_All"], ["Uncommon", "Rare", "Epic", "Legendary", "Artifact"])
                    // this.#table = combineTables("Weapon_Ranged_REL", [
                    //     "LIT_Uncommon_Weap_Pistols",
                    //     "LIT_Rare_Weap_Pistols",
                    //     "LIT_Epic_Weap_Pistols",
                    //     "LIT_Legendary_Weap_Pistols",
                    //     "LIT_Uncommon_Weap_Rifles",
                    //     "LIT_Rare_Weap_Rifles",
                    //     "LIT_Epic_Weap_Rifles",
                    //     "LIT_Legendary_Weap_Rifles",
                    // ])
                }
            }
        }
        if (this.#row.AISpawner) {
            const spawnerTable = data.AI_TABLES[this.#row.AISpawner];
            if (spawnerTable) {
                this.#table = spawnerTable;
                console.log(this.#row.AISpawner, this.#table);
                const reduced = {}
                spawnerTable.forEach(entry => {
                    let key = entry.DisplayName + entry.LootSource;
                    if (!reduced[key]) reduced[key] = {};
                    reduced[key]["TableName"] = entry.TableName;
                    reduced[key]["ObjectName"] = entry.ObjectName;
                    reduced[key]["Weight"] = (Number(reduced[key]["Weight"]) || 0) + Number(entry.Weight);
                    reduced[key]["WeightSum"] = Number(entry.WeightSum);
                    reduced[key]["WeightPercent"] = 100 * (Number(reduced[key]["Weight"]) || 0) / Number(entry.WeightSum);
                    reduced[key]["DisplayName"] = entry.DisplayName;
                    reduced[key]["LootSource"] = entry.LootSource;
                })
                this.#table = [...Object.values(reduced)];
                console.log(this.#row.AISpawner, this.#table);
            }
        }
        this.#loot_table_lookup = true;
    }

    #makeReadable(text) {
        return text
            .replaceAll(/.*\.LIT_/g, "")
            .replaceAll(/[\W_]/g, " ") // Special chars to spaces
            .replaceAll(/([a-z])([A-Z])/g, "$1 $2") // Spaces between camel case words
            // .replaceAll(/(^(C|C LI|BP|SM|DA|PG|SC|LI) ?|(Loot|AISpawner|Node|Static Mesh SM|Config Set DA))/g, "") // Remove prefix/suffix chars
            //.replaceAll(/(Loot|AISpawner|Node|Static Mesh SM)/g, "") // Remove prefix/suffix chars
            // .replaceAll(/(\W0\d.*)/g, "") // Remove prefix/suffix chars
            // .replaceAll(/( (UREL|REL|C)$)/g, "") // Remove prefix/suffix chars
            .replaceAll(/Chateau .*/g, "")
            .replaceAll(/Scav /g, "Scavenger ")
            .replaceAll(/Nat /g, "Naturalist ")
            .replaceAll(/Con /g, "Conservator ")
            .replaceAll(/Spawn Miniboss/g, "Miniboss")
            .trim();
    }

    reposition() {
        this.#applyTransforms();
    }

    #applyTransforms() {
        const rotation = parseFloat(document.getElementById("rotation").value) || 0;
        const scale = parseFloat(document.getElementById("scale").value) || 1;
        const offsetX = parseFloat(document.getElementById("offsetX").value) || 0;
        const offsetY = parseFloat(document.getElementById("offsetY").value) || 0;

        const rawX = this.#row.X;
        const rawY = this.#row.Y;
        const rawZ = this.#row.Z;

        const angleDeg = rotation || 0;
        const angleRad = angleDeg * Math.PI / 180;
        const nx = rawX * Math.cos(angleRad) - rawY * Math.sin(angleRad);
        const ny = rawX * Math.sin(angleRad) + rawY * Math.cos(angleRad);

        this.#sprite.x = nx * scale + offsetX;
        this.#sprite.y = ny * scale + offsetY;
        this.#sprite.z = rawZ * scale;
    }

    #init() {
        const sprite = this.#sprite;
        sprite._type = "marker";
        sprite._marker = this;
        sprite.anchor.set(0.5); // Center on X,Y
        sprite.zIndex = 0;
        this.#applyTransforms()

        this.#container.addChild(sprite);

        this.#readable.name = this.#makeReadable(this.#row.OuterType || "");
        this.#readable.mesh = this.#makeReadable(this.#row.OuterName || "");

        if (this.#row.Keyed) {
            this.#row.Keyed = this.#row.Keyed.replace(/InventoryDefinition_Key'ID_Key_(\w+)'/g, "$1 Key");
        }

        let aiSpawner = this.#row.AISpawner;
        if (aiSpawner) {
            this.#row.AISpawner2 = this.#makeReadable(aiSpawner.replace(/DA_AISpawner_(\w+)/g, "$1"));
        }
        if (this.#row?.CsvJson?.node_tag) {
            const resource = data.RESOURCE_NODES[this.#row.CsvJson.node_tag];
            if (resource) {
                this.#row.DisplayName = resource.DisplayName;
                this.#row.SpawnChance = resource.SpawnChance;
                this.#row.ChanceType = "Resource"
            }
        }
        this.#readable.displayName = this.#row.DisplayName || this.#row.AISpawner2 || this.#row.LootSource || this.#row.OuterType
        if (["StaticMesh"].includes(this.#row.OuterType)) {
            this.#readable.displayName = this.#row.OuterName;
        }

        this.#classify();

        const brightnessFactor = Math.min(1.0, (Number(this.#row.SpawnChance || '100') + 15) / 100);
        if (brightnessFactor < 1.0) {
            const t = this.#tint;
            const r = Math.round(((t >> 16) & 0xFF) * brightnessFactor);
            const g = Math.round(((t >> 8) & 0xFF) * brightnessFactor);
            const b = Math.round((t & 0xFF) * brightnessFactor);
            this.#tint = (r << 16) | (g << 8) | b;
        }

        sprite.tint = this.#tint;
        sprite.zIndex = this.#zIndex;
        this.#container.zIndex = this.#zIndex;

        const tooltipEl = document.getElementById('tooltip');
        const copyDetails = `${this.#row.OuterType}'${this.#row.OuterName}'`;

        sprite.interactive = true;
        sprite.eventMode = "static";
        sprite.cursor = "pointer";

        sprite.on("pointerover", e => {
            if (e.pointerType !== 'mouse' || stickyMarker || isSidebarOpen()) return;
            tooltipEl.innerHTML = this.#tooltipText();
            positionTooltip(tooltipEl, e.clientX, e.clientY);
        });
        sprite.on("pointermove", e => {
            if (e.pointerType !== 'mouse' || stickyMarker) return;
            if (tooltipEl.style.display === 'block') positionTooltip(tooltipEl, e.clientX, e.clientY);
        });
        sprite.on("pointerout", e => {
            if (e.pointerType !== 'mouse' || stickyMarker) return;
            tooltipEl.style.display = 'none';
        });

        let lastTapTime = 0;
        const doubleTapDelay = 300;
        sprite.on("pointertap", e => {
            justTapped = true;
            const now = performance.now();
            if (now - lastTapTime <= doubleTapDelay) {
                navigator.clipboard.writeText(copyDetails);
                lastTapTime = 0;
                return;
            }
            lastTapTime = now;
            if (stickyMarker === this) {
                stickyMarker = null;
                tooltipEl.style.display = 'none';
            } else {
                stickyMarker = this;
                tooltipEl.innerHTML = this.#tooltipText();
                positionTooltip(tooltipEl, e.clientX, e.clientY);
            }
        });
    }

    #formatItem(itemId) {
        const item = data.ITEMS[itemId];
        if (!item) {
            return itemId;
        }
        let amount = ""
        const min = Number(item.LootGenMin) || 1
        const max = Number(item.LootGenMax) || 1
        if (min > 1 || max > 1) amount = `(${min}-${max} items)`;
        return `<span class="item ${item.Rarity.replaceAll('.', ' ')}"><img alt="Icon" src="items/${item.Icon}.png" height="30" loading="lazy"><span class="name">${item.DisplayName}</span> ${amount}</span>`
    }

    #tooltipText() {
        let rows = []
        // rows.push(`<tr><td><strong>Type</strong></td><td>${this.#row["OuterType"]}</td></tr>`)
        rows.push(`<tr><td><strong>Height (Z)</strong></td><td>${this.sprite.z.toFixed(2)}</td></tr>`)
        // rows.push(`<tr><td><strong>Tags</strong></td><td>${[this.#class, ...this.#descriptors].join(", ")}</td></tr>`)
        if (this.#row.SpawnChance) {
            rows.push(`<tr><td><strong>Spawn Chance</strong></td><td>${this.#row.SpawnChance}% (${this.#row.ChanceType})</td></tr>`)
        }
        if (this.#row?.CsvJson?.health) {
            rows.push(`<tr><td><strong>Health</strong></td><td>${this.#row.CsvJson.health}</td></tr>`)
        }
        if (this.#row?.CsvJson?.keyed) {
            rows.push(`<tr><td><strong>Keyed</strong></td><td>${this.#row.CsvJson.keyed}</td></tr>`)
        }
        const lootSource = this.#row.LootSource;
        if (lootSource) {
            const lootSourceMap = data.DT_LootSources[lootSource];
            if (lootSourceMap) {
                rows.push(`<tr><td><strong>LootSource</strong></td><td>${lootSource} → ${lootSourceMap["LootTable"]} (${lootSourceMap["MinEntries"]} - ${lootSourceMap["MaxEntries"]} items)</td></tr>`)
            } else {
                rows.push(`<tr><td><strong>LootSource</strong></td><td>${lootSource}</td></tr>`)
            }
        }
        if (this.#row.AISpawner) {
            rows.push(`<tr><td><strong>AISpawner</strong></td><td>${this.#row.AISpawner}</td></tr>`)
        }
        if (this.#row?.CsvJson?.visible === "False") {
            rows.push(`<tr><td><strong>Visible</strong></td><td>${this.#row?.CsvJson?.visible}</td></tr>`)
        }
        if (this.#row?.CsvJson?.node_tag) {
            const resource = data.RESOURCE_NODES[this.#row.CsvJson.node_tag];
            if (resource) {
                rows.push(`<tr><td><strong>Required Level</strong></td><td>${resource.RequiredLevel}</td></tr>`)
                rows.push(`<tr><td><strong>Resource</strong></td><td>${this.#formatItem(resource.Item)}</td></tr>`)
            }
        }
        if (this.#row?.CsvJson?.quest_id) {
            rows.push(`<tr><td><strong>Quest ID</strong></td><td>${this.#row.CsvJson.quest_id}</td></tr>`)
        } else if (this.#row?.CsvJson?.quest_giver) {
            rows.push(`<tr><td><strong>Quest Giver</strong></td><td>${this.#row.CsvJson.quest_giver}</td></tr>`)
        }
        if (this.#row?.CsvJson?.interaction) {
            rows.push(`<tr><td><strong>Interaction</strong></td><td>${this.#row.CsvJson.interaction}</td></tr>`)
        } else if (this.#row?.CsvJson?.instruction) {
            rows.push(`<tr><td><strong>Instructions</strong></td><td>${this.#row.CsvJson.instruction}</td></tr>`)
        }
        if (this.#row?.CsvJson?.grant_items) {
            Object.keys(this.#row.CsvJson.grant_items).forEach(key => {
                rows.push(`<tr><td><strong>Grants</strong></td><td>${this.#formatItem(key)}</td></tr>`)
            })
        }
        let tableData = this.tableData;
        if (tableData) {
            tableData.forEach(row => {
                const percent = row["WeightPercent"];
                let color = "green"
                if (Number(percent) < 10) color = "orange"
                if (Number(percent) < 2.5) color = "red"

                let displayName = row["ObjectName"];
                if (row["DisplayName"]) displayName = `<span title="${row["Rarity"] || row["ObjectName"]}" class="${row["Rarity"]?.replaceAll(".", " ")}">${encodeHTML(row["DisplayName"])}</span> <small class="text-muted">${row["LootSource"] || row["TableName"].replace("DA_AISpawner_", "")}</small>`;
                const item = data.ITEMS[row["ObjectName"]];
                if (item) {
                    displayName = `${this.#formatItem(row["ObjectName"])} <small class="text-muted">${row["TableName"].replace("DA_AISpawner_", "")}</small>`;
                }

                const hungerTableLookup = {
                    "Hunger_Biter": "LIT_Biter_01",
                    "Hunger_Biter_Elite": "LIT_Biter_Elite",
                    "Hunger_Bloat": "LIT_Bloat_01",
                    "Hunger_Brute": "LIT_Brute_01",
                    "Hunger_Brute_Elite": "LIT_Brute_Elite",
                    "Hunger_Dreg": "LIT_Dreg_01",
                    "Hunger_DregFarmerUnique": "LIT_FarmerDregUnique",
                    "Hunger_Shambler": "LIT_Shambler_01",
                    "Hunger_Waif": "LIT_Waif_01",
                }
                const subrows = []
                const realTable = hungerTableLookup[row["LootSource"]];
                if (realTable) {
                    if (data.LOOT_TABLES[realTable]) {
                        data.LOOT_TABLES[realTable].forEach((row2) => {
                            const percent = row2["WeightPercent"];
                            let color = "green"
                            if (Number(percent) < 10) color = "orange"
                            if (Number(percent) < 2.5) color = "red"

                            let displayName = row2["ObjectName"];
                            if (row2["DisplayName"]) displayName = `<span title="${row2["Rarity"] || row2["ObjectName"]}" class="${row2["Rarity"]?.replaceAll(".", " ")}">${encodeHTML(row2["DisplayName"])}</span> <small class="text-muted">${row2["LootSource"] || row2["TableName"].replace("DA_AISpawner_", "")}</small>`;
                            const item = data.ITEMS[row2["ObjectName"]];
                            if (item) {
                                displayName = `${this.#formatItem(row2["ObjectName"])} <small class="text-muted">${row2["TableName"].replace("DA_AISpawner_", "")}</small>`;
                            }
                            subrows.push(`<tr><td style="text-align: right"><span style="color:${color}">${Number(percent).toFixed(2)}%</span></td><td>${displayName}</td></tr>`)
                        });
                    }
                }

                rows.push(`<tr><td style="text-align: right"><span style="color:${color}">${Number(percent).toFixed(2)}%</span></td><td>${displayName}</td></tr>`)
                let subTable = "";
                if (subrows.length) {
                    subTable = `<div class="table-responsive"><table class="marker-info-table table table-sm table-striped mb-0">${subrows.join("")}</table></div>`
                    rows.push(`<tr><td></td><td>${subTable}</td></tr>`)
                }
            })
        }
        return `<div><h5>${this.#readable.displayName}</h5><div class="table-responsive" style="max-height: 200px"><table class="marker-info-table table table-sm table-striped mb-0">${rows.join("")}</table></div></div>`
    }

    #classify() {
        const sprite = this.#sprite;
        const display_lower = this.#readable.displayName.toLowerCase();

        if (this.#row?.CsvJson?.keyed) {
            let keyTexture = textures.key_special;
            if (this.#row.CsvJson.keyed.includes("Bronze")) keyTexture = textures.key_bronze;
            if (this.#row.CsvJson.keyed.includes("Silver")) keyTexture = textures.key_silver;
            if (this.#row.CsvJson.keyed.includes("Gold")) keyTexture = textures.key_gold;
            const child = new PIXI.Sprite(keyTexture);
            child._type = "marker";
            child.anchor.set(0.5);
            child.x = sprite.x;
            child.y = sprite.y;
            child.zIndex = sprite.zIndex + 1;
            child._screenSize = 48
            this.#container.addChild(child);

            this.#descriptors.push("locked");
        }

        if (this.#row.OuterType.includes("Hub_C") || this.#row.OuterType.includes("Chateau_C")) {
            if (this.#row.OuterType.includes("Door") || this.#row.OuterType.includes("Window")
                || this.#row.OuterType.includes("BP_MX") || this.#row.OuterType.startsWith("PG_")) {
                this.#class = "other";
            } else {
                this.#class = "npc";
                sprite.texture = textures.npcGeneric;
                if (!this.#row.OuterType.includes("Hub")) {
                    this.#tint = 0xFFD800;
                } else {
                    this.#descriptors.push("vendor")
                }
                this.#zIndex = 100;
            }
        }

        if (this.#row.OuterType.startsWith("C_") && controls.mapSelect.value === "map00") {
            this.#class = "other";
            return
        }

        for (const substr of Object.keys(data.chateauProfessionNodes)) {
            if (this.#row.OuterType.startsWith(substr)) {
                sprite.texture = data.chateauProfessionNodes[substr];
                this.#zIndex = 50;
                this.#descriptors.push("profession");
                this.#class = "environment";
            }
        }

        for (const substr of data.looseItems) {
            if (this.#row.OuterType.match(substr) || this.#row.OuterName.match(substr)) {
                this.#class = "loose";
                sprite.texture = textures.itemBag;
                this.#tint = 0xFFFFFF;
                this.#zIndex = 60;

                if (display_lower.includes("rare") || display_lower.includes("legendary")
                    || display_lower.includes("loose") || display_lower.includes("ampoule")
                    || display_lower.includes("key_ring") || display_lower.includes("keys_m0")
                    || display_lower.includes("recip")) {
                    this.#tint = 0xFFD800;
                    this.#zIndex = 100;
                    this.#descriptors.push("good");
                }
                return;
            }
        }

        if (controls.mapSelect.value !== "map00") {
            for (const substr of data.environment) {
                if (this.#row.OuterType.match(substr) || this.#row.OuterName.match(substr)) {
                    this.#class = "environment";
                    sprite.texture = textures.uncommon;

                    if (this.#row.Health) {
                        this.#tint = 0x00D8FF
                        this.#descriptors.push("breakable")
                    }

                    if (display_lower.includes("lift") || display_lower.includes("door") || this.#row.OuterType.includes("Gate_A0")) {
                        sprite.texture = textures.door;
                    } else if (display_lower.includes("window")) {
                        sprite.texture = textures.window;
                    }

                    if (this.#row?.CsvJson?.harvestable_by) {
                        this.#descriptors.push("profession");
                        if (this.#row.CsvJson.harvestable_by.includes("Conservator")) sprite.texture = textures.profConservator;
                        else if (this.#row.CsvJson.harvestable_by.includes("Naturalist")) sprite.texture = textures.profNaturalist;
                        else if (this.#row.CsvJson.harvestable_by.includes("Scavenger")) sprite.texture = textures.profScavenger;
                    }

                    if (this.#row.OuterType.includes("DiscoverableLocationVolume")) {
                        this.#descriptors.push("location")
                        sprite.texture = textures.pingGeneric;
                        this.#tint = 0xff7c7c;
                        this.#zIndex = 200;
                    }

                    if (this.#row.OuterType.toLowerCase().includes("soundtrap")) {
                        sprite.texture = textures.sound;
                        this.#tint = 0xff0000;
                        if (this.#row.OuterType.includes("Crow") || this.#row.OuterType.includes("Glass")
                            || this.#row.OuterType.includes("Pottery"))
                            this.#tint = 0x888888;
                        this.#zIndex = 50;
                    } else if (display_lower.includes("trap") && !display_lower.includes("trapdoor")) {
                        sprite.texture = textures.grenade;
                        if (display_lower.includes("ground_bleed")) sprite.texture = textures.caltrops;
                        this.#tint = 0xff0000;
                        if (display_lower.includes("poison")) this.#tint = 0x00ff00
                        this.#zIndex = 50;
                    }

                    if (display_lower.includes("stairintegrated")) {
                        sprite.texture = textures.stairs;
                        //this.#tint = 0x0000ff;
                    }

                    return;
                }
            }
        }

        for (const substr of data.containers) {
            if (this.#row.LootSource || this.#row.OuterType.match(substr) || this.#row.OuterName.match(substr)) {
                this.#class = "container";
                sprite.texture = textures.pingGeneric;
                this.#zIndex = 50;

                if (display_lower.includes("coop")) {
                    sprite.texture = textures.egg;
                    this.tint = 0xffffff;
                    this.#descriptors.push("egg");
                } else if (display_lower.includes("bullion") || display_lower.includes("jewelry")
                    || display_lower.includes("crate")
                    || display_lower.includes("corpse") || display_lower.includes("clothes")
                    || this.#row.OuterType.includes("Loot_Ranged")
                    || this.#row.OuterType.includes("Loot_Melee")
                    || this.#row.OuterType.includes("Loot_Armor")
                    || display_lower.includes("strongbox")
                    || display_lower.includes("fargot")
                    || this.#row.OuterType.includes("Loot_DungeonM")) {
                    this.#tint = 0xFFD800;
                    this.#zIndex = 100;
                    this.#descriptors.push("good");
                } else if (display_lower.includes("kindling")) {
                    sprite.texture = textures.kindling;
                    this.#descriptors.push("thick branch");
                } else if (display_lower.includes("ash") || display_lower.includes("stove")) {
                    sprite.texture = textures.charcoal;
                    this.#descriptors.push("charcoal");
                }
                return;
            }
        }
        for (const substr of data.spawns) {
            if (this.#row.OuterType.match(substr) || this.#row.OuterName.match(substr)) {
                this.#class = "spawns";

                if (display_lower.includes("raidspawn")) {
                    sprite.texture = textures.social;
                    this.#tint = 0xff00ff;
                    this.zIndex = 200;
                } else if (display_lower.includes("dirigible")) {
                    sprite.texture = textures.extract;
                    this.zIndex = 200;
                }
                return;
            }
        }
        for (const substr of data.creatures) {
            if (this.#row.OuterType.match(substr) || this.#row.OuterName.match(substr)) {
                this.#class = "creature";
                sprite.texture = textures.monster;
                this.#tint = 0xFFA2A2
                this.#zIndex = 50;
                if (display_lower.includes("boss")) this.#tint = 0xffa500
                if (display_lower.includes("bloat") && !display_lower.includes("no bloat")) this.#tint = 0x00ff00
                return;
            }
        }
        for (const substr of data.questItems) {
            if (this.#row.OuterType.match(substr) || this.#row.OuterName.match(substr)) {
                this.#class = "quest";
                sprite.texture = textures.quest;
                this.#tint = 0x00ff00;
                this.#zIndex = 200;
                this.#descriptors.push("quest");
                return;
            }
        }
    }


}

export default Marker