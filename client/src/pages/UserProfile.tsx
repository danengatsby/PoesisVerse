
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useLocation } from "wouter";

export default function UserProfile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Deconectat cu succes",
        description: "La revedere!",
      });
      setLocation("/");
    } catch (error) {
      toast({
        title: "Eroare",
        description: "Nu s-a putut efectua deconectarea",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return <div>Nu sunteți autentificat</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Profilul meu</h1>
        
        <div className="space-y-4">
          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold mb-2">Informații cont</h2>
            <p><span className="font-medium">Nume utilizator:</span> {user.username}</p>
            <p><span className="font-medium">Email:</span> {user.email}</p>
            <p><span className="font-medium">Status:</span> {user.isSubscribed ? 'Abonat' : 'Neabonat'}</p>
          </div>

          {user.subscriptionInfo && (
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold mb-2">Detalii abonament</h2>
              <p><span className="font-medium">Data expirării:</span> {user.subscriptionInfo.endDate}</p>
              <p><span className="font-medium">Zile rămase:</span> {user.subscriptionInfo.daysRemaining}</p>
            </div>
          )}
          
          <div className="pt-4">
            <Button onClick={handleLogout} variant="destructive">
              Deconectare
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
