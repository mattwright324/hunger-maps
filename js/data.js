import {elements} from "dom";
import Marker from "marker";

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

async function getMarkerCsvData(url) {
    return await fetch(url)
        .then(r => r.text())
        .then(text => parseMarkerCSV(text));
}

async function parseMarkerCSV(text) {
    const lines = text.split(/\r?\n/);
    const rows = [];

    const xy = {}

    for (let line of lines) {
        const cols = splitCSVLine(line);
        if (cols.length < 6) continue;

        const [
            RootType, OuterType, OuterName, X, Y, Z,
            DisplayName, LootSource, SpawnChance, ChanceType, AISpawner, CsvJson
        ] = cols;

        if (!X || !Y || !Z) continue;

        //if (Visible === "False") continue;

        const key = X + "," + Y;
        if (!xy[key]) xy[key] = 1; else xy[key] += 1;
        if (xy[key] > 1) console.log("Duplicate key: ", key, xy[key], OuterType, OuterName);

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
            CsvJson: json
        });
    }

    console.log("Parsed CSV data:", rows.length, text);
    return rows;
}

// CSV WeightPercent is rounded to 4 decimals, leaving rare entries with only 1-2 significant digits.
// Recalculate it from the raw weights, keeping the CSV value when they aren't numbers (header row)
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
    const lines = text.split(/\r?\n/);
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
    const lines = text.split(/\r?\n/);
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
    const lines = text.split(/\r?\n/);
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
    const lines = text.split(/\r?\n/);
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
    const lines = text.split(/\r?\n/);
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
    const lines = text.split(/\r?\n/);
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

// Exact chance each entry is drawn at least once in k weighted draws without duplicates, for every k in [1, maxK].
// Weighted draws without replacement are equivalent to each entry arriving at an exponential time with rate = weight,
// the first k arrivals being the drawn entries. So P(i drawn) = ∫ w_i·e^(-w_i·t)·P(fewer than k others arrived by t) dt,
// integrated over log(t) with the trapezoid rule.
function inclusionChances(weights, maxK) {
    const n = weights.length;
    const result = Array.from({length: maxK + 1}, () => new Array(n).fill(0));
    const total = weights.reduce((sum, w) => sum + w, 0);
    if (!total || maxK < 1) return result;
    const w = weights.map(x => x / total);
    const minW = Math.min(...w.filter(x => x > 0));
    const lo = Math.log(1e-6), hi = Math.log(50 / minW), steps = 150, h = (hi - lo) / steps;
    // pre[i][m] / suf[i][m] = P(exactly m of entries before / from i arrived), truncated to m < maxK
    const pre = Array.from({length: n + 1}, () => new Float64Array(maxK));
    const suf = Array.from({length: n + 1}, () => new Float64Array(maxK));
    pre[0][0] = 1;
    suf[n][0] = 1;
    for (let s = 0; s <= steps; s++) {
        const t = Math.exp(lo + s * h);
        const trap = (s === 0 || s === steps) ? 0.5 : 1;
        const q = w.map(x => 1 - Math.exp(-x * t));
        for (let i = 0; i < n; i++) for (let m = 0; m < maxK; m++)
            pre[i + 1][m] = pre[i][m] * (1 - q[i]) + (m > 0 ? pre[i][m - 1] * q[i] : 0);
        for (let i = n - 1; i >= 0; i--) for (let m = 0; m < maxK; m++)
            suf[i][m] = suf[i + 1][m] * (1 - q[i]) + (m > 0 ? suf[i + 1][m - 1] * q[i] : 0);
        for (let i = 0; i < n; i++) {
            if (!w[i]) continue;
            const density = w[i] * t * Math.exp(-w[i] * t) * h * trap;
            let fewer = 0; // P(fewer than k others arrived), accumulated as k grows
            for (let k = 1; k <= maxK; k++) {
                for (let a = 0; a < k; a++) fewer += pre[i][a] * suf[i + 1][k - 1 - a];
                result[k][i] += density * fewer;
            }
        }
    }
    // Enough rolls to draw every entry, exactly rather than integration error away from it
    const positive = w.filter(x => x > 0).length;
    for (let k = positive; k <= maxK; k++) result[k] = w.map(x => x > 0 ? 1 : 0);
    return result;
}

// ObjectName -> percent chance the item appears at least once in a container of this loot source,
// accounting for the random roll count (uniform in MinEntries-MaxEntries) and no duplicate items per container.
// AlwaysSpawn tables are assumed to use up one roll each and guarantee their items.
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

    const chances = new Map();
    guaranteed.forEach(objectName => chances.set(objectName, 100));
    const rolled = table.filter(row => !guaranteed.has(row.ObjectName));
    const minK = Math.max(0, minRolls - alwaysTables.length);
    const maxK = Math.max(0, maxRolls - alwaysTables.length);
    const byK = inclusionChances(rolled.map(row => Number(row.Weight) || 0), maxK);
    rolled.forEach((row, i) => {
        let sum = 0;
        for (let k = minK; k <= maxK; k++) sum += k > 0 ? byK[k][i] : 0;
        chances.set(row.ObjectName, 100 * sum / (maxK - minK + 1));
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
