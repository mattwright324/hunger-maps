let csvData = [];
let app, world, mapSprite;
let nodes = [];
const tooltip = document.getElementById("tooltip");

const texturePaths = {
    uncommon: "./img/T_UI_Icon_Rarity_Uncommon.png",
    pingGeneric: "./img/T_UI_Icon_PingGeneric.png",
    monster: "./img/T_UI_Icon_PM_HungerKill.png",
    profUnknown: "./img/Profession_Unknown.png",
    profArtificer: "./img/T_UI_Profession_Artificer.png",
    profConservator: "./img/T_UI_Profession_Conservator.png",
    profCook: "./img/T_UI_Profession_Cook.png",
    profGunsmith: "./img/T_UI_Profession_Gunsmith.png",
    profMetallurgist: "./img/T_UI_Profession_Metallurgist.png",
    profNaturalist: "./img/T_UI_Profession_Naturalist.png",
    profOutfitter: "./img/T_UI_Profession_Outfitter.png",
    profPhysician: "./img/T_UI_Profession_Physician.png",
    profScavenger: "./img/T_UI_Profession_Scavenger.png",
    sound: "./img/T_UI_Icon_Mic_Transmitting.png",
    grenade: "./img/T_UI_Item_GrenadeCeramic.png",
    social: "./img/T_UI_Icon_Social.png",
    egg: "./img/T_UI_Item_FreshEgg.png",
    quest: "./img/T_UI_Icon_TrackerHandIn.png",
};

const loadedTextures = await Promise.all(
    Object.entries(texturePaths).map(async ([key, path]) => {
        return [key, await PIXI.Assets.load(path)];
    })
);

const conservatorTypes = [
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
]

const naturalistTypes = [
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
]

const scavengerTypes = [
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

const textures = Object.fromEntries(loadedTextures);

const presets = {
    "map01.webp": {
        data: "./map01_components.csv",
        scale: 0.041,
        offsetX: 2880,
        offsetY: 1750,
        rotation: 90
    },
    "map02.webp": {
        data: "./map02_components.csv",
        scale: 0.036,
        offsetX: 1990,
        offsetY: 1255,
        rotation: 270
    },
    "map03.webp": {
        data: "./map03_components.csv",
        scale: 0.0305,
        offsetX: 1425,
        offsetY: 1515,
        rotation: 0
    }
};

async function initPixi() {
    app = new PIXI.Application();
    await app.init({
        preference: "webgl",
        resizeTo: document.getElementById("view-container"),
        backgroundColor: 0x000000,
        antialias: true
    });

    document.getElementById("view-container").appendChild(app.canvas);

    world = new PIXI.Container();
    app.stage.addChild(world);

    setupPanZoom();

    const mapSelect = document.getElementById("mapSelect");
    mapSelect.addEventListener("change", () => {
        const mapName = mapSelect.value;
        loadMapAndPreset(mapName);
    });

    loadMapAndPreset(mapSelect.value);

    ["scale", "offsetX", "offsetY", "rotation", "hideAiSpawner", "showOnlyMatches", "filterZrange", "zRange"].forEach(id => {
        document.getElementById(id).addEventListener("input", updateNodes);
    });
    document.getElementById("searchBox").addEventListener("input", applySearchFilter);
}

function simulateTouchPointer(e) {
    const typeMap = {
        mousedown: "pointerdown",
        mousemove: "pointermove",
        mouseup: "pointerup"
    };

    const simulated = new PointerEvent(typeMap[e.type], {
        bubbles: true,
        cancelable: true,
        pointerId: 999,          // any stable ID
        pointerType: "touch",    // THIS is the magic
        clientX: e.clientX,
        clientY: e.clientY,
        screenX: e.screenX,
        screenY: e.screenY,
        pageX: e.pageX,
        pageY: e.pageY,
        pressure: 0.5,           // touch-like
        isPrimary: true
    });

    e.target.dispatchEvent(simulated);
    e.preventDefault();
}

function setupPanZoom() {
    const touches = new Map();
    let lastDistance = null;
    let panAnchor = null;

    app.canvas.addEventListener("mousedown", simulateTouchPointer, true);
    app.canvas.addEventListener("mousemove", simulateTouchPointer, true);
    app.canvas.addEventListener("mouseup", simulateTouchPointer, true);

    app.canvas.addEventListener("pointerdown", e => {
        if (e.pointerType === "touch") {
            touches.set(e.pointerId, {x: e.clientX, y: e.clientY});

            // If this is the FIRST and ONLY touch → start pan
            if (touches.size === 1) {
                const t = touches.values().next().value;
                panAnchor = {x: t.x, y: t.y};
            }

            // If this is the SECOND touch → start pinch
            if (touches.size === 2) {
                lastDistance = null;
                panAnchor = null; // disable pan
            }
        }
    });

    app.canvas.addEventListener("pointermove", e => {
        if (e.pointerType !== "touch") return;

        touches.set(e.pointerId, {x: e.clientX, y: e.clientY});

        // -----------------------------
        // PINCH ZOOM (exactly 2 touches)
        // -----------------------------
        if (touches.size === 2) {
            const pts = [...touches.values()];
            const p1 = pts[0];
            const p2 = pts[1];

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (lastDistance !== null) {
                const scaleFactor = distance / lastDistance;
                const oldScale = world.scale.x;
                const newScale = oldScale * scaleFactor;

                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;

                const rect = app.canvas.getBoundingClientRect();
                const px = midX - rect.left;
                const py = midY - rect.top;

                const wx = (px - world.x) / oldScale;
                const wy = (py - world.y) / oldScale;

                world.scale.set(newScale);
                world.x = px - wx * newScale;
                world.y = py - wy * newScale;

                world.children.filter(c => c._type === "marker").forEach(updateSpriteScreenScale);
            }

            lastDistance = distance;
            return; // IMPORTANT: do not pan during pinch
        }

        // -----------------------------
        // PAN (exactly 1 touch)
        // -----------------------------
        if (touches.size === 1) {
            const t = touches.values().next().value;

            if (panAnchor) {
                const dx = t.x - panAnchor.x;
                const dy = t.y - panAnchor.y;

                world.x += dx;
                world.y += dy;

                // update anchor
                panAnchor.x = t.x;
                panAnchor.y = t.y;
            }
        }
    });

    app.canvas.addEventListener("pointerup", e => {
        touches.delete(e.pointerId);

        if (touches.size < 2) {
            lastDistance = null;
        }

        if (touches.size === 1) {
            // Reset pan anchor to remaining finger
            const t = touches.values().next().value;
            panAnchor = {x: t.x, y: t.y};
        }

        if (touches.size === 0) {
            panAnchor = null;
        }
    });

    app.canvas.addEventListener("pointercancel", e => {
        touches.delete(e.pointerId);
        lastDistance = null;
        panAnchor = null;
    });

    // Desktop wheel zoom unchanged
    app.canvas.addEventListener("wheel", e => {
        e.preventDefault();
        const scaleBy = 1.2;
        const oldScale = world.scale.x || 1;
        const newScale = e.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

        const rect = app.canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;

        const wx = (px - world.x) / oldScale;
        const wy = (py - world.y) / oldScale;

        world.scale.set(newScale);
        world.x = px - wx * newScale;
        world.y = py - wy * newScale;

        world.children.filter(c => c._type === "marker").forEach(updateSpriteScreenScale);
    }, {passive: false});
}

async function loadMapAndPreset(mapName) {
    await loadMap(mapName);
    applyPreset(mapName);
}

async function loadMap(mapName) {
    const tex = await PIXI.Assets.load("./" + mapName);

    if (mapSprite) world.removeChild(mapSprite);

    mapSprite = new PIXI.Sprite(tex);
    mapSprite._type = "map";
    mapSprite.x = 0;
    mapSprite.y = 0;
    mapSprite.width = 4096;
    mapSprite.height = 4096;
    mapSprite.zIndex = -Infinity
    world.addChildAt(mapSprite, 0);

    // --- FIT IMAGE HEIGHT TO CANVAS HEIGHT ---
    const canvasHeight = app.renderer.height;   // internal resolution
    const imageHeight = tex.height;

    const scale = canvasHeight / imageHeight;

    world.scale.set(scale);

    // Optional: center horizontally
    world.x = (app.renderer.width - tex.width * scale) / 2;

    // Optional: reset vertical offset
    world.y = 0;
}

function applyPreset(mapName) {
    const p = presets[mapName];
    if (!p) return;

    document.getElementById("scale").value = p.scale;
    document.getElementById("offsetX").value = p.offsetX;
    document.getElementById("offsetY").value = p.offsetY;
    document.getElementById("rotation").value = p.rotation;

    fetch(p.data)
        .then(r => r.text())
        .then(text => {
            csvData = parseCSV(text);
            renderNodes();
        });
}

function parseCSV(text) {
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
    return rows;
}

function applyTransforms(x, y) {
    const angleDeg = parseFloat(document.getElementById("rotation").value) || 0;

    const angleRad = angleDeg * Math.PI / 180;

    let nx = x * Math.cos(angleRad) - y * Math.sin(angleRad);
    let ny = x * Math.sin(angleRad) + y * Math.cos(angleRad);

    return [nx, ny];
}

async function classifyNode(node) {
    node.visible = true;

    let descriptors = []
    let display_lower = node.data.display_text.toLowerCase();
    let hideAiSpawner = document.getElementById("hideAiSpawner").checked;
    let image = textures.uncommon;
    let tint = 0xffffff;
    let zIndex = 0;
    if (display_lower.includes("loot")) {
        image = textures.pingGeneric;
        tint = 0xffffff;
        zIndex = 50;
    }
    if (display_lower.includes("rare") || display_lower.includes("legendary") || display_lower.includes("bullion")
        || display_lower.includes("loose") || display_lower.includes("crate") || display_lower.includes("ampoule")
        || display_lower.includes("key ring") || display_lower.includes("loot corpse") || display_lower.includes("loot clothes")
        || display_lower.includes("recip")) {
        tint = 0xFFD800;
        zIndex = 100;
        descriptors.push("good");
    }
    if (display_lower.includes("boss") || display_lower.includes("aispawner")) {
        image = textures.monster;
        tint = 0xf08080
        if (display_lower.includes("boss")) tint = 0xffa500
        if (display_lower.includes("bloat")) tint = 0x00ff00
        if (display_lower.includes("rare")) tint = 0xff0000
        if (hideAiSpawner) node.visible = false;
        zIndex = 50;
    } else if (display_lower.includes("node") && !display_lower.includes("loot node")) {
        image = textures.profUnknown;
        zIndex = 50;
        descriptors.push("profession");
        node.filters = null;

        for (let c in conservatorTypes) {
            if (node.data.full_name.includes(conservatorTypes[c])) {
                image = textures.profConservator;
                break;
            }
        }
        for (let c in naturalistTypes) {
            if (node.data.full_name.includes(naturalistTypes[c])) {
                image = textures.profNaturalist;
                break;
            }
        }
        for (let c in scavengerTypes) {
            if (node.data.full_name.includes(scavengerTypes[c])) {
                image = textures.profScavenger;
                break;
            }
        }
    } else if (display_lower.includes("sound trap")) {
        image = textures.sound;
        tint = 0xff0000;
        if (display_lower.includes("crow") || display_lower.includes("glass")) tint = 0x888888
        zIndex = 50;
    } else if (display_lower.includes("trap")) {
        image = textures.grenade;
        tint = 0xff0000;
        if (display_lower.includes("poison")) tint = 0x00ff00
        zIndex = 50;
    } else if (display_lower.includes("raid spawn")) {
        image = textures.social;
        tint = 0xff00ff;
        zIndex = 50;
    } else if (display_lower.includes("coop")) {
        image = textures.egg;
        tint = 0xffffff;
        zIndex = 50;
        descriptors.push("egg");
        node.filters = null;
    } else if (display_lower.includes("loot")) {
        zIndex = 60;
    }

    for (let questItem of questItems) {
        if (node.data.full_name.includes(questItem) || node.data.full_mesh.includes(questItem)) {
            image = textures.quest;
            tint = 0x00ff00;
            zIndex = 200;
            descriptors.push("quest");
            node.filters = null;
            break;
        }
    }

    node.data.descriptors = descriptors.join(" ");
    node.tint = tint;
    node.zIndex = zIndex;
    node.texture = image;
    updateSpriteScreenScale(node);
}

let zMin, zMax;

let questItems = [
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
    "BP_LouisFather_C",
    "BP_LouisFathersNote_C",
    "BP_LouisHandkerchief_C",
    "BP_LouisMother_C",
    "BP_LouisMothersNote_C",
    "BP_LouisMothersNote2_C",
    "BP_LouisMothersNoteQ08_C",
    "BP_LouisQ7Corpse_C",
    "BP_Mapzone_01b_C",
    "BP_Moon_C",
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

function renderNodes() {
    nodes.forEach(n => world.removeChild(n));
    nodes = [];

    const scale = parseFloat(document.getElementById("scale").value) || 0;
    const offsetX = parseFloat(document.getElementById("offsetX").value) || 0;
    const offsetY = parseFloat(document.getElementById("offsetY").value) || 0;

    zMin = Infinity;
    zMax = -Infinity;

    csvData.forEach(async row => {
        if (row.ObjectName.includes("Biomme") || row.ObjectName.includes("Cube")) return;

        const data = {
            row: row,
            full_name: row.ObjectName,
            readable_name: row.ObjectName.replaceAll(/'map.*/gi, "").replaceAll(/[\W_]/g, " ")
                .replaceAll(/([a-z])([A-Z])/g, "$1 $2").trim(),
            full_mesh: row.StaticMeshName,
            readable_mesh: row.StaticMeshName.replaceAll(/^(.*?)'/gi, "").replaceAll("'", "").replaceAll(/[\W_]/g, " ")
                .replaceAll(/([a-z])([A-Z])/g, "$1 $2").trim(),
            descriptors: "",
        }
        const display = []
        if (data.readable_name) display.push(data.readable_name)
        if (data.readable_mesh) display.push(data.readable_mesh)
        data.display_text = display.join("; ")

        const [tx, ty] = applyTransforms(row.X, row.Y);
        const px = tx * scale + offsetX;
        const py = ty * scale + offsetY;
        const pz = row.Z * scale;

        let display_lower = data.display_text.toLowerCase();
        if (display_lower.includes("loot")
            || display_lower.includes("aispawner")
            || display_lower.includes("sound trap")) {
            zMin = Math.min(row.Z, zMin || row.Z);
            zMax = Math.max(row.Z, zMax || row.Z);
        }

        const colorMatrix = new PIXI.ColorMatrixFilter();
        colorMatrix.brightness(1, false);
        colorMatrix.saturate(1, false);

        const g = new PIXI.Sprite(textures.uncommon);
        g._type = "marker"
        g.anchor.set(0.5);
        g.x = px;
        g.y = py;
        g.z = pz;
        g.visible = false;
        g.data = data;
        g.filters = [colorMatrix];

        classifyNode(g);
        updateSpriteScreenScale(g);

        data.tooltip_text = `Info: ${data.display_text}`
        data.tooltip_text += `\nZ: ${pz.toFixed(3)}`
        if (data.row.SpawnChance) {
            data.tooltip_text += `\nSpawn Chance: ${data.row.SpawnChance}`
            colorMatrix.brightness((Number(data.row.SpawnChance) + 50) / 100, false);
        }

        g.interactive = true;
        g.on("pointerover", e => {
            tooltip.style.display = "block";
            tooltip.style.left = (e.clientX + 10) + "px";
            tooltip.style.top = (e.clientY - 10) + "px";
            tooltip.textContent = g.data.tooltip_text;
        });
        g.on("pointerout", () => {
            tooltip.style.display = "none";
        });

        nodes.push(g);
        world.addChild(g);
    });

    // world.children.filter(c => c._type === "marker").forEach(c => {
    //     // 0.276163x - 0.371129
    // });

    updateNodes();
}

function updateSpriteScreenScale(sprite) {
    const screenSize = sprite._screenSize || 24;
    const inverseWorldScale = 1 / world.scale.x;

    const baseScale = screenSize / sprite.texture.width;

    sprite.scale.set(baseScale * inverseWorldScale);
}

function updateNodes() {
    const filterZ = document.getElementById("filterZrange").checked;

    const scale = parseFloat(document.getElementById("scale").value) || 0;
    const offsetX = parseFloat(document.getElementById("offsetX").value) || 0;
    const offsetY = parseFloat(document.getElementById("offsetY").value) || 0;

    world.children.filter(c => c._type === "marker").forEach(node => {
        const [tx, ty] = applyTransforms(node.data.row.X, node.data.row.Y);
        const px = tx * scale + offsetX;
        const py = ty * scale + offsetY;
        const pz = node.data.row.Z * scale;

        node.x = px;
        node.y = py;
        node.z = pz;

        classifyNode(node);
        updateSpriteScreenScale(node);
    })

    applySearchFilter();

    const step = 300;
    const sliderZrange = document.getElementById("zRange");
    sliderZrange.step = 10;
    sliderZrange.min = zMin;
    sliderZrange.max = zMax - 300;

    const zValue = Number(document.getElementById("zRange").value);

    if (filterZ) {
        world.children.filter(c => c._type === "marker").forEach(node => {
            if (node.visible && !isNaN(node.data.row.Z)) {
                const inRange = node.data.row.Z > zValue && node.data.row.Z < (zValue + step);
                if (!inRange) {
                    node.tint = 0x808080;
                    node.alpha = 0.2;
                    // node.lineStyle(0);
                    node.zIndex -= 1000;
                }
            }
        })
    }

    world.children.filter(c => c._type === "marker").sort((a, b) => {
        const aIsNotGrey = a.tint !== 0x808080;
        const bIsNotGrey = b.tint !== 0x808080;

        return a.visible - b.visible ||
            aIsNotGrey - bIsNotGrey ||
            a.zIndex - b.zIndex ||
            a.z - b.z
    });
}

function applySearchFilter() {
    const query = document.getElementById("searchBox").value.toLowerCase();
    const showOnlyMatches = document.getElementById("showOnlyMatches").checked;

    const matching = [];
    const nonMatching = [];

    nodes.forEach(node => {
        const match = node.data.display_text.toLowerCase().includes(query.toLowerCase())
            || node.data.descriptors.toLowerCase().includes(query.toLowerCase());

        if (match) {
            classifyNode(node);
            node.visible = node.visible && true;
            node.alpha = 1.0;
            matching.push(node);
        } else {
            node.visible = !showOnlyMatches;
            node.tint = 0x808080;
            node.alpha = 0.6;
            node.zIndex -= 1000;
            // node.lineStyle(0);
            nonMatching.push(node);
        }
    });

    nonMatching.forEach(n => world.setChildIndex(n, 1)); // keep above map
    matching.forEach(n => world.setChildIndex(n, world.children.length - 1));
}

initPixi();