import { Ref, ref } from 'vue';
import { Config, ReadingArr, ChapterArr } from '../type';

/**
 * 设置canvas的大小 分辨率 文字大小 等
 * @param canvas 传入 canvas dom
 * @returns  返回 ctx
 */

export function getCanvasContext(canvas: HTMLCanvasElement, config: Config) {
	const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
	// 获取设备的像素比例
	const pixelRatio = window.devicePixelRatio;
	// 设置 Canvas 的实际大小和分辨率
	canvas.style.width = config.width + 'px';
	canvas.style.height = config.height + 'px';
	canvas.width *= pixelRatio;
	canvas.height *= pixelRatio;
	ctx.font = `${config.fontSize}px Arial`;
	ctx.fillStyle = config.fontColor;
	// 缩放 Canvas 上下文以适应实际大小
	ctx.scale(pixelRatio, pixelRatio);
	return ctx;
}

/**
 *
 * @param text 传入 小说文本
 * @param config 传入 config配置项
 * @returns  [canvas数组, 所有处理后的数据数组]
 */

export function initCanvas(text: string, config: Config) {
	const allChapter: Ref<any[]> = ref([]); // 全部数据
	let chapterArr = [] as ChapterArr[]; // 当前页的所有段落数组
	let pageNumber = 0; // 第几页
	let endNum = 0; // 每个段落最后一个字符在文案中的索引位置
	let textLength = 0;

	function addChapterToAll(chapter: any) {
		if (pageNumber === 0) {
			chapter.startNum = 1;
		} else {
			chapter.startNum = allChapter.value[pageNumber - 1].endNum + 1;
		}
		allChapter.value.push(chapter);
	}

	function fillText(
		line: number,
		residueText: string,
		ctx: CanvasRenderingContext2D,
		config: Config
	) {
		const top = line * (config.fontSize + config.lineHeight); // 离顶部距离 可以做小说行高
		// 当top值大于目标值时，代表当前页已经渲染完毕，准备处理下一页了
		if (top >= config.height) {
			// 需要保存的相关信息
			const chapter = {
				page: pageNumber + 1,
				textArr: JSON.parse(JSON.stringify(chapterArr)),
				endNum: endNum,
			};
			addChapterToAll(chapter); // 增加startNum
			pageNumber++; // 页码加一
			chapterArr = []; // 当前页数据已经存入，清除，方便下一页数据存放
			createCanvas(residueText, config); // 调用方法 创建canvas
			return;
		}

		let txt = '';

		const textArr = residueText.split('');

		for (let i = 0; i < textArr.length; i++) {
			const item = textArr[i];

			if (
				ctx.measureText(txt).width >=
				config.width -
					(config.paddingLeft + (config.paddingRight + config.fontSize))
			) {
				endNum += i;
				chapterArr.push({
					end: endNum,
					text: txt,
				});
				const residue = residueText.slice(i);
				line++;
				fillText(line, residue, ctx, config);
				break;
			} else {
				txt += item;
				ctx.clearRect(
					config.paddingLeft,
					top - 15,
					ctx.measureText(txt).width,
					config.fontSize + config.lineHeight
				);
				ctx.fillText(txt, config.paddingLeft, top);

				if (item === '。') {
					endNum += i + 1;
					chapterArr.push({ end: endNum, text: txt });
					const residue = residueText.slice(i + 1);
					line++;
					fillText(line, residue, ctx, config);
					break;
				}
			}

			if (i === textArr.length - 1) {
				const chapter = {
					page: pageNumber + 1,
					textArr: JSON.parse(JSON.stringify(chapterArr)),
					endNum: textLength,
				};
				addChapterToAll(chapter);
			}
		}
	}

	const canvasArr: Ref<ReadingArr[]> = ref([]);
	function createCanvas(residueText: string, config: Config) {
		const canvas = document.createElement('canvas');
		const readingArr = { canvas } as ReadingArr;
		canvasArr.value.push(readingArr);
		canvas.width = config.width;
		canvas.height = config.height;

		const ctx = getCanvasContext(canvas, config);

		fillText(1, residueText, ctx, config);

		return [canvasArr.value, allChapter.value];
	}
	return createCanvas(text, config);
}
