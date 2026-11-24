# Histórico do jogador: Copa, resumo das partidas e confronto direto detalhado

Data: 2026-11-24

## Para que serve

A tela `HistoricoJogador.html` é aberta pelos próprios jogadores, muitas vezes no celular,
para ver como estão indo. O que eles perguntam: posição na Copa, evolução do rating e
desempenho contra um adversário específico ("tudo").

Hoje a tela tem rating atual/maior/torneios, gráfico do rating, tabela de torneios e
confronto direto só com três números (V/E/D). Falta a Copa e falta aproveitar as partidas
gravadas em `historicoPartidas`.

## Objetivos

1. **Bloco da Copa do ano (presencial)** no topo: posição, pontos, etapas jogadas,
   etapas vencidas (1º lugar) e pódios (1º a 3º). Os números têm de ser exatamente os
   que a página da Copa mostra para aquele jogador.
2. **Resumo das partidas** (todas as partidas presenciais do jogador): vitórias, empates,
   derrotas, aproveitamento em % e o desempenho de brancas e de pretas.
3. **Confronto direto detalhado**: além de V/E/D, a lista dos jogos contra o adversário
   (data, torneio, cor do jogador e resultado), do mais recente para o mais antigo.
4. Carregar a coleção `torneio` **uma vez** ao abrir o jogador e reaproveitar
   (hoje é lida de novo a cada adversário escolhido).
5. Corrigir a posição de torneio em andamento, que hoje aparece como "-º" (passa a "—").

## Fora do escopo

- Copa online (o cadastro não tem o usuário do Chess.com).
- Filtro por ano, "adversários marcantes", melhor vitória: ficam para depois, se pedirem.
- Torneio Manual e Schuring: nenhuma mudança de regra.
- Nenhuma gravação no Firestore; nenhuma mudança em regras do banco.

## O que seria um fracasso mesmo funcionando

- **Qualquer mudança no que a página da Copa mostra** (ranking, pontos, ordem dos
  empatados, lista de etapas, campeões, pódio). É a página mais importante do site.
- Números da Copa na tela do jogador diferentes dos da página da Copa.

## Abordagens consideradas

- **A) Regra da Copa num arquivo único `js/copa.js`, usado pelas duas telas (escolhida pelo Rafael).**
  Uma só regra; se mudar, muda nos dois lugares. Custo: mexe na página da Copa,
  por isso a trava abaixo.
- B) Copiar o cálculo para a tela do jogador. Não encosta na Copa, mas cria duas cópias
  da regra, que foi exatamente a origem do erro de desempate corrigido hoje. Descartada.
- C) Gravar estatísticas prontas no banco. Exige gravações e um fluxo de administrador. Descartada.

## Como fica (decidido)

- `js/copa.js` expõe uma função pura, sem acesso ao banco nem à tela, que recebe a lista
  de torneios e o ano e devolve: as etapas do ano e a classificação. É o mesmo cálculo que
  `ResultadoCopa.js` faz hoje, movido sem mudar regra: filtro `copa == true` e ano da data,
  ordem oficial gravada em `Resultado`, bônus 6/4/3/2/1 + pontos do torneio, soma pelo
  nome, ignora BYE, ordenação final por pontos.
- `ResultadoCopa.js` continua buscando os torneios do mesmo jeito e passa a chamar
  `copa.js`; a parte que desenha a página não muda.
- A tela do jogador chama a mesma função com os torneios que já carregou.
- Só Copa presencial, ano corrente (igual à página da Copa).

## Decisões minhas (para conferir)

- **Ordem dos empatados na Copa**: a ordenação final é estável e depende da ordem em que
  os jogadores aparecem pela primeira vez. A função nova percorre os torneios e os
  resultados na mesma ordem de hoje, para que empatados fiquem exatamente onde estão.
- **Como achar o jogador na Copa (decidido pelo Rafael)**: pelo **nome** do cadastro
  (`players.Nome`), comparado com o nome usado na Copa, igual à página da Copa.
  Minha decisão de detalhe: a comparação ignora espaços no começo e no fim do nome
  (há nomes gravados com espaço sobrando, ex.: "Gilson da Silva C. Filho "). Se o nome
  do cadastro não aparecer na Copa do ano, o bloco mostra que ele ainda não jogou etapas.
- **Pódios e etapas vencidas** contam pela ordem oficial de cada etapa (posições 1–3 e 1),
  também pelo nome, para bater com a linha do jogador na Copa.
- **Resumo das partidas**: partidas contra BYE não contam como partida. Lê os dois
  formatos que existem no banco (`historicoPartidas` e o antigo `Partidas`), como o
  confronto direto já faz. Aproveitamento = (V + ½E) ÷ partidas.
- Jogador sem etapa da Copa no ano: o bloco mostra "Ainda não jogou etapas da Copa 2026".
- Layout: Copa e resumo das partidas no topo (visíveis no celular sem rolar), depois
  gráfico, confronto direto e tabela de torneios. Visual com os componentes que o site já usa.

## Trava de segurança da página da Copa

Antes de qualquer mudança, com os dados reais copiados para o emulador:

1. Guardar o que a página da Copa mostra hoje: ranking completo (nome, pontos, ordem),
   lista de etapas (nome, data, campeão, status) e pódio.
2. Depois da mudança, a página tem de mostrar **exatamente o mesmo**, item por item.
3. Conferir a função nova também contra a simulação de 2025 e 2026 (ranking "correto"),
   para validar anos diferentes do corrente.
4. Na tela do jogador, conferir posição e pontos da Copa de alguns jogadores (incluindo
   Mateus Paiano, Graciano Garcia e um dos "Frederico") contra a página da Copa.

Só publicar se tudo bater. Publicação apenas do site (`firebase deploy --only hosting`),
conferindo antes que o site no ar é igual ao último commit.

## Deixado para quem implementar

- Organização interna do código da tela do jogador e textos exatos dos rótulos.
- Detalhes visuais dentro do padrão do site (tema claro/escuro, celular).
