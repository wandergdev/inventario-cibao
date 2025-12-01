import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type Props = {
  onLogin: (email: string, password: string) => Promise<void>;
};

export default function LoginPanel({ onLogin }: Props) {
  const [email, setEmail] = useState("gerente@electrocibao.com");
  const [password, setPassword] = useState("cibaoAdmin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await onLogin(email, password);
      setSuccess("Sesión iniciada correctamente");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" />
      <Input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
        type="password"
      />
      <Button onClick={handleSubmit} disabled={loading} className="w-full">
        {loading ? "Ingresando..." : "Iniciar sesión"}
      </Button>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-emerald-600">{success}</p>}
    </div>
  );
}
