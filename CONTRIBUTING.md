# How to develop/contribute

## Adding new corrections

Modify the [`PhraseCorrections.csv`](PhraseCorrections.csv) file, and alphabetize after finishing. I recommend [Alphabetical Sorter](https://marketplace.visualstudio.com/items?itemName=ue.alphabetical-sorter) if using VSCode.

The first column is a wrong sequence (e.g. "vroiam"), the second column represents the correction(s) ("voiam"). The third column is optional, and represents the [correction kind](#correction-kind).

The `correct_sequences` are separated with `;` characters. If the sequence matches a correct phrase exactly, it won't be corrected. Otherwise, if there is room for error in a correction, the alternative(s) will be presented.

### Correction kind

-   `?`: this is default if omitted - detections are made in lower case, with diacritics stripped, and no special handling
-   `R`: for cases where there are two plausible corrections, but one of them is rare

    -   "caș" should not be corrected
    -   "cas" should be corrected to "că-s", which is the most common variation, but a warning will be shown in case the user meant "caș"

    Example:

    ```csv
    cas,că-s;caș,R
    ```

-   `SF`: special handling for substantiv feminin (cazul nominativ/acuzativ, singular)

    -   "statuietă" should be corrected to "statuetă"
    -   "o statuieta" should be corrected to "o statuetă"
    -   "statuieta", without an immediate indefinite article, should be corrected to "statuetă", but the alternative "statueta" should be presented

    ```csv
    statuietă,statuetă,SF
    ```

## Running the bot locally

### Setting up

#### Installing dependencies

```sh
npm i
```

#### Compiling the code

```sh
npm run build # Compile once
```

```sh
npm run watch # Compile every time there's a change to the code
```

#### Setting tokens

Create an `.env` file after the template in [`.env.template`](.env.template) and add Discord tokens and other values accordingly.

#### Registering slash commands

Every time the slash command definitions in [registerCommands.ts](src/registerCommands.ts) are changed, the following command must be run:

```sh
npm run register
```

Make sure the source is compiled before doing so.

### Running

```sh
npm run start
```

or

```sh
nodemon # Restart the bot when code changes
```
