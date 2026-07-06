import * as data from "data";
import {spawns} from "data";
import * as pixi from "pixi";
import {mapSprite, markerSprites, world} from "pixi";
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

    async function loadMapAndPreset(mapId) {
        pixi.clearMarkers();
        const preset = data.presets[mapId];
        mapSprite.texture = preset.texture;
        pixi.fitMapSpriteToCanvas();

        document.getElementById("scale").value = preset.scale;
        document.getElementById("offsetX").value = preset.offsetX;
        document.getElementById("offsetY").value = preset.offsetY;
        document.getElementById("rotation").value = preset.rotation;

        preset.data().forEach(marker => world.addChild(marker.sprite));
        pixi.scaleMarkersToZoom();

        const sprites = pixi.markerSprites();
        const markers = sprites.map(sprite => sprite._marker);

        let minZ = Infinity;
        let maxZ = -Infinity;

        markers.filter(marker => marker.class && marker.class !== "other").forEach(marker => {
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

        controls.creatureSelect.multiselect('select', ['Miniboss', "Bloats", "Dreg Horde"]);
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
            const match = marker.readable.displayName.toLowerCase().includes(query)
                || marker.class.includes(query)
                || marker.descriptors.includes(query);

            if (match) {
                sprite.tint = marker.originalTint;
                sprite.zIndex = marker.originalZIndex;
                sprite.alpha = 1.0;
                sprite.visible = true;
            } else {
                sprite.tint = 0x808080;
                sprite.alpha = 0.2;
                sprite.zIndex -= 1000;
                sprite.visible = !showOnlyMatches;
            }
        });

        const containers = controls.lootSelect.val();
        const loose = controls.looseSelect.val();
        const creature = controls.creatureSelect.val();
        const environment = controls.envSelect.val();
        const quest = controls.questSelect.val();
        const spawns = controls.spawnsSelect.val();
        const other = controls.otherSelect.val();

        markerSprites().forEach(sprite => {
            if (!sprite.visible) {
                return;
            }

            const marker = sprite._marker;
            if (marker.class === "container") {
                sprite.visible = containers.includes(marker.readable.displayName);
            }
            if (marker.class === "loose") {
                sprite.visible = loose.includes(marker.readable.displayName);
            }
            if (marker.class === "creature") {
                sprite.visible = creature.includes(marker.readable.displayName);
            }
            if (marker.class === "environment") {
                sprite.visible = environment.includes(marker.readable.displayName);
            }
            if (marker.class === "quest") {
                sprite.visible = quest.includes(marker.readable.displayName);
            }
            if (marker.class === "spawns") {
                sprite.visible = spawns.includes(marker.readable.displayName);
            }
            if (marker.class === "other") {
                sprite.visible = other.includes(marker.readable.displayName);
            }
        })

        const step = 300;
        const heightEnabled = controls.enableHeightFilter.checked;
        const zValue = Number(controls.sliderHeight.value);
        if (heightEnabled) {
            console.log("Filtering by height", zValue, step);
            markerSprites().forEach(sprite => {
                const marker = sprite._marker;
                if (sprite.visible && !isNaN(marker.row.Z)) {
                    const inRange = Number(marker.row.Z) > zValue && Number(marker.row.Z) < (zValue + step);
                    if (inRange) {
                        sprite.tint = marker.originalTint;
                        sprite.zIndex = marker.originalZIndex;
                        sprite.alpha = 1.0;
                    } else {
                        sprite.tint = 0x808080;
                        sprite.zIndex -= 1000;
                        sprite.alpha = 0.2;
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
}());
