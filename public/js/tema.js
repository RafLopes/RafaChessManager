// Aplica o tema claro/escuro antes da página desenhar (evita "piscar").
(function () {
    var tema = null;
    try { tema = localStorage.getItem('tema'); } catch (e) {}
    if (tema !== 'light' && tema !== 'dark') {
        tema = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-bs-theme', tema);
})();
