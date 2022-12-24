import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	InteractionReplyOptions,
} from "discord.js";
import { ConjugationInfo } from "./conjugationScraper";

export default (
	verb: string,
	info: ConjugationInfo | null
): InteractionReplyOptions => {
	if (!info)
		return {
			ephemeral: true,
			content: "Nu am putut să găsesc conjugarea acestui verb.",
		};

	const firstEmbed = new EmbedBuilder().setColor("Random");
	const secondEmbed = new EmbedBuilder().setColor("Random");
	info.forEach(([fieldName, fieldValues], i) => {
		if (i < 5 && fieldValues[0] !== "-")
			firstEmbed.addFields({
				name: fieldName,
				value: fieldValues.join("\n"),
				inline: true,
			});
		if (i >= 5)
			secondEmbed.addFields({
				name: fieldName,
				value: fieldValues.join("\n"),
				inline: true,
			});
	});

	return {
		content: `Conjugarea verbului *a ${
			info
				.find(([fieldName]) => fieldName === "Infinitiv")?.[1]?.[0]
				?.trim() ?? verb
		}*:`,
		embeds: [firstEmbed, secondEmbed],
		components: [
			new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setLabel("dexonline")
					.setStyle(ButtonStyle.Link)
					.setURL(`https://dexonline.ro/definitie/${verb}/paradigma`),
				new ButtonBuilder()
					.setLabel("Conjugare.ro")
					.setStyle(ButtonStyle.Link)
					.setURL(
						`https://www.conjugare.ro/romana.php?conjugare=${verb}`
					),
				new ButtonBuilder()
					.setLabel("Wikționar")
					.setStyle(ButtonStyle.Link)
					.setURL(`https://ro.wiktionary.org/wiki/${verb}#Verb`)
			) as never,
		],
	};
};
