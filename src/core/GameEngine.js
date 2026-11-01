import {ClassicEngine} from './ClassicEngine.js';
import {CampaignEngine} from './CampaignEngine.js';
export class GameEngine extends ClassicEngine {
  constructor(countries,borders,options={}){
    const campaign=(options.region&&options.region!=='world')||options.favoriteId||options.challengeId||Object.values(options.rules??{}).some(Boolean);
    if(campaign)return new CampaignEngine(countries,borders,options);
    super(countries,borders,options);
  }
  static restore(countries,borders,saved){return saved?.version===2?CampaignEngine.restore(countries,borders,saved):ClassicEngine.restore(countries,borders,saved);}
}
