#[derive(Copy, Clone)]
pub struct LumaCoefficients {
    pub r: f32,
    pub g: f32,
    pub b: f32,
}

pub const BT_709: LumaCoefficients = LumaCoefficients {
    r: 0.2126,
    g: 0.7152,
    b: 0.0722,
};

pub const L_MAX: f32 = 250.0; // Later expose setting to change screen brightness

/// Inverse BT.709 / sRGB opto-electronic transfer function (OETF)
///
/// Turn encoded E′ (0–1) into a linear-light value Y (0–1):
///
/// Y = E′ / 12.92                           , if E′ ≤ 0.04045  
/// Y = ((E′ + 0.055) / 1.055) ^ 2.4         , otherwise
pub mod oetf_inv {
    pub const CUTOFF: f32 = 0.040_45;
    pub const SLOPE: f32 = 12.92;
    pub const ALPHA: f32 = 0.055;
    pub const SCALE: f32 = 1.055;
    pub const GAMMA: f32 = 2.4;
}
pub const DOWNSCALE_SIZE: u32 = 16;

pub const PIXEL_COMPONENTS: usize = 4;

pub const EFFICACY_LCD_LM_PER_W: f32 = 90.0;

pub const EFFICACY_OLED_LM_PER_W: f32 = 25.0;
