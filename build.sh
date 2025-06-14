## --release or --dev - exclude/include debug info
## --no-typescript - disable .d.ts files output
## --out-dir - where to write the compiled files
## --out-name - force output file names
## --target - always use "web"!
## See https://rustwasm.github.io/wasm-pack/book/commands/build.html
echo Building wasm module...
wasm-pack build wasm_mod --dev --no-typescript --out-dir "../extension/js/wasm" --out-name "wasm_mod" --target web

## wasm-pack creates bunch of useless files:
echo Removing trash files...
rm -f extension/js/wasm/.gitignore
rm -f extension/js/wasm/package.json

## create chrome package
rm -rf build/chrome/ && \
mkdir -p build/chrome/ && \
cp -r extension/ build/chrome/ && \
mv build/chrome/manifest_cr.json build/chrome/manifest.json && \
echo Chrome package: build/chrome/

## create firefox package
rm -rf build/firefox/ && \
mkdir -p build/firefox/ && \
cp -r extension/ build/firefox/ && \
mv build/firefox/manifest_ff.json build/firefox/manifest.json && \
echo firefox package: build/firefox/
