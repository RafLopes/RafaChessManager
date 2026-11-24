document.addEventListener('DOMContentLoaded', async function() {
    const db = firebase.firestore();
    
    // Função para atualizar a tabela
    function atualizarTabela(dados) {
        const tbody = document.getElementById('classificacao-tbody');
        tbody.innerHTML = '';
        
        const e = UI.escapar;
        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><i class="bi bi-hourglass"></i>Nenhum resultado disponível ainda.</td></tr>';
        }
        dados.forEach((jogador, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="width:4rem">${UI.badgePosicao(index + 1)}</td>
                <td><a href="https://www.chess.com/member/${encodeURIComponent(jogador.username)}" target="_blank" rel="noopener" class="fw-semibold text-decoration-none">${e(jogador.username)}</a></td>
                <td class="text-end fw-semibold num">${jogador.score.toFixed(1)}</td>
                <td class="text-end num">${e(jogador.tournamentCount)}</td>
                <td class="text-end num">${jogador.vitoriasdetorneio ? '🏆 ' : ''}${e(jogador.vitoriasdetorneio)}</td>
            `;
            tbody.appendChild(tr);
        });
        const podio = document.getElementById('podioOnline');
        if (podio) podio.innerHTML = dados.length ? UI.podio(dados.slice(0, 3).map(j => ({ nome: j.username, detalhe: `${j.score.toFixed(1)} pts` }))) : '';
    }

    // Função para atualizar a barra de progresso
    function atualizarProgresso(valor, total) {
        const progress = document.getElementById('progress');
        const porcentagem = (valor / total) * 100;
        progress.style.width = `${porcentagem}%`;
    }

    // Função para obter os torneios de um jogador
    async function getPlayerTournaments(username) {
        const response = await fetch(
            `https://api.chess.com/pub/player/${username}/tournaments`
        );

        if (response.status === 200) {
            const tournaments = await response.json();
            return tournaments;
        } else {
            throw new Error(response.statusText);
        }
    }

    // Função para obter resultados dos usuários
    async function getResultByUser(memberList, filter) {
        const membersResult = [];
        const bonusPoints = [6, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const total = memberList.length;
        let progress = 0;

        for (const username of memberList) {
            try {
                let score = 0;
                let tournamentCount = 0;
                let vitoriasdetorneio = 0;

                const body = await getPlayerTournaments(username);
                // Cada torneio do Chess.com conta separadamente, mesmo que dois tenham o mesmo
                // número de etapa (ex.: as duas "Etapa 82" da VII Copa são válidas).
                // As vitórias do Chess.com já incluem os BYEs (1 ponto cada).
                const tournaments = body.finished.filter((t) => filter.test(t.url));

                if (tournaments.length > 0) {
                    for (const t of tournaments) {
                        tournamentCount++;
                        score += t.wins + 0.5 * t.draws;
                        score += bonusPoints[t.placement - 1] ?? 0;
                        if (t.placement === 1) {
                            vitoriasdetorneio += 1;
                        }
                    }

                    membersResult.push({ username, score, tournamentCount, vitoriasdetorneio });
                }

                progress++;
                atualizarProgresso(progress, total);

            } catch (error) {
                console.error(`Erro ao processar jogador ${username}:`, error);
            }
        }

        return membersResult.sort((m1, m2) => m2.score - m1.score);
    }

    // Função para carregar dados do Firestore
    async function carregarDados() {
        try {
            const snapshot = await db.collection('online').orderBy('score', 'desc').get();
            const dados = snapshot.docs.map(doc => doc.data());
            atualizarTabela(dados);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Erro ao carregar os dados da classificação');
        }
    }

    // Função para atualizar dados no Firestore
    async function atualizarDados() {
        document.querySelector('.progress-container').style.display = 'block';
        
        try {
            // Buscar membros do clube
            const response = await fetch('https://api.chess.com/pub/club/clube-de-xadrez-erbo-stenzel/members');
            const data = await response.json();
            const members = [...new Set([...data.weekly, ...data.monthly, ...data.all_time])].map(member => member.username);

            // Etapas da VII Copa Alexandre Direne, com qualquer quantidade de traços no endereço:
            //   cxes-online-2025---vii-copa-...  (primeira etapa, criada com o ano errado)
            //   cxes-online-2026---vii-copa-...  (padrão)
            //   cxes-online-2026-vii-copa-...    (algumas etapas criadas com um traço só)
            // O "-vii-copa" exige o traço antes do "vii", então não pega a VI nem uma futura VIII.
            const etapasDaCopa = /cxes-online-202[56]-+vii-copa-alexandre-direne/i;
            const results = await getResultByUser(members, etapasDaCopa);

            // Salvar no Firestore
            const batch = db.batch();
            
            // Primeiro, limpar a coleção existente
            const snapshot = await db.collection('online').get();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Depois, adicionar os novos dados
            results.forEach((result, index) => {
                const docRef = db.collection('online').doc(index.toString());
                batch.set(docRef, result);
            });

            await batch.commit();
            
            // Atualizar a tabela
            atualizarTabela(results);
            alert('Dados atualizados com sucesso!');

        } catch (error) {
            console.error('Erro ao atualizar dados:', error);
            alert('Erro ao atualizar os dados');
        } finally {
            document.querySelector('.progress-container').style.display = 'none';
        }
    }

    // Função para carregar o número da etapa
    async function carregarNumeroEtapa() {
        try {
            const etapaDoc = await db.collection('online').doc('etapa').get();
            if (etapaDoc.exists) {
                const dados = etapaDoc.data();
                const numeroEtapa = dados.etapa;
                document.getElementById('numero-etapa').textContent = numeroEtapa;
            } else {
                console.log('Documento etapa não encontrado');
                document.getElementById('numero-etapa').textContent = '?';
            }
        } catch (error) {
            console.error('Erro ao carregar número da etapa:', error);
            document.getElementById('numero-etapa').textContent = '?';
        }
    }

    // Carregar dados iniciais e número da etapa
    await Promise.all([
        carregarDados(),
        carregarNumeroEtapa()
    ]);

    // Adicionar evento ao botão de atualização
    document.getElementById('atualizar-dados').addEventListener('click', atualizarDados);
});