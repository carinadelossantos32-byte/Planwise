import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";

/*
    Heat map drawn on a canvas laid over the map. Google's own heat map layer has been retired,
    so this draws it directly: each client is a soft blob, blobs add up where clients are close,
    and the total is colored from blue (few) to red (many).
*/
const RADIUS = 25;
const BLUR = 15;
const GRADIENT = { 0.4: "blue", 0.6: "cyan", 0.7: "lime", 0.8: "yellow", 1.0: "red" };
const MAX_ZOOM = 17;

function buildPalette() {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  Object.entries(GRADIENT).forEach(([stop, color]) => gradient.addColorStop(Number(stop), color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1, 256);
  return ctx.getImageData(0, 0, 1, 256).data;
}

function buildStamp() {
  const size = RADIUS + BLUR;
  const stamp = document.createElement("canvas");
  stamp.width = size * 2;
  stamp.height = size * 2;
  const ctx = stamp.getContext("2d");
  ctx.shadowOffsetX = size * 2; // the blob is drawn off to the side and only its blurred shadow lands on the canvas
  ctx.shadowBlur = BLUR;
  ctx.shadowColor = "black";
  ctx.beginPath();
  ctx.arc(-size, size, RADIUS, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.fill();
  return stamp;
}

function HeatmapLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !points || points.length === 0) return undefined;

    const palette = buildPalette();
    const stamp = buildStamp();
    const canvas = document.createElement("canvas");
    Object.assign(canvas.style, { position: "absolute", inset: "0", pointerEvents: "none", zIndex: "2" });
    const container = map.getDiv();
    container.appendChild(canvas);

    let frame = 0;
    const draw = () => {
      frame = 0;
      const width = container.clientWidth;
      const height = container.clientHeight;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const projection = overlay.getProjection();
      if (!projection) return;

      const ctx = canvas.getContext("2d");
      ctx.scale(ratio, ratio);

      // stronger as the map zooms in, the same way the old heat map behaved
      const zoom = map.getZoom() ?? MAX_ZOOM;
      const intensity = 1 / Math.pow(2, Math.max(0, Math.min(MAX_ZOOM - zoom, 12)));
      const size = RADIUS + BLUR;

      points.forEach(([lat, lng, weight = 1]) => {
        const pixel = projection.fromLatLngToContainerPixel(new window.google.maps.LatLng(lat, lng));
        if (!pixel) return;
        ctx.globalAlpha = Math.min(1, Math.max(0.05, weight * intensity));
        ctx.drawImage(stamp, pixel.x - size, pixel.y - size);
      });

      // turn the accumulated darkness into colors
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = image.data;
      for (let i = 3; i < data.length; i += 4) {
        const alpha = data[i];
        if (alpha) {
          const at = alpha * 4;
          data[i - 3] = palette[at];
          data[i - 2] = palette[at + 1];
          data[i - 1] = palette[at + 2];
        }
      }
      ctx.putImageData(image, 0, 0);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };

    // an overlay view is how the map hands over its pixel projection
    class HeatOverlay extends window.google.maps.OverlayView {
      onAdd() {}
      onRemove() {}
      draw() { schedule(); }
    }
    const overlay = new HeatOverlay();
    overlay.setMap(map);

    const listeners = ["bounds_changed", "idle", "zoom_changed"].map((name) =>
      map.addListener(name, schedule)
    );
    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    schedule();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      listeners.forEach((l) => l.remove());
      observer.disconnect();
      overlay.setMap(null);
      canvas.remove();
    };
  }, [map, points]);

  return null;
}

export default HeatmapLayer;
