export type Nullable<T> = T extends Array<infer U>
	? Array<Nullable<U>> | null
	: T extends object
		? { [K in keyof T]: Nullable<T[K]> } | null
		: T | null;
