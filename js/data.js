import { textures } from "textures";
import { elements } from "dom";
import { Marker } from "marker";

async function getCsvData(url) {
    return await fetch(url)
        .then(r => r.text())
        .then(text => parseCSV(text));
}

async function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    const rows = [];

    for (let line of lines) {
        const cols = line.split(",");
        if (cols.length < 6) continue;

        const [Type, ObjectName, StaticMeshName, X, Y, Z, SpawnChance] = cols;

        if (Type === "Type") continue;
        if (!X || !Y || !Z) continue;

        rows.push({
            Type,
            ObjectName,
            StaticMeshName,
            X: parseFloat(X),
            Y: parseFloat(Y),
            Z: parseFloat(Z),
            SpawnChance,
        });
    }
    console.log("Parsed CSV data:", rows.length, text);
    return rows;
}

export const presets = {
    "map00": {
        texture: textures.mapChateau,
        rawData: await getCsvData("./map00_components.csv?v=" + elements.metaVersion),
        data: () => presets["map00"].rawData.map(row => new Marker(row)),
        scale: 0.17,
        offsetX: 1800,
        offsetY: 2300,
        rotation: 0
    },
    "map01": {
        texture: textures.mapSarlat,
        overlay: textures.mapSarlatOverlay,
        rawData: await getCsvData("./map01_components.csv?v=" + elements.metaVersion),
        data: () => presets["map01"].rawData.map(row => new Marker(row)),
        scale: 0.0409,
        offsetX: 2875,
        offsetY: 1751,
        rotation: 90
    },
    "map02": {
        texture: textures.mapJacques,
        overlay: textures.mapJacquesOverlay,
        rawData: await getCsvData("./map02_components.csv?v=" + elements.metaVersion),
        data: () => presets["map02"].rawData.map(row => new Marker(row)),
        scale: 0.03622,
        offsetX: 1978,
        offsetY: 1251,
        rotation: 270
    },
    "map03": {
        texture: textures.mapSombre,
        overlay: textures.mapSombreOverlay,
        rawData: await getCsvData("./map03_components.csv?v=" + elements.metaVersion),
        data: () => presets["map03"].rawData.map(row => new Marker(row)),
        scale: 0.03051,
        offsetX: 1424,
        offsetY: 1513,
        rotation: 0
    }
};

export const containers = [
    "Loot_",
    "Chest",
    "Chest Drawers",
    "Wardrobe",
    "Workbench",
    "StoneTomb",
    "Cabinet",
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
    "BP_HangingHerbRope_C",
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
    "BP_Mapzone_01b_C",
    "BP_MortuaryRecord_C",
    "BP_P_CrowsCircle_01_C",
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