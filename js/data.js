import {textures} from "textures";
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

        rows.push({TableName, Weight, WeightSum, WeightPercent, ObjectName});
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

        rows.push({SourceName,MinEntries,MaxEntries,LootTable,TableName,Weight,WeightSum,WeightPercent,AlwaysSpawn});
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

        rows.push({TableName, Weight, WeightSum, WeightPercent, ObjectName, DisplayName, LootSource});
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

        rows.push({TableName, Weight, WeightSum, WeightPercent, ObjectName});
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
            const weight = 1000 * (Number(entry["WeightPercent"] || 1) / 100) * ((Number(source["WeightPercent"]) || 1) / 100)
            const objectName = entry["ObjectName"]

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
        texture: textures.mapChateau,
        thumbnail: "./img/T_UI_BG_Chateau.png",
        rawData: await getMarkerCsvData("./data/map00_components.csv?v=" + elements.metaVersion),
        data: () => presets["map00"].rawData.map(row => new Marker(row)),
        scale: 0.17,
        offsetX: 1800,
        offsetY: 2300,
        rotation: 0
    },
    "map01": {
        texture: textures.mapSarlat,
        overlay: textures.mapSarlatOverlay,
        thumbnail: "./img/T_UI_Thumbnail_Map01.png",
        rawData: await getMarkerCsvData("./data/map01_components.csv?v=" + elements.metaVersion),
        data: () => presets["map01"].rawData.map(row => new Marker(row)),
        scale: 0.0409,
        offsetX: 2875,
        offsetY: 1751,
        rotation: 90
    },
    "map02": {
        texture: textures.mapJacques,
        overlay: textures.mapJacquesOverlay,
        thumbnail: "./img/T_UI_Thumbnail_Map02.png",
        rawData: await getMarkerCsvData("./data/map02_components.csv?v=" + elements.metaVersion),
        data: () => presets["map02"].rawData.map(row => new Marker(row)),
        scale: 0.03622,
        offsetX: 1978,
        offsetY: 1251,
        rotation: 270
    },
    "map03": {
        texture: textures.mapSombre,
        overlay: textures.mapSombreOverlay,
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
    "BP_Artificer": textures.profArtificer,
    "BP_Conservator": textures.profConservator,
    "BP_Cook": textures.profCook,
    "BP_Gunsmith": textures.profGunsmith,
    "BP_Metallurgist": textures.profMetallurgist,
    "BP_Naturalist": textures.profNaturalist,
    "BP_Outfitter": textures.profOutfitter,
    "BP_Physician": textures.profPhysician,
    "BP_Scavenger": textures.profScavenger,
}
