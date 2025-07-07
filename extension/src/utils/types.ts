export type Nullable<T> = T extends Array<infer U>
  ? Array<Nullable<U>>
  : T extends object
    ? { [K in keyof T]: Nullable<T[K]> }
    : T | null;
