// Popula os EMULADORES locais com dados fictícios para testes.
// Nunca toca no banco real: só fala com 127.0.0.1 e com o projeto "demo-rafatournament".
//
// Uso (com os emuladores rodando via `npm run emuladores`):
//   npm run seed
//
// Login de teste criado no emulador de autenticação:
//   email: admin@teste.local
//   senha: xadrez-teste-123

const PROJETO = 'demo-rafatournament';
const FIRESTORE = `http://127.0.0.1:8080/v1/projects/${PROJETO}/databases/(default)/documents`;
const AUTH = 'http://127.0.0.1:9099';

if (!PROJETO.startsWith('demo-') || !FIRESTORE.startsWith('http://127.0.0.1') || !AUTH.startsWith('http://127.0.0.1')) {
    throw new Error('Seed só pode rodar contra emuladores locais de um projeto demo.');
}

// ---------- helpers REST do emulador ----------
function paraValor(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'string') return { stringValue: v };
    if (v instanceof Date) return { timestampValue: v.toISOString() };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(paraValor) } };
    return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, paraValor(x)])) } };
}

async function gravar(colecao, id, dados) {
    const resp = await fetch(`${FIRESTORE}/${colecao}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
        body: JSON.stringify({ fields: Object.fromEntries(Object.entries(dados).map(([k, v]) => [k, paraValor(v)])) })
    });
    if (!resp.ok) throw new Error(`Falha ao gravar ${colecao}/${id}: ${resp.status} ${await resp.text()}`);
}

async function limparTudo() {
    await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJETO}/databases/(default)/documents`, { method: 'DELETE' });
    await fetch(`${AUTH}/emulator/v1/projects/${PROJETO}/accounts`, { method: 'DELETE' });
}

// O UID fixo "admin-teste-emulador" está na lista de administradores do firestore.rules
async function criarAdmin() {
    const resp = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJETO}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
        body: JSON.stringify({ localId: 'admin-teste-emulador', email: 'admin@teste.local', password: 'xadrez-teste-123' })
    });
    if (!resp.ok) throw new Error(`Falha ao criar usuário de teste: ${await resp.text()}`);
}

// ---------- dados fictícios ----------
let semente = 42;
function aleatorio() {
    semente = (semente * 1103515245 + 12345) % 2147483648;
    return semente / 2147483648;
}

const nomes = [
    'Ana Bispo', 'Bruno Torres', 'Carla Peão', 'Diego Roque', 'Elisa Gambito', 'Fábio Xeque',
    'Gabriela Dama', 'Heitor Cavalo', 'Isabela Final', 'João Abertura', 'Karen Sacrifício',
    'Lucas Fianchetto', 'Marina Zugzwang', 'Nicolas Roque', 'Olívia Tempo', 'Pedro En Passant'
];

const jogadores = nomes.map((nome, i) => ({
    id: String(i + 1),
    Nome: nome,
    Idade: String(10 + Math.floor(aleatorio() * 50)),
    Rating: 1300 + Math.floor(aleatorio() * 700),
    sexo: i % 3 === 0 ? 'female' : 'male'
}));

function sortearResultado(brancas, pretas) {
    const esperado = 1 / (1 + Math.pow(10, (pretas.rating - brancas.rating) / 400));
    const r = aleatorio();
    if (r < 0.12) return '1/2-1/2';
    return r < 0.12 + esperado * 0.88 ? '1-0' : '0-1';
}

// Gera um torneio já encerrado no mesmo formato que o app grava
function simularTorneio({ id, nome, data, formato, copa, participantes, rodadas }) {
    const inscritos = participantes.map(j => ({ id: j.id, nome: j.Nome, rating: j.Rating }));
    const pontos = Object.fromEntries(inscritos.map(j => [j.id, 0]));
    const jaJogaram = new Set();
    const historicoPartidas = {};
    const partidasTodas = [];

    for (let r = 1; r <= rodadas; r++) {
        let fila = [...inscritos].sort((a, b) => pontos[b.id] - pontos[a.id] || b.rating - a.rating);
        const partidas = [];
        if (fila.length % 2 !== 0) {
            const bye = fila.pop();
            pontos[bye.id] += 1;
            partidas.push({ brancas: { ...bye }, pretas: { id: 'bye', nome: 'BYE', rating: 0 }, resultado: '1-0' });
        }
        while (fila.length) {
            const a = fila.shift();
            let idx = fila.findIndex(b => !jaJogaram.has(`${a.id}-${b.id}`));
            if (idx === -1) idx = 0;
            const b = fila.splice(idx, 1)[0];
            jaJogaram.add(`${a.id}-${b.id}`);
            jaJogaram.add(`${b.id}-${a.id}`);
            const [brancas, pretas] = r % 2 ? [a, b] : [b, a];
            const resultado = sortearResultado(brancas, pretas);
            if (resultado === '1-0') pontos[brancas.id] += 1;
            else if (resultado === '0-1') pontos[pretas.id] += 1;
            else { pontos[brancas.id] += 0.5; pontos[pretas.id] += 0.5; }
            const partida = { brancas: { ...brancas }, pretas: { ...pretas }, resultado };
            partidas.unshift(partida);
            partidasTodas.push(partida);
        }
        historicoPartidas[`rodada${r}`] = partidas;
    }

    const resultados = inscritos.map(j => ({
        id: j.id, nome: j.nome, pontos: pontos[j.id], vitorias: 0, empates: 0,
        sonnenbornBerger: 0, variacaoRating: 0, rating: j.rating
    }));
    const porId = Object.fromEntries(resultados.map(r => [r.id, r]));
    partidasTodas.forEach(({ brancas, pretas, resultado }) => {
        const b = porId[brancas.id], p = porId[pretas.id];
        if (resultado === '1-0') { b.vitorias++; b.sonnenbornBerger += p.pontos; }
        else if (resultado === '0-1') { p.vitorias++; p.sonnenbornBerger += b.pontos; }
        else { b.empates++; p.empates++; b.sonnenbornBerger += p.pontos / 2; p.sonnenbornBerger += b.pontos / 2; }
        const E = 1 / (1 + Math.pow(10, (p.rating - b.rating) / 400));
        const S = resultado === '1-0' ? 1 : resultado === '0-1' ? 0 : 0.5;
        b.variacaoRating += 20 * (S - E);
        p.variacaoRating -= 20 * (S - E);
    });
    resultados.forEach(r => {
        r.variacaoRating = Math.round(r.variacaoRating);
        r.rating = Math.round(r.rating + r.variacaoRating);
    });
    resultados.sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias || b.sonnenbornBerger - a.sonnenbornBerger || b.rating - a.rating);

    // Atualiza o rating "atual" dos jogadores para o próximo torneio
    resultados.forEach(r => { jogadores.find(j => j.id === r.id).Rating = r.rating; });

    return {
        id,
        dados: { nome, Formato: formato, copa, etapas: String(rodadas), data, jogadores: inscritos, Resultado: resultados, historicoPartidas }
    };
}

function sortearParticipantes(qtd) {
    return [...jogadores].sort(() => aleatorio() - 0.5).slice(0, qtd);
}

async function main() {
    console.log('Limpando emuladores...');
    await limparTudo();

    const torneios = [
        simularTorneio({ id: '1', nome: 'Aberto de Verão 2025', data: '2025-12-13', formato: 'suico', copa: false, participantes: sortearParticipantes(12), rodadas: 5 }),
        simularTorneio({ id: '2', nome: 'Copa Clube 2026 - Etapa 1', data: '2026-02-21', formato: 'suico', copa: true, participantes: sortearParticipantes(11), rodadas: 5 }),
        simularTorneio({ id: '3', nome: 'Relâmpago de Março', data: '2026-03-28', formato: 'schuring', copa: false, participantes: sortearParticipantes(6), rodadas: 5 }),
        simularTorneio({ id: '4', nome: 'Copa Clube 2026 - Etapa 2', data: '2026-05-16', formato: 'suico', copa: true, participantes: sortearParticipantes(14), rodadas: 5 }),
        simularTorneio({ id: '5', nome: 'Copa Clube 2026 - Etapa 3', data: '2026-08-22', formato: 'schuring', copa: true, participantes: sortearParticipantes(7), rodadas: 7 })
    ];

    // Torneio em aberto (sem Resultado) para testar Jogar/Editar/Manual
    const abertos = sortearParticipantes(9).map(j => ({ id: j.id, nome: j.Nome, rating: j.Rating }));
    torneios.push({ id: '6', dados: { nome: 'Copa Clube 2026 - Etapa 4', Formato: 'suico', copa: true, etapas: '4', data: '2026-11-07', jogadores: abertos } });

    console.log('Gravando jogadores...');
    for (const { id, ...dados } of jogadores) await gravar('players', id, dados);

    console.log('Gravando torneios...');
    for (const t of torneios) await gravar('torneio', t.id, t.dados);

    console.log('Gravando dados do torneio online...');
    const online = [
        { username: 'cavalo_veloz', score: 31.5, tournamentCount: 6, vitoriasdetorneio: 2 },
        { username: 'bispo_louco', score: 27, tournamentCount: 6, vitoriasdetorneio: 1 },
        { username: 'dama_negra', score: 22.5, tournamentCount: 5, vitoriasdetorneio: 1 },
        { username: 'peao_passado', score: 18, tournamentCount: 6, vitoriasdetorneio: 0 },
        { username: 'torre_firme', score: 12.5, tournamentCount: 4, vitoriasdetorneio: 0 },
        { username: 'rei_tranquilo', score: 7, tournamentCount: 3, vitoriasdetorneio: 0 }
    ];
    for (let i = 0; i < online.length; i++) await gravar('online', String(i), online[i]);
    await gravar('n_etapas_online', 'etapa-atual', { numero: 6, ultimaAtualizacao: new Date(), atualizado_por: 'admin@teste.local' });
    const links = [
        { etapa: 5, data: '2026-09-26', link: 'https://www.chess.com/play/arena' },
        { etapa: 6, data: '2026-10-24', link: 'https://www.chess.com/play/arena' },
        { etapa: 7, data: '2026-11-28', link: 'https://www.chess.com/play/arena' }
    ];
    for (const l of links) await gravar('links_etapas', `etapa-${l.etapa}`, l);

    console.log('Criando usuário admin de teste...');
    await criarAdmin();

    console.log('Pronto! Abra http://127.0.0.1:5000 (login: admin@teste.local / xadrez-teste-123)');
}

main().catch(err => { console.error(err); process.exit(1); });
