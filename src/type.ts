export interface Config {
	width: number;
	height: number;
	paddingLeft: number;
	paddingRight: number;
	fontSize: number;
	lineHeight: number;
	fontColor: string;
	headerHeight: number;
	bottomHeight: number;
}
export interface ReadingArr {
	title?: string;
	pageNum: number;
	length?: number;
	chapter: number;
	canvas?: HTMLCanvasElement;
}

export interface ChapterArr {
	end: number;
	text: string;
}

export interface InitReadInfoFace {
	contents: any[];
	currentChapter: number;
	currentPage: number;
	isStart?: boolean;
	isEnd?: boolean;
}

export interface bookInfoFace {
	chapter: number;
	isEnd?: boolean;
	isStart?: boolean;
	text: string;
	title: string;
}
