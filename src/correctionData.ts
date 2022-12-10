import casualSpeech from "./casualSpeech";
import { parse as csvParse } from "csv-parse";
import { createReadStream } from "fs";

export const CORRECTIONS: Record<string, string> = {};

createReadStream("PhraseCorrections.csv")
	.pipe(
		csvParse({
			skipEmptyLines: true,
			groupColumnsByName: true,
			columns: true,
		})
	)
	.on("data", (row: { wrong_form: string; correct_form: string }) => {
		CORRECTIONS[casualSpeech(row.wrong_form)] = row.correct_form;
	})
	.once("end", () => {
		console.log("Done reading data.");
		ALL_CORRECTIONS_REGEX = new RegExp(
			`(?<previousSymbols>^|[.?,;!:()"'„” ]+)(?<wrongSequence>` +
				Object.keys(CORRECTIONS)
					.map((x) => casualSpeech(x))
					.join("|") +
				`)(?<endSymbols>$|[.?,;!:()"'„” ]+)`,
			"gum"
		);
	});

export let ALL_CORRECTIONS_REGEX!: RegExp;
