# WORLD CONQUEST — DICE WAR

Jogo de observação de conquista mundial para navegadores, em JavaScript ES6, Vite, Three.js, D3-geo e Turf. Contém exatamente **195 Estados**, geografia Natural Earth, bandeiras recortadas nos polígonos, dados populacionais reais, batalhas 3D6 e conquistas integrais de facções.

## Instalar e executar

Requer Node.js 20.19+ ou 22.12+ e npm. Na pasta deste arquivo:

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
- Controle a velocidade entre 0,5× e máxima; execute 10, 50, 100, 500 batalhas ou até o fim. Uma partida global tem exatamente 194 batalhas decisivas, além das rolagens de desempate.
- Arraste para mover o mapa; use scroll ou +/− para zoom. O botão do globo retorna à vista mundial; o losango inclina o plano. Há seleção ampliada de microestados e busca dos 195 nomes.
- O painel de batalha mostra três dados por participante, bônus, totais, atacante, defensor, rota e vencedor. Nos detalhes, todas as rolagens de desempate ficam registradas.
- Em Estatísticas, explore gráficos, selecione uma facção, exporte a partida ou reconstrua o mapa por rodada. Voltar à partida restaura o mapa atual.
- A partida é salva automaticamente após cada batalha, pausa e saída da página. Continuar recupera o estado, incluindo gerador aleatório, histórico, facções e tempo. Importação fica em Configurações.
- Reiniciar e Repetir conservam seed **e regras da partida**. Nova simulação gera outra seed e usa as configurações selecionadas. Mudanças de fronteiras/bônus/seed valem para a próxima partida.
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

Cada participante rola exatamente três D6 independentes. Apenas quem tem maior força recebe `min(limite, força − forçaRival)` como bônus; o padrão é 12, configurável de 0 a 19. Empates rolam novamente os três dados de ambos os lados com os mesmos bônus, até haver vencedor. O histórico guarda todas essas tentativas.

Quem vence absorve **todos** os territórios e toda a população da facção derrotada, inclusive quando vence o defensor. Cada Estado original tem exatamente um controlador. Não há crescimento demográfico, duplicação nem alteração da população inicial. Cada batalha elimina uma facção. O motor é síncrono e independente do renderizador: `new GameEngine(countries, borders, options).run()` termina sem DOM, WebGL ou animações.

## Dados e suas limitações

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
public/data/         dados preparados, GeoJSON, arcos, rotas e fontes
public/assets/       bandeiras e fonte locais com licenças
scripts/raw/         snapshots originais auditáveis
scripts/            download, preparação, validação, teste de navegador
src/core/           RNG, população, batalha, território e GameEngine
src/graphics/       mapa Three.js, animação de dados e áudio Web Audio
src/services/       carregamento e LocalStorage
src/ui/             ranking, histórico, país, batalha e gráficos SVG
src/main.js         menus, controles e coordenação assíncrona
src/styles/         identidade visual responsiva
tests/              testes do motor sem navegador
```

Fases: `menu → paused/running → battle → conquest → paused/running → finished/stalemate`. Eventos `state`, `battle`, `conquest`, `change`, `end` permitem integrar consumidores sem depender de animação. A resolução e a absorção são atômicas; a camada visual apresenta o resultado já calculado. A velocidade altera apenas a programação e os efeitos, nunca consome o RNG da simulação. Efeitos de partículas usam um RNG visual separado.

O mapa é um plano projetado, com malhas reais e texturas de baixa resolução por polígono; efeitos de profundidade, inclinação e câmera suave permanecem separados da cartografia. Um shader espalha a nova bandeira pelo território; o contorno pulsa e partículas quadradas sinalizam conquistas. As animações de dados usam perspectiva CSS. Texturas são compartilhadas entre todos os territórios controlados pela mesma facção. Qualidade automática limita resolução em dispositivos com pouca memória, e o modo econômico reduz partículas.

Efeitos sonoros e música são sintetizados com Web Audio após interação do usuário; não usam mídia de terceiros. O histórico tem no máximo 194 eventos, com todas as tentativas de desempate. O log reconstrói estados anteriores sem duplicar snapshots completos.

## Testes

Há 16 testes automatizados para dados 3D6, bônus, desempates, seleção uniforme, vizinhos válidos, conquista pelo atacante/defensor, absorção múltipla, atualização de fronteiras, conservação de população, eliminação, fim global, impasse terrestre, seeds, snapshots e salvamento. A suíte inclui 30 seeds globais completas.

Para o fluxo no Chromium, com o servidor de desenvolvimento em execução:

```sh
node scripts/browserSmoke.js
```

O script usa `/usr/bin/chromium`, configurável por `CHROMIUM_PATH`; `GAME_URL` altera a URL. Verifica 195 malhas, execução em lote, reload/continuar, seed, replay histórico, seleção do Vaticano, vitória global, impasse terrestre e viewport móvel. Capturas são gravadas em `test-results/`. O script depende do handle de QA disponível apenas no Vite de desenvolvimento. Para validar o artefato de produção, `scripts/productionSmoke.js` testa o fluxo pela interface, sem esse handle.

## Deploy estático

**Vercel**: importe a pasta, selecione Vite, comando `npm run build`, saída `dist`. Não é necessário rewrite de SPA: o jogo usa uma única página sem rotas de servidor.

**Netlify**: use `npm run build` e diretório `dist`; o arquivo `netlify.toml` já contém os valores.

**Qualquer host estático**: publique o conteúdo de `dist/` após `npm ci && npm run build`. O build usa caminhos relativos e pode ser servido em subpastas. Configurações e salvamentos pertencem à origem do navegador, então uma troca de domínio exige exportar/importar o JSON da partida.

O jogo deixa de depender das APIs após a instalação/build. A primeira visita ainda requer baixar os arquivos do site; não há service worker de cache offline. O projeto não inclui multiplayer, dados demográficos ao vivo nem mapas de fronteiras legais em tempo real.
