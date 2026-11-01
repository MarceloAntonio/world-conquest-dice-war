# WORLD CONQUEST — DICE WAR

Jogo de observação de conquista mundial para navegadores, em JavaScript ES6, Vite, Three.js, D3-geo e Turf. Contém exatamente **195 Estados**, geografia Natural Earth, bandeiras recortadas nos polígonos, dados populacionais reais, batalhas 3D6 e conquistas integrais de facções. Permite usar só população, só forças armadas ou combinar os dois índices.

**Versão atual: 1.2.1.** Base local preparada em **1º de novembro de 2026**. Os anos de referência variam por fonte e estão indicados em cada registro.

## Recursos da versão atual

- Duas caixas de seleção para população e forças armadas. Marcar ambas combina os índices em partes iguais; sem nenhuma, o jogo bloqueia o início de uma nova partida.
- Sorteio opcional no mapa: os destaques desaceleram até selecionar o atacante, a câmera se aproxima e a seleção continua apenas entre os inimigos conectados à sua fronteira.
- Cálculo animado do bônus antes dos dados, mostrando as duas forças, a diferença e o limite aplicado.
- Batalhas manuais ou contínuas pelo botão **Seguir batalha**, sem execução em lote.
- Vencedor com nome verde e confetes; perdedor com nome vermelho e movimento pendurado por um canto. Bandeiras e dados mantêm seus tamanhos, com textos de cálculo maiores.
- Ranking, histórico auditável, gráficos, reconstrução do mapa por rodada e salvamento/importação/exportação de partidas reproduzíveis por seed.
- Interface em português, layout móvel e preferência por movimento reduzido.

## Resumo da base incluída

| Item | Conteúdo local |
| --- | --- |
| Estados competidores | 195: 193 membros da ONU, Santa Sé e Palestina |
| Populações nacionais | 194 registros de 2025 do Banco Mundial; Vaticano: 882 residentes em 2024 |
| Total populacional da base | 8.177.227.025 habitantes |
| Banco Mundial | Série populacional atualizada pela fonte em 08/10/2026 |
| Inventários militares | Global Firepower, edição 2026, para 143 Estados da base |
| Cobertura militar complementar | Efetivos: 174/195; gasto/orçamento: 168/195 |
| Equipamentos disponíveis | Tanques: 143/195; aeronaves: 143/195; embarcações: 111/195 |
| Estados sem medidas militares | 21; ausência fica identificada e não recebe valores fictícios |
| Conexões geográficas | 318 fronteiras terrestres e 68 rotas marítimas fixas |

Os números da tabela descrevem os arquivos versionados neste repositório. A preparação offline não busca dados novos; as instruções de atualização das fontes estão abaixo. O total populacional é a soma dos 195 registros, não o agregado mundial oficial da ONU ou do Banco Mundial.

## Instalar e executar

Requer Node.js 20.19+ ou 22.12+ e npm. Para clonar usando SSH:

```sh
git clone git@github.com:MarceloAntonio/world-conquest-dice-war.git
cd world-conquest-dice-war
```

Na pasta do projeto:

```sh
npm ci
npm run dev
```

Abra a URL que o Vite mostrar, normalmente `http://localhost:5173`. Os dados e as bandeiras já acompanham o projeto. **Não é necessário consultar APIs nem preparar os dados para jogar.** Sirva via HTTP; abrir `index.html` diretamente pelo protocolo `file:` não funciona.

```sh
npm run check       # validação dos dados + testes do motor + build
npm run preview     # serve o build em localhost:4173
```

`dist/` é a entrega estática completa. Não há servidor de aplicação, banco de dados remoto ou chaves de API. WebGL e LocalStorage são recursos de navegador utilizados; a exportação JSON permite copiar partidas entre dispositivos.

## Jogar

- Inicie no menu ou execute a próxima batalha. O jogador observa a simulação.
- Controle a velocidade entre 0,5× e máxima. Jogar batalha e Próxima batalha executam uma rodada. Ative Seguir batalha para continuar automaticamente e desative para parar depois da batalha atual. Uma partida global tem exatamente 194 batalhas decisivas, além das rolagens de desempate.
- Arraste para mover o mapa; use scroll ou +/− para zoom. O botão do globo retorna à vista mundial; o losango inclina o plano. Há seleção ampliada de microestados e busca dos 195 nomes.
- O painel de batalha mostra três dados por participante, bônus, totais, atacante, defensor, rota e vencedor. Nos detalhes, todas as rolagens de desempate ficam registradas.
- Em Estatísticas, explore gráficos, selecione uma facção, exporte a partida ou reconstrua o mapa por rodada. Voltar à partida restaura o mapa atual.
- A partida é salva automaticamente após cada batalha, pausa e saída da página. Continuar recupera o estado, incluindo gerador aleatório, histórico, facções e tempo. Importação fica em Configurações.
- Reiniciar e Repetir conservam seed **e regras da partida**. Nova simulação gera outra seed e usa as configurações selecionadas. Mudanças de regra de força/fronteiras/bônus/seed valem para a próxima partida.
- Espaço inicia/pausa quando o foco não está em um controle. Há suporte a teclado, preferência por movimento reduzido e layout móvel. Em telas pequenas, o ranking também aparece em Estatísticas.

## Regras determinísticas

O gerador usa hash FNV-1a da string da seed e Mulberry32 com estado uint32 serializável. A escolha é uniforme entre todas as facções que possuem pelo menos uma conexão inimiga; depois é uniforme entre as facções inimigas distintas. O número de fronteiras, a área e a população não dão peso ao sorteio.

Força populacional:

```js
Math.max(1, Math.min(20, Math.round(
  1 + 19 * (Math.log(P) - Math.log(Pmin)) /
  (Math.log(Pmax) - Math.log(Pmin))
)))
```

`P` é a população controlada atual. `Pmin` e `Pmax` são, respectivamente, a menor e a maior população nacional **iniciais**, fixas durante toda a partida. A força é recalculada após cada absorção, com teto 20. Nos dados incluídos, Pmin é 882 e Pmax é 1.463.865.525.

O modo padrão continua sendo população. Escolha a regra no menu inicial ou em Configurações. A regra é fixa durante a partida e fica no salvamento.

Cada participante rola exatamente três D6 independentes. Apenas quem tem maior força recebe `min(limite, força − forçaRival)` como bônus; o padrão é 12, configurável de 0 a 19. Empates rolam novamente os três dados de ambos os lados com os mesmos bônus, até haver vencedor. O histórico guarda todas essas tentativas.

Quem vence absorve **todos** os territórios e toda a população da facção derrotada, inclusive quando vence o defensor. Cada Estado original tem exatamente um controlador. Não há crescimento demográfico, duplicação nem alteração da população inicial. Cada batalha elimina uma facção. O motor é síncrono e independente do renderizador: `new GameEngine(countries, borders, options).run()` termina sem DOM, WebGL ou animações.

## Dados e suas limitações

### Forças armadas

No menu inicial ou em Configurações, marque **População**, **Forças armadas** ou ambas. As duas caixas marcadas ativam o modo combinado. Sem nenhuma, o início de uma nova partida fica bloqueado. O ranking e o bônus seguem a regra escolhida. A população continua sendo contabilizada nos três modos.

O arquivo `public/data/military.json` acompanha o build. Há inventários de 143 Estados do [Global Firepower 2026](https://www.globalfirepower.com/countries-listing.php); Taiwan e Kosovo não são adicionados aos competidores ou a inventários de outros Estados. O [Banco Mundial, MS.MIL.TOTL.P1](https://data.worldbank.org/indicator/MS.MIL.TOTL.P1), complementa efetivos; [MS.MIL.XPND.CD](https://data.worldbank.org/indicator/MS.MIL.XPND.CD) complementa gasto militar. A cobertura final é:

| Medida | Estados com registro |
| --- | ---: |
| Efetivo ativo + paramilitar | 174/195 |
| Gasto ou orçamento de defesa | 168/195 |
| Tanques | 143/195 |
| Aeronaves | 143/195 |
| Embarcações | 111/195 |

O GFP publica estimativas de inventário. O ano 2026 identifica a edição; não assegura que todos os equipamentos foram contados nesse ano. Os dados complementares do Banco Mundial podem ser mais antigos, inclusive efetivos de 2020. Cada observação guarda valor, ano, definição e URL. O painel do país permite consultar ativos, reservistas, paramilitares, veículos, artilharia, submarinos e o PowerIndex GFP quando disponíveis. Reservistas e essas categorias adicionais são informativos; não recebem peso extra no combate.

O **índice militar do jogo** usa cinco componentes: efetivo ativo + paramilitar (35%), gasto/orçamento (25%), tanques (15%), aeronaves (15%) e embarcações (10%). Para cada componente:

```js
const componente = Math.min(1, Math.log1p(totalConhecido) / Math.log1p(maiorValorNacionalInicial));
const indiceMilitar = Math.round(1 + 19 * somaPonderadaDosComponentes);
const indiceCombinado = Math.round((indicePopulacional + indiceMilitar) / 2);
```

Os máximos nacionais são fixos no início. Os pesos permanecem fixos mesmo com dados parciais; não são redistribuídos para premiar ausência de registros. O índice considera só a capacidade medida. Gasto anual e orçamento aprovado não são a mesma medida, embora ocupem o componente financeiro. Dólares são correntes, de anos que podem diferir; não há correção por inflação ou paridade de poder de compra. As definições ficam visíveis nas fontes.

**Ausência de informação é diferente de zero.** Há 21 Estados sem nenhuma das cinco medidas. Eles mostram “Não disponível”, e não um efetivo fictício. Quando um dos participantes não possui índice militar, ambos usam componente militar neutro 1 nessa batalha. Em forças armadas, nenhum dos lados recebe bônus militar. No combinado, somente a diferença populacional pode produzir vantagem, com metade do peso. O histórico registra essa condição. Depois de conquistar territórios com dados conhecidos, uma facção passa a ter um índice militar parcial calculável.

Nas conquistas, os recursos publicados de todos os territórios são somados, sem perdas, produção de armas ou recrutamento. Não há duplicação de pessoal ou inventário. Totais mostram quantos Estados possuem observação e quais anos foram usados. Isso representa recursos controlados na simulação, não a capacidade atual de uma força real. Treinamento, prontidão, tecnologia específica dos equipamentos, alianças e armas nucleares ficam fora do modelo. O PowerIndex GFP é mostrado como referência do Estado original e não é somado ou convertido em chance de vitória.

Para atualizar as fontes e preparar os dados:

```sh
python3 scripts/downloadMilitary.py  # requer internet, Python 3 e somente a biblioteca padrão
npm run data:military               # prepara a base usando snapshots locais
npm run data:validate
```

`gfp-inventories.json` preserva os valores extraídos; `manifest.json` guarda URLs e SHA-256 das páginas consultadas. O preparador funciona sem as páginas HTML quando o snapshot extraído corresponde ao manifesto. HTMLs de consulta ficam ignorados no Git e não entram no build ou no ZIP distribuído. `npm run data:prepare` também reconstrói a parte militar.

### Revisão da interface

A interface usa a paleta `#002042`, `#1f4575`, `#4374A8`, `#84AEDB`, `#CCE5FF`. Bandeiras mantêm suas cores nacionais. A revisão seguiu [no-ai-slop](https://github.com/petergyang/no-ai-slop) e [Humanizer](https://github.com/blader/humanizer): foram removidos slogans, subtítulos repetidos e frases decorativas; os controles receberam descrições diretas. As instruções consultadas estão em `docs/review-skills/`.

A execução em lote foi removida. O botão **Seguir batalha** agora liga e desliga batalhas contínuas; a movimentação automática da câmera tem sua própria opção nas configurações.

Para testar a revisão no navegador, com o servidor local em execução:

```sh
GAME_URL=http://127.0.0.1:5173 node scripts/militarySmoke.js
```

O teste percorre os três modos, partidas até o fim, seed, retomada, inventários com fontes e telas desktop/móvel. Use a porta informada pelo Vite se a 5173 estiver ocupada.

O conjunto inclui os 193 membros da ONU, Santa Sé (VA/VAT, representada pelo Vaticano) e Palestina (PS/PSE). Há uma lista ISO explícita no preparador; membros não são inferidos do campo `SOV_A3`, que atribui a Palestina a outro soberano no Natural Earth.

| Dado | Fonte / licença | Referência |
| --- | --- | --- |
| 194 populações nacionais | [Banco Mundial SP.POP.TOTL](https://data.worldbank.org/indicator/SP.POP.TOTL), CC BY 4.0 | 2025; API atualizada em 08/10/2026 |
| Santa Sé / Vaticano | [Estado da Cidade do Vaticano](https://www.vaticanstate.va/en/state-and-government/general-informations/population.html) | 882 residentes em 31/12/2024; exceção identificada |
| Geometria | [Natural Earth Admin 0 Countries 1:10m](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/), domínio público | Snapshot local; simplificação de 0,025° |
| Bandeiras nacionais | [flag-icons](https://github.com/lipis/flag-icons), MIT | SVGs locais, licença incluída |
| Fonte pixelada | [Press Start 2P / CodeMan38](https://fonts.google.com/specimen/Press+Start+2P), OFL | Fonte e licença locais |

Cada registro publica seu ano e URL de origem. A soma dos registros é **8.177.227.025 habitantes**. Trata-se da **população da base de 195 Estados**, não do agregado mundial oficial do Banco Mundial ou da ONU. Preservamos a cobertura demográfica nacional de cada fonte. Não adicionamos separadamente Taiwan, Kosovo ou dependências, evitando apresentar uma consolidação não validada ou duplicar habitantes. Portanto, 100% significa 100% da base do jogo. A contagem vaticana é de residentes no fim do ano, enquanto o indicador do Banco Mundial é de população nacional, em geral de meio de ano.

### Fronteiras terrestres e marítimas

318 arestas terrestres são obtidas dos arcos compartilhados do Natural Earth **antes** da simplificação. Correções explícitas asseguram enclaves (Vaticano, San Marino, Mônaco, Andorra, Liechtenstein) e o contato Botsuana–Zâmbia. Fronteiras dos territórios ultramarinos pertencem à facção do soberano: por exemplo, a França tem conexão com o Brasil pela Guiana Francesa. A cada batalha, as arestas geográficas permanecem fixas, mas seus controladores são novamente consultados para obter a fronteira entre facções. A renderização oculta arcos políticos entre territórios do mesmo controlador.

O modo global acrescenta **68 rotas marítimas fixas**, listadas em `public/data/borders.json`. Conectam costas e arquipélagos próximos: Japão–Coreia/Rússia/China, Austrália–Indonésia/Papua-Nova Guiné/Nova Zelândia, Caribe, Pacífico e Índico. A ligação Estados Unidos–Rússia representa o estreito de Bering; Canadá–Dinamarca representa a proximidade com a Groenlândia. São conexões de jogo, não limites marítimos legais nem rotas navegáveis calculadas. O preparador valida por busca em grafo que todos os 195 Estados pertencem ao mesmo componente. Não existem ataques internacionais aleatórios sem conexão elegível.

No modo terrestre não são criadas conexões para ilhas isoladas. Quando nenhuma aresta liga controladores distintos, a partida termina em **impasse geográfico**, com sobreviventes identificados.

### Ultramar e territórios controversos

Unidades dependentes são agrupadas pelos campos do Natural Earth: Reino Unido, França, Países Baixos, Estados Unidos, Dinamarca, Austrália, Nova Zelândia, Finlândia etc. Não disputam independentemente. A Antártida fica excluída.

Para manter exatamente os competidores solicitados, existem convenções cartográficas explícitas: Kosovo → Sérvia; Taiwan → China; Saara Ocidental → Marrocos; Somaliland → Somália; Chipre do Norte e zona neutra → Chipre; Siachen → Índia; campo de gelo patagônico → Argentina; Bir Tawil → Egito; Spratly → Filipinas; Bajo Nuevo e Serranilla → Colômbia; Scarborough → China; Guantánamo → Cuba. Essas atribuições são **convenções do jogo, não reconhecimento de soberania**. Nas demais áreas, mantém-se o recorte do snapshot Natural Earth. As áreas em km² vêm da geometria e não devem ser usadas como levantamento territorial oficial.

### Preparação reproduzível

Os snapshots de origem ficam em `scripts/raw/`, fora do diretório público. O preparador trabalha offline:

```sh
npm run data:prepare
npm run data:validate
```

Ele valida 195 códigos únicos, correspondência mapa/população/bandeira, populações positivas, vizinhança simétrica, orientação esférica dos polígonos e conectividade global. Preserva microestados, corrige a orientação de pequenos anéis simplificados e gera os arcos para remover fronteiras internas visualmente. Bandeiras são copiadas da dependência `flag-icons`.

Para obter novos snapshots, com acesso à rede:

```sh
node scripts/downloadData.js
npm run data:prepare
npm run check
```

O download registra URLs, data e SHA-256. O intervalo populacional da URL pode ser atualizado quando um novo ano estiver disponível. Dados novos podem invalidar partidas antigas; a importação detecta incompatibilidade reproduzindo o histórico e verificando proprietários, facções e RNG.

## Arquitetura

```text
public/data/         dados preparados, população, inventários, GeoJSON, rotas e fontes
public/assets/       bandeiras e fonte locais com licenças
scripts/raw/         snapshots originais auditáveis
scripts/            download, preparação, validação, teste de navegador
src/core/           RNG, população, forças armadas, batalha, território e GameEngine
src/graphics/       mapa Three.js, animação de dados e áudio Web Audio
src/services/       carregamento e LocalStorage
src/ui/             ranking, histórico, país, batalha e gráficos SVG
src/main.js         menus, controles e coordenação assíncrona
src/styles/         identidade visual responsiva
tests/              testes do motor sem navegador
```

Fases: `menu → paused/running → selection → bonus → battle → conquest → paused/running → finished/stalemate`. As fases de apresentação são opcionais. Eventos `state`, `battle`, `conquest`, `change`, `end` permitem integrar consumidores sem depender de animação. Antes do duelo, `previewBattle()` consulta uma cópia do RNG para apresentar os participantes e o bônus sem alterar a partida. A escolha real continua sendo feita pelo motor. A resolução e a absorção são atômicas quando a etapa de dados começa. A velocidade altera apenas a programação e os efeitos, nunca consome o RNG da simulação. Efeitos de partículas usam Math.random(), separado do gerador determinístico da simulação.

O mapa é um plano projetado, com malhas reais e texturas de baixa resolução por polígono; efeitos de profundidade, inclinação e câmera suave permanecem separados da cartografia. Um shader espalha a nova bandeira pelo território; o contorno pulsa e partículas quadradas sinalizam conquistas. As animações de dados usam perspectiva CSS. Texturas são compartilhadas entre todos os territórios controlados pela mesma facção. Qualidade automática limita resolução em dispositivos com pouca memória, e o modo econômico reduz partículas.

Efeitos sonoros e música são sintetizados com Web Audio após interação do usuário; não usam mídia de terceiros. O histórico tem no máximo 194 eventos, com todas as tentativas de desempate. O log reconstrói estados anteriores sem duplicar snapshots completos.

## Testes

Há 32 testes automatizados: 16 do motor e da base geográfica, dez dos dados e modos militares e seis da apresentação e seleção de força. Eles cobrem dados 3D6, bônus, desempates, seleção uniforme, vizinhos válidos, conquista pelo atacante/defensor, absorção múltipla, atualização de fronteiras, conservação de população, eliminação, fim global, impasse terrestre, seeds, snapshots e salvamento. A suíte inclui 30 seeds globais completas; a prévia do sorteio também é comparada à batalha efetiva sem consumir o RNG da partida.

Para o fluxo no Chromium, com o servidor de desenvolvimento em execução:

```sh
node scripts/browserSmoke.js
```

O script usa `/usr/bin/chromium`, configurável por `CHROMIUM_PATH`; `GAME_URL` altera a URL. Verifica 195 malhas, execução manual e contínua, reload/continuar, seed, replay histórico, seleção do Vaticano, vitória global, impasse terrestre e viewport móvel. Capturas são gravadas em `test-results/`. O script depende do handle de QA disponível apenas no Vite de desenvolvimento. Para validar o artefato de produção, `scripts/productionSmoke.js` testa o fluxo pela interface, sem esse handle.

## Deploy estático

**Vercel**: importe a pasta, selecione Vite, comando `npm run build`, saída `dist`. Não é necessário rewrite de SPA: o jogo usa uma única página sem rotas de servidor.

**Netlify**: use `npm run build` e diretório `dist`; o arquivo `netlify.toml` já contém os valores.

**Qualquer host estático**: publique o conteúdo de `dist/` após `npm ci && npm run build`. O build usa caminhos relativos e pode ser servido em subpastas. Configurações e salvamentos pertencem à origem do navegador, então uma troca de domínio exige exportar/importar o JSON da partida.

O jogo deixa de depender das APIs após a instalação/build. A primeira visita ainda requer baixar os arquivos do site; não há service worker de cache offline. O projeto não inclui multiplayer, dados demográficos ao vivo nem mapas de fronteiras legais em tempo real.

## Sorteio animado e cálculo do bônus

A opção **Sortear atacante e defensor com destaques no mapa** ativa uma passagem rápida pelas facções elegíveis, com intervalos crescentes até parar no atacante. A câmera se aproxima; depois a passagem usa apenas as facções inimigas conectadas à fronteira atual, incluindo rotas marítimas quando habilitadas. A facção inteira recebe destaque, inclusive territórios conquistados. Em fronteiras terrestres, a câmera do duelo pode focar o arco real entre as facções.

Os participantes são definidos pela seed. O movimento visual usa um sorteio separado, por isso alterar a velocidade, desativar ou pular a animação não altera o resultado. Reiniciar durante a seleção cancela a apresentação sem consumir a próxima batalha.

Antes dos dados, as duas forças se aproximam no painel e se transformam no bônus. O painel mostra a subtração, o limite configurado e quem recebe a vantagem. Empates de força geram bônus zero; a regra militar de dados insuficientes continua sendo respeitada. Animações desativadas e velocidade Máxima pulam essas etapas.

As preferências antigas de força são convertidas nas caixas correspondentes. A antiga preferência de câmera continua controlando só a câmera; batalhas contínuas começam desativadas para quem não tiver uma preferência nova salva.

Teste específico da apresentação e dos controles:

```sh
GAME_URL=http://127.0.0.1:5173 node scripts/presentationSmoke.js
```

O teste verifica ausência de força, preservação das escolhas, seleção só de inimigos válidos, bônus antes dos dados, reprodução da seed, cancelamento, execução contínua e leitura em tela móvel.

## Resultado visual do duelo

O nome do vencedor fica verde e recebe uma explosão curta de confetes a partir do conjunto de nome e bandeira. O nome do perdedor fica vermelho e o conjunto balança preso por um canto, sem retângulos decorativos sobre a bandeira. O selo antigo “VENCEU” foi removido. Os efeitos acompanham a velocidade escolhida e respeitam animações desativadas e preferência por movimento reduzido; as cores continuam identificando o resultado.

```sh
GAME_URL=http://127.0.0.1:5173 node scripts/resultSmoke.js
```

O teste verifica vitórias do atacante e do defensor, cores, confetes, movimento pendurado, tela móvel e apresentação sem animações.
