export default (str: string, index: number, amount: number) => {
	return str.substring(0, index) + str.substring(index + amount);
};
