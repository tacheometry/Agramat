import * as dotenv from "dotenv";
dotenv.config();

import {
	ActionRowBuilder,
	ActivityType,
	ButtonBuilder,
	ButtonStyle,
	Client,
	EmbedBuilder,
	Events,
	GatewayIntentBits,
} from "discord.js";
import normalizeVerb from "./normalizeVerb";
import { CONJUGATION_CACHE, fetchConjugare } from "./conjugareScraper";
import makeVerbMessage from "./makeVerbMessage";
import correctText, { CorrectionInfo } from "./correctText";
import casualSpeech from "./casualSpeech";

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

enum INTERACTION_CUSTOM_ID {
	CORRECTION_ACKNOWLEDGE = "correction_acknowledge",
}

const CORRECTION_CACHE: Record<string, CorrectionInfo> = {};

client.once(Events.ClientReady, (c) => {
	console.log(`Ready! Logged in as ${c.user.tag}`);

	c.user.setActivity({
		name: "„vroiam”",
		type: ActivityType.Listening,
	});
});

client.on(Events.MessageCreate, (message) => {
	if (message.author.bot) return;

	const { content } = message;
	const casualContent = casualSpeech(content);

	let correctionInfo = CORRECTION_CACHE[casualContent];
	if (!correctionInfo) {
		correctionInfo = correctText(content);
		CORRECTION_CACHE[casualContent] = correctionInfo;
	}
	if (correctionInfo.correctionsMade === 0) return;

	const row = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(
				INTERACTION_CUSTOM_ID.CORRECTION_ACKNOWLEDGE +
					"_" +
					message.author.id
			)
			.setLabel("Am înțeles")
			.setStyle(ButtonStyle.Primary)
	);

	message.reply({
		content: `Psst🗯️Am găsit ${
			correctionInfo.correctionsMade === 1
				? "o greșeală"
				: "mai multe greșeli"
		} în textul tău! Vezi dacă am dreptate:`,
		embeds: [
			new EmbedBuilder()
				.addFields(
					{
						name: "Greșit",
						value: correctionInfo.strikedText,
					},
					{
						name: "Corect",
						value: correctionInfo.correctText,
					}
				)
				.setColor("Random"),
		],
		components: [row as never],
	});
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (interaction.isButton()) {
		if (
			interaction.customId.startsWith(
				INTERACTION_CUSTOM_ID.CORRECTION_ACKNOWLEDGE
			)
		) {
			if (!interaction.customId.endsWith(`_${interaction.user.id}`)) {
				interaction.reply({
					ephemeral: true,
					content:
						"Nu poți ascunde asta deoarece nu-ți este direcționat ție.",
				});
				return;
			}
			interaction.reply({
				ephemeral: true,
				content: "Sper că te-am informat. 🙂",
			});
			interaction.message.delete();
		}
	}

	if (interaction.isCommand()) {
		switch (interaction.commandName) {
			case "conjugare": {
				let verb = interaction.options.get("verb", true)
					.value as string;
				verb = normalizeVerb(verb);

				let info = CONJUGATION_CACHE[verb];
				let deferred = false;
				if (info === undefined) {
					await interaction.deferReply();
					deferred = true;
					await fetchConjugare(verb).catch((e) => {
						interaction.editReply({
							content: "Am dat de o eroare! Încearcă mai târziu.",
						});
						console.log(e);
					});
					info = CONJUGATION_CACHE[verb];
					if (info === undefined) return;
				}

				const message = makeVerbMessage(verb, info);
				if (deferred) message.ephemeral = false;
				if (deferred) interaction.editReply(message);
				else interaction.reply(message);
				break;
			}
		}
	}
});

client.login(process.env.DISCORD_TOKEN as string);
