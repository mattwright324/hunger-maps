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
            .replaceAll(/(^(C|C LI|BP|SM|DA|PG|SC|LI) )|(Loot|AISpawner|Node)/g, "") // Remove prefix/suffix chars
            //.replaceAll(/(\W0\d.*)/g, "") // Remove prefix/suffix chars
            //.replaceAll(/( (UREL|REL|C)$)/g, "") // Remove prefix/suffix chars
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

        this.#readable.name = this.#makeReadable(this.#row.ObjectName.replaceAll(/'map.*/gi, ""));
        this.#readable.mesh = this.#makeReadable(this.#row.StaticMeshName.replaceAll(/^(.*?)'/gi, ""));
        const display = []
        if (this.#readable.name) {
            display.push(this.#readable.name);
        }
        if (this.#readable.mesh) {
            display.push(this.#readable.mesh);
        }
        this.#readable.displayName = display.join("; ");

        // this.#colorMatrix.brightness(1.1, false);
        // this.#colorMatrix.saturate(1.05, false);

        this.#classify();
        sprite.tint = this.#tint;
        sprite.zIndex = this.#zIndex;

        sprite.interactive = true;
        sprite.on("pointerover", e => {
            tooltip.style.display = "block";
            tooltip.style.left = (e.clientX + 10) + "px";
            tooltip.style.top = (e.clientY - 10) + "px";
            tooltip.textContent = this.#tooltipText();
        });
        sprite.on("pointerout", () => {
            tooltip.style.display = "none";
        });

        const copy = []
        if (this.#row.ObjectName) {
            copy.push("Name: " + this.#row.ObjectName);
        }
        if (this.#row.StaticMeshName) {
            copy.push("Mesh: " + this.#row.StaticMeshName);
        }
        const copyDetails = copy.join("\n");

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

    #tooltipText() {
        const lines = []
        if (this.#readable.displayName) {
            lines.push(this.#readable.displayName);
        } else {
            lines.push(this.#row.StaticMeshName || this.#row.ObjectName);
        }
        lines.push("Class: " + this.#class);
        lines.push("Z: " + this.sprite.z.toFixed(2));
        if (this.#row.SpawnChance) {
            lines.push("Spawn Chance: " + this.#row.SpawnChance + "%");
        }
        return lines.join("\n");
    }

    #classify() {
        const sprite = this.#sprite;
        const display_lower = this.#readable.displayName.toLowerCase();

        if (this.#row.SpawnChance) {
            this.#colorMatrix.brightness((Number(this.#row.SpawnChance) + 50) / 100, false);
        }

        for (const substr of data.looseItems) {
            if (this.#row.ObjectName.match(substr) || this.#row.StaticMeshName.match(substr)) {
                this.#class = "loose";
                sprite.texture = textures.itemBag;
                this.#tint = 0xFFFFFF;
                this.#zIndex = 60;

                if (display_lower.includes("rare") || display_lower.includes("legendary")
                    || display_lower.includes("loose") || display_lower.includes("ampoule")
                    || display_lower.includes("key ring") || display_lower.includes("recip")) {
                    this.#tint = 0xFFD800;
                    this.#zIndex = 100;
                    this.#descriptors.push("good");
                }
                return;
            }
        }
        for (const substr of data.environment) {
            if (this.#row.ObjectName.match(substr) || this.#row.StaticMeshName.match(substr)) {
                this.#class = "environment";
                sprite.texture = textures.uncommon;

                if (display_lower.includes("breakable")
                    || display_lower.includes("door")
                    || display_lower.includes("window large")) {
                    this.#tint = 0x00D8FF
                }

                if (display_lower.includes("lift") || display_lower.includes("door")) {
                    sprite.texture = textures.door;
                } else if (display_lower.includes("window")) {
                    sprite.texture = textures.window;
                }

                for (const resourceNode of data.professions.conservatorTypes) {
                    if (this.#row.ObjectName.includes(resourceNode)) {
                        sprite.texture = textures.profConservator;
                        break;
                    }
                }
                for (const resourceNode of data.professions.naturalistTypes) {
                    if (this.#row.ObjectName.includes(resourceNode)) {
                        sprite.texture = textures.profNaturalist;
                        break;
                    }
                }
                for (const resourceNode of data.professions.scavengerTypes) {
                    if (this.#row.ObjectName.includes(resourceNode)) {
                        sprite.texture = textures.profScavenger;
                        break;
                    }
                }

                if (display_lower.includes("sound trap")) {
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

                if (display_lower.includes("stair integrated")) {
                    sprite.texture = textures.stairs;
                    //this.#tint = 0x0000ff;
                    console.log(this.#texture)
                }

                return;
            }
        }
        for (const substr of data.containers) {
            if (this.#row.ObjectName.match(substr) || this.#row.StaticMeshName.match(substr)) {
                this.#class = "container";
                sprite.texture = textures.pingGeneric;
                this.#zIndex = 50;

                if (display_lower.includes("coop")) {
                    sprite.texture = textures.egg;
                    this.tint = 0xffffff;
                    this.#descriptors.push("egg");
                } else if (display_lower.includes("bullion") || display_lower.includes("crate")
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
            if (this.#row.ObjectName.match(substr) || this.#row.StaticMeshName.match(substr)) {
                this.#class = "spawns";

                if (display_lower.includes("raid spawn")) {
                    sprite.texture = textures.social;
                    this.#tint = 0xff00ff;
                    this.zIndex = 200;
                } else if (display_lower.includes("raid extract")) {
                    sprite.texture = textures.extract;
                    this.zIndex = 200;
                }
                return;
            }
        }
        for (const substr of data.creatures) {
            if (this.#row.ObjectName.match(substr) || this.#row.StaticMeshName.match(substr)) {
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
            if (this.#row.ObjectName.match(substr) || this.#row.StaticMeshName.match(substr)) {
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