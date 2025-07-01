## --release or --dev - exclude/include debug info
## --no-typescript - disable .d.ts files output
## --out-dir - where to write the compiled files
## --out-name - force output file names
## --target - always use "web"!
## See https://rustwasm.github.io/wasm-pack/book/commands/build.html
echo Building wasm module...
wasm-pack build wasm_mod --dev --no-typescript --out-dir "../extension/src/wasm" --out-name "wasm_mod" --target web

## wasm-pack creates bunch of useless files:
echo Removing trash files...
rm -f extension/src/wasm/.gitignore
rm -f extension/src/wasm/package.json

## create chrome package
cd extension/ && \
bun run build && \
cd ../

echo Chrome package: build/

