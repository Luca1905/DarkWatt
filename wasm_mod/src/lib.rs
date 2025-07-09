mod utils;
use wasm_bindgen::prelude::*;
use web_sys::console;

mod constants;
use constants::{
    oetf_inv as inv, BT_709 as W, DOWNSCALE_SIZE,
    EFFICACY_LCD_LM_PER_W, EFFICACY_OLED_LM_PER_W, L_MAX,
};

mod pixel;
use pixel::Rgba;

use data_url::DataUrl;
use image::{imageops::FilterType, DynamicImage};

use crate::{pixel::DisplayTech, utils::inch_to_meter, utils::set_panic_hook};

#[wasm_bindgen]
pub fn hello_wasm() {
    set_panic_hook();
    log("[WASM] LOADING COMPLETE");
}

pub fn average_luma_relative(pixels: &[u8]) -> f32 {
    debug_assert!(pixels.len() % constants::PIXEL_COMPONENTS == 0);

    let mut sum_luma = 0.0_f32;
    let mut sum_weight = 0.0_f32;

    for chunk in pixels.chunks_exact(4) {
        let pixel = Rgba::from_slice(chunk);
        let (rf, gf, bf, af) = pixel.normalized();

        let y: f32 = W.r.mul_add(rf, W.g.mul_add(gf, W.b * bf));

        sum_luma += y * af;
        sum_weight += af;
    }

    if sum_weight > 0.0 {
        sum_luma / sum_weight
    } else {
        0.0
    }
}

// Ey is the approxiamte y coordinate of the color space
// See: https://en.wikipedia.org/wiki/Rec._709#The_Y'C'BC'R_color_space
pub fn average_luma_in_nits(pixels: &[u8]) -> f32 {
    let ey: f32 = average_luma_relative(pixels);

    let y_linear: f32 = if ey <= inv::CUTOFF {
        ey / inv::SLOPE
    } else {
        ((ey + inv::ALPHA) / inv::SCALE).powf(inv::GAMMA)
    };

    y_linear * L_MAX
}

#[wasm_bindgen]
pub fn average_luma_in_nits_from_data_uri(uri: &str) -> f32 {
    match process_data_uri(uri) {
        Ok(nits) => nits,
        Err(err) => {
            log(&format!("[WASM] failed to process data URI: {}", err));
            0.0
        }
    }
}

fn process_data_uri(uri: &str) -> Result<f32, String> {
    let pixels = pixels_from_data_uri(uri)?;
    Ok(average_luma_in_nits(&pixels))
}

fn pixels_from_data_uri(uri: &str) -> Result<Vec<u8>, String> {
    let bytes = decode_data_uri(uri)?;
    let img = image::load_from_memory(&bytes).map_err(|e| format!("image decode error: {}", e))?;
    Ok(downscale_to_size(&img, DOWNSCALE_SIZE))
}

fn decode_data_uri(uri: &str) -> Result<Vec<u8>, String> {
    let data_url = DataUrl::process(uri).map_err(|e| format!("invalid data URI: {}", e))?;

    let (bytes, _fragment) = data_url
        .decode_to_vec()
        .map_err(|e| format!("base64 decode error: {}", e))?;
    Ok(bytes)
}

fn downscale_to_size(img: &DynamicImage, size: u32) -> Vec<u8> {
    let resized: DynamicImage = img.resize_exact(size, size, FilterType::Triangle);
    resized.to_rgba8().into_raw()
}

#[wasm_bindgen]
pub fn estimate_saved_energy_wh_from_data_uri(
    display_width: u32,   // inches
    display_height: u32,  // inches
    hours: f32,
    tech: DisplayTech,
    uri: &str,
) -> f32 {
    let w_m = inch_to_meter(display_width as f32);
    let h_m = inch_to_meter(display_height as f32);
    let area = w_m * h_m;

    // white-theme luminance – screenshot luminance
    let delta_nits = estimate_saved_nits_from_data_uri(uri);
    // ΔΦ (lm) = π · ΔL (cd/m²) · A (m²): https://en.wikipedia.org/wiki/Lumen_(unit)
    let delta_lm = std::f32::consts::PI * delta_nits * area;
    let efficacy = match tech {
        DisplayTech::LCD => EFFICACY_LCD_LM_PER_W,
        DisplayTech::OLED => EFFICACY_OLED_LM_PER_W,
    };
    let power_saved_w = delta_lm / efficacy;
    power_saved_w * hours
}

fn estimate_saved_nits_from_data_uri(uri: &str) -> f32 {
    match pixels_from_data_uri(uri) {
        Ok(pixels) => {
            let luma_img = average_luma_in_nits(&pixels);
            // one white RGBA pixel
            let luma_white = average_luma_in_nits(&[255u8, 255, 255, 255]);
            (luma_white - luma_img).max(0.0)
        }
        Err(err) => {
            log(&format!("[WASM] pixel load error: {}", err));
            0.0
        }
    }
}

// Tests

#[cfg(test)]
mod tests {
    use super::*;

    const EPS: f32 = 1e-2;

    fn solid_rgba(r: u8, g: u8, b: u8, a: u8, count: usize) -> Vec<u8> {
        let mut v = Vec::with_capacity(4 * count);
        for _ in 0..count {
            v.extend_from_slice(&[r, g, b, a]);
        }
        v
    }

    #[test]
    fn black_is_zero() {
        let data = solid_rgba(0, 0, 0, 255, 16);
        let y = average_luma_relative(&data).abs();
        assert!(y < EPS, "calculated luminance: {}, expected: {}", y, 0);
    }

    #[test]
    fn white_is_255() {
        let data = solid_rgba(255, 255, 255, 255, 16);
        let y = average_luma_relative(&data).abs();
        assert!(
            1.0 - y < EPS,
            "calculated luminance: {}, expected: {}",
            y,
            1
        );
    }

    #[test]
    fn mid_grey_is_half() {
        let data = solid_rgba(128, 128, 128, 128, 16);
        let y = average_luma_relative(&data).abs();
        assert!(
            0.5 - y < EPS,
            "calculated luminance: {}, expected: {}",
            y,
            0.5
        );
    }

    #[test]
    fn checkerboard_is_midpoint() {
        let mut data = Vec::new();
        data.extend_from_slice(&[0, 0, 0, 255]);       // black
        data.extend_from_slice(&[255, 255, 255, 255]); // white
        data.extend_from_slice(&[0, 0, 0, 255]);       // black
        data.extend_from_slice(&[255, 255, 255, 255]); // white
        let y = average_luma_relative(&data);
        assert!(
            (y - 0.5).abs() < EPS,
            "calculated luminance: {}, expected: {}",
            y,
            0.5
        );
    }

    #[test]
    #[should_panic]
    fn panics_on_non_rgba_length() {
        let data = vec![0u8; 5];
        average_luma_relative(&data);
    }

    #[test]
    fn nits_black_is_zero() {
        let data = solid_rgba(0, 0, 0, 255, 16);
        let nits = average_luma_in_nits(&data);
        assert!(
            nits.abs() < EPS,
            "calculated nits: {}, expected: {}",
            nits,
            0.0
        );
    }

    #[test]
    fn nits_white_is_lmax() {
        use crate::constants::L_MAX;
        let data = solid_rgba(255, 255, 255, 255, 16);
        let nits = average_luma_in_nits(&data);
        assert!(
            (nits - L_MAX).abs() < EPS,
            "calculated nits: {}, expected: {}",
            nits,
            L_MAX
        );
    }

    #[test]
    fn nits_mid_grey_matches_expected() {
        use crate::constants::{oetf_inv as inv, L_MAX};
        let data = solid_rgba(128, 128, 128, 128, 16);

        // Compute expected Nits
        let ey = average_luma_relative(&data);
        let y_linear = if ey <= inv::CUTOFF {
            ey / inv::SLOPE
        } else {
            ((ey + inv::ALPHA) / inv::SCALE).powf(inv::GAMMA)
        };
        let expected_nits = y_linear * L_MAX;

        let nits = average_luma_in_nits(&data);
        assert!(
            (nits - expected_nits).abs() < EPS,
            "calculated nits: {}, expected: {}",
            nits,
            expected_nits
        );
    }

    #[test]
    fn nits_from_data_uri_black_is_zero() {
        let data_uri =
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
        let nits = average_luma_in_nits_from_data_uri(data_uri);
        assert!(
            nits.abs() < EPS,
            "calculated nits: {}, expected: {}",
            nits,
            0.0
        );
    }

    #[test]
    fn inch_meter_roundtrip() {
        use crate::utils::{inch_to_meter, meter_to_inch};

        let inch_val = 13.37_f32;
        let meter_val = inch_to_meter(inch_val);
        let inch_back = meter_to_inch(meter_val);

        assert!(
            (inch_back - inch_val).abs() < 1e-4,
            "Inch->Meter->Inch round-trip failed"
        );
    }

    #[test]
    fn efficacy_constants_are_positive() {
        use crate::constants::{EFFICACY_LCD_LM_PER_W, EFFICACY_OLED_LM_PER_W};

        assert!(EFFICACY_LCD_LM_PER_W > 0.0);
        assert!(EFFICACY_OLED_LM_PER_W > 0.0);
    }

    #[test]
    fn decode_data_uri_handles_errors() {
        let bad_uri = "invalid_uri";
        let res = super::decode_data_uri(bad_uri);
        assert!(res.is_err(), "Expected error for invalid data URI");
    }

    #[test]
    fn decode_data_uri_success() {
        // 1×1 black PNG
        let data_uri =
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
        let res = super::decode_data_uri(data_uri);
        assert!(res.is_ok(), "Expected successful decode of valid data URI");
    }

    #[test]
    fn downscale_size_matches_expected() {
        use crate::constants::DOWNSCALE_SIZE;
        let data_uri =
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
        let img_bytes = super::decode_data_uri(data_uri).unwrap();
        let img = image::load_from_memory(&img_bytes).unwrap();
        let scaled = super::downscale_to_size(&img, DOWNSCALE_SIZE);
        assert_eq!(scaled.len(), (DOWNSCALE_SIZE * DOWNSCALE_SIZE * 4) as usize);
    }

    #[test]
    fn estimate_saved_energy_safe_on_invalid_uri() {
        let energy = estimate_saved_energy_wh_from_data_uri(
            10,
            10,
            1.0,
            DisplayTech::LCD,
            "invalid_uri",
        );
        assert_eq!(energy, 0);
    }
}

#[inline]
fn log(message: &str) {
    #[cfg(target_arch = "wasm32")]
    {
        console::log_1(&message.into());
    }

    #[cfg(not(target_arch = "wasm32"))]
    {
        println!("{}", message);
    }
}
