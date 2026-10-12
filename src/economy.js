import {getTiles} from './board.js';

// Versioned to preserve the rules of games saved before these mechanisms existed.
export const ECONOMY = Object.freeze({supplyFullThrough:10,supplyHalfThrough:20,contestFrom:21,contestMultiplier:1.5,defenseRate:.3,auctionRate:.5,auctionIncrement:100,operatingAfter:40,operatingStep:200});
export const hasEconomy = s => s.economyVersion === 1;
export const startSupply = (s,base=1000) => !hasEconomy(s)||s.round<=ECONOMY.supplyFullThrough?base:s.round<=ECONOMY.supplyHalfThrough?Math.floor(base/2):0;
export const operatingFee = s => hasEconomy(s)?Math.max(0,s.round-ECONOMY.operatingAfter)*ECONOMY.operatingStep:0;
export function contestQuote(s,tile){
 const asset=getTiles(s)[tile],prop=s.properties[tile];
 const spent=asset.type==='industry'?0:prop?.upgradeSpent??(prop?.level||0)*Math.round(asset.price*.5);
 const quote=asset.price+spent;
 return {price:Math.ceil(quote*ECONOMY.contestMultiplier),defenseFee:Math.ceil(quote*ECONOMY.defenseRate)};
}
export function canContest(s){
 const due=s.pendingRent,prop=s.properties[due?.tile];
 return hasEconomy(s)&&s.round>=ECONOMY.contestFrom&&s.phase==='rent'&&!!due&&!due.contested&&!!prop&&Number.isInteger(prop.owner)&&prop.owner===due.owner&&prop.owner!==s.current&&!s.players[prop.owner].bankrupt&&s.players[s.current].cash>=contestQuote(s,due.tile).price;
}
export const auctionMinimum = s => s.auction?s.auction.mode==='sealed'?s.auction.minimum:s.auction.highestBid?s.auction.highestBid+s.auction.increment:s.auction.minimum:0;

export const pendingBidders = s => s.phase==='auction'&&s.auction?.mode==='sealed'?s.auction.active.filter(id=>!s.auction.submitted.includes(id)):[];
export const canBid = (s,id) => pendingBidders(s).includes(id);
