import {initialState} from './game.js';
import {getEventCard} from './eventCards.js';
import {validateMap} from './board.js';
import {validRosterSave} from './players.js';
import {migrateAppearances} from './appearance.js';
export const SAVE='city-dice-v1';
export const LAB_SAVE='city-dice-event-lab-v1';
function read(storage,key){
 try{const s=JSON.parse(storage.getItem(key));if(!validRosterSave(s))return null;s.map=validateMap(s.map);return migrateAppearances(s);}catch{return null;}
}
export function loadNormalGame(storage){const s=read(storage,SAVE);return s&&!s.testRun?s:initialState();}
export function loadGame(storage){
 const test=read(storage,LAB_SAVE);
 if(test?.testRun&&getEventCard(test.testRun.id)&&Array.isArray(test.testRun.baseline?.cash)&&Array.isArray(test.testRun.baseline?.cards)&&Array.isArray(test.testRun.baseline?.positions)&&Array.isArray(test.testRun.baseline?.cityOrder))return test;
 return loadNormalGame(storage);
}
export function saveGame(storage,game){
 storage.setItem(game.testRun?LAB_SAVE:SAVE,JSON.stringify(game));
 if(!game.testRun)storage.removeItem(LAB_SAVE);
}
