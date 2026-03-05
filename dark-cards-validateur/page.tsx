'use client';

import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, XCircle, Loader2, Home } from 'lucide-react';
import Link from 'next/link';

interface BinData {
  bin: string;
  brand: string;
  bank: string;
  type: string;
  level: string;
}

export default function DarkCardsValidateurPage() {
  const [cardNumber, setCardNumber] = useState('');
  const [expDate, setExpDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [displayNumber, setDisplayNumber] = useState('•••• •••• •••• ••••');
  const [displayBank, setDisplayBank] = useState('UNKNOWN BANK');
  const [displayExp, setDisplayExp] = useState('MM/AA');
  const [bankLogo, setBankLogo] = useState('');
  const [binData, setBinData] = useState<BinData | null>(null);
  const [dbStatus, setDbStatus] = useState<'CARREGANDO...' | 'ONLINE' | 'OFFLINE'>('CARREGANDO...');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const BIN_URL = 'https://raw.githubusercontent.com/WorldDarkMarket/DarkLookBin/main/bin-list.csv';
  const LOGO_URL = 'https://cdn.jsdelivr.net/gh/Tgentil/Bancos-em-SVG@main/';

  // Load BIN database
  useEffect(() => {
    async function loadDB() {
      try {
        const response = await fetch(BIN_URL);
        const text = await response.text();
        const lines = text.split('\n').filter(line => line.trim());
        const bins: BinData[] = lines.map(line => {
          const parts = line.split(',');
          return {
            bin: parts[0]?.trim() || '',
            brand: parts[1]?.trim() || '',
            bank: parts[2]?.trim() || '',
            type: parts[3]?.trim() || '',
            level: parts[4]?.trim() || '',
          };
        });
        setBinData(bins[0]); // Store first bin as reference
        setDbStatus('ONLINE');
      } catch (error) {
        console.error('Failed to load BIN database:', error);
        setDbStatus('OFFLINE');
      }
    }
    loadDB();
  }, []);

  // Card number input handler
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    let formatted = value.replace(/(.{4})/g, '$1 ').trim();

    setCardNumber(formatted);
    setDisplayNumber(formatted || '•••• •••• •••• ••••');

    // Look up BIN
    if (value.length >= 6) {
      const binPrefix = value.substring(0, 6);
      detectBank(binPrefix);
    }
  };

  // Detect bank from BIN
  const detectBank = (bin: string) => {
    const firstDigit = bin[0];
    const firstSix = parseInt(bin.substring(0, 6), 10);

    let bankName = 'UNKNOWN BANK';
    let logoPath = '';

    // Simple BIN pattern detection for Brazilian banks
    if (bin.startsWith('3')) {
      // AMEX
      bankName = 'AMERICAN EXPRESS';
    } else if (bin.startsWith('4')) {
      // VISA
      if (firstSix >= 424200 && firstSix <= 424299) {
        bankName = 'ITAU';
        logoPath = 'Itau/Itau.svg';
      } else if (firstSix >= 431274 && firstSix <= 431279) {
        bankName = 'SANTANDER';
        logoPath = 'Santander/Santander.svg';
      } else if (firstSix >= 438935 && firstSix <= 438939) {
        bankName = 'BANCO DO BRASIL';
        logoPath = 'Banco%20do%20Brasil/Banco%20do%20Brasil.svg';
      } else if (firstSix >= 469100 && firstSix <= 469199) {
        bankName = 'NUBANK';
        logoPath = 'Nubank/Nubank.svg';
      } else if (firstSix >= 437441 && firstSix <= 437443) {
        bankName = 'BRADESCO';
        logoPath = 'Bradesco/Bradesco.svg';
      } else {
        bankName = 'VISA';
      }
    } else if (bin.startsWith('5')) {
      // MASTERCARD
      if (firstSix >= 524503 && firstSix <= 524505) {
        bankName = 'ITAU';
        logoPath = 'Itau/Itau.svg';
      } else if (firstSix >= 527532 && firstSix <= 527533) {
        bankName = 'SANTANDER';
        logoPath = 'Santander/Santander.svg';
      } else if (firstSix >= 540068 && firstSix <= 540069) {
        bankName = 'BANCO DO BRASIL';
        logoPath = 'Banco%20do%20Brasil/Banco%20do%20Brasil.svg';
      } else if (firstSix >= 517873 && firstSix <= 517875) {
        bankName = 'NUBANK';
        logoPath = 'Nubank/Nubank.svg';
      } else if (firstSix >= 556055 && firstSix <= 556058) {
        bankName = 'BRADESCO';
        logoPath = 'Bradesco/Bradesco.svg';
      } else {
        bankName = 'MASTERCARD';
      }
    } else if (bin.startsWith('6')) {
      // DISCOVER/OTHER
      bankName = 'DISCOVER';
    }

    setDisplayBank(bankName);
    if (logoPath) {
      setBankLogo(`${LOGO_URL}${logoPath}`);
    } else {
      setBankLogo('');
    }
  };

  // Expiration date handler
  const handleExpDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    setExpDate(value);
    setDisplayExp(value || 'MM/AA');
  };

  // CVC handler
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    setCvc(value);
  };

  // Luhn algorithm validation
  const luhnCheck = (cardNumber: string): boolean => {
    const digits = cardNumber.replace(/\s/g, '').split('').map(Number);
    let sum = 0;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i];
      if ((digits.length - i) % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }

    return sum % 10 === 0;
  };

  // Validate card
  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);
    setValidationResult(null);

    const cleanNumber = cardNumber.replace(/\s/g, '');

    // Simulate validation delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const isValid = luhnCheck(cleanNumber) && cleanNumber.length >= 13;

    if (isValid) {
      setValidationResult({
        valid: true,
        message: 'SISTEMA: CARTÃO VÁLIDO'
      });
    } else {
      setValidationResult({
        valid: false,
        message: 'ERRO: CHECKSUM INVÁLIDO'
      });
    }

    setIsValidating(false);
  };

  // Detect card brand
  const getCardBrand = () => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    if (cleanNumber.startsWith('3')) return 'amex';
    if (cleanNumber.startsWith('4')) return 'visa';
    if (cleanNumber.startsWith('5')) return 'mastercard';
    if (cleanNumber.startsWith('6')) return 'discover';
    return 'unknown';
  };

  const cardBrand = getCardBrand();

  return (
    <div className="min-h-screen bg-black overflow-x-hidden flex flex-col">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black"></div>
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'linear-gradient(rgba(0, 242, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 255, 0.1) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          animation: 'gridMove 40s linear infinite'
        }}></div>
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
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
              <Home className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 group-hover:text-cyan-400 transition-colors" />
              <span className="text-gray-400 group-hover:text-cyan-400 transition-colors text-sm font-medium">Início</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <img src="/darktools-logo.png" alt="DarkToolsLabs Logo" className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl" />
              <div className="text-right">
                <h1 className="text-base sm:text-lg md:text-xl font-bold text-white leading-tight">DARK CARDS</h1>
                <p className="text-[10px] sm:text-xs text-gray-500">Validateur</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12 lg:py-16 max-w-7xl mx-auto flex-1 flex items-center justify-center">
          <div className="w-full max-w-[440px]">
            {/* Main Container */}
            <div className="bg-white/5 backdrop-blur-25 border border-white/8 rounded-[28px] p-5 sm:p-7 md:p-8 shadow-2xl shadow-black/50 relative overflow-hidden">
              {/* Glow effect */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>

              {/* Title */}
              <h1 className="text-center text-xs sm:text-sm font-bold tracking-[5px] mb-5 sm:mb-7 text-gray-300 uppercase">
                Dark Cards Validateur
              </h1>

              {/* Credit Card Visualization - Reduced height */}
              <div
                className="bg-gradient-to-br from-slate-800 to-slate-950 h-[160px] sm:h-[175px] md:h-[185px] rounded-[20px] p-4 sm:p-5 md:p-6 mb-5 sm:mb-6 border border-white/8 relative overflow-hidden transition-all duration-300"
                style={{
                  background: cardBrand === 'amex'
                    ? 'linear-gradient(135deg, #006fcf 0%, #004a8f 100%)'
                    : cardBrand === 'visa'
                    ? 'linear-gradient(135deg, #1a1f71 0%, #0d1245 100%)'
                    : cardBrand === 'mastercard'
                    ? 'linear-gradient(135deg, #eb001b 0%, #f79e1b 100%)'
                    : 'linear-gradient(135deg, #0f172a 0%, #020617 100%)'
                }}
              >
                {/* Card shine effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>

                {/* Bank Logo */}
                {bankLogo && (
                  <img
                    src={bankLogo}
                    alt={displayBank}
                    className="absolute top-4 sm:top-5 right-4 sm:right-5 h-[25px] sm:h-[30px] max-w-[120px] object-contain"
                  />
                )}

                {/* Chip */}
                <div className="w-9 h-6 sm:w-10 sm:h-7 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg shadow-lg flex items-center justify-center">
                  <div className="w-5 h-3 sm:w-6 sm:h-4 border-2 border-yellow-700/30 rounded"></div>
                </div>

                {/* Card Number */}
                <div className="font-mono text-lg sm:text-xl md:text-[1.3rem] tracking-[2px] sm:tracking-[3px] text-white mt-4 sm:mt-5 font-medium">
                  {displayNumber}
                </div>

                {/* Card Info */}
                <div className="flex justify-between items-end mt-2 sm:mt-3 text-[9px] sm:text-[10px] md:text-[11px] text-cyan-300 font-medium">
                  <span className="uppercase">{displayBank}</span>
                  <span>{displayExp}</span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleValidate} className="flex flex-col gap-3">
                {/* Card Number */}
                <div>
                  <input
                    type="text"
                    id="cc-number"
                    name="cardnumber"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="NÚMERO DO CARTÃO"
                    autoComplete="cc-number"
                    inputMode="numeric"
                    required
                    maxLength={19}
                    className="w-full bg-black/50 border border-white/8 px-4 py-2.5 sm:py-3 rounded-xl text-white text-sm sm:text-base font-mono focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all placeholder-gray-500"
                  />
                </div>

                {/* Expiration and CVC - Fixed proportions */}
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    id="cc-exp"
                    name="exp-date"
                    value={expDate}
                    onChange={handleExpDateChange}
                    placeholder="MM/AA"
                    autoComplete="cc-exp"
                    inputMode="numeric"
                    required
                    maxLength={5}
                    className="w-full bg-black/50 border border-white/8 px-4 py-2.5 sm:py-3 rounded-xl text-white text-sm sm:text-base font-mono focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all placeholder-gray-500"
                  />
                  <input
                    type="text"
                    id="cc-csc"
                    name="cvc"
                    value={cvc}
                    onChange={handleCvcChange}
                    placeholder="CVV"
                    autoComplete="cc-csc"
                    inputMode="numeric"
                    required
                    maxLength={4}
                    className="w-full bg-black/50 border border-white/8 px-4 py-2.5 sm:py-3 rounded-xl text-white text-sm sm:text-base font-mono focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all placeholder-gray-500"
                  />
                </div>

                {/* Validate Button */}
                <button
                  type="submit"
                  disabled={isValidating}
                  className="w-full bg-cyan-400 hover:bg-cyan-500 text-black font-black text-sm sm:text-base py-3 sm:py-3.5 rounded-xl uppercase tracking-[2px] transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Validar & Sincronizar
                    </>
                  )}
                </button>
              </form>

              {/* Status Bar */}
              <div className="mt-4 sm:mt-5 text-[10px] sm:text-xs text-center space-y-1 sm:space-y-2">
                <div>
                  DB:{' '}
                  <span
                    className={
                      dbStatus === 'ONLINE'
                        ? 'text-emerald-400'
                        : dbStatus === 'OFFLINE'
                        ? 'text-red-400'
                        : 'text-yellow-400'
                    }
                  >
                    {dbStatus}
                  </span>
                </div>
                {validationResult && (
                  <div
                    className={`font-bold mt-2 sm:mt-3 py-2 px-4 rounded-lg ${
                      validationResult.valid
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        : 'bg-red-500/10 border border-red-500/30 text-red-400'
                    }`}
                  >
                    {validationResult.valid ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {validationResult.message}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <XCircle className="w-4 h-4" />
                        {validationResult.message}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Google Payments Info Note - Enhanced */}
            <div className="mt-5 sm:mt-6 text-center px-4">
              <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-cyan-300 text-[10px] sm:text-xs font-medium">
                  Integração Google Payments para autofill automático
                </span>
              </div>
              <p className="mt-2 text-[10px] sm:text-xs text-gray-500">
                Suporte: AMEX, VISA, MASTERCARD, DISCOVER
              </p>
            </div>
          </div>
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
              © 2026 DarkToolsLabs. Todos os direitos reservados.
            </div>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(80px, 80px); }
        }
      `}</style>
    </div>
  );
}
