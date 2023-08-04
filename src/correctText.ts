import removeCharactersFromPosition from "./removeCharactersFromPosition";
import capitalizeFirst from "./capitalizeFirst";
import casualSpeech from "./casualSpeech";
import {
	ALL_CORRECTIONS_REGEX,
	ALL_CORRECTIONS_CASUAL_KEYS,
	Correction,
	CorrectionKind,
	SENTENCE_ENDING_CHARACTERS,
	PUNCTUATION_CHARACTERS,
} from "./correctionData";
import insertInString from "./insertInString";
import isUppercase from "./isUppercase";
import { underscore } from "discord.js";

export const enum UnsureType {
	UnsureAboutArticle = "*Nu pot determina corectura care se potrivește cel mai bine în acest context.",
	RareWordUsage = "*Există și o corectură alternativă pentru această secvență, dar nu este la fel de uzuală.",
}

export interface WholeMessageCorrectionInfo {
	originalText: string;
	correctText: string;
	strikedText: string;
	correctionsMade: {
		correctionSource: Correction;
		correctedWith: string[];
		unsure?: UnsureType;
	}[];
}

export default (originalText: string): WholeMessageCorrectionInfo => {
	const originalCasual = casualSpeech(originalText);

	let finalStrikedText = originalText;
	let finalCorrectedText = originalText;
	let finalCorrectionsMade: WholeMessageCorrectionInfo["correctionsMade"] =
		[];

	let found;
	while ((found = ALL_CORRECTIONS_REGEX.exec(originalCasual))) {
		const { index } = found;
		const {
			wrongSequence: wrongSequenceCasual,
			previousSymbols,
			endSymbols,
		} = found.groups!;
		let correctionObj = ALL_CORRECTIONS_CASUAL_KEYS[wrongSequenceCasual];
		if (!correctionObj) continue;

		const startIndex = index + previousSymbols.length;
		const wrongEndIndex = startIndex + wrongSequenceCasual.length;

		const wrongSequenceInOriginalText = originalText.slice(
			startIndex,
			wrongEndIndex
		);

		const isAtStartOfSentence =
			previousSymbols === "" ||
			SENTENCE_ENDING_CHARACTERS.some((punctuation) =>
				previousSymbols.includes(punctuation)
			);
		const isScreaming = isUppercase(wrongSequenceInOriginalText);

		const strikedOffset = finalStrikedText.length - originalText.length;
		finalStrikedText = insertInString(
			finalStrikedText,
			startIndex + strikedOffset,
			"~~"
		);
		finalStrikedText = insertInString(
			finalStrikedText,
			wrongEndIndex + strikedOffset + 2,
			"~~"
		);
		const correctionOffset =
			finalCorrectedText.length - originalText.length;

		let unsure: UnsureType | undefined;
		let applicableCorrections = [...correctionObj.correctForms];
		switch (correctionObj.correctionKind) {
			case CorrectionKind.SubstantivFeminin: {
				let isCertainlyIndefiniteArticle: boolean | undefined;

				// Detect " o <wrongSequence>", "(o <wrongSequence>", "-o <wrongSequence>" etc
				if (
					originalCasual[startIndex - 1] === " " &&
					originalCasual[startIndex - 2] === "o" &&
					(originalCasual[startIndex - 3] === undefined ||
						PUNCTUATION_CHARACTERS.includes(
							originalCasual[startIndex - 3]
						) || originalCasual[startIndex - 3] === "-")
				)
					isCertainlyIndefiniteArticle = true;
				if (wrongSequenceInOriginalText.toLowerCase().endsWith("ă"))
					isCertainlyIndefiniteArticle = true;

				let wordRoot = applicableCorrections[0]!;
				wordRoot = wordRoot.slice(0, wordRoot.length - 1);
				let indefiniteVersion = wordRoot + "ă";
				let definiteVersion = wordRoot + "a";

				if (isCertainlyIndefiniteArticle)
					applicableCorrections = [indefiniteVersion];
				else {
					applicableCorrections = [
						definiteVersion,
						indefiniteVersion,
					];
					unsure = UnsureType.UnsureAboutArticle;
				}

				break;
			}
			case CorrectionKind.RareAlternative: {
				unsure = UnsureType.RareWordUsage;

				break;
			}
		}

		ALL_CORRECTIONS_REGEX.lastIndex -= endSymbols.length;

		if (
			applicableCorrections.includes(
				wrongSequenceInOriginalText.toLowerCase()
			)
		)
			continue;

		const replaceWrongSequenceWithThis = applicableCorrections
			.map((seq) => {
				if (isAtStartOfSentence) return capitalizeFirst(seq);
				if (isScreaming) return seq.toUpperCase();
				return seq;
			})
			.map(underscore)[0];
		// .join("/");

		finalCorrectedText = removeCharactersFromPosition(
			finalCorrectedText,
			startIndex + correctionOffset,
			wrongSequenceCasual.length
		);
		finalCorrectedText = insertInString(
			finalCorrectedText,
			startIndex + correctionOffset,
			replaceWrongSequenceWithThis
		);

		finalCorrectionsMade.push({
			correctionSource: correctionObj,
			correctedWith: applicableCorrections,
			unsure: unsure,
		});
	}

	ALL_CORRECTIONS_REGEX.lastIndex = 0;

	return {
		originalText,
		correctText: finalCorrectedText,
		strikedText: finalStrikedText,
		correctionsMade: finalCorrectionsMade,
	};
};
