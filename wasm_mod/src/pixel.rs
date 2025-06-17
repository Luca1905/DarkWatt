pub(crate) struct Rgba {
    pub(crate) r: u8,
    pub(crate) g: u8,
    pub(crate) b: u8,
    pub(crate) a: u8,
}

impl Rgba {
    pub(crate) fn from_slice(chunk: &[u8]) -> Self {
        debug_assert!(chunk.len() == 4, "Pixel slice must be 4 bytes long (RGBA)");
        Self {
            r: chunk[0],
            g: chunk[1],
            b: chunk[2],
            a: chunk[3],
        }
    }

    pub(crate) fn normalized(&self) -> (f32, f32, f32, f32) {
        (
            self.r as f32 / 255.0,
            self.g as f32 / 255.0,
            self.b as f32 / 255.0,
            self.a as f32 / 255.0,
        )
    }
}
