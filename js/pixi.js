
export const app = new PIXI.Application();

await app.init({
    preference: "webgl",
    resizeTo: document.getElementById("view-container"),
    backgroundColor: 0x000000,
    antialias: true
});

document.getElementById("view-container").appendChild(app.canvas);

export const world = new PIXI.Container();

app.stage.addChild(world);

export const mapSprite = new PIXI.Sprite();
mapSprite._type = "map";
mapSprite.x = 0;
mapSprite.y = 0;
mapSprite.width = 4096;
mapSprite.height = 4096;
mapSprite.zIndex = -Infinity
world.addChildAt(mapSprite, 0);

export const mapOverlaySprite = new PIXI.Sprite();
mapOverlaySprite._type = "overlay";
mapOverlaySprite.x = 0;
mapOverlaySprite.y = -500;
mapOverlaySprite.width = 4096;
mapOverlaySprite.height = 4596;
mapOverlaySprite.zIndex = -9999
world.addChildAt(mapOverlaySprite, 1);

export function markerSprites() {
    return world.children.flatMap(e => e.children).filter(c => c._type === "marker");
}

export function sortSprites() {
    world.children.filter(c => c._type === "marker").sort((a, b) => {
        const aIsNotGrey = a.tint !== 0x808080;
        const bIsNotGrey = b.tint !== 0x808080;

        return a.visible - b.visible ||
            aIsNotGrey - bIsNotGrey ||
            a.zIndex - b.zIndex ||
            a.z - b.z
    });
}

export function clearMarkers() {
    markerSprites().forEach(c => c.destroy());
}

export function fitMapSpriteToCanvas() {
    const canvasHeight = app.renderer.height;   // internal resolution
    const imageHeight = mapSprite.height;
    const scale = canvasHeight / imageHeight;
    world.scale.set(scale);
    world.x = (app.renderer.width - mapSprite.width * scale) / 2;
    world.y = 0;
}

export function scaleMarkersToZoom() {
    markerSprites().forEach(sprite => {
        const screenSize = sprite._screenSize || 24;
        const inverseWorldScale = 1 / world.scale.x;
        const baseScale = screenSize / sprite.texture.width;
        sprite.scale.set(baseScale * inverseWorldScale);
    })
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

                scaleMarkersToZoom();
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

        scaleMarkersToZoom();
    }, {passive: false});
}
setupPanZoom();