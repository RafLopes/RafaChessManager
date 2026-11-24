// Regra de pontuação da Copa presencial, usada pela página da Copa e pelo histórico do jogador.
// Função pura: não acessa o banco nem a tela. Carregada como <script> no site e importada nos testes.
//
// Regra:
//  - entram os torneios com copa === true cuja data ("aaaa-mm-dd") é do ano pedido;
//  - em cada etapa, a classificação é usada exatamente na ordem gravada no encerramento
//    (pontos > vitórias > Sonneborn-Berger > rating), sem reordenar;
//  - cada jogador ganha o bônus da posição (1º=6, 2º=4, 3º=3, 4º=2, 5º=1) + os pontos feitos;
//  - soma pelo nome; BYE e nomes vazios são ignorados;
//  - ranking final por pontos; empatados ficam na ordem em que apareceram pela primeira vez.
(function () {
    const BONUS = [6, 4, 3, 2, 1];

    const nomeDoResultado = j => (j.jogador ? j.jogador.nome : j.nome);
    const nomeValido = nome => nome && nome !== 'BYE' && nome !== 'undefined';

    function calcular(torneios, ano) {
        const torneiosDoAno = [];
        const pontosPorNome = new Map();

        for (const torneio of torneios) {
            if (torneio.copa !== true) continue;
            const anoTorneio = torneio.data ? parseInt(torneio.data.substring(0, 4)) : null;
            if (anoTorneio !== ano) continue;
            torneiosDoAno.push(torneio);

            if (!Array.isArray(torneio.Resultado)) continue;
            torneio.Resultado.forEach((jogador, posicao) => {
                const nome = nomeDoResultado(jogador);
                if (!nomeValido(nome)) return;
                const pontos = (BONUS[posicao] ?? 0) + (jogador.pontos || 0);
                pontosPorNome.set(nome, (pontosPorNome.get(nome) || 0) + pontos);
            });
        }

        const classificacao = Array.from(pontosPorNome.entries())
            .filter(([nome]) => nomeValido(nome))
            .map(([nome, pontos]) => ({ nome, pontos }))
            .sort((a, b) => b.pontos - a.pontos);

        return { torneiosDoAno, classificacao };
    }

    globalThis.Copa = { BONUS, calcular };
})();
