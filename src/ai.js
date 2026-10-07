// Rule-based AI. No network, no randomness except the injected `random`.
// Every action returned here must be accepted by transition(); otherwise the
// UI would stall, so each branch re-checks the reducer's own preconditions.
import {getTiles} from './board.js';
import {rent,upgradeCost,purchaseQuote,mortgageValue,ownedAssets,mortgaged,getIndustryQuote,canRedeem,season,owned,roundLimit} from './game.js';
import {eventDestinations,eventChoices} from './eventOptions.js';
import {getEventCard} from './eventCards.js';

// Thresholds tuned by seeded self-play against the previous AI (2026-10-07).
export const TUNE = {minReserve: 300, maxWeight: .3, buy: 1, strategic: .5, upgrade: 1, completeUpgrade: .7, offer: .7, offerShare: .1};
// Unlimited games are valued as if ~30 rounds remained.
const roundsLeft = s => { const limit = roundLimit(s); return Number.isFinite(limit) ? Math.max(1, limit - s.round + 1) : 30; };
const opponents = (s, id) => s.players.filter((p, i) => i !== id && !p.bankrupt).length;
const groupOf = (tiles, i) => tiles.flatMap((t, j) => t.type === 'city' && t.group === tiles[i].group ? [j] : []);
const ownerOf = (s, i) => s.properties[i]?.owner;
const isActiveOwner = (s, i, id) => ownerOf(s, i) === id;

// Rent tile i would charge if `owner` held it at `level`, all else as now.
export function projectedRent(s, i, owner, level = s.properties[i]?.level || 0) {
  const tiles = getTiles(s), t = tiles[i];
  if (t.type !== 'city') return 0;
  const combo = groupOf(tiles, i).every(j => j === i || ownerOf(s, j) === owner);
  return Math.round(t.price * .16 * (level + 1) * (combo ? 1.5 : 1) * (season(s).group === t.group ? 1.3 : 1) * (owner === 2 ? 1.15 : 1));
}

// Expected rent income per round from one tile: each active opponent lands on
// a given tile about once per lap of N tiles, i.e. ~1/N per round.
const perRound = (s, owner, amount) => amount * opponents(s, owner) / getTiles(s).length;

// What landing on tile `to` costs the visitor `id` right now (0 if nothing).
function chargeAt(s, id, to, steps) {
  const tiles = getTiles(s), t = tiles[to], owner = ownerOf(s, to);
  if (typeof owner !== 'number' || owner === id) return 0;
  if (t.type === 'city') return s.players[id].shield ? 0 : rent(s, to);
  if (t.type === 'industry') return getIndustryQuote({...s, lastDice: steps, dice: steps}, to, id, owner)?.amount || 0;
  return 0;
}

// Rents waiting on the next roll (1–6) from `from`.
export function exposure(s, id, from = s.players[id].pos) {
  const n = getTiles(s).length, charges = [1, 2, 3, 4, 5, 6].map(k => chargeAt(s, id, (from + k) % n, k));
  return {expected: charges.reduce((a, b) => a + b, 0) / 6, max: Math.max(...charges), charges};
}

// Cash to keep after spending. Mortgaging covers shortfalls without losing net
// worth, so the buffer only needs to cover the likely next rent.
export function reserve(s, id, from = s.players[id].pos) {
  const {expected, max} = exposure(s, id, from);
  const liquid = ownedAssets(s, id).length ? 0 : 400;
  const late = s.round >= roundLimit(s) - 1 ? .6 : 1;
  return Math.round(Math.max(TUNE.minReserve, (expected + TUNE.maxWeight * max) * late) + liquid);
}

const completesGroup = (s, i, id) => {
  const tiles = getTiles(s);
  return tiles[i].type === 'city' && groupOf(tiles, i).every(j => j === i || ownerOf(s, j) === id);
};
// True if a single opponent holds every other city of this group.
const blocksGroup = (s, i, id) => {
  const tiles = getTiles(s); if (tiles[i].type !== 'city') return false;
  const others = groupOf(tiles, i).filter(j => j !== i).map(j => ownerOf(s, j));
  return others.length > 0 && typeof others[0] === 'number' && others[0] !== id && others.every(o => o === others[0]);
};
const inCompleteGroup = (s, i, id) => {
  const tiles = getTiles(s);
  return tiles[i].type === 'city' && groupOf(tiles, i).every(j => ownerOf(s, j) === id);
};

// Rough future income of holding tile i (for comparisons, not money moved).
function holdingValue(s, i, id) {
  const t = getTiles(s)[i], R = roundsLeft(s);
  if (t.type === 'industry') return perRound(s, id, t.price * .14) * R;
  return perRound(s, id, projectedRent(s, i, id)) * R;
}

// Score of ending a move on tile `to` (used for dice cards and travel cards).
function landingScore(s, id, to, steps, cashAfterStart) {
  const tiles = getTiles(s), t = tiles[to], owner = ownerOf(s, to), p = s.players[id];
  const cash = cashAfterStart ?? p.cash;
  if (t.type === 'city' || t.type === 'industry') {
    if (owner === undefined) {
      if (cash - t.price < reserve(s, id, to) * .5) return 40;
      let score = .3 * t.price + holdingValue(s, to, id) * .5;
      if (completesGroup(s, to, id)) score += 900;
      if (blocksGroup(s, to, id)) score += 500;
      return score;
    }
    if (owner === id) {
      if (t.type !== 'city' || s.properties[to].level >= 3) return 0;
      const cost = upgradeCost(s, to);
      return cash - cost >= reserve(s, id, to) * .6 ? .45 * cost + (inCompleteGroup(s, to, id) ? 300 : 0) : 20;
    }
    if (owner === 'bank') return 0;
    return -chargeAt(s, id, to, steps);
  }
  if (t.type === 'chance' || t.type === 'city-event') return 120;
  return 0;
}

function bestDiceChoice(s, id) {
  const p = s.players[id], n = getTiles(s).length, bonus = id === 0 ? 1200 : 1000;
  const scores = [1, 2, 3, 4, 5, 6].map(k => {
    const to = (p.pos + k) % n, passes = p.pos + k >= n;
    return landingScore(s, id, to, k, p.cash + (passes ? bonus : 0)) + (passes ? bonus : 0);
  });
  const expected = scores.reduce((a, b) => a + b, 0) / 6, best = Math.max(...scores);
  return {value: scores.indexOf(best) + 1, gain: best - expected};
}

function rollPhase(s, id, random) {
  const p = s.players[id], tiles = getTiles(s), cards = p.cards || {};
  // Redeem a mortgaged asset when the cash buffer allows; group members first.
  const redeemable = mortgaged(s, id).filter(i => canRedeem(s, i, id) && p.cash - s.properties[i].mortgageAmount >= reserve(s, id) + 300);
  if (redeemable.length) {
    const tile = redeemable.sort((a, b) => (completesGroup(s, b, id) - completesGroup(s, a, id)) || (holdingValue(s, b, id) - holdingValue(s, a, id)))[0];
    return {type: 'REDEEM', tile};
  }
  // Building subsidy waits until the next upgrade, so activate it early.
  if (cards.build > 0 && !p.subsidy && owned(s, id).some(i => s.properties[i].level < 3)) return {type: 'CARD', card: 'build', actor: id};
  if (cards.dice > 0 && !p.controlled) {
    const choice = bestDiceChoice(s, id);
    if (choice.gain >= 450) return {type: 'CARD', card: 'dice', value: choice.value, actor: id};
  }
  if (cards.shield > 0 && !p.shield) {
    const n = tiles.length, steps = p.controlled ? [p.controlled] : [1, 2, 3, 4, 5, 6];
    const cityRents = steps.map(k => { const to = (p.pos + k) % n; return tiles[to].type === 'city' ? chargeAt(s, id, to, k) : 0; });
    const expected = cityRents.reduce((a, b) => a + b, 0) / steps.length, max = Math.max(...cityRents);
    if (max >= 900 || expected >= 320) return {type: 'CARD', card: 'shield', actor: id};
  }
  return {type: 'ROLL', value: Math.floor(random() * 6) + 1, eventSeed: random()};
}

// Would the seller accept an offer for tile i? Shared by both sides.
// Protect completed groups; otherwise require cash pressure or a clear low-yield
// singleton that can fund an upgrade to an already completed group.
export function sellerAccepts(s, seller, tile, buyer) {
  const tiles = getTiles(s), sp = s.players[seller], price = purchaseQuote(s, tile);
  const group = tiles[tile].type === 'city' ? groupOf(tiles, tile) : [tile];
  if (inCompleteGroup(s, tile, seller) || completesGroup(s, tile, buyer)) return false;
  if (group.some(j => j !== tile && ownerOf(s, j) === buyer)) return false;
  if (sp.cash < Math.min(1500, reserve(s, seller))) return true;
  const lone = group.every(j => j === tile || ownerOf(s, j) !== seller);
  return lone && holdingValue(s, tile, seller) < price * .12 && owned(s, seller).some(i => s.properties[i].level < 3 && inCompleteGroup(s, i, seller));
}

function rentPhase(s, id) {
  const due = s.pendingRent, p = s.players[id];
  if (!due.offerRejected && due.owner !== 'bank') {
    const quote = purchaseQuote(s, due.tile);
    const affordable = p.cash >= quote && p.cash - quote >= reserve(s, id) * TUNE.offer;
    const worthIt = completesGroup(s, due.tile, id) || blocksGroup(s, due.tile, id) || due.amount >= quote * TUNE.offerShare;
    // Ask the human only for strong reasons (each ask is a prompt for them);
    // never waste a turn asking an AI seller who would refuse.
    const plausible = due.owner === 0
      ? completesGroup(s, due.tile, id) || blocksGroup(s, due.tile, id) || due.amount >= quote * .3
      : sellerAccepts(s, due.owner, due.tile, id);
    if (affordable && worthIt && plausible) return {type: 'OFFER'};
  }
  return {type: 'PAY_RENT'};
}

// Lose the least income per yuan raised; never break a completed group first.
function mortgagePick(s, id) {
  const assets = ownedAssets(s, id);
  if (!assets.length) return null;
  const cost = i => holdingValue(s, i, id) / Math.max(1, mortgageValue(s, i)) + (inCompleteGroup(s, i, id) ? 10 : 0);
  return assets.sort((a, b) => cost(a) - cost(b))[0];
}

function itemValue(s, id, item, count = 1) {
  const p = s.players[id], held = p.cards?.[item] || 0;
  let value = 0;
  if (item === 'dice') value = p.controlled ? 0 : 300 + Math.max(0, bestDiceChoice(s, id).gain);
  else if (item === 'shield') {
    if (!p.shield) { const risk = exposure(s, id); value = Math.min(900, risk.expected + .25 * risk.max); }
  } else if (item === 'build') {
    if (!p.subsidy) value = owned(s, id).some(i => s.properties[i].level < 3) ? 600 : 150;
  }
  return count * value / (1 + held);
}

function propertyChoiceValue(s, id, effect, option) {
  const i = option.tile, prop = s.properties[i];
  if (effect.type === 'renovate') {
    const increase = projectedRent(s, i, id, prop.level + 1) - projectedRent(s, i, id, prop.level);
    return increase * roundsLeft(s);
  }
  if (effect.type === 'redeem_grant') {
    const properties = {...s.properties, [i]: {...prop, owner: id}};
    delete properties[i].mortgagor; delete properties[i].mortgageAmount;
    return (prop.mortgageAmount || 0) + perRound(s, id, projectedRent({...s, properties}, i, id)) * roundsLeft(s);
  }
  return 0;
}

function choiceValue(s, id, effect, option) {
  if (option.item) return itemValue(s, id, option.item, effect.type === 'reward_choice' ? 2 : effect.count);
  if (option.value === 'cash') return 800;
  if (Number.isInteger(option.tile)) return propertyChoiceValue(s, id, effect, option);
  return 0;
}

function selectBest(options, score, random) {
  if (!options.length) return null;
  const scored = options.map(option => ({option, value: score(option)}));
  const best = Math.max(...scored.map(result => result.value));
  const tied = scored.filter(result => result.value === best);
  const index = tied.length > 1 ? Math.min(tied.length - 1, Math.floor(random() * tied.length)) : 0;
  return tied[index].option;
}

function eventValue(s, id, card) {
  const effect = card.effect, p = s.players[id], rivals = s.players.filter((other, i) => i !== id && !other.bankrupt);
  const cityCount = owned(s, id).length;
  switch (effect.type) {
    case 'bank': return effect.amount;
    case 'gift_all': return -effect.amount * rivals.length;
    case 'richest_gift': return Math.min(effect.amount, Math.max(0, ...rivals.map(other => other.cash)));
    case 'collect_all': return rivals.reduce((sum, other) => sum + Math.min(effect.amount, other.cash), 0);
    case 'redistribution': {
      const active = s.players.map((other, player) => ({other, player})).filter(entry => !entry.other.bankrupt);
      const donor = active.slice().sort((a, b) => b.other.cash - a.other.cash || a.player - b.player)[0];
      const recipient = active.filter(entry => entry.player !== donor?.player).sort((a, b) => a.other.cash - b.other.cash || a.player - b.player)[0];
      const amount = recipient && donor.other.cash > recipient.other.cash ? Math.min(effect.amount, donor.other.cash) : 0;
      return donor?.player === id ? -amount : recipient?.player === id ? amount : 0;
    }
    case 'interest': return Math.min(effect.cap, Math.floor(p.cash * effect.rate));
    case 'property_fee': return -cityCount * effect.amount;
    case 'property_dividend': return cityCount * effect.amount;
    case 'relief': {
      const hasCity = getTiles(s).some((tile, i) => tile.type === 'city' && (ownerOf(s, i) === id || s.properties[i]?.mortgagor === id));
      return hasCity ? effect.owned : effect.empty;
    }
    case 'city_host': {
      const host = getTiles(s).findIndex(tile => tile.type === 'city' && tile.cityId === card.cityId);
      const owner = host < 0 ? undefined : ownerOf(s, host);
      return effect.amount + (Number.isInteger(owner) && !s.players[owner].bankrupt ? effect.ownerBonus : 0);
    }
    case 'item': return itemValue(s, id, effect.card, effect.count);
    case 'item_choice':
    case 'reward_choice': {
      const state = {...s, activeEvent: {id: card.id, actor: id, source: s.eventDraw?.source || 'chance'}};
      const options = eventChoices(state);
      return Math.max(0, ...options.map(option => choiceValue(s, id, effect, option)));
    }
    case 'travel': {
      const state = {...s, activeEvent: {id: card.id, actor: id, source: s.eventDraw?.source || 'chance'}};
      const destinations = eventDestinations(state);
      return destinations.length ? Math.max(...destinations.map(i => landingScore(s, id, i, 0))) : (effect.fallback || 0);
    }
    case 'renovate':
    case 'redeem_grant': {
      const state = {...s, activeEvent: {id: card.id, actor: id, source: s.eventDraw?.source || 'chance'}};
      const options = eventChoices(state);
      return options.length ? Math.max(...options.map(option => choiceValue(s, id, effect, option))) : (effect.fallback || 0);
    }
    case 'shield_all': return p.shield ? 0 : itemValue(s, id, 'shield');
    case 'shuffle': return 0;
    default: return 0;
  }
}

function chooseEvent(s, id, random) {
  const card = getEventCard(s.activeEvent?.id), options = eventChoices(s);
  if (!card || !options.length) return null;
  if (options.some(option => option.item || option.value === 'cash')) {
    return selectBest(options, option => choiceValue(s, id, card.effect, option), random)?.value ?? options[0].value;
  }
  return selectBest(options, option => propertyChoiceValue(s, id, card.effect, option), random)?.value ?? options[0].value;
}

export function aiAction(s, random = Math.random) {
  const tiles = getTiles(s), id = s.current, p = s.players[id];
  if (s.phase === 'draw') {
    const choices = s.eventDraw.offerIds.map((id, index) => ({index, card: getEventCard(id)})).filter(option => option.card);
    const selected = selectBest(choices, option => eventValue(s, id, option.card), random);
    return {type: 'DRAW_EVENT', index: selected?.index ?? 0};
  }
  if (s.phase === 'event') return {type: 'RESOLVE_EVENT', seed: random()};
  if (s.phase === 'event-choice') return {type: 'EVENT_CHOICE', value: chooseEvent(s, id, random)};
  if (s.phase === 'event-destination') {
    const cities = eventDestinations(s);
    const scored = cities.map(i => ({i, score: landingScore(s, id, i, 0) + random() * 5}));
    return {type: 'EVENT_DESTINATION', tile: scored.sort((a, b) => b.score - a.score)[0]?.i ?? cities[0]};
  }
  if (s.phase === 'offer') {
    const {seller, tile, buyer} = s.offer;
    return {type: 'OFFER_REPLY', actor: seller, accept: sellerAccepts(s, seller, tile, buyer)};
  }
  if (s.phase === 'rent') return rentPhase(s, id);
  if (s.phase === 'debt') {
    if (p.cash >= s.debt.amount) return {type: 'SETTLE_DEBT'};
    const tile = mortgagePick(s, id);
    return tile === null ? {type: 'BANKRUPT'} : {type: 'MORTGAGE', tile};
  }
  if (s.phase === 'roll') return rollPhase(s, id, random);
  if (s.phase === 'buy') {
    const i = p.pos, price = tiles[i].price, keep = reserve(s, id);
    const strategic = completesGroup(s, i, id) || blocksGroup(s, i, id);
    if (p.cash - price >= keep * (strategic ? TUNE.strategic : TUNE.buy)) return {type: 'BUY'};
  }
  if (s.phase === 'upgrade') {
    const i = p.pos, cost = upgradeCost(s, i), keep = reserve(s, id);
    if (p.cash - cost >= keep * (inCompleteGroup(s, i, id) ? TUNE.completeUpgrade : TUNE.upgrade)) return {type: 'UPGRADE'};
  }
  return {type: 'END'};
}
