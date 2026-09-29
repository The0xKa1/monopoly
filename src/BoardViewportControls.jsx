import React from 'react';
import {Maximize, Minus, Plus} from 'lucide-react';

export function BoardViewportControls({viewport}) {
 if (!viewport.desktop) return null;
 const {zoom, setZoom, fit} = viewport;
 return <div className="board-viewport-controls" role="group" aria-label="棋盘缩放">
  <button className="board-fit-button" onClick={fit} aria-label="适应窗口" title="适应窗口"><Maximize size={13}/><span>适应</span></button>
  <button className="board-zoom-button" onClick={() => setZoom(zoom - .1)} disabled={zoom <= 1} aria-label="缩小棋盘"><Minus size={14}/></button>
  <output aria-label="棋盘缩放比例" aria-live="polite">{Math.round(zoom * 100)}%</output>
  <button className="board-zoom-button" onClick={() => setZoom(zoom + .1)} disabled={zoom >= 2} aria-label="放大棋盘"><Plus size={14}/></button>
 </div>;
}
