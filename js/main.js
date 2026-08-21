import * as data from "data";
import {spawns} from "data";
import * as pixi from "pixi";
import {app, mapOverlaySprite, mapSprite, markerSprites, world} from "pixi";
import {controls, dom_ready, elements, refreshLabels} from "dom";

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
        pixi.render();
    })

    async function loadMapAndPreset(mapId) {
        pixi.clearMarkers();
        const preset = data.presets[mapId];
        document.getElementById('map-banner').style.backgroundImage = `url('${preset.thumbnail}')`;
        mapSprite.texture = preset.texture;
        mapOverlaySprite.texture = preset.overlay;
        pixi.fitMapSpriteToCanvas();

        document.getElementById("scale").value = preset.scale;
        document.getElementById("offsetX").value = preset.offsetX;
        document.getElementById("offsetY").value = preset.offsetY;
        document.getElementById("rotation").value = preset.rotation;

        preset.data().forEach(marker => {
            // Ignore markers outside of image (except a little bit outside for Jacques Folly)
            if (!(0 <= marker.sprite.x && marker.sprite.x <= 4096 && -500 <= marker.sprite.y && marker.sprite.y <= 4096)) {
                return
            }
            world.addChild(marker.container)
        });
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

        function loadMultiselectF(ts, keyFunc, textFunc) {
            const options = [];
            markers.forEach(marker => {
                const key = keyFunc(marker);
                if (key && !options.includes(key)) options.push(key);
            });
            ts.clear(true);
            ts.clearOptions();
            options.sort().forEach(opt => ts.addOption({
                value: opt,
                text: textFunc ? textFunc(opt) : opt
            }));
        }

        function loadMultiselectClass(ts, classType, textFunc) {
            const options = [];
            markers.forEach(marker => {
                const displayName = marker.readable.displayName;
                if (marker.class === classType && !options.includes(displayName)) {
                    options.push(displayName);
                }
            });
            ts.clear(true);
            ts.clearOptions();
            options.sort().forEach(opt => ts.addOption({
                value: opt,
                text: textFunc ? textFunc(opt) : opt
            }));
        }

        loadMultiselectF(controls.lootSourceSelect, marker => {
            if (!(marker.row.LootSource || "container" === marker.class)) return;
            return marker.row.LootSource
        }, lootTable => {
            const largest = markers
                .filter(marker => marker.row.LootSource === lootTable)
                .sort((a, b) => (Number(b.estValue) || 0) - (Number(a.estValue) || 0))[0];
            if (largest && largest.estValue) {
                return `<span class="text">${lootTable}</span> <small class="text-muted">Avg: ${largest.formatCoins(largest.estValue)}</small>`;
            } else {
                return lootTable;
            }
        });

        loadMultiselectClass(controls.npcSelect, "npc");
        //loadMultiselectClass(controls.lootSelect, "container");
        loadMultiselectClass(controls.looseSelect, "loose", looseName => {
            const largest = markers
                .filter(marker => marker.readable.displayName === looseName)
                .sort((a, b) => (Number(b.estValue) || 0) - (Number(a.estValue) || 0))[0];
            if (largest && largest.estValue) {
                return `<span class="text">${looseName}</span> <small class="text-muted">Avg: ${largest.formatCoins(largest.estValue)}</small>`;
            } else {
                return looseName;
            }
        });
        loadMultiselectClass(controls.creatureSelect, "creature");
        loadMultiselectClass(controls.envSelect, "environment");
        loadMultiselectClass(controls.questSelect, "quest");
        loadMultiselectClass(controls.spawnsSelect, "spawns");
        loadMultiselectClass(controls.otherSelect, "other");

        //controls.creatureSelect.setValue(['Miniboss', 'Miniboss 01b', "Bloats", "Dreg Horde"], true);
        [controls.npcSelect, controls.lootSourceSelect,
            controls.looseSelect, controls.envSelect,
            controls.questSelect, controls.spawnsSelect, controls.creatureSelect].forEach(ts => ts.setValue(Object.keys(ts.options), true));
        refreshLabels();

        [controls.npcSelect, controls.lootSourceSelect, controls.looseSelect, controls.envSelect,
            controls.creatureSelect, controls.questSelect, controls.spawnsSelect, controls.otherSelect
        ].forEach(ts => {
            ts.input.closest('.col-lg-12').hidden = Object.keys(ts.options).length === 0;
        });

        await applySearch();
    }

    async function applySearch() {
        const sprites = markerSprites();
        const query = document.getElementById("searchBox").value.toLowerCase();
        const showOnlyMatches = document.getElementById("showOnlyMatches").checked;

        sprites.forEach(sprite => {
            const marker = sprite._marker;
            if (!marker) {
                return;
            }

            const values = [
                marker.readable.displayName,
                marker.row.OuterType,
                marker.class,
                marker.descriptors
            ]
            if (marker.row.SpawnChance) {
                values.push(marker.row.SpawnChance + " (" + marker.row.ChanceType + ")")
            }
            if (marker.row.LootSource) {
                values.push(marker.row.LootSource)
            }
            if (marker.row.AISpawner) {
                values.push(marker.row.AISpawner)
            }
            if (marker.row.CsvJson?.node_tag) {
                const resource = data.RESOURCE_NODES[marker.row.CsvJson.node_tag];
                if (resource) {
                    values.push(resource.Item)
                    const item = data.ITEMS[resource.Item]
                    if (item) {
                        values.push(item["DisplayName"])
                    }
                }

            }
            if (marker.tableData && controls.includeChanceItems.checked) {
                const rangeValue = [1/32, 1/128, 1/1000, 1/10000, 1/Infinity][controls.chanceRange.value];
                marker.tableData.forEach(loot => {
                    const realTable = data.LOOT_SOURCE_TABLES[loot["LootSource"]];
                    if (realTable) {
                        realTable.forEach((row2) => {
                            if (Number(row2["WeightPercent"]) / 100 >= rangeValue) {
                                values.push(row2["ObjectName"])
                                const item = data.ITEMS[row2["ObjectName"]]
                                if (item) {
                                    values.push(item["DisplayName"])
                                }
                            }
                        });
                    }
                    if (Number(loot["WeightPercent"]) / 100 >= rangeValue) {
                        values.push(loot["ObjectName"])
                        const item = data.ITEMS[loot["ObjectName"]]
                        if (item) {
                            values.push(item["DisplayName"])
                        }
                    }
                })
            }
            if (marker.row?.CsvJson?.health) {
                values.push(marker.row.CsvJson.health)
            }
            if (marker.row?.CsvJson?.keyed) {
                values.push(marker.row.CsvJson.keyed)
            }
            if (marker.row?.CsvJson?.instruction) {
                values.push(marker.row.CsvJson.instruction)
            }
            if (marker.row?.CsvJson?.grant_items) {
                Object.keys(marker.row.CsvJson.grant_items).forEach(item_id => {
                    values.push(item_id)
                    const item = data.ITEMS[item_id]
                    if (item) {
                        values.push(item["DisplayName"])
                    }
                })
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

        const npcs = controls.npcSelect.getValue();
        const lootSources = controls.lootSourceSelect.getValue();
        //const containers = controls.lootSelect.getValue();
        const loose = controls.looseSelect.getValue();
        const creature = controls.creatureSelect.getValue();
        const environment = controls.envSelect.getValue();
        const quest = controls.questSelect.getValue();
        const spawns = controls.spawnsSelect.getValue();
        const other = controls.otherSelect.getValue();

        sprites.filter(m => m._marker).forEach(sprite => {
            if (!sprite.parent.visible) {
                return;
            }

            const marker = sprite._marker;
            if (marker.class === "npc") {
                sprite.parent.visible = npcs.includes(marker.readable.displayName);
            }
            if (marker.row.LootSource) {
                sprite.parent.visible = lootSources.includes(marker.row.LootSource);
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
            sprites.filter(m => m._marker).forEach(sprite => {
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
    controls.includeChanceItems.addEventListener("change", applySearch);
    controls.chanceRange.addEventListener("change", () => {
        updateChanceText();
        applySearch();
    });
    const chanceText = ["Common <= 1/32", "Uncommon <= 1/128", "Rare <= 1/1,000", "Very Rare <= 1/10k", "Everything"]
    const updateChanceText = () => elements.divChanceRange.innerHTML = chanceText[controls.chanceRange.value]
    updateChanceText()
    controls.enableHeightFilter.addEventListener("change", applySearch);
    controls.sliderHeight.addEventListener("input", applySearch);
    [controls.npcSelect, controls.lootSourceSelect, controls.looseSelect, controls.creatureSelect, controls.envSelect, controls.questSelect,
        controls.spawnsSelect, controls.otherSelect].forEach(ts => ts.on('change', applySearch));

    [controls.inputScale, controls.inputOffsetX, controls.inputOffsetY, controls.inputRotation].forEach(control => {
        control.addEventListener("input", () => pixi.markerSprites()
            .forEach(markerSprite => markerSprite._marker.reposition()))
    })
}());
