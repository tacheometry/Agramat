const COMMAND_DEFINITIONS = [
	new SlashCommandBuilder()
		.setName("conjugare")
		.setDescription("Vezi conjugarea unui verb.")
		.addStringOption((option) =>
			option
				.setName("verb")
				.setDescription("Verbul de conjugat.")
				.setRequired(true)
				.setMinLength(2)
				.setMaxLength(10)
		),
];

import * as dotenv from "dotenv";
dotenv.config();

import { REST, Routes, SlashCommandBuilder } from "discord.js";

const rest = new REST({ version: "10" }).setToken(
	process.env.DISCORD_TOKEN as string
);

const jsonCommands = COMMAND_DEFINITIONS.map((v) => v.toJSON());

console.log("Deploying...");
rest.put(
	Routes.applicationGuildCommands(
		process.env.APP_ID as string,
		process.env.TEST_GUILD as string
	),
	{
		body: [],
	}
);
rest.put(Routes.applicationCommands(process.env.APP_ID as string), {
	body: jsonCommands,
});
