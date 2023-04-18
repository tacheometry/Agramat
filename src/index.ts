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
	Partials,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} from "discord.js";
import normalizeVerb from "./normalizeVerb";
import {
	CONJUGATION_CACHE,
	fetchConjugation,
} from "./scrapers/conjugationScraper";
import makeVerbMessage from "./makeVerbMessage";
import correctText, {
	UnsureType,
	WholeMessageCorrectionInfo,
} from "./correctText";
import romanianEnumeration from "./romanianEnumeration";
import Keyv from "keyv";

const notificationPreferenceDb = new Keyv(process.env.DB_URL, {
	namespace: "notification_preference",
});

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.MessageContent,
	],
	partials: [Partials.Channel],
});

enum INTERACTION_CUSTOM_ID {
	CORRECTION_ACKNOWLEDGE = "correction_acknowledge",
	NOTIFICATION_PREFERENCES = "notification_preferences",
}

enum NOTIFICATION_PREFERENCE {
	IN_DM = "dm",
	IN_CHANNEL = "channel",
	NEVER = "never",
}
const DEFAULT_NOTIFICATION_PREFERENCE = NOTIFICATION_PREFERENCE.IN_DM;

let cachedMessageCorrection: (content: string) => WholeMessageCorrectionInfo;
{
	const CORRECTION_TTL = 30 * 60 * 1000; // Delete from correction cache after 30 min (can actually be up to double the duration sometimes)
	const correctionCache = new Map<string, WholeMessageCorrectionInfo>();
	const correctionsShouldBeClearedAt = new Map<string, number>();

	cachedMessageCorrection = (content: string) => {
		correctionsShouldBeClearedAt.set(content, Date.now() + CORRECTION_TTL);
		if (correctionCache.has(content)) return correctionCache.get(content)!;

		const correctionInfo = correctText(content);
		correctionCache.set(content, correctionInfo);

		const correctionCheckFunction = () => {
			const clearAt = correctionsShouldBeClearedAt.get(content);
			if (!clearAt) return;
			if (clearAt > Date.now()) {
				setTimeout(correctionCheckFunction, CORRECTION_TTL);
				return;
			}
			correctionCache.delete(content);
			correctionsShouldBeClearedAt.delete(content);
		};
		setTimeout(correctionCheckFunction, CORRECTION_TTL);

		return correctionInfo;
	};
}

client.once(Events.ClientReady, (c) => {
	console.log(`Ready! Logged in as ${c.user.tag}`);

	c.user.setActivity({
		name: "„vroiam”",
		type: ActivityType.Listening,
	});
});

client.on(Events.MessageCreate, async (message) => {
	if (message.author.bot) return;

	const authorNotificationPreference =
		(await notificationPreferenceDb.get(message.author.id)) ??
		DEFAULT_NOTIFICATION_PREFERENCE;
	if (authorNotificationPreference === NOTIFICATION_PREFERENCE.NEVER) return;

	const { content } = message;

	let correctionInfo = cachedMessageCorrection(content);
	if (correctionInfo.correctionsMade.length === 0) return;

	const justOneCorrection = correctionInfo.correctionsMade.length === 1;

	const row = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(
				INTERACTION_CUSTOM_ID.CORRECTION_ACKNOWLEDGE +
					"_" +
					message.author.id
			)
			.setLabel("Am înțeles")
			.setEmoji("✅")
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId(INTERACTION_CUSTOM_ID.NOTIFICATION_PREFERENCES)
			.setLabel("Notificări")
			.setEmoji("⚙️")
			.setStyle(ButtonStyle.Secondary)
	);

	const embed = new EmbedBuilder()
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
		.setColor("Random");

	const includeUnsureWarnings = new Set<UnsureType>();
	let correctionsChangesList: Record<string, number> = {};
	correctionInfo.correctionsMade.forEach((c) => {
		if (c.unsure) includeUnsureWarnings.add(c.unsure);

		const text = `${c.correctionSource.wrongForm} ➔ ${romanianEnumeration(
			c.correctedWith
		)}${c.unsure ? "*" : ""}`;
		correctionsChangesList[text] ??= 0;
		correctionsChangesList[text]!++;
	});

	if (content.length > 40 || includeUnsureWarnings.size > 0)
		embed.addFields({
			name: justOneCorrection ? "Corectură" : "Corecturi",
			value: Object.entries(correctionsChangesList)
				.map(([k, v]) => {
					if (v === 1) return k;
					else return `${k} (x${v})`;
				})
				.join("\n"),
		});

	if (includeUnsureWarnings.size > 0)
		embed.setFooter({
			text: [...includeUnsureWarnings.values()].join("\n"),
		});

	let replyContent = "Psst🗯️Am găsit ";
	replyContent += justOneCorrection ? "o greșeală" : "mai multe greșeli";
	replyContent += " în mesajul tău";
	if (
		authorNotificationPreference === NOTIFICATION_PREFERENCE.IN_DM &&
		message.channel.id !== message.author.dmChannel?.id
	)
		replyContent += ` (${message.url})`;
	replyContent += "! Vezi dacă am dreptate:";

	const replyData = {
		content: replyContent,
		embeds: [embed],
		components: [row as never],
	};

	if (authorNotificationPreference === NOTIFICATION_PREFERENCE.IN_CHANNEL)
		message.reply(replyData);
	// Catching in case the user has DMs off
	else message.author.send(replyData).catch(() => {});
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

	if (
		(interaction.isCommand() &&
			interaction.commandName === "configurare") ||
		(interaction.isButton() &&
			interaction.customId ===
				INTERACTION_CUSTOM_ID.NOTIFICATION_PREFERENCES)
	) {
		const currentPreference =
			(await notificationPreferenceDb.get(interaction.user.id)) ??
			DEFAULT_NOTIFICATION_PREFERENCE;

		const row = new ActionRowBuilder().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId(INTERACTION_CUSTOM_ID.NOTIFICATION_PREFERENCES)
				.addOptions(
					new StringSelectMenuOptionBuilder()
						.setLabel("În mesajele directe")
						.setDescription(
							"Te voi notifica prin mesaje private (DM)."
						)
						.setValue(NOTIFICATION_PREFERENCE.IN_DM)
						.setDefault(
							currentPreference === NOTIFICATION_PREFERENCE.IN_DM
						),
					new StringSelectMenuOptionBuilder()
						.setLabel("În același canal")
						.setDescription(
							"Te voi notifica în același canal în care ai trimis mesajul."
						)
						.setValue(NOTIFICATION_PREFERENCE.IN_CHANNEL)
						.setDefault(
							currentPreference ===
								NOTIFICATION_PREFERENCE.IN_CHANNEL
						),
					new StringSelectMenuOptionBuilder()
						.setLabel("Deloc")
						.setDescription("Nu te voi notifica niciodată.")
						.setValue(NOTIFICATION_PREFERENCE.NEVER)
						.setDefault(
							currentPreference === NOTIFICATION_PREFERENCE.NEVER
						)
				)
		);

		interaction.reply({
			ephemeral: true,
			content:
				"Alege cum vrei să te notific dacă găsesc o greșeală în mesajele tale:",
			components: [row as never],
		});
		return;
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

	if (interaction.isStringSelectMenu()) {
		if (
			interaction.customId ===
			INTERACTION_CUSTOM_ID.NOTIFICATION_PREFERENCES
		) {
			const newPreference = interaction.values[0];

			await notificationPreferenceDb.set(
				interaction.user.id,
				newPreference
			);

			interaction.reply({
				ephemeral: true,
				content: "Ți-am salvat preferințele.",
			});
		}
	}
});

client.login(process.env.DISCORD_TOKEN as string);
