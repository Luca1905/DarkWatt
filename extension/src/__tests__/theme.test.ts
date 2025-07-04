import { afterEach, describe, expect, it } from "bun:test";
import { detectPageTheme } from "../utils/theme";

type Style = Partial<Record<keyof CSSStyleDeclaration | string, string>>;

const g = globalThis as unknown as {
	document?: unknown;
	getComputedStyle: (el: Element) => CSSStyleDeclaration;
};

function createStubElement(opts: {
	classNames?: string[];
	attributes?: Record<string, string>;
	style?: Style;
}): Element {
	const { classNames = [], attributes = {}, style = {} } = opts;

	const classSet = new Set(classNames);
	const classList = {
		contains: (cls: string) => classSet.has(cls),
	} as unknown as DOMTokenList;

	const attrMap = new Map(Object.entries(attributes));

	const el = {
		classList,
		getAttribute: (name: string) => attrMap.get(name) ?? null,
	} as unknown as Element;

	styleMap.set(el, style);

	return el;
}

const styleMap = new WeakMap<Element, Style>();

g.getComputedStyle = (el: Element) => {
	const style = styleMap.get(el) ?? {};
	return {
		...(style as Record<string, string>),
		getPropertyValue: (prop: string) =>
			(style as Record<string, string>)[prop] ?? "",
	} as unknown as CSSStyleDeclaration;
};

describe("detectPageTheme", () => {
	afterEach(() => {
		g.document = undefined;
	});

	it("detects dark by class", () => {
		const body = createStubElement({ classNames: ["dark"] });
		g.document = {
			body,
			documentElement: createStubElement({}),
			querySelector: () => null,
		} as unknown;

		expect(detectPageTheme()).toBe("dark");
	});

	it("detects dark by data attribute", () => {
		const html = createStubElement({ attributes: { "data-theme": "dark" } });
		g.document = {
			body: createStubElement({}),
			documentElement: html,
			querySelector: () => null,
		} as unknown;

		expect(detectPageTheme()).toBe("dark");
	});

	it("detects dark via meta color-scheme", () => {
		const metaEl = { getAttribute: () => "dark" } as unknown as HTMLMetaElement;
		const querySelector = (sel: string) =>
			sel.includes("meta") ? metaEl : null;
		const doc = {
			body: createStubElement({}),
			documentElement: createStubElement({}),
			querySelector,
		};
		g.document = doc as unknown;

		expect(detectPageTheme()).toBe("dark");
	});

	it("detects dark by background luminance", () => {
		const body = createStubElement({
			style: { backgroundColor: "rgb(0,0,0)" },
		});
		g.document = {
			body,
			documentElement: createStubElement({}),
			querySelector: () => null,
		} as unknown;

		expect(detectPageTheme()).toBe("dark");
	});

	it("falls back to light", () => {
		const body = createStubElement({
			style: { backgroundColor: "rgb(255,255,255)" },
		});
		g.document = {
			body,
			documentElement: createStubElement({}),
			querySelector: () => null,
		} as unknown;

		expect(detectPageTheme()).toBe("light");
	});

	it("does not treat mixed color-scheme meta as dark", () => {
		const metaEl = {
			getAttribute: () => "dark light",
		} as unknown as HTMLMetaElement;
		const querySelector = (sel: string) =>
			sel.includes("meta") ? metaEl : null;
		const doc = {
			body: createStubElement({
				style: { backgroundColor: "rgb(255,255,255)" },
			}),
			documentElement: createStubElement({}),
			querySelector,
		};
		g.document = doc as unknown;

		expect(detectPageTheme()).toBe("light");
	});
});
