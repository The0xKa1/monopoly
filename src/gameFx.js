// Pure detection of presentation moments from one committed state change.
// No DOM and no rule changes: the UI decides how (and whether) to animate them.
export const BIG_RENT = 1000;
export const seasonIndex = s => Math.floor(((s?.round || 1) - 1) / 4) % 4;
const layoutKey = s => JSON.stringify([s?.map?.kind ?? 'classic', s?.map?.size ?? null, s?.map?.cityOrder ?? null]);

export function detectFx(prev, next) {
  if (!prev || !next || prev === next) return [];
  const fx = [];
  // Map shuffles re-key properties by index; ownership diffs are meaningless then.
  if (layoutKey(prev) === layoutKey(next)) {
    for (const [key, prop] of Object.entries(next.properties || {})) {
      const tile = Number(key), before = prev.properties?.[key];
      if (typeof prop?.owner !== 'number') continue;
      if (!before) fx.push({type: prev.phase==='auction'&&prev.auction?.tile===tile?'auction-sale':'buy', tile, player: prop.owner});
      else if (typeof before.owner === 'number' && before.owner !== prop.owner) fx.push({type: prev.phase==='contest'?'contest-sale':'takeover', tile, player: prop.owner, from: before.owner});
      else if (before.owner === prop.owner && (prop.level || 0) > (before.level || 0)) fx.push({type: 'upgrade', tile, player: prop.owner, level: (prop.level || 0) + 1});
    }
  }
  for (const t of next.transactions || []) {
    const label = t.label || '';
    if (/城市租金|产业服务费/.test(label) && typeof t.from === 'number') {
      fx.push({type: 'rent', tile: next.players[t.from]?.pos ?? 0, from: t.from, to: t.to, amount: t.amount, big: t.amount >= BIG_RENT});
    } else if (label.startsWith('经过起点') && typeof t.to === 'number') {
      fx.push({type: 'start-bonus', tile: 0, player: t.to, amount: t.amount});
    } else if (label.includes('最终经营期') && typeof t.from === 'number') {
      fx.push({type:'operating',player:t.from,amount:t.amount});
    }
  }
  if(next.phase==='auction'&&(prev.phase!=='auction'||prev.auction?.tile!==next.auction?.tile))fx.push({type:'auction',tile:next.auction.tile});
  else if(next.phase==='auction'&&next.auction.highestBid> (prev.auction?.highestBid||0))fx.push({type:'auction-bid',tile:next.auction.tile,player:next.auction.highestBidder,amount:next.auction.highestBid});
  if(next.phase==='contest'&&prev.phase!=='contest')fx.push({type:'contest',tile:next.contest.tile,player:next.contest.buyer});
  if(prev.phase==='contest'&&next.phase==='rent'&&next.pendingRent?.contested)fx.push({type:'defense',tile:prev.contest.tile,player:prev.contest.seller});
  if(next.economyVersion===1&&next.round>prev.round&&(prev.round<11&&next.round>=11||prev.round<21&&next.round>=21))fx.push({type:'supply',round:next.round});
  // Item cards played this step (AI or human): one badge per card spent.
  next.players.forEach((p, id) => {
    for (const card of ['dice', 'shield', 'build']) {
      if ((p.cards?.[card] || 0) < (prev.players[id]?.cards?.[card] || 0)) fx.push({type: 'item', player: id, card, ...(card === 'dice' && p.controlled ? {value: p.controlled} : {})});
    }
  });
  next.players.forEach((p, id) => {
    if (p.bankrupt && !prev.players[id]?.bankrupt) {
      const tiles = Object.entries(prev.properties || {}).filter(([, prop]) => prop?.owner === id).map(([k]) => Number(k));
      fx.push({type: 'bankrupt', player: id, tiles});
    }
  });
  if (next.phase === 'finished' && prev.phase !== 'finished') {
    fx.push({type: 'finale', winner: next.winner});
    return fx;
  }
  if (next.round > prev.round && seasonIndex(next) !== seasonIndex(prev)) fx.push({type: 'season', index: seasonIndex(next), round: next.round});
  if (next.current !== prev.current && !next.players[next.current]?.bankrupt) fx.push({type: 'turn', player: next.current, round: next.round});
  return fx;
}
