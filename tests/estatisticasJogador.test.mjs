// Testes das estatísticas do histórico do jogador (public/js/estatisticasJogador.js).
// Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../public/js/copa.js');
await import('../public/js/estatisticasJogador.js');
const { Copa, EstatisticasJogador: E } = globalThis;

const J = { id: 'j', nome: 'João' };
const A = { id: 'a', nome: 'Ana' };
const B = { id: 'b', nome: 'Bia' };
const BYE = { id: 'bye', nome: 'BYE' };
const jogo = (brancas, pretas, resultado) => ({ brancas, pretas, resultado });
const torneio = (id, data, rodadas) => ({
    id, nome: `Torneio ${id}`, data,
    historicoPartidas: Object.fromEntries(rodadas.map((partidas, i) => [`rodada${i + 1}`, partidas]))
});

test('lê partidas e cores', () => {
    const p = E.partidasDoJogador([torneio('t1', '2026-03-01', [
        [jogo(J, A, '1-0')],
        [jogo(B, J, '1-0')]
    ])], 'j');
    assert.equal(p.length, 2);
    assert.deepEqual(p[0], { torneioId: 't1', torneioNome: 'Torneio t1', data: '2026-03-01', rodada: 2, cor: 'pretas', adversarioId: 'b', adversarioNome: 'Bia', resultado: 'D' });
    assert.deepEqual(p[1], { torneioId: 't1', torneioNome: 'Torneio t1', data: '2026-03-01', rodada: 1, cor: 'brancas', adversarioId: 'a', adversarioNome: 'Ana', resultado: 'V' });
});

test('ordena do torneio mais recente para o mais antigo', () => {
    const p = E.partidasDoJogador([
        torneio('velho', '2025-05-01', [[jogo(J, A, '1-0')]]),
        torneio('novo', '2026-05-01', [[jogo(J, B, '0-1')]])
    ], 'j');
    assert.deepEqual(p.map(x => x.torneioId), ['novo', 'velho']);
});

test('rodada 10 vem antes da rodada 9', () => {
    const rodadas = Array.from({ length: 10 }, () => [jogo(J, A, '1-0')]);
    const p = E.partidasDoJogador([torneio('t1', '2026-03-01', rodadas)], 'j');
    assert.deepEqual(p.slice(0, 2).map(x => x.rodada), [10, 9]);
});

test('ignora BYE', () => {
    const p = E.partidasDoJogador([torneio('t1', '2026-03-01', [[jogo(J, BYE, '1-0')], [jogo(BYE, J, '0-1')]])], 'j');
    assert.deepEqual(p, []);
});

test('ignora resultado vazio', () => {
    const p = E.partidasDoJogador([torneio('t1', '2026-03-01', [[jogo(J, A, '')]])], 'j');
    assert.deepEqual(p, []);
});

test('formato antigo Partidas', () => {
    const t = { id: 't0', nome: 'Antigo', data: '2020-01-01', Partidas: [{ brancas: 'a', pretas: 'j', resultado: '0-1' }] };
    const p = E.partidasDoJogador([t], 'j');
    assert.equal(p.length, 1);
    assert.equal(p[0].rodada, null);
    assert.equal(p[0].cor, 'pretas');
    assert.equal(p[0].resultado, 'V');
    assert.equal(p[0].adversarioId, 'a');
});

test('aceita ½-½', () => {
    const p = E.partidasDoJogador([torneio('t1', '2026-03-01', [[jogo(J, A, '½-½')], [jogo(B, J, '1/2-1/2')]])], 'j');
    assert.deepEqual(p.map(x => x.resultado), ['E', 'E']);
});

test('resumo', () => {
    const partidas = [
        { cor: 'brancas', resultado: 'V' }, { cor: 'brancas', resultado: 'V' }, { cor: 'brancas', resultado: 'E' },
        { cor: 'pretas', resultado: 'V' }, { cor: 'pretas', resultado: 'D' }
    ];
    assert.deepEqual(E.resumoPartidas(partidas), {
        partidas: 5, vitorias: 3, empates: 1, derrotas: 1, aproveitamento: 70,
        brancas: { v: 2, e: 1, d: 0 }, pretas: { v: 1, e: 0, d: 1 }
    });
});

test('resumo vazio', () => {
    assert.deepEqual(E.resumoPartidas([]), {
        partidas: 0, vitorias: 0, empates: 0, derrotas: 0, aproveitamento: null,
        brancas: { v: 0, e: 0, d: 0 }, pretas: { v: 0, e: 0, d: 0 }
    });
});

test('confronto', () => {
    const partidas = E.partidasDoJogador([torneio('t1', '2026-03-01', [
        [jogo(J, A, '1-0')], [jogo(A, J, '1/2-1/2')], [jogo(J, B, '0-1')], [jogo(A, J, '1-0')]
    ])], 'j');
    const c = E.confronto(partidas, 'a');
    assert.equal(c.vitorias, 1);
    assert.equal(c.empates, 1);
    assert.equal(c.derrotas, 1);
    assert.equal(c.jogos.length, 3);
    assert.ok(c.jogos.every(x => x.adversarioId === 'a'));
});

const etapa = (id, data, nomes) => ({ id, nome: `Etapa ${id}`, data, copa: true, Formato: 'suico', Resultado: nomes.map((nome, i) => ({ nome, pontos: 5 - i })) });

test('acha jogador ignorando espaços', () => {
    const copa = Copa.calcular([etapa('1', '2026-03-01', ['Gilson da Silva C. Filho ', 'Outro'])], 2026);
    const r = E.copaDoJogador(copa, 'Gilson da Silva C. Filho');
    assert.equal(r.posicao, 1);
    assert.equal(r.pontos, 11);
    assert.equal(r.etapas, 1);
});

test('posição, etapas, vitórias e pódios', () => {
    const copa = Copa.calcular([
        etapa('1', '2026-03-01', ['João', 'X', 'Y', 'Z', 'W']),
        etapa('2', '2026-03-08', ['X', 'Y', 'João', 'Z', 'W']),
        etapa('3', '2026-03-15', ['X', 'Y', 'Z', 'W', 'João']),
        { id: '4', nome: 'Em andamento', data: '2026-03-22', copa: true }
    ], 2026);
    const linha = copa.classificacao.findIndex(j => j.nome === 'João');
    assert.deepEqual(E.copaDoJogador(copa, 'João'), {
        posicao: linha + 1, pontos: copa.classificacao[linha].pontos, etapas: 3, vitorias: 1, podios: 2
    });
});

test('nome com duas grafias: números da mesma linha da Copa', () => {
    // Como na Copa 2025: "Hudson Hilário " e "Hudson Hilário" viram duas linhas na página da Copa
    const copa = Copa.calcular([
        etapa('1', '2026-03-01', ['Hudson ', 'X']),
        etapa('2', '2026-03-08', ['Hudson ', 'X']),
        etapa('3', '2026-03-15', ['X', 'Y', 'Z', 'Hudson'])
    ], 2026);
    const linha = copa.classificacao.findIndex(j => j.nome.trim() === 'Hudson');
    assert.equal(copa.classificacao[linha].nome, 'Hudson ');
    assert.deepEqual(E.copaDoJogador(copa, 'Hudson'), {
        posicao: linha + 1, pontos: copa.classificacao[linha].pontos, etapas: 2, vitorias: 2, podios: 2
    });
});

test('jogador fora da Copa', () => {
    const copa = Copa.calcular([etapa('1', '2026-03-01', ['X', 'Y'])], 2026);
    assert.equal(E.copaDoJogador(copa, 'João'), null);
});
