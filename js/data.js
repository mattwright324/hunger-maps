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
            if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            cols.push(cur); cur = "";
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

        const [RootType, OuterType, OuterName, X, Y, Z, DisplayName, SpawnChance, ChanceType, Health, Keyed, LootSource, AISpawner, Visible] = cols;

        if (!X || !Y || !Z) continue;

        //if (Visible === "False") continue;

        const key = X + "," + Y;
        if (!xy[key]) xy[key] = 1; else xy[key] += 1;
        if (xy[key] > 1) console.log("Duplicate key: ", key, xy[key], OuterType, OuterName);

        rows.push({
            RootType,
            OuterType,
            OuterName,
            X: parseFloat(X),
            Y: parseFloat(Y),
            Z: parseFloat(Z),
            DisplayName,
            SpawnChance,
            ChanceType,
            Health,
            Keyed,
            LootSource,
            AISpawner,
            Visible,
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

        const [TableName, Weight, WeightSum, WeightPercent, ObjectName, DisplayName, Rarity] = cols;

        rows.push({TableName, Weight, WeightSum, WeightPercent, ObjectName, DisplayName, Rarity});
    }

    console.log("Parsed CSV data:", rows.length, text);
    return rows;
}

const lootTables = await getLootCsvData("./loot_tables.csv?v=" + elements.metaVersion);
export const LOOT_TABLES = {}
lootTables.forEach(row => {
    console.log(row)
    if (!LOOT_TABLES[row.TableName]) LOOT_TABLES[row.TableName] = [];
    LOOT_TABLES[row.TableName].push(row);
})

console.log("Loaded loot tables:", LOOT_TABLES);

const aiTables = await getLootCsvData("./ai_tables.csv?v=" + elements.metaVersion);
export const AI_TABLES = {}
aiTables.forEach(row => {
    if (!AI_TABLES[row.TableName]) AI_TABLES[row.TableName] = [];
    AI_TABLES[row.TableName].push(row);
})

console.log("Loaded AI tables:", AI_TABLES);

export const presets = {
    "map00": {
        texture: textures.mapChateau,
        thumbnail: "./img/T_UI_BG_Chateau.png",
        rawData: await getMarkerCsvData("./map00_components.csv?v=" + elements.metaVersion),
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
        rawData: await getMarkerCsvData("./map01_components.csv?v=" + elements.metaVersion),
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
        rawData: await getMarkerCsvData("./map02_components.csv?v=" + elements.metaVersion),
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
        rawData: await getMarkerCsvData("./map03_components.csv?v=" + elements.metaVersion),
        data: () => presets["map03"].rawData.map(row => new Marker(row)),
        scale: 0.03051,
        offsetX: 1424,
        offsetY: 1513,
        rotation: 0
    }
};

export const containers = [
    //"Loot_",
    "Chest",
    "Chest Drawers",
    "Wardrobe",
    "Workbench",
    "StoneTomb",
    "Cabinet",
    "Dungeon_M",
]

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
    "Gate_A0",
    "BP_HangingHerbRope_C",
]

export const creatures = [
    "AISpawner",
    "Miniboss"
]

export const spawns = [
    "RaidExtraction",
    "RaidSpawn",
]

export const questItems = [
    "BP_BloodSample01_C",
    "BP_BloodSample02_C",
    "BP_BloodSample03_C",
    "BP_BloodSample04_C",
    "BP_BloodSample05_C",
    "BP_BloodSample06_C",
    "BP_ChristianDoctrine_C",
    "BP_CleansingMark_C",
    "BP_DispatchRider_C",
    "BP_DirigibleFlare_C",
    "BP_DQ05_Safebox_C",
    "BP_Etienne_C",
    "BP_ExtractorsCache_M01_C",
    "BP_ExtractorsCache_M02_C",
    "BP_ExtractorsCache_M03_C",
    "BP_FamilyRegister_C",
    "BP_FortificationBlueprint_C",
    "BP_GrainRecord_C",
    "BP_Interact01_C",
    "BP_Interact02_C",
    "BP_Interact03_C",
    "BP_LouisFather_C",
    "BP_LouisFathersNote_C",
    "BP_LouisHandkerchief_C",
    "BP_LouisMother_C",
    "BP_LouisMothersNote_C",
    "BP_LouisMothersNote2_C",
    "BP_LouisMothersNoteQ08_C",
    "BP_LouisQ7Corpse_C",
    //"BP_Mapzone_01b_C",
    "BP_MortuaryRecord_C",
    //"BP_P_CrowsCircle_01_C",
    "BP_PiroCorpsePile_01_C",
    "BP_PiroCorpsePile_02_C",
    "BP_PiroCorpsePile_03_C",
    "BP_PreservedHand_C",
    "BP_Q03_RatsNest01_C",
    "BP_Q04_Gravestone_C",
    "BP_Q04_Interact02_C",
    "BP_Q05_DiaryBishop_C",
    "BP_Q05_Water01_C",
    "BP_Q05_Water02_C",
    "BP_Q05_Water03_C",
    "BP_Q06_BodyBeads_C",
    "BP_Q07_LacourtsLedger_C",
    "BP_Q08_Sylvette_C",
    "BP_Q10_GoldenLeafTobacco_C",
    "BP_QIS_Reynauld_WQ04_C",
    "BP_QIS_Reynauld07_C",
    "BP_QuarantineDiary_C",
    "BP_RedCandle_C",
    "BP_RedRibbon_C",
    "BP_Reynauld_FrancoisDiary_C",
    "BP_SawmillReport_C",
    "BP_SignalHorn_M01_C",
    "BP_SignalHorn_M02_C",
    "BP_SignalHorn_M03_C",
    "BP_SouthwestDefenseMap_C",
    "BP_TitheLedgerofProvisions_C",
    "BP_WeaponCache01_C",
    "BP_WeaponCache02_C",
    "BP_WeaponCache03_C",
    "BP_WeaponCache04_C",
    "BP_WeaponCache05_C",
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

export const professions = {
    conservatorTypes: [
        "Node_Con_BarrelLathe_C",
        "Node_Con_BlackenedStriker_C",
        "Node_Con_BrokenRifle_C",
        "Node_Con_Chronometer_C",
        "Node_Con_ConvexGlass_C",
        "Node_Con_CopperTwine_C",
        "Node_Con_DamagedScrew_C",
        "Node_Con_LeverArm_C",
        "Node_Con_LodestoneSlag_C",
        "Node_Con_OldGunpowder_C",
        "Node_Con_PowderCake_C",
        "Node_Con_TarnishedQuicksilver_01a_C",
        "Node_Con_WhaleOil_C",
    ],
    naturalistTypes: [
        "Node_Nat_Rosemary_C",
        "Node_Nat_Lavender_C",
        "Node_Nat_Garlic_C",
        "Node_Nat_GarlicHanging_C",
        "Node_Nat_Clove_C",
        "Node_Nat_PinkYarrow_C",
        "Node_Nat_PinkYarrowVase_C",
        "Node_Nat_Cinnamon_C",
        "Node_Nat_CinnamonBark_C",
        "Node_Nat_Fungi_C",
        "Node_Nat_Saffron_C",
        "Node_Nat_SaffronBasket_C",
        "Node_Nat_Pepper_C",
        "Node_Nat_PepperPlate_C",
        "Node_Nat_Poppy_C",
        "Node_Nat_PoppyDried_01a_C",
        "BP_HangingHerbRope_C",
    ],
    scavengerTypes: [
        "Node_Scav_Wool_C",
        "Node_Scav_WoolPillow_C",
        "Node_Scav_Copper_C",
        "Node_Scav_Cotton_C",
        "Node_Scav_CottonBasket_C",
        "Node_Scav_Flax_C",
        "Node_Scav_Hemp_C",
        "Node_Scav_Iron_C",
        "Node_Scav_Lead_C",
        "Node_Scav_Gold_C",
        "Node_Scav_GoldBarrow_C",
        "Node_Scav_Silver_C",
        "Node_Scav_SilverBarrow_C",
        "Node_Scav_Silk_C",
        "Node_Scav_SilkBanner_01a_C",
        "Node_Scav_SilkBanner_01b_C",
        "Node_Scav_SilkBanner_01c_C",
    ]
}

export const DT_LootSources = {
    "Ammo_Large": {
        "LootTable": "Ammunition",
        "MinEntries": 1,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "Ammo_Medium": {
        "LootTable": "Ammunition",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "Ammo_Small": {
        "LootTable": "Ammunition",
        "MinEntries": 1,
        "MaxEntries": 1,
        "BiasCurve": null
    },
    "Ammo_Small_Crude": {
        "LootTable": "Ammunition_Crude",
        "MinEntries": 1,
        "MaxEntries": 1,
        "BiasCurve": null
    },
    "Ammo_Small_Heavy": {
        "LootTable": "Ammunition_Heavy",
        "MinEntries": 1,
        "MaxEntries": 1,
        "BiasCurve": null
    },
    "Amphora": {
        "LootTable": "Amphora",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "Armor_Medium": {
        "LootTable": "Armor",
        "MinEntries": 1,
        "MaxEntries": 1,
        "BiasCurve": null
    },
    "Armor_UREL": {
        "LootTable": "Armor_UREL",
        "MinEntries": 1,
        "MaxEntries": 1,
        "BiasCurve": null
    },
    "AshPile": {
        "LootTable": "AshPile",
        "MinEntries": 1,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "Basket_Large": {
        "LootTable": "Baskets",
        "MinEntries": 3,
        "MaxEntries": 5,
        "BiasCurve": null
    },
    "Basket_Medium": {
        "LootTable": "Baskets",
        "MinEntries": 2,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "Basket_Small": {
        "LootTable": "Baskets",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "Beehive": {
        "LootTable": "Beehive",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "Blacksmith_Medium": {
        "LootTable": "Blacksmith",
        "MinEntries": 2,
        "MaxEntries": 4,
        "BiasCurve": null
    },
    "BullionBox": {
        "LootTable": "BullionBox",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "Cabinet_Wall_Small": {
        "LootTable": "Church",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "Chest_Global_Large": {
        "LootTable": "Global",
        "MinEntries": 3,
        "MaxEntries": 6,
        "BiasCurve": null
    },
    "Chest_Global_Medium": {
        "LootTable": "Global",
        "MinEntries": 2,
        "MaxEntries": 4,
        "BiasCurve": null
    },
    "Chest_Global_Small": {
        "LootTable": "Global",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "Chest_Valuable_Large": {
        "LootTable": "Global_REL",
        "MinEntries": 3,
        "MaxEntries": 6,
        "BiasCurve": null
    },
    "Chest_Valuable_Medium": {
        "LootTable": "Global_REL",
        "MinEntries": 2,
        "MaxEntries": 4,
        "BiasCurve": null
    },
    "Chest_Valuable_Small": {
        "LootTable": "Global_REL",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "ChickenCoop": {
        "LootTable": "ChickenCoop",
        "MinEntries": 1,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "ChinawareCupboard_Small": {
        "LootTable": "Chinaware",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "Civilian_Large": {
        "LootTable": "Civilian",
        "MinEntries": 3,
        "MaxEntries": 5,
        "BiasCurve": null
    },
    "Civilian_Medium": {
        "LootTable": "Civilian",
        "MinEntries": 2,
        "MaxEntries": 4,
        "BiasCurve": null
    },
    "Civilian_Small": {
        "LootTable": "Civilian",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "CivilianCupboard_Large": {
        "LootTable": "CivilianCupboard",
        "MinEntries": 3,
        "MaxEntries": 5,
        "BiasCurve": null
    },
    "CivilianCupboard_Medium": {
        "LootTable": "CivilianCupboard",
        "MinEntries": 2,
        "MaxEntries": 4,
        "BiasCurve": null
    },
    "CivilianCupboard_Small": {
        "LootTable": "CivilianCupboard",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "CivilianCupboardDresser_Small": {
        "LootTable": "CivilianCupboardDresser",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "CivilianDresser_Large": {
        "LootTable": "CivilianDresser",
        "MinEntries": 3,
        "MaxEntries": 5,
        "BiasCurve": null
    },
    "CivilianDresser_Medium": {
        "LootTable": "CivilianDresser",
        "MinEntries": 2,
        "MaxEntries": 4,
        "BiasCurve": null
    },
    "CivilianDresser_Small": {
        "LootTable": "CivilianDresser",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "Clothes": {
        "LootTable": "Clothes",
        "MinEntries": 1,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "Coffin": {
        "LootTable": "Global",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "Corpse_Gavroche": {
        "LootTable": "Corpse_Gavroche",
        "MinEntries": 2,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "Corpse_Military": {
        "LootTable": "Military",
        "MinEntries": 1,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "Corpse_Peasant": {
        "LootTable": "Civilian",
        "MinEntries": 1,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "Distillery_Small": {
        "LootTable": "Drinks",
        "MinEntries": 1,
        "MaxEntries": 1,
        "BiasCurve": null
    },
    "Dungeon_M01": {
        "LootTable": "Dungeon_M01",
        "MinEntries": 3,
        "MaxEntries": 6,
        "BiasCurve": null
    },
    "Dungeon_M02": {
        "LootTable": "Dungeon_M02",
        "MinEntries": 3,
        "MaxEntries": 6,
        "BiasCurve": null
    },
    "Dungeon_M03": {
        "LootTable": "Dungeon_M03",
        "MinEntries": 3,
        "MaxEntries": 6,
        "BiasCurve": null
    },
    "FancySewingBox": {
        "LootTable": "FancySewingBox",
        "MinEntries": 1,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "FargothStump": {
        "LootTable": "FargothStump",
        "MinEntries": 1,
        "MaxEntries": 1,
        "BiasCurve": null
    },
    "Generic_Global_Medium": {
        "LootTable": "Generic",
        "MinEntries": 2,
        "MaxEntries": 4,
        "BiasCurve": null
    },
    "Grave_Large": {
        "LootTable": "Graveyard",
        "MinEntries": 1,
        "MaxEntries": 5,
        "BiasCurve": null
    },
    "Grave_Medium": {
        "LootTable": "Graveyard",
        "MinEntries": 1,
        "MaxEntries": 4,
        "BiasCurve": null
    },
    "HighClassCiv_Large": {
        "LootTable": "HighClassCiv",
        "MinEntries": 3,
        "MaxEntries": 5,
        "BiasCurve": null
    },
    "HighClassCiv_Medium": {
        "LootTable": "HighClassCiv",
        "MinEntries": 2,
        "MaxEntries": 4,
        "BiasCurve": null
    },
    "HighClassCiv_Small": {
        "LootTable": "HighClassCiv",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "Hunger_Ash": {
        "LootTable": "Hunger_Ash",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "Hunger_Biter": {
        "LootTable": "Hunger_Biter",
        "MinEntries": 2,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "Hunger_Biter_Elite": {
        "LootTable": "Hunger_Biter_Elite",
        "MinEntries": 2,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "Hunger_Bloat": {
        "LootTable": "Hunger_Bloat",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "Hunger_Brute": {
        "LootTable": "Hunger_Brute",
        "MinEntries": 2,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "Hunger_Brute_Elite": {
        "LootTable": "Hunger_Brute_Elite",
        "MinEntries": 2,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "Hunger_Dreg": {
        "LootTable": "Hunger_Dreg",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "Hunger_DregFarmerUnique": {
        "LootTable": "Hunger_FarmerDregUnique",
        "MinEntries": 1,
        "MaxEntries": 1,
        "BiasCurve": null
    },
    "Hunger_Howler": {
        "LootTable": "Hunger_Howler",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "Hunger_Shambler": {
        "LootTable": "Hunger_Shambler",
        "MinEntries": 1,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "Hunger_Waif": {
        "LootTable": "Hunger_Waif",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "Hunger_Womb": {
        "LootTable": "Hunger_Womb",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "KindlingPile": {
        "LootTable": "KindlingPile",
        "MinEntries": 1,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "Latrine": {
        "LootTable": "Latrine",
        "MinEntries": 1,
        "MaxEntries": 4,
        "BiasCurve": null
    },
    "Ledger": {
        "LootTable": "Ledger",
        "MinEntries": 1,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "M02_Boss": {
        "LootTable": "Boss_M02",
        "MinEntries": 5,
        "MaxEntries": 8,
        "BiasCurve": null
    },
    "Medical_Medium": {
        "LootTable": "Medical",
        "MinEntries": 1,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "Medical_UREL_Medium": {
        "LootTable": "Medical_UREL",
        "MinEntries": 1,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "MedicalPhysicianDreg": {
        "LootTable": "MedicalPhysicianDreg",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "Military_Large": {
        "LootTable": "Military",
        "MinEntries": 3,
        "MaxEntries": 5,
        "BiasCurve": null
    },
    "Military_Medium": {
        "LootTable": "Military",
        "MinEntries": 2,
        "MaxEntries": 4,
        "BiasCurve": null
    },
    "Military_Small": {
        "LootTable": "Military",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "MissivesCabinet": {
        "LootTable": "Ledger",
        "MinEntries": 1,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "Nest": {
        "LootTable": "Valuables",
        "MinEntries": 1,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "OakBarrel": {
        "LootTable": "OakBarrel",
        "MinEntries": 2,
        "MaxEntries": 4,
        "BiasCurve": null
    },
    "Old_Cairn": {
        "LootTable": "Cairn",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "OldBucket": {
        "LootTable": "OldBucket",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "OldSewingBox": {
        "LootTable": "OldSewingBox",
        "MinEntries": 1,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "OpiumBox": {
        "LootTable": "OpiumBox",
        "MinEntries": 1,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "Sack_Flour": {
        "LootTable": "Sack_Flour",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "Saddlebag": {
        "LootTable": "Saddlebag",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "Shop_Med_A01": {
        "LootTable": "Global",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "Stove": {
        "LootTable": "Stove",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "TEST": {
        "LootTable": "TEST",
        "MinEntries": 1,
        "MaxEntries": 3,
        "BiasCurve": null
    },
    "ToolingBin": {
        "LootTable": "ToolingBin",
        "MinEntries": 2,
        "MaxEntries": 4,
        "BiasCurve": null
    },
    "ValuablesBox": {
        "LootTable": "ValuablesBox",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "Weapon": {
        "LootTable": "Weapon",
        "MinEntries": 1,
        "MaxEntries": 1,
        "BiasCurve": null
    },
    "Weapon_Melee": {
        "LootTable": "Weapon_Melee",
        "MinEntries": 1,
        "MaxEntries": 1,
        "BiasCurve": null
    },
    "Weapon_Melee_REL": {
        "LootTable": "Weapon_Melee_REL",
        "MinEntries": 1,
        "MaxEntries": 1,
        "BiasCurve": null
    },
    "Weapon_Ranged": {
        "LootTable": "Weapon_Ranged",
        "MinEntries": 1,
        "MaxEntries": 1,
        "BiasCurve": null
    },
    "Weapon_Ranged_REL": {
        "LootTable": "Weapon_Ranged_REL",
        "MinEntries": 1,
        "MaxEntries": 1,
        "BiasCurve": null
    },
    "Workbench_Small": {
        "LootTable": "Workbench",
        "MinEntries": 1,
        "MaxEntries": 2,
        "BiasCurve": null
    },
    "PowderLocker": {
        "LootTable": "PowderLocker",
        "MinEntries": 2,
        "MaxEntries": 4,
        "BiasCurve": null
    },
    "SlopBin": {
        "LootTable": "SlopBin",
        "MinEntries": 2,
        "MaxEntries": 4,
        "BiasCurve": null
    },
    "TinkerCase": {
        "LootTable": "TinkerCase",
        "MinEntries": 2,
        "MaxEntries": 4,
        "BiasCurve": null
    },
    "MannequinTrunk": {
        "LootTable": "MannequinTrunk",
        "MinEntries": 2,
        "MaxEntries": 4,
        "BiasCurve": null
    }
}