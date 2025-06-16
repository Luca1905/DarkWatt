import initWasmModule, { hello_wasm } from './wasm/wasm_mod.js';

(async () => {
    await initWasmModule();
    hello_wasm();
})();
