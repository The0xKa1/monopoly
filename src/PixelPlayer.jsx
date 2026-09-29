import React,{useMemo} from 'react';
import {normalizeAppearance,renderAvatar} from './appearance.js';
export function PixelPlayer({player,id=0,className='',frame=null}) {
 const source=useMemo(()=>`data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderAvatar(normalizeAppearance(player?.appearance,id),frame))}`,[player?.appearance,id,frame]);
 return <img className={`pixel-player ${className}`} data-avatar={id} data-frame={frame??'idle'} src={source} alt={player?.name||''}/>;
}
