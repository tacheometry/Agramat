import capitalizeFirst from "./capitalizeFirst";
import casualSpeech from "./casualSpeech";
import { ALL_CORRECTIONS_REGEX, CORRECTIONS } from "./correctionData";
import insertInString from "./insertInString";
import isUppercase from "./isUppercase";
import removeCharactersFromPosition from "./removeCharactersFromPosition";

const ENDING_PUNCTUATION = [".", "?", "!"];

export interface CorrectionInfo {
	originalText: string;
	correctText: string;
	strikedText: string;
	correctionsMade: number;
}

export default (originalText: string): CorrectionInfo => {
	const originalCasual = casualSpeech(originalText);

	let strikedText = originalText;
	let correctText = originalText;
	let correctionsMade = 0;

	let found;
	while ((found = ALL_CORRECTIONS_REGEX.exec(originalCasual))) {
		const { index } = found;
		const { wrongSequence, previousSymbols, endSymbols } = found.groups!;
		let correctSequence = CORRECTIONS[wrongSequence];
		if (!correctSequence) continue;

		const startIndex = index + previousSymbols.length;
		const wrongEndIndex = startIndex + wrongSequence.length;

		const isAtStartOfSentence =
			previousSymbols === "" ||
			ENDING_PUNCTUATION.some((punctuation) =>
				previousSymbols.includes(punctuation)
			);
		if (isAtStartOfSentence)
			correctSequence = capitalizeFirst(correctSequence);
		const isScreaming = isUppercase(
			originalText.slice(startIndex, wrongEndIndex)
		);
		if (isScreaming) correctSequence = correctSequence.toUpperCase();

		{
			const strikedOffset = strikedText.length - originalText.length;
			strikedText = insertInString(
				strikedText,
				startIndex + strikedOffset,
				"~~"
			);
			strikedText = insertInString(
				strikedText,
				wrongEndIndex + strikedOffset + 2,
				"~~"
			);
		}
		{
			const correctOffset = correctText.length - originalText.length;
			correctText = removeCharactersFromPosition(
				correctText,
				startIndex + correctOffset,
				wrongSequence.length
			);
			correctText = insertInString(
				correctText,
				startIndex + correctOffset,
				correctSequence
			);
		}

		correctionsMade++;
		ALL_CORRECTIONS_REGEX.lastIndex -= endSymbols.length;
	}

	ALL_CORRECTIONS_REGEX.lastIndex = 0;

	return {
		originalText,
		correctText,
		strikedText,
		correctionsMade,
	};
};
