import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HymnScore } from '@/components/HymnScore';
import { Icon, type IconName } from '@/components/Icon';
import { fitRange, keyboardLayout } from '@/components/keyboard-layout';
import { NoteHighway } from '@/components/NoteHighway';
import { PedalBoard } from '@/components/PedalBoard';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import type { Song, Voice } from '@/content/types';
import type { PracticeMode } from '@/engine/practice-session';
import { AvatarBadge, AvatarCircle } from '@/features/perfil/AvatarBadge';
import { AppearanceSettings } from '@/features/settings/AppearanceSettings';
import { inputHub } from '@/input/input-hub';
import type { InputSourceKind, KeyTarget } from '@/input/types';
import { noteName } from '@/music/theory';
import { useSettings } from '@/store/settings';
import { usePalette, useType } from '@/theme';
import { withAlpha } from '@/theme/color';

import { Glass, Label, MultiChoices, OptionCard, RoundButton, Row, SectionTitle, Segmented, Toggle } from './controls';
import { measureAt, Scrubber } from './Scrubber';
import { usePractice } from './use-practice';

export interface PracticePlayerProps {
  song: Song;
  onExit: () => void;
}

type Part = 'right' | 'left' | 'pedal';
type Tab = 'practice' | 'view' | 'instrument' | 'input' | 'look';

const PART_VOICES: Record<Part, Voice[]> = {
  right: ['soprano', 'alto'],
  left: ['tenor', 'bass'],
  pedal: ['pedal'],
};
const VOICE_LABEL: Record<Voice, string> = {
  soprano: 'Soprano',
  alto: 'Contralto',
  tenor: 'Tenor',
  bass: 'Baixo',
  pedal: 'Pedaleira',
};
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'practice', label: 'Prática', icon: 'music' },
  { id: 'view', label: 'Visualização', icon: 'eye' },
  { id: 'instrument', label: 'Instrumento', icon: 'keys' },
  { id: 'input', label: 'Ouvir você', icon: 'mic' },
  { id: 'look', label: 'Aparência', icon: 'contrast' },
];
/** Largura de referência de uma tecla branca (teclas pequenas). */
const KEY_PX = 20;
const APP_YOU = [
  { value: 'app' as const, label: 'App' },
  { value: 'you' as const, label: 'Você' },
];
/**
 * Teclado do computador (como um piano): a fileira Q W E R… toca o manual
 * superior a partir do Dó3; a fileira Z X C V… toca o inferior a partir do Dó2.
 * As teclas de número e S D G H J são as teclas pretas.
 */
const COMPUTER_KEYS: Record<string, { midi: number; row: 'upper' | 'lower' }> = {
  ...Object.fromEntries(
    ['KeyQ', 'Digit2', 'KeyW', 'Digit3', 'KeyE', 'KeyR', 'Digit5', 'KeyT', 'Digit6', 'KeyY', 'Digit7', 'KeyU', 'KeyI', 'Digit9', 'KeyO', 'Digit0', 'KeyP'].map(
      (code, i) => [code, { midi: 60 + i, row: 'upper' as const }],
    ),
  ),
  ...Object.fromEntries(
    ['KeyZ', 'KeyS', 'KeyX', 'KeyD', 'KeyC', 'KeyV', 'KeyG', 'KeyB', 'KeyH', 'KeyN', 'KeyJ', 'KeyM', 'Comma'].map((code, i) => [
      code,
      { midi: 48 + i, row: 'lower' as const },
    ]),
  ),
};
const UNIT_NAME: Record<string, string> = { q: 'semínimas', e: 'colcheias', 'q.': 'semínimas pontuadas', h: 'mínimas' };

/**
 * Tela de tocar um hino. Enquanto toca: só a música e o teclado. Ao pausar,
 * abre o painel (inspirado no Artie): linha do tempo arrastável em cima e os
 * ajustes organizados em abas.
 */
export function PracticePlayer({ song, onExit }: PracticePlayerProps) {
  const settings = useSettings();
  const pal = usePalette();
  const type = useType();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const organ = settings.instrument === 'organ';

  // ------------------------------------------------------------- o que o aluno toca
  const [parts, setParts] = useState<Record<Part, boolean>>({ right: true, left: true, pedal: true });
  const [customVoices, setCustomVoices] = useState<Voice[] | null>(null);
  const [waitMode, setWaitMode] = useState(true);
  const [bpm, setBpm] = useState(song.tempo);
  const [bpmText, setBpmText] = useState(String(song.tempo));

  const voices = useMemo<Voice[]>(() => {
    const chosen = customVoices ?? (Object.keys(parts) as Part[]).filter((k) => parts[k]).flatMap((k) => PART_VOICES[k]);
    return organ ? chosen : chosen.filter((v) => v !== 'pedal');
  }, [customVoices, parts, organ]);
  const mode: PracticeMode = voices.length === 0 ? 'demo' : waitMode ? 'wait' : 'rhythm';

  const p = usePractice({
    song,
    hands: 'both',
    mode,
    tempoFactor: bpm / song.tempo,
    voices: voices.length ? voices : undefined,
  });

  const changeBpm = (value: number) => {
    const v = Math.max(20, Math.min(220, Math.round(value)));
    setBpm(v);
    setBpmText(String(v));
  };

  // ------------------------------------------------------------- painel
  const [panelState, setPanel] = useState(true);
  const [tab, setTab] = useState<Tab>('practice');
  const [showVoices, setShowVoices] = useState(false);
  const playing = p.status === 'playing' || p.status === 'waiting';
  // Ao terminar o hino, o painel volta sozinho.
  const panel = panelState || p.status === 'finished';
  const openPanel = () => {
    p.pause();
    setPanel(true);
  };
  const play = () => {
    setPanel(false);
    if (p.status === 'finished') p.restart();
    p.start();
  };

  // ------------------------------------------------------------- entrada (tela/MIDI/microfone)
  const [inputError, setInputError] = useState<string | null>(inputHub.error);
  const [heard, setHeard] = useState<number | null>(null);
  useEffect(() => inputHub.onStatusChange(() => setInputError(inputHub.error)), []);
  useEffect(() => {
    void inputHub.use(settings.inputSource, { micSensitivity: settings.micSensitivity });
    return () => inputHub.stop();
  }, [settings.inputSource, settings.micSensitivity]);
  useEffect(
    () =>
      inputHub.subscribe((e) => {
        if (e.type === 'on') setHeard(e.midi);
      }),
    [],
  );

  const handlers = useMemo(() => {
    const make = (target: KeyTarget) => ({
      on: (midi: number) => inputHub.emit({ type: 'on', midi, velocity: 0.8, source: 'touch', target }),
      off: (midi: number) => inputHub.emit({ type: 'off', midi, velocity: 0, source: 'touch', target }),
    });
    return { main: make('main'), upper: make('upper'), lower: make('lower'), pedal: make('pedal') };
  }, []);

  // Teclado do computador (navegador).
  const twoManualsNow = organ && settings.organManuals === 'two';
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const held = new Map<string, { midi: number; target: KeyTarget }>();
    const typing = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    };
    const onDown = (e: KeyboardEvent) => {
      const k = COMPUTER_KEYS[e.code];
      if (!k || e.repeat || e.metaKey || e.ctrlKey || e.altKey || typing(e) || held.has(e.code)) return;
      const target: KeyTarget = twoManualsNow ? k.row : 'main';
      held.set(e.code, { midi: k.midi, target });
      handlers[target].on(k.midi);
    };
    const onUp = (e: KeyboardEvent) => {
      const h = held.get(e.code);
      if (!h) return;
      held.delete(e.code);
      handlers[h.target].off(h.midi);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      for (const h of held.values()) handlers[h.target].off(h.midi);
    };
  }, [handlers, twoManualsNow]);

  // ------------------------------------------------------------- teclados
  const usableWidth = width - insets.left - insets.right;
  const hasPedal = organ && p.song.notes.some((n) => n.voice === 'pedal');
  const viewMode = settings.viewMode;
  const tlNotes = p.timeline.notes;
  // O teclado mostra só o trecho que o hino usa (com teclas pequenas, o que
  // couber na tela em volta dele). A pedaleira vai de Dó1 a Dó2, ou mais se
  // o hino pedir.
  const ranges = useMemo(() => {
    const ms = tlNotes.filter((n) => n.voice !== 'pedal').map((n) => n.midi);
    const pedalMs = tlNotes.filter((n) => n.voice === 'pedal').map((n) => n.midi);
    return {
      manual: ms.length ? ([Math.min(...ms), Math.max(...ms)] as const) : ([48, 72] as const),
      pedal: pedalMs.length ? ([Math.min(36, ...pedalMs), Math.max(48, ...pedalMs)] as const) : ([36, 48] as const),
    };
  }, [tlNotes]);
  const minWhite = Math.max(10, Math.min(36, Math.floor(usableWidth / KEY_PX)));
  // Os dois manuais usam a mesma extensão: assim as notas caindo alinham com os dois.
  const layout = useMemo(() => {
    const [low, high] = fitRange(ranges.manual[0], ranges.manual[1], minWhite);
    return keyboardLayout(low, high, usableWidth);
  }, [ranges, minWhite, usableWidth]);

  const keyboardVisible = viewMode === 'falling' || settings.showKeyboard;
  const twoManuals = hasPedal && settings.organManuals === 'two';
  const pedalVisible = keyboardVisible && hasPedal && settings.showPedalboard;
  const pedalHeight = pedalVisible ? Math.round(Math.max(28, Math.min(46, height * 0.09))) : 0;
  const manualHeight = !keyboardVisible
    ? 0
    : twoManuals
      ? Math.round(Math.max(44, Math.min(90, height * 0.125)))
      : Math.round(Math.max(70, Math.min(170, height * (viewMode === 'page' ? 0.2 : 0.24))));
  const consoleHeight = (twoManuals ? manualHeight * 2 + 2 : manualHeight) + pedalHeight;
  const stageHeight = Math.max(120, height - insets.top - insets.bottom - consoleHeight);
  const preferFlats = p.song.keySignature < 0;
  const highwayNotes = useMemo(() => tlNotes.filter((n) => n.voice !== 'pedal'), [tlNotes]);
  const session = p.session;
  const resultOf = useMemo(() => (id: string) => session.resultOf(id), [session]);

  // Aviso do modo espera: o que tocar e em qual teclado.
  const names = (map: ReadonlyMap<number, { state: string }>, state: string) =>
    [...map.entries()]
      .filter(([, h]) => h.state === state)
      .sort((a, b) => a[0] - b[0])
      .map(([m]) => noteName(m, settings.notation, { preferFlats }))
      .join(' + ');
  const waitText =
    p.status !== 'waiting'
      ? ''
      : [
          [twoManuals ? 'Superior' : 'Direita', names(p.hintSets.right, 'expected-right')],
          [twoManuals ? 'Inferior' : 'Esquerda', names(p.hintSets.left, 'expected-left')],
          ['Pedal', names(p.hintSets.pedal, 'expected-pedal')],
        ]
          .filter(([, n]) => n)
          .map(([k, n]) => `${k}: ${n}`)
          .join('   ·   ');

  // Linha do tempo: compasso atual.
  const measures = p.timeline.measureStarts;
  const totalMeasures = Math.max(1, measures.length - 1);
  const currentMeasure = measureAt(measures, p.progress * (measures[measures.length - 1] || 0));

  const setPart = (part: Part, you: boolean) => {
    setCustomVoices(null);
    setParts((prev) => ({ ...prev, [part]: you }));
  };
  const toggleVoice = (v: Voice) => {
    const cur = customVoices ?? voices;
    setCustomVoices(cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
  };
  const partValue = (part: Part) =>
    PART_VOICES[part].some((v) => voices.includes(v)) ? ('you' as const) : ('app' as const);
  const mark = song.tempoMark;
  const onPaper = viewMode === 'page';

  const whoPlays =
    mode === 'demo'
      ? 'Só ouvir: o app toca a música inteira.'
      : `Você toca: ${voices.map((v) => VOICE_LABEL[v].toLowerCase()).join(', ')}. O app toca o resto.`;

  // ------------------------------------------------------------- abas do painel
  const practiceTab = (
    <View style={s.columns}>
      <View style={s.column}>
        <SectionTitle>Quem toca</SectionTitle>
        <Glass>
          <Row label="Mão direita" hint="Soprano e contralto">
            <Segmented compact options={APP_YOU} value={partValue('right')} onChange={(v) => setPart('right', v === 'you')} />
          </Row>
          <Row label="Mão esquerda" hint="Tenor e baixo">
            <Segmented compact options={APP_YOU} value={partValue('left')} onChange={(v) => setPart('left', v === 'you')} />
          </Row>
          {organ ? (
            <Row label="Pedaleira" hint="Linha do baixo, com os pés">
              <Segmented compact options={APP_YOU} value={partValue('pedal')} onChange={(v) => setPart('pedal', v === 'you')} />
            </Row>
          ) : null}
          <Row label="Escolher vozes" hint={showVoices ? undefined : whoPlays} onPress={() => setShowVoices((v) => !v)} last={!showVoices}>
            <Icon name={showVoices ? 'chevronUp' : 'chevronDown'} size={16} color={pal.textDim} />
          </Row>
          {showVoices ? (
            <View style={s.voiceBox}>
              <MultiChoices<Voice>
                options={(['soprano', 'alto', 'tenor', 'bass', ...(organ ? (['pedal'] as Voice[]) : [])] as Voice[]).map((v) => ({ value: v, label: VOICE_LABEL[v] }))}
                values={voices}
                onToggle={toggleVoice}
              />
              <Label dim>{whoPlays}</Label>
            </View>
          ) : null}
        </Glass>

        <SectionTitle>Como tocar</SectionTitle>
        <Glass>
          <Row label="Modo espera" hint="A música para até você tocar a nota certa">
            <Toggle value={waitMode} onChange={setWaitMode} label="Modo espera" />
          </Row>
          <Row label="Acompanhamento" hint="O app toca as vozes que não são suas" last>
            <Toggle value={settings.playAccompaniment} onChange={(v) => settings.set({ playAccompaniment: v })} label="Acompanhamento" />
          </Row>
        </Glass>
      </View>

      <View style={s.column}>
        <SectionTitle>Velocidade</SectionTitle>
        <Glass style={s.tempoCard}>
          <View style={s.tempoRow}>
            <RoundButton icon="minus" onPress={() => changeBpm(bpm - 2)} accessibilityLabel="Mais devagar" />
            <View style={s.tempoValue}>
              <TextInput
                value={bpmText}
                onChangeText={(t) => setBpmText(t.replace(/\D/g, '').slice(0, 3))}
                onBlur={() => changeBpm(parseInt(bpmText, 10) || bpm)}
                onSubmitEditing={() => changeBpm(parseInt(bpmText, 10) || bpm)}
                keyboardType="number-pad"
                selectTextOnFocus
                style={[type.bold, s.tempoInput, { color: pal.text, borderBottomColor: pal.border }]}
                accessibilityLabel="Velocidade em batidas por minuto"
              />
              <Text style={[type.regular, s.tempoLabel, { color: pal.textDim }]}>
                batidas por minuto{'\n'}{Math.round((bpm / song.tempo) * 100)}% do normal
              </Text>
            </View>
            <RoundButton icon="plus" onPress={() => changeBpm(bpm + 2)} accessibilityLabel="Mais rápido" />
          </View>
          <Segmented
            options={[
              { value: Math.round(song.tempo * 0.5), label: 'Lenta' },
              { value: Math.round(song.tempo * 0.75), label: 'Média' },
              { value: song.tempo, label: 'Normal' },
            ]}
            value={bpm}
            onChange={changeBpm}
          />
          <Row label="Metrônomo" hint={mark ? `Na partitura: ${mark.min}${mark.max !== mark.min ? ` a ${mark.max}` : ''} ${UNIT_NAME[mark.unit] ?? 'semínimas'} por minuto` : undefined} last>
            <Toggle value={settings.metronome} onChange={(v) => settings.set({ metronome: v })} label="Metrônomo" />
          </Row>
        </Glass>

      </View>
    </View>
  );

  const viewTab = (
    <View style={s.stack}>
      <SectionTitle>Ver como</SectionTitle>
      <View style={s.cards}>
        <OptionCard
          title="Notas caindo"
          subtitle="As notas descem até a tecla certa"
          selected={viewMode === 'falling'}
          onPress={() => settings.set({ viewMode: 'falling' })}
          preview={<FallingPreview />}
        />
        <OptionCard
          title="Partitura"
          subtitle="Como no hinário da organista"
          selected={viewMode === 'page'}
          onPress={() => settings.set({ viewMode: 'page' })}
          preview={<PagePreview />}
        />
      </View>
      <Glass>
        {viewMode === 'page' ? (
          <Row label="Teclado junto da partitura" hint="Mostra os teclados embaixo da pauta">
            <Toggle value={settings.showKeyboard} onChange={(v) => settings.set({ showKeyboard: v })} label="Teclado junto da partitura" />
          </Row>
        ) : (
          <>
            <Row label="Velocidade das notas">
              <Segmented
                compact
                options={[
                  { value: 100, label: 'Lenta' },
                  { value: 150, label: 'Normal' },
                  { value: 220, label: 'Rápida' },
                ]}
                value={settings.fallSpeed}
                onChange={(v) => settings.set({ fallSpeed: v })}
              />
            </Row>
            <Row label="Dentro das notas">
              <Segmented
                compact
                options={[
                  { value: 'name', label: 'Nome' },
                  { value: 'finger', label: 'Dedo' },
                  { value: 'none', label: 'Nada' },
                ]}
                value={settings.noteLabels}
                onChange={(v) => settings.set({ noteLabels: v as 'name' | 'finger' | 'none' })}
              />
            </Row>
          </>
        )}
        <Row label="Nomes das notas">
          <Segmented
            compact
            options={[
              { value: 'solfege', label: 'Dó Ré Mi' },
              { value: 'letters', label: 'C D E' },
            ]}
            value={settings.notation}
            onChange={(v) => settings.set({ notation: v as 'solfege' | 'letters' })}
          />
        </Row>
        <Row label="Nomes nas teclas" hint="Os Dós sempre mostram a oitava (Dó3 = Dó central)" last>
          <Toggle value={settings.showKeyLabels} onChange={(v) => settings.set({ showKeyLabels: v })} label="Nomes nas teclas" />
        </Row>
      </Glass>
    </View>
  );

  const instrumentTab = (
    <View style={s.stack}>
      <SectionTitle>Instrumento</SectionTitle>
      <View style={s.cards}>
        <OptionCard title="Órgão" subtitle="Dois manuais, pedaleira e notas ligadas" icon="keys" selected={organ} onPress={() => settings.set({ instrument: 'organ' })} />
        <OptionCard title="Piano" subtitle="Um teclado, as 4 vozes nas duas mãos" icon="music" selected={!organ} onPress={() => settings.set({ instrument: 'piano' })} />
      </View>
      <Glass>
        {organ ? (
          <>
            <Row label="Manuais" hint="Superior (mão direita) e inferior (mão esquerda)">
              <Segmented
                compact
                options={[
                  { value: 'two', label: 'Dois' },
                  { value: 'one', label: 'Um' },
                ]}
                value={settings.organManuals}
                onChange={(v) => settings.set({ organManuals: v as 'one' | 'two' })}
              />
            </Row>
            <Row label="Pedaleira na tela" last>
              <Toggle value={settings.showPedalboard} onChange={(v) => settings.set({ showPedalboard: v })} label="Pedaleira na tela" />
            </Row>
          </>
        ) : (
          <Row label="Piano" hint="Um teclado só, com as quatro vozes" last />
        )}
      </Glass>
    </View>
  );

  const inputTab = (
    <View style={s.stack}>
      <SectionTitle>Como o app ouve você</SectionTitle>
      <View style={s.cards}>
        {(
          [
            { value: 'touch', title: 'Tela', subtitle: 'Toque nas teclas da tela ou use o teclado do computador', icon: 'touch' },
            { value: 'midi', title: 'Teclado MIDI', subtitle: 'Ligado por cabo (Chrome ou Edge)', icon: 'cable' },
            { value: 'mic', title: 'Microfone', subtitle: 'Toque no seu instrumento de verdade', icon: 'mic' },
          ] as { value: InputSourceKind; title: string; subtitle: string; icon: IconName }[]
        ).map((o) => (
          <OptionCard
            key={o.value}
            title={o.title}
            subtitle={o.subtitle}
            icon={o.icon}
            selected={settings.inputSource === o.value}
            onPress={() => settings.set({ inputSource: o.value })}
          />
        ))}
      </View>
      <Glass>
        {settings.inputSource === 'mic' ? (
          <Row label="Sensibilidade" hint="Aumente se o app não ouvir; diminua se ouvir barulho">
            <Segmented
              compact
              options={[
                { value: 0.02, label: 'Baixa' },
                { value: 0.01, label: 'Média' },
                { value: 0.004, label: 'Alta' },
              ]}
              value={settings.micSensitivity}
              onChange={(v) => settings.set({ micSensitivity: v })}
            />
          </Row>
        ) : null}
        <Row label="Teste" hint={inputError ?? 'Toque uma nota para conferir'} last>
          <Text style={[type.bold, s.heard, { color: pal.text }]}>
            {heard !== null ? noteName(heard, settings.notation, { withOctave: true, preferFlats }) : '—'}
          </Text>
        </Row>
      </Glass>
    </View>
  );

  const content: Record<Tab, ReactNode> = {
    practice: practiceTab,
    view: viewTab,
    instrument: instrumentTab,
    input: inputTab,
    look: <AppearanceSettings />,
  };

  return (
    <View
      style={[
        s.root,
        { backgroundColor: pal.bg, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right },
      ]}>
      {/* ---------------------------------------------------- música */}
      <View style={{ height: stageHeight }}>
        {onPaper ? (
          <HymnScore width={usableWidth} height={stageHeight} song={p.song} timeline={p.timeline} time={p.time} resultOf={resultOf} version={p.version} />
        ) : (
          <NoteHighway
            layout={layout}
            height={stageHeight}
            notes={highwayNotes}
            barLines={p.timeline.barLines}
            pps={settings.fallSpeed}
            time={p.time}
            resultOf={resultOf}
            version={p.version}
            notation={settings.notation}
            labelMode={settings.noteLabels}
            preferFlats={preferFlats}
          />
        )}

        {/* Enquanto toca: pausar e a linha do tempo (também arrastável) */}
        {!panel || playing ? (
          <View style={s.floating} pointerEvents="box-none">
            <RoundButton icon="pause" size={36} onPress={openPanel} accessibilityLabel="Pausar e abrir ajustes" />
            <AvatarCircle id={settings.avatar} size={36} />
            <View style={s.floatingTrack}>
              <Scrubber thin onPaper={onPaper} measureStarts={measures} secondsPerBeat={p.timeline.secondsPerBeat} progress={p.progress} onSeek={p.seek} />
            </View>
            <ModeSwitches />
          </View>
        ) : null}

        {waitText && !panel ? (
          <View style={[s.waitBadge, { backgroundColor: pal.surface, borderColor: pal.border }]} pointerEvents="none">
            <Text style={[type.regular, s.waitText, { color: pal.text }]}>{waitText}</Text>
          </View>
        ) : null}

        {p.feedback && mode === 'rhythm' && !panel ? (
          <Animated.Text
            key={p.feedback.id}
            entering={ZoomIn.duration(120)}
            exiting={FadeOut.duration(300)}
            style={[type.bold, s.feedback, { color: onPaper ? pal.ink : pal.text }]}>
            {p.feedback.text}
          </Animated.Text>
        ) : null}
      </View>

      {/* ---------------------------------------------------- teclados */}
      {keyboardVisible ? (
        <View>
          {twoManuals ? (
            <>
              <PianoKeyboard layout={layout} height={manualHeight} hints={p.hintSets.right} notation={settings.notation} showLabels={settings.showKeyLabels} preferFlats={preferFlats} tag="SUPERIOR" onNoteOn={handlers.upper.on} onNoteOff={handlers.upper.off} />
              <View style={s.manualGap} />
              <PianoKeyboard layout={layout} height={manualHeight} hints={p.hintSets.left} notation={settings.notation} showLabels={settings.showKeyLabels} preferFlats={preferFlats} tag="INFERIOR" onNoteOn={handlers.lower.on} onNoteOff={handlers.lower.off} />
            </>
          ) : (
            <PianoKeyboard layout={layout} height={manualHeight} hints={p.hints} notation={settings.notation} showLabels={settings.showKeyLabels} preferFlats={preferFlats} onNoteOn={handlers.main.on} onNoteOff={handlers.main.off} />
          )}
          {pedalVisible ? (
            <PedalBoard width={usableWidth} height={pedalHeight} low={ranges.pedal[0]} high={ranges.pedal[1]} hints={p.hintSets.pedal} notation={settings.notation} preferFlats={preferFlats} onNoteOn={handlers.pedal.on} onNoteOff={handlers.pedal.off} />
          ) : null}
        </View>
      ) : null}

      {/* ---------------------------------------------------- painel (pausado) */}
      {panel && !playing ? (
        <Animated.View
          entering={FadeIn.duration(160)}
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: withAlpha(pal.bg, 0.93),
              paddingTop: insets.top + 10,
              paddingLeft: insets.left + 14,
              paddingRight: insets.right + 14,
              paddingBottom: insets.bottom,
            },
          ]}>
          {/* Cabeçalho: voltar · hino e linha do tempo · recomeçar · tocar */}
          <View style={s.header}>
            <RoundButton icon="back" onPress={onExit} accessibilityLabel="Voltar à lista de músicas" />
            <AvatarBadge size={44} />
            <Glass style={s.timelineBox}>
              <View style={s.titleRow}>
                <Text style={[type.bold, s.hymnNumber, { color: pal.text }]}>{song.hymnNumber ?? ''}</Text>
                <Text style={[type.regular, s.hymnTitle, { color: pal.text }]} numberOfLines={1}>
                  {song.title}
                </Text>
                {p.status === 'finished' && p.score && mode !== 'demo' ? (
                  <View style={s.resultRow}>
                    {[0, 1, 2].map((i) => (
                      <Icon key={i} name={i < p.score!.stars ? 'star' : 'starOutline'} size={14} color={pal.text} />
                    ))}
                    <Text style={[type.bold, s.result, { color: pal.text }]}>{Math.round(p.score.accuracy * 100)}%</Text>
                  </View>
                ) : (
                  <Text style={[type.regular, s.measure, { color: pal.textDim }]}>
                    Compasso {currentMeasure + 1} de {totalMeasures}
                  </Text>
                )}
              </View>
              <Scrubber measureStarts={measures} secondsPerBeat={p.timeline.secondsPerBeat} progress={p.progress} onSeek={p.seek} />
            </Glass>
            <ModeSwitches stacked />
            <RoundButton icon="restart" onPress={() => p.seek(0)} accessibilityLabel="Voltar ao começo" />
            <RoundButton icon="play" size={52} active onPress={play} accessibilityLabel={p.status === 'paused' ? 'Continuar' : 'Tocar'} />
          </View>

          {/* Dica (só na primeira vez): um modo de reconhecimento por vez */}
          {!settings.tipInputSeen ? (
            <Animated.View entering={FadeIn.delay(400).duration(250)} style={[s.tip, { top: insets.top + 10 + 70 + 46 * 3 + 14 }]}>
              <View style={[s.tipArrow, { borderRightColor: pal.primary }]} />
              <View style={[s.tipBody, { backgroundColor: pal.primary }]}>
                <Text style={[type.regular, s.tipText, { color: pal.primaryText }]}>
                  <Text style={type.bold}>Dica: </Text>
                  para o app reconhecer bem as notas, use um modo por vez, o microfone ou as teclas da tela. Escolha em Ouvir você.
                </Text>
                <Pressable
                  onPress={() => settings.set({ tipInputSeen: true })}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar dica"
                  style={s.tipClose}>
                  <Icon name="close" size={16} color={pal.primaryText} />
                </Pressable>
              </View>
            </Animated.View>
          ) : null}

          {/* Abas à esquerda, conteúdo à direita */}
          <View style={s.body}>
            <View style={s.rail}>
              {TABS.map((t) => {
                const on = t.id === tab;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setTab(t.id)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    style={({ pressed }) => [s.tab, on && { backgroundColor: pal.surfaceStrong }, pressed && { opacity: 0.7 }]}>
                    <View style={[s.tabMark, { backgroundColor: on ? pal.primary : 'transparent' }]} />
                    <Icon name={t.icon} size={18} color={on ? pal.text : pal.textDim} />
                    <Text style={[on ? type.bold : type.regular, s.tabLabel, { color: on ? pal.text : pal.textDim }]} numberOfLines={1}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <ScrollView style={s.content} contentContainerStyle={s.contentInner} showsVerticalScrollIndicator={false}>
              {content[tab]}
            </ScrollView>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

/**
 * Os dois interruptores do canto superior direito: como ver a música
 * (Partitura ou Notas caindo) e qual instrumento (Órgão ou Piano).
 */
export function ModeSwitches({ stacked }: { stacked?: boolean }) {
  const viewMode = useSettings((st) => st.viewMode);
  const instrument = useSettings((st) => st.instrument);
  const set = useSettings((st) => st.set);
  return (
    <View style={stacked ? s.switchesStacked : s.switches}>
      <Segmented
        compact
        options={[
          { value: 'page', label: 'Partitura' },
          { value: 'falling', label: 'Notas' },
        ]}
        value={viewMode}
        onChange={(v) => set({ viewMode: v as 'page' | 'falling' })}
      />
      <Segmented
        compact
        options={[
          { value: 'organ', label: 'Órgão' },
          { value: 'piano', label: 'Piano' },
        ]}
        value={instrument}
        onChange={(v) => set({ instrument: v as 'organ' | 'piano' })}
      />
    </View>
  );
}

/** Miniaturas dos modos de visualização. */
function FallingPreview() {
  const pal = usePalette();
  const bars = [
    { l: 6, t: 4, h: 16, c: pal.noteRight },
    { l: 26, t: 14, h: 12, c: pal.noteLeft },
    { l: 46, t: 0, h: 22, c: pal.noteRight },
    { l: 66, t: 10, h: 14, c: pal.noteLeft },
  ];
  return (
    <View style={[s.preview, { backgroundColor: pal.highway }]}>
      {bars.map((b, i) => (
        <View key={i} style={{ position: 'absolute', left: b.l, top: b.t, width: 14, height: b.h, borderRadius: 3, backgroundColor: b.c }} />
      ))}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 8, height: 1, backgroundColor: pal.hitLine }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, backgroundColor: pal.keyWhite }} />
    </View>
  );
}

function PagePreview() {
  const pal = usePalette();
  return (
    <View style={[s.preview, { backgroundColor: pal.paper }]}>
      {[0, 1, 2, 3, 4].map((l) => (
        <View key={l} style={{ position: 'absolute', left: 4, right: 4, top: 5 + l * 4.5, height: 1, backgroundColor: pal.staff }} />
      ))}
      {[10, 26, 42, 58, 74].map((x, i) => (
        <View key={x} style={{ position: 'absolute', left: x, top: 8 + ((i * 3) % 5) * 2, width: 7, height: 5, borderRadius: 3, backgroundColor: pal.ink }} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  floating: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  floatingTrack: { flex: 1 },
  switches: { flexDirection: 'row', gap: 8 },
  switchesStacked: { gap: 4, alignItems: 'stretch' },
  waitBadge: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  waitText: { fontSize: 13 },
  feedback: { position: 'absolute', alignSelf: 'center', top: '35%', fontSize: 26 },
  manualGap: { height: 2, backgroundColor: '#000000' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timelineBox: { flex: 1, paddingVertical: 6, paddingHorizontal: 16, gap: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  hymnNumber: { fontSize: 15 },
  hymnTitle: { fontSize: 14, flex: 1 },
  measure: { fontSize: 11 },
  result: { fontSize: 13, marginLeft: 4 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  body: { flex: 1, flexDirection: 'row', gap: 14, marginTop: 10 },
  tip: { position: 'absolute', left: 168, zIndex: 20, flexDirection: 'row', alignItems: 'center', maxWidth: 360 },
  tipArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  tipBody: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, paddingVertical: 10, paddingLeft: 14, paddingRight: 10, flexShrink: 1 },
  tipText: { fontSize: 13, lineHeight: 18, flexShrink: 1 },
  tipClose: { padding: 2 },
  rail: { width: 150, gap: 4, paddingTop: 2 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 42, borderRadius: 14, paddingRight: 10, overflow: 'hidden' },
  tabMark: { width: 3, height: 20, borderRadius: 2, marginRight: 2 },
  tabLabel: { fontSize: 13, flexShrink: 1 },
  content: { flex: 1 },
  contentInner: { paddingBottom: 24, maxWidth: 860 },
  columns: { flexDirection: 'row', gap: 14 },
  column: { flex: 1, gap: 6 },
  stack: { gap: 8 },
  cards: { flexDirection: 'row', gap: 10 },
  voiceBox: { gap: 8, paddingBottom: 12 },
  tempoCard: { paddingVertical: 10, gap: 10 },
  tempoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tempoValue: { alignItems: 'center', flex: 1 },
  tempoInput: { fontSize: 30, textAlign: 'center', minWidth: 90, padding: 0, borderBottomWidth: 1 },
  tempoLabel: { fontSize: 10, marginTop: 4, textAlign: 'center' },
  heard: { fontSize: 20, minWidth: 60, textAlign: 'right' },
  preview: { width: 88, height: 30, borderRadius: 6, overflow: 'hidden' },
});
