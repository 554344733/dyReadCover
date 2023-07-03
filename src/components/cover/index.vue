<template>
	<div class="cover-box" ref="coverBoxRef" @click="coverClick">
		<template
			v-for="(item, index) in allReadingArr"
			:key="item.chapter + '-' + index"
		>
			<!-- 加载上一章以及loading -->
			<div
				class="page"
				v-if="currentActive(item) || preActive(item) || nextActive(item)"
				:class="[
					{
						active: currentActive(item),
						preActive: preActive(item),
						nextActive: nextActive(item),
					},
				]"
				:style="transformFun(item)"
			>
				<div class="header" :style="headerStyles">
					{{ item.title }}
				</div>
				<div :class="'page-' + index">
					{{ renderCanvas(item, index) }}
					{{ currentActive(item) ? updateCurrentPage(item) : '' }}
				</div>
				<div class="bottom" :style="bottomStyles">
					{{ item.pageNum + 1 }} / {{ item.length }}
				</div>
			</div>
		</template>
	</div>
	<div class="loading" v-if="loading">
		<loadingCom />
	</div>
</template>

<script setup lang="ts">
import loadingCom from '../loading/index.vue';
import { ref, nextTick, watch, Ref, reactive } from 'vue';
import { initCanvas } from '../../utils/handleCanvas';
import {
	emits,
	propsList,
	myConfig,
	headerStyles,
	bottomStyles,
} from './index';
import { throttle } from '../../utils/index';
import { Config, ReadingArr, InitReadInfoFace, bookInfoFace } from '../../type';
import interact from 'interactjs';

const emit = defineEmits(emits);
const props = defineProps(propsList);

const loading = ref(false);

// 默认配置项
let config: Config = reactive(myConfig);

const coverBoxRef = ref<HTMLDivElement | null>(null);

// 存放所有小说信息
const allBookInfo: Ref<Array<bookInfoFace>> = ref([]);
// 存放处理完的章节的canvas
const allReadingArr: Ref<ReadingArr[]> = ref([]);
// 存放当前章节canvas以及阅读信息
// const currentReading: Ref<ReadingArr[]> = ref([]);
// 默认第一章
const currentChapter = ref(0);
// 默认第一页
const currentPage = ref(0);

// 翻页节流
const throttlePrePage = throttle(goToPreviousPage, 300);
const throttleNextPage = throttle(goToNextPage, 300);

// 文字大小等传入配置 发生改变
watch(
	() => props.configProps,
	(newConfig) => {
		allReadingArr.value = [];
		loadNextChapter(currentChapter.value);
		config = { ...config, ...newConfig };
	},
	{ deep: true }
);
// 章节发生改变
// watch(
// 	() => currentChapter.value,
// 	(newChapter) => {
// 		let bookInfo = bookArrFun(newChapter);
// 		console.log();

// 		nextTick(() => {
// 			currentReading.value = initCanvas(bookInfo.text, config)[1];
// 		});
// 	}
// );

// 页码发生改变
watch(
	() => currentPage.value,
	(newPage) => {
		// 读到最后一章 代表要预加载下一页了
		if (newPage === chapterLength(currentChapter.value).length - 1) {
			loadNextChapter(currentChapter.value + 1);
		}
		if (newPage === 0) {
			loadPreChapter(currentChapter.value);
		}
	}
);

// 点击屏幕
function coverClick(e: MouseEvent) {
	let clientX = e.clientX;
	// 小于pre 上一章 大于next 下一章
	let pre = 100;
	let next = config.width - 100;
	let center = config.width / 3;

	if (clientX < pre) {
		throttlePrePage();
	} else if (clientX > next) {
		throttleNextPage();
	} else if (clientX > center && clientX < config.width - center) {
		// 宽度分成 三份 判断点击的是不是中间的一份
		emit('onCenter');
	}
}

// 当前页面显示规则
const currentActive = (item: ReadingArr) => {
	// 页码等于-1代表要 显示上一章的最后一页了
	if (currentPage.value === -1) {
		// 获取上一章 的长度
		let preArr = chapterLength(currentChapter.value - 1);
		currentChapter.value -= 1;
		// 重新给当前正在阅读的页码赋值
		currentPage.value = preArr.length - 1;
	} else if (currentPage.value === chapterLength(currentChapter.value).length) {
		currentChapter.value += 1;
		currentPage.value = 0;
	} else {
		return (
			item.chapter === currentChapter.value &&
			item.pageNum === currentPage.value
		);
	}
};

// 上一页面显示规则
const preActive = (item: ReadingArr) => {
	// 判断页码是第一页吗，是的话，获取上一章章节长度，给上一章最后一页加上标识
	if (currentPage.value === 0) {
		// 获取上一章 的长度
		let preArr = chapterLength(currentChapter.value - 1);
		return (
			item.chapter === currentChapter.value - 1 &&
			item.pageNum === preArr.length - 1
		);
	} else {
		return (
			item.chapter === currentChapter.value &&
			item.pageNum === currentPage.value - 1
		);
	}
};

// 下一页显示规则
const nextActive = (item: ReadingArr) => {
	// 先获取当前章节数组长度
	let currentArr = chapterLength(currentChapter.value);
	// 判断当前正在阅读的页码 是否是当前章节的最后一页 是的话 给下一章第一页给标识
	if (currentPage.value === currentArr.length - 1) {
		return item.chapter === currentChapter.value + 1 && item.pageNum === 0;
	}
	return (
		item.chapter === currentChapter.value &&
		item.pageNum === currentPage.value + 1
	);
};
interface TextFace {
	chapter: number;
	text: string;
	title: string;
}

/**
 * 加载当前章或者 下一章
 * @param chapterNum 当前章节id，或者下一章章节id
 */
function loadNextChapter(chapterNum: number) {
	nextTick(async () => {
		// 判断是当前阅读数组中是否有下一章数据
		let isNextList = chapterLength(chapterNum).length;
		// 判断当前是否是idEnd
		let isEnd = bookArrFun(currentChapter.value)?.isEnd;
		// 没有下一章 并且当前章节 并且不是最后一章（这个最后一章指的是目录 或者说整个小说的最后一章 根据使用者传入的参数isEnd判断）
		if (!isNextList && !isEnd) {
			// 进入这里 代表没有下一章数据
			let bookInfo = bookArrFun(chapterNum) as TextFace;

			// 如果没有下一章数据 那么获取下一章数据
			if (!bookInfo) {
				// 没有下一页数据 可能预加载失败了，所以向父组件获取下一章数据，
				loading.value = true;
				// type 0 代表上一章 type 1 代表下一章
				emit('loadChapter', { chapter: chapterNum, type: 'next' });
				return;
			}

			// 把小说文本处理成canvas数组
			const data = initCanvas(bookInfo.text, config);

			// if (chapterNum === currentChapter.value) {
			// 	currentReading.value = data[1];
			// }

			data[0].forEach((item: ReadingArr, index) => {
				item.chapter = chapterNum; // 章节
				item.length = data[0].length; // 当前章节长度
				item.title = bookInfo.title; // 章节名
				item.pageNum = index; // 当前页码
			});
			if (data[0]) {
				allReadingArr.value = [...allReadingArr.value, ...data[0]];
			}
		}
		let delNum = chapterNum - 2;

		// 删除上上上章的内容
		if (delNum >= 0) {
			// 延迟一下 直接赋值后没有 过渡动画
			setTimeout(() => {
				allReadingArr.value = chapterLength(delNum, false);
			}, 300);
		}
	});
}

// 加载上一章
function loadPreChapter(chapterNum: number) {
	nextTick(async () => {
		let preChapterLength = chapterLength(chapterNum - 1).length;
		// 当前不在第一章 并且上一章没有内容的情况下
		if (chapterNum !== 0 && preChapterLength === 0) {
			let bookInfo = bookArrFun(chapterNum - 1) as TextFace;

			if (!bookInfo) {
				// 没有上一章 问父组件要
				loading.value = true;
				// type 0 代表上一章 type 1 代表下一章
				emit('loadChapter', { chapter: chapterNum, type: 'pre' });
				return;
			}

			const data = initCanvas(bookInfo.text, config)[0];
			// 判断是否有前一页数据

			data.forEach((item: ReadingArr, index) => {
				item.chapter = chapterNum - 1;
				item.length = data.length;
				item.title = bookInfo.title;
				item.pageNum = index;
			});

			// 等过渡动画做完在改变数据 要不pre改变后 过渡动画就会消失
			let delNum = currentChapter.value + 2;

			setTimeout(() => {
				let tempArr = [...data, ...allReadingArr.value];
				// 删除 下下章数据 并把其他的返回

				let newArr = tempArr.filter((item) => item.chapter < delNum);
				allReadingArr.value = newArr;

				if (loading.value) {
					loading.value = false;
					goToPreviousPage();
				}
			}, 300);
		}
	});
}

// 把canvas放到当前指定page下
const renderCanvas = (item: ReadingArr, index: number) => {
	nextTick(() => {
		const page = document.querySelector('.page-' + index) as HTMLDivElement;
		item.canvas && page?.appendChild(item.canvas);
	});
};

// 存放阅读信息
let currPageInfo = {} as ReadingArr;
// 更新当前页面信息 并发送个父组件
const updateCurrentPage = (item: ReadingArr) => {
	if (
		currPageInfo?.chapter === item.chapter &&
		currPageInfo?.pageNum === item.pageNum
	)
		return;
	currPageInfo = item;

	emit('onPageChange', item);
};

// 	上一页
function goToPreviousPage() {
	if (currentPage.value === 0 && bookArrFun(currentChapter.value)?.isStart) {
		emit('onStartChapter');
	} else {
		if (currentPage.value === 0 && !bookArrFun(currentChapter.value - 1)) {
			loading.value = true;
		} else if (
			currentPage.value === 0 &&
			!chapterLength(currentChapter.value - 1).length
		) {
			// 当前是在第一页 并且没有查询到上一章节数据 打开loading
			loading.value = true;
		} else {
			loading.value = false;
			currentPage.value -= 1;
		}
	}
}

// 下一页
function goToNextPage() {
	// 最后一章 最后一页时
	const currLength = chapterLength(currentChapter.value).length - 1;
	const isEnd = bookArrFun(currentChapter.value)?.isEnd;
	const isNext = bookArrFun(currentChapter.value + 1);
	if (
		currentPage.value === currLength &&
		bookArrFun(currentChapter.value)?.isEnd
	) {
		emit('onEndChapter');
	} else {
		// 最后一页并且不是最后一章时 并且没有下一章数据时
		if (currentPage.value === currLength && !isEnd && !isNext) {
			loading.value = true;
		} else {
			currentPage.value += 1;

			// 预加载 下下章
			if (
				currentPage.value === currLength &&
				!bookArrFun(currentChapter.value + 2)
			) {
				emit('preLoadChapter', {
					chapter: currentChapter.value + 2,
					type: 'next',
				});
			}
		}
	}
}

// 设置canvas 的宽高等
function setCanvasInfo() {
	config.width = coverBoxRef.value?.clientWidth as number;
	preX.value = -config.width;
	// // 设置canvas的高度 父盒子高度 - 顶部header栏 - 底部bottom栏 = canvas高度
	config.height = ((coverBoxRef.value?.clientHeight as number) -
		(config.headerHeight + config.bottomHeight)) as number;
}

let preX = ref(-config.width); // 上一页默认位置
let currX = ref(0); // 当前页默认位置
let transitionX = ref('transform 0.3s ease'); // 过渡动画
let boxRightShadow = ref('none');
// 手指拖拽
function drap() {
	const position = { x: 0 };

	interact('.cover-box').draggable({
		// 只做x轴操作
		startAxis: 'x',
		lockAxis: 'x',
		listeners: {
			start() {},
			move(event) {
				// 先把过渡去掉 要不然拖动时也有过渡，会延迟
				transitionX.value = 'none';
				position.x += event.dx;
				if (position.x > 0) {
					preX.value = -config.width + position.x;
					boxRightShadow.value = '4px 0px 4px -3px rgba(0, 0, 0, 0.5)';
				} else {
					currX.value = position.x;
				}
			},
			end(event) {
				// 拖动结束时 给过渡动画
				transitionX.value = 'transform 0.3s ease';
				let endX = event.rect.left;
				if (endX >= 60) {
					// 上一页滑动大于60 操作成功 ，切换上一页
					preX.value = 0;
					goToPreviousPage();
				} else if (endX <= -60) {
					// 下一页操作成功， 切换下一页
					currX.value = -config.width;
					goToNextPage();
				}

				// 此次操作完毕， 重置数据
				preX.value = -config.width;
				currX.value = 0;
				position.x = 0;
				boxRightShadow.value = 'none';
			},
		},
	});
}
// 抽离动态style 设置偏移位置和过渡动画
function transformFun(item: ReadingArr) {
	return [
		currentActive(item)
			? {
					transform: `translateX(${currX.value}px)`,
					transition: transitionX.value,
			  }
			: '',
		preActive(item)
			? {
					transform: `translateX(${preX.value}px)`,
					transition: transitionX.value,
					boxShadow: boxRightShadow.value,
			  }
			: '',
	];
}
// 传入id获取章节数组 或者删除指定id的数据
function chapterLength(
	chapterId: number,
	del: boolean | undefined = undefined
) {
	if (del === false) {
		return allReadingArr.value.filter((item) => item.chapter > chapterId);
	}
	if (del === true) {
		return allReadingArr.value.filter((item) => item.chapter < chapterId);
	}
	return allReadingArr.value.filter((item) => item.chapter === chapterId);
}
// 初始化
function init(initReadInfo: InitReadInfoFace) {
	allBookInfo.value = initReadInfo.contents;
	currentChapter.value = initReadInfo.currentChapter;
	currentPage.value = initReadInfo.currentPage;
	nextTick(() => {
		// 加载当前页面
		loadNextChapter(currentChapter.value);
		if (currentPage.value === 0) {
			loadPreChapter(currentChapter.value);
		}
		// 设置 canvas宽度，高度等
		setCanvasInfo();
		// 手指滑动
		drap();
	});
}
type TypeFace = 'next' | 'pre';
// 预加载，暴露出去的方法 比如读到第二章 最后一页 那么预加载第4章节
function preLoadChapter(bookInfo: bookInfoFace, type: TypeFace) {
	if (type === 'next') {
		allBookInfo.value.push(bookInfo);
	} else if (type === 'pre') {
		allBookInfo.value.unshift(bookInfo);
	}
}
// 传入 chapter 章节 返回相对应的数据
function bookArrFun(chapter: number) {
	return allBookInfo.value.find((item) => item.chapter === chapter);
}

// 加载，暴露此方法 传入对应的章节
function loadChapter(bookInfo: bookInfoFace, type: TypeFace) {
	if (type === 'next') {
		allBookInfo.value.push(bookInfo);
		loadNextChapter(bookInfo.chapter);
	} else if ('pre') {
		allBookInfo.value.unshift(bookInfo);
		loadPreChapter(bookInfo.chapter);
	}

	loading.value = false;
}

// 暴露方法
defineExpose({
	init,
	preLoadChapter,
	loadChapter,
});
</script>

<style scoped>
.cover-box {
	position: relative;
	width: 100%;
	height: 100vh;
	touch-action: none;
}
.page {
	position: absolute;
	width: 100%;
	height: 100vh;
	background-color: wheat;
	display: none;
}

.active {
	z-index: 3;
	display: block;
	box-shadow: 4px 0px 4px -3px rgba(0, 0, 0, 0.5);
}

.preActive {
	z-index: 4;
	display: block;
	box-shadow: 4px 0px 4px -3px rgba(0, 0, 0, 0.5);
}
.nextActive {
	display: block;
}

.header,
.bottom {
	display: flex;
	align-items: center;
	color: #ae9f82;
	font-size: 12px;
}

.loading {
	width: 80px;
	height: 80px;

	position: fixed;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	z-index: 999;

	display: flex;
	justify-content: center;
	align-items: center;

	border-radius: 10px;
	background: rgba(0, 0, 0, 0.8);
}
</style>
