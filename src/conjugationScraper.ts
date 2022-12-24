import normalizeVerb from "./normalizeVerb";
import axios from "axios";
import { Element, load } from "cheerio";
import capitalizeFirst from "./capitalizeFirst";

export type ConjugationInfo = [string, string[]][];

export const CONJUGATION_CACHE: Record<string, ConjugationInfo | null> = {};

export const fetchConjugation = async (verb: string) => {
	verb = normalizeVerb(verb);

	const { data: html } = await axios.get(
		`https://www.conjugare.ro/romana.php?conjugare=${verb}`
	);
	const $ = load(html);

	const conjugationNotFound = $("h1")
		.text()
		.includes("Verbul nu a fost găsit.");
	if (conjugationNotFound) {
		CONJUGATION_CACHE[verb] = null;
		return;
	}

	const conjBoxes: Element[] = [];
	$("div.box_conj").each((i, elem) => {
		if (i < 16) conjBoxes.push(elem);
	});
	const data: ConjugationInfo = [];
	conjBoxes.forEach((box) => {
		const italicSelector = $(box.children).find("i");

		const italicEntries: string[] = [];
		italicSelector.each((i, italic) => {
			let text = $(italic).text();
			text = `*${text}*`;
			italicEntries.push(text);
		});
		italicSelector.remove();

		const otherEntries: string[] = $(box)
			.text()
			.replaceAll("\t", "")
			.split("\n")
			.filter((t) => t !== "")
			.map((x, i) => {
				x = x.trim();
				if (italicEntries[i - 1] !== undefined) x = `**${x}**`;
				return x;
			});

		const conjugationType = capitalizeFirst(
			otherEntries.shift()!.toLowerCase()
		).replace("perfectul", "perfect");

		const finalEntries = otherEntries.map(
			(conjugatedEntry, i) =>
				`${italicEntries[i] ?? ""} ${conjugatedEntry}`
		);

		data.push([conjugationType, finalEntries]);
	});

	CONJUGATION_CACHE[verb] = data;
};
