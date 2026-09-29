import {useCallback, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {mapDimensions, tilePosition} from './board.js';

const DESKTOP_QUERY = '(min-width: 1024px)';
const GAP = 6;
const INSET = 7; // Six pixels of grid padding and a one-pixel border.
const clampZoom = value => Math.min(2, Math.max(1, Math.round(value * 100) / 100));

// Keep the clockwise route intact while choosing the largest readable tile size.
export function chooseBoardDimensions(size, width, height) {
 const sum = size / 2 + 2;
 let best = mapDimensions(size), bestSide = -1;
 for (let rows = 4; rows <= Math.floor(sum / 2); rows++) {
  const columns = sum - rows;
  const cellWidth = (width - INSET * 2 - GAP * (columns - 1)) / columns;
  const cellHeight = (height - INSET * 2 - GAP * (rows - 1)) / rows;
  const side = Math.min(cellWidth, cellHeight);
  if (side > bestSide) { best = {columns, rows}; bestSide = side; }
 }
 return best;
}

export function boardGridPosition(index, {columns, rows}) {
 const size = 2 * (columns + rows) - 4;
 if (index < columns) return {gridColumn: index + 1, gridRow: 1};
 if (index < columns + rows - 1) return {gridColumn: columns, gridRow: index - columns + 2};
 if (index < 2 * columns + rows - 2) return {gridColumn: 2 * columns + rows - 2 - index, gridRow: rows};
 return {gridColumn: 1, gridRow: size - index + 1};
}

export function useBoardViewport(size, enabled = true) {
 const viewportRef = useRef(null);
 const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches);
 const [bounds, setBounds] = useState({width: 0, height: 0});
 const [zoom, updateZoom] = useState(1);
 const zoomRef = useRef(zoom);
 const scrollAnchor = useRef(null);
 const active = desktop && enabled;

 useLayoutEffect(() => {
  const media = window.matchMedia(DESKTOP_QUERY);
  const update = () => setDesktop(media.matches);
  update();
  media.addEventListener('change', update);
  return () => media.removeEventListener('change', update);
 }, []);

 useLayoutEffect(() => {
  const viewport = viewportRef.current;
  if (!active || !viewport) return;
  const measure = () => {
   const style = getComputedStyle(viewport);
   const width = Math.max(1, viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
   const height = Math.max(1, viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom));
   setBounds(previous => previous.width === width && previous.height === height ? previous : {width, height});
  };
  measure();
  const observer = new ResizeObserver(measure);
  observer.observe(viewport);
  return () => observer.disconnect();
 }, [active, size]);

 const fit = useCallback(() => {
  scrollAnchor.current = null;
  zoomRef.current = 1;
  updateZoom(1);
  viewportRef.current?.scrollTo({left: 0, top: 0, behavior: 'instant'});
 }, []);

 const setZoom = useCallback(value => {
  const previous = zoomRef.current;
  const requested = typeof value === 'function' ? value(previous) : value;
  if (!Number.isFinite(requested)) return;
  const next = clampZoom(requested);
  if (next === previous) return;
  const viewport = viewportRef.current;
  scrollAnchor.current = viewport && next > 1 ? {
   x: (viewport.scrollLeft + viewport.clientWidth / 2) / previous,
   y: (viewport.scrollTop + viewport.clientHeight / 2) / previous,
  } : null;
  zoomRef.current = next;
  updateZoom(next);
 }, []);

 useLayoutEffect(() => { if (active) fit(); }, [active, size, fit]);
 useLayoutEffect(() => {
  const viewport = viewportRef.current;
  if (!active || !viewport) return;
  const anchor = scrollAnchor.current;
  if (zoom === 1) viewport.scrollTo({left: 0, top: 0, behavior: 'instant'});
  else if (anchor) viewport.scrollTo({left: anchor.x * zoom - viewport.clientWidth / 2, top: anchor.y * zoom - viewport.clientHeight / 2, behavior: 'instant'});
  scrollAnchor.current = null;
 }, [active, zoom]);

 const dimensions = useMemo(() => active && bounds.width && bounds.height
  ? chooseBoardDimensions(size, bounds.width, bounds.height) : mapDimensions(size), [active, size, bounds]);
 const position = useCallback(index => active ? boardGridPosition(index, dimensions) : tilePosition(index, size), [active, dimensions, size]);
 const width = Math.max(1, bounds.width) * zoom;
 const height = Math.max(1, bounds.height) * zoom;
 const boardStyle = active ? {
  width: `${width}px`, height: `${height}px`,
  '--columns': dimensions.columns, '--rows': dimensions.rows,
  '--cell-height': `${Math.max(1, (height - INSET * 2 - GAP * (dimensions.rows - 1)) / dimensions.rows)}px`,
  '--cell-width': `${Math.max(1, (width - INSET * 2 - GAP * (dimensions.columns - 1)) / dimensions.columns)}px`,
 } : {};
 const surfaceStyle = active ? {width: `${width}px`, height: `${height}px`} : {};

 return {viewportRef, desktop, dimensions, position, boardStyle, surfaceStyle, zoom, setZoom, fit};
}
