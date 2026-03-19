import { useState } from "react";
import { Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";

interface AuthFormProps {
  mode: "signin" | "signup";
  onSubmit: (email: string, password: string) => Promise<void>;
  onToggleMode: () => void;
  isLoading?: boolean;
}

export function AuthForm({ mode, onSubmit, onToggleMode, isLoading = false }: AuthFormProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          {mode === "signin" ? t('signIn') : t('createAccount')}
        </CardTitle>
        <CardDescription className="text-center">
          {mode === "signin"
            ? t('enterCredentials')
            : t('enterDetails')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder={t('email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder={t('password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "signin" ? t('signingIn') : t('creatingAccount')}
              </>
            ) : mode === "signin" ? (
              t('signIn')
            ) : (
              t('createAccount')
            )}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          {mode === "signin" ? (
            <>
              {t('noAccount')}{" "}
              <button
                onClick={onToggleMode}
                className="text-primary hover:underline font-medium"
                disabled={isLoading}
              >
                {t('signUpLink')}
              </button>
            </>
          ) : (
            <>
              {t('haveAccount')}{" "}
              <button
                onClick={onToggleMode}
                className="text-primary hover:underline font-medium"
                disabled={isLoading}
              >
                {t('signInLink')}
              </button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
