# Solar Forecast

Solar forecast dashboard (GHI, sunshine duration, UV index, temperature),
built with [Dinghy](https://dinghy.dev) as a Docusaurus site and published to
GitHub Pages at [solar-forecast.dinghy.dev](https://solar-forecast.dinghy.dev).

**Thanks to [Open-Meteo.com](https://open-meteo.com) for the high quality weather data (CC-BY 4.0).**

## File/Folder Structure

1. configuration
   1. `.dinghyrc` - Pins the Dinghy engine version
   1. `dinghy.config.yml` - Dinghy site configuration
   1. `.github/workflows/deploy.yml` - GitHub Actions based continuous deployment
1. source code
   1. `src` - Main source directory for the site
      1. `pages` - Site pages (home page and User Guide)
      1. `components` - React components
      1. `api` - Handles data fetching from Open-Meteo
      1. `utils` - Formatting and Chart.js loading helpers
      1. `css/custom.css` - Custom CSS applied to every Docusaurus page
   1. `static` - Folder for static assets, copied directly to the published site
      (includes the `CNAME` file for the custom domain)

## Local Preview

Site commands reference: https://dinghy.dev/references/commands/engine/site

```bash
# Install Dinghy Cli
curl -fsSL https://get.dinghy.dev/install.sh | sh

# Clone repo
git clone https://github.com/dinghydev/solar-forecast.git
cd solar-forecast

# Start site
dinghy site start
```

## CI/CD

The [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) workflow
automatically publishes updates to GitHub Pages whenever changes are pushed to
the `main` branch.

## Custom Domain

This site is served at `https://solar-forecast.dinghy.dev` via GitHub Pages.
