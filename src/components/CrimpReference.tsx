import React from 'react';
import { Cable, ShieldCheck, Info, HelpCircle, ArrowRightLeft, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Wire {
  pin: number;
  name: string;
  colorClass: string; // Tailwind class
  colorText: string;
  bgHex: string; // Usado para desenhar o fio real
  stripeHex?: string; // Usado para fios listrados (Branco com listra)
}

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
      { pin: 1, name: 'Par 2', colorText: WIRE_COLORS.orangeStripe.text, bgHex: WIRE_COLORS.orangeStripe.bg, stripeHex: WIRE_COLORS.orangeStripe.stripe, colorClass: 'border-l-[12px] border-orange-500 bg-white' },
      { pin: 2, name: 'Par 2', colorText: WIRE_COLORS.orange.text, bgHex: WIRE_COLORS.orange.bg, colorClass: 'bg-orange-600' },
      { pin: 3, name: 'Par 3', colorText: WIRE_COLORS.greenStripe.text, bgHex: WIRE_COLORS.greenStripe.bg, stripeHex: WIRE_COLORS.greenStripe.stripe, colorClass: 'border-l-[12px] border-green-500 bg-white' },
      { pin: 4, name: 'Par 1', colorText: WIRE_COLORS.blue.text, bgHex: WIRE_COLORS.blue.bg, colorClass: 'bg-blue-600' },
      { pin: 5, name: 'Par 1', colorText: WIRE_COLORS.blueStripe.text, bgHex: WIRE_COLORS.blueStripe.bg, stripeHex: WIRE_COLORS.blueStripe.stripe, colorClass: 'border-l-[12px] border-blue-500 bg-white' },
      { pin: 6, name: 'Par 3', colorText: WIRE_COLORS.green.text, bgHex: WIRE_COLORS.green.bg, colorClass: 'bg-green-600' },
      { pin: 7, name: 'Par 4', colorText: WIRE_COLORS.brownStripe.text, bgHex: WIRE_COLORS.brownStripe.bg, stripeHex: WIRE_COLORS.brownStripe.stripe, colorClass: 'border-l-[12px] border-amber-800 bg-white' },
      { pin: 8, name: 'Par 4', colorText: WIRE_COLORS.brown.text, bgHex: WIRE_COLORS.brown.bg, colorClass: 'bg-amber-900' }
    ]
  },
  '568A': {
    title: 'Padrão T-568A (Tradicional)',
    description: 'Padrão normativo oficial de cabeamento. Muito utilizado em infraestruturas governamentais e de telecomunicações.',
    wires: [
      { pin: 1, name: 'Par 3', colorText: WIRE_COLORS.greenStripe.text, bgHex: WIRE_COLORS.greenStripe.bg, stripeHex: WIRE_COLORS.greenStripe.stripe, colorClass: 'border-l-[12px] border-green-500 bg-white' },
      { pin: 2, name: 'Par 3', colorText: WIRE_COLORS.green.text, bgHex: WIRE_COLORS.green.bg, colorClass: 'bg-green-600' },
      { pin: 3, name: 'Par 2', colorText: WIRE_COLORS.orangeStripe.text, bgHex: WIRE_COLORS.orangeStripe.bg, stripeHex: WIRE_COLORS.orangeStripe.stripe, colorClass: 'border-l-[12px] border-orange-500 bg-white' },
      { pin: 4, name: 'Par 1', colorText: WIRE_COLORS.blue.text, bgHex: WIRE_COLORS.blue.bg, colorClass: 'bg-blue-600' },
      { pin: 5, name: 'Par 1', colorText: WIRE_COLORS.blueStripe.text, bgHex: WIRE_COLORS.blueStripe.bg, stripeHex: WIRE_COLORS.blueStripe.stripe, colorClass: 'border-l-[12px] border-blue-500 bg-white' },
      { pin: 6, name: 'Par 2', colorText: WIRE_COLORS.orange.text, bgHex: WIRE_COLORS.orange.bg, colorClass: 'bg-orange-600' },
      { pin: 7, name: 'Par 4', colorText: WIRE_COLORS.brownStripe.text, bgHex: WIRE_COLORS.brownStripe.bg, stripeHex: WIRE_COLORS.brownStripe.stripe, colorClass: 'border-l-[12px] border-amber-800 bg-white' },
      { pin: 8, name: 'Par 4', colorText: WIRE_COLORS.brown.text, bgHex: WIRE_COLORS.brown.bg, colorClass: 'bg-amber-900' }
    ]
  },
  'SEQUENTIAL': {
    title: 'Padrão Sequencial (Power Balun)',
    description: 'Organização em blocos sequenciais projetada especificamente para evitar curtos e maximizar a distribuição de energia no Power Balun Intelbras.',
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

export default function CrimpReference() {
  const [selectedStandard, setSelectedStandard] = React.useState<Standard>('568B');
  const currentPinout = pinouts[selectedStandard];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 pb-24 md:pb-8">
      {/* Header */}
      <header className="border-b border-outline-variant/15 pb-6">
        <div className="flex items-center gap-3">
          <Cable className="text-primary w-7 h-7" />
          <h2 className="font-headline text-3xl font-bold text-on-surface tracking-tight uppercase leading-none">
            Guia de Cores de Crimpagem
          </h2>
        </div>
        <p className="text-on-surface-variant text-sm mt-2">
          Referência técnica em alta definição para montagem de conectores RJ45 e links de infraestrutura.
        </p>
      </header>

      {/* Select Switch */}
      <div className="flex bg-surface-container-low p-1.5 rounded-sm border border-outline-variant/10 max-w-md">
        {(Object.keys(pinouts) as Standard[]).map((std) => (
          <button
            key={std}
            onClick={() => setSelectedStandard(std)}
            className={`flex-1 text-center py-2.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-all ${
              selectedStandard === std
                ? 'bg-primary text-on-primary shadow-lg'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {std === 'SEQUENTIAL' ? 'Seq. Balun' : std}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Interactive RJ45 Connector Display */}
        <div className="bg-surface-container-low p-6 rounded-sm border border-outline-variant/10 flex flex-col items-center justify-center">
          <h3 className="text-xs font-headline font-bold text-primary tracking-widest uppercase mb-6 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Vista de Referência (Trava p/ Baixo)
          </h3>

          {/* RJ45 Connector Wrapper */}
          <div className="relative w-64 h-[340px] bg-sky-200/5 rounded-t-3xl rounded-b-md border border-slate-500/30 flex flex-col justify-end pt-12 pb-6 px-8 shadow-2xl backdrop-blur-sm overflow-hidden">
            {/* O corpo transparente do RJ45 */}
            <div className="absolute inset-x-2 top-2 h-14 bg-sky-300/10 rounded-t-2xl border-b border-slate-500/20"></div>

            {/* Pinos metálicos superiores */}
            <div className="absolute inset-x-8 top-12 flex justify-between">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="w-2.5 h-6 bg-yellow-500 rounded-sm shadow-md flex items-end justify-center border border-yellow-300/30">
                  <span className="text-[7px] text-black font-bold mb-0.5 leading-none">{i + 1}</span>
                </div>
              ))}
            </div>

            {/* Presilha de Pressão (Trava de cabo na parte inferior) */}
            <div className="absolute inset-x-6 bottom-16 h-8 bg-sky-300/15 border border-slate-500/20 rounded-sm flex items-center justify-center">
              <span className="text-[8px] tracking-widest text-on-surface-variant/40 font-mono">TRAVA DE CABO</span>
            </div>

            {/* Os 8 fios UTP crimpados */}
            <div className="flex-1 flex justify-between items-end px-1.5 pt-8 pb-10">
              <AnimatePresence mode="popLayout">
                {currentPinout.wires.map((wire, idx) => (
                  <motion.div
                    key={`${selectedStandard}-${wire.pin}`}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ delay: idx * 0.03, type: 'spring', stiffness: 200, damping: 15 }}
                    className="w-2.5 h-full rounded-sm relative shadow-lg"
                    style={{
                      backgroundColor: wire.bgHex,
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                    }}
                  >
                    {/* Se for listrado, desenhar o padrão listrado por cima */}
                    {wire.stripeHex && (
                      <div
                        className="absolute inset-0 rounded-sm overflow-hidden"
                        style={{
                          backgroundImage: `repeating-linear-gradient(45deg, ${wire.stripeHex}, ${wire.stripeHex} 4px, transparent 4px, transparent 8px)`,
                        }}
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* O cabo UTP (Capa protetora cinza/azul) saindo da base */}
            <div className="h-12 bg-slate-600/35 border-t border-slate-500/40 rounded-t-sm flex items-center justify-center relative shadow-inner">
              <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest font-mono">Cabo UTP</span>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-2 bg-primary/5 p-3 rounded-sm border border-primary/10 w-full max-w-sm">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[10px] text-on-surface-variant leading-relaxed">
              <strong>Importante:</strong> Segure o conector com os **contatos de ouro virados para você** e a **presilha plástica virada para trás (baixo)**. A contagem dos pinos é feita da esquerda para a direita (1 a 8).
            </p>
          </div>
        </div>

        {/* Technical Explanations and Pinout Details List */}
        <div className="space-y-6">
          <div className="bg-surface-container-low p-5 rounded-sm border border-outline-variant/10 space-y-3">
            <h3 className="font-headline font-bold text-lg text-on-surface uppercase tracking-wide">
              {currentPinout.title}
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {currentPinout.description}
            </p>
          </div>

          {/* Wires List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedStandard}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-2"
              >
                {currentPinout.wires.map((wire) => (
                  <div
                    key={wire.pin}
                    className="flex items-center justify-between bg-surface-container-high p-3 rounded-sm border border-outline-variant/10 hover:border-outline-variant/20 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {/* Círculo do número do pino */}
                      <span className="w-6 h-6 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-mono text-[10px] font-bold border border-outline-variant/10">
                        {wire.pin}
                      </span>
                      {/* Caixa de cor */}
                      <div
                        className="w-8 h-4 rounded-sm border border-white/10 relative"
                        style={{ backgroundColor: wire.bgHex }}
                      >
                        {wire.stripeHex && (
                          <div
                            className="absolute inset-0 rounded-sm overflow-hidden"
                            style={{
                              backgroundImage: `repeating-linear-gradient(45deg, ${wire.stripeHex}, ${wire.stripeHex} 2px, transparent 2px, transparent 4px)`,
                            }}
                          />
                        )}
                      </div>
                      <span className="text-xs font-bold text-on-surface font-mono">{wire.colorText}</span>
                    </div>

                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-sm uppercase tracking-wide">
                      {wire.name}
                    </span>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Crimp steps */}
          <div className="bg-surface-container-low p-5 rounded-sm border border-outline-variant/10 space-y-4">
            <h4 className="font-headline font-bold text-xs uppercase tracking-widest text-primary flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Checklist de Validação em Campo
            </h4>
            <ul className="space-y-2 text-[10px] text-on-surface-variant font-medium leading-relaxed">
              <li className="flex gap-2">
                <span className="text-primary font-bold">1.</span>
                <span>Decape cerca de 2 a 3 cm da capa azul externa com cuidado para não ferir os condutores de cobre.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">2.</span>
                <span>Desentrelace os pares e os estique com os dedos para deixá-los perfeitamente alinhados e retos.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">3.</span>
                <span>Ordene na sequência selecionada acima e corte as pontas alinhadas em linha reta (corte guilhotina seco).</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">4.</span>
                <span>Empurre firmemente os fios para dentro do conector RJ45 até que alcancem o fim dos pinos de ouro no topo.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">5.</span>
                <span>Verifique visualmente se a capa cinza/azul do cabo entrou para baixo do ponto de trava no conector antes de apertar o alicate.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Versão menor pronta para ser usada como Modal/Drawer Inline
export function CrimpReferenceModal({ onClose, selectedCrimp = '568B' }: { onClose: () => void; selectedCrimp?: string }) {
  const crimpKey: Standard = (selectedCrimp === 'SEQUENTIAL' || selectedCrimp === '568A' || selectedCrimp === '568B') 
    ? selectedCrimp as Standard 
    : '568B';

  const [standard, setStandard] = React.useState<Standard>(crimpKey);
  const pinout = pinouts[standard];

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
        <div className="flex items-center gap-2 text-primary">
          <Cable className="w-5 h-5" />
          <h3 className="font-headline font-bold text-sm uppercase tracking-widest">Pinagem RJ45 / CFTV</h3>
        </div>
        <button onClick={onClose} className="text-on-surface-variant hover:text-primary font-bold text-sm">×</button>
      </div>

      <div className="flex bg-surface-container-high p-1 rounded-sm border border-outline-variant/10">
        {(Object.keys(pinouts) as Standard[]).map((std) => (
          <button
            key={std}
            onClick={() => setStandard(std)}
            className={`flex-1 text-center py-2 text-[10px] font-bold uppercase rounded-sm ${
              standard === std
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {std === 'SEQUENTIAL' ? 'Sequencial' : std}
          </button>
        ))}
      </div>

      {/* Visual das vias */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-1">
          <span>Pino / Cabo UTP</span>
          <span>Sinal / Uso</span>
        </div>
        
        <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
          {pinout.wires.map((wire) => (
            <div
              key={wire.pin}
              className="flex items-center justify-between bg-surface-container-high p-2 rounded-sm text-[11px]"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-mono text-[9px] font-bold">
                  {wire.pin}
                </span>
                <div
                  className="w-5 h-3 rounded-sm border border-white/5 relative shrink-0"
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
                <span className="font-bold text-on-surface truncate max-w-[120px]">{wire.colorText}</span>
              </div>
              <span className="text-[9px] font-mono font-bold text-primary uppercase bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded-sm">
                {wire.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-primary/5 p-2 rounded-sm border border-primary/10 text-[9px] text-on-surface-variant leading-relaxed">
        Contatos dourados virados para cima, presilha plástica para trás. Pino 1 à esquerda.
      </div>
    </div>
  );
}
