import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";

interface Subscriber {
  id: number;
  username: string;
  email: string;
  subscriptionType: string;
  subscribedAt: string | null;
  subscriptionEndDate: string | null;
}

export default function Subscribers() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Verifică dacă utilizatorul este Administrator
  const isAdmin = user?.username === "Administrator";

  useEffect(() => {
    const fetchSubscribers = async () => {
      if (!isAdmin) return;

      try {
        setIsLoading(true);
        const response = await apiRequest("GET", "/api/admin/subscribers");
        if (response.ok) {
          const data = await response.json();
          setSubscribers(data);
        } else {
          const errorData = await response.json();
          setError(errorData.message || "A apărut o eroare la încărcarea listei de abonați");
          toast({
            title: "Eroare de încărcare",
            description: errorData.message || "A apărut o eroare la încărcarea listei de abonați",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        setError(error.message || "A apărut o eroare la încărcarea listei de abonați");
        toast({
          title: "Eroare de încărcare",
          description: error.message || "A apărut o eroare la încărcarea listei de abonați",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscribers();
  }, [isAdmin, toast]);

  // Dacă utilizatorul nu este Administrator, redirecționează la pagina principală
  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  // Formatare dată pentru afișare
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Nespecificat";
    const date = new Date(dateString);
    return date.toLocaleDateString("ro-RO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Lista abonaților</h1>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md text-red-500 border border-red-200">
          {error}
        </div>
      ) : subscribers.length === 0 ? (
        <div className="bg-amber-50 p-4 rounded-md text-amber-700 border border-amber-200">
          Nu există utilizatori abonați momentan.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white shadow-md rounded-lg overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nume utilizator</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip abonament</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data abonării</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data expirării</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {subscribers.map((subscriber) => (
                <tr key={subscriber.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{subscriber.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{subscriber.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{subscriber.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      subscriber.subscriptionType === 'anual' 
                        ? 'bg-green-100 text-green-800' 
                        : subscriber.subscriptionType === 'lunar'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {subscriber.subscriptionType === 'anual' 
                        ? 'Anual' 
                        : subscriber.subscriptionType === 'lunar'
                        ? 'Lunar'
                        : 'Nedeterminat'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(subscriber.subscribedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(subscriber.subscriptionEndDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}