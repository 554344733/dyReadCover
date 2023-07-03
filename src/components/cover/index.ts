export const emits = [
	'onCenter',
	'preLoadChapter',
	'onPageChange',
	'loadChapter',
	'onStartChapter',
	'onEndChapter',
];

export const propsList = {
	configProps: {
		type: Object,
		default: {},
	},
};

export const myConfig = {
	width: 0, // 会在mouted时自动赋值
	height: 0, // 会在mouted时自动赋值
	paddingLeft: 20,
	paddingRight: 20,
	fontSize: 16,
	lineHeight: 16,
	fontColor: '#5c4931',
	headerHeight: 30,
	bottomHeight: 40,
	...propsList.configProps,
};

export const headerStyles = {
	height: `${myConfig.headerHeight}px`,
	padding: `0 ${myConfig.paddingLeft}px`,
};

export const bottomStyles = {
	height: `${myConfig.bottomHeight}px`,
	padding: `0 ${myConfig.paddingLeft}px`,
};
