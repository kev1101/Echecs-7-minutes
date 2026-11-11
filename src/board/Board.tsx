import { useEffect, useRef, useState, createElement } from 'react';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Config } from 'chessground/config';
import type { DrawShape } from 'chessground/draw';
import type { Key } from 'chessground/types';
import { Chess, type Square } from 'chess.js';
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.cburnett.css';
import type { Color } from '../chess/notation';

export interface Arrow {
  from: string;
  to: string;
  brush?: 'green' | 'blue' | 'red' | 'yellow' | 'paleBlue' | 'paleGreen' | 'paleRed' | 'paleGrey';
}

export interface BoardProps {
  fen: string;
  orientation: Color;
  /** Camp qui peut jouer ; null = échiquier figé. */
  movable: Color | null;
  lastMove?: [string, string] | null;
  arrows?: Arrow[];
  /** Cases à faire clignoter (coup refusé). */
  flash?: string | null;
  onMove?: (uci: string) => void;
}

const COLOR_NAME = { w: 'white', b: 'black' } as const;
const PROMO = [
  ['q', 'queen', 'Dame'],
  ['r', 'rook', 'Tour'],
  ['b', 'bishop', 'Fou'],
  ['n', 'knight', 'Cavalier']
] as const;

function legalDests(chess: Chess): Map<Key, Key[]> {
  const map = new Map<Key, Key[]>();
  for (const m of chess.moves({ verbose: true })) {
    const list = map.get(m.from as Key) ?? [];
    list.push(m.to as Key);
    map.set(m.from as Key, list);
  }
  return map;
}

export function Board({ fen, orientation, movable, lastMove, arrows, flash, onMove }: BoardProps) {
  const el = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const fenRef = useRef(fen);
  fenRef.current = fen;
  const [promo, setPromo] = useState<{ from: string; to: string; color: Color } | null>(null);

  const buildConfig = (): Config => {
    let chess: Chess | null = null;
    try {
      chess = new Chess(fen);
    } catch {
      chess = null;
    }
    const turn: Color = (fen.split(' ')[1] as Color) ?? 'w';
    const canMove = movable !== null && chess !== null && turn === movable && !chess.isGameOver();
    return {
      fen,
      orientation: COLOR_NAME[orientation],
      turnColor: COLOR_NAME[turn],
      lastMove: lastMove ? (lastMove as Key[]) : undefined,
      check: chess?.inCheck() ? COLOR_NAME[turn] : false,
      movable: {
        free: false,
        color: canMove ? COLOR_NAME[turn] : undefined,
        dests: canMove && chess ? legalDests(chess) : new Map(),
        showDests: true
      },
      drawable: {
        enabled: true,
        visible: true,
        autoShapes: (arrows ?? []).map((a): DrawShape => ({ orig: a.from as Key, dest: a.to as Key, brush: a.brush ?? 'green' }))
      }
    };
  };

  useEffect(() => {
    if (!el.current) return;
    api.current = Chessground(el.current, {
      ...buildConfig(),
      animation: { enabled: true, duration: 180 },
      highlight: { lastMove: true, check: true },
      premovable: { enabled: false },
      draggable: { enabled: true, showGhost: true },
      selectable: { enabled: true },
      coordinates: true,
      events: {
        move: (orig, dest) => {
          const chess = new Chess(fenRef.current);
          const p = chess.get(orig as Square);
          const last = dest[1] === '8' || dest[1] === '1';
          if (p?.type === 'p' && last) {
            setPromo({ from: orig, to: dest, color: p.color });
            return;
          }
          onMoveRef.current?.(orig + dest);
        }
      }
    });
    return () => {
      api.current?.destroy();
      api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.current?.set(buildConfig());
    setPromo(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, orientation, movable, lastMove?.[0], lastMove?.[1], JSON.stringify(arrows ?? [])]);

  useEffect(() => {
    if (!flash || !api.current) return;
    // flash peut porter un suffixe « #n » pour rejouer l'effet sur la même case
    api.current.setShapes([{ orig: flash.split('#')[0] as Key, brush: 'red' }]);
    const t = setTimeout(() => api.current?.setShapes([]), 700);
    return () => clearTimeout(t);
  }, [flash]);

  const choose = (p: string) => {
    if (!promo) return;
    const uci = promo.from + promo.to + p;
    setPromo(null);
    onMoveRef.current?.(uci);
  };
  const cancelPromo = () => {
    setPromo(null);
    api.current?.set(buildConfig());
  };

  return (
    <div className="board-wrap">
      <div ref={el} className="cg-host" />
      {promo && (
        <div className="promo" role="dialog" aria-label="Choisir la pièce de promotion" onClick={cancelPromo}>
          <div className="promo-box cg-wrap" onClick={(e) => e.stopPropagation()}>
            {PROMO.map(([k, cls, label]) => (
              <button key={k} className="promo-btn" onClick={() => choose(k)} aria-label={label} title={label}>
                {createElement('piece', { className: `${cls} ${COLOR_NAME[promo.color]}` })}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
