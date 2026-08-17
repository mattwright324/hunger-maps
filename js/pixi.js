let closeTooltip = () => {};
import('marker').then(m => { closeTooltip = m.closeTooltip; });

export const app = new PIXI.Application();

await app.init({
    preference: "webgl",
    resizeTo: document.getElementById("view-container"),
    backgroundColor: 0x000000,
    antialias: false,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    powerPreference: "low-power",
});

app.ticker.stop();

app.render();

let _renderPending = false;

export function render() {
    if (_renderPending) return;
    _renderPending = true;
    requestAnimationFrame(() => {
        app.render();
        _renderPending = false;
    });
}

document.getElementById("view-container").appendChild(app.canvas);

export const world = new PIXI.Container();

app.stage.addChild(world);

export const mapSquare = new PIXI.Graphics();
mapSquare.rect(0, 0, 4096, 4096);
mapSquare.fill(0x777777);
mapSquare.zIndex = -Infinity;
world.addChildAt(mapSquare, 0);

export const mapSprite = new PIXI.Sprite();
mapSprite._type = "map";
mapSprite.x = 0;
mapSprite.y = 0;
mapSprite.width = 4096;
mapSprite.height = 4096;
mapSprite.zIndex = -99999
world.addChildAt(mapSprite, 1);

fitMapSpriteToCanvas()
render();

export const mapOverlaySprite = new PIXI.Sprite();
mapOverlaySprite._type = "overlay";
mapOverlaySprite.x = 0;
mapOverlaySprite.y = -500;
mapOverlaySprite.width = 4096;
mapOverlaySprite.height = 4596;
mapOverlaySprite.zIndex = -9999
world.addChildAt(mapOverlaySprite, 2);

render();

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
    render();
}

export function clearMarkers() {
    markerSprites().forEach(c => c.destroy());
    render();
}

export function fitMapSpriteToCanvas() {
    const canvasHeight = app.renderer.height;   // internal resolution
    const imageHeight = mapSprite.height;
    const scale = canvasHeight / imageHeight;
    world.scale.set(scale);
    world.x = (app.renderer.width - mapSprite.width * scale) / 2;
    world.y = 0;
    render();
}

function applyMarkerScale(worldScale, multiplier = 1) {
    markerSprites().forEach(sprite => {
        const screenSize = sprite._screenSize || 24;
        const baseScale = (screenSize * multiplier) / sprite.texture.width;
        sprite.scale.set(baseScale / worldScale);
    })
}

export function scaleMarkersToZoom() {
    applyMarkerScale(world.scale.x);
    render();
}

function setupPanZoom() {
    const touches = new Map();
    let lastDistance = null;
    let panAnchor = null;

    app.canvas.addEventListener("pointerdown", e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        touches.set(e.pointerId, {x: e.clientX, y: e.clientY});
        closeTooltip();
        render();

        if (touches.size === 1) {
            const t = touches.values().next().value;
            panAnchor = {x: t.x, y: t.y};
        }

        if (touches.size === 2) {
            lastDistance = null;
            panAnchor = null;
        }
    });

    app.canvas.addEventListener("pointermove", e => {
        if (!touches.has(e.pointerId)) return;

        touches.set(e.pointerId, {x: e.clientX, y: e.clientY});
        render();

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
        if (!touches.has(e.pointerId)) return;
        touches.delete(e.pointerId);
        render();

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
        if (!touches.has(e.pointerId)) return;
        touches.delete(e.pointerId);
        if (touches.size < 2) lastDistance = null;
        if (touches.size === 0) panAnchor = null;
        render();
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

export async function exportRegion({
       x = mapOverlaySprite.x,
       y = mapOverlaySprite.y,
       width = mapOverlaySprite.width,
       height = mapOverlaySprite.height,
       markerScale = 0.5,
       resolution = 1,
       quality = 0.92,
       background = app.renderer.background.color,
       antialias = false,
       filename,
} = {}) {
    if (!(width > 0) || !(height > 0)) {
        throw new Error(`exportRegion: width and height must be positive, got ${width}x${height}`);
    }

    // A single texture holds the whole export, so keep it inside what the GPU allows.
    const gl = app.renderer.gl;
    const maxTextureSize = gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : Infinity;
    const longestSide = Math.max(width, height) * resolution;
    if (longestSide > maxTextureSize) {
        const capped = Math.max(maxTextureSize / Math.max(width, height), 1 / Math.max(width, height));
        console.warn(`exportRegion: ${Math.round(longestSide)}px exceeds the max texture size `
            + `(${maxTextureSize}px), lowering resolution ${resolution} to ${capped}`);
        resolution = capped;
    }

    const frame = new PIXI.Rectangle(x, y, width, height);

    let canvas;
    applyMarkerScale(1, markerScale);
    try {
        canvas = app.renderer.extract.canvas({
            target: world,
            frame,
            resolution,
            antialias,
            // Normalized to an rgba array, a plain 0x000000 would be treated as transparent.
            clearColor: background == null ? [0, 0, 0, 0] : new PIXI.Color(background).toArray(),
        });
    } finally {
        // Put the markers back at whatever the user's zoom needs and repaint the view.
        scaleMarkersToZoom();
    }

    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
            result => result ? resolve(result) : reject(new Error("exportRegion: canvas.toBlob() failed")),
            "image/webp",
            quality
        );
    });

    if (blob.type !== "image/webp") {
        console.warn(`exportRegion: browser encoded ${blob.type} instead of image/webp`);
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = filename || `map-export_${Math.round(x)}-${Math.round(y)}_${Math.round(width)}x${Math.round(height)}.webp`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return blob;
}

window.exportRegion = exportRegion;