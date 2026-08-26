export interface ResultCardData {
  name: string;
  rank: number;
  total: number;
  score: number;
  code: string;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
  else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

export function drawResultCard(data: ResultCardData): Promise<Blob> {
  const W = 1200;
  const H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const SANS = "'Inter', 'Segoe UI', system-ui, sans-serif";

  ctx.fillStyle = "#161616";
  ctx.fillRect(0, 0, W, H);

  let g = ctx.createRadialGradient(W - 60, 40, 20, W - 60, 40, 500);
  g.addColorStop(0, "rgba(130,90,109,0.65)");
  g.addColorStop(1, "rgba(130,90,109,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  g = ctx.createRadialGradient(40, H - 20, 20, 40, H - 20, 520);
  g.addColorStop(0, "rgba(156,117,137,0.45)");
  g.addColorStop(1, "rgba(156,117,137,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(164,163,161,0.35)";
  ctx.lineWidth = 2;
  roundRect(ctx, 26, 26, W - 52, H - 52, 26);
  ctx.stroke();

  ctx.fillStyle = "#9C7589";
  ctx.font = `800 30px ${SANS}`;
  ctx.textAlign = "left";
  ctx.fillText("S E I S M I C   Q U I Z", 72, 104);

  ctx.fillStyle = "#D4D4D4";
  ctx.font = `600 28px ${SANS}`;
  ctx.textAlign = "right";
  ctx.fillText(`ROOM ${data.code}`, W - 72, 104);

  const medal =
    data.rank === 1
      ? { label: "GOLD", color: "#F5C542" }
      : data.rank === 2
      ? { label: "SILVER", color: "#C7CBD1" }
      : data.rank === 3
      ? { label: "BRONZE", color: "#CD8554" }
      : null;

  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 168px ${SANS}`;
  ctx.fillText(`#${data.rank}`, 68, 330);

  ctx.font = `600 32px ${SANS}`;
  ctx.fillStyle = "#D4D4D4";
  ctx.fillText(`of ${data.total} players`, 76, 388);

  if (medal) {
    ctx.fillStyle = medal.color;
    ctx.font = `800 34px ${SANS}`;
    ctx.fillText(medal.label, 78, 442);
  }

  ctx.textAlign = "right";
  ctx.fillStyle = "#D4D4D4";
  ctx.font = `700 26px ${SANS}`;
  ctx.fillText("SCORE", W - 72, 268);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 110px ${SANS}`;
  ctx.fillText(String(data.score), W - 72, 380);

  ctx.textAlign = "left";
  ctx.fillStyle = "#A4A3A1";
  ctx.fillRect(72, 496, W - 144, 2);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 40px ${SANS}`;
  ctx.fillText(data.name.slice(0, 28), 72, 562);

  ctx.textAlign = "right";
  ctx.fillStyle = "#A4A3A1";
  ctx.font = `600 24px ${SANS}`;
  ctx.fillText("live results · real-time quiz", W - 72, 560);

  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/png")
  );
}
