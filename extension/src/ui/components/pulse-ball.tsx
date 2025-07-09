import { useEffect, useRef } from "react";

export default function PulseBall() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const asciiRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)

  const asciiChars = " .:-=+*#%@"

  const ballRef = useRef({
    x: 0,
    y: 0,
    baseRadius: 100,
    currentRadius: 100,
    targetRadius: 100,
    hue: 200,
    targetHue: 200,
    particles: [] as Array<{
      x: number,
      y: number,
      vx: number,
      vy: number,
      life: number,
      maxLife: number,
      size: number,
    }>,
  })

  function convertToAscii() {
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

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    let asciiString = ""

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const pixel = {
          x: Math.floor(x * charWidth + charWidth / 2),
          y: Math.floor(y * charHeight + charHeight / 2),
        };

        const pixelIndex = (pixel.y * canvas.width + pixel.x) * 4;

        const [r, g, b] = pixels.slice(pixelIndex, pixelIndex + 2);
        const brightness = (r + g + b) / 3;

        const charIndex = Math.floor((brightness / 255) * (asciiChars.length - 1));
        asciiString += asciiChars[charIndex];
      }
      asciiString += "\n"
    }

    asciiDiv.textContent = asciiString
  }

  function animate() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ball = ballRef.current;

    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const time = Date.now() / 1000;
    const pulseFactor = Math.sin(time) * 0.1 + 0.9;
    ball.targetRadius = ball.baseRadius * pulseFactor;

    ball.currentRadius += (ball.targetRadius - ball.currentRadius) * 0.1;
    ball.hue += (ball.targetHue - ball.hue) * 0.1;

    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;

    const gradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.currentRadius);

    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.7, 'rgba(180, 180, 180, 0.8)');
    gradient.addColorStop(1, 'rgba(80, 80, 80, 0.2)');

    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.currentRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0
    const coreGradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.currentRadius * 0.3);
    coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    coreGradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');

    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.currentRadius, 0, Math.PI * 2);
    ctx.fill();

    ball.particles.forEach((particle, idx) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life--;

      const alpha = particle.life / particle.maxLife;
      ctx.fillStyle = `rgba(220, 220, 220, ${alpha}`;
      ctx.shadowColor = `rgba(220, 220, 220, ${alpha}`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      ctx.fill();

      if (particle.life <= 0) {
        ball.particles.splice(idx, 1);
      }
    })

    ctx.shadowBlur = 0;

    convertToAscii();

    animationRef.current = requestAnimationFrame(animate);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    setTimeout(() => {
      animate()
    }, 100);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [])

  return (
    <div className="fixed inset-0">
      <canvas ref={canvasRef} className="w-full h-full opacity-0" />
      <div
        ref={asciiRef}
        className="fixed inset-0 font-mono text-white whitespace-pre overflow-hidden pointer-events-none flex items-center justify-content"
        style={{
          fontSize: "5px",
          lineHeight: "5px",
          letterSpacing: "-0.5px",
        }}
      />
    </div>
  )
}
