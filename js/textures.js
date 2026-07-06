const texturePaths = {
    mapSarlat: "./map01.webp",
    mapJacques: "./map02.webp",
    mapSombre: "./map03.webp",

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
    sound: "./img/T_UI_Icon_Mic_Transmitting.png",
    grenade: "./img/T_UI_Item_GrenadeCeramic.png",
    social: "./img/T_UI_Icon_Social.png",
    egg: "./img/T_UI_Item_FreshEgg.png",
    quest: "./img/T_UI_Icon_TrackerHandIn.png",
    extract: "./img/T_UI_Icon_Extract_64.png",
};

const loadedTextures = await Promise.all(
    Object.entries(texturePaths).map(async ([key, path]) => {
        return [key, await PIXI.Assets.load(path)];
    })
);

export const textures = Object.fromEntries(loadedTextures);