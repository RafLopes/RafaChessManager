// Copia os dados do banco REAL para o EMULADOR local, para visualizar o site com os dados
// verdadeiros antes de um deploy.
//
// Segurança:
//  - No banco real este script só faz requisições GET (leitura). Não existe nenhum
//    PATCH/POST/DELETE apontado para o banco real.
//  - Gravações e limpeza acontecem apenas em http://127.0.0.1:8080 (emulador, projeto demo).
//  - Os dados copiados ficam só na memória do emulador; somem quando ele é desligado.
//
// Uso (com os emuladores rodando via `npm run emuladores`):
//   npm run copiar-dados-reais

const API_KEY = 'AIzaSyB02lwacq3W4GqqZ3AaMb_kSQZy_3veTqk'; // chave pública do site (mesma do firebase-config.js)
const ORIGEM = 'https://firestore.googleapis.com/v1/projects/rafatournament/databases/(default)/documents';
const DESTINO_PROJETO = 'demo-rafatournament';
const DESTINO = `http://127.0.0.1:8080/v1/projects/${DESTINO_PROJETO}/databases/(default)/documents`;
const COLECOES = ['players', 'torneio', 'online', 'n_etapas_online', 'links_etapas'];

if (!DESTINO.startsWith('http://127.0.0.1:8080/') || !DESTINO_PROJETO.startsWith('demo-')) {
    throw new Error('O destino precisa ser o emulador local de um projeto demo.');
}

// Leitura do banco real: somente GET
async function lerColecaoReal(colecao) {
    const documentos = [];
    let pagina = '';
    do {
        const url = `${ORIGEM}/${colecao}?pageSize=300&key=${API_KEY}${pagina ? `&pageToken=${encodeURIComponent(pagina)}` : ''}`;
        const resp = await fetch(url, { method: 'GET' });
        if (!resp.ok) throw new Error(`${resp.status} ${(await resp.text()).slice(0, 200)}`);
        const dados = await resp.json();
        documentos.push(...(dados.documents || []));
        pagina = dados.nextPageToken || '';
    } while (pagina);
    return documentos;
}

// Login de teste do emulador (admin@teste.local / xadrez-teste-123). O UID fixo
// "admin-teste-emulador" está na lista de administradores do firestore.rules.
async function criarAdminTeste() {
    const AUTH = 'http://127.0.0.1:9099';
    await fetch(`${AUTH}/emulator/v1/projects/${DESTINO_PROJETO}/accounts`, { method: 'DELETE' });
    const resp = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${DESTINO_PROJETO}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
        body: JSON.stringify({ localId: 'admin-teste-emulador', email: 'admin@teste.local', password: 'xadrez-teste-123' })
    });
    if (!resp.ok) throw new Error(`Falha ao criar o login de teste no emulador: ${await resp.text()}`);
}

async function main() {
    const emulador = await fetch(`${DESTINO}/players?pageSize=1`, { headers: { Authorization: 'Bearer owner' } }).catch(() => null);
    if (!emulador || !emulador.ok) throw new Error('Emulador não está rodando. Rode antes: npm run emuladores');

    // 1) Ler tudo primeiro (se alguma coleção falhar, o emulador não é tocado)
    const lidos = {};
    for (const colecao of COLECOES) {
        try {
            lidos[colecao] = await lerColecaoReal(colecao);
            console.log(`Lido do banco real: ${colecao} (${lidos[colecao].length} documentos)`);
        } catch (erro) {
            console.warn(`Não foi possível ler "${colecao}": ${erro.message}`);
        }
    }
    if (!lidos.players || !lidos.torneio) throw new Error('Não foi possível ler jogadores e torneios; nada foi alterado no emulador.');

    // 2) Limpar apenas os documentos do emulador e recriar o login de teste
    await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${DESTINO_PROJETO}/databases/(default)/documents`, { method: 'DELETE' });
    await criarAdminTeste();

    // 3) Gravar no emulador
    for (const [colecao, documentos] of Object.entries(lidos)) {
        for (const doc of documentos) {
            const id = doc.name.split('/').pop();
            const resp = await fetch(`${DESTINO}/${colecao}/${encodeURIComponent(id)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
                body: JSON.stringify({ fields: doc.fields || {} })
            });
            if (!resp.ok) throw new Error(`Falha ao gravar ${colecao}/${id} no emulador: ${await resp.text()}`);
        }
        console.log(`Copiado para o emulador: ${colecao} (${documentos.length})`);
    }
    console.log('Pronto! Abra http://127.0.0.1:5000 para ver o site com os dados reais (no emulador).');
}

main().catch(erro => { console.error(erro.message); process.exit(1); });
