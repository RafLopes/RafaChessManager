# Histórico do jogador — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar na tela do jogador a posição na Copa presencial do ano, o resumo das partidas e a lista de jogos do confronto direto, movendo a regra da Copa para um arquivo único sem mudar nada do que a página da Copa mostra.

**Architecture:** Duas bibliotecas puras, sem banco e sem DOM, carregadas como `<script>` clássico no navegador e importadas pelo Node nos testes: `public/js/copa.js` (define `globalThis.Copa`) e `public/js/estatisticasJogador.js` (define `globalThis.EstatisticasJogador`). `ResultadoCopa.js` e `HistoricoJogador.js` buscam os dados no Firestore e chamam essas funções.

**Tech Stack:** JavaScript puro (sem build), Firebase 8.10 (compat), Bootstrap 5.3, Chart.js 4.4.4, testes com `node --test` (Node 24, sem dependências novas).

**Spec:** `docs/superpowers/specs/2026-11-24-historico-jogador-design.md`

## Global Constraints

- A página da Copa (`ResultadoCopa.html`) tem de mostrar exatamente o mesmo de antes: ranking (nomes, pontos, ordem, inclusive empatados), lista de etapas (nome, data, campeão, status) e pódio.
- Nenhuma gravação no Firestore real. Testes de tela só no emulador (`npm run emuladores` + `npm run copiar-dados-reais`, que só lê o banco real).
- Copa: só presencial, ano corrente, `copa === true`, ordem oficial gravada em `Resultado`, bônus `[6, 4, 3, 2, 1]` + `pontos` do torneio, soma pelo nome, ignora nome vazio/`'BYE'`/`'undefined'`.
- Jogador na Copa é achado pelo nome do cadastro (`players.Nome`), comparando sem espaços no começo/fim.
- Partida contra BYE não conta. Aproveitamento = (V + ½E) ÷ partidas.
- Textos da tela em português, no padrão visual do site (`stat-card`, `stat-win/draw/loss`, `UI.escapar`, `UI.formatarData`, `UI.badgePosicao`).
- Publicação só com `firebase deploy --only hosting`, depois de conferir que o site no ar é igual ao último commit, e só com o "sim" do Rafael.

## Review Focus

- Torneio em andamento (sem `Resultado`, partidas com `resultado: ''`): não pode contar partida nem quebrar a Copa → testes `ignora resultado vazio` (Task 3) e `etapa sem Resultado entra só na lista` (Task 1).
- Nomes com espaço sobrando (`"Gilson da Silva C. Filho "`): o jogador do cadastro tem de ser encontrado na Copa → teste `acha jogador ignorando espaços` (Task 3).
- Jogador sem nenhuma etapa da Copa no ano → `copaDoJogador` devolve `null` e a tela mostra "Ainda não jogou etapas da Copa {ano}" → teste `jogador fora da Copa` (Task 3).
- Empate de pontos na Copa: a ordem tem de ser a mesma de hoje (ordem de primeira aparição) → teste `empatados mantêm ordem de aparição` (Task 1).
- Jogador sem nenhuma partida (só inscrito): resumo com zeros e aproveitamento `null`, sem divisão por zero → teste `resumo vazio` (Task 3).

---

### Task 1: Regra da Copa em `copa.js` (com testes)

**Files:**
- Create: `public/js/copa.js`
- Create: `tests/copa.test.mjs`
- Modify: `package.json` (script `"test": "node --test tests/"`)

**Interfaces:**
- Produces: `Copa.calcular(torneios: Array<{id, nome, data, copa, Formato, Resultado?}>, ano: number) -> { torneiosDoAno: Array<torneio>, classificacao: Array<{nome: string, pontos: number}> }`
  - `torneios` na ordem em que vieram do Firestore; a função percorre nessa ordem.
  - `torneiosDoAno`: os de `copa === true` cujo `parseInt(data.substring(0, 4)) === ano`, na ordem recebida (inclui os sem `Resultado`).
  - Nome do resultado: `j.jogador ? j.jogador.nome : j.nome`. Bônus pelo índice no array `Resultado` como gravado (sem reordenar).
  - `classificacao`: `Array.from(mapa.entries())`, filtra nomes inválidos, `sort((a, b) => b.pontos - a.pontos)` (estável).
- Produces: `Copa.BONUS = [6, 4, 3, 2, 1]`

- [ ] **Step 1: Escrever os testes em `tests/copa.test.mjs`** (importa com `await import('../public/js/copa.js')` e usa `globalThis.Copa`)
  - `soma bônus e pontos pela ordem gravada`: torneio 2026 com `Resultado` [A 5pts, B 5pts, C 3pts] → A = 11, B = 9, C = 6.
  - `ignora outros anos e copa false`: torneio de 2025 e torneio 2026 com `copa: false` não entram em nada.
  - `etapa sem Resultado entra só na lista`: aparece em `torneiosDoAno`, não muda a classificação.
  - `ignora BYE e nomes vazios`: entradas `'BYE'`, `'undefined'`, `''` não aparecem.
  - `formato antigo jogador.nome`: `{ jogador: { nome: 'D' }, pontos: 2 }` soma como D.
  - `empatados mantêm ordem de aparição`: dois torneios em que X (aparece primeiro) e Y terminam com o mesmo total → `classificacao` tem X antes de Y.
  - `não reordena suíço`: `Formato: 'suico'`, Resultado [A 4pts SB 8, B 4pts SB 12] → A recebe 6, B recebe 4.

- [ ] **Step 2: Rodar `npm test`** — Expected: FAIL (`Copa` indefinido).

- [ ] **Step 3: Implementar `Copa.calcular` em `public/js/copa.js`** como script clássico: `globalThis.Copa = { BONUS, calcular }`, sem `import`/`export`, sem Firestore, sem DOM, sem `console.log`. A lógica é a de `ResultadoCopa.js:26-115` hoje, transcrita sem mudar regra.

- [ ] **Step 4: Rodar `npm test`** — Expected: todos PASS.

- [ ] **Step 5: Conferir com os dados reais de 2025 e 2026.** Script descartável na pasta temporária (fora do projeto): lê `torneio` do banco real só com GET (igual a `scripts/copiar-dados-reais-para-emulador.mjs`), converte os campos e compara `Copa.calcular(..., 2025)` e `(..., 2026)` com o ranking "correto" da simulação (`simular-copa.mjs`). Expected: 0 diferenças nos dois anos (2026: 103 jogadores; Mateus Paiano 368, Graciano Garcia 281,5).

- [ ] **Step 6: Commit** `public/js/copa.js`, `tests/copa.test.mjs`, `package.json` — "Copa: regra de pontuação num arquivo único (copa.js) com testes".

### Task 2: Página da Copa passa a usar `copa.js` (sem mudar nada na tela)

**Files:**
- Modify: `public/js/ResultadoCopa.js:1-125` (função `atualizarResultadosCopa`)
- Modify: `public/ResultadoCopa.html:67-68` (incluir `<script src="./js/copa.js"></script>` antes de `ResultadoCopa.js`)

**Interfaces:**
- Consumes: `Copa.calcular(torneios, ano)` da Task 1.

- [ ] **Step 1: Foto da página antes da mudança.** Emulador rodando com dados reais copiados. Abrir `http://127.0.0.1:5000/ResultadoCopa.html` (forçar recarga do script com `fetch('js/ResultadoCopa.js', {cache:'reload'})` + reload) e capturar com JS: `ranking` = lista de `[nome, pontos]` das linhas de `#resultadosCopa tbody tr` na ordem; `etapas` = `innerText` normalizado de cada `#torneiosLista li`; `podio` = `innerText` normalizado do pódio. Salvar o JSON em `<scratchpad>/copa-antes.json`.

- [ ] **Step 2: Trocar o laço de cálculo por `Copa.calcular`.** `atualizarResultadosCopa` mantém a mesma busca (`collection('torneio').where('copa','==',true).get()`), monta a lista `[{ id: doc.id, ...doc.data() }]` na ordem de `snapshot.docs`, chama `Copa.calcular(lista, new Date().getFullYear())` e passa `classificacao` para `exibirClassificacao` e `torneiosDoAno` para `exibirTorneios`. `exibirClassificacao`, `exibirTorneios` e o listener do botão ficam intactos.

- [ ] **Step 3: Foto depois e comparação.** Recarregar (com o mesmo truque de cache) e capturar o mesmo JSON. Expected: idêntico a `copa-antes.json` (ranking item por item, etapas, pódio) e nenhum erro no console. Se houver qualquer diferença, parar e investigar antes de seguir.

- [ ] **Step 4: Commit** `public/js/ResultadoCopa.js`, `public/ResultadoCopa.html` — "Página da Copa usa copa.js (resultado idêntico, conferido com dados reais)".

### Task 3: Estatísticas do jogador em `estatisticasJogador.js` (com testes)

**Files:**
- Create: `public/js/estatisticasJogador.js`
- Create: `tests/estatisticasJogador.test.mjs`

**Interfaces:**
- Consumes: formato de `Copa.calcular` (Task 1).
- Produces (em `globalThis.EstatisticasJogador`):
  - `partidasDoJogador(torneios, jogadorId) -> Array<{ torneioId, torneioNome, data, rodada: number|null, cor: 'brancas'|'pretas', adversarioId, adversarioNome, resultado: 'V'|'E'|'D' }>` — lê `historicoPartidas` (chaves `rodadaN`, ordenadas pelo número) ou, se não houver, `Partidas` (rodada `null`). Resultados aceitos: `'1-0'`, `'0-1'`, `'1/2-1/2'`, `'½-½'`; qualquer outro (inclusive `''`) é ignorado. Ignora partidas com `id === 'bye'` ou nome `'BYE'` em qualquer lado. Ids de `brancas`/`pretas` podem ser objeto `{id, nome}` ou string. Ordem: data mais recente primeiro, depois rodada maior primeiro.
  - `resumoPartidas(partidas) -> { partidas, vitorias, empates, derrotas, aproveitamento: number|null, brancas: {v,e,d}, pretas: {v,e,d} }` — `aproveitamento` em % arredondado para inteiro, `null` se 0 partidas.
  - `confronto(partidas, adversarioId) -> { vitorias, empates, derrotas, jogos: Array<partida> }`
  - `copaDoJogador(resultadoCopa, nomeJogador) -> null | { posicao, pontos, etapas, vitorias, podios }` — `resultadoCopa` é o retorno de `Copa.calcular`. Compara nomes com `.trim()`. `posicao` = índice + 1 da primeira linha de `classificacao` com o nome. `etapas`/`vitorias`/`podios` contam, em `torneiosDoAno` com `Resultado`, as etapas em que o nome aparece / está no índice 0 / está nos índices 0–2. `null` se o nome não está na classificação.

- [ ] **Step 1: Escrever os testes em `tests/estatisticasJogador.test.mjs`**
  - `lê partidas e cores`: torneio com rodada1 (J brancas vence) e rodada2 (J pretas perde) → 2 partidas, `cor` e `resultado` certos, rodada2 primeiro.
  - `ignora BYE`: partida J × BYE (`id: 'bye'`) não aparece.
  - `ignora resultado vazio`: `resultado: ''` não aparece.
  - `formato antigo Partidas`: torneio só com `Partidas` (ids como string) é lido com `rodada: null`.
  - `aceita ½-½`: conta como `'E'`.
  - `resumo`: 3V 1E 1D (2V/1E de brancas, 1V/1D de pretas) → `aproveitamento` 70, `brancas` `{v:2,e:1,d:0}`, `pretas` `{v:1,e:0,d:1}`.
  - `resumo vazio`: `[]` → zeros e `aproveitamento: null`.
  - `confronto`: só jogos contra o adversário, com V/E/D somados.
  - `acha jogador ignorando espaços`: classificação com `'Gilson da Silva C. Filho '`, busca `'Gilson da Silva C. Filho'` → encontra.
  - `posição, etapas, vitórias e pódios`: 3 etapas (1º, 3º, 5º) → `etapas 3, vitorias 1, podios 2`, posição e pontos iguais à linha da classificação.
  - `jogador fora da Copa`: → `null`.

- [ ] **Step 2: Rodar `npm test`** — Expected: FAIL nos testes novos.
- [ ] **Step 3: Implementar `public/js/estatisticasJogador.js`** (script clássico, puro, mesmo padrão de `copa.js`).
- [ ] **Step 4: Rodar `npm test`** — Expected: todos PASS (incluindo os da Task 1).
- [ ] **Step 5: Commit** — "Estatísticas do jogador: partidas, resumo, confronto e Copa (com testes)".

### Task 4: Tela do histórico do jogador

**Files:**
- Modify: `public/HistoricoJogador.html` (blocos novos e scripts `copa.js` + `estatisticasJogador.js` antes de `HistoricoJogador.js`)
- Modify: `public/js/HistoricoJogador.js`

**Interfaces:**
- Consumes: `Copa.calcular` (Task 1); `EstatisticasJogador.*` (Task 3).

- [ ] **Step 1: Carregar uma vez.** Em `loadPlayerHistory`, ler `collection('torneio').get()` uma vez, guardar a lista `[{id, ...data}]` (ordem do snapshot) e as partidas do jogador (`partidasDoJogador`) em variáveis do módulo. O listener do adversário passa a usar `confronto(partidasAtuais, opponentId)`; a função `calculateHeadToHead` e o código morto `displayFinalResults` saem. `loadOpponents` reutiliza a lista de jogadores já lida no início, sem nova leitura.

- [ ] **Step 2: Bloco "Copa {ano}"** logo abaixo dos cards de rating, dentro de `#playerInfo`: `Copa.calcular(torneios, anoAtual)` + `copaDoJogador(..., playerData.Nome)`. Mostra posição (com `UI.badgePosicao`), pontos, etapas jogadas, etapas vencidas e pódios, com link "Ver Copa" para `ResultadoCopa.html`. Se `null`: "Ainda não jogou etapas da Copa {ano}".

- [ ] **Step 3: Bloco "Partidas"** logo abaixo da Copa: V/E/D com `stat-win/draw/loss`, aproveitamento em % (ou "—" se `null`) e uma linha "Brancas: xV yE zD · Pretas: …".

- [ ] **Step 4: Confronto direto com lista.** Abaixo dos três números de `#statsInfo`, uma lista (mais recente primeiro) com data (`UI.formatarData`), nome do torneio com link para `VisualizarTorneio.html?id=`, cor do jogador e resultado (V/E/D). Se não houver jogos: "Nunca se enfrentaram em torneios registrados."

- [ ] **Step 5: Posição em andamento.** Na tabela de torneios, posição `'-'` mostra "—" sem o "º".

- [ ] **Step 6: Conferir no emulador com dados reais** (recarregando scripts com o truque de cache):
  - Mateus Paiano: Copa 2º, 368 pts; Graciano Garcia: 4º, 281,5; Daniel Leite: 1º, 424,5; um dos "Frederico" com os pontos e a posição da sua linha na página da Copa.
  - Para os mesmos jogadores, os pontos e posições batem com a página da Copa aberta ao lado.
  - Confronto direto de um par conhecido: V/E/D iguais aos da versão publicada hoje (abrir o mesmo par no site real só para leitura) e a lista com o mesmo total de jogos.
  - Tela em largura de celular (375 px): Copa e Partidas visíveis logo após o nome; tema escuro legível. Nenhum erro no console.
  - Página da Copa: repetir a captura da Task 2 e comparar com `copa-antes.json` — idêntica.

- [ ] **Step 7: Commit** — "Histórico do jogador: Copa do ano, resumo das partidas e jogos do confronto direto".

### Task 5: Publicação

- [ ] **Step 1:** `npm test` — todos PASS.
- [ ] **Step 2:** Comparar todos os arquivos de `public/` no ar com o commit publicado por último (`6db6456`, `git show 6db6456:public/<arquivo>`) — Expected: 0 diferenças.
- [ ] **Step 3:** Pedir o "sim" do Rafael. Só então `firebase deploy --only hosting`.
- [ ] **Step 4:** No site real (só leitura): página da Copa mostra o mesmo ranking de antes (top 5: Daniel Leite 424,5; Mateus Paiano 368; Vinicius Rech 326; Graciano Garcia 281,5; Janji Razek 230) e a tela de Mateus Paiano mostra Copa 2º, 368.
- [ ] **Step 5:** `git push origin main`.
