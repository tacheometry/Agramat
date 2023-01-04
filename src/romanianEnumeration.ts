export default (elements: string[]) => {
	elements = [...elements];
	const last = elements.pop();

	if (!last) return "";
	if (elements.length === 0) return last;
	else if (elements.length === 1) return `${elements[0]} sau ${last}`;
	else return `${elements.join(", ")}, sau ${last}`;
};
