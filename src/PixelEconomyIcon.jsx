import React from 'react';

// Original 24×24 pixel geometry, drawn for this project; no external assets.
export function PixelEconomyIcon({type='supply',size=24,className=''}){
 const ink='#574c3c',gold='#d8a548',light='#fff0be',green='#64876d',red='#b8755e';
 const art={
  auction:<><path fill={ink} d="M3 3h11v8H3zM9 11h4v7H9zM3 20h18v3H3zM6 17h12v3H6z"/><path fill={gold} d="M5 5h7v4H5zM10 11h2v6h-2zM5 21h14v1H5z"/><path fill={light} d="M5 5h7v2H5z"/><path fill={red} d="M18 4h2v5h-2zM20 11h3v2h-3z"/></>,
  contest:<><path fill={ink} d="M2 2h13v18H2zM16 9h7v9h-2v3h-3v2h-3v-2h-3v-3h-2V9h6z"/><path fill={light} d="M4 4h9v4H9v10H4z"/><path fill={gold} d="M12 11h9v6h-2v3h-3v-2h-2v-2h-2z"/><path fill={green} d="M16 12h2v3h2v2h-2v2h-2v-2h-2v-2h2z"/><path fill={red} d="M6 6h5v1H6zM6 10h2v2H6zM6 14h2v2H6z"/></>,
  operating:<><path fill={ink} d="M10 1h4v2h4v2h4v4H2V5h4V3h4zM3 10h4v8H3zM10 10h4v8h-4zM17 10h4v8h-4zM1 19h22v4H1z"/><path fill={light} d="M10 4h4v2h4v1H6V6h4zM4 11h2v7H4zM11 11h2v7h-2zM18 11h2v7h-2z"/><path fill={gold} d="M3 20h18v2H3z"/><path fill={red} d="M10 5h4v2h-4z"/></>,
  supply:<><path fill={ink} d="M2 10h20v12H2zM5 7h14v3H5zM10 1h4v4h3v2h-3v3h-4V7H7V5h3z"/><path fill={gold} d="M4 12h16v8H4z"/><path fill={light} d="M5 12h5v3H5zM12 12h7v2h-7z"/><path fill={green} d="M4 18h16v2H4zM11 2h2v4h2v1h-2v1h-2V7H9V6h2z"/></>,
 };
 return <svg className={`pixel-economy-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true" focusable="false">{art[type]||art.supply}</svg>;
}
