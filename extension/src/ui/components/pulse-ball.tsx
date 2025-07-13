import { useCallback, useEffect, useRef } from "react";

interface PulseBallProps {
  currentLuminance: number;
  isDarkMode: boolean;
}

export default function PulseBall({
  currentLuminance,
  isDarkMode,
}: PulseBallProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const asciiRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);

  const asciiChars = " .:-=+*#%@";

  const ballRef = useRef({
    x: 0,
    y: 0,
    baseRadius: 100,
    currentRadius: 100,
    targetRadius: 100,
    hue: 200,
    targetHue: 200,
    pulseIntensity: 0.1, // Default pulse intensity
    colorScheme: "light" as "light" | "dark",
    particles: [] as Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
    }>,
  });

  const convertToAscii = useCallback(() => {
    const canvas = canvasRef.current;
    const asciiDiv = asciiRef.current;

    if (!canvas || !asciiDiv) return;

    if (canvas.width <= 0 || canvas.height <= 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const charWidth = 3;
    const charHeight = 6;
    const cols = Math.floor(canvas.width / charWidth);
    const rows = Math.floor(canvas.height / charHeight);

    if (cols <= 0 || rows <= 0) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const pixels = imageData.data;

    let asciiString = "";

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const pixel = {
          x: Math.floor(x * charWidth + charWidth / 2),
          y: Math.floor(y * charHeight + charHeight / 2),
        };
        if (pixel.x >= canvas.width || pixel.y >= canvas.height) {
          asciiString += " ";
          continue;
        }

        const pixelIndex = (pixel.y * canvas.width + pixel.x) * 4;

        const r = pixels[pixelIndex] || 0;
        const g = pixels[pixelIndex + 1] || 0;
        const b = pixels[pixelIndex + 2] || 0;
        const brightness = (r + g + b) / 3;

        const charIndex = Math.floor(
          (brightness / 255) * (asciiChars.length - 1),
        );
        asciiString += asciiChars[charIndex];
      }
      asciiString += "\n";
    }

    asciiDiv.textContent = asciiString;
  }, []);

  useEffect(() => {
    function animate() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const ball = ballRef.current;

      // Update pulse intensity and color based on mode
      if (isDarkMode) {
        // Active state (dark mode) - more intense pulsation
        ball.pulseIntensity = 0.3;
        ball.targetHue = 120; // Green hue for dark mode
        ball.colorScheme = "dark";
      } else {
        // Resting state (light mode) - subtle pulsation
        ball.pulseIntensity = 0.1;
        ball.targetHue = 200; // Blue hue for light mode
        ball.colorScheme = "light";
      }

      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const time = Date.now() / 1000;
      const pulseFactor =
        Math.sin(time * (isDarkMode ? 2 : 1)) * ball.pulseIntensity +
        (1 - ball.pulseIntensity);

      // Scale base radius based on luminance (higher luminance = larger ball)
      const luminanceScale = Math.max(
        0.5,
        Math.min(1.5, currentLuminance / 100),
      );
      ball.baseRadius = 100 * luminanceScale;
      ball.targetRadius = ball.baseRadius * pulseFactor;

      ball.currentRadius += (ball.targetRadius - ball.currentRadius) * 0.1;
      ball.hue += (ball.targetHue - ball.hue) * 0.05;

      ball.x = canvas.width / 2;
      ball.y = canvas.height / 2;

      // Create different gradients for dark and light modes
      const gradient = ctx.createRadialGradient(
        ball.x,
        ball.y,
        0,
        ball.x,
        ball.y,
        ball.currentRadius,
      );

      if (isDarkMode) {
        // Dark mode colors - more vibrant and energetic
        gradient.addColorStop(0, `hsl(${ball.hue}, 100%, 80%)`);
        gradient.addColorStop(0.5, `hsl(${ball.hue}, 80%, 60%)`);
        gradient.addColorStop(0.8, `hsl(${ball.hue}, 60%, 40%)`);
        gradient.addColorStop(1, `hsl(${ball.hue}, 40%, 20%)`);
      } else {
        // Light mode colors - subtle and calm
        gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
        gradient.addColorStop(0.7, "rgba(180, 180, 180, 0.8)");
        gradient.addColorStop(1, "rgba(80, 80, 80, 0.2)");
      }

      // Enhanced shadow for dark mode
      ctx.shadowColor = isDarkMode
        ? `hsl(${ball.hue}, 100%, 60%)`
        : "rgba(255, 255, 255, 0.8)";
      ctx.shadowBlur = isDarkMode ? 50 : 30;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.currentRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      const coreGradient = ctx.createRadialGradient(
        ball.x,
        ball.y,
        0,
        ball.x,
        ball.y,
        ball.currentRadius * 0.3,
      );

      if (isDarkMode) {
        coreGradient.addColorStop(0, `hsl(${ball.hue}, 100%, 90%)`);
        coreGradient.addColorStop(1, `hsl(${ball.hue}, 80%, 50%)`);
      } else {
        coreGradient.addColorStop(0, "rgba(255, 255, 255, 1)");
        coreGradient.addColorStop(1, "rgba(255, 255, 255, 0.3)");
      }

      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.currentRadius * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Add more particles in dark mode
      if (isDarkMode && Math.random() < 0.1) {
        const angle = Math.random() * Math.PI * 2;
        const distance = ball.currentRadius * 0.8;
        ball.particles.push({
          x: ball.x + Math.cos(angle) * distance,
          y: ball.y + Math.sin(angle) * distance,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 60,
          maxLife: 60,
          size: Math.random() * 3 + 1,
        });
      }

      ball.particles.forEach((particle, idx) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;

        const alpha = particle.life / particle.maxLife;
        const particleColor = isDarkMode
          ? `hsl(${ball.hue}, 100%, 70%)`
          : "rgba(220, 220, 220, 1)";

        ctx.fillStyle = particleColor.replace("1)", `${alpha})`);
        ctx.shadowColor = particleColor.replace("1)", `${alpha})`);
        ctx.shadowBlur = isDarkMode ? 12 : 8;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
        ctx.fill();

        if (particle.life <= 0) {
          ball.particles.splice(idx, 1);
        }
      });

      ctx.shadowBlur = 0;

      convertToAscii();

      animationRef.current = requestAnimationFrame(animate);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    setTimeout(() => {
      animate();
    }, 100);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [convertToAscii, isDarkMode, currentLuminance]);

  return (
    <div className="relative w-full h-80 bg-black border border-green-500 overflow-hidden inset-0">
      <canvas ref={canvasRef} className="absolute inset-0 opacity-0" />
      <div
        ref={asciiRef}
        className="absolute inset-0 font-mono text-white whitespace-pre overflow-hidden pointer-events-none flex items-center justify-center"
        style={{
          fontSize: "5px",
          lineHeight: "5px",
          letterSpacing: "-0.5px",
        }}
      />
      {/* Luminance display overlay */}
      <div className="absolute bottom-4 left-4 right-4 text-center">
        <div
          className={`text-xs font-mono ${isDarkMode ? "text-green-400" : "text-green-300"}`}
        >
          LUMINANCE: {Math.round(currentLuminance)} nits
        </div>
        <div
          className={`text-xs font-mono ${isDarkMode ? "text-green-600" : "text-green-500"}`}
        >
          {isDarkMode ? "[DARK MODE ACTIVE]" : "[LIGHT MODE]"}
        </div>
      </div>
    </div>
  );
}
