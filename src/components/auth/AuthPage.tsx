import { useState } from "react";
import { Target } from "lucide-react";
import { AuthForm } from "@/components/auth/AuthForm";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Card, CardContent } from "@/components/ui/card";

export function AuthPage() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const handleEmailSubmit = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    const { error: authError } = mode === "signin" 
      ? await signIn(email, password)
      : await signUp(email, password);
    
    if (authError) {
      setError(authError.message);
    }
    
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    
    const { error: authError } = await signInWithGoogle();
    
    if (authError) {
      setError(authError.message);
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      
      <div className="mb-8 flex items-center gap-3">
        <Target className="h-10 w-10 text-primary" />
        <h1 className="text-3xl font-bold">SmartTask AI</h1>
      </div>

      <AuthForm
        mode={mode}
        onSubmit={handleEmailSubmit}
        onToggleMode={toggleMode}
        isLoading={isLoading}
      />

      <div className="w-full max-w-md mt-4">
        <Card>
          <CardContent className="pt-6">
            <GoogleAuthButton 
              onClick={handleGoogleSignIn} 
              isLoading={isLoading} 
            />
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-md max-w-md text-sm">
          {error}
        </div>
      )}

      <p className="mt-8 text-sm text-muted-foreground text-center max-w-md">
        {t('termsAgreement')}
      </p>
    </div>
  );
}
