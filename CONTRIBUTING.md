# Development

## Setting up

### Installing dependencies:

```sh
npm i
```

### Setting tokens

Create an `.env` file after the template in [`.env.template`](.env.template) and add Discord tokens and other values accordingly.

## Making changes

Make sure the TypeScript compiler is running. Run `npm run build` before testing each change, or have `npm run watch` running in the background.

### Adding new phrases

Modify the [`PhraseCorrections.csv`](PhraseCorrections.csv) file, and alphabetize each section you change after finishing. I recommend [Alphabetical Sorter](https://marketplace.visualstudio.com/items?itemName=ue.alphabetical-sorter) if using VSCode.

## Running

```sh
npm run start
```

or

```sh
nodemon
```
