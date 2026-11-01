export class ArchiveStore {
  constructor(){this.promise=null;}
  open(){
    if(!globalThis.indexedDB)return Promise.reject(Error('O navegador não disponibilizou o arquivo de campanhas'));
    return this.promise??=new Promise((resolve,reject)=>{const request=indexedDB.open('dice-war-archives-v1',2);request.onupgradeneeded=()=>{const store=request.result.objectStoreNames.contains('campaigns')?request.transaction.objectStore('campaigns'):request.result.createObjectStore('campaigns',{keyPath:'id'});if(!store.indexNames.contains('date'))store.createIndex('date','date');};request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result);};request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Feche outras abas do jogo para atualizar o arquivo de campanhas'));});
  }
  async put(id,snapshot,summary){
    const db=await this.open();await new Promise((resolve,reject)=>{const tx=db.transaction('campaigns','readwrite'),store=tx.objectStore('campaigns');store.put({id,snapshot,summary,date:Date.now()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
    const entries=await this.list();for(const old of entries.filter(e=>e.id!=='__current__').sort((a,b)=>b.date-a.date).slice(12))await this.remove(old.id);
  }
  async list(){const db=await this.open();return new Promise((resolve,reject)=>{const items=[],r=db.transaction('campaigns').objectStore('campaigns').index('date').openKeyCursor();r.onsuccess=()=>{const cursor=r.result;if(!cursor){resolve(items);return;}items.push({id:cursor.primaryKey,date:cursor.key});cursor.continue();};r.onerror=()=>reject(r.error);});}
  async get(id){const db=await this.open();return new Promise((resolve,reject)=>{const r=db.transaction('campaigns').objectStore('campaigns').get(id);r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(r.error);});}
  async remove(id){const db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction('campaigns','readwrite');tx.objectStore('campaigns').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
}
