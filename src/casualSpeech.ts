import latinize from "latinize";

export default (text: string) => {
	return latinize(text).toLowerCase();
};
