const ASSET_ROOT = `${import.meta.env.BASE_URL}assets/spirit-sort`;
export const SPIRIT_ASSET_ROOT = `${ASSET_ROOT}/spirits`;
export const SPIRIT_MANIFEST_PATH = `${SPIRIT_ASSET_ROOT}/manifest.json`;

export function getSpiritTextureKey(spiritType) {
  return `spirit-sort-${spiritType}`;
}

export async function fetchSpiritManifestEntries(spiritTypes) {
  let manifest;

  try {
    const response = await fetch(SPIRIT_MANIFEST_PATH, { cache: "no-cache" });
    if (!response.ok) return [];
    manifest = await response.json();
  } catch {
    return [];
  }

  if (!manifest?.spirits || typeof manifest.spirits !== "object") return [];

  return Object.entries(manifest.spirits)
    .filter(([spiritType, fileName]) => {
      return hasSpiritType(spiritTypes, spiritType) && typeof fileName === "string" && fileName.trim() !== "";
    })
    .map(([spiritType, fileName]) => ({
      spiritType,
      fileName,
      textureKey: getSpiritTextureKey(spiritType),
      path: `${SPIRIT_ASSET_ROOT}/${fileName}`
    }));
}

export async function preloadSpiritManifestTextures(scene, spiritTypes) {
  const entries = await fetchSpiritManifestEntries(spiritTypes);
  const missingEntries = entries.filter((entry) => !scene.textures.exists(entry.textureKey));

  if (missingEntries.length === 0) {
    return entries;
  }

  return new Promise((resolve) => {
    const handleLoadError = (file) => {
      if (file?.key) {
        scene.textures.remove(file.key);
      }
    };

    scene.load.on("loaderror", handleLoadError);
    scene.load.once("complete", () => {
      scene.load.off("loaderror", handleLoadError);
      resolve(entries);
    });

    missingEntries.forEach((entry) => {
      scene.load.image(entry.textureKey, entry.path);
    });
    scene.load.start();
  });
}

function hasSpiritType(spiritTypes, spiritType) {
  if (spiritTypes instanceof Set) return spiritTypes.has(spiritType);
  if (Array.isArray(spiritTypes)) return spiritTypes.includes(spiritType);
  return Boolean(spiritTypes?.[spiritType]);
}
