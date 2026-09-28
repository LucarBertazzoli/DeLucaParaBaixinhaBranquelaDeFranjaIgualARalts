# Como cadastrar conteúdo

Todo o conteúdo é **dado** (TypeScript em `src/content/`). As telas não mudam
quando entram hinos novos. No futuro, os mesmos objetos podem vir de
uma API/JSON.

## 1. Repertório e partituras

A lista de músicas (título, artista e grupo) fica em
`src/content/repertorio.ts`. A tela inicial mostra todas, na ordem e com a
divisão de lá. Cada música tem um `id` (ex.: `in-the-end`, `safe-and-sound`).

As partituras **não vêm com o app**: são músicas protegidas por direitos
autorais, então cada uma entra por um arquivo que você tenha licença para usar
(por exemplo, um arranjo comprado no Musescore.com ou no Musicnotes). Enquanto
uma música não tem partitura, ela aparece na lista como “sem partitura”.

Para importar:

1. Exporte a partitura como **MusicXML** (`.musicxml`, `.xml` ou `.mxl` — no
   MuseScore: *Arquivo → Exportar → MusicXML*). O ideal é um arranjo de piano
   (duas pautas); com duas partes, a primeira vira a mão direita e a última,
   a esquerda.
2. Dê ao arquivo o nome do `id` da música: `in-the-end.musicxml`.
3. Rode:

```bash
python3 scripts/importar-partituras.py <pasta-com-os-arquivos>
```

O importador grava `src/content/partituras/<id>.json` e atualiza
`registry.ts`. Ele lê notas, acordes, pausas, ligaduras, quiálteras,
tonalidade, compasso, andamento e as quebras de linha (que viram os trechos
“1ª linha”…; sem quebras, um trecho a cada 4 compassos). Ritornelos não são
repetidos: a partitura é tocada de ponta a ponta.

Para apagar tudo depois: apague os `.json` de `src/content/partituras/` e rode
o importador numa pasta vazia (o `registry.ts` volta a ficar vazio).

## 2. Notação de texto (testes)

`src/content/notation.ts` continua disponível para escrever músicas curtas à
mão (usado nos testes):

```ts
fourVoices({
  soprano: 'A4/h:4 G4/q:3 F4 | C5/w',
  alto:    'F4/h:2 E4/q:1 C4 | F4/w',
  tenor:   'C4/h D4/q A3 | A3/w',
  bass:    'F3/h C3/q F3 | F2/w',
})
```

| Símbolo | Significado |
| --- | --- |
| `C4`, `F#3`, `Bb2` | Nota (Dó central = `C4`) |
| `[C4 E4 G4]` | Acorde |
| `r` | Pausa |
| `/w /h /q /e /s` | Semibreve, mínima, semínima, colcheia, semicolcheia |
| `/q.` | Pontuada (×1,5) — ou um número de batidas: `/1.5` |
| `:3` ou `:1,3,5` | Dedilhado (um dedo por nota do acorde) |
| `\|` | Barra de compasso (só para leitura) |

Padrão de oitavas da CCB: **Dó central = Dó3** (no código, `C4` / MIDI 60).

## 3. Direitos autorais

As partituras do repertório pertencem aos seus autores e editoras. Importe
apenas arquivos que você tenha licença para usar, e só para uso pessoal.
