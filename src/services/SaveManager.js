const key='dice-war.save.v1',settingsKey='dice-war.settings.v1';
export const defaults={speed:'1',volume:0.25,music:false,quality:'auto',animations:true,mode:'global',bonusCap:12,seed:'PLANETA-195',follow:true};
export class SaveManager {
  static save(engine){try{localStorage.setItem(key,JSON.stringify(engine.snapshot()));return true;}catch{return false;}}
  static read(){const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null;}
  static has(){try{return !!localStorage.getItem(key);}catch{return false;}}
  static settings(){try{return {...defaults,...JSON.parse(localStorage.getItem(settingsKey)||'{}')};}catch{return {...defaults};}}
  static writeSettings(settings){try{localStorage.setItem(settingsKey,JSON.stringify(settings));return true;}catch{return false;}}
}
