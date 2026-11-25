// Estatísticas do histórico do jogador: partidas, resumo, confronto direto e situação na Copa.
// Funções puras: não acessam o banco nem a tela. Carregado como <script> no site e importado nos testes.
(function () {
    const EMPATES = new Set(['1/2-1/2', '½-½']);

    const idDe = lado => (lado && typeof lado === 'object' ? lado.id : lado);
    const nomeDe = lado => (lado && typeof lado === 'object' ? lado.nome : lado);
    const ehBye = lado => idDe(lado) === 'bye' || nomeDe(lado) === 'BYE';

    // Resultado do ponto de vista das brancas: 'V', 'E', 'D' ou null (não jogada / inválido)
    function resultadoBrancas(resultado) {
        if (resultado === '1-0') return 'V';
        if (resultado === '0-1') return 'D';
        if (EMPATES.has(resultado)) return 'E';
        return null;
    }
    const inverter = { V: 'D', D: 'V', E: 'E' };

    // Lista as partidas do torneio como [{ rodada, partida }]
    function rodadasDoTorneio(torneio) {
        if (torneio.historicoPartidas && typeof torneio.historicoPartidas === 'object') {
            return Object.entries(torneio.historicoPartidas).flatMap(([chave, partidas]) => {
                const rodada = parseInt(String(chave).replace(/\D/g, ''), 10);
                return Array.isArray(partidas) ? partidas.map(partida => ({ rodada: Number.isNaN(rodada) ? null : rodada, partida })) : [];
            });
        }
        if (Array.isArray(torneio.Partidas)) return torneio.Partidas.map(partida => ({ rodada: null, partida }));
        return [];
    }

    function partidasDoJogador(torneios, jogadorId) {
        const lista = [];
        for (const torneio of torneios) {
            for (const { rodada, partida } of rodadasDoTorneio(torneio)) {
                if (!partida || ehBye(partida.brancas) || ehBye(partida.pretas)) continue;
                const brancasId = idDe(partida.brancas);
                const pretasId = idDe(partida.pretas);
                if (brancasId !== jogadorId && pretasId !== jogadorId) continue;
                const base = resultadoBrancas(partida.resultado);
                if (!base) continue;
                const deBrancas = brancasId === jogadorId;
                const adversario = deBrancas ? partida.pretas : partida.brancas;
                lista.push({
                    torneioId: torneio.id,
                    torneioNome: torneio.nome,
                    data: torneio.data,
                    rodada,
                    cor: deBrancas ? 'brancas' : 'pretas',
                    adversarioId: idDe(adversario),
                    adversarioNome: nomeDe(adversario),
                    resultado: deBrancas ? base : inverter[base]
                });
            }
        }
        // Mais recente primeiro: data (aaaa-mm-dd) decrescente, depois rodada decrescente
        return lista.sort((a, b) =>
            String(b.data || '').localeCompare(String(a.data || '')) || (b.rodada ?? -1) - (a.rodada ?? -1));
    }

    function contar(partidas) {
        const c = { v: 0, e: 0, d: 0 };
        for (const p of partidas) c[p.resultado.toLowerCase()]++;
        return c;
    }

    function resumoPartidas(partidas) {
        const total = contar(partidas);
        return {
            partidas: partidas.length,
            vitorias: total.v,
            empates: total.e,
            derrotas: total.d,
            aproveitamento: partidas.length ? Math.round(((total.v + total.e / 2) / partidas.length) * 100) : null,
            brancas: contar(partidas.filter(p => p.cor === 'brancas')),
            pretas: contar(partidas.filter(p => p.cor === 'pretas'))
        };
    }

    function confronto(partidas, adversarioId) {
        const jogos = partidas.filter(p => p.adversarioId === adversarioId);
        const c = contar(jogos);
        return { vitorias: c.v, empates: c.e, derrotas: c.d, jogos };
    }

    // resultadoCopa = retorno de Copa.calcular. Busca pelo nome, ignorando espaços nas pontas.
    function copaDoJogador(resultadoCopa, nomeJogador) {
        const alvo = String(nomeJogador || '').trim();
        if (!alvo) return null;
        const mesmoNome = nome => String(nome || '').trim() === alvo;
        const indice = resultadoCopa.classificacao.findIndex(j => mesmoNome(j.nome));
        if (indice === -1) return null;

        let etapas = 0, vitorias = 0, podios = 0;
        for (const torneio of resultadoCopa.torneiosDoAno) {
            if (!Array.isArray(torneio.Resultado)) continue;
            const posicao = torneio.Resultado.findIndex(j => mesmoNome(j.jogador ? j.jogador.nome : j.nome));
            if (posicao === -1) continue;
            etapas++;
            if (posicao === 0) vitorias++;
            if (posicao <= 2) podios++;
        }
        return { posicao: indice + 1, pontos: resultadoCopa.classificacao[indice].pontos, etapas, vitorias, podios };
    }

    globalThis.EstatisticasJogador = { partidasDoJogador, resumoPartidas, confronto, copaDoJogador };
})();
