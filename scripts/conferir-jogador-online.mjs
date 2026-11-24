// Conferência da Copa Online (VII Copa Alexandre Direne) para UM jogador do Chess.com.
//
// Uso:   npm run conferir-online -- <usuario-do-chess.com>
//        node scripts/conferir-jogador-online.mjs <usuario> [--sem-partidas]
//
// Só faz leituras na API pública do Chess.com. Não lê nem grava nada no Firestore.
//
// Critério de pontuação (o mesmo do site):
//   pontos da etapa = vitórias + 0,5 × empates + bônus pela colocação
//   (as vitórias do Chess.com já incluem BYE e W.O., que valem 1 ponto)
//   Etapas com o mesmo número (ex.: as duas "Etapa 82") contam as duas.
//   bônus: 1º = 6, 2º = 4, 3º = 3, 4º = 2, 5º = 1, 6º em diante = 0
//
// O que esta rotina faz de diferente da do site, para servir de conferência:
//   1. Escolhe as etapas pelo NOME oficial do torneio ("VII Copa Alexandre Direne"),
//      e não por um pedaço fixo do endereço. Assim aparecem também as etapas cujo
//      endereço foi digitado de outro jeito, e cada uma é marcada se o site a conta ou não.
//   2. Reconta vitórias, empates e derrotas a partir das PARTIDAS do jogador
//      (arquivo mensal de jogos do Chess.com) e compara com o resumo que o Chess.com
//      mostra no perfil, que é o número que o site usa.
//   3. Avisa sobre etapas com o mesmo número, etapas abandonadas e etapas em andamento.

const EDICAO = /\bVII\s+Copa\s+Alexandre\s+Direne\b/i;       // nome oficial da edição
const CANDIDATO = /(^|-)vii-copa-alexandre-direne/i;          // pré-filtro pelo endereço
const FILTRO_DO_SITE = /cxes-online-202[56]-+vii-copa-alexandre-direne/i; // o mesmo de classificacaoonline.js
const BONUS = [6, 4, 3, 2, 1];
const EMPATES = new Set(['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient']);
const API = 'https://api.chess.com/pub';

const args = process.argv.slice(2);
const usuario = args.find(a => !a.startsWith('--'));
const conferirPartidas = !args.includes('--sem-partidas');
if (!usuario) {
    console.error('Informe o usuário do Chess.com. Ex.: npm run conferir-online -- rafalops');
    process.exit(1);
}

async function buscar(url, tentativas = 4) {
    for (let i = 1; i <= tentativas; i++) {
        const r = await fetch(url, { headers: { 'User-Agent': 'club-tournament-checker/1.0' } });
        if (r.ok) return r.json();
        if (r.status === 404) return null;
        if (i === tentativas) throw new Error(`HTTP ${r.status} em ${url}`);
        await new Promise(ok => setTimeout(ok, r.status === 429 ? 3000 * i : 1000 * i));
    }
}

const slugDe = url => url.split('/').pop();
const numeroEtapa = nome => { const m = /etapa\s*(\d+)/i.exec(nome || ''); return m ? parseInt(m[1]) : null; };
const dataBR = seg => seg ? new Date(seg * 1000).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '?';
const fmt = n => Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
const pad = (s, n, dir = 'e') => { s = String(s); return dir === 'e' ? s.padEnd(n) : s.padStart(n); };

console.log(`\nConferindo ${usuario} na VII Copa Alexandre Direne...\n`);

// 1) Torneios do jogador (resumo do perfil)
const perfil = await buscar(`${API}/player/${encodeURIComponent(usuario.toLowerCase())}/tournaments`);
if (!perfil) { console.error(`Usuário "${usuario}" não encontrado no Chess.com.`); process.exit(1); }

const candidatos = [
    ...(perfil.finished || []).map(t => ({ ...t, lista: 'finalizado' })),
    ...(perfil.in_progress || []).map(t => ({ ...t, lista: 'em andamento' })),
    ...(perfil.registered || []).map(t => ({ ...t, lista: 'inscrito' }))
].filter(t => CANDIDATO.test(slugDe(t.url)));

// 2) Detalhes de cada torneio (nome oficial, data, nº de rodadas)
const etapas = [];
for (const [i, t] of candidatos.entries()) {
    if (process.stdout.isTTY) process.stdout.write(`\r  lendo torneios ${i + 1}/${candidatos.length}   `);
    const det = await buscar(t['@id']);
    if (!det || !EDICAO.test(det.name)) continue;
    etapas.push({
        slug: slugDe(t.url),
        url: t.url,
        api: t['@id'],
        nome: det.name,
        etapa: numeroEtapa(det.name),
        inicio: det.start_time || det.finish_time,
        rodadas: det.settings?.total_rounds,
        statusTorneio: det.status,
        lista: t.lista,
        statusJogador: t.status,
        v: t.wins ?? 0, e: t.draws ?? 0, d: t.losses ?? 0,
        colocacao: t.placement,
        totalJogadores: t.total_players,
        contaNoSite: t.lista === 'finalizado' && FILTRO_DO_SITE.test(t.url)
    });
}
if (process.stdout.isTTY) process.stdout.write('\r' + ' '.repeat(40) + '\r');

if (etapas.length === 0) {
    console.log('Nenhuma etapa da VII Copa Alexandre Direne encontrada para este jogador.');
    process.exit(0);
}

// 3) Recontagem pelas partidas (arquivo mensal de jogos)
if (conferirPartidas) {
    const meses = new Set();
    for (const et of etapas) {
        if (!et.inicio) continue;
        for (const off of [0, 1]) { // a etapa pode virar a meia-noite do último dia do mês
            const d = new Date((et.inicio + off * 86400) * 1000);
            meses.add(`${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
        }
    }
    const porTorneio = new Map();
    let n = 0;
    for (const mes of [...meses].sort()) {
        if (process.stdout.isTTY) process.stdout.write(`\r  lendo partidas ${++n}/${meses.size} (${mes})   `);
        const arq = await buscar(`${API}/player/${encodeURIComponent(usuario.toLowerCase())}/games/${mes}`);
        for (const jogo of arq?.games || []) {
            if (!jogo.tournament) continue;
            const slug = slugDe(jogo.tournament);
            const eu = jogo.white.username.toLowerCase() === usuario.toLowerCase() ? jogo.white : jogo.black;
            const c = porTorneio.get(slug) || { v: 0, e: 0, d: 0, urls: new Set() };
            if (c.urls.has(jogo.url)) continue;
            c.urls.add(jogo.url);
            if (eu.result === 'win') c.v++;
            else if (EMPATES.has(eu.result)) c.e++;
            else c.d++;
            porTorneio.set(slug, c);
        }
    }
    if (process.stdout.isTTY) process.stdout.write('\r' + ' '.repeat(50) + '\r');
    for (const et of etapas) {
        const c = porTorneio.get(et.slug) || { v: 0, e: 0, d: 0 };
        et.partidas = c;
        et.confere = c.v === et.v && c.e === et.e && c.d === et.d;
    }
}

// 4) Pontuação
for (const et of etapas) {
    et.pontosPartidas = et.v + 0.5 * et.e;
    et.bonus = BONUS[(et.colocacao ?? 0) - 1] ?? 0;
    et.total = et.pontosPartidas + et.bonus;
}
etapas.sort((a, b) => (a.inicio || 0) - (b.inicio || 0));

const valem = etapas.filter(et => et.lista === 'finalizado');
const naoValem = etapas.filter(et => et.lista !== 'finalizado');

// 5) Relatório
const cab = ['Etapa', 'Data', 'V', 'E', 'D', 'Col.', 'Partidas', 'Bônus', 'Total', 'Site?', conferirPartidas ? 'Jogos V/E/D' : ''];
const larg = [6, 11, 3, 3, 3, 8, 9, 6, 6, 6, 14];
const linha = cols => cols.map((c, i) => pad(c, larg[i], i <= 1 || i >= 9 ? 'e' : 'd')).join(' ');
console.log(linha(cab));
console.log('-'.repeat(larg.reduce((a, b) => a + b + 1, 0)));
for (const et of valem) {
    const conf = !conferirPartidas ? '' : et.confere ? 'ok' : `${et.partidas.v}/${et.partidas.e}/${et.partidas.d} ≠`;
    console.log(linha([
        et.etapa ?? '?', dataBR(et.inicio), et.v, et.e, et.d,
        `${et.colocacao ?? '?'}/${et.totalJogadores ?? '?'}`,
        fmt(et.pontosPartidas), et.bonus, fmt(et.total),
        et.contaNoSite ? 'sim' : 'NÃO', conf
    ]));
}

const soma = lista => lista.reduce((s, et) => s + et.total, 0);
const noSite = valem.filter(et => et.contaNoSite);
const vitoriasTorneio = lista => lista.filter(et => et.colocacao === 1).length;

console.log('\nRESUMO');
console.log(`  Pelo filtro de endereço da página Classificação Online:`);
console.log(`    torneios: ${noSite.length}   pontos: ${fmt(soma(noSite))}   etapas vencidas: ${vitoriasTorneio(noSite)}`);
console.log(`  Todas as etapas da VII Copa encontradas pelo nome:`);
console.log(`    torneios: ${valem.length}   pontos: ${fmt(soma(valem))}   etapas vencidas: ${vitoriasTorneio(valem)}`);

const avisos = [];
const fora = valem.filter(et => !et.contaNoSite);
if (fora.length) avisos.push(`${fora.length} etapa(s) com endereço fora do padrão e que o site NÃO soma: ` +
    fora.map(et => `etapa ${et.etapa} (${et.slug})`).join(', '));
const porNumero = new Map();
valem.forEach(et => porNumero.set(et.etapa, [...(porNumero.get(et.etapa) || []), et]));
for (const [num, lista] of porNumero) if (lista.length > 1)
    avisos.push(`a etapa ${num} aparece ${lista.length} vezes (torneios diferentes, todos somados): ${lista.map(et => et.slug).join(', ')}`);
valem.filter(et => et.statusJogador === 'withdrew').forEach(et =>
    avisos.push(`na etapa ${et.etapa} o jogador consta como desistente (withdrew), mas os pontos contam mesmo assim`));
if (conferirPartidas) {
    // Vitória ou empate diferente muda a pontuação; só derrota diferente não muda.
    valem.filter(et => et.partidas.v !== et.v || et.partidas.e !== et.e).forEach(et =>
        avisos.push(`etapa ${et.etapa}: o perfil diz ${et.v}V/${et.e}E, mas as partidas jogadas somam ` +
            `${et.partidas.v}V/${et.partidas.e}E. Diferença = BYE ou W.O., que valem 1 ponto e são somados`));
    const soDerrotas = valem.filter(et => !et.confere && et.partidas.v === et.v && et.partidas.e === et.e);
    if (soDerrotas.length) avisos.push(`em ${soDerrotas.length} etapa(s) o perfil conta mais derrotas do que partidas jogadas ` +
        `(rodadas em que o jogador não estava, contadas como derrota). Não muda pontos: etapas ${soDerrotas.map(et => et.etapa).join(', ')}`);
}
valem.filter(et => et.rodadas && et.v + et.e + et.d < et.rodadas).forEach(et =>
    avisos.push(`etapa ${et.etapa}: o resumo tem ${et.v + et.e + et.d} de ${et.rodadas} rodadas (as demais foram ausências depois de sair do torneio)`));
naoValem.forEach(et => avisos.push(`etapa ${et.etapa} está "${et.lista}" e ainda não conta`));

if (avisos.length) {
    console.log('\nAVISOS');
    avisos.forEach(a => console.log(`  • ${a}`));
}
console.log('\nCritério: vitórias + ½ empate + bônus (1º=6, 2º=4, 3º=3, 4º=2, 5º=1).');
console.log('Compare a linha "Pelo filtro de endereço" com a página Classificação Online.\n');
