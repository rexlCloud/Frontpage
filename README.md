# rexlcloud.de

The website of rexlCloud: start page, download, installation and developer guides, web panel tour, FAQ and the
Javadoc of every API. English at `/`, German at `/de/`.

Built with [Astro](https://astro.build) and Tailwind CSS as a static site, served by nginx.

## Develop

Needs Node.js 22.22 or newer.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # into dist/
```

Every build first runs `scripts/fetch-cloud.mjs`: it reads the newest release from
`repo.rexlcloud.de`, writes `src/generated/cloud.json` (version, download links) and unpacks the Javadoc of
`module-api`, `bukkit-api`, `proxy-api` and `minestom-api` into `public/api/<artifact>/`. Without a connection the
last fetched data is used (with `FETCH_STRICT=1`, as in Docker and CI, the build fails instead).

## Where things are

| What | Where |
| --- | --- |
| Links, e-mail, Discord invite | `src/site.ts` |
| Texts of all pages (English, German) | `src/i18n/en.ts`, `src/i18n/de.ts` |
| Guides (Markdown, `{version}` becomes the newest version) | `src/content/docs/<en\|de>/` |
| Page layouts | `src/views/`; `src/pages/` only routes them per language |
| Impressum and Datenschutz | `src/views/Legal.astro` (fill in the `[PLATZHALTER: ...]`) |
| Panel screenshots | `src/assets/screenshots/` |
| Colours and components | `src/styles/global.css` |

A new guide needs a file in both `en/` and `de/` with the same name and `title`, `description`, `group`
(`start`, `operate`, `develop`) and `order` in its front matter.

## Deployment

A push to `main` builds the site in GitHub Actions and redeploys it on the server with Docker Compose
(`docker-compose.yml` + `docker-compose.proxy.yml` behind nginx-proxy with Let's Encrypt). The deploy key may only
run `/usr/local/bin/deploy-rexlcloud-frontpage` there. Every rexlCloud release triggers the same deploy, so the
version, the downloads and the Javadoc are always current.
