import {ArchiveStore} from './ArchiveStore.js';
const key='dice-war.save.v1',settingsKey='dice-war.settings.v1';
export const defaults={speed:'1',volume:0.25,music:false,quality:'auto',animations:true,selectionAnimation:true,continuous:false,mode:'global',powerMode:'population',bonusCap:12,seed:'PLANETA-195',follow:true,region:'world',rules:{},customIds:[],favoriteId:null,hillId:null,maxRounds:2000,predictions:false,focusFavorite:false,challengeId:null};
export class SaveManager {
  static queue=Promise.resolve();
  static revision=0;
  static archive=new ArchiveStore();
  static save(engine){try{localStorage.setItem(key,JSON.stringify(engine.snapshot()));return true;}catch{return false;}}
  static read(){const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null;}
  static async saveFull(engine,careerSession){
    const snapshot=structuredClone({...engine.snapshot(),careerSession}),revision=++this.revision;
    try{localStorage.setItem(key,JSON.stringify(snapshot));return true;}catch{}
    this.queue=this.queue.catch(()=>{}).then(async()=>{
      if(revision!==this.revision)return true;
      try{await this.archive.put('__current__',snapshot,{current:true});if(revision===this.revision)localStorage.setItem(key,JSON.stringify({indexedDB:true}));return true;}catch{return false;}
    });return this.queue;
  }
  static async readFull(){const saved=this.read();return saved?.indexedDB?(await this.archive.get('__current__'))?.snapshot??null:saved;}
  static has(){try{return !!localStorage.getItem(key);}catch{return false;}}
  static settings(){try{return {...defaults,...JSON.parse(localStorage.getItem(settingsKey)||'{}')};}catch{return {...defaults};}}
  static writeSettings(settings){try{localStorage.setItem(settingsKey,JSON.stringify(settings));return true;}catch{return false;}}
}
