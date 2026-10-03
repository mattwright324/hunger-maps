import {dom_ready, elements} from 'dom'

await dom_ready();

const texturePaths = {
    mapChateau: "./map00.webp",
    mapSarlat: "./map01.webp",
    mapSarlatOverlay: "./map01_overlay.webp",
    mapJacques: "./map02.webp",
    mapJacquesOverlay: "./map02_overlay.webp",
    mapSombre: "./map03.webp",
    mapSombreOverlay: "./map03_overlay.webp",

    npcGeneric: "./img/T_UI_NPCIndicator_Base_Generic.png",
    uncommon: "./img/T_UI_Icon_Rarity_Uncommon.png",
    pingGeneric: "./img/T_UI_Icon_PingGeneric.png",
    itemBag: "./img/T_UI_Icon_Equipment_Equipment_64.png",
    door: "./img/T_UI_Icon_Interact_Door.png",
    window: "./img/Window.png",
    monster: "./img/T_UI_Icon_PM_HungerKill.png",
    profUnknown: "./img/Profession_Unknown.png",
    profConservator: "./img/T_UI_Profession_Conservator.png",
    profNaturalist: "./img/T_UI_Profession_Naturalist.png",
    profScavenger: "./img/T_UI_Profession_Scavenger.png",
    profArtificer: "./img/T_UI_Profession_Artificer.png",
    profCook: "./img/T_UI_Profession_Cook.png",
    profGunsmith: "./img/T_UI_Profession_Gunsmith.png",
    profMetallurgist: "./img/T_UI_Profession_Metallurgist.png",
    profOutfitter: "./img/T_UI_Profession_Outfitter.png",
    profPhysician: "./img/T_UI_Profession_Physician.png",
    sound: "./img/T_UI_Icon_Mic_Transmitting.png",
    caltrops: "./img/Caltrops.png",
    grenade: "./img/T_UI_Item_GrenadeCeramic.png",
    social: "./img/T_UI_Icon_Social.png",
    egg: "./img/T_UI_Item_FreshEgg.png",
    kindling: "./img/KindlingPile.png",
    charcoal: "./img/T_UI_Item_Charcoal.png",
    quest: "./img/T_UI_Icon_TrackerHandIn.png",
    extract: "./img/T_UI_Icon_Extract_64.png",
    stairs: "./img/StairIntegrated.png",
    lantern: "./img/lantern.png",
    padlock: "./img/padlock.png",

    key_bronze: "./img/T_UI_Item_Key_Bronze.png",
    key_silver: "./img/T_UI_Item_Key_Silver.png",
    key_gold: "./img/T_UI_Item_Key_Gold.png",
    key_special: "./img/T_UI_Item_Key_Unique_Silver.png",
};

const placeholders = {};
const loading = {};
const loadedListeners = [];

export function onTextureLoaded(listener) {
    loadedListeners.push(listener);
}

export function loadTexture(key) {
    if (!key || !texturePaths[key]) return Promise.resolve(undefined);
    if (!loading[key]) {
        loading[key] = PIXI.Assets.load(texturePaths[key] + "?v=" + elements.metaVersion).then(loaded => {
            const placeholder = placeholders[key];
            if (placeholder) {
                placeholder.source = loaded.source;
                placeholder.update();
            }
            loadedListeners.forEach(listener => listener(key, placeholder));
            return loaded;
        }).catch(e => {
            console.error(`Failed to load texture '${key}':`, e);
            delete loading[key];
        });
    }
    return loading[key];
}

function getTexture(key) {
    if (!texturePaths[key]) return undefined;
    if (!placeholders[key]) {
        placeholders[key] = new PIXI.Texture({dynamic: true});
        loadTexture(key);
    }
    return placeholders[key];
}

export const textures = new Proxy({}, {
    get: (target, key) => typeof key === "string" ? getTexture(key) : undefined,
});
