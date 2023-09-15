export default (verb: string) => {
	verb = verb.toLowerCase();
	if (verb.startsWith("a ")) verb = verb.replace("a ", "");
	return verb.split(" ")[0];
};
