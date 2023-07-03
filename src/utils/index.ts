type ThrottleFunction = (...args: any[]) => void;

// 节流函数
export function throttle(
	func: ThrottleFunction,
	delay: number
): ThrottleFunction {
	let timeoutId: ReturnType<typeof setTimeout> | null;
	let lastExecTime = 0;

	return function (...args: any[]) {
		const currentTime = Date.now();

		function execute(this: any) {
			func.apply(this, args);
			lastExecTime = currentTime;
		}

		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		if (currentTime - lastExecTime > delay) {
			execute();
		} else {
			timeoutId = setTimeout(execute, delay);
		}
	};
}
