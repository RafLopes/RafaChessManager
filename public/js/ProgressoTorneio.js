// Segurança do torneio em andamento.
//
// 1) Progresso salvo no aparelho: a cada rodada gerada e a cada resultado lançado, o estado
//    do torneio é guardado no localStorage deste navegador. Se a página recarregar ou fechar,
//    ao carregar o torneio de novo é possível continuar de onde parou. Nada disso vai para o banco.
//
// 2) Encerramento tudo-ou-nada: a classificação do torneio e os ratings dos jogadores são gravados
//    numa única operação (batch). Ou grava tudo, ou não grava nada.
const ProgressoTorneio = (function () {
    const PREFIXO = 'xadrez-torneio-andamento-';
    let pausado = false; // evita salvar estados intermediários enquanto restaura

    function chave(torneioId) { return PREFIXO + torneioId; }

    // Lê do DOM os confrontos e resultados de cada rodada
    function lerRodadasDaTela() {
        return [...document.querySelectorAll('#rodadas-container > .rodada')].map(rodada =>
            [...rodada.querySelectorAll('select.resultado-select')].map(s => ({
                b: s.dataset.brancasId,
                p: s.dataset.pretasId,
                r: s.value
            })));
    }

    function salvar() {
        if (pausado || typeof torneioData === 'undefined' || !torneioData) return;
        const torneioId = document.getElementById('torneio-select').value;
        if (!torneioId || document.querySelector('.resultados-finais')) return;
        const estado = {
            versao: 1,
            torneioId,
            nome: torneioData.nome,
            formato: torneioData.Formato === 'schuring' ? 'schuring' : 'suico',
            jogadoresIds: idsDosJogadores(torneioData.jogadores),
            salvoEm: new Date().toISOString(),
            rodadas: lerRodadasDaTela(),
            // Suíço: pares exibidos em cada rodada e o estado acumulado dos jogadores
            paresSuico: typeof paresPorRodada !== 'undefined' ? paresPorRodada : null,
            jogadoresGlobais: typeof jogadoresGlobais !== 'undefined' ? jogadoresGlobais : null
        };
        try {
            localStorage.setItem(chave(torneioId), JSON.stringify(estado));
        } catch (e) {
            console.warn('Não foi possível salvar o progresso no aparelho:', e);
        }
    }

    function carregar(torneioId) {
        try {
            const estado = JSON.parse(localStorage.getItem(chave(torneioId)) || 'null');
            return estado && estado.versao === 1 ? estado : null;
        } catch (e) {
            return null;
        }
    }

    function limpar(torneioId) {
        try { localStorage.removeItem(chave(torneioId)); } catch (e) {}
    }

    function idsDosJogadores(jogadores) {
        return (jogadores || []).map(j => j.id).filter(id => id !== 'bye').sort();
    }

    // O progresso salvo só vale se for do mesmo torneio, com o mesmo formato e os mesmos jogadores
    function compativel(estado, dados) {
        const formato = dados.Formato === 'schuring' ? 'schuring' : 'suico';
        return estado.formato === formato &&
            JSON.stringify(estado.jogadoresIds) === JSON.stringify(idsDosJogadores(dados.jogadores)) &&
            Array.isArray(estado.rodadas) && estado.rodadas.length > 0;
    }

    // Reconstrói as rodadas na tela. Retorna false se algo não bater (o progresso salvo é mantido).
    function restaurar(estado) {
        pausado = true;
        try {
            if (estado.formato === 'suico') {
                if (!Array.isArray(estado.paresSuico) || estado.paresSuico.length !== estado.rodadas.length) return false;
                jogadoresGlobais = estado.jogadoresGlobais;
                estado.paresSuico.forEach((pares, i) => criarInterfaceRodada(pares, i + 1));
            } else {
                emparceirarSchuring(torneioData.jogadores);
            }

            const naTela = lerRodadasDaTela();
            const confere = naTela.length === estado.rodadas.length && naTela.every((mesas, i) =>
                mesas.length === estado.rodadas[i].length &&
                mesas.every((m, j) => m.b === estado.rodadas[i][j].b && m.p === estado.rodadas[i][j].p));
            if (!confere) return false;

            const rodadas = document.querySelectorAll('#rodadas-container > .rodada');
            estado.rodadas.forEach((mesas, i) => {
                rodadas[i].querySelectorAll('select.resultado-select').forEach((s, j) => {
                    if (!s.disabled) s.value = mesas[j].r;
                });
            });
            return true;
        } finally {
            pausado = false;
        }
    }

    function descreverHorario(iso) {
        const d = new Date(iso);
        return isNaN(d) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    // Grava classificação + ratings numa única operação. Retorna true se gravou.
    async function gravarEncerramento(torneioId, resultadosParaSalvar, historicoPartidas) {
        if (!navigator.onLine) {
            alert('Sem conexão com a internet. Nada foi gravado e o progresso continua salvo neste aparelho. Reconecte e clique em "Encerrar torneio" de novo.');
            return false;
        }
        const db = firebase.firestore();
        const refTorneio = db.collection('torneio').doc(torneioId);

        // Não grava duas vezes o mesmo torneio
        const torneioAtual = await refTorneio.get();
        if (!torneioAtual.exists) throw new Error('Torneio não encontrado no banco.');
        if (torneioAtual.data().Resultado) {
            limpar(torneioId);
            alert('Este torneio já estava encerrado e gravado no banco. Nada foi alterado.');
            return false;
        }

        // Jogadores removidos do cadastro durante o torneio não têm rating para atualizar
        const docsJogadores = await Promise.all(resultadosParaSalvar.map(r => db.collection('players').doc(r.id).get()));
        const ausentes = resultadosParaSalvar.filter((r, i) => !docsJogadores[i].exists);
        if (ausentes.length) {
            const ok = await UI.confirmar(
                `Estes jogadores não existem mais no cadastro e não terão o rating atualizado:\n${ausentes.map(r => '• ' + r.nome).join('\n')}\n\nO resultado do torneio será gravado normalmente.`,
                { titulo: 'Jogadores fora do cadastro', botao: 'Gravar mesmo assim' });
            if (!ok) return false;
        }

        const lote = db.batch();
        lote.update(refTorneio, { Resultado: resultadosParaSalvar, historicoPartidas: historicoPartidas });
        resultadosParaSalvar.forEach((r, i) => {
            if (docsJogadores[i].exists) lote.update(db.collection('players').doc(r.id), { Rating: r.rating });
        });

        const aviso = setTimeout(() => {
            alert('A gravação está demorando (conexão lenta?). Não feche a página: o torneio será gravado assim que a conexão responder.');
        }, 10000);
        try {
            await lote.commit();
        } finally {
            clearTimeout(aviso);
        }
        limpar(torneioId);
        return true;
    }

    return { salvar, carregar, limpar, compativel, restaurar, descreverHorario, gravarEncerramento };
})();
