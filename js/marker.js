import {textures} from "textures";
import * as data from "data";
import {controls} from "dom";

export class Marker {
    constructor(row) {
        this.#row = row;
        this.#init();
    }

    // Raw data from CSV file
    #row;
    #readable = {};
    #descriptors = [];
    #colorMatrix = new PIXI.ColorMatrixFilter();
    #texture = textures.uncommon;
    #container = new PIXI.Container();
    #sprite = new PIXI.Sprite(this.#texture);
    #class = "other";

    // Styles that get changed by filters to set back to default
    #brightness = 1;
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
        sprite.filters = [this.#colorMatrix];
        this.#applyTransforms()

        this.#container.addChild(sprite);

        this.#readable.name = this.#makeReadable(this.#row.OuterType || "");
        this.#readable.mesh = this.#makeReadable(this.#row.OuterName || "");

        if (this.#row.Keyed) {
            this.#row.Keyed = this.#row.Keyed.replace(/InventoryDefinition_Key'ID_Key_(\w+)'/g, "$1 Key");
        }

        let aiSpawner = this.#row.AISpawner;
        if (aiSpawner) {
            this.#row.AISpawner = this.#makeReadable(aiSpawner.replace(/AISpawnerConfigSet'DA_AISpawner_(\w+)'/g, "$1"));
        }
        this.#readable.displayName = this.#row.DisplayName || this.#row.AISpawner || this.#row.LootSource || this.#row.OuterType
        if (["StaticMesh"].includes(this.#row.OuterType)) {
            this.#readable.displayName = this.#row.OuterName;
        }

        // this.#colorMatrix.brightness(1.1, false);
        // this.#colorMatrix.saturate(1.05, false);

        this.#classify();
        sprite.tint = this.#tint;
        sprite.zIndex = this.#zIndex;
        this.#container.zIndex = this.#zIndex;

        sprite.interactive = true;
        sprite.on("pointerover", e => {
            tooltip.style.display = "block";
            tooltip.style.left = (e.clientX + 10) + "px";
            tooltip.style.top = (e.clientY - 10) + "px";
            tooltip.innerHTML = this.#tooltipText();
        });
        sprite.on("pointerout", () => {
            tooltip.style.display = "none";
        });

        const copyDetails = `${this.#row.OuterType}'${this.#row.OuterName}'`;

        function onDoubleClick(e) {
            navigator.clipboard.writeText(copyDetails);
        }

        sprite.eventMode = "static";
        sprite.cursor = "pointer";
        let lastTapTime = 0;
        const doubleTapDelay = 300; // ms
        sprite.on("pointertap", (event) => {
            const now = performance.now();
            if (now - lastTapTime <= doubleTapDelay) {
                console.log("Double click / double tap detected", event);
                onDoubleClick(event);
                lastTapTime = 0;
            } else {
                lastTapTime = now;
            }
        });
    }

    #replacer(key, value) {
        if (value === null || value === {} || !value)
            return undefined;
        else
            return value;
    };

    #tooltipText() {
        let rows = []
        rows.push(`<tr><td><strong>Type</strong></td><td>${this.#row["OuterType"]}</td></tr>`)
        if (this.#class === "other") {
            rows.push(`<tr><td><strong>Name</strong></td><td>${this.#row["OuterName"]}</td></tr>`)
        }
        rows.push(`<tr><td><strong>Height (Z)</strong></td><td>${this.sprite.z.toFixed(2)}</td></tr>`)
        rows.push(`<tr><td><strong>Class</strong></td><td>${this.#class}</td></tr>`)
        if (this.#row.SpawnChance) {
            rows.push(`<tr><td><strong>Spawn Chance</strong></td><td>${this.#row.SpawnChance}% (${this.#row.ChanceType})</td></tr>`)
        }
        if (this.#row.Health) {
            rows.push(`<tr><td><strong>Health</strong></td><td>${this.#row.Health}</td></tr>`)
        }
        if (this.#row.Keyed) {
            rows.push(`<tr><td><strong>Keyed</strong></td><td>${this.#row.Keyed}</td></tr>`)
        }
        if (this.#row.LootSource) {
            rows.push(`<tr><td><strong>LootSource</strong></td><td>${this.#row.LootSource}</td></tr>`)
        }
        if (this.#row.AISpawner) {
            rows.push(`<tr><td><strong>AISpawner</strong></td><td>${this.#row.AISpawner}</td></tr>`)
        }
        return `<div><h5>${this.#readable.displayName}</h5><table class="table table-sm table-striped" style="margin:0">${rows.join("")}</table></div>`
    }

    #classify() {
        const sprite = this.#sprite;
        const display_lower = this.#readable.displayName.toLowerCase();

        this.#colorMatrix.brightness((Number(this.#row.SpawnChance || "100.0") + 15) / 100, false);

        if (this.#row.Keyed) {
            let keyTexture = textures.key_special;
            if (this.#row.Keyed.includes("Bronze")) keyTexture = textures.key_bronze;
            if (this.#row.Keyed.includes("Silver")) keyTexture = textures.key_silver;
            if (this.#row.Keyed.includes("Gold")) keyTexture = textures.key_gold;
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

        console.log(display_lower)
        if (display_lower.includes("a0")) {
            sprite.texture = textures.pingGeneric;
            if (!display_lower.includes("hub")) {
                this.#tint = 0xFFD800;
            }
            this.#zIndex = 100;
            this.#descriptors.push("npc");
        }
        if (display_lower.includes("gate_a0")) {
            sprite.texture = textures.door;
            this.#tint = 0x00D8FF
        }

        for (const substr of Object.keys(data.chateauProfessionNodes)) {
            if (this.#row.OuterType.startsWith(substr)) {
                sprite.texture = data.chateauProfessionNodes[substr];
                this.#zIndex = 50;
                this.#descriptors.push("profession");
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
        for (const substr of data.environment) {
            if (this.#row.OuterType.match(substr) || this.#row.OuterName.match(substr)) {
                this.#class = "environment";
                sprite.texture = textures.uncommon;

                if (display_lower.includes("breakable")
                    || display_lower.includes("door")
                    || display_lower.includes("windowlarge")) {
                    this.#tint = 0x00D8FF
                }

                if (display_lower.includes("lift") || display_lower.includes("door")) {
                    sprite.texture = textures.door;
                } else if (display_lower.includes("window")) {
                    sprite.texture = textures.window;
                }

                for (const resourceNode of data.professions.conservatorTypes) {
                    if (this.#row.OuterType.includes(resourceNode)) {
                        sprite.texture = textures.profConservator;
                        this.#descriptors.push("profession");
                        break;
                    }
                }
                for (const resourceNode of data.professions.naturalistTypes) {
                    if (this.#row.OuterType.includes(resourceNode)) {
                        sprite.texture = textures.profNaturalist;
                        this.#descriptors.push("profession");
                        break;
                    }
                }
                for (const resourceNode of data.professions.scavengerTypes) {
                    if (this.#row.OuterType.includes(resourceNode)) {
                        sprite.texture = textures.profScavenger;
                        this.#descriptors.push("profession");
                        break;
                    }
                }

                if (display_lower.includes("soundtrap")) {
                    sprite.texture = textures.sound;
                    this.#tint = 0xff0000;
                    if (display_lower.includes("crow") || display_lower.includes("glass")) this.#tint = 0x888888;
                    this.#zIndex = 50;
                } else if (display_lower.includes("trap") && !display_lower.includes("trapdoor")) {
                    sprite.texture = textures.grenade;
                    this.#tint = 0xff0000;
                    if (display_lower.includes("poison")) this.#tint = 0x00ff00
                    this.#zIndex = 50;
                }

                if (display_lower.includes("stairintegrated")) {
                    sprite.texture = textures.stairs;
                    //this.#tint = 0x0000ff;
                    console.log(this.#texture)
                }

                return;
            }
        }
        for (const substr of data.containers) {
            if (this.#row.OuterType.match(substr) || this.#row.OuterName.match(substr)) {
                this.#class = "container";
                sprite.texture = textures.pingGeneric;
                this.#zIndex = 50;

                if (display_lower.includes("coop")) {
                    sprite.texture = textures.egg;
                    this.tint = 0xffffff;
                    this.#descriptors.push("egg");
                } else if (display_lower.includes("dungeon m") || display_lower.includes("bullion")
                    || display_lower.includes("crate")
                    || display_lower.includes("corpse") || display_lower.includes("clothes")) {
                    this.#tint = 0xFFD800;
                    this.#zIndex = 100;
                    this.#descriptors.push("good");
                } else if (display_lower.includes("kindling")) {
                    sprite.texture = textures.branch;
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