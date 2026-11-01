# Rafa Chess Manager ♟️

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)
![Bootstrap](https://img.shields.io/badge/Bootstrap_5-7952B3?logo=bootstrap&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

Sistema completo para gerenciamento de torneios de xadrez, com cálculo automático de ratings, emparceiramento inteligente e acompanhamento de copa anual. Usado de verdade pelo Clube de Xadrez Erbo Stenzel para organizar seus torneios.

🔗 **Demo ao vivo**: https://rafatournament.web.app

### ✨ Destaques técnicos

- **Algoritmos de emparceiramento** próprios: sistema Suíço e Schuring, com BYE automático e desempate Sonneborn-Berger
- **Rating ELO** recalculado automaticamente ao final de cada torneio
- **Segurança no servidor**: regras do Firestore permitem leitura pública e gravação apenas para administradores autenticados
- **Ambiente de testes isolado**: emuladores do Firebase com dados fictícios gerados por script, sem nenhum risco ao banco real
- **Sem etapa de build**: HTML, CSS e JavaScript puros, com tema claro/escuro e layout responsivo

**Tecnologia**: JavaScript (Vanilla) · Bootstrap 5 · Firebase (Firestore + Authentication + Hosting)

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades Principais](#funcionalidades-principais)
- [Formatos de Torneio](#formatos-de-torneio)
- [Gerenciamento de Jogadores](#gerenciamento-de-jogadores)
- [Sistema de Ratings](#sistema-de-ratings)
- [Copa Anual](#copa-anual)
- [Instalação e Configuração](#instalação-e-configuração)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Guia de Uso](#guia-de-uso)
- [Arquitetura Técnica](#arquitetura-técnica)

---

## 🎯 Visão Geral

O Rafa Chess Manager é uma plataforma web moderna para gerenciamento completo de torneios de xadrez. Oferece suporte para múltiplos formatos de torneio, cálculo automático de ratings ELO, emparceiramento inteligente com critérios de desempate profissionais e acompanhamento de uma copa anual.

O sistema foi desenvolvido com foco em facilitar a organização de torneios offline e online, com interface intuitiva para administradores e acompanhamento transparente de resultados para todos os participantes.

---

## 🚀 Funcionalidades Principais

### 1. **Cadastro e Gerenciamento de Jogadores**
- Cadastro de novos jogadores com: Nome, Idade, Rating inicial, Sexo
- Visualização de todos os jogadores cadastrados
- Edição de dados de jogadores
- Remoção de jogadores com confirmação de segurança
- Histórico individual: visualize todos os torneios e resultados de cada jogador

### 2. **Criação e Gerenciamento de Torneios**
- Criação de torneios com configuração personalizada
- Seleção de jogadores participantes
- Escolha de formato (Suíço ou Schuring)
- Definição de datas dos torneios
- Suporte para Copa Anual (flag separada)
- Visualização e edição de torneios em aberto

### 3. **Execução de Torneios Online**
- Interface intuitiva para registrar resultados em tempo real
- Suporte para BYE automático (quando número de jogadores é ímpar)
- Rounds automáticos com emparceiramento inteligente
- Validação de dados antes de confirmar rodadas

### 4. **Entrada Manual de Resultados (Torneio Manual)**
- Registro de resultados de torneios já realizados offline
- Interface clara para cada rodada e partida
- Seleção de jogadores com BYE automático
- Cálculo de ratings e Sonneborn-Berger apenas após confirmação final

### 5. **Cálculo Automático de Ratings**
- Fórmula ELO profissional (K=20)
- Cálculo automático após cada torneio
- Atualização em tempo real na base de dados
- Visualização de variações de rating

### 6. **Copa Anual**
- Agregação automática de resultados de torneios marcados como "Copa"
- Sistema de pontuação: 6pts (1º), 4pts (2º), 3pts (3º), 2pts (4º), 1pt (5º), 0 (6º+)
- Ranking atualizado em tempo real
- Filtro por ano automático baseado na data do torneio

---

## 🎲 Formatos de Torneio

### **1. Suíço (Swiss)**
- Sistema de emparceiramento por força (jogadores de rating similar se enfrentam)
- Cada jogador joga o mesmo número de rodadas
- Evita repetições de oponentes
- Indicado para: Torneios com muitos participantes e poucas rodadas
- **Critério de Desempate**: Sonneborn-Berger (pontuação dos oponentes vencidos)

### **2. Schuring (Round-Robin Modificado)**
- Todos os jogadores se enfrentam entre si (todos vs todos)
- Máximo de precisão na classificação
- Indicado para: Torneis com poucos participantes (até 8-10 jogadores)
- **Critério de Desempate**: Sonneborn-Berger
- **BYE**: Atribuído automaticamente quando número de jogadores é ímpar

---

## 👥 Gerenciamento de Jogadores

### Telas Disponíveis:

#### **Cadastro de Jogadores** (`CadastroPlayers.html`)
- Formulário para adicionar novos jogadores
- Campos obrigatórios: Nome, Idade, Rating inicial, Sexo
- Validação de entrada antes de salvar

#### **Lista de Jogadores** (`ListaPlayers.html`)
- Visualização de todos os jogadores cadastrados
- Exibição de: Nome, Idade, Rating atual, Sexo
- Busca e filtragem de jogadores
- Acesso rápido ao histórico individual

#### **Remover Jogadores** (`RemoverPlayers.html`)
- Interface segura para remover jogadores
- Confirmação antes de deletar
- Aviso se jogador participa de torneios em aberto

#### **Histórico do Jogador** (`HistoricoJogador.html`)
- Visualização completa de todos os torneios que o jogador participou
- Resultados, posição final e variação de rating
- Estatísticas individuais

---

## ⚡ Sistema de Ratings

### Fórmula ELO Utilizada:
```
Novo Rating = Rating Atual + K × (Resultado - Expectativa)
```

Onde:
- **K = 20** (coeficiente fixo)
- **Resultado (S)** = 1 (vitória), 0.5 (empate), 0 (derrota)
- **Expectativa (E)** = 1 / (1 + 10^((Rating Oponente - Seu Rating) / 400))

### Características:
- Atualização automática após cada torneio
- Apenas partidas entre jogadores não-BYE são contabilizadas
- Histórico de variações salvo no banco de dados
- Visualização de antes/depois em cada resultado

### Pontuação do Torneio:
- **Vitória**: 1 ponto
- **Empate**: 0.5 ponto
- **Derrota**: 0 ponto
- **BYE**: 1 ponto (não afeta rating)

---

## 🏆 Copa Anual

### Como Funciona:
1. Torneios marcados como "Copa" são contabilizados
2. Apenas torneios do ano atual são incluídos (filtro automático)
3. Pontuação acumulada baseada em posição final:
   - 🥇 1º Lugar: 6 pontos
   - 🥈 2º Lugar: 4 pontos
   - 🥉 3º Lugar: 3 pontos
   - 4º Lugar: 2 pontos
   - 5º Lugar: 1 ponto
   - 6º+ Lugar: 0 pontos

### Tela de Resultados** (`ResultadoCopa.html`)
- Ranking geral da copa anual
- Lista de torneios realizados (ordenados por data)
- Status de cada torneio (Finalizado/Em andamento)
- Atualização em tempo real

---

## 🛠️ Instalação e Configuração

### Requisitos:
- Node.js 14+ com npm
- Firebase CLI (`npm install -g firebase-tools`)
- Conta Google e projeto Firebase

### Passos de Instalação:

```bash
# 1. Clonar ou baixar o repositório
git clone https://github.com/RafLopes/RafaChessManager.git
cd RafaChessManager

# 2. Instalar dependências
npm install

# 3. Configurar Firebase (já configurado, apenas informativo)
firebase init
firebase login

# 4. Deploy
firebase deploy
```

### Testes locais (sem tocar no banco real)

O site detecta quando está rodando em `localhost`/`127.0.0.1` (ou aberto direto do disco) e passa a usar
os **emuladores do Firebase** com o projeto isolado `demo-rafatournament`. Um projeto `demo-` não existe
na nuvem, então nenhuma leitura ou escrita chega ao banco real do clube. Uma faixa amarela
"AMBIENTE DE TESTE" aparece no topo de todas as páginas nesse modo.

Requisitos: Java 21 (Temurin) e Firebase CLI.

```bash
npm run emuladores   # sobe Firestore, Auth e Hosting locais (site em http://127.0.0.1:5000)
npm run seed         # em outro terminal: apaga e recria os dados fictícios de teste
npm run copiar-dados-reais   # ou: copia os dados do banco real para o emulador (só leitura no real)
```

`copiar-dados-reais` só faz leituras (GET) no banco real e grava apenas no emulador local. Os dados
copiados ficam só na memória do emulador e somem quando ele é desligado.

Login de teste: `admin@teste.local` / `xadrez-teste-123` (só existe no emulador).
O painel dos emuladores fica em http://127.0.0.1:4000.

### Configuração Firebase:
- **Projeto**: rafatournament
- **Hosting URL**: https://rafatournament.web.app
- **Firestore Database**: Configurado com collections "players" e "torneio"

---

## 📁 Estrutura do Projeto

```
RafaChessManager/
├── public/                          # Arquivos públicos (frontend)
│   ├── index.html                   # Menu principal
│   ├── login.html                   # Tela de login
│   ├── CadastroPlayers.html         # Cadastro de jogadores
│   ├── ListaPlayers.html            # Lista de jogadores
│   ├── RemoverPlayers.html          # Remover jogadores
│   ├── HistoricoJogador.html        # Histórico individual
│   ├── CadastroTorneio.html         # Criar novo torneio
│   ├── VisualizarTorneio.html       # Editar torneio
│   ├── JogarTorneio.html            # Jogar torneio (geral)
│   ├── JogarTorneioSuico.html       # Interface Suíço
│   ├── JogarTorneioSchuring.html    # Interface Schuring
│   ├── TorneioManual.html           # Entrada manual de resultados
│   ├── GerenciarEtapasOnline.html   # Gerenciar rodadas online
│   ├── EditarTorneio.html           # Editar detalhes do torneio
│   ├── ResultadoCopa.html           # Resultados da copa anual
│   ├── ClassificacaoOnline.html     # Classificação em tempo real
│   ├── LinksEtapas.html             # Links de acesso aos torneios
│   │
│   ├── js/                          # Lógica JavaScript
│   │   ├── firebase-config.js       # Configuração Firebase
│   │   ├── login.js                 # Autenticação e controle de acesso
│   │   ├── Cadastrar.js             # Cadastro de jogadores
│   │   ├── Listar.js                # Listagem de jogadores
│   │   ├── Remover.js               # Remoção de jogadores
│   │   ├── HistoricoJogador.js      # Histórico individual
│   │   ├── CadastrarTorneio.js      # Criar torneios
│   │   ├── JogarTorneio.js          # Lógica geral de torneios
│   │   ├── JogarTorneioSuico.js     # Emparceiramento Suíço
│   │   ├── JogarTorneioSchuring.js  # Emparceiramento Schuring
│   │   ├── TorneioManual.js         # Entrada manual de resultados
│   │   ├── ResultadoCopa.js         # Resultados da copa
│   │   ├── ClassificacaoOnline.js   # Classificação online
│   │   ├── VisualizarTorneio.js     # Visualização de torneios
│   │   ├── editartorneio.js         # Edição de torneios
│   │   └── gerenciarEtapasOnline.js # Gerenciamento de rodadas
│   │
│   └── css/                         # Estilos (integrado no HTML)
│
├── firebase.json                    # Configuração Firebase Hosting
├── package.json                     # Dependências e metadata
└── readme.md                        # Este arquivo

```

---

## 📖 Guia de Uso

### Para Administradores:

#### 1. **Gerenciar Jogadores**
   - Acesse "Cadastro de Jogadores" para adicionar novos participantes
   - Use "Lista de Jogadores" para visualizar e buscar jogadores
   - Use "Remover Jogadores" para deletar jogadores inativos
   - Acesse "Histórico do Jogador" para visualizar performance individual

#### 2. **Criar um Novo Torneio**
   - Clique em "Novo Torneio"
   - Preencha: Nome, Data, Formato (Suíço/Schuring)
   - Marque "Copa Anual" se for contabilizado
   - Selecione os jogadores participantes
   - Clique em "Criar Torneio"

#### 3. **Executar Torneio Online**
   - Acesse "Jogar Torneio"
   - Selecione o torneio
   - Para cada rodada: sistema auto-emparelha jogadores
   - Registre os resultados (Brancas vs Pretas)
   - Clique "Próxima Rodada" para continuar
   - Após última rodada, clique "Finalizar Torneio"
   - Ratings são atualizados automaticamente

#### 4. **Entrada Manual (Torneio Realizado Offline)**
   - Acesse "Torneio Manual"
   - Selecione um torneio em aberto
   - Para cada rodada, preencha os resultados
   - BYE é adicionado automaticamente se necessário
   - Clique "Encerrar Torneio"
   - Sistema calcula ratings e Sonneborn-Berger

#### 5. **Visualizar Resultados da Copa**
   - Acesse "Resultado Copa"
   - Veja ranking geral de pontos acumulados
   - Lista de torneios realizados (ordenada por data)
   - Filtragem automática por ano

### Para Participantes (Guest):

- Visualizar lista de jogadores e seus ratings
- Visualizar histórico pessoal de resultados
- Acompanhar ranking da copa anual
- Visualizar resultados de torneios finalizados

---

## 🔧 Arquitetura Técnica

### Frontend:
- **Linguagem**: HTML5 + CSS3 + JavaScript (Vanilla)
- **Visual**: Bootstrap 5.3 + Bootstrap Icons via CDN (sem etapa de build), tema em `public/css/tema.css`
- **Componentes compartilhados**: `public/js/ui.js` (menu, rodapé, tema claro/escuro, toasts, confirmações, botões de resultado)
- **Responsivo**: Design adaptável para desktop e mobile
- **Persistência**: LocalStorage para controle de sessão

### Backend:
- **Serviço**: Firebase (Google Cloud)
- **Banco de Dados**: Firestore (NoSQL)
- **Autenticação**: Firebase Authentication
- **Hosting**: Firebase Hosting

### Collections Firestore:

#### **players**
```javascript
{
  id: string,           // ID numérico único
  Nome: string,         // Nome do jogador
  Idade: number,        // Idade
  Rating: number,       // Rating ELO atual
  sexo: string          // M ou F
}
```

#### **torneio**
```javascript
{
  id: string,                    // ID numérico único
  nome: string,                  // Nome do torneio
  Formato: string,               // "suico" ou "schuring"
  copa: boolean,                 // Contabiliza na copa?
  data: string,                  // "yyyy-mm-dd"
  jogadores: Array,              // Jogadores participantes
  Resultado: Array,              // [{jogador, pontos, rating_antes, rating_depois}, ...]
  historicoPartidas: Object,     // {rodada1: [...], rodada2: [...], ...}
  etapas: Array                  // Array de rodadas já jogadas
}
```

### API Endpoints Principais:

**Leitura de Jogadores**: `firestore.collection('players').get()`
**Criar Torneio**: `firestore.collection('torneio').add(dados)`
**Atualizar Rating**: `firestore.collection('players').doc(id).update({Rating: novoRating})`
**Buscar Copa Anual**: `firestore.collection('torneio').where('copa', '==', true).get()`

### Segurança:
- Quem protege o banco são as **regras do Firestore** (`firestore.rules`), não o site. Esconder botões
  ou páginas no navegador não impede ninguém de gravar: qualquer pessoa pode chamar o Firestore direto.
- Leitura pública em `players`, `torneio`, `online`, `n_etapas_online` e `links_etapas`; gravação só para
  os UIDs listados em `ehAdmin()`. Qualquer outra coleção fica bloqueada.
- A chave `apiKey` do `firebase-config.js` é pública por natureza (só identifica o projeto) e não dá acesso
  a nada sozinha.
- Publicar as regras: `firebase deploy --only firestore:rules` (o deploy do site continua sendo
  `firebase deploy --only hosting`).
- Para adicionar outro administrador: copie o UID dele em Authentication > Users e inclua na lista de `ehAdmin()`.
- No emulador, a conta de teste tem o UID fixo `admin-teste-emulador`, que também está na lista.
- O `userRole` do LocalStorage só controla o que aparece na tela; não dá permissão nenhuma.

---

## 📊 Cálculos Importantes

### Sonneborn-Berger (Desempate):
Soma da pontuação dos adversários que você venceu, mais metade da pontuação dos adversários com quem empatou.

```
SB = Σ(pontos dos adversários vencidos) + 0.5 × Σ(pontos dos adversários empatados)
```

### BYE:
- Atribuído automaticamente quando número de jogadores é ímpar
- Jogador que recebe BYE: ganha 1 ponto e não sofre perda de rating
- Oponente que deveria jogar: automático, sem afetar seu rating

---

## 🐛 Troubleshooting

### Problema: "IDs duplicados" 
**Solução**: IDs são gerados por `Math.max(...existingIds) + 1`. Se houver erro, verifique se todos os IDs no Firestore são numéricos.

### Problema: "Ratings não atualizam"
**Solução**: Verifique se torneio foi finalizado com todos os resultados. Ratings são calculados no momento de finalizar.

### Problema: "Copa não mostra torneios"
**Solução**: Verifique se torneio foi marcado com `copa: true` e se a data está no ano atual.

---

## 📝 Notas de Desenvolvimento

- Versão atual: Firebase 8.10.0
- Sem uso de frameworks externos (React, Vue, etc.)
- CSS integrado em cada HTML para portabilidade
- Console logs disponíveis para debugging em desenvolvimento
- Deploy automático via Firebase Hosting

---

## 📄 Licença

Distribuído sob a licença MIT. Veja o arquivo [LICENSE](LICENSE).

---

## 📧 Contato e Suporte

Desenvolvido por **Rafael Lopes** ([@RafLopes](https://github.com/RafLopes)).

Para dúvidas ou sugestões sobre o sistema, abra uma issue no repositório.

**Última atualização**: Maio de 2026