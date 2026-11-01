import './styles/main.css';
import {loadData} from './services/DataLoader.js';
import {SaveManager,defaults} from './services/SaveManager.js';
import {GameEngine} from './core/GameEngine.js';
import {powerLabels} from './core/MilitarySystem.js';
import {WorldMap} from './graphics/WorldMap.js';
import {AudioManager} from './graphics/AudioManager.js';
import {BattleAnimation} from './graphics/BattleAnimation.js';
import {leaderboard,historyRows} from './ui/Leaderboard.js';
import {countryPanel} from './ui/CountryPanel.js';
import {battlePanel} from './ui/BattlePanel.js';
import {powerOptions,readPowerOptions,syncPowerOptions} from './ui/PowerOptions.js';
import {selectionPanel} from './ui/SelectionPanel.js';
import {bonusPanel} from './ui/BonusPanel.js';
import {animateSelection} from './graphics/SelectionAnimation.js';
import {statisticsScreen,growthChart} from './ui/StatisticsScreen.js';
import {flag,number,compact,percent,esc,icon,time} from './ui/helpers.js';

const $=id=>document.getElementById(id);
const app=$('app');
let data,engine,map,audio,animation,byId,settings=SaveManager.settings(),busy=false,menuOpen=true,replaying=false,lastBattle=null,generation=0,initialized=false;
let lastTick=performance.now(),timer=null,sessionStarted=false;

async function boot(){
  data=await loadData();byId=Object.fromEntries(data.countries.map(c=>[c.id,c]));
  engine=new GameEngine(data.countries,data.borders,{...settings,powerMode:settings.powerMode??'population'});
  if(matchMedia('(prefers-reduced-motion: reduce)').matches&&!localStorage.getItem('dice-war.settings.v1'))settings.animations=false;
  app.innerHTML=`<header class="topbar"><a class="brand" href="#" data-action="menu" aria-label="Abrir menu principal"><span class="brand-die">⚄</span><span>WORLD CONQUEST<small>D I C E &nbsp; W A R</small></span></a><nav><button class="nav-button" data-action="help">${icon('help')}<span>Como jogar</span></button><button class="nav-button" data-action="stats">${icon('chart')}<span>Estatísticas</span></button><span class="nav-separator"></span><button class="icon-button" data-action="settings" aria-label="Configurações">${icon('settings',20)}</button><button class="icon-button" data-action="menu" aria-label="Menu principal">${icon('menu',20)}</button></nav></header>
    <section class="metrics" aria-label="Resumo da simulação"><div class="metric"><span>RODADA</span><strong id="metric-round">000</strong></div><div class="metric"><span>ESTADOS INDEPENDENTES</span><strong id="metric-active">195 <small>/ 195</small></strong></div><div class="metric"><span>BATALHAS</span><strong id="metric-battles">0</strong></div><div class="metric leader-metric"><span><span id="leader-label">LÍDER POPULACIONAL</span></span><strong id="metric-leader"></strong></div><div class="metric"><span>DOMÍNIO DO LÍDER</span><strong id="metric-share"></strong></div><div class="metric time-metric"><span>TEMPO DE SIMULAÇÃO</span><strong id="metric-time">00:00:00</strong></div></section>
    <main class="game-layout"><section class="map-region" aria-label="Mapa interativo dos 195 Estados"><div class="map-heading"><div><span class="eyebrow"><i class="status-dot"></i>MAPA MUNDIAL</span><p id="map-status">195 Estados independentes</p></div><div class="map-search">${icon('globe',15)}<input id="country-search" list="country-options" placeholder="Encontrar país…" aria-label="Encontrar país"><datalist id="country-options">${data.countries.map(c=>`<option value="${esc(c.name)}">${c.id}</option>`).join('')}</datalist></div></div>
    <div id="map-canvas"></div><div class="map-vignette"></div><div class="ocean-label ocean-atlantic">OCEANO<br>ATLÂNTICO</div><div class="ocean-label ocean-pacific">OCEANO<br>PACÍFICO</div>
    <div class="map-tools"><button class="icon-button" data-action="zoom-in" aria-label="Aproximar">${icon('plus')}</button><button class="icon-button" data-action="zoom-out" aria-label="Afastar">${icon('minus')}</button><span></span><button class="icon-button" data-action="world" aria-label="Visão mundial" title="Visão mundial">${icon('globe')}</button><button class="icon-button" data-action="tilt" aria-label="Inclinar mapa" title="Inclinar mapa">${icon('tilt')}</button></div><div class="compass"><span>N</span><i>✦</i><small>W &nbsp; E</small></div>
    <div id="main-menu" class="start-card"><span class="eyebrow">SIMULAÇÃO DE CONQUISTA</span><h1>WORLD<br>CONQUEST</h1><p>Escolha a regra de força e acompanhe as batalhas entre 195 Estados.</p>${powerOptions(settings.powerMode,'menu')}<button class="button primary" data-action="start">${icon('play',15)} Iniciar nova simulação</button><button class="button subtle" id="continue-menu" data-action="continue" ${SaveManager.has()?'':'disabled'}>Continuar simulação ${icon('chevron',15)}</button><div class="menu-links"><button data-action="settings">Configurações</button><button data-action="stats">Estatísticas</button><button data-action="help">Como jogar</button><button data-action="credits">Créditos e fontes ↗</button></div></div>
    <div id="battle-panel" class="battle-panel hidden" aria-live="polite"></div><div id="idle-prompt" class="idle-prompt hidden"><p>Simulação pausada</p><small>Inicie ou execute uma batalha por vez.</small></div>
    <div id="replay-bar" class="replay-bar hidden"><span class="eyebrow">MAPA POR RODADA</span><input type="range" id="replay-round" min="0" value="0" aria-label="Rodada do mapa histórico"><strong id="replay-value">0</strong><button class="button" data-action="live">Voltar à partida</button></div>
    <div class="map-footer"><span>ARRASTE PARA EXPLORAR <b>·</b> SCROLL PARA ZOOM</span></div><div id="map-loading" class="map-loading"><span class="boot-die">⚄</span><p>Desenhando o mundo…</p></div></section>
    <aside class="sidebar"><section class="leaderboard-section"><div class="panel-heading"><div><span class="eyebrow">CLASSIFICAÇÃO</span><h2>Ranking mundial</h2></div><span class="count-badge">TOP 10</span></div><div class="ranking-columns"><span>FACÇÃO / ESTADOS</span><span id="ranking-label">POPULAÇÃO</span></div><div id="ranking"></div></section><section class="history-section"><div class="panel-heading"><div><span class="eyebrow">HISTÓRICO</span><h2>Últimas conquistas</h2></div><button data-action="history" class="text-button" aria-label="Ver todo o histórico">${icon('chevron',17)}</button></div><div id="history"></div><button class="history-all" data-action="history">Ver histórico completo ${icon('chevron',13)}</button></section></aside></main>
    <footer class="controlbar"><div class="play-controls"><button class="button primary play-button" id="play-button" data-action="play">${icon('play',16)}<span>Iniciar</span></button><button class="button next-button" id="next-button" data-action="next">${icon('next',16)}<span>Próxima batalha</span></button></div><div class="control-divider"></div><div class="control-group speed-group"><label for="speed">VELOCIDADE</label><select id="speed" aria-label="Velocidade da simulação">${['0.5','1','2','4','8','max'].map(s=>`<option value="${s}" ${settings.speed===s?'selected':''}>${s==='max'?'Máxima':s+'×'}</option>`).join('')}</select></div><button class="follow-button ${settings.continuous?'active':''}" data-action="follow" id="follow-button" aria-pressed="${settings.continuous}" title="Ativar ou desativar batalhas contínuas">${icon('globe',16)}<span>Seguir batalha</span><i></i></button><div class="control-spacer"></div><div class="seed-display"><span>SEED</span><strong id="seed-label"></strong></div><button class="icon-button" data-action="reset" aria-label="Reiniciar com a mesma seed" title="Reiniciar com a mesma seed">${icon('reset',19)}</button><button class="button new-button" data-action="new">${icon('spark',15)}<span>Nova simulação</span></button></footer>
    <div class="bottomline"><span><i class="status-dot"></i><span id="bottom-status">PRONTO PARA COMEÇAR</span></span><button data-action="credits">FONTES DOS DADOS <span>↗</span></button><span id="save-status">SALVAMENTO AUTOMÁTICO</span></div><div id="tooltip" class="map-tooltip hidden"></div><div id="toast" role="status" class="toast hidden"></div><dialog id="dialog"><div class="dialog-header"><span class="eyebrow" id="dialog-label"></span><button class="icon-button" data-action="close-dialog" aria-label="Fechar">${icon('close')}</button></div><div id="dialog-content"></div></dialog><input id="import-file" type="file" accept="application/json" hidden>`;
  audio=new AudioManager(settings);animation=new BattleAnimation($('battle-panel'),audio);
  map=new WorldMap($('map-canvas'),data,showCountry,hoverCountry,settings);
  render();bind();await map.init();$('map-loading').remove();initialized=true;
  // Read-only debug handle for local QA; not part of the production bundle.
  if(import.meta.env.DEV)window.__game={get engine(){return engine;},map,get busy(){return busy;}};
  requestAnimationFrame(tick);
}
function render(){
  const leader=engine.ranking[0];
  $('leader-label').textContent=engine.options.powerMode==='population'?'LÍDER POPULACIONAL':'MAIOR FORÇA';$('ranking-label').textContent=engine.options.powerMode==='population'?'POPULAÇÃO':'ÍNDICE DO JOGO';syncPowerOptions(document.querySelector('[data-power-options="menu"]'),settings.powerMode);
  $('metric-round').textContent=String(engine.round).padStart(3,'0');$('metric-active').innerHTML=`${engine.active.length} <small>/ 195</small>`;
  $('metric-battles').textContent=engine.round;$('metric-leader').innerHTML=`${flag(byId[leader.id])}<span>${esc(byId[leader.id].name)}</span>`;
  $('metric-share').innerHTML=`${percent(leader.population/engine.population.world*100)} <small>pop.</small>`;
  $('ranking').innerHTML=leaderboard(engine,byId);$('history').innerHTML=historyRows(engine.history,byId,4);
  $('seed-label').textContent=engine.options.seed;$('seed-label').title=engine.options.seed;
  const canPlay=engine.round>0||!!settings.powerMode;
  $('follow-button').classList.toggle('active',settings.continuous);$('follow-button').setAttribute('aria-pressed',String(settings.continuous));$('follow-button').disabled=engine.ended||replaying||!canPlay;
  document.querySelector('#main-menu [data-action="start"]').disabled=!settings.powerMode;document.querySelector('.controlbar [data-action="new"]').disabled=!settings.powerMode;
  $('play-button').innerHTML=`${icon(engine.running?'pause':'play',16)}<span>${engine.running?'Pausar':settings.continuous?'Iniciar':'Jogar batalha'}</span>`;
  $('play-button').disabled=engine.ended||replaying||!canPlay||(busy&&!engine.running);$('next-button').disabled=busy||engine.ended||replaying||!canPlay;
  $('bottom-status').textContent=replaying?'EXPLORANDO O HISTÓRICO':busy?'BATALHA EM CURSO':engine.ended?(engine.phase==='finished'?'MUNDO CONQUISTADO':'IMPASSE GEOGRÁFICO'):engine.running?'SIMULAÇÃO EM ANDAMENTO':menuOpen?'PRONTO PARA COMEÇAR':'SIMULAÇÃO PAUSADA';
  $('map-status').textContent=`${engine.options.mode==='global'?'Terra e mar':'Fronteiras terrestres'} · ${engine.active.length} facções · ${powerLabels[engine.options.powerMode]}`;
  $('main-menu').classList.toggle('hidden',!menuOpen);$('idle-prompt').classList.toggle('hidden',menuOpen||!!lastBattle||replaying||busy);
}
function tick(now){
  if(engine.running||busy)engine.elapsedMs+=Math.min(now-lastTick,1000);
  lastTick=now;$('metric-time').textContent=time(engine.elapsedMs);requestAnimationFrame(tick);
}
function toast(message){$('toast').textContent=message;$('toast').classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.add('hidden'),4000);}
function openDialog(label,content,kind=''){
  const dialog=$('dialog');dialog.className=kind?`dialog-${kind}`:'';dialog.dataset.kind=kind;$('dialog-label').textContent=label;$('dialog-content').innerHTML=content;
  if(!dialog.open)dialog.showModal();
  $('dialog-content').scrollTop=0;
}
function closeDialog(){if($('dialog').open)$('dialog').close();}
function showCountry(id){
  if(!initialized||replaying)return;
  openDialog('DOSSIÊ DO ESTADO',countryPanel(id,engine,byId),'country');map.highlight(id);
}
function hoverCountry(id,event){
  const tooltip=$('tooltip');if(!id||menuOpen||replaying){tooltip.classList.add('hidden');return;}
  const owner=engine.territory.owners[id],f=engine.factions[owner];
  tooltip.innerHTML=`${flag(byId[owner])}<div><strong>${esc(byId[id].name)}</strong><small>${owner!==id?'Controlado por '+esc(byId[owner].name)+' · ':''}${compact(f.population)} hab. · Força ${engine.strength(f)??'não disponível'}</small></div>`;
  tooltip.style.left=Math.max(8,Math.min(innerWidth-285,event.clientX+15))+'px';tooltip.style.top=Math.min(innerHeight-120,event.clientY+18)+'px';tooltip.classList.remove('hidden');
}
function persist(){if(!sessionStarted)return;const ok=SaveManager.save(engine);$('save-status').textContent=ok?'✓ PARTIDA SALVA LOCALMENTE':'FALHA AO SALVAR · EXPORTE A PARTIDA';$('continue-menu').disabled=!ok;}
function hideMenu(){menuOpen=false;sessionStarted=true;if(engine.phase==='menu')engine.pause();render();}
function pause(){engine.pause();clearTimeout(timer);render();persist();}
function canStartBattle(){
  if(!engine.round&&!settings.powerMode){toast('Selecione população, forças armadas ou ambas para começar.');return false;}
  return initialized&&!engine.ended&&!replaying;
}
function play(){if(engine.running)pause();else if(settings.continuous)startAuto();else void executeOne();}
function startAuto(){
  if(!canStartBattle())return;
  hideMenu();audio.unlock();audio.music();engine.resume();render();if(!busy)schedule(0);
}
function schedule(delay=30){clearTimeout(timer);if(engine.running)timer=setTimeout(pump,delay);}
async function pump(){
  if(!engine.running||busy||replaying)return;
  if(settings.speed==='max'||!settings.animations){
    const limit=settings.speed==='max'?20:1;
    for(let i=0;i<limit&&!engine.ended;i++){const b=engine.step();if(b)lastBattle=b;else break;}
    map.update(engine.territory.owners);if(lastBattle){$('battle-panel').classList.remove('hidden');$('battle-panel').innerHTML=battlePanel(lastBattle,byId);}
    render();persist();if(engine.ended){showEnd();return;}
    schedule(settings.speed==='max'?16:Math.max(40,1100/Number(settings.speed)));return;
  }
  await executeOne(true);
}
function stopPresentation(){generation++;animation.skip();clearTimeout(timer);map.endSelection();busy=false;}
async function executeOne(animate=settings.animations&&settings.speed!=='max'){
  if(busy||!canStartBattle())return;
  const token=generation,valid=()=>token===generation;
  busy=true;animation.skipped=false;hideMenu();audio.unlock();$('tooltip').classList.add('hidden');
  const panel=$('battle-panel');panel.classList.remove('hidden');$('idle-prompt').classList.add('hidden');
  try{
    const preview=engine.previewBattle();
    if(!preview){engine.step();return;}
    const speed=Number(settings.speed)||1,owners=engine.territory.owners;
    if(animate&&settings.selectionAnimation){
      engine.setPhase('selection');map.reset();render();
      const sweep=async(stage,candidates,selected)=>animateSelection({candidates,selected,speed,
        valid:()=>valid()&&!animation.skipped,wait:ms=>animation.wait(ms),
        onFrame:(id,done)=>{map.selectFaction(id,owners,stage);panel.innerHTML=selectionPanel({stage,id,attacker:preview.attacker,done},byId);audio.tone(done?480:200,0.025,'triangle',0.15);}
      });
      await sweep('attacker',preview.candidates,preview.attacker);if(!valid())return;
      if(!animation.skipped){map.focus([preview.attacker]);await animation.wait(500/speed);if(!valid())return;
        map.focus([preview.attacker,...preview.enemies]);await sweep('defender',preview.enemies,preview.defender);if(!valid())return;
        map.focusMatchup(preview.attacker,preview.defender,owners);await animation.wait(400/speed);if(!valid())return;
      }
    }
    map.endSelection();
    if(animate){
      if(settings.follow)map.focusMatchup(preview.attacker,preview.defender,owners);
      map.battle(preview.attacker,preview.defender);engine.setPhase('bonus');panel.innerHTML=bonusPanel(preview,byId);render();
      animation.clash(750/speed);await animation.wait(750/speed);if(!valid())return;
      panel.querySelector('.bonus-panel').dataset.bonusStage='result';animation.clearEffects();audio.tone(420,0.10,'triangle',0.3);
      await animation.wait(700/speed);if(!valid())return;
    }
    const b=engine.step();if(!b)return;lastBattle=b;
    if(animate){
      audio.roll();panel.innerHTML=battlePanel(b,byId,{rolling:true});render();
      await animation.wait(1050/speed);if(!valid())return;
      panel.innerHTML=battlePanel(b,byId,{celebrate:!animation.skipped,resultDuration:1200/speed});audio.win();map.update(engine.territory.owners,true,b.conquered);
      await animation.wait(1400/speed);if(!valid())return;
    }else{panel.innerHTML=battlePanel(b,byId);map.update(engine.territory.owners);}
  }catch(error){if(valid()){engine.pause();map.update(engine.territory.owners);toast('Não foi possível apresentar a batalha: '+error.message);}}
  finally{
    if(valid()){animation.clearEffects();map.endSelection();busy=false;render();persist();if(engine.ended)showEnd();else if(engine.running)schedule(200/(Number(settings.speed)||1));}
  }
}
function reset({newSeed=false,start=false,seed,rules={}}={}){
  if(!(rules.powerMode??settings.powerMode)){toast('Selecione ao menos uma opção de força para a nova simulação.');return;}
  stopPresentation();replaying=false;lastBattle=null;sessionStarted=true;
  if(newSeed)settings.seed=`WAR-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase()}`;
  if(seed!==undefined)settings.seed=seed;
  engine=new GameEngine(data.countries,data.borders,{...settings,...rules,seed:settings.seed});SaveManager.writeSettings(settings);
  menuOpen=false;engine.pause();map.update(engine.territory.owners);map.reset();$('battle-panel').classList.add('hidden');$('replay-bar').classList.add('hidden');closeDialog();render();persist();
  if(start)play();
}
function showEnd(){
  map.reset();render();persist();const win=engine.ranking[0];
  if(engine.phase==='stalemate'){
    openDialog('FIM DA SIMULAÇÃO',`<div class="end-hero"><span class="pixel-trophy">⚑</span><h1>IMPASSE<br>GEOGRÁFICO</h1><p>${engine.active.length} facções sobreviveram. Não existem fronteiras terrestres inimigas.</p></div><div class="survivors">${engine.ranking.map(f=>`<button data-country="${f.id}">${flag(byId[f.id])}${esc(byId[f.id].name)}<span>${f.count} Estados</span></button>`).join('')}</div><div class="stats-actions"><button class="button primary" data-action="new">Nova simulação</button><button class="button" data-action="stats">Ver estatísticas</button></div>`,'end');return;
  }
  audio.win();
  openDialog('RESULTADO',`<div class="end-hero victory"><div class="confetti">✦ · ✧ · ✦ · ✧ · ✦</div><span class="pixel-trophy">♛</span><h1>WORLD<br>CONQUERED</h1>${flag(byId[win.id])}<h2>${esc(byId[win.id].name)}</h2><p>Todos os 195 Estados estão sob o mesmo controle.</p></div><div class="end-stats"><div><span>População controlada</span><strong>${number(win.population)}</strong></div><div><span>Domínio final</span><strong>100% da base</strong></div><div><span>Rodadas / batalhas</span><strong>${engine.round}</strong></div><div><span>Vitórias do vencedor</span><strong>${win.wins}</strong></div><div><span>Primeira conquista</span><strong>${esc(byId[win.firstConquest]?.name??'—')}</strong></div><div><span>Último adversário</span><strong>${esc(byId[lastBattle?.loser]?.name??'—')}</strong></div><div><span>Tempo de simulação</span><strong>${time(engine.elapsedMs)}</strong></div><div><span>Seed</span><strong>${esc(engine.options.seed)}</strong></div></div><div class="stats-actions"><button class="button primary" data-action="new">Nova simulação</button><button class="button" data-action="repeat">Repetir simulação</button><button class="button" data-action="stats">Estatísticas completas</button><button class="button" data-action="history">Ver histórico</button></div>`,'end');
}
function settingsDialog(){
  openDialog('CONFIGURAÇÕES',`<h2>Configurações</h2><form id="settings-form"><div class="settings-grid">${powerOptions(settings.powerMode,'settings')}<label>Fronteiras<select name="mode"><option value="global" ${settings.mode==='global'?'selected':''}>Conquista global · terra e mar</option><option value="land" ${settings.mode==='land'?'selected':''}>Somente terrestres</option></select></label><label>Limite do bônus<input name="bonusCap" type="number" min="0" max="19" value="${settings.bonusCap}" required></label><label class="full-width">Semente aleatória (seed)<input name="seed" maxlength="80" value="${esc(settings.seed)}" required></label><label>Qualidade gráfica<select name="quality">${[['auto','Automática'],['high','Alta'],['low','Econômica']].map(([v,l])=>`<option value="${v}" ${settings.quality===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Volume dos efeitos<input name="volume" type="range" min="0" max="1" step="0.05" value="${settings.volume}"></label><label class="check-label"><input type="checkbox" name="animations" ${settings.animations?'checked':''}> Ativar animações (mapa, bônus e dados)</label><label class="check-label full-width"><input type="checkbox" name="selectionAnimation" ${settings.selectionAnimation?'checked':''}> Sortear atacante e defensor com destaques no mapa</label><label class="check-label"><input type="checkbox" name="follow" ${settings.follow?'checked':''}> Movimentação automática da câmera</label><label class="check-label full-width"><input type="checkbox" name="music" ${settings.music?'checked':''}> Música ambiente sintetizada</label></div><p class="notice">Regra de força, fronteiras, bônus e seed valem para a próxima simulação. Para aplicar agora, salve e inicie uma nova partida.</p><div class="stats-actions"><button type="submit" class="button primary">Salvar configurações</button><button type="button" class="button" data-action="import">Importar partida</button></div></form>`,'settings');
  $('settings-form').querySelector('[type="submit"]').disabled=!settings.powerMode;
}
function helpDialog(){
  openDialog('COMO JOGAR',`<h2>Como funcionam as batalhas</h2><p class="dialog-intro">Cada batalha elimina uma facção. No modo global, uma partida termina após 194 batalhas.</p><div class="help-steps"><div><b>01</b><section><h3>Um encontro na fronteira</h3><p>Um atacante elegível é sorteado com chances iguais. Um de seus inimigos conectados é escolhido aleatoriamente. No modo global, rotas marítimas fixas conectam as ilhas.</p></section></div><div><b>02</b><section><h3>Três dados para cada lado</h3><p>Cada facção rola exatamente 3D6 independentes. Apenas a de maior força recebe a diferença como bônus, limitada a ${engine.options.bonusCap}. Um empate exige nova rolagem dos seis dados, com os mesmos bônus.</p></section></div><div><b>03</b><section><h3>Quem vence leva tudo</h3><p>O vencedor absorve todos os Estados e toda a população do perdedor. As novas fronteiras passam a considerar a união de seus territórios.</p></section></div></div><p class="notice">Marque População, Forças armadas ou ambas antes de começar. Jogar batalha executa uma rodada. Ative Seguir batalha para continuar automaticamente; desative para parar depois da batalha atual. O sorteio animado no mapa pode ser desligado em Configurações. O bônus é apresentado antes dos dados.</p><div class="formula-card"><span class="eyebrow">FORÇA POPULACIONAL · 1 A 20</span><code>round(1 + 19 × (ln(P) − ln(Pmin)) / (ln(Pmax) − ln(Pmin)))</code><p>Limitada ao intervalo [1, 20]. P = população controlada; Pmin = ${number(engine.population.min)} e Pmax = ${number(engine.population.max)}, fixos nos dados iniciais. Bônus = min(limite, max(0, força − força rival)).</p></div><div class="formula-card"><h3>Forças armadas e modo combinado</h3><p>Militar: cada medida recebe ln(1 + total conhecido) / ln(1 + maior valor nacional inicial), com teto 1. O índice é round(1 + 19 × soma ponderada). Pesos: efetivo ativo + paramilitar 35%, gasto/orçamento 25%, tanques 15%, aeronaves 15%, embarcações 10%. Reservistas e o PowerIndex GFP são apenas informativos.</p><p>Combinado: round((índice populacional + índice militar) / 2). Se um dos lados não possui nenhuma medida militar, ambos usam componente militar neutro 1 nesta batalha. Assim, o modo militar não concede bônus a nenhum lado; no combinado, só a população pode criar diferença.</p><p>Dados ausentes não recebem valores inventados. O índice usa apenas a capacidade medida, com pesos fixos, e indica cobertura parcial. Não é uma previsão de guerra real: não considera treinamento, logística, alianças nem armas nucleares. Nas conquistas, os recursos publicados dos territórios são somados sem perdas.</p></div><p class="source-line">Arraste o mapa para mover. Use o scroll ou +/− para aproximar. Clique em um território para consultar seu dossiê; pequenos Estados têm marcadores ampliados e também podem ser encontrados na busca. Espaço inicia/pausa. A mesma seed, regra de força, modo e bônus reproduzem a mesma partida em qualquer velocidade.</p><button class="button primary" data-action="close-dialog">Fechar</button>`,'help');
}
function creditsDialog(){
  const s=data.sources;
  openDialog('CRÉDITOS, FONTES E CARTOGRAFIA',`<h2>Fontes dos dados</h2><div class="credits-list"><section><h3>Dados militares</h3><p>Global Firepower ${s.military.edition}: inventários publicados de ${s.military.gfpCountries} Estados da base. A fonte usa estimativas. O ano indica a edição; os equipamentos podem ter anos de coleta diferentes.</p><p>Banco Mundial complementa efetivos e gastos onde o GFP não tem registro. O ano aparece em cada medida. Efetivo tem cobertura de ${s.military.coverage.personnel}/195 Estados; tanques e aeronaves, ${s.military.coverage.tanks}/195. ${s.military.missing.length} Estados não têm medidas militares disponíveis.</p><p>Gasto anual e orçamento de defesa são medidas próximas, mas distintas. As definições estão no painel de cada Estado. O índice do jogo combina quantidades; não reproduz o PowerIndex GFP.</p><a href="https://www.globalfirepower.com/countries-listing.php" target="_blank" rel="noopener">Global Firepower</a> · <a href="https://data.worldbank.org/indicator/MS.MIL.TOTL.P1" target="_blank" rel="noopener">Efetivos (Banco Mundial)</a> · <a href="${import.meta.env.BASE_URL}data/military.json" target="_blank">Base militar local</a></section><section><span class="eyebrow">POPULAÇÃO</span><h3>Banco Mundial · SP.POP.TOTL</h3><p>194 registros nacionais de 2025. Série atualizada em ${s.population.lastUpdated}. Licença CC BY 4.0.</p><a href="${s.population.url}" target="_blank" rel="noopener">Consultar fonte ↗</a></section><section><span class="eyebrow">EXCEÇÃO DOCUMENTADA</span><h3>Santa Sé / Vaticano · 2024</h3><p>882 residentes em 31/12/2024, segundo o Estado da Cidade do Vaticano. Contagem residente, em vez de estimativa de meio de ano.</p><a href="${s.population.exceptions[0].url}" target="_blank" rel="noopener">Consultar estatística oficial ↗</a></section><section><span class="eyebrow">GEOGRAFIA E BANDEIRAS</span><h3>Natural Earth 1:10m + flag-icons</h3><p>Geometria de domínio público simplificada em 0,025°. Bandeiras SVG locais sob MIT. Projeção Natural Earth I, com D3 e renderização Three.js. Fonte Press Start 2P, de CodeMan38, sob OFL.</p><a href="${s.geometry.url}" target="_blank" rel="noopener">Natural Earth ↗</a> · <a href="${s.flags.url}" target="_blank" rel="noopener">flag-icons ↗</a></section><section><span class="eyebrow">REGRAS CARTOGRÁFICAS</span><p>Há 193 membros da ONU, Santa Sé e Palestina. Dependências não competem: recebem a bandeira do Estado associado. Kosovo é agregado à Sérvia; Taiwan, à China; Saara Ocidental, ao Marrocos; Somaliland, à Somália; Chipre do Norte e zona neutra, a Chipre. São convenções deste jogo, sem posicionamento sobre soberania. A Antártida fica fora.</p><p>${esc(s.populationScope)}</p><p>${esc(s.maritimePolicy)} Os ${data.borders.sea.length} enlaces marítimos são publicados em <a href="${import.meta.env.BASE_URL}data/borders.json" target="_blank">borders.json</a>. Fronteiras terrestres incluem limites de dependências e ultramar, além de enclaves e do contato Botsuana–Zâmbia.</p></section></div><p class="source-line">Preparado em ${new Date(s.preparedAt).toLocaleDateString('pt-BR')}. Todos os dados, fontes e bandeiras acompanham o build; nenhuma API é necessária para jogar.</p>`,'credits');
}
function showHistory(){
  openDialog('ARQUIVO DE CONQUISTAS',`<h2>Histórico de batalhas</h2><p class="dialog-intro">${engine.round} batalhas registradas. Selecione uma para auditar todos os dados.</p><div class="full-history">${historyRows(engine.history,byId,195)}</div>`,'history');
}
function showBattle(round){const battle=engine.history.find(b=>b.round===Number(round));if(battle)openDialog('RELATÓRIO DE BATALHA',battlePanel(battle,byId,{detail:true}),'battle');}
function enterReplay(){
  pause();stopPresentation();map.update(engine.territory.owners);closeDialog();replaying=true;menuOpen=false;map.reset();$('battle-panel').classList.add('hidden');$('replay-bar').classList.remove('hidden');$('replay-round').max=engine.round;$('replay-round').value=engine.round;$('replay-value').textContent=engine.round;render();
}
function leaveReplay(){replaying=false;map.update(engine.territory.owners);$('replay-bar').classList.add('hidden');if(lastBattle)$('battle-panel').classList.remove('hidden');render();}
function exportGame(){
  persist();const blob=new Blob([JSON.stringify(engine.snapshot(),null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`dice-war-${engine.round}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);toast('Partida exportada com seed e histórico completo.');
}
function restore(saved){
  const restored=GameEngine.restore(data.countries,data.borders,saved);
  stopPresentation();engine=restored;busy=false;menuOpen=false;replaying=false;sessionStarted=true;lastBattle=engine.history.at(-1)??null;
  map.update(engine.territory.owners);map.reset();$('replay-bar').classList.add('hidden');$('battle-panel').classList.toggle('hidden',!lastBattle);if(lastBattle)$('battle-panel').innerHTML=battlePanel(lastBattle,byId);closeDialog();render();persist();if(engine.ended)showEnd();else toast('Partida restaurada. Pronta para continuar.');
}
function bind(){
  document.addEventListener('click',async event=>{
    const country=event.target.closest('[data-country]');if(country){const id=country.dataset.country;map.focus([id]);showCountry(id);return;}
    const history=event.target.closest('[data-battle]');if(history){showBattle(history.dataset.battle);return;}
    const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
    if(event.target.closest('a[href="#"]'))event.preventDefault();
    const action=button.dataset.action;
    const actions={
      'start':()=>{reset({start:true});},'continue':()=>{try{restore(SaveManager.read());}catch(error){toast(error.message);}},
      'play':play,'next':async()=>{if(engine.running)pause();await executeOne();},
      'settings':()=>{pause();settingsDialog();},'help':()=>{pause();helpDialog();},'credits':()=>{pause();creditsDialog();},'stats':()=>{pause();openDialog('ESTATÍSTICAS',statisticsScreen(engine,byId),'stats');},
      'menu':()=>{pause();closeDialog();menuOpen=!menuOpen;if(menuOpen){map.reset();$('battle-panel').classList.add('hidden');}else if(lastBattle)$('battle-panel').classList.remove('hidden');render();},
      'close-dialog':closeDialog,'world':()=>map.reset(),'zoom-in':()=>map.zoom(1.25),'zoom-out':()=>map.zoom(0.8),'tilt':()=>map.tilt(),
      'reset':()=>reset({seed:engine.options.seed,rules:engine.options}),'repeat':()=>reset({seed:engine.options.seed,rules:engine.options,start:true}),'new':()=>reset({newSeed:true}),
      'history':()=>{pause();showHistory();},'battle-detail':()=>{pause();showBattle(lastBattle?.round);},
      'follow':()=>{settings.continuous=!settings.continuous;SaveManager.writeSettings(settings);if(settings.continuous)startAuto();else pause();render();},
      'replay-map':enterReplay,'live':leaveReplay,'export':exportGame,'import':()=>$('import-file').click(),'skip':()=>animation.skip()
    };
    try{await actions[action]?.();}catch(error){toast(error.message);}
  });
  document.addEventListener('change',event=>{
    if(!event.target.matches('[data-power]'))return;
    const root=event.target.closest('[data-power-options]'),mode=readPowerOptions(root);
    root.querySelector('[data-power-error]').classList.toggle('hidden',!!mode);
    if(root.dataset.powerOptions==='settings'){root.closest('form').querySelector('[type="submit"]').disabled=!mode;return;}
    settings.powerMode=mode;SaveManager.writeSettings(settings);
    if(!engine.round&&!busy&&mode)engine=new GameEngine(data.countries,data.borders,settings);
    render();
  });
  $('speed').addEventListener('change',event=>{settings.speed=event.target.value;SaveManager.writeSettings(settings);if(settings.speed==='max')animation.skip();});
  $('country-search').addEventListener('change',event=>{const c=data.countries.find(c=>c.name.toLocaleLowerCase()===event.target.value.toLocaleLowerCase()||c.id===event.target.value.toUpperCase());if(c){map.focus([c.id]);showCountry(c.id);event.target.value='';}else toast('Escolha um dos 195 Estados da lista.');});
  $('replay-round').addEventListener('input',event=>{const round=Number(event.target.value);$('replay-value').textContent=round;map.update(engine.ownersAt(round));$('map-status').textContent=`RECONSTRUÇÃO HISTÓRICA · Rodada ${round} · ${195-round} Estados`;});
  document.addEventListener('change',event=>{if(event.target.id==='growth-country')$('growth-chart').innerHTML=growthChart(engine,event.target.value,byId);});
  document.addEventListener('submit',event=>{
    if(event.target.id!=='settings-form')return;event.preventDefault();const powerMode=readPowerOptions(event.target.querySelector('[data-power-options]'));if(!powerMode){event.target.querySelector('[data-power-error]').classList.remove('hidden');return;}const form=new FormData(event.target);
    settings={...settings,mode:form.get('mode'),powerMode,bonusCap:Number(form.get('bonusCap')),seed:String(form.get('seed')).trim()||defaults.seed,quality:form.get('quality'),volume:Number(form.get('volume')),animations:form.has('animations'),selectionAnimation:form.has('selectionAnimation'),follow:form.has('follow'),music:form.has('music')};
    SaveManager.writeSettings(settings);audio.settings=settings;audio.unlock();audio.music();map.settings=settings;map.renderer.setPixelRatio(Math.min(devicePixelRatio,settings.quality==='low'||settings.quality==='auto'&&(navigator.deviceMemory??8)<=4?1:2));map.resize();$('follow-button').classList.toggle('active',settings.continuous);closeDialog();if(!engine.round){if(sessionStarted)reset();else{engine=new GameEngine(data.countries,data.borders,settings);render();}}toast('Configurações salvas.');
  });
  $('import-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>2e6)throw Error('O arquivo excede o limite de 2 MB.');restore(JSON.parse(await file.text()));}catch(error){toast('Falha ao importar: '+error.message);}event.target.value='';});
  document.addEventListener('keydown',event=>{if(event.code==='Space'&&!$('dialog').open&&!['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName)){event.preventDefault();play();}});
  $('dialog').addEventListener('click',event=>{if(event.target===$('dialog')){const r=$('dialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog();}});
  addEventListener('pagehide',persist);document.addEventListener('visibilitychange',()=>{if(document.hidden){if(engine.running)pause();else persist();}});
}
boot().catch(error=>{console.error(error);app.innerHTML=`<div class="boot error-screen"><span class="boot-die">⚄</span><h1>O mundo não carregou.</h1><p>${esc(error.message)}</p><p>Use um navegador com WebGL e sirva o projeto com Vite.</p><button class="button primary" id="retry">Tentar novamente</button></div>`;$('retry').onclick=()=>location.reload();});
