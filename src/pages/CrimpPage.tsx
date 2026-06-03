import React from 'react';
import { ShieldCheck, Info, Sparkles, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const WIRE_COLORS = {
  greenStripe: { text: 'Branco / Verde', bg: '#ffffff', stripe: '#16a34a' },
  green: { text: 'Verde', bg: '#16a34a' },
  orangeStripe: { text: 'Branco / Laranja', bg: '#ffffff', stripe: '#ea580c' },
  orange: { text: 'Laranja', bg: '#ea580c' },
  blueStripe: { text: 'Branco / Azul', bg: '#ffffff', stripe: '#2563eb' },
  blue: { text: 'Azul', bg: '#2563eb' },
  brownStripe: { text: 'Branco / Marrom', bg: '#ffffff', stripe: '#78350f' },
  brown: { text: 'Marrom', bg: '#78350f' },
};

const pinouts = {
  '568B': {
    title: 'Padrão T-568B (Mais Utilizado)',
    description: 'Padrão industrial mais comum em redes locais (LAN). Recomendado para a maioria das instalações modernas de CFTV IP.',
    wires: [
      { pin: 1, name: 'Par 2 (Tx+)', colorText: WIRE_COLORS.orangeStripe.text, bgHex: WIRE_COLORS.orangeStripe.bg, stripeHex: WIRE_COLORS.orangeStripe.stripe, colorClass: 'border-l-[12px] border-orange-500 bg-white' },
      { pin: 2, name: 'Par 2 (Tx-)', colorText: WIRE_COLORS.orange.text, bgHex: WIRE_COLORS.orange.bg, colorClass: 'bg-orange-600' },
      { pin: 3, name: 'Par 3 (Rx+)', colorText: WIRE_COLORS.greenStripe.text, bgHex: WIRE_COLORS.greenStripe.bg, stripeHex: WIRE_COLORS.greenStripe.stripe, colorClass: 'border-l-[12px] border-green-500 bg-white' },
      { pin: 4, name: 'Par 1 (PoE)', colorText: WIRE_COLORS.blue.text, bgHex: WIRE_COLORS.blue.bg, colorClass: 'bg-blue-600' },
      { pin: 5, name: 'Par 1 (PoE)', colorText: WIRE_COLORS.blueStripe.text, bgHex: WIRE_COLORS.blueStripe.bg, stripeHex: WIRE_COLORS.blueStripe.stripe, colorClass: 'border-l-[12px] border-blue-500 bg-white' },
      { pin: 6, name: 'Par 3 (Rx-)', colorText: WIRE_COLORS.green.text, bgHex: WIRE_COLORS.green.bg, colorClass: 'bg-green-600' },
      { pin: 7, name: 'Par 4 (PoE)', colorText: WIRE_COLORS.brownStripe.text, bgHex: WIRE_COLORS.brownStripe.bg, stripeHex: WIRE_COLORS.brownStripe.stripe, colorClass: 'border-l-[12px] border-amber-800 bg-white' },
      { pin: 8, name: 'Par 4 (PoE)', colorText: WIRE_COLORS.brown.text, bgHex: WIRE_COLORS.brown.bg, colorClass: 'bg-amber-900' }
    ]
  },
  '568A': {
    title: 'Padrão T-568A (Tradicional)',
    description: 'Padrão normativo oficial de cabeamento estruturado. Muito utilizado em projetos de telecomunicações antigos.',
    wires: [
      { pin: 1, name: 'Par 3 (Rx+)', colorText: WIRE_COLORS.greenStripe.text, bgHex: WIRE_COLORS.greenStripe.bg, stripeHex: WIRE_COLORS.greenStripe.stripe, colorClass: 'border-l-[12px] border-green-500 bg-white' },
      { pin: 2, name: 'Par 3 (Rx-)', colorText: WIRE_COLORS.green.text, bgHex: WIRE_COLORS.green.bg, colorClass: 'bg-green-600' },
      { pin: 3, name: 'Par 2 (Tx+)', colorText: WIRE_COLORS.orangeStripe.text, bgHex: WIRE_COLORS.orangeStripe.bg, stripeHex: WIRE_COLORS.orangeStripe.stripe, colorClass: 'border-l-[12px] border-orange-500 bg-white' },
      { pin: 4, name: 'Par 1 (PoE)', colorText: WIRE_COLORS.blue.text, bgHex: WIRE_COLORS.blue.bg, colorClass: 'bg-blue-600' },
      { pin: 5, name: 'Par 1 (PoE)', colorText: WIRE_COLORS.blueStripe.text, bgHex: WIRE_COLORS.blueStripe.bg, stripeHex: WIRE_COLORS.blueStripe.stripe, colorClass: 'border-l-[12px] border-blue-500 bg-white' },
      { pin: 6, name: 'Par 2 (Tx-)', colorText: WIRE_COLORS.orange.text, bgHex: WIRE_COLORS.orange.bg, colorClass: 'bg-orange-600' },
      { pin: 7, name: 'Par 4 (PoE)', colorText: WIRE_COLORS.brownStripe.text, bgHex: WIRE_COLORS.brownStripe.bg, stripeHex: WIRE_COLORS.brownStripe.stripe, colorClass: 'border-l-[12px] border-amber-800 bg-white' },
      { pin: 8, name: 'Par 4 (PoE)', colorText: WIRE_COLORS.brown.text, bgHex: WIRE_COLORS.brown.bg, colorClass: 'bg-amber-900' }
    ]
  },
  'SEQUENTIAL': {
    title: 'Padrão Sequencial (Power Balun)',
    description: 'Sequência proprietária otimizada em pares contínuos para balancear sinal de vídeo e energia de forma estável no Power Balun Intelbras.',
    wires: [
      { pin: 1, name: 'Vídeo / Dados', colorText: WIRE_COLORS.blue.text, bgHex: WIRE_COLORS.blue.bg, colorClass: 'bg-blue-600' },
      { pin: 2, name: 'Vídeo / Dados', colorText: WIRE_COLORS.blueStripe.text, bgHex: WIRE_COLORS.blueStripe.bg, stripeHex: WIRE_COLORS.blueStripe.stripe, colorClass: 'border-l-[12px] border-blue-500 bg-white' },
      { pin: 3, name: 'Energia (+)', colorText: WIRE_COLORS.orange.text, bgHex: WIRE_COLORS.orange.bg, colorClass: 'bg-orange-600' },
      { pin: 4, name: 'Energia (+)', colorText: WIRE_COLORS.orangeStripe.text, bgHex: WIRE_COLORS.orangeStripe.bg, stripeHex: WIRE_COLORS.orangeStripe.stripe, colorClass: 'border-l-[12px] border-orange-500 bg-white' },
      { pin: 5, name: 'Vídeo / Dados', colorText: WIRE_COLORS.green.text, bgHex: WIRE_COLORS.green.bg, colorClass: 'bg-green-600' },
      { pin: 6, name: 'Vídeo / Dados', colorText: WIRE_COLORS.greenStripe.text, bgHex: WIRE_COLORS.greenStripe.bg, stripeHex: WIRE_COLORS.greenStripe.stripe, colorClass: 'border-l-[12px] border-green-500 bg-white' },
      { pin: 7, name: 'Energia (-)', colorText: WIRE_COLORS.brown.text, bgHex: WIRE_COLORS.brown.bg, colorClass: 'bg-brown-600' },
      { pin: 8, name: 'Energia (-)', colorText: WIRE_COLORS.brownStripe.text, bgHex: WIRE_COLORS.brownStripe.bg, stripeHex: WIRE_COLORS.brownStripe.stripe, colorClass: 'border-l-[12px] border-amber-800 bg-white' }
    ]
  }
};

type Standard = '568B' | '568A' | 'SEQUENTIAL';

export default function CrimpPage() {
  const [selectedStandard, setSelectedStandard] = React.useState<Standard>('568B');
  const currentPinout = pinouts[selectedStandard];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <BookOpen className="text-accent w-6 h-6 shrink-0" />
          <h2 className="text-xl font-bold text-text-primary uppercase tracking-wide">
            Guia de Crimpagem RJ45
          </h2>
        </div>
        <p className="text-text-muted text-xs sm:text-sm mt-0.5">
          Referência de cabeamento e pinagem de conectores para CFTV IP e Analógico em campo.
        </p>
      </div>

      {/* Select Tab */}
      <div className="flex bg-bg-secondary p-1 border border-border-light rounded-lg max-w-sm">
        {(Object.keys(pinouts) as Standard[]).map((std) => (
          <button
            key={std}
            onClick={() => setSelectedStandard(std)}
            className={`flex-1 text-center py-2 text-xs font-bold uppercase rounded-md transition-all ${
              selectedStandard === std
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {std === 'SEQUENTIAL' ? 'Seq. Balun' : std}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Interactive RJ45 Connector Display */}
        <div className="bg-bg-secondary p-6 rounded-xl border border-border-light flex flex-col items-center justify-center">
          <h3 className="text-xs font-bold text-accent tracking-widest uppercase mb-6 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Contatos virados para cima (Pino 1 à Esquerda)
          </h3>

          {/* RJ45 Connector Wrapper */}
          <div className="relative w-56 h-[280px] bg-sky-200/5 rounded-t-2xl rounded-b-md border border-slate-500/25 flex flex-col justify-end pt-8 pb-4 px-6 shadow-xl overflow-hidden">
            {/* O corpo transparente do RJ45 */}
            <div className="absolute inset-x-2 top-2 h-10 bg-sky-300/10 rounded-t-xl border-b border-slate-500/10"></div>

            {/* Pinos metálicos superiores */}
            <div className="absolute inset-x-6 top-10 flex justify-between">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="w-2 h-5 bg-yellow-500 rounded-sm shadow flex items-end justify-center border border-yellow-300/20">
                  <span className="text-[6px] text-black font-bold mb-0.5 leading-none">{i + 1}</span>
                </div>
              ))}
            </div>

            {/* Os 8 fios UTP crimpados */}
            <div className="flex-1 flex justify-between items-end px-1 pt-6 pb-8">
              <AnimatePresence mode="popLayout">
                {currentPinout.wires.map((wire, idx) => (
                  <motion.div
                    key={`${selectedStandard}-${wire.pin}`}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ delay: idx * 0.03, type: 'spring', stiffness: 200, damping: 15 }}
                    className="w-2.5 h-full rounded-sm relative shadow-md"
                    style={{
                      backgroundColor: wire.bgHex,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    {/* Se for listrado, desenhar o padrão listrado por cima */}
                    {wire.stripeHex && (
                      <div
                        className="absolute inset-0 rounded-sm overflow-hidden"
                        style={{
                          backgroundImage: `repeating-linear-gradient(45deg, ${wire.stripeHex}, ${wire.stripeHex} 3px, transparent 3px, transparent 6px)`,
                        }}
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* O cabo UTP saindo da base */}
            <div className="h-10 bg-slate-600/30 border-t border-slate-500/30 rounded-t-sm flex items-center justify-center relative shadow-inner">
              <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest font-mono">Cabo UTP</span>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 bg-accent/5 p-3 rounded-lg border border-accent/10 w-full">
            <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-[10px] text-text-secondary leading-relaxed">
              <strong>Instrução Prática:</strong> Segure o plug RJ45 com a trava plástica virada para baixo (para trás) e os pinos de metal voltados para cima. O pino 1 sempre fica na extrema esquerda.
            </p>
          </div>
        </div>

        {/* Technical Explanations and Pinout Details List */}
        <div className="space-y-4">
          <div className="bg-bg-secondary p-4 rounded-xl border border-border-light space-y-2">
            <h3 className="font-bold text-sm text-text-primary uppercase tracking-wide">
              {currentPinout.title}
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              {currentPinout.description}
            </p>
          </div>

          {/* Wires List */}
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {currentPinout.wires.map((wire) => (
              <div
                key={wire.pin}
                className="flex items-center justify-between bg-bg-secondary p-2 rounded-lg border border-border-light"
              >
                <div className="flex items-center gap-2">
                  {/* Círculo do número do pino */}
                  <span className="w-5.5 h-5.5 rounded-full bg-bg-primary text-text-muted flex items-center justify-center font-mono text-[9px] font-bold border border-border-light">
                    {wire.pin}
                  </span>
                  {/* Caixa de cor */}
                  <div
                    className="w-6 h-3 rounded border border-white/5 relative"
                    style={{ backgroundColor: wire.bgHex }}
                  >
                    {wire.stripeHex && (
                      <div
                        className="absolute inset-0 rounded-sm overflow-hidden"
                        style={{
                          backgroundImage: `repeating-linear-gradient(45deg, ${wire.stripeHex}, ${wire.stripeHex} 1.5px, transparent 1.5px, transparent 3px)`,
                        }}
                      />
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-text-primary font-mono">{wire.colorText}</span>
                </div>

                <span className="text-[8px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded uppercase tracking-wide">
                  {wire.name}
                </span>
              </div>
            ))}
          </div>

          {/* Crimp steps */}
          <div className="bg-bg-secondary p-4 rounded-xl border border-border-light space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-widest text-accent flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Checklist do Técnico CFTV
            </h4>
            <ul className="space-y-1.5 text-[9px] text-text-secondary leading-relaxed list-decimal pl-4">
              <li>Decape 2 a 3 cm do revestimento externo com o alicate decapador sem estragar os fios internos.</li>
              <li>Destrance e estique os fios individualmente com os dedos até ficarem 100% alinhados e retos.</li>
              <li>Ordene a sequência das cores conforme o padrão selecionado no topo.</li>
              <li>Corte as pontas de forma perfeitamente retilínea, deixando cerca de 1.2 cm expostos.</li>
              <li>Insira os condutores no RJ45 até tocarem o topo dourado e prense o conector com firmeza.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
