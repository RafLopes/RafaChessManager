async function ListarJogadores() {
    var db = firebase.firestore();
    var players = [];

    try {
        const querySnapshot = await db.collection('players').get();
        querySnapshot.forEach((doc) => {
            let playerData = doc.data();
            playerData.id = doc.id; // Adiciona o identificador ao objeto do jogador
            players.push(playerData);
        });
        
        // Ordenar jogadores alfabeticamente por nome
        players.sort((a, b) => a.Nome.localeCompare(b.Nome, 'pt-BR'));
        
        const playersJSON = JSON.stringify(players);
        console.log(playersJSON);
        return playersJSON;
    } catch (error) {
        console.error('Error getting documents: ', error);
    }
}

// NOVA FUNÇÃO: Auditoria SIMPLES de ratings para detectar discrepâncias
async function auditarRatings() {
    const db = firebase.firestore();
    
    console.clear();
    console.log('%c=== AUDITORIA DE RATINGS ===', 'background: #2196F3; color: white; padding: 10px; font-size: 16px; font-weight: bold;');
    
    const torneios = [];
    const torneiosSnap = await db.collection('torneio').get();
    
    torneiosSnap.forEach(doc => {
        if (doc.data().Resultado) { // Só torneios finalizados
            torneios.push({
                id: doc.id,
                nome: doc.data().nome,
                data: doc.data().data,
                resultado: doc.data().Resultado
            });
        }
    });
    
    // Ordenar por data
    torneios.sort((a, b) => new Date(a.data) - new Date(b.data));
    
    console.log(`\n📊 Encontrados ${torneios.length} torneios finalizados\n`);
    
    // Mapa: jogador ID → [torneios em ordem]
    const historico = {};
    
    torneios.forEach(torneio => {
        torneio.resultado.forEach(resultado => {
            const id = resultado.id;
            if (!historico[id]) historico[id] = [];
            
            historico[id].push({
                nome: torneio.nome,
                data: torneio.data,
                ratingFinal: resultado.rating || 'N/A'
            });
        });
    });
    
    // Agora verificar discrepâncias
    const playersSnap = await db.collection('players').get();
    const discrepancias = [];
    
    playersSnap.forEach(playerDoc => {
        const jogadorId = playerDoc.id;
        const jogadorNome = playerDoc.data().Nome;
        
        if (!historico[jogadorId] || historico[jogadorId].length < 2) {
            return; // Pula jogadores sem histórico
        }
        
        const torneiosJogador = historico[jogadorId];
        
        // Verificar consecutivos
        for (let i = 0; i < torneiosJogador.length - 1; i++) {
            const atual = torneiosJogador[i];
            const proximo = torneiosJogador[i + 1];
            
            // Buscar rating inicial do próximo torneio nos dados brutos
            const torneioProxObj = torneios.find(t => t.nome === proximo.nome);
            if (!torneioProxObj) continue;
            
            const resultadoProx = torneioProxObj.resultado.find(r => r.id === jogadorId);
            const ratingInicialProx = resultadoProx?.rating ? resultadoProx.rating - (resultadoProx.variacaoRating || 0) : 'N/A';
            
            // Comparar
            if (atual.ratingFinal !== ratingInicialProx && atual.ratingFinal !== 'N/A' && ratingInicialProx !== 'N/A') {
                discrepancias.push({
                    jogador: jogadorNome,
                    torneio1: atual.nome,
                    torneio2: proximo.nome,
                    ratingFinal1: atual.ratingFinal,
                    ratingInicial2: ratingInicialProx,
                    diferenca: ratingInicialProx - atual.ratingFinal
                });
            }
        }
    });
    
    // RESULTADO FINAL
    console.log('%c=== RESULTADO ===', 'background: #4CAF50; color: white; padding: 10px; font-size: 14px; font-weight: bold;');
    
    if (discrepancias.length === 0) {
        console.log('\n✅ %cNENHUMA DISCREPÂNCIA ENCONTRADA!', 'color: green; font-weight: bold; font-size: 14px;');
    } else {
        console.log(`\n❌ %c${discrepancias.length} DISCREPÂNCIA(S) ENCONTRADA(S):`, 'color: red; font-weight: bold; font-size: 14px;');
        console.log('\n');
        
        discrepancias.forEach((d, idx) => {
            console.log(`${idx + 1}. %c${d.jogador}`, 'font-weight: bold; color: #FF6B6B;');
            console.log(`   De: "${d.torneio1}" (Rating Final: ${d.ratingFinal1})`);
            console.log(`   Para: "${d.torneio2}" (Rating Inicial: ${d.ratingInicial2})`);
            console.log(`   %cDiferença: ${d.diferenca > 0 ? '+' : ''}${d.diferenca}`, 'color: red; font-weight: bold;');
            console.log('');
        });
    }
    
    console.log('%c================================', 'background: #2196F3; color: white; padding: 10px;');
}

async function verificarTorneiosAbertos() {
    const db = firebase.firestore();
    try {
        const querySnapshot = await db.collection('torneio').get();
        for (const doc of querySnapshot.docs) {
            const torneioData = doc.data();
            if (!torneioData.Resultado) {
                return {
                    existeTorneioAberto: true,
                    nomeTorneio: torneioData.nome
                };
            }
        }
        return {
            existeTorneioAberto: false
        };
    } catch (error) {
        console.error('Erro ao verificar torneios abertos:', error);
        throw error;
    }
}

async function cadastrarTorneio() {
    try {
        // Verificar se existe torneio em aberto
        const { existeTorneioAberto, nomeTorneio } = await verificarTorneiosAbertos();
        
        if (existeTorneioAberto) {
            alert(`Não é possível criar um novo torneio. Existe um torneio em aberto: ${nomeTorneio}`);
            return;
        }

        // ... resto do código existente para cadastrar o torneio ...
        
    } catch (error) {
        console.error('Erro ao cadastrar torneio:', error);
        alert('Erro ao cadastrar torneio. Por favor, tente novamente.');
    }
}