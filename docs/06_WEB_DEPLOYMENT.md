# Spirit Shelf Sort Web Deployment

## GitHub Pages

The public web build is deployed through GitHub Actions to:

```txt
https://mamduh5.github.io/sort-game/
```

In the GitHub repository, set:

```txt
Settings -> Pages -> Source -> GitHub Actions
```

The workflow is:

```txt
.github/workflows/deploy-pages.yml
```

It installs dependencies with `npm ci`, runs `npm test`, runs `npm run build`, uploads `dist`, and deploys using the official GitHub Pages actions.

## Vite Base Path

`vite.config.js` uses:

```js
base: process.env.GITHUB_ACTIONS ? "/sort-game/" : "/"
```

Local development keeps `/` as the base path. GitHub Actions production builds use `/sort-game/`.

## Local Testing

Use:

```sh
npm install
npm run dev
npm test
npm run build
```

For a production-style local check:

```sh
npm run build
npm exec vite preview
```

## Asset Path Notes

Runtime public assets should resolve through Vite's base URL. The spirit asset loader builds paths from `import.meta.env.BASE_URL`, so the manifest resolves locally at:

```txt
/assets/spirit-sort/spirits/manifest.json
```

and on GitHub Pages at:

```txt
/sort-game/assets/spirit-sort/spirits/manifest.json
```

The spirit manifest should list only PNG files that exist. Empty or partial manifests intentionally fall back to code-drawn placeholder spirits.

## Post-Deploy Check

After deployment, verify:

- title screen loads
- Continue works
- Level Select loads
- gameplay starts
- real spirit PNGs load
- empty or partial manifest fallback still works
- localStorage progress persists after refresh
- mute state persists
- refreshing the page does not break the app

## Android

Android, Gradle, Capacitor, Cordova, or TWA packaging is intentionally not part of this web release pass. Android packaging is planned later after the web build is stable.
