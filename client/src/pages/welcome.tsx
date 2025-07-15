import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, ChevronDown } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function WelcomeScreen() {
  const [, setLocation] = useLocation();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+55");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const { toast } = useToast();

  const sendOtpMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string }) => {
      const response = await apiRequest("POST", "/api/auth/send-otp", data);
      return response.json();
    },
    onSuccess: () => {
      localStorage.setItem("phoneNumber", `${countryCode}${phoneNumber}`);
      setLocation("/verify-otp");
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Falha ao enviar código de verificação. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!phoneNumber || !agreeToTerms) return;
    
    const fullPhoneNumber = `${countryCode}${phoneNumber}`;
    sendOtpMutation.mutate({ phoneNumber: fullPhoneNumber });
  };

  const isValid = phoneNumber.length >= 10 && agreeToTerms;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-whatsapp-dark">
      {/* Header */}
      <div className="bg-whatsapp-secondary text-white p-6 text-center">
        <div className="mb-4">
          <Globe className="mx-auto h-12 w-12" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Talk World</h1>
        <p className="text-sm opacity-90">Conecte-se com o mundo sem barreiras de idioma</p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6">
        <div className="max-w-sm mx-auto w-full">
          <h2 className="text-xl font-semibold mb-6 text-center text-gray-800 dark:text-white">
            Bem-vindo ao Talk World
          </h2>
          
          <p className="text-gray-600 dark:text-gray-300 text-center mb-8 text-sm leading-relaxed">
            Converse com pessoas do mundo todo com tradução automática em tempo real
          </p>

          {/* Phone Number Input */}
          <div className="mb-6">
            <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Número de telefone
            </Label>
            
            {/* Country Selector and Phone Input */}
            <div className="flex mb-3">
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="w-24 rounded-r-none border-r-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="+55">🇧🇷 +55</SelectItem>
                  <SelectItem value="+1">🇺🇸 +1</SelectItem>
                  <SelectItem value="+44">🇬🇧 +44</SelectItem>
                  <SelectItem value="+34">🇪🇸 +34</SelectItem>
                  <SelectItem value="+33">🇫🇷 +33</SelectItem>
                  <SelectItem value="+49">🇩🇪 +49</SelectItem>
                </SelectContent>
              </Select>
              
              <Input 
                type="tel" 
                placeholder="11 99999-9999"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1 rounded-l-none border-l-0"
              />
            </div>
          </div>

          {/* Privacy Agreement */}
          <div className="mb-6">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="terms"
                checked={agreeToTerms}
                onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="terms" className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Concordo com os{" "}
                <a href="#" className="text-whatsapp-primary underline">Termos de Uso</a> e{" "}
                <a href="#" className="text-whatsapp-primary underline">Política de Privacidade</a>
              </Label>
            </div>
          </div>

          {/* Continue Button */}
          <Button 
            onClick={handleSubmit}
            disabled={!isValid || sendOtpMutation.isPending}
            className="w-full bg-whatsapp-primary hover:bg-whatsapp-secondary"
          >
            {sendOtpMutation.isPending ? "Enviando..." : "Avançar"}
          </Button>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4 leading-relaxed">
            Você receberá um código de verificação via SMS
          </p>
        </div>
      </div>
    </div>
  );
}
