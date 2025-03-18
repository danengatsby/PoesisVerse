import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Trash, Plus, X, Check, UserPlus, ArrowLeft } from "lucide-react";
import { Redirect, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Subscriber {
  id: number;
  username: string;
  email: string;
  isSubscribed: boolean;
  subscriptionType: string;
  subscribedAt: string | null;
  subscriptionEndDate: string | null;
}

interface NewUserFormData {
  username: string;
  email: string;
  password: string;
  isSubscribed?: boolean;
}

interface EditUserFormData {
  username: string;
  email: string;
  isSubscribed: boolean;
}

export default function Subscribers() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newUser, setNewUser] = useState<NewUserFormData>({
    username: '',
    email: '',
    password: ''
  });
  const [editUser, setEditUser] = useState<EditUserFormData>({
    username: '',
    email: '',
    isSubscribed: false
  });
  const [currentEditUserId, setCurrentEditUserId] = useState<number | null>(null);
  const [addingUser, setAddingUser] = useState(false);
  const [updatingUser, setUpdatingUser] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);

  // Verifică dacă utilizatorul este Administrator
  const isAdmin = user?.username === "Administrator";

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
        setError(errorData.message || "A apărut o eroare la încărcarea listei de utilizatori");
        toast({
          title: "Eroare de încărcare",
          description: errorData.message || "A apărut o eroare la încărcarea listei de utilizatori",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setError(error.message || "A apărut o eroare la încărcarea listei de utilizatori");
      toast({
        title: "Eroare de încărcare",
        description: error.message || "A apărut o eroare la încărcarea listei de utilizatori",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
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

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      toast({
        title: "Date incomplete",
        description: "Vă rugăm să completați toate câmpurile obligatorii.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAddingUser(true);
      const response = await apiRequest("POST", "/api/admin/users", newUser);
      
      if (response.ok) {
        const addedUser = await response.json();
        toast({
          title: "Utilizator adăugat",
          description: `Utilizatorul ${addedUser.username} a fost adăugat cu succes.`,
        });
        setNewUser({ username: '', email: '', password: '' });
        setShowAddDialog(false);
        fetchSubscribers();
      } else {
        const errorData = await response.json();
        toast({
          title: "Eroare la adăugare",
          description: errorData.message || "A apărut o eroare la adăugarea utilizatorului.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Eroare la adăugare",
        description: error.message || "A apărut o eroare la adăugarea utilizatorului.",
        variant: "destructive",
      });
    } finally {
      setAddingUser(false);
    }
  };

  const handleEditUser = (subscriber: Subscriber) => {
    setEditUser({
      username: subscriber.username,
      email: subscriber.email,
      isSubscribed: subscriber.isSubscribed
    });
    setCurrentEditUserId(subscriber.id);
    setShowEditDialog(true);
  };

  const handleUpdateUser = async () => {
    if (!currentEditUserId || !editUser.username || !editUser.email) {
      toast({
        title: "Date incomplete",
        description: "Vă rugăm să completați toate câmpurile obligatorii.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdatingUser(true);
      const response = await apiRequest("PUT", `/api/admin/users/${currentEditUserId}`, editUser);
      
      if (response.ok) {
        const updatedUser = await response.json();
        toast({
          title: "Utilizator actualizat",
          description: `Utilizatorul ${updatedUser.username} a fost actualizat cu succes.`,
        });
        setShowEditDialog(false);
        fetchSubscribers();
      } else {
        const errorData = await response.json();
        toast({
          title: "Eroare la actualizare",
          description: errorData.message || "A apărut o eroare la actualizarea utilizatorului.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Eroare la actualizare",
        description: error.message || "A apărut o eroare la actualizarea utilizatorului.",
        variant: "destructive",
      });
    } finally {
      setUpdatingUser(false);
    }
  };

  const handleDeleteUser = async (email: string) => {
    try {
      setDeletingUser(true);
      const response = await apiRequest("DELETE", "/api/admin/users", { email });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Utilizator șters",
          description: result.message || `Utilizatorul cu email-ul ${email} a fost șters cu succes.`,
        });
        fetchSubscribers();
      } else {
        const errorData = await response.json();
        toast({
          title: "Eroare la ștergere",
          description: errorData.message || "A apărut o eroare la ștergerea utilizatorului.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Eroare la ștergere",
        description: error.message || "A apărut o eroare la ștergerea utilizatorului.",
        variant: "destructive",
      });
    } finally {
      setDeletingUser(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button 
            onClick={() => navigate("/")} 
            variant="outline" 
            className="mr-4"
            title="Înapoi la pagina principală"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Înapoi
          </Button>
          <h1 className="text-2xl font-bold">Lista utilizatorilor</h1>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-green-600 hover:bg-green-700">
          <UserPlus className="h-4 w-4 mr-2" />
          Adaugă utilizator
        </Button>
      </div>

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
          Nu există utilizatori înregistrați momentan.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white shadow-md rounded-lg overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nume utilizator</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip abonament</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data abonării</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data expirării</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acțiuni</th>
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
                      subscriber.isSubscribed 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {subscriber.isSubscribed ? 'Abonat' : 'Neabonat'}
                    </span>
                  </td>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEditUser(subscriber)}
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Editează
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash className="h-3.5 w-3.5 mr-1" />
                          Șterge
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmare ștergere</AlertDialogTitle>
                          <AlertDialogDescription>
                            Sunteți sigur că doriți să ștergeți utilizatorul {subscriber.username}? 
                            Această acțiune nu poate fi anulată și toate datele asociate vor fi șterse.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anulează</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteUser(subscriber.email)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            {deletingUser ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Trash className="h-4 w-4 mr-2" />
                            )}
                            Șterge
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog pentru adăugare utilizator */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adaugă utilizator nou</DialogTitle>
            <DialogDescription>
              Introduceți datele pentru noul utilizator. Toate câmpurile sunt obligatorii.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Nume utilizator
              </Label>
              <Input
                id="username"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Parolă
              </Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isSubscribed" className="text-right">
                Este abonat
              </Label>
              <div className="col-span-3 flex items-center">
                <Switch
                  id="isSubscribed"
                  checked={newUser.isSubscribed || false}
                  onCheckedChange={(checked) => setNewUser({ ...newUser, isSubscribed: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              <X className="h-4 w-4 mr-2" />
              Anulează
            </Button>
            <Button onClick={handleAddUser} disabled={addingUser}>
              {addingUser ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Adaugă
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pentru editare utilizator */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editează utilizator</DialogTitle>
            <DialogDescription>
              Modificați datele utilizatorului. Email-ul și numele de utilizator sunt obligatorii.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-username" className="text-right">
                Nume utilizator
              </Label>
              <Input
                id="edit-username"
                value={editUser.username}
                onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">
                Email
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={editUser.email}
                onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-isSubscribed" className="text-right">
                Este abonat
              </Label>
              <div className="col-span-3 flex items-center">
                <Switch
                  id="edit-isSubscribed"
                  checked={editUser.isSubscribed}
                  onCheckedChange={(checked) => setEditUser({ ...editUser, isSubscribed: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              <X className="h-4 w-4 mr-2" />
              Anulează
            </Button>
            <Button onClick={handleUpdateUser} disabled={updatingUser}>
              {updatingUser ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Salvează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}