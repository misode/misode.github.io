[# misode.github.io
> Data Pack Generators for Minecraft Java Edition

https://misode.github.io/

Fr.json corriged
](https://misode.github.io/

## Contributing
This project uses [Preact](https://preactjs.com/) and [Vite](https://vitejs.dev/).
1. Make sure you have [node](https://nodejs.org/), npm, and [git](https://git-scm.com/) installed.
2. Clone the repository.
3. Start the dev server.
```
npm run dev
```
4. Open the browser in `localhost:3000`.

## Translating
misode.github.io supports multiple languages. If you'd like to help us translate this project to your language, it would be really appreciated! If your language is not on this list, please create an issue for it.

[![Localization status](https://weblate.spyglassmc.com/widgets/misode-github-io/-/multi-auto.svg)](https://weblate.spyglassmc.com/engage/misode-github-io/?utm_source=widget)

1. Go to the [Spyglassmc localization website](https://weblate.spyglassmc.com/projects/) (hosted by [SPGoding](https://github.com/SPGoding)).
2. [Register](https://l10n.spgoding.com/accounts/register) by linking your GitHub account (recommended), or using your email.
    - Note that the username and email will be shown in the [repository](https://github.com/misode/misode.github.io)'s git commit log.
3. See the components of misode.github.io [here](https://weblate.spyglassmc.com/projects/misode-github-io/web-app/).
4. Start translating!

## Modded Generators
This website contains a few [non-vanilla generators](https://misode.github.io/predicate/). It is possible to contribute additional generators. If instead you are interested in making custom generators but don't want them part of the main website, see the [forking section](#forking) below.

1. Create a new file `public/mcdoc/<your_project>.mcdoc`. This will contain the definitions of the
2. Create a new generator entry in the `src/app/config.json` file for each generator page that you want to add. Set its `dependency` field to the name of the mcdoc file you created.
3. Add translation key for each generator in `src/locales/en.json`, named `generator.<id>`, and a translation key named `partner.<dependency>`.
4. The final step will be to write the generator definitions in the mcdoc file. Apart from the [technical specification](https://spyglassmc.com/user/mcdoc/), there is no documentation for the mcdoc format. It is a custom language describing JSON and NBT structures in the game. I recommend taking a look at how the other modded generators have their types. You can also look at the [vanilla mcdoc definitions](https://github.com/SpyglassMC/vanilla-mcdoc).
5. Feel free to open a PR even when you are not ready with the types, or if you want help with writing them.

## Forking
You are allowed to fork this repository and use its base as a way to publish your own generator site, but I ask to make a few changes before publishing.

1. Change links to this repo to your own repo. This can be done at the top of `Utils.ts` by changing `export const SOURCE_REPO_URL = ...`.
2. Remove or replace the Google Analytics tracking code in the root `index.html` file. To avoid breaking the rest of the website, you can replace everything between the `<!-- Global site tag (gtag.js) - Google Analytics -->` markers with this:
```html
<script>
    function gtag() {}
</script>
```
3. Disable the ads, first by remove two lines in `index.html`:
```html
<script async src="https://media.ethicalads.io/media/client/ethicalads.min.js"></script>
...
<div data-ea-publisher="misode-github-io" data-ea-manual="true" id="ad-placeholder"></div>
```
4. Secondly, you can remove the ad component, for example by returning `<></>` in `Ad.tsx`, or by removing the `{!gen.tags?.includes('partners') && <Ad id="data-pack-generator" type="text" />}` line in `SchemaGenerator.tsx`.
5. Remove the contributors and giscus comment section on the homepage. You can do this easily by removing `<Contributors />` and `<Giscus />` in `Home.tsx`.
6. Make some other changes to the home page. This will depend on what you need, but you might want to remove stuff like `<WhatsNew />` and/or `<Tools />`.
7. Edit the `Footer.tsx` component. You can remove the donation link, but I would appreciate if you still kept a note that your fork is based on my work, for example by linking to my github profile or this repository.
8. Change some of the translations in `src/locales/en.json`. Particularly you might want to change the `title.home` key.)
