import { Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GoogleAuthButtonProps {
  onClick: () => Promise<void>;
  isLoading?: boolean;
}

export function GoogleAuthButton({ onClick, isLoading = false }: GoogleAuthButtonProps) {
  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={onClick}
      disabled={isLoading}
      type="button"
    >
      {isLoading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <Chrome className="mr-2 h-4 w-4" />
      )}
      Continue with Google
    </Button>
  );
}
