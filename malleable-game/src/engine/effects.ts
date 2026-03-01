export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

const floatingTexts: FloatingText[] = [];
let shakeAmount = 0;
let shakeDuration = 0;

export function addFloatingText(x: number, y: number, text: string, color: string) {
  floatingTexts.push({ x, y, text, color, life: 0, maxLife: 60 });
}

export function triggerShake(amount: number, duration: number) {
  shakeAmount = amount;
  shakeDuration = duration;
}

export function getShakeOffset(): { x: number; y: number } {
  if (shakeDuration <= 0) return { x: 0, y: 0 };
  shakeDuration--;
  const decay = shakeDuration / 30;
  return {
    x: (Math.random() - 0.5) * shakeAmount * decay,
    y: (Math.random() - 0.5) * shakeAmount * decay,
  };
}

export function updateAndDrawFloatingTexts(ctx: CanvasRenderingContext2D) {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.life++;
    ft.y -= 0.8;

    const alpha = 1 - ft.life / ft.maxLife;
    if (alpha <= 0) { floatingTexts.splice(i, 1); continue; }

    ctx.font = "bold 14px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (ft.color.startsWith("#")) {
      const r = parseInt(ft.color.slice(1, 3), 16);
      const g = parseInt(ft.color.slice(3, 5), 16);
      const b = parseInt(ft.color.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    } else {
      ctx.fillStyle = ft.color.replace(")", `,${alpha})`).replace("rgb(", "rgba(");
    }

    ctx.fillText(ft.text, ft.x, ft.y);
  }
}
