import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/use-i18n";
import { Logo } from "../components/logo";

export default function WelcomeScreen() {
  const [, setLocation] = useLocation();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();

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
        title: t('common.error'),
        description: t('auth.loginError'),
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
          <Logo className="mx-auto" width={48} height={48} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Talk World</h1>
        <p className="text-sm opacity-90">{t('auth.subtitle')}</p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6">
        <div className="max-w-sm mx-auto w-full">
          <h2 className="text-xl font-semibold mb-6 text-center text-gray-800 dark:text-white">
            {t('auth.welcome')}
          </h2>

          {/* Phone Number Input */}
          <div className="mb-6">
            <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('auth.phoneNumber')}
            </Label>
            
            {/* Country Selector and Phone Input */}
            <div className="flex mb-3">
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="w-24 rounded-r-none border-r-0">
                  <div className="flex items-center space-x-1">
                    <span>{countryCode === "+1" ? "🇺🇸" :
                          countryCode === "+55" ? "🇧🇷" :
                          countryCode === "+44" ? "🇬🇧" :
                          countryCode === "+34" ? "🇪🇸" :
                          countryCode === "+33" ? "🇫🇷" :
                          countryCode === "+49" ? "🇩🇪" :
                          countryCode === "+86" ? "🇨🇳" :
                          countryCode === "+91" ? "🇮🇳" :
                          countryCode === "+81" ? "🇯🇵" :
                          countryCode === "+82" ? "🇰🇷" :
                          countryCode === "+7" ? "🇷🇺" :
                          countryCode === "+20" ? "🇪🇬" :
                          countryCode === "+27" ? "🇿🇦" :
                          countryCode === "+54" ? "🇦🇷" :
                          countryCode === "+52" ? "🇲🇽" :
                          countryCode === "+39" ? "🇮🇹" :
                          countryCode === "+31" ? "🇳🇱" :
                          countryCode === "+46" ? "🇸🇪" :
                          countryCode === "+41" ? "🇨🇭" :
                          countryCode === "+61" ? "🇦🇺" :
                          countryCode === "+64" ? "🇳🇿" :
                          countryCode === "+966" ? "🇸🇦" :
                          countryCode === "+971" ? "🇦🇪" :
                          countryCode === "+973" ? "🇧🇭" :
                          countryCode === "+965" ? "🇰🇼" :
                          countryCode === "+968" ? "🇴🇲" :
                          countryCode === "+974" ? "🇶🇦" :
                          countryCode === "+972" ? "🇮🇱" :
                          countryCode === "+963" ? "🇸🇾" :
                          countryCode === "+964" ? "🇮🇶" :
                          countryCode === "+212" ? "🇲🇦" :
                          countryCode === "+216" ? "🇹🇳" :
                          countryCode === "+218" ? "🇱🇾" :
                          countryCode === "+967" ? "🇾🇪" :
                          countryCode === "+962" ? "🇯🇴" :
                          ""}</span>
                    <span>{countryCode}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="+1">🇺🇸 +1</SelectItem>
                  <SelectItem value="+55">🇧🇷 +55</SelectItem>
                  <SelectItem value="+44">🇬🇧 +44</SelectItem>
                  <SelectItem value="+34">🇪🇸 +34</SelectItem>
                  <SelectItem value="+33">🇫🇷 +33</SelectItem>
                  <SelectItem value="+49">🇩🇪 +49</SelectItem>
                  <SelectItem value="+86">🇨🇳 +86</SelectItem>
                  <SelectItem value="+91">🇮🇳 +91</SelectItem>
                  <SelectItem value="+81">🇯🇵 +81</SelectItem>
                  <SelectItem value="+82">🇰🇷 +82</SelectItem>
                  <SelectItem value="+7">🇷🇺 +7</SelectItem>
                  <SelectItem value="+20">🇪🇬 +20</SelectItem>
                  <SelectItem value="+27">🇿🇦 +27</SelectItem>
                  <SelectItem value="+54">🇦🇷 +54</SelectItem>
                  <SelectItem value="+52">🇲🇽 +52</SelectItem>
                  <SelectItem value="+39">🇮🇹 +39</SelectItem>
                  <SelectItem value="+31">🇳🇱 +31</SelectItem>
                  <SelectItem value="+46">🇸🇪 +46</SelectItem>
                  <SelectItem value="+41">🇨🇭 +41</SelectItem>
                  <SelectItem value="+61">🇦🇺 +61</SelectItem>
                  <SelectItem value="+64">🇳🇿 +64</SelectItem>
                  <SelectItem value="+966">🇸🇦 +966</SelectItem>
                  <SelectItem value="+971">🇦🇪 +971</SelectItem>
                  <SelectItem value="+973">🇧🇭 +973</SelectItem>
                  <SelectItem value="+965">🇰🇼 +965</SelectItem>
                  <SelectItem value="+968">🇴🇲 +968</SelectItem>
                  <SelectItem value="+974">🇶🇦 +974</SelectItem>
                  <SelectItem value="+972">🇮🇱 +972</SelectItem>
                  <SelectItem value="+963">🇸🇾 +963</SelectItem>
                  <SelectItem value="+964">🇮🇶 +964</SelectItem>
                  <SelectItem value="+212">🇲🇦 +212</SelectItem>
                  <SelectItem value="+216">🇹🇳 +216</SelectItem>
                  <SelectItem value="+218">🇱🇾 +218</SelectItem>
                  <SelectItem value="+967">🇾🇪 +967</SelectItem>
                  <SelectItem value="+962">🇯🇴 +962</SelectItem>
                  <SelectItem value="+965">🇰🇼 +965</SelectItem>
                </SelectContent>
              </Select>
              
              <Input 
                type="tel" 
                placeholder={t('auth.enterPhone')}
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
                {t('settings.termsOfService')}{" "}
                <a href="#" className="text-whatsapp-primary underline">{t('settings.termsOfService')}</a> e{" "}
                <a href="#" className="text-whatsapp-primary underline">{t('settings.privacyPolicy')}</a>
              </Label>
            </div>
          </div>

          {/* Continue Button */}
          <Button 
            onClick={handleSubmit}
            disabled={!isValid || sendOtpMutation.isPending}
            className="w-full bg-whatsapp-primary hover:bg-whatsapp-secondary"
          >
            {sendOtpMutation.isPending ? t('common.loading') : t('auth.sendCode')}
          </Button>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4 leading-relaxed">
            {t('auth.codeSent')}
          </p>
        </div>
      </div>
    </div>
  );
}
