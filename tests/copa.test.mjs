// Testes da regra da Copa presencial (public/js/copa.js).
// Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../public/js/copa.js');
const { Copa } = globalThis;

const etapa = (id, data, resultado, extra = {}) => ({ id, nome: `Etapa ${id}`, data, copa: true, Formato: 'suico', Resultado: resultado, ...extra });
const pontosDe = (classificacao) => Object.fromEntries(classificacao.map(j => [j.nome, j.pontos]));

test('soma bônus e pontos pela ordem gravada', () => {
    const r = Copa.calcular([etapa('1', '2026-03-01', [
        { nome: 'A', pontos: 5 }, { nome: 'B', pontos: 5 }, { nome: 'C', pontos: 3 }
    ])], 2026);
    assert.deepEqual(r.classificacao, [
        { nome: 'A', pontos: 11 }, { nome: 'B', pontos: 9 }, { nome: 'C', pontos: 6 }
    ]);
});

test('ignora outros anos e copa false', () => {
    const r = Copa.calcular([
        etapa('1', '2025-12-20', [{ nome: 'A', pontos: 5 }]),
        etapa('2', '2026-03-01', [{ nome: 'B', pontos: 5 }], { copa: false })
    ], 2026);
    assert.deepEqual(r.torneiosDoAno, []);
    assert.deepEqual(r.classificacao, []);
});

test('etapa sem Resultado entra só na lista', () => {
    const emAndamento = { id: '2', nome: 'Etapa 2', data: '2026-03-08', copa: true, Formato: 'suico' };
    const r = Copa.calcular([etapa('1', '2026-03-01', [{ nome: 'A', pontos: 2 }]), emAndamento], 2026);
    assert.deepEqual(r.torneiosDoAno.map(t => t.id), ['1', '2']);
    assert.deepEqual(r.classificacao, [{ nome: 'A', pontos: 8 }]);
});

test('ignora BYE e nomes vazios', () => {
    const r = Copa.calcular([etapa('1', '2026-03-01', [
        { nome: 'BYE', pontos: 9 }, { nome: 'undefined', pontos: 9 }, { nome: '', pontos: 9 }, { nome: 'A', pontos: 1 }
    ])], 2026);
    // A está no índice 3 (4º lugar): 2 de bônus + 1 ponto
    assert.deepEqual(r.classificacao, [{ nome: 'A', pontos: 3 }]);
});

test('formato antigo jogador.nome', () => {
    const r = Copa.calcular([etapa('1', '2026-03-01', [{ jogador: { nome: 'D' }, pontos: 2 }])], 2026);
    assert.deepEqual(r.classificacao, [{ nome: 'D', pontos: 8 }]);
});

test('empatados mantêm ordem de aparição', () => {
    // X e Y terminam com 14; quem apareceu primeiro fica na frente
    const r = Copa.calcular([
        etapa('1', '2026-03-01', [{ nome: 'X', pontos: 2 }, { nome: 'Y', pontos: 2 }]),
        etapa('2', '2026-03-08', [{ nome: 'Y', pontos: 2 }, { nome: 'X', pontos: 2 }])
    ], 2026);
    assert.deepEqual(r.classificacao, [{ nome: 'X', pontos: 14 }, { nome: 'Y', pontos: 14 }]);
    // Mesmo empate, mas Y aparece primeiro (a etapa dele veio antes na lista)
    const invertido = Copa.calcular([
        etapa('2', '2026-03-08', [{ nome: 'Y', pontos: 2 }, { nome: 'X', pontos: 2 }]),
        etapa('1', '2026-03-01', [{ nome: 'X', pontos: 2 }, { nome: 'Y', pontos: 2 }])
    ], 2026);
    assert.deepEqual(invertido.classificacao.map(j => j.nome), ['Y', 'X']);
});

test('não reordena suíço', () => {
    const r = Copa.calcular([etapa('1', '2026-03-01', [
        { nome: 'A', pontos: 4, vitorias: 4, sonnenbornBerger: 8 },
        { nome: 'B', pontos: 4, vitorias: 3, sonnenbornBerger: 12 }
    ])], 2026);
    assert.deepEqual(pontosDe(r.classificacao), { A: 10, B: 8 });
});
