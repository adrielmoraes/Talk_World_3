import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Smartphone } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function OtpVerificationScreen() {
  const [, setLocation] = useLocation();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { toast } = useToast();

  const phoneNumber = localStorage.getItem("phoneNumber") || "";

  useEffect(() => {
    // Start countdown timer
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; code: string }) => {
      const response = await apiRequest("POST", "/api/auth/verify-otp", data);
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      if (data.requiresProfileSetup) {
        setLocation("/profile-setup");
      } else {
        setLocation("/app");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Código inválido. Tente novamente.",
        variant: "destructive",
      });
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string }) => {
      const response = await apiRequest("POST", "/api/auth/send-otp", data);
      return response.json();
    },
    onSuccess: () => {
      setResendTimer(60);
      toast({
        title: "Código reenviado",
        description: "Um novo código foi enviado para seu telefone.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Falha ao reenviar código. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when complete
    if (newOtp.every(digit => digit !== "")) {
      verifyOtpMutation.mutate({
        phoneNumber,
        code: newOtp.join(""),
      });
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    resendOtpMutation.mutate({ phoneNumber });
  };

  const goBack = () => {
    setLocation("/");
  };

  const isComplete = otp.every(digit => digit !== "");

  return (
    <div className="min-h-screen bg-white dark:bg-whatsapp-dark">
      {/* Header */}
      <div className="bg-whatsapp-secondary text-white p-4 flex items-center">
        <button onClick={goBack} className="mr-4">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-medium">Verificação</h1>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-8">
            <Smartphone className="mx-auto h-16 w-16 text-whatsapp-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">
              Código de Verificação
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Enviamos um código de 6 dígitos para
            </p>
            <p className="text-whatsapp-primary font-medium text-sm mt-1">
              {phoneNumber}
            </p>
          </div>

          {/* OTP Input */}
          <div className="flex justify-center space-x-2 mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => inputRefs.current[index] = el}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-12 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-whatsapp-elevated text-lg font-medium text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-whatsapp-primary focus:border-transparent"
              />
            ))}
          </div>

          {/* Resend Section */}
          <div className="text-center mb-8">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Não recebeu o código?
            </p>
            <button 
              onClick={handleResend}
              disabled={resendTimer > 0 || resendOtpMutation.isPending}
              className="text-whatsapp-primary font-medium text-sm disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {resendTimer > 0 
                ? `Reenviar em ${resendTimer}s` 
                : resendOtpMutation.isPending 
                ? "Reenviando..." 
                : "Reenviar código"
              }
            </button>
          </div>

          {/* Verify Button */}
          <Button 
            onClick={() => verifyOtpMutation.mutate({ phoneNumber, code: otp.join("") })}
            disabled={!isComplete || verifyOtpMutation.isPending}
            className="w-full bg-whatsapp-primary hover:bg-whatsapp-secondary mb-3"
          >
            {verifyOtpMutation.isPending ? "Verificando..." : "Verificar"}
          </Button>

          <Button 
            variant="outline"
            onClick={goBack}
            className="w-full"
          >
            Alterar Número
          </Button>
        </div>
      </div>
    </div>
  );
}
