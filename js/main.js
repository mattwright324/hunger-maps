import * as data from "data";
import {spawns} from "data";
import * as pixi from "pixi";
import {mapOverlaySprite, mapSprite, markerSprites, world} from "pixi";
import * as dom from "dom";
import {controls, dom_ready} from "dom";

(async function () {
    'use strict';

    try {
        await dom_ready();
    } catch (e) {
        console.error("Failed to initialize:", e);
        throw e;
    }

    controls.mapSelect.addEventListener("change", () => loadMapAndPreset(controls.mapSelect.value));
    controls.mapSelect.dispatchEvent(new Event('change'));

    controls.showOverlay.addEventListener("change", () => {
        mapOverlaySprite.visible = controls.showOverlay.checked;
    })

    async function loadMapAndPreset(mapId) {
        pixi.clearMarkers();
        const preset = data.presets[mapId];
        mapSprite.texture = preset.texture;
        mapOverlaySprite.texture = preset.overlay;
        pixi.fitMapSpriteToCanvas();

        document.getElementById("scale").value = preset.scale;
        document.getElementById("offsetX").value = preset.offsetX;
        document.getElementById("offsetY").value = preset.offsetY;
        document.getElementById("rotation").value = preset.rotation;

        preset.data().forEach(marker => world.addChild(marker.container));
        pixi.scaleMarkersToZoom();

        const sprites = pixi.markerSprites();
        const markers = sprites.map(sprite => sprite._marker).filter(m => m);

        let minZ = Infinity;
        let maxZ = -Infinity;

        markers.filter(marker => marker.class && !(marker.class === "other" || marker.class === "environment")).forEach(marker => {
            minZ = Math.min(minZ, marker.row.Z);
            maxZ = Math.max(maxZ, marker.row.Z);
        })

        controls.sliderHeight.min = minZ.toFixed(2);
        controls.sliderHeight.max = maxZ.toFixed(2) - 300;

        function loadMultiselect(select, classType) {
            const options = []
            markers.forEach(marker => {
                const displayName = marker.readable.displayName;
                if (marker.class === classType && options.indexOf(displayName) === -1) {
                    options.push(displayName);
                }
            })
            options.sort();
            select.empty();
            options.forEach(container => {
                select.append($("<option>", {
                    value: container,
                    text: container,
                }))
            })
        }

        loadMultiselect(controls.lootSelect, "container");
        loadMultiselect(controls.looseSelect, "loose");
        loadMultiselect(controls.creatureSelect, "creature");
        loadMultiselect(controls.envSelect, "environment");
        loadMultiselect(controls.questSelect, "quest");
        loadMultiselect(controls.spawnsSelect, "spawns");
        loadMultiselect(controls.otherSelect, "other");

        dom.rebuildSelects();

        controls.creatureSelect.multiselect('select', ['Miniboss', 'Miniboss 01b', "Bloats", "Dreg Horde"]);
        [controls.lootSelect, controls.looseSelect, controls.envSelect, controls.questSelect, controls.spawnsSelect, controls.otherSelect].forEach(control => {
            control.multiselect('selectAll', false)
            control.multiselect('updateButtonText')
        });
        controls.lootSelect.trigger('change');

        await applySearch();
    }

    async function applySearch() {
        const query = document.getElementById("searchBox").value.toLowerCase();
        const showOnlyMatches = document.getElementById("showOnlyMatches").checked;

        markerSprites().forEach(sprite => {
            const marker = sprite._marker;
            if (!marker) {
                return;
            }

            const values = [
                marker.readable.displayName,
                marker.class,
                marker.descriptors
            ]
            if (marker.row.SpawnChance) {
                values.push(marker.row.SpawnChance + " (" + marker.row.ChanceType + ")")
            }
            if (marker.row.Health) {
                values.push(marker.row.Health)
            }
            if (marker.row.Keyed) {
                values.push(marker.row.Keyed)
            }
            if (marker.row.LootSource) {
                values.push(marker.row.LootSource)
            }
            if (marker.row.AISpawner) {
                values.push(marker.row.AISpawner)
            }
            const match = values.some(v => v.toLowerCase().includes(query));

            if (match) {
                sprite.tint = marker.originalTint;
                sprite.parent.zIndex = marker.originalZIndex;
                sprite.parent.alpha = 1.0;
                sprite.parent.visible = true;
            } else {
                sprite.tint = 0x808080;
                sprite.parent.alpha = 0.2;
                sprite.parent.zIndex -= 1000;
                sprite.parent.visible = !showOnlyMatches;
            }
        });

        const containers = controls.lootSelect.val();
        const loose = controls.looseSelect.val();
        const creature = controls.creatureSelect.val();
        const environment = controls.envSelect.val();
        const quest = controls.questSelect.val();
        const spawns = controls.spawnsSelect.val();
        const other = controls.otherSelect.val();

        markerSprites().filter(m => m._marker).forEach(sprite => {
            if (!sprite.parent.visible) {
                return;
            }

            const marker = sprite._marker;
            if (marker.class === "container") {
                sprite.parent.visible = containers.includes(marker.readable.displayName);
            }
            if (marker.class === "loose") {
                sprite.parent.visible = loose.includes(marker.readable.displayName);
            }
            if (marker.class === "creature") {
                sprite.parent.visible = creature.includes(marker.readable.displayName);
            }
            if (marker.class === "environment") {
                sprite.parent.visible = environment.includes(marker.readable.displayName);
            }
            if (marker.class === "quest") {
                sprite.parent.visible = quest.includes(marker.readable.displayName);
            }
            if (marker.class === "spawns") {
                sprite.parent.visible = spawns.includes(marker.readable.displayName);
            }
            if (marker.class === "other") {
                sprite.parent.visible = other.includes(marker.readable.displayName);
            }
        })

        const step = 300;
        const heightEnabled = controls.enableHeightFilter.checked;
        const zValue = Number(controls.sliderHeight.value);
        if (heightEnabled) {
            console.log("Filtering by height", zValue, step);
            markerSprites().filter(m => m._marker).forEach(sprite => {
                const marker = sprite._marker;
                if (sprite.visible && !isNaN(marker.row.Z)) {
                    const inRange = Number(marker.row.Z) > zValue && Number(marker.row.Z) < (zValue + step);
                    if (inRange) {
                        sprite.tint = marker.originalTint;
                        sprite.parent.zIndex = marker.originalZIndex;
                        sprite.parent.alpha = 1.0;
                    } else {
                        sprite.tint = 0x808080;
                        sprite.parent.zIndex -= 1000;
                        sprite.parent.alpha = 0.2;
                    }
                }
            })
        }

        pixi.sortSprites();
    }

    controls.searchBox.addEventListener("input", applySearch);
    controls.checkShowOnlyMatches.addEventListener("change", applySearch);
    controls.enableHeightFilter.addEventListener("change", applySearch);
    controls.sliderHeight.addEventListener("input", applySearch);
    [controls.lootSelect, controls.looseSelect, controls.creatureSelect, controls.envSelect, controls.questSelect,
        controls.spawnsSelect, controls.otherSelect].forEach(control => {
        control.on("change", applySearch);
    });

    [controls.inputScale, controls.inputOffsetX, controls.inputOffsetY, controls.inputRotation].forEach(control => {
        control.addEventListener("input", () => pixi.markerSprites()
            .forEach(markerSprite => markerSprite._marker.reposition()))
    })
}());
