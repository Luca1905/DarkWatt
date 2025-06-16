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
