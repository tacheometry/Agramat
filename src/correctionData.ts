import casualSpeech from "./casualSpeech";
import { parse as csvParse } from "csv-parse";
import { createReadStream } from "fs";

export const PUNCTUATION_CHARACTERS = `.?,;!:()"'„” \n`.split("");
export const SENTENCE_ENDING_CHARACTERS = "?!".split("");

export const enum CorrectionKind {
	Default = "?",
	SubstantivFeminin = "SF",
	RareAlternative = "R",
}
export interface Correction {
	wrongForm: string;
	wrongFormCasual: string;
	correctForms: string[];
	correctFormsCasual: string[];
	correctionKind: CorrectionKind;
}
export const ALL_CORRECTIONS: Record<string, Correction> = {};
export const ALL_CORRECTIONS_CASUAL_KEYS: Record<string, Correction> = {};

createReadStream("PhraseCorrections.csv")
	.pipe(
		csvParse({
			skipEmptyLines: true,
			groupColumnsByName: true,
			columns: true,
			relaxColumnCountLess: true,
		})
	)
	.on(
		"data",
		(input: {
			wrong_form: string;
			correct_forms: string;
			correction_kind?: CorrectionKind;
		}) => {
			const correctionObj: Correction = {
				wrongForm: input.wrong_form,
				wrongFormCasual: casualSpeech(input.wrong_form),
				correctForms: input.correct_forms.split(";"),
				correctFormsCasual: input.correct_forms
					.split(";")
					.map(casualSpeech),
				correctionKind: input.correction_kind ?? CorrectionKind.Default,
			};
			if (
				correctionObj.correctionKind ===
				CorrectionKind.SubstantivFeminin
			) {
				if (!correctionObj.wrongFormCasual.endsWith("a"))
					return console.warn(
						`wrong_form with the kind of SF need to end with 'a' or 'ă'! "${correctionObj.wrongForm}" has been skipped.`
					);
				if (correctionObj.correctForms.length !== 1)
					return console.warn(
						`wrong_form with the kind of SF need to have only one correction! ${correctionObj.wrongForm} has been skipped.`
					);
			}
			ALL_CORRECTIONS[correctionObj.wrongForm] = correctionObj;
			ALL_CORRECTIONS_CASUAL_KEYS[correctionObj.wrongFormCasual] =
				correctionObj;
		}
	)
	.once("end", () => {
		console.log("Done reading data.");
		ALL_CORRECTIONS_REGEX = new RegExp(
			`(?<previousSymbols>^|[${PUNCTUATION_CHARACTERS.join()}]+)(?<wrongSequence>` +
				Object.keys(ALL_CORRECTIONS_CASUAL_KEYS).join("|") +
				`)(?<endSymbols>$|[${PUNCTUATION_CHARACTERS.join()}]+)`,
			"gum"
		);
	});

export let ALL_CORRECTIONS_REGEX!: RegExp;
