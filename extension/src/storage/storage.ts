const DB_NAME = "darkWatt-storage" as const;
const DB_VERSION = 1;

export interface LuminanceRecord {
	luminance: number;
	url: string;
	date: string;
}

let _dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
	if (_dbPromise) return _dbPromise;

	_dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
		const request: IDBOpenDBRequest = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);

		request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(DB_NAME)) {
				const store = db.createObjectStore(DB_NAME, { keyPath: "date" });
				store.createIndex("date", "date", { unique: true });
				store.createIndex("url", "url", { unique: false });
			}
		};

		request.onsuccess = () => resolve(request.result);
	});

	return _dbPromise;
}

const QUERIES = {
	getAllLuminanceData: async (): Promise<LuminanceRecord[]> => {
		const db = await openDatabase();
		return new Promise<LuminanceRecord[]>((resolve, reject) => {
			const tx = db.transaction(DB_NAME, "readonly");
			tx.onerror = () => reject(tx.error);

			const store = tx.objectStore(DB_NAME);
			const request = store.getAll();

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result as LuminanceRecord[]);
		});
	},

	getLatestLuminanceData: async (): Promise<LuminanceRecord | null> => {
		const db = await openDatabase();
		return new Promise<LuminanceRecord | null>((resolve, reject) => {
			const tx = db.transaction(DB_NAME, "readonly");
			tx.onerror = () => reject(tx.error);

			const store = tx.objectStore(DB_NAME);
			const request = store.openCursor(null, "prev");

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const cursor = request.result as IDBCursorWithValue | null;
				resolve(cursor ? (cursor.value as LuminanceRecord) : null);
			};
		});
	},

	getLuminanceAverageForDateRange: async (
		startDate: Date,
		endDate: Date,
	): Promise<number> => {
		const db = await openDatabase();
		return new Promise<number>((resolve, reject) => {
			const weekData: LuminanceRecord[] = [];
			const keyRange = IDBKeyRange.bound(
				startDate.toISOString(),
				endDate.toISOString(),
			);

			const tx = db.transaction(DB_NAME, "readonly");
			tx.onerror = () => reject(tx.error);

			const store = tx.objectStore(DB_NAME);

			store.openCursor(keyRange).onsuccess = (event) => {
				const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
				if (cursor) {
					weekData.push(cursor.value as LuminanceRecord);
					cursor.continue();
				} else {
					const averageLuminance =
						weekData.reduce((acc, curr) => acc + curr.luminance, 0) /
						(weekData.length || 1);
					resolve(averageLuminance);
				}
			};
		});
	},

	getLuminanceDataForDate: async (date: Date): Promise<number> => {
		const dayBeginning = new Date(date);
		dayBeginning.setHours(0, 0, 0, 0);
		const dayEnding = new Date(date);
		dayEnding.setHours(23, 59, 59, 999);

		const db = await openDatabase();

		return new Promise<number>((resolve, reject) => {
			const dayData: LuminanceRecord[] = [];
			const keyRange = IDBKeyRange.bound(
				dayBeginning.toISOString(),
				dayEnding.toISOString(),
			);

			const tx = db.transaction(DB_NAME, "readonly");
			tx.onerror = () => reject(tx.error);

			const store = tx.objectStore(DB_NAME);

			store.openCursor(keyRange).onsuccess = (event) => {
				const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
				if (cursor) {
					dayData.push(cursor.value as LuminanceRecord);
					cursor.continue();
				} else {
					const averageLuminance =
						dayData.reduce((acc, curr) => acc + curr.luminance, 0) /
						(dayData.length || 1);
					resolve(averageLuminance);
				}
			};
		});
	},

	getTotalTrackedSites: async (): Promise<number> => {
		const db = await openDatabase();

		return new Promise<number>((resolve, reject) => {
			let totalSites = 0;

			const tx = db.transaction(DB_NAME, "readonly");
			tx.onerror = () => reject(tx.error);

			const store = tx.objectStore(DB_NAME);
			const indexedByUrl = store.index("url");

			indexedByUrl.openCursor(null, "nextunique").onsuccess = (event) => {
				const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
				if (cursor) {
					totalSites++;
					cursor.continue();
				} else {
					resolve(totalSites);
				}
			};
		});
	},
};

const MUTATIONS = {
	saveLuminanceData: async (nits: number, url: string): Promise<void> => {
		const db = await openDatabase();

		const record: LuminanceRecord = {
			luminance: nits,
			url: url,
			date: new Date().toISOString(),
		};

		return new Promise<void>((resolve, reject) => {
			const tx = db.transaction(DB_NAME, "readwrite");

			tx.onerror = () => reject(tx.error);
			tx.oncomplete = () => resolve();

			const store = tx.objectStore(DB_NAME);
			store.add(record);
		});
	},
};

export default { QUERIES, MUTATIONS };
