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
import {
	CONJUGATION_CACHE,
	fetchConjugation,
} from "./scrapers/conjugationScraper";
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
					await fetchConjugation(verb).catch((e) => {
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
			case "despre": {
				interaction.reply({
					ephemeral: true,
					embeds: [
						new EmbedBuilder()
							.setTitle(
								"Corectez greșeli comune de ortografie din limba română!"
							)
							.setDescription(
								"Totuși, **nu** sunt un spellchecker generalizat. **Caut să corectez numai secvențele care sunt greșite 100% din timp**, și care nu sunt neintenționate.\n\nDe exemplu, `vroiam` și `genoflexiune` sunt aproape mereu scrise în acest fel din cauza obișnuinței autorilor care nu cunosc forma de dicționar a cuvintelor – acest lucru ar trebui corectat.\n\nPrin urmare, o secvență cum ar fi `buna zriua` nu ar trebui corectată, deoarece este evident o greșeală din cauza tastaturii. Nici diacriticele sau punctuația nu ar trebui adăugate atunci când forma de bază a secvențelor este corectă ([video](https://youtu.be/fS4X1JfX6_Q)).\n\nÎn plus, o secvență cum ar fi `lam` are forma corectă `l-am`, dar ar trebui acceptată și forma `l am`, având încredere că autorii cunosc că scrierea corectă este cu cratimă.\n\nToate corecturile sunt introduse manual. Astfel, inerent, **pot să corectez numai secvențe greșite frecvente, introduse de voluntari**, și nu voi putea detecta fiecare greșeală.\n\nDacă vezi că am corectat greșit, sau dacă vrei să adaugi o secvență, am codul [pe GitHub](https://github.com/tacheometry/Agramat) unde poți contribui printr-un Issue sau Pull Request!"
							)
							.setFooter({
								text: "*Acest lucru ar putea fi realizat cu un grad de succes ridicat prin implementarea unui analizator de limbaj natural, dar realizarea acestei metodologii ar lua multă muncă și accesul la multe date relevante",
							})
							.setColor("Random"),
					],
				});

				break;
			}
		}
	}
});

client.login(process.env.DISCORD_TOKEN as string);
