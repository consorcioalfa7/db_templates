'use client';

import { useState, useEffect, useRef } from 'react';
import { CreditCard, Zap, Terminal, Play, Pause, RotateCw, Check, AlertCircle, Home, ChevronRight, Sparkles, Download, RefreshCw, ArrowRight, Loader2, Copy, Trophy, Calendar, Hash, CreditCard as CreditCardIcon } from 'lucide-react';
import Link from 'next/link';

interface ProductionLine {
  id: number;
  binPattern: string;
  targetLives: number;
  useRandomDate: boolean;
  fixedMonth: string;
  fixedYear: string;
  currentLives: number;
  cards: string[];
  liveCards: string[];
  status: 'idle' | 'running' | 'completed' | 'stopped';
}

// Mock pessoas data - mesmo que os outros checkers
const PESSOAS_DATA = [
  { cpf: "03200833491", nome: "LENIRA BONIFACIO DE BRITO" },
  { cpf: "38915766172", nome: "JOAO ALVES BARROS" },
  { cpf: "54204690904", nome: "MOACIR CRESPI" },
  { cpf: "06330478805", nome: "IDALINA MARTINS VEIGA" },
  { cpf: "09327919564", nome: "LAURA SOPHIA DE SOUSA GARCIA" },
  { cpf: "35918144234", nome: "ANGELINA DA SILVA SOUZA" },
  { cpf: "63900416087", nome: "LACI ERONI ALBERT CALONI" },
  { cpf: "19206681877", nome: "ISMAEL GONCALVES" },
  { cpf: "16192889740", nome: "TAYNARA DA SILVA MACHADO" },
  { cpf: "04116220485", nome: "MARIA GREGORIO LOPES" },
  { cpf: "07701084746", nome: "JAQUELINE SILVA DE JESUS CAMILO" },
  { cpf: "18409434830", nome: "ALEKSANDRA GUIMARAES BARBOSA" },
  { cpf: "87192926515", nome: "ODILIA ALVES PEREIRA" },
  { cpf: "05434459253", nome: "MILTON ARAUJO MELO" },
  { cpf: "87609010553", nome: "ANDRE MOREIRA GONCALVES" },
  { cpf: "31715206053", nome: "LUIZ ALBERTO KRUPP" },
  { cpf: "51128994844", nome: "QUEMUEL KALEBE GONCALVES" },
  { cpf: "72056738104", nome: "RENATA DOS SANTOS" },
  { cpf: "02718732725", nome: "ANTONIA ESMERA DAS GRACAS DE ALMEIDA" },
  { cpf: "33663115844", nome: "DGENHOR FERREIRA DOS SANTOS" },
];

// Sistema para não repetir pessoas
let pessoaIndex = 0;
const usedPessoas = new Set<number>();

function getUniquePerson() {
  if (usedPessoas.size >= PESSOAS_DATA.length) {
    usedPessoas.clear();
  }

  let index;
  do {
    index = pessoaIndex % PESSOAS_DATA.length;
    pessoaIndex++;
  } while (usedPessoas.has(index));

  usedPessoas.add(index);
  return PESSOAS_DATA[index];
}

// ====================
// LÓGICA DO CC-GEN - GERAÇÃO
// ====================

const secureRandomInt = (max: number): number => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return Math.floor((array[0] / 0x100000000) * max);
  }
  return Math.floor(Math.random() * max);
};

const randomDigit = (): number => secureRandomInt(10);

const parseBinPattern = (binPattern: string, maxLength: number): number[] => {
  const digits: number[] = [];
  for (const char of binPattern) {
    if (digits.length >= maxLength) break;
    const lowerChar = char.toLowerCase();
    if (lowerChar === 'x') {
      digits.push(randomDigit());
    } else if (/\d/.test(lowerChar)) {
      digits.push(parseInt(lowerChar, 10));
    }
  }
  return digits;
};

const getCardLength = (bin: string): number => {
  const cleaned = bin.replace(/[^\dx]/gi, '');
  if (/^3[47]/.test(cleaned)) return 15;
  return 16;
};

const generateCardNumber = (binPattern: string): string => {
  const cardLength = getCardLength(binPattern);
  const digits = parseBinPattern(binPattern, cardLength - 1);

  while (digits.length < cardLength - 1) {
    digits.push(randomDigit());
  }

  let sum = 0;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits[i];
    if ((digits.length - i) % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  digits.push(checkDigit);

  return digits.join('');
};

const generateExpDate = (useRandom: boolean, fixedMonth: string, fixedYear: string): { month: string; year: string } => {
  if (useRandom) {
    const now = new Date();
    const year = now.getFullYear() + secureRandomInt(5);
    const month = String(secureRandomInt(12) + 1).padStart(2, '0');
    return { month, year: String(year) };
  } else {
    const month = fixedMonth || String(secureRandomInt(12) + 1).padStart(2, '0');
    const year = fixedYear || String(new Date().getFullYear() + secureRandomInt(5));
    return { month, year };
  }
};

const generateCVV = (cardNumber: string): string => {
  const cvvLength = /^3[47]/.test(cardNumber) ? 4 : 3;
  let cvv = '';
  for (let i = 0; i < cvvLength; i++) {
    cvv += randomDigit();
  }
  return cvv;
};

const formatCard = (cardNumber: string, month: string, year: string, cvv: string, person: typeof PESSOAS_DATA[0]): string => {
  return `${cardNumber}|${month}|${year}|${cvv} * ${person.nome} * ${person.cpf}`;
};

// ====================
// LÓGICA DO CHK AMEX - VALIDAÇÃO
// ====================

const luhnCheck = (cardNumber: string): boolean => {
  const digits = cardNumber.split('').map(Number);
  const length = digits.length;

  if (length < 12 || length > 19) return false;

  let sum = 0;
  let isSecond = false;

  for (let i = length - 1; i >= 0; i--) {
    let digit = digits[i];

    if (isSecond) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isSecond = !isSecond;
  }

  return sum % 10 === 0;
};

const detectCardType = (cardNumber: string) => {
  const patterns = {
    amex: {
      pattern: /^3[47][0-9]{13}$/,
      name: 'American Express',
      cvvLength: 4
    },
    visa: {
      pattern: /^4[0-9]{12}(?:[0-9]{3})?$/,
      name: 'Visa',
      cvvLength: 3
    },
    mastercard: {
      pattern: /^5[1-5][0-9]{14}$/,
      name: 'MasterCard',
      cvvLength: 3
    },
    discover: {
      pattern: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
      name: 'Discover',
      cvvLength: 3
    }
  };

  for (const [type, info] of Object.entries(patterns)) {
    if (info.pattern.test(cardNumber)) {
      return { type, ...info };
    }
  }
  return { type: 'unknown', name: 'Desconhecido', cvvLength: 3 };
};

const validateCard = (cardData: string): { valid: boolean; isLive: boolean } => {
  const parts = cardData.split('|').map(part => part.trim());
  const { number, month, year, cvv } = {
    number: parts[0] || '',
    month: parts[1] || '',
    year: parts[2] || '',
    cvv: parts[3] || ''
  };

  if (!number) {
    return { valid: false, isLive: false };
  }

  const cleanedNumber = number.replace(/\D/g, '');

  if (cleanedNumber.length < 12 || cleanedNumber.length > 19) {
    return { valid: false, isLive: false };
  }

  if (!luhnCheck(cleanedNumber)) {
    return { valid: false, isLive: false };
  }

  if (!month || !year) {
    return { valid: false, isLive: false };
  }

  const monthNum = parseInt(month, 10);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return { valid: false, isLive: false };
  }

  let fullYear = parseInt(year, 10);
  if (year.length === 2) {
    fullYear = 2000 + fullYear;
  } else if (year.length !== 4) {
    return { valid: false, isLive: false };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (fullYear < currentYear || (fullYear === currentYear && monthNum < currentMonth)) {
    return { valid: false, isLive: false };
  }

  if (fullYear > currentYear + 10) {
    return { valid: false, isLive: false };
  }

  const cardInfo = detectCardType(cleanedNumber);
  if (cvv.length !== cardInfo.cvvLength) {
    return { valid: false, isLive: false };
  }

  // Simulação: 20% chance de ser LIVE
  const isLive = Math.random() < 0.2;

  return { valid: true, isLive };
};

export default function DarkGGFactoryPage() {
  const [numLines, setNumLines] = useState(3);
  const [lineConfigs, setLineConfigs] = useState([
    { binPattern: '374245XXXXXXXXXX', targetLives: 5, useRandomDate: true, fixedMonth: '', fixedYear: '' },
    { binPattern: '4XXXXXXXXXXXXXXX', targetLives: 5, useRandomDate: true, fixedMonth: '', fixedYear: '' },
    { binPattern: '5XXXXXXXXXXXXXXX', targetLives: 5, useRandomDate: true, fixedMonth: '', fixedYear: '' }
  ]);
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [isProducing, setIsProducing] = useState(false);
  const [totalGenerated, setTotalGenerated] = useState(0);
  const [totalLives, setTotalLives] = useState(0);
  const [goalCompleted, setGoalCompleted] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  const stopSignalRef = useRef(false);
  const lineTimersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (resultsRef.current && totalLives > 0) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [totalLives]);

  const handleLineConfigChange = (lineIndex: number, field: string, value: any) => {
    const newConfigs = [...lineConfigs];
    newConfigs[lineIndex] = { ...newConfigs[lineIndex], [field]: value };
    setLineConfigs(newConfigs);
  };

  const processProductionLine = (lineId: number) => {
    return new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (stopSignalRef.current) {
          clearInterval(interval);
          resolve();
          return;
        }

        setProductionLines(prevLines => {
          const newLines = [...prevLines];
          const lineIndex = newLines.findIndex(l => l.id === lineId);
          
          if (lineIndex === -1) {
            clearInterval(interval);
            resolve();
            return newLines;
          }

          const line = newLines[lineIndex];

          // Verificar se a linha atingiu sua meta
          if (line.currentLives >= line.targetLives) {
            newLines[lineIndex] = { ...newLines[lineIndex], status: 'completed' };
            clearInterval(interval);
            resolve();
            return newLines;
          }

          // Definir como running
          if (line.status === 'idle') {
            newLines[lineIndex] = { ...newLines[lineIndex], status: 'running' };
          }

          // Gerar cartão usando lógica do CC-GEN
          const cardNumber = generateCardNumber(line.binPattern);
          const { month, year } = generateExpDate(line.useRandomDate, line.fixedMonth, line.fixedYear);
          const cvv = generateCVV(cardNumber);

          // Validar usando lógica do CHK AMEX
          const { valid, isLive } = validateCard(`${cardNumber}|${month}|${year}|${cvv}`);

          // Criar string do cartão
          const person = getUniquePerson();
          const cardString = formatCard(cardNumber, month, year, cvv, person);

          // Adicionar à linha
          newLines[lineIndex].cards.push(cardString);
          
          if (valid && isLive) {
            newLines[lineIndex].liveCards.push(cardString);
            newLines[lineIndex].currentLives++;
          }

          return newLines;
        });

        // Atualizar totais
        setProductionLines(prevLines => {
          let livesCount = 0;
          let generatedCount = 0;
          prevLines.forEach(l => {
            livesCount += l.liveCards.length;
            generatedCount += l.cards.length;
          });

          setTotalLives(livesCount);
          setTotalGenerated(generatedCount);

          // Verificar se todas as metas foram atingidas
          const totalTarget = lineConfigs.reduce((a, b) => a + b.targetLives, 0);
          if (livesCount >= totalTarget && !goalCompleted) {
            stopSignalRef.current = true;
            setGoalCompleted(true);
            setIsProducing(false);

            // Parar todos os timers
            lineTimersRef.current.forEach(timer => clearInterval(timer));
            lineTimersRef.current = [];

            // Marcar todas as linhas como completadas
            setTimeout(() => {
              setProductionLines(prevLines =>
                prevLines.map(l => ({ ...l, status: 'completed' as const }))
              );
            }, 100);
          }

          return prevLines;
        });
      }, 100); // Gerar um cartão a cada 100ms
    });
  };

  const startProduction = async () => {
    // Validar todas as linhas
    for (let i = 0; i < numLines; i++) {
      const config = lineConfigs[i];
      if (!config.binPattern || config.targetLives < 1) {
        alert(`Por favor, configure corretamente a Linha ${i + 1} (BIN e quantidade de LIVEs)`);
        return;
      }
    }

    const totalTarget = lineConfigs.reduce((a, b) => a + b.targetLives, 0);
    if (totalTarget < 1) {
      alert('Por favor, defina a quantidade de LIVEs para pelo menos uma linha');
      return;
    }

    // Reset
    stopSignalRef.current = false;
    setGoalCompleted(false);
    setTotalGenerated(0);
    setTotalLives(0);
    pessoaIndex = 0;
    usedPessoas.clear();
    setIsProducing(true);

    // Limpar timers anteriores
    lineTimersRef.current.forEach(timer => clearInterval(timer));
    lineTimersRef.current = [];

    // Criar linhas de produção com configurações individuais
    const lines: ProductionLine[] = Array.from({ length: numLines }, (_, i) => ({
      id: i,
      binPattern: lineConfigs[i].binPattern,
      targetLives: lineConfigs[i].targetLives,
      useRandomDate: lineConfigs[i].useRandomDate,
      fixedMonth: lineConfigs[i].fixedMonth,
      fixedYear: lineConfigs[i].fixedYear,
      currentLives: 0,
      cards: [],
      liveCards: [],
      status: 'idle' as const
    }));

    setProductionLines(lines);

    // Iniciar cada linha com delay
    const timers: NodeJS.Timeout[] = [];
    for (let i = 0; i < lines.length; i++) {
      const timer = setTimeout(async () => {
        if (!stopSignalRef.current) {
          await processProductionLine(i);
        }
      }, i * 200);
      timers.push(timer);
    }
    lineTimersRef.current = timers;
  };

  const stopProduction = () => {
    stopSignalRef.current = true;
    setIsProducing(false);
    lineTimersRef.current.forEach(timer => clearInterval(timer));
    lineTimersRef.current = [];
    setProductionLines(prev => prev.map(line => ({
      ...line,
      status: 'stopped' as const
    })));
  };

  const resetFactory = () => {
    stopSignalRef.current = true;
    setIsProducing(false);
    lineTimersRef.current.forEach(timer => clearInterval(timer));
    lineTimersRef.current = [];
    setProductionLines([]);
    setTotalGenerated(0);
    setTotalLives(0);
    setGoalCompleted(false);
    pessoaIndex = 0;
    usedPessoas.clear();
  };

  const exportAllResults = () => {
    const allLiveCards = productionLines.flatMap(line => line.liveCards);
    if (allLiveCards.length === 0) {
      alert('Nenhum cartão LIVE para exportar');
      return;
    }

    const content = allLiveCards.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dark_gg_production_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyAllLiveCards = async () => {
    const allLiveCards = productionLines.flatMap(line => line.liveCards);
    if (allLiveCards.length === 0) {
      alert('Nenhum cartão LIVE para copiar');
      return;
    }

    await navigator.clipboard.writeText(allLiveCards.join('\n'));
    alert(`${allLiveCards.length} cartões LIVE copiados para o clipboard!`);
  };

  // Padrões de BIN pré-configurados
  const presetBINs = [
    { bin: '37XXXXXXXXXXXXX', label: 'AMEX 37', type: 'amex' },
    { bin: '34XXXXXXXXXXXXX', label: 'AMEX 34', type: 'amex' },
    { bin: '4XXXXXXXXXXXXXXX', label: 'VISA', type: 'visa' },
    { bin: '5XXXXXXXXXXXXXXX', label: 'MASTERCARD', type: 'mastercard' },
    { bin: '6011XXXXXXXXXXXX', label: 'DISCOVER', type: 'discover' },
  ];

  const totalCompletedLines = productionLines.filter(l => l.status === 'completed' || l.status === 'stopped').length;
  const totalTarget = lineConfigs.reduce((a, b) => a + b.targetLives, 0);

  return (
    <div className="min-h-screen bg-black overflow-x-hidden overflow-y-auto">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black"></div>
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'linear-gradient(rgba(139, 0, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 0, 0, 0.1) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          animation: 'gridMove 40s linear infinite'
        }}></div>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(139, 0, 0, 0.02) 20px, rgba(139, 0, 0, 0.02) 40px)',
          animation: 'diagonalMove 50s linear infinite'
        }}></div>
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 pb-12 min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-800/50 sticky top-0 bg-black/80 backdrop-blur-xl z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 group p-2 -ml-2 rounded-lg hover:bg-gray-800/50 active:bg-gray-800/70 transition-all"
              aria-label="Voltar para página inicial"
            >
              <Home className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 group-hover:text-red-400 transition-colors" />
              <span className="text-gray-400 group-hover:text-red-400 transition-colors text-sm font-medium">Início</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <img src="/darktools-logo.png" alt="DarkToolsLabs Logo" className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl" />
              <div className="text-right">
                <h1 className="text-base sm:text-lg md:text-xl font-bold text-white leading-tight">DARK GG FACTORY</h1>
                <p className="text-[10px] sm:text-xs text-gray-500">Fábrica de Lives</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 lg:py-10 max-w-7xl mx-auto flex-1">
          {/* Title Section */}
          <div className="text-center mb-6 sm:mb-8 md:mb-10 lg:mb-12">
            <div className="inline-flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <Terminal className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-red-500" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                DARK GG FACTORY
              </h1>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm md:text-base max-w-2xl mx-auto leading-relaxed px-2">
              Sistema de produção em massa de cartões LIVE. Configure, produza e exporte resultados.
            </p>
          </div>

          {/* Goal Completed Banner */}
          {goalCompleted && (
            <div className="mb-8 p-6 bg-gradient-to-r from-emerald-600/20 via-green-600/20 to-emerald-600/20 backdrop-blur-xl rounded-2xl border-2 border-emerald-500/50 animate-pulse">
              <div className="flex items-center justify-center gap-4">
                <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400" />
                <div className="text-center">
                  <h2 className="text-2xl sm:text-3xl font-bold text-emerald-400 mb-1">🎉 OBJETIVO CONCLUÍDO! 🎉</h2>
                  <p className="text-sm sm:text-base text-emerald-300">
                    Meta de {totalTarget} LIVEs alcançada! Foram gerados {totalGenerated} cartões no total.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
            <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-gray-900/60 backdrop-blur-xl rounded-xl border border-gray-800/50 touch-manipulation">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight">{totalLives}</div>
              <div className="text-[10px] sm:text-xs md:text-sm text-gray-400 mt-1">LIVES</div>
            </div>
            <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-gray-900/60 backdrop-blur-xl rounded-xl border border-gray-800/50 touch-manipulation">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight">{totalGenerated}</div>
              <div className="text-[10px] sm:text-xs md:text-sm text-gray-400 mt-1">GERADOS</div>
            </div>
            <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-gray-900/60 backdrop-blur-xl rounded-xl border border-gray-800/50 touch-manipulation">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight">{totalCompletedLines}</div>
              <div className="text-[10px] sm:text-xs md:text-sm text-gray-400 mt-1">LINHAS</div>
            </div>
            <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-gray-900/60 backdrop-blur-xl rounded-xl border border-gray-800/50 touch-manipulation">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight">{totalTarget}</div>
              <div className="text-[10px] sm:text-xs md:text-sm text-gray-400 mt-1">META</div>
            </div>
          </div>

          {/* Number of Lines Selection */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-900/60 backdrop-blur-xl rounded-xl border border-gray-800/50">
            <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-2 sm:mb-3">
              Número de Linhas de Produção
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setNumLines(n)}
                  disabled={isProducing}
                  className={`flex-1 py-3 sm:py-4 rounded-lg font-bold transition-all text-sm sm:text-base touch-manipulation min-h-[44px] ${
                    numLines === n
                      ? 'bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg shadow-red-500/30'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  } ${isProducing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {n} Linha{n > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Line Configurations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {Array.from({ length: numLines }).map((_, i) => (
              <div key={i} className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gray-900/60 backdrop-blur-2xl border border-gray-800/50 hover:border-red-500/30 transition-all">
                <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <CreditCardIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                  Linha {i + 1}
                </h3>

                {/* BIN Pattern */}
                <div className="mb-3 sm:mb-4">
                  <label className="block text-[10px] sm:text-xs font-medium text-gray-400 mb-1">Padrão BIN</label>
                  <input
                    type="text"
                    value={lineConfigs[i]?.binPattern || ''}
                    onChange={(e) => handleLineConfigChange(i, 'binPattern', e.target.value)}
                    disabled={isProducing}
                    placeholder="Ex: 374245XXXXXXXXXX"
                    className="w-full px-3 py-2 sm:px-3 sm:py-2 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-xs sm:text-sm disabled:opacity-50"
                  />
                  <div className="grid grid-cols-5 gap-1 mt-2">
                    {presetBINs.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleLineConfigChange(i, 'binPattern', preset.bin)}
                        disabled={isProducing}
                        className="px-1 sm:px-1 py-1.5 sm:py-1.5 bg-gray-800/50 border border-gray-700 rounded text-[9px] sm:text-[10px] text-gray-300 hover:border-red-500 hover:text-red-400 transition-all disabled:opacity-50 touch-manipulation min-h-[32px]"
                      >
                        {preset.label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Lives */}
                <div className="mb-3 sm:mb-4">
                  <label className="block text-[10px] sm:text-xs font-medium text-gray-400 mb-1">
                    Quantidade de LIVEs
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    value={lineConfigs[i]?.targetLives || 0}
                    onChange={(e) => handleLineConfigChange(i, 'targetLives', parseInt(e.target.value) || 0)}
                    disabled={isProducing}
                    className="w-full px-3 py-2 sm:px-3 sm:py-2 bg-black/50 border border-gray-700 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-xs sm:text-sm disabled:opacity-50"
                  />
                </div>

                {/* Date Options */}
                <div className="mb-2 sm:mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={lineConfigs[i]?.useRandomDate || false}
                      onChange={(e) => handleLineConfigChange(i, 'useRandomDate', e.target.checked)}
                      disabled={isProducing}
                      className="w-4 h-4 sm:w-4 sm:h-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500 focus:ring-offset-0 disabled:opacity-50"
                    />
                    <label className="text-[10px] sm:text-xs text-gray-300 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Data aleatória
                    </label>
                  </div>

                  {!(lineConfigs[i]?.useRandomDate) && (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={lineConfigs[i]?.fixedMonth || ''}
                        onChange={(e) => handleLineConfigChange(i, 'fixedMonth', e.target.value)}
                        placeholder="Mês (01-12)"
                        maxLength={2}
                        disabled={isProducing}
                        className="w-full px-2 sm:px-2 py-1.5 sm:py-1.5 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-[10px] sm:text-xs disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={lineConfigs[i]?.fixedYear || ''}
                        onChange={(e) => handleLineConfigChange(i, 'fixedYear', e.target.value)}
                        placeholder="Ano"
                        maxLength={4}
                        disabled={isProducing}
                        className="w-full px-2 sm:px-2 py-1.5 sm:py-1.5 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-[10px] sm:text-xs disabled:opacity-50"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8 items-stretch sm:items-center justify-center">
            <button
              onClick={isProducing ? stopProduction : startProduction}
              disabled={goalCompleted}
              className="flex-1 max-w-md w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-4 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold rounded-xl hover:from-red-700 hover:to-red-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[52px] sm:min-h-[48px] shadow-lg shadow-red-500/30 touch-manipulation active:scale-98"
            >
              {isProducing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {isProducing ? 'Pausar Produção' : goalCompleted ? 'Concluído' : 'Iniciar Produção'}
            </button>
            <button
              onClick={resetFactory}
              disabled={isProducing}
              className="flex-1 sm:flex-none max-w-md w-full sm:w-auto px-6 sm:px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold rounded-xl hover:from-gray-700 hover:to-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[52px] sm:min-h-[48px] touch-manipulation active:scale-98"
            >
              <RefreshCw className="w-5 h-5" />
              <span className="ml-1 sm:ml-2">Reset</span>
            </button>
          </div>

          {/* Production Lines */}
          {productionLines.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
              {productionLines.map((line) => (
                <div key={line.id} className="p-3 sm:p-4 bg-black/50 rounded-xl border border-gray-700/50">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${line.status === 'running' ? 'bg-emerald-500 animate-pulse' : line.status === 'completed' ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                      <span className="text-xs sm:text-sm text-gray-300">Linha {line.id + 1}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] sm:text-xs text-gray-500">Gerados: {line.cards.length}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex justify-between text-[10px] sm:text-xs sm:text-sm">
                      <span className="text-gray-400">LIVE: <span className="text-emerald-400 font-bold">{line.liveCards.length}</span></span>
                      <span className="text-gray-500">Meta: {line.liveCards.length} / {line.targetLives}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 sm:h-2 rounded-full overflow-hidden bg-gray-800">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 via-orange-500 to-red-600 transition-all duration-300"
                        style={{ width: `${Math.min((line.liveCards.length / line.targetLives) * 100, 100)}%` }}
                      ></div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {line.status === 'running' && <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400 animate-spin" />}
                      {line.status === 'completed' && <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />}
                      <span className={`text-[10px] sm:text-xs sm:text-sm ${line.status === 'running' ? 'text-emerald-400' : line.status === 'completed' ? 'text-green-500' : 'text-gray-500'}`}>
                        {line.status === 'running' ? 'Produzindo...' : line.status === 'completed' ? 'Concluído!' : 'Aguardando...'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results Section */}
          {totalLives > 0 && (
            <div className="p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl bg-gray-900/60 backdrop-blur-2xl border border-gray-800/50" ref={resultsRef}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                  <Download className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                  Resultados LIVE
                </h2>
                <div className="text-xs sm:text-sm text-emerald-400 font-bold">
                  {totalLives} cartões LIVE encontrados
                </div>
              </div>

              <div className="grid grid-cols-2 sm:flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
                <button
                  onClick={exportAllResults}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 md:px-6 py-3 sm:py-3 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-emerald-900 transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20 touch-manipulation text-xs sm:text-sm min-h-[44px]"
                >
                  <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Exportar Todos</span>
                </button>
                <button
                  onClick={copyAllLiveCards}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 md:px-6 py-3 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20 touch-manipulation text-xs sm:text-sm min-h-[44px]"
                >
                  <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Copiar Todos</span>
                </button>
              </div>

              {/* Show last few results */}
              <div className="max-h-64 sm:max-h-80 md:max-h-96 overflow-y-auto bg-black/50 rounded-xl p-3 sm:p-4 border border-gray-700/50">
                <pre className="text-[10px] sm:text-xs md:text-xs text-gray-400 whitespace-pre-wrap break-all font-mono">
                  {productionLines.flatMap(line => line.liveCards).slice(-10).join('\n')}
                </pre>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="px-4 sm:px-6 py-6 sm:py-8 border-t border-gray-800/50 bg-black/50 backdrop-blur-xl mt-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <img src="/darktools-logo.png" alt="DarkToolsLabs Logo" className="w-7 h-7 sm:w-8 sm:h-10 rounded-xl" />
                <span className="text-white font-bold text-xs sm:text-sm">DarkToolsLabs</span>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <a
                  href="https://t.me/DarkMarket_Oficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-[10px] sm:text-xs sm:text-sm touch-manipulation p-1 rounded hover:bg-gray-800/50 active:bg-gray-800/70"
                >
                  @DarkMarket_Oficial
                </a>
                <a
                  href="https://t.me/DarkToolsLabs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-[10px] sm:text-xs sm:text-sm touch-manipulation p-1 rounded hover:bg-gray-800/50 active:bg-gray-800/70"
                >
                  @DarkToolsLabs
                </a>
              </div>
            </div>
            <div className="text-center text-gray-600 text-[10px] sm:text-xs mt-4">
              © 2025 DarkToolsLabs. Todos os direitos reservados.
            </div>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(80px, 80px); }
        }
        @keyframes diagonalMove {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
