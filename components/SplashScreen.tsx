
interface SplashScreenProps {
  logoUrl?: string;
  companyName?: string;
  primaryColor?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  logoUrl, 
  companyName = 'keepGoing',
  primaryColor = '#004D4D' 
}) => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#f8f6f6] dark:bg-[#0f172a] transition-colors duration-500 font-['Poppins']">
      
      {/* Elementos decorativos de fundo para efeito Premium */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{ backgroundColor: `${primaryColor}20` }}
        />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Glow effect behind the logo */}
        <div 
          className="absolute inset-0 rounded-full blur-2xl animate-pulse opacity-20"
          style={{ backgroundColor: primaryColor }}
        />

        {/* Logo Container */}
        <div className="relative z-10 w-48 h-48 mb-6 flex items-center justify-center">
          <img
            src="/Logotipo Keepgoing Alta.png"
            alt="Logo"
            className="w-full h-full object-contain drop-shadow-2xl animate-[float_4s_ease-in-out_infinite]"
          />
        </div>

        {/* Text */}
        <div className="text-center">
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white mb-1">
            {companyName}
          </h2>
          <div className="flex items-center justify-center gap-1.5 mt-4">
            <div className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s]" style={{ backgroundColor: primaryColor }} />
            <div className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s]" style={{ backgroundColor: primaryColor }} />
            <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: primaryColor }} />
          </div>
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400 dark:text-slate-500 mt-6">
            Preparando seu ambiente
          </p>
        </div>
      </div>
    </div>
  );
};
