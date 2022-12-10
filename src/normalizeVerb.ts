export default (verb: string) => {
	if (verb.startsWith("a ")) verb = verb.replace("a ", "");
	return verb.split(" ")[0].toLowerCase();
};
