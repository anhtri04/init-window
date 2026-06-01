# Release Guide

This project releases Windows installer builds through GitHub Actions.

## Versioning

Use semantic versioning (`MAJOR.MINOR.PATCH`). The app version is stored in:

- `package.json`
- `package-lock.json`

## Create a release

1. Make sure `main` is clean and up to date.
2. Bump the version:

   ```bash
   npm version patch
   # or: npm version minor
   # or: npm version major
   ```

   This updates `package.json` and `package-lock.json`, creates a commit, and creates a tag like `v1.0.6`.

3. Push the release commit and tag:

   ```bash
   git push origin main --follow-tags
   ```

4. GitHub Actions will run `.github/workflows/release.yml`, build the app on Windows, and create a GitHub Release with the installer artifacts from `release/`.

## Manual release

You can also run the **Release** workflow manually from the GitHub Actions tab.

Recommended input:

- `tag`: an existing tag such as `v1.0.6`
- `prerelease`: `true` only for alpha/beta/rc releases

## Local verification

Before tagging, verify the production build locally:

```bash
npm ci
npx tsc --noEmit
npm run dist
```

The Windows installer output is written to `release/`.

## Release artifacts

The workflow uploads common Electron Builder Windows outputs, including:

- `*.exe`
- `*.msi`
- `*.blockmap`
- `latest.yml`

## Notes

- The workflow requires the default `GITHUB_TOKEN` with `contents: write` permission.
- Releases are triggered by tags matching `v*.*.*`.
- Do not commit generated `dist/` or `release/` artifacts unless intentionally required by the project.
