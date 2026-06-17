const ASSET_ROOT = "/assets/spirit-sort";
export const SPIRIT_ASSET_ROOT = `${ASSET_ROOT}/spirits`;
export const SPIRIT_MANIFEST_PATH = `${SPIRIT_ASSET_ROOT}/manifest.json`;

export async function loadSpiritTextureManifest(scene, options) {
  const {
    spiritTypes,
    getTextureKey,
    loadedTypes,
    requestedKeys,
    onLoaded
  } = options;

  let manifest;

  try {
    const response = await fetch(SPIRIT_MANIFEST_PATH, { cache: "no-cache" });
    if (!response.ok) return;
    manifest = await response.json();
  } catch {
    return;
  }

  if (scene.isSceneAlive === false || !manifest?.spirits || typeof manifest.spirits !== "object") return;

  Object.entries(manifest.spirits).forEach(([spiritType, fileName]) => {
    if (!spiritTypes[spiritType] || typeof fileName !== "string" || fileName.trim() === "") return;

    loadSpiritImage(scene, spiritType, `${SPIRIT_ASSET_ROOT}/${fileName}`, {
      getTextureKey,
      loadedTypes,
      requestedKeys,
      onLoaded
    });
  });
}

function loadSpiritImage(scene, spiritType, path, options) {
  const { getTextureKey, loadedTypes, requestedKeys, onLoaded } = options;
  const textureKey = getTextureKey(spiritType);

  if (scene.textures.exists(textureKey)) {
    loadedTypes.add(spiritType);
    onLoaded?.(spiritType);
    return;
  }

  if (requestedKeys.has(textureKey)) return;
  requestedKeys.add(textureKey);

  const image = new Image();
  image.onload = () => {
    if (scene.isSceneAlive === false) return;

    if (!scene.textures.exists(textureKey)) {
      scene.textures.addImage(textureKey, image);
    }

    loadedTypes.add(spiritType);
    onLoaded?.(spiritType);
  };
  image.onerror = () => {
    requestedKeys.delete(textureKey);
  };
  image.src = path;
}
