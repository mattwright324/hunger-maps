import {elements} from "dom";
import Marker from "marker";

const debug = new URLSearchParams(window.location.search).has("debug");

function splitCSVLine(line) {
    const cols = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                cur += '"';
                i++;
            } else inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            cols.push(cur);
            cur = "";
        } else {
            cur += ch;
        }
    }
    cols.push(cur);
    return cols;
}

function csvDataLines(text) {
    return text.split(/\r?\n/).slice(1).filter(line => line.trim());
}

async function getMarkerCsvData(url) {
    return await fetch(url)
        .then(r => r.text())
        .then(text => parseMarkerCSV(text));
}

async function parseMarkerCSV(text) {
    const lines = csvDataLines(text);
    const rows = [];

    for (let line of lines) {
        const cols = splitCSVLine(line);
        if (cols.length < 6) continue;

        let [
            RootType, OuterType, OuterName, X, Y, Z,
            DisplayName, LootSource, SpawnChance, ChanceType, AISpawner, CsvJson
        ] = cols;

        if (!X || !Y || !Z) continue;

        //if (Visible === "False") continue;

        let json = {}
        try {
            json = JSON.parse(CsvJson || "{}")
        } catch (e) {
            console.log("Error parsing JSON:", CsvJson, e);
        }

        rows.push({
            RootType,
            OuterType,
            OuterName,
            X: parseFloat(X),
            Y: parseFloat(Y),
            Z: parseFloat(Z),
            DisplayName,
            LootSource,
            SpawnChance,
            ChanceType,
            AISpawner,
            CsvJson: json,
            StackMoved: false
        });
    }

    console.log("Parsed CSV data:", rows.length, text);
    return rows;
}

// CSV WeightPercent is rounded to 4 decimals, leaving rare entries with only 1-2 significant digits.
// Recalculate it from the raw weights, keeping the CSV value when they aren't numbers
function exactPercent(Weight, WeightSum, WeightPercent) {
    const percent = 100 * Number(Weight) / Number(WeightSum);
    return Number.isFinite(percent) ? percent : WeightPercent;
}

async function getLootCsvData(url) {
    return await fetch(url)
        .then(r => r.text())
        .then(text => parseLootCSV(text));
}

async function parseLootCSV(text) {
    const lines = csvDataLines(text);
    const rows = [];

    for (let line of lines) {
        const cols = splitCSVLine(line);

        const [TableName, Weight, WeightSum, WeightPercent, ObjectName] = cols;

        rows.push({TableName, Weight, WeightSum, WeightPercent: exactPercent(Weight, WeightSum, WeightPercent), ObjectName});
    }

    console.log("Parsed CSV data:", rows.length, text);
    return rows;
}

async function getSourceCsvData(url) {
    return await fetch(url)
        .then(r => r.text())
        .then(text => parseSourceCSV(text));
}

async function parseSourceCSV(text) {
    const lines = csvDataLines(text);
    const rows = [];

    for (let line of lines) {
        const cols = splitCSVLine(line);

        const [SourceName,MinEntries,MaxEntries,LootTable,TableName,Weight,WeightSum,WeightPercent,AlwaysSpawn] = cols;

        rows.push({SourceName,MinEntries,MaxEntries,LootTable,TableName,Weight,WeightSum,WeightPercent: exactPercent(Weight, WeightSum, WeightPercent),AlwaysSpawn});
    }

    console.log("Parsed CSV data:", rows.length, text);
    return rows;
}

async function getAiCsvData(url) {
    return await fetch(url)
        .then(r => r.text())
        .then(text => parseAiCSV(text));
}

async function parseAiCSV(text) {
    const lines = csvDataLines(text);
    const rows = [];

    for (let line of lines) {
        const cols = splitCSVLine(line);

        const [TableName, Weight, WeightSum, WeightPercent, ObjectName, DisplayName, LootSource] = cols;

        rows.push({TableName, Weight, WeightSum, WeightPercent: exactPercent(Weight, WeightSum, WeightPercent), ObjectName, DisplayName, LootSource});
    }

    console.log("Parsed CSV data:", rows.length, text);
    return rows;
}

async function getNodeCsvData(url) {
    return await fetch(url)
        .then(r => r.text())
        .then(text => parseNodeCSV(text));
}

async function parseNodeCSV(text) {
    const lines = csvDataLines(text);
    const rows = [];

    for (let line of lines) {
        const cols = splitCSVLine(line);

        const [ResourceKey, RequiredLevel, SpawnChance, DisplayName, Item, MinAmount, MaxAmount] = cols;

        rows.push({ResourceKey, RequiredLevel, SpawnChance, DisplayName, Item, MinAmount, MaxAmount});
    }

    console.log("Parsed CSV data:", rows.length, text);
    return rows;
}

async function getItemsCsvData(url) {
    return await fetch(url)
        .then(r => r.text())
        .then(text => parseItemsCSV(text));
}

async function parseItemsCSV(text) {
    const lines = csvDataLines(text);
    const rows = [];

    for (let line of lines) {
        const cols = splitCSVLine(line);

        const [ItemType, ItemName, BrushID, Icon, IconSrc, DisplayName, Value, Rarity, Capacity, MaxStackSize, LootGenMin, LootGenMax] = cols;

        rows.push({ItemType, ItemName, BrushID, Icon, IconSrc, DisplayName, Value, Rarity, Capacity, MaxStackSize, LootGenMin, LootGenMax});
    }

    console.log("Parsed CSV data:", rows.length, text);
    return rows;
}

async function getVendorCsvData(url) {
    return await fetch(url)
        .then(r => r.text())
        .then(text => parseVendorCSV(text));
}

async function parseVendorCSV(text) {
    const lines = csvDataLines(text);
    const rows = [];

    for (let line of lines) {
        const cols = splitCSVLine(line);

        const [TableName, Weight, WeightSum, WeightPercent, ObjectName] = cols;

        rows.push({TableName, Weight, WeightSum, WeightPercent: exactPercent(Weight, WeightSum, WeightPercent), ObjectName});
    }

    console.log("Parsed CSV data:", rows.length, text);
    return rows;
}

const lootTables = await getLootCsvData("./data/loot_tables.csv?v=" + elements.metaVersion);
export const LOOT_TABLES = {}
lootTables.forEach(row => {
    if (!LOOT_TABLES[row.TableName]) LOOT_TABLES[row.TableName] = [];
    LOOT_TABLES[row.TableName].push(row);
})

console.log("Loaded loot tables:", LOOT_TABLES);

function combineTables(sourceName, sources) {
    const combinedByObjectName = new Map()

    sources.forEach(source => {
        const table = LOOT_TABLES[source["TableName"]]
        if (!table) {
            console.warn("Missing loot table for source:", source["TableName"]);
            return;
        }
        const copy = []
        copy.push(...table.map(entry => ({ ...entry })));
        copy.forEach(entry => {
            const percentNote = Number(source["WeightPercent"]).toFixed(2) + "% " + Number(entry["WeightPercent"]).toFixed(2) + "% " + source["TableName"];
            const weight = 1000 * ((Number(entry["WeightPercent"]) || 0) / 100) * ((Number(source["WeightPercent"]) || 0) / 100)
            const objectName = entry["ObjectName"]
            // Zero weight entries or sub tables can never drop
            if (!weight) return;

            if (!combinedByObjectName.has(objectName)) {
                combinedByObjectName.set(objectName, {
                    ...entry,
                    Weight: weight,
                    TableName: entry["TableName"] ? [entry["TableName"]] : [],
                    Notes: percentNote ? [percentNote] : [],
                })
                return
            }

            const existing = combinedByObjectName.get(objectName)
            existing["Weight"] = (Number(existing["Weight"]) || 0) + weight

            if (entry["TableName"] && !existing["TableName"].includes(entry["TableName"])) {
                existing["Notes"].push(entry["Notes"])
            }
        })
    })

    const combined = [...combinedByObjectName.values()].map(row => ({
        ...row,
        TableName: row["TableName"].join(", ")
    }))

    let newWeightSum = 0
    combined.forEach(row => newWeightSum += Number(row["Weight"]) || 0)
    combined.forEach(row => {
        row["WeightSum"] = newWeightSum
        row["WeightPercent"] = (Number(row["Weight"]) / newWeightSum * 100)
    })
    combined.sort((a, b) => (Number(b.WeightPercent) || 0) - (Number(a.WeightPercent) || 0));
    console.log("Combined table:", combined)
    return combined;
}

const lootSources = await getSourceCsvData("./data/loot_sources.csv?v=" + elements.metaVersion);
export const LOOT_SOURCES = {}
export const LOOT_SOURCE_TABLES = {}
lootSources.forEach(row => {
    if (!row.SourceName) return;
    if (!LOOT_SOURCES[row.SourceName]) LOOT_SOURCES[row.SourceName] = [];
    LOOT_SOURCES[row.SourceName].push(row);
})

lootSources.forEach(row => {
    if (!row.SourceName) return;
    console.log("Processing loot source:", row.SourceName);
    if (!LOOT_SOURCE_TABLES[row.SourceName]) LOOT_SOURCE_TABLES[row.SourceName] = combineTables(row.SourceName, LOOT_SOURCES[row.SourceName]);
})

function rollCountChances(minRolls, maxRolls) {
    if (maxRolls <= minRolls) return new Map([[minRolls, 1]]);
    const span = maxRolls - minRolls;
    const chances = new Map();
    for (let k = minRolls; k <= maxRolls; k++) chances.set(k, (k === minRolls || k === maxRolls ? 0.5 : 1) / span);
    return chances;
}

const containerChanceCache = {};
export function containerChances(sourceName) {
    if (sourceName in containerChanceCache) return containerChanceCache[sourceName];
    const sources = LOOT_SOURCES[sourceName];
    const table = LOOT_SOURCE_TABLES[sourceName];
    if (!sources || !table) return containerChanceCache[sourceName] = null;

    const minRolls = Number(sources[0].MinEntries) || 1;
    const maxRolls = Math.max(minRolls, Number(sources[0].MaxEntries) || 1);
    const alwaysTables = sources.filter(source => source.AlwaysSpawn === "True");
    const guaranteed = new Set(alwaysTables.flatMap(source => (LOOT_TABLES[source.TableName] || []).map(entry => entry.ObjectName)));
    const rollCounts = rollCountChances(minRolls, maxRolls);

    const chances = new Map();
    table.forEach(row => {
        if (guaranteed.has(row.ObjectName)) return chances.set(row.ObjectName, 100);
        const p = Number(row.WeightPercent) / 100 || 0;
        let chance = 0;
        rollCounts.forEach((rollChance, k) => {
            const rolls = k - alwaysTables.length;
            // 1 - (1 - p)^k without losing precision for tiny p
            if (rolls > 0) chance += rollChance * -Math.expm1(rolls * Math.log1p(-p));
        });
        chances.set(row.ObjectName, 100 * chance);
    });
    return containerChanceCache[sourceName] = chances;
}

// TEMP: console helper, e.g. findItemSources("ID_Money_Gold") or findItemSources("Gold Coin")
window.findItemSources = (name) => {
    const query = name.toLowerCase();

    // LootSource -> unique container display names across all maps (AI spawners use the monster's display name)
    const containerNames = {};
    const addName = (source, displayName) => {
        if (!source || !displayName) return;
        (containerNames[source] ??= new Set()).add(displayName);
    };
    Object.values(presets).forEach(preset => preset.rawData.forEach(row => {
        addName(row.LootSource, row.DisplayName || row.OuterType);
        AI_TABLES[row.AISpawner]?.forEach(monster => addName(monster.LootSource, monster.DisplayName || monster.ObjectName));
    }));

    const results = [];
    Object.entries(LOOT_SOURCE_TABLES).forEach(([sourceName, table]) => {
        table.forEach(row => {
            const item = ITEMS[row["ObjectName"]];
            if (row["ObjectName"]?.toLowerCase() !== query && item?.DisplayName?.toLowerCase() !== query) return;
            const percent = Number(row["WeightPercent"]);
            const containerPercent = containerChances(sourceName)?.get(row["ObjectName"]) ?? percent;
            const source = LOOT_SOURCES[sourceName]?.[0];
            const containers = containerNames[sourceName] ?? new Set(["(unused)"]);
            containers.forEach(container => results.push({
                Container: container,
                Source: sourceName,
                Item: row["ObjectName"],
                Rolls: source ? `${source.MinEntries}-${source.MaxEntries}` : "",
                ItemPercent: percent.toPrecision(3) + "%",
                ItemRatio: 100 / percent,
                ContainerPercent: containerPercent.toPrecision(3) + "%",
                ContainerRatio: 100 / containerPercent,
            }));
        });
    });
    // Most likely per container first (smallest 1/x), sorted on the unrounded ratio before formatting
    results.sort((a, b) => a.ContainerRatio - b.ContainerRatio || a.ItemRatio - b.ItemRatio);
    const formatRatio = ratio => "1/" + (ratio < 10 ? Number(ratio.toFixed(2)) : Math.round(ratio)).toLocaleString();
    results.forEach(r => {
        r.ItemRatio = formatRatio(r.ItemRatio);
        r.ContainerRatio = formatRatio(r.ContainerRatio);
    });
    console.table(results);
    return results;
}



const aiTables = await getAiCsvData("./data/ai_tables.csv?v=" + elements.metaVersion);
export const AI_TABLES = {}
aiTables.forEach(row => {
    if (!AI_TABLES[row.TableName]) AI_TABLES[row.TableName] = [];
    AI_TABLES[row.TableName].push(row);
})

const resourceNodes = await getNodeCsvData("./data/resource_nodes.csv?v=" + elements.metaVersion);
export const RESOURCE_NODES = {}
resourceNodes.forEach(row => RESOURCE_NODES[row.ResourceKey] = row)

const vendorData = await getVendorCsvData("./data/vendor_data.csv?v=" + elements.metaVersion);
export const VENDOR_DATA = {}
vendorData.forEach(row => {
    if (!VENDOR_DATA[row.TableName]) VENDOR_DATA[row.TableName] = [];
    VENDOR_DATA[row.TableName].push(row);
})

const inventoryItems = await getItemsCsvData("./data/inventory_items.csv?v=" + elements.metaVersion);
export const ITEMS = {}
inventoryItems.forEach(row => ITEMS[row.ItemName] = row)
ITEMS["ID_Money_Silver"].Value = 100
ITEMS["ID_Money_Gold"].Value = 10000
ITEMS["ID_Fargoth"].Value = 10000

console.log("Loaded inventory items:", ITEMS);

export const presets = {
    "map00": {
        texture: "mapChateau",
        thumbnail: "./img/T_UI_BG_Chateau.png",
        rawData: await getMarkerCsvData("./data/map00_components.csv?v=" + elements.metaVersion),
        data: () => presets["map00"].rawData.map(row => new Marker(row)),
        scale: 0.17,
        offsetX: 1800,
        offsetY: 2300,
        rotation: 0
    },
    "map01": {
        texture: "mapSarlat",
        overlay: "mapSarlatOverlay",
        thumbnail: "./img/T_UI_Thumbnail_Map01.png",
        rawData: await getMarkerCsvData("./data/map01_components.csv?v=" + elements.metaVersion),
        data: () => presets["map01"].rawData.map(row => new Marker(row)),
        scale: 0.0409,
        offsetX: 2875,
        offsetY: 1751,
        rotation: 90
    },
    "map02": {
        texture: "mapJacques",
        overlay: "mapJacquesOverlay",
        thumbnail: "./img/T_UI_Thumbnail_Map02.png",
        rawData: await getMarkerCsvData("./data/map02_components.csv?v=" + elements.metaVersion),
        data: () => presets["map02"].rawData.map(row => new Marker(row)),
        scale: 0.03622,
        offsetX: 1978,
        offsetY: 1251,
        rotation: 270
    },
    "map03": {
        texture: "mapSombre",
        overlay: "mapSombreOverlay",
        thumbnail: "./img/T_UI_Thumbnail_Map03.png",
        rawData: await getMarkerCsvData("./data/map03_components.csv?v=" + elements.metaVersion),
        data: () => presets["map03"].rawData.map(row => new Marker(row)),
        scale: 0.03051,
        offsetX: 1424,
        offsetY: 1513,
        rotation: 0
    }
};

function mapImagePosition(preset, row) {
    const angle = preset.rotation * Math.PI / 180;
    return {
        x: (row.X * Math.cos(angle) - row.Y * Math.sin(angle)) * preset.scale + preset.offsetX,
        y: (row.X * Math.sin(angle) + row.Y * Math.cos(angle)) * preset.scale + preset.offsetY,
    };
}

function inMapImage(preset, row) {
    const {x, y} = mapImagePosition(preset, row);
    return 0 <= x && x <= 4096 && -500 <= y && y <= 4096;
}

if (!debug) {
    Object.values(presets).forEach(preset => preset.rawData = preset.rawData.filter(row => inMapImage(preset, row)));
}

const STACK_PX = 1;
const NUDGE_PX = 1.5;

function spreadStacks(preset) {
    const rows = preset.rawData;
    const positions = rows.map(row => mapImagePosition(preset, row));
    const cellOf = p => [Math.floor(p.x / STACK_PX), Math.floor(p.y / STACK_PX)];
    const grid = new Map();
    positions.forEach((p, i) => {
        const key = cellOf(p).join(",");
        grid.has(key) ? grid.get(key).push(i) : grid.set(key, [i]);
    });

    const parent = rows.map((_, i) => i);
    const find = i => {
        while (parent[i] !== i) i = parent[i] = parent[parent[i]];
        return i;
    };
    positions.forEach((p, i) => {
        const [cx, cy] = cellOf(p);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                (grid.get(`${cx + dx},${cy + dy}`) || []).forEach(j => {
                    if (j > i && Math.hypot(p.x - positions[j].x, p.y - positions[j].y) < STACK_PX) parent[find(i)] = find(j);
                });
            }
        }
    });
    const stacks = new Map();
    rows.forEach((_, i) => {
        const root = find(i);
        stacks.has(root) ? stacks.get(root).push(i) : stacks.set(root, [i]);
    });

    let moved = 0;
    stacks.forEach(([first, ...rest]) => {
        rest.forEach((i, n) => {
            const ring = Math.floor(n / 6) + 1;
            const angle = (n % 6) * Math.PI / 3 + (ring - 1) * Math.PI / 6;
            const radius = ring * NUDGE_PX / preset.scale;
            rows[i].X = rows[first].X + radius * Math.cos(angle);
            rows[i].Y = rows[first].Y + radius * Math.sin(angle);
            rows[i].StackMoved = true;
        });
        moved += rest.length;
    });
    return moved;
}

Object.values(presets).forEach(preset => {
    let moved = 0;
    for (let pass = 0, n; pass < 10 && (n = spreadStacks(preset)); pass++) moved += n;
    console.log(`Moved ${moved} stacked markers apart for`, preset.texture);
});

export const looseItems = [
    "LootNode",
    "Loose",
]

export const environment = [
    "Trap_",
    "Soundtrap_",
    "Node_",
    "Breakable",
    "Lift",
    "Trapdoor",
    "Door",
    "Window",
    "Stair",
    "Lantern",
    "BP_HangingHerbRope_C",
    "DiscoverableLocationVolume",
]

export const creatures = [
    "AISpawner",
    "Miniboss"
]

export const spawns = [
    "RaidExtraction",
    "RaidSpawn",
]

export const chateauProfessionNodes = {
    "BP_Artificer": "profArtificer",
    "BP_Conservator": "profConservator",
    "BP_Cook": "profCook",
    "BP_Gunsmith": "profGunsmith",
    "BP_Metallurgist": "profMetallurgist",
    "BP_Naturalist": "profNaturalist",
    "BP_Outfitter": "profOutfitter",
    "BP_Physician": "profPhysician",
    "BP_Scavenger": "profScavenger",
}
