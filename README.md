# CCB Piano

App (Android, iOS e web) para aprender **teclado** com um **repertório pessoal** de músicas.
Funciona na **horizontal** (paisagem), como o Simply Piano.

A experiência de tocar é inspirada no Simply Piano: as notas caem sobre um
teclado, o app **escuta** o que o aluno toca (teclado na tela, teclado MIDI ou
microfone) e, no modo **Aprender**, **para e espera** até o aluno tocar a nota
certa. Sem instrutor de IA.

Visual **minimalista em preto e branco** (fonte Verdana, a mesma do site da
CCB), com modo colorido opcional. As telas:

1. **Boas-vindas** — “Bem-vinda, <nome>” e a escolha do avatar (Ralts, Eevee
   ou Piplup). O nome é fixo (`src/features/perfil/usuaria.ts`); o avatar fica
   salvo e aparece no app todo.
2. **Músicas** — a lista das 36 músicas, dividida em grupos (Jogos Vorazes,
   Loki, Cinquenta Tons de Cinza, Pedidos avulsos, One Direction, The Vampire
   Diaries, Nirvana, Linkin Park). Sem busca: os grupos à esquerda pulam até
   cada parte. Músicas ainda sem partitura aparecem como “sem partitura”.
3. **Perfil** — o avatar grande, o nome, a troca de avatar e as últimas
   músicas tocadas. Abre tocando no avatar.
4. **Tocar** — a música abre direto. Ao pausar, aparece o painel (inspirado no
   Artie): em cima, a **linha do tempo arrastável** (toque ou arraste para ir a
   qualquer compasso; ao tocar de novo há uma contagem antes do ponto) e os
   ajustes em abas:
   - **Prática** — quem toca cada mão e a pedaleira (App/Você), vozes, modo
     espera, acompanhamento, andamento digitável (− 72 +, 50/75/100%),
     metrônomo;
   - **Visualização** — Notas caindo ou Partitura, nomes das notas, teclado;
   - **Instrumento** — órgão ou piano, manuais, pedaleira, tamanho das teclas,
     volume;
   - **Ouvir você** — tela, teclado MIDI ou microfone, com teste ao vivo;
   - **Aparência** — fonte (Verdana, serifada ou OpenDyslexic) e cores: preto e
     branco (padrão) ou colorido, com a cor de cada parte (destaque, mãos,
     pedaleira, acerto, erro, fundo e papel) escolhida em amostras ou por
     código (#RRGGBB).

**Padrões na primeira vez** (cada pessoa pode mudar; fica salvo no navegador
dela): cartões de apresentação, partitura, órgão com manual superior (mão
direita), inferior (mão esquerda) e pedaleira, o aluno tocando as duas mãos e
a pedaleira, modo espera, microfone com sensibilidade alta, teclas pequenas,
volume médio, fonte serifada, cores ligadas (mão direita, mão esquerda e
pedaleira cada uma com a sua cor) e destaque #D81B60. No canto superior direito da
tela de tocar ficam dois interruptores: **Partitura | Notas** e **Órgão | Piano**.
No computador, as fileiras Q W E R… e Z X C V… do teclado tocam os manuais.

## O que já funciona

- **Repertório**: 36 músicas cadastradas; as partituras entram por MusicXML
  com `scripts/importar-partituras.py` (ver `docs/CONTEUDO.md`).
- **Órgão no formato da organista**: 3 pautas (mão direita, mão esquerda e
  pedaleira), notas repetidas seguradas nas vozes internas e pedal a partir do
  baixo — conferido com o hinário de órgão impresso.
- **Partitura no formato do hinário da organista**: duas pautas, 4 vozes com
  hastes por voz, armadura, fórmula de compasso, ♩ = metrônomo, dedilhado,
  acidentes corretos por compasso, cursor que acompanha e página que rola sozinha.
- **Ou notas caindo** sobre o teclado — o aluno escolhe na hora.
- **Praticar por voz** (soprano, contralto, tenor, baixo), por mão ou o hino
  inteiro; as outras vozes tocam junto como acompanhamento.

- **Notas caindo** sobre o teclado, com nome da nota ou número do dedo,
  linhas de compasso e guias de Dó/Fá.
- **Dois manuais** (superior e inferior) e **pedaleira**, cada um acendendo só
  as teclas que lhe cabem.
- **Modos**: só ouvir (o app toca tudo), modo espera (as notas esperam o aluno —
  acordes exigem todas as notas) e no andamento (precisão e estrelas).
- **Entradas**: teclado na tela (multitoque), **MIDI** (web — Chrome/Edge) e
  **microfone** (Android/iOS/web) com detecção de altura YIN em TypeScript puro.
- **Som**: piano com gravações reais de um piano de cauda (Salamander Grand
  Piano, CC BY 3.0 — `assets/audio/piano/LICENSE.txt`); órgão com tubos
  sintetizados (Principal 8' + 4' + 2', coro, sopro do ataque, Subbaixo 16'
  nos graves) e reverberação de igreja; metrônomo.
- **Teclado no trecho do hino**: os manuais (e o piano) mostram só a região
  que o hino usa, com teclas pequenas; a pedaleira vai de Dó1 a Dó2.

Fontes incluídas em `assets/fonts/`: OpenDyslexic (com a altura ajustada para
os acentos do português) e DejaVu Sans (substituta da Verdana no Android). A
serifada é a Source Serif 4 (`@expo-google-fonts/source-serif-4`); a fonte
serifada do Claude não é livre, então usamos a mais parecida.

## Rodando

```bash
npm install
npm run web          # navegador
npx expo run:android # build de desenvolvimento (necessário para microfone/áudio nativo)
npx expo run:ios
```

> O app usa `react-native-audio-api` (áudio e microfone nativos), então **não
> roda no Expo Go** — use um *development build* (`npx expo run:*` ou
> `eas build --profile development`).

Verificações:

```bash
npm run typecheck
npm run lint
npm test
```

## Publicar como site

O app também roda como site (uma página só, sem servidor próprio: os hinos
vêm junto e os ajustes ficam no navegador).

```bash
npm run build:web    # gera a pasta dist/
```

- **Vercel**: importe o repositório do GitHub; o `vercel.json` já diz como
  gerar o site e manda qualquer endereço (ex.: `/tocar/hino-005`) para o app.
- **Netlify / Cloudflare Pages**: comando `npm run build:web`, pasta `dist`;
  o arquivo `public/_redirects` faz o mesmo redirecionamento.
- **Domínio próprio**: registre (ex.: registro.br para `.com.br`/`.org.br`) e
  aponte o DNS para o serviço escolhido, nas configurações de domínio dele.

## Publicar na App Store e no Google Play (sem Mac)

O EAS (serviço da Expo) compila o app na nuvem e envia para as lojas; funciona
no Windows. O `eas.json` já tem os perfis `preview` (instalar em aparelhos de
teste) e `production` (lojas).

1. Crie a conta de desenvolvedor da Apple (paga, anual) e, para Android, a do
   Google Play (taxa única).
2. Em `app.json`, defina o identificador do app: `ios.bundleIdentifier` e
   `android.package` (ex.: `com.seunome.hinario`).
3. `npx eas-cli@latest login`
4. `npx eas-cli@latest build -p ios --profile production` (o EAS cria os
   certificados da Apple para você) e `-p android` para o Android.
5. `npx eas-cli@latest submit -p ios` envia para o App Store Connect
   (TestFlight); depois preencha a página do app e mande para revisão no site
   do App Store Connect.

## Arquitetura

```
src/
  app/                 Telas (Expo Router)
    index.tsx          Entrada: busca, Hinos/Coros e roda de números
    tocar/[songId].tsx Tocar o hino (painel de ajustes ao pausar)
  content/             Conteúdo como dados puros
    types.ts           Song, notas, vozes, trechos
    hinario/           480 hinos + 6 coros (JSON gerado pelo importador)
    hymnal.ts          Catálogo e carregamento dos hinos
    organ.ts           Arranjo da organista (mãos + pedaleira)
    notation.ts        Notação de texto (usada nos testes)
  engine/              Regras do jogo, sem UI (100% testável)
    timeline.ts        Batidas → segundos, trechos, mãos ativas
    practice-session.ts Relógio, modo espera/ritmo/demo, acertos, erros
    scoring.ts         Precisão e estrelas
  input/               Entradas do aluno
    input-hub.ts       Ponto único: toque, MIDI e microfone
    pitch/             YIN + estabilizador de notas + processador
    midi-input*.ts     Web MIDI (nativo: a integrar)
    mic-input*.ts      Microfone (nativo e web)
  audio/synth.ts       Sintetizador de piano/órgão
  components/          Teclado, pedaleira, notas caindo, partitura (HymnScore)
  music/spelling.ts    Grafia das notas (armadura, ♯ ♭ ♮ por compasso)
  features/player/     Tela de tocar, linha do tempo e o painel de ajustes
  features/settings/   Aparência (fonte e cores), também na tela inicial
  theme/               Paletas (preto e branco ou cores escolhidas) e fontes
  store/               Preferências (persistidas)
```

Leia também:

- [`docs/CONTEUDO.md`](docs/CONTEUDO.md) — como importar e cadastrar hinos.
- [`docs/PLANO_MOR.md`](docs/PLANO_MOR.md) — estudo do MOR (a trilha de lições foi retirada do app).
