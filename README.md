# misode.github.io
Data Pack Generators and Guides for Minecraft Java Edition

https://misode.github.io/

## Contributing
This project uses [Preact](https://preactjs.com/) and [Vite](https://vitejs.dev/).
1. Make sure you have [node](https://nodejs.org/), npm, and [git](https://git-scm.com/) installed.
2. Clone the repository.
3. Start the dev server.
```
npm run dev
```
4. Open the browser in `localhost:3000`.

## Guides
Do you want to contribute a [guide](https://misode.github.io/guides/)?
1. Add a markdown file in `src/guides/`. It's name will be used in the url.
2. The beginning of the file contains the metadata of the guide, check the other guides for the format.
3. Start the dev server with `npm run dev`.
4. If everything is setup, saving the markdown file will update the guide in the browser.
5. To support multiple versions, wrap parts of the guide like this:
```
{#[1.18] this text will only show when 1.18 is selected #}
The selected version is {#version#}, and the pack format is {#pack_format#}
```

## Translating
misode.github.io supports multiple languages. If you'd like to help us translate this project to your language, it would be really appreciated! If your language is not on this list, please create an issue for it.

[![Localization status](https://l10n.spgoding.com/widgets/minecraft-schemas/-/multi-auto.svg)](https://l10n.spgoding.com/engage/minecraft-schemas/?utm_source=widget)

1. Go to the [localization website](https://l10n.spgoding.com) (hosted by [SPGoding](https://github.com/SPGoding)).
2. [Register](https://l10n.spgoding.com/accounts/register) by linking your GitHub account (recommended), or using your email.
    - Note that the username and email will be shown in the [repository](https://github.com/misode/misode.github.io)'s git commit log.
3. See the components of misode.github.io [here](https://l10n.spgoding.com/projects/minecraft-schemas/).
4. Start translating!
