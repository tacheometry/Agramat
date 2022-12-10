export default (str: string, index: number, insertion: string) => {
	return str.substring(0, index) + insertion + str.substring(index);
};
